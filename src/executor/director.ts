import Debug from 'debug';
import { EventEmitter } from 'events';
import { Context } from 'koa';
import { ApplicationConfig } from '../model/application';
import { RunTimeEnvironment } from '../runtime/context';
import { ContextMetrics } from '../runtime/metrics';
import { ExtractStage } from './extract';
import { InitializeStage } from './initialize';
import { RelayStage } from './relay';
import { ResponseStage } from './response';
import uuid = require('uuid');

const debug = Debug('server:director');
const trace = Debug('trace:http');

export default class ContextDirector {


  private ctxRunEnv: RunTimeEnvironment;
  private envConf: ApplicationConfig;

  private initializeStage: InitializeStage;
  private extractStages: Map<string, ExtractStage> = new Map();
  private relayStages: Map<string, RelayStage> = new Map();
  private responseStages: Map<string, ResponseStage> = new Map();

  constructor(conf: ApplicationConfig) {
    this.envConf = conf;
    this.ctxRunEnv = new RunTimeEnvironment(conf);
    this.initializeStage = new InitializeStage(this.envConf, this.ctxRunEnv);
    for (let route of conf.routes) {
      this.extractStages.set(route.name, new ExtractStage(route, this.ctxRunEnv));
      this.relayStages.set(route.name, new RelayStage(route, this.ctxRunEnv));
      this.responseStages.set(route.name, new ResponseStage(route, this.ctxRunEnv));
    }
  }

  public initialize() {
    return this.initializeStage.execute();
  }

  /**
   * @remark if anything else need dispose, such as db connection or timeout/intervals
   * add an initFunction like: function dispose() { this.on('dispose', () => {}) }
   */
  public dispose() {
    (<EventEmitter>this.ctxRunEnv.getRunTimeEnv()).emit('dispose');
  }

  public getHandlerByRoute(routeName: string) {
    const conf = this.envConf;
    const routeConf = this.envConf.routes.filter(r => r.name === routeName)[0];
    const extractStage = this.extractStages.get(routeName);
    const relayStage = this.relayStages.get(routeName);
    const responseStage = this.responseStages.get(routeName);

    if (!extractStage || !relayStage || !responseStage) {
      throw new Error('Server error, invalid runtime context for application: ' + conf.name);
    }

    return async (ctx: Context, next: () => Promise<any>) => {
      ctx.reqId = uuid.v4();
      ctx.startTime = Date.now();
      debug(`${ctx.reqId}: ${ctx.method} ${ctx.url} at ${ctx.startTime}`);
      trace(`${ctx.reqId}: ${JSON.stringify(ctx.headers)} \n ${ctx.reqId}: ${JSON.stringify(ctx.request.body)}`);
      try {
        if (conf.hostname && (ctx.request.hostname !== conf.hostname)) {
          debug(`${ctx.reqId}: skip routing because hostname not match.`);
          return next();
        }
        // different template method for different resp policy
        let valid = await extractStage.execute(ctx);
        if (!valid) {
          // 400 bad request
          ctx.response.status = 400;
          return;
        }
        if (routeConf.response.policy === 'immediate') {
          await responseStage.execute(ctx);
          await next();
          await relayStage.execute(ctx);
        } else {
          await relayStage.execute(ctx);
          await responseStage.execute(ctx);
          await next();
        }
      } catch (ex) {
        this.ctxRunEnv.appendError(ex);
        throw ex;
      } finally {
        const duration = Date.now() - ctx.startTime;
        debug(`${ctx.reqId}: done in ${duration} ms`);
        ContextMetrics.triggerMetrics(this.envConf, routeConf, ctx.startTime, duration);
      }
    };
  }
}