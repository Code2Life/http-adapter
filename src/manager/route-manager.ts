import Debug from 'debug';
import Router from 'koa-router';
import uuid from 'uuid';
import ContextDirector from '../executor/director';
import { AdaptorConfig } from '../model';

const debug = Debug('server:router');

export default class RouterManager {

  public static router = new Router();

  public static async addRouterFromConf(conf: AdaptorConfig) {
    // initialize context runtime
    const director = new ContextDirector(conf);
    await director.initialize();

    // register to router
    const layer = this.router.register(conf.location, [conf.method], async (ctx, next) => {
      ctx.reqId = uuid.v4();
      ctx.startTime = Date.now();
      if (conf.hostname && (ctx.request.hostname !== conf.hostname)) {
        debug(`${ctx.reqId}: skip routing because hostname not match.`);
        return next();
      }
      // different template method for different resp policy
      let valid = await director.extractFromRequest(ctx);
      if (!valid) {
        // 400 bad request
        ctx.response.status = 400;
        return;
      }
      if (conf.response.policy === 'immediate') {
        await director.composeResponse(ctx);
        await next();
        await director.relayRequests(ctx);
      } else {
        await director.relayRequests(ctx);
        await director.composeResponse(ctx);
        await next();
      }
      debug(`${ctx.reqId}: done in ${Date.now() - ctx.startTime} ms`);
    });
    layer.name = conf.name;
    debug('finish initialize routing layer.');
  }

  public static deleteRouteByName(name: string) {
    // todo
  }
}