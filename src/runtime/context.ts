import Debug from 'debug';
import { EventEmitter } from 'events';
import { ApplicationConfig } from '../model/application';

const debug = Debug('server:runtime-ctx');

type ErrorInfo = {
  timestamp: Date;
  message: string;
  ex: any;
};

const MAX_RESERVE_ERRORS = 100;

export class RunTimeEnvironment {

  private envConf: ApplicationConfig;
  private envErrors: ErrorInfo[];
  private runContext: Object = new EventEmitter();

  constructor(conf: ApplicationConfig) {
    this.envConf = conf;
    this.envErrors = [];
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

  public appendError(ex: any) {
    const err = {
      timestamp: new Date(),
      message: `context(${this.envConf.name}) runtime error: ${ex.message}`,
      ex
    };
    debug(`${err.message}, error stack: ${ex.stack}`);
    let total = this.envErrors.push();
    if (total > MAX_RESERVE_ERRORS) {
      this.envErrors.shift();
    }
  }

  public getErrorInfo(total: number = 1) {
    return this.envErrors.slice(-total);
  }

}