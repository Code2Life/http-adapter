import axios, { AxiosResponse } from 'axios';
import Debug from 'debug';
import unzipper from 'unzipper';
import ContextDirector from '../executor/director';
import { ApplicationConfig } from '../model/application';
import { MessageType } from '../model/enums';
import { ConfEventType, ConfStorage } from '../storage/storage';
import { StorageFactory } from '../storage/storage-factory';
import { RouterManager } from './route-manager';
import { filter } from 'rxjs/operators';

const debug = Debug('server:config-manager');

export class ConfigManager {

  public static applications: Map<string, ApplicationConfig> = new Map();
  public static applicationContext: Map<string, ContextDirector> = new Map();

  private static backendStorage: ConfStorage;

  public static async initAllConfAndStartWatch(preloadConfUrl: string) {
    try {
      this.backendStorage = await StorageFactory.createBackendStorage();
      let applications = await this.backendStorage.loadAllConfigurations();
      let preloadApps = await this.preloadApplications(preloadConfUrl);
      applications = applications.concat(preloadApps);

      // todo normalize application for runtime, especially for MIXIN, merge configs

      for (let application of applications) {
        if (!application.disable) {
          await this.enableApplication(application);
        }
      }
      this.startWatchConf();
    } catch (ex) {
      console.error(`fail to load configuration`, ex);
    }
  }

  public static get storage() {
    return this.backendStorage;
  }

  private static startWatchConf() {
    this.backendStorage.watchConf().pipe(
      filter(event => !!event.conf)
    ).subscribe(async (event) => {
      try {
        let conf = event.conf!;
        debug(`application conf change got (${ConfEventType[event.eventType]}): ${conf.name}`);
        if (event.eventType == ConfEventType.Deleted || conf.disable) {
          await this.disableApplication(conf.name);
        } else {
          await this.enableApplication(conf);
        }
      } catch (ex) {
        console.error('Error when handling application changes: ', ex);
      }
    }, err => {
      console.error('Error when watching application configurations: ', err);
    }, () => {});
  }

  private static async enableApplication(conf: ApplicationConfig) {
    // todo check if application or route changed reload on demand
    // compare with in memory instance, find changed item

    // clean previous context
    this.disableApplication(conf.name);

    // initialize new context runtime
    const contextDirector = new ContextDirector(conf);
    await contextDirector.initialize();
    this.applications.set(conf.name, conf);
    this.applicationContext.set(conf.name, contextDirector);
    for (let route of conf.routes) {
      switch (conf.inboundType) {
        case MessageType.HTTP:
          // support listening different port later conf.port
          await RouterManager.addHttpRouteFromConf(contextDirector, route);
          break;
        case MessageType.WebSocket:
          // todo websocket support later
          break;
      }
    }
  }

  private static disableApplication(name: string) {
    if (this.applications.has(name)) {
      const previousConf = this.applications.get(name) as ApplicationConfig;
      const previousContext = this.applicationContext.get(name);
      if (previousContext) {
        previousContext.dispose();
      }
      for (let route of previousConf.routes) {
        RouterManager.deleteRouteByName(route.name);
      }
      this.applications.delete(previousConf.name);
      this.applicationContext.delete(previousConf.name);
    }
  }

  private static async preloadApplications(preloadConfUrl: string): Promise<ApplicationConfig[]> {
    // request download body, unzip, list dir, foreach load conf, delete dir
    try {
      if (preloadConfUrl == '') {
        return [];
      }
      let resultApps: ApplicationConfig[] = [];
      let downloadList = preloadConfUrl.split(';');
      for (let url of downloadList) {
        const tempRes = `temp_download_${Math.random()}_${Date.now().valueOf()}`;
        const res = await axios({
          url,
          method: 'GET',
          responseType: 'stream',
        });
        if (res.status !== 200) {
          console.error(`Can not download preload conf of (${url}. status: ${res.status}, skip.`);
        } else {
          await this.extractFromStream(res, tempRes);
          console.log(`${url} => ${tempRes} downloaded, start preload conf import.`);
          let apps = await this.backendStorage.importConf(tempRes);
          resultApps = resultApps.concat(apps);
        }
      }
      return resultApps;
    } catch (ex) {
      console.error(`Can not download preload conf of (${preloadConfUrl}.`, ex);
      return [];
    }
  }

  private static async extractFromStream(res: AxiosResponse, dist: string) {
    return new Promise((resolve, reject) => {
      res.data.pipe(unzipper.Extract({ path: dist })).on('close', () => resolve()).on('error', (err: Error) => reject(err));
    });
  }
}