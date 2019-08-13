import axios from 'axios';
import Debug from 'debug';
import unzipper from 'unzipper';
import ContextDirector from '../executor/director';
import { ApplicationConfig } from '../model/application';
import { MessageType } from '../model/enums';
import { ConfEventType, ConfStorage } from '../storage/storage';
import { StorageFactory } from '../storage/storage-factory';
import { RouterManager } from './route-manager';

const debug = Debug('server:config-manager');

export class ConfigManager {

  public static applications: Map<string, ApplicationConfig> = new Map();
  public static applicationContext: Map<string, ContextDirector> = new Map();

  private static backendStorage: ConfStorage;

  public static async initAllConfAndStartWatch(preloadConfUrl: string) {
    try {
      this.backendStorage = await StorageFactory.createBackendStorage();
      let applications = await this.backendStorage.loadAllConfigurations();
      await this.preloadApplications(preloadConfUrl);

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
    this.backendStorage.watchConf().subscribe(async (event) => {
      try {
        let conf = event.conf;
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

  private static preloadApplications(preloadConfUrl: string) {
    // request download body, unzip, list dir, foreach load conf, delete dir
    return new Promise((resolve, reject) => {
      if (preloadConfUrl == '') {
        resolve();
        return;
      }
      const tempRes = `temp_download_${Date.now().valueOf()}`;
      axios({
        url: preloadConfUrl,
        method: 'GET',
        responseType: 'stream',
      }).then((res) => {
        if (res.status !== 200) {
          reject(new Error(`Can not download preload conf of (${preloadConfUrl}. status: ${res.status}`));
          return;
        }
        const importConf = () => {
          console.log(`${preloadConfUrl} => ${tempRes} downloaded, start preload conf import.`);
          this.backendStorage.importConf(tempRes).then(() => resolve()).catch(err => reject(err));
        };
        res.data.pipe(unzipper.Extract({ path: tempRes })).on('close', importConf).on('error', (err: Error) => reject(err));
      }).catch(err => reject(err));
    });
  }
}