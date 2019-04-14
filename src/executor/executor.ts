import { Context } from 'koa';
import { AdaptorConfig } from '../model';
import { RunTimeEnvironment } from './runtime';

export abstract class Executor<T> {

  protected envConf: AdaptorConfig;
  protected ctxRunEnv: RunTimeEnvironment;

  constructor(envConf: AdaptorConfig, ctxRunEnv: RunTimeEnvironment) {
    this.envConf = envConf;
    this.ctxRunEnv = ctxRunEnv;
  }

  abstract execute(context?: Context): Promise<T>;

}

export type FuncSet = {
  [key: string]: Function;
};