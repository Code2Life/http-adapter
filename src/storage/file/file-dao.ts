import Debug from 'debug';
import { safeLoad } from 'js-yaml';
import { fs } from 'mz';
import path from 'path';
import { Observable } from 'rxjs';
import { constants } from '../../constants';
import { ConfNormalizer } from '../conf-normalizer';
import { ApplicationConfig, ContextPlugin, RouteConfig } from '../model';
import { ConfEvent, ConfStorage } from '../storage';

const debug = Debug('server:fs-storage');

  /**
   * @remark load configurations as meta data when startup
   * conf directory should follow the hierarchy:
   * - conf/<application>
   * - conf/<application>/routes/**<route-name>-config.yaml
   * - conf/<application>/context.yaml conf/<application>/**.tmpl
   * - conf/<application>/**<func-name>.js|ts
   * - conf/_plugins/<plugin>/context.yaml
   * - conf/_plugins/<plugin>/**<func-name>.js|ts|.tmpl
   */
export class FileStorage extends ConfStorage {

  private confRoot: string;

  constructor(confRoot: string) {
    super();
    this.confRoot = confRoot;
  }

  public async listAllApplications(): Promise<ApplicationConfig[]> {
    debug(`start list all configurations in ${this.confRoot}`);
    const paths = await fs.readdir(this.confRoot);
    const result = [];
    for (let subPath of paths) {
      const fullPath = path.join(this.confRoot, subPath);
      const stat = await fs.lstat(fullPath);
      if (stat.isDirectory() && subPath !== constants.PLUGINS_DIR) {
        const conf = await this.findApplicationByName(subPath);
        result.push(conf);
      }
    }
    return result;
  }

  public async listAllPlugins() {
    const exists = await fs.exists(path.join(this.confRoot, constants.PLUGINS_DIR));
    if (exists) {
      debug(`start list all plugins in ${this.confRoot}`);
      throw new Error('plugin not supported now.');
    }
    return [];
  }

  public async findApplicationByName(appName: string): Promise<ApplicationConfig> {
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

  public async findPluginByName(): Promise<ContextPlugin> {
    throw new Error('plugin not supported now.');
  }

  public async addOrUpdateApplicationConf(conf: ApplicationConfig): Promise<boolean> {
    return true;
  }

  public async addOrUpdatePluginConf(conf: ContextPlugin): Promise<boolean> {
    throw new Error('plugin not supported now.');
  }

  public async deleteApplicationConf(conf: ApplicationConfig): Promise<boolean> {
    return true;
  }

  public async deletePluginConf(conf: ApplicationConfig): Promise<boolean> {
    throw new Error('plugin not supported now.');
  }

  public watchApplicationConf(): Observable<ConfEvent<ApplicationConfig>> {
    // support file watch of all applications
    return new Observable<ConfEvent<ApplicationConfig>>(observer => {
      observer.complete();
    });
  }
  public watchPluginConf(): Observable<ConfEvent<ContextPlugin>> {
    // todo plugin support
    return new Observable<ConfEvent<ContextPlugin>>(observer => {
      observer.complete();
    });
  }

  public async loadSeparateFunction(target: string, conf: ApplicationConfig) {
    let buffer = await fs.readFile(path.join(this.confRoot, conf.name, target));
    return buffer.toString().trim();
  }

}