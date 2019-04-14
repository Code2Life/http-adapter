import { AdaptorConfig } from '../model';
import RouterManager from './route-manager';

export class ConfigManager {

  public static allConf: Map<string, AdaptorConfig> = new Map();

  public static async addConfig(conf: AdaptorConfig) {
    if (this.allConf.has(conf.name)) {
      throw new Error('Can not add configuration with existing name');
    }
    this.allConf.set(conf.name, conf);
    await RouterManager.addRouterFromConf(conf);
  }

  public static updateConfig(conf: AdaptorConfig) {
    if (!this.allConf.has(conf.name)) {
      throw new Error('Can not update configuration with none-existing name');
    }
    this.allConf.set(conf.name, conf);
    RouterManager.deleteRouteByName(conf.name);
    RouterManager.addRouterFromConf(conf);
  }

  public static deleteConfig(name: string) {
    this.allConf.delete(name);
    RouterManager.deleteRouteByName(name);
  }
}