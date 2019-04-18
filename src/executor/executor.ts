import { Context } from 'koa';
import { RunTimeEnvironment } from '../runtime/context';

export abstract class Executor<T, L> {

  protected envConf: L;
  protected ctxRunEnv: RunTimeEnvironment;

  constructor(conf: L, ctxRunEnv: RunTimeEnvironment) {
    this.envConf = conf;
    this.ctxRunEnv = ctxRunEnv;
  }

  abstract execute(context?: Context): Promise<T>;

}

export type FuncSet = {
  [key: string]: Function;
};