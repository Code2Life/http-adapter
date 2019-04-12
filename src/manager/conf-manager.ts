import { AdaptorConfig } from '../model';
import RouterManager from './route-manager';

export class ConfigManager {

  public static allConf: Map<string, AdaptorConfig> = new Map();

  public static addConfig(conf: AdaptorConfig) {
    this.allConf.set(conf.name, conf);
    RouterManager.addRouterFromConf(conf);
  }

  public static deleteConfig(name: string) {
    this.allConf.delete(name);
    RouterManager.deleteRouteByName(name);
  }
}