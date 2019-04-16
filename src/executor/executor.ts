import { Context } from 'koa';
import { AdapterConfig } from '../model';
import { RunTimeEnvironment } from '../runtime/context';

export abstract class Executor<T> {

  protected envConf: AdapterConfig;
  protected ctxRunEnv: RunTimeEnvironment;

  constructor(envConf: AdapterConfig, ctxRunEnv: RunTimeEnvironment) {
    this.envConf = envConf;
    this.ctxRunEnv = ctxRunEnv;
  }

  abstract execute(context?: Context): Promise<T>;

}

export type FuncSet = {
  [key: string]: Function;
};