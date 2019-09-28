import Debug from 'debug';
import { safeLoad } from 'js-yaml';
import { fs } from 'mz';
import * as fsExtra from 'fs-extra';
import path from 'path';
import { Observable } from 'rxjs';
import { constants } from '../../constants';
import { ApplicationConfig } from '../../model/application';
import { RouteConfig } from '../../model/route';
import { ConfNormalizer } from '../conf-normalizer';
import { ConfEvent, ConfStorage, ConfEventType } from '../storage';
import { safeDump } from 'js-yaml';
import Chokdiar from 'chokidar';

const debug = Debug('server:fs-storage');

/**
 * @remark load configurations as meta data when startup
 * conf directory should follow the hierarchy:
 * - conf/<application>
 * - conf/<application>/routes/**<route-name>-config.yaml
 * - conf/<application>/context.yaml conf/<application>/**.tmpl
 * - conf/<application>/**<func-name>.js|ts
 */
export class FileStorage extends ConfStorage {

  private confRoot: string;

  constructor(confRoot: string) {
    super();
    this.confRoot = confRoot;
  }

  public async initialize(): Promise<void> {
    const trashDir = path.join(this.confRoot, constants.TRASH_DIR);
    // init root conf dir
    const exists = await fs.exists(this.confRoot);
    if (!exists) {
      debug(`folder not exists, creating directory: ${this.confRoot}`);
      await fs.mkdir(this.confRoot);
    }
    // init trash dir
    const trashExists = await fs.exists(trashDir);
    if (!trashExists) {
      debug(`trash directory not exists, creating directory: ${trashDir}`);
      await fs.mkdir(trashDir);
    }
  }

  public async loadAllConfigurations(): Promise<ApplicationConfig[]> {
    debug(`start list all configurations in ${this.confRoot}`);
    const paths = await fs.readdir(this.confRoot);
    const result = [];
    for (let subPath of paths) {
      const fullPath = path.join(this.confRoot, subPath);
      const stat = await fs.lstat(fullPath);
      if (stat.isDirectory() && subPath !== constants.TRASH_DIR) {
        const conf = await this.loadConfigurationByName(subPath);
        result.push(conf);
      }
    }
    return result;
  }

  public async loadConfigurationByName(appName: string): Promise<ApplicationConfig> {
    const appDir = path.join(this.confRoot, appName);
    const files = await fs.readdir(appDir);
    for (let subPath of files) {
      const fullPath = path.join(appDir, subPath);
      if (subPath.endsWith(constants.CONTEXT_YAML_NAME)) {
        console.log(`load application ${appName} from ${fullPath}`);
        try {
          // step1. load context.yaml
          const buffer = await fs.readFile(fullPath);
          const rawConf = safeLoad(buffer.toString()) as ApplicationConfig;
          rawConf.name = rawConf.name || appName;

          // step2. load routes configurations
          const routesDir = path.join(appDir, constants.ROUTES_CONF_PATH);
          const routes = await fs.readdir(routesDir);
          const routesConf = [];
          for (let route of routes) {
            if (route.endsWith(constants.YAML_SUFFIX) || route.endsWith(constants.YML_SUFFIX)) {
              let tmpConfBuffer = await fs.readFile(path.join(routesDir, route));
              const tmpConf = safeLoad(tmpConfBuffer.toString()) as RouteConfig;
              tmpConf.name = tmpConf.name || route;
              routesConf.push(tmpConf);
            }
          }
          rawConf.routes = routesConf;

          // step3. validate and setDefault values
          const validConf = ConfNormalizer.validateAndSetDefault4Application(rawConf);

          // step4. load related functions and templates
          const loadedConf = await ConfNormalizer.loadRelatedTmplAndFuncFiles(validConf);
          return loadedConf;
        } catch (err) {
          console.error(`fail to load configuration of ${appName}`, err);
          throw err;
        }
      }
    }
    throw new Error(`no context.yaml found for application: ${appName}`);
  }

  public async addOrUpdateApplicationConf(conf: ApplicationConfig): Promise<boolean> {
    const appDir = path.join(this.confRoot, conf.name);
    // todo dump application and route configurations (context.xml)
    // conf normalizer should do this
    let confStr = safeDump(conf);
    return true;
  }

  public async deleteApplicationConf(appName: string): Promise<boolean> {
    const appDir = path.join(this.confRoot, appName);
    const trashDir = path.join(this.confRoot, constants.TRASH_DIR);
    const backupName = path.join(trashDir, Date.now().toString(), appName);
    await fs.rename(appDir, backupName);
    return true;
  }

  public watchConf(): Observable<ConfEvent<ApplicationConfig>> {
    // todo support file watch of all applications
    return new Observable<ConfEvent<ApplicationConfig>>(observer => {
      const watcher = Chokdiar.watch(this.confRoot, {
        ignored: /(^|[\/\\])\../,
        ignoreInitial: true
      }).on('all', async (event, fullPath) => {
        const shortPath = path.relative(this.confRoot, fullPath);
        const relativePaths = shortPath.split(/[\/\\]+/);
        debug(`config change event: ${event} - [${shortPath}]`);

        // delete application directory, this could not happen, since file is watched
        if (relativePaths.length == 1 && event === 'unlinkDir') {
          observer.next({
            eventType: ConfEventType.Deleted,
            conf: {
              name: relativePaths[0]
            } as ApplicationConfig
          });
        }
        // ignore addDir, and root path (not application level) changes
        if (relativePaths.length < 2 || event === 'addDir') {
          return;
        }
        const appName = relativePaths[0];
        try {
          debug(`try reload configuration for app [${appName}]`);
          const conf = await this.loadConfigurationByName(appName);
          debug(`configuration fetched, start hot-reload for app [${appName}]`);
          observer.next({
            eventType: event === 'add' ? ConfEventType.Created : ConfEventType.Updated,
            conf
          });
        } catch (ex) {
          console.error(`failed to load changes from files, caused by [${fullPath} - ${event}] \n ${ex.message} \n ${ex.stack}`);
        }
      }).on('error', (err) => {
        watcher.close();
        observer.error(err);
      });
    });
  }

  public async loadSeparateContent(target: string, conf: ApplicationConfig) {
    let buffer = await fs.readFile(path.join(this.confRoot, conf.name, target));
    return buffer.toString().trim();
  }

  public async importConf(tempDir: string): Promise<ApplicationConfig[]> {
    const apps = await fsExtra.readdir(tempDir);
    const result = [];
    for (const app of apps) {
      const dest = path.join(this.confRoot, app);
      if (fsExtra.existsSync(dest)) {
        await fsExtra.remove(dest);
      }
      await fsExtra.move(path.join(tempDir, app), dest);
      let loaded = await this.loadConfigurationByName(app);
      result.push(loaded);
    }
    await fsExtra.remove(tempDir);
    return result;
  }

  public dispose(): Promise<void> {
    debug('file storage disposed');
    return Promise.resolve();
  }
}