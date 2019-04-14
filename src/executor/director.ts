import Debug from 'debug';
import { Context } from 'koa';
import { AdaptorConfig } from '../model';
import { RunTimeEnvironment } from '../runtime/context';
import { ExtractStage } from './extract';
import { InitializeStage } from './initialize';
import { RelayStage } from './relay';
import { ResponseStage } from './response';
import uuid = require('uuid');

const debug = Debug('server:director');

export default class ContextDirector {


  private ctxRunEnv: RunTimeEnvironment;
  private envConf: AdaptorConfig;

  private initializeStage: InitializeStage;
  private extractStage: ExtractStage;
  private relayStage: RelayStage;
  private responseStage: ResponseStage;

  constructor(conf: AdaptorConfig) {
    this.envConf = conf;
    this.ctxRunEnv = new RunTimeEnvironment(conf);
    this.initializeStage = new InitializeStage(this.envConf, this.ctxRunEnv);
    this.extractStage = new ExtractStage(this.envConf, this.ctxRunEnv);
    this.relayStage = new RelayStage(this.envConf, this.ctxRunEnv);
    this.responseStage = new ResponseStage(this.envConf, this.ctxRunEnv);
  }

  public initialize() {
    return this.initializeStage.execute();
  }

  get handler() {
    const director = this;
    const conf = this.envConf;
    return async (ctx: Context, next: () => Promise<any>) => {
      ctx.reqId = uuid.v4();
      ctx.startTime = Date.now();
      debug(`${ctx.reqId}: ${ctx.method} ${ctx.url} at ${ctx.startTime}`);
      try {
        if (conf.hostname && (ctx.request.hostname !== conf.hostname)) {
          debug(`${ctx.reqId}: skip routing because hostname not match.`);
          return next();
        }
        // different template method for different resp policy
        let valid = await director.extractStage.execute(ctx);
        if (!valid) {
          // 400 bad request
          ctx.response.status = 400;
          return;
        }
        if (conf.response.policy === 'immediate') {
          await director.responseStage.execute(ctx);
          await next();
          await director.relayStage.execute(ctx);
        } else {
          await director.relayStage.execute(ctx);
          await director.responseStage.execute(ctx);
          await next();
        }
      } catch (ex) {
        this.ctxRunEnv.appendError(ex);
        throw ex;
      } finally {
        const duration = Date.now() - ctx.startTime;
        debug(`${ctx.reqId}: done in ${duration} ms`);
        this.ctxRunEnv.requestMetrics(ctx.startTime, duration);
      }
    };
  }
}