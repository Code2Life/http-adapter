import Debug from 'debug';
import ContextDirector from '../executor/director';
import { ApplicationConfig, ContextPlugin } from '../storage/model';
import { ConfEventType, ConfStorage } from '../storage/storage';
import { StorageFactory } from '../storage/storage-factory';
import { RouterManager } from './route-manager';

const debug = Debug('server:config-manager');

export class ConfigManager {

  public static applications: Map<string, ApplicationConfig> = new Map();
  public static applicationContext: Map<string, ContextDirector> = new Map();
  public static plugins: Map<string, ContextPlugin> = new Map();

  private static backendStorage: ConfStorage;

  public static async initAllConfAndStartWatch() {
    try {
      this.backendStorage = await StorageFactory.createBackendStorage();
      // step1, load all plugins to server
      let plugins = await this.backendStorage.listAllPlugins();
      for (let plugin of plugins) {
        if (plugin.enable) {
          await this.enablePlugin(plugin);
        }
      }
      // step2, load all context configuration applications
      let applications = await this.backendStorage.listAllApplications();
      for (let application of applications) {
        if (application.enable) {
          await this.enableApplication(application);
        }
      }

      // step3,start watch configuration changes
      this.startWatch();
    } catch (ex) {
      console.error(`fail to load configuration`, ex);
    }
  }

  public static get storage() {
    return this.backendStorage;
  }

  private static startWatch() {
    this.backendStorage.watchApplicationConf().subscribe(async (event) => {
      try {
        let conf = event.conf;
        debug(`application conf change got (${ConfEventType[event.eventType]}): ${conf.name}`);
        if (event.eventType == ConfEventType.Deleted || !conf.enable) {
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

    this.backendStorage.watchPluginConf().subscribe(async (event) => {
      try {
        let conf = event.conf;
        debug(`plugin conf change got (${ConfEventType[event.eventType]}): ${conf.name}`);
        if (event.eventType == ConfEventType.Deleted || !conf.enable) {
          await this.disablePlugin(conf.name);
        } else {
          await this.enablePlugin(conf);
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
      await RouterManager.addRouterFromConf(contextDirector, route);
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

  private static async enablePlugin(plugin: ContextPlugin) {
    this.plugins.set(plugin.name, plugin);
    // todo
  }

  private static async disablePlugin(name: string) {
    this.plugins.delete(name);
    // todo
  }
}