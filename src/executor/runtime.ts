import Debug from 'debug';
import { AdaptorConfig } from '../model';

const debug = Debug('server:runtime-ctx');

export class RunTimeEnvironment {


  private envConf: AdaptorConfig;
  private runContext: Object = {};

  constructor(conf: AdaptorConfig) {
    this.envConf = conf;
    this.setPropertyToRunTime('_envConf', this.envConf);
  }

  public setPropertyToRunTime(key: string, obj: any) {
    debug(`define runtime args: ${key}`);
    Object.defineProperty(this.runContext, key, {
      enumerable: true,
      writable: true,
      value: obj
    });
  }

  public getRunTimeEnv() {
    return this.runContext;
  }
}