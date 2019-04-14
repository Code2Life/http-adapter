import Debug from 'debug';
import { AdaptorConfig } from '../model';
import { ContextMetrics } from './metrics';

const debug = Debug('server:runtime-ctx');

type ErrorInfo = {
  timestamp: Date;
  message: string;
  ex: any;
};

const MAX_RESERVE_ERRORS = 100;

export class RunTimeEnvironment {

  private envConf: AdaptorConfig;
  private envErrors: ErrorInfo[];
  private runContext: Object = {};

  constructor(conf: AdaptorConfig) {
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

  public requestMetrics(startTime: number, duration: number) {
    ContextMetrics.triggerMetrics(this.envConf, startTime, duration);
  }

  public getRunTimeEnv() {
    return this.runContext;
  }

  public appendError(ex: any) {
    let total = this.envErrors.push({
      timestamp: new Date(),
      message: `context(${this.envConf.name}) runtime error: ${ex.message}`,
      ex
    });
    if (total > MAX_RESERVE_ERRORS) {
      this.envErrors.shift();
    }
  }

  public getErrorInfo(total: number = 1) {
    return this.envErrors.slice(-total);
  }

}