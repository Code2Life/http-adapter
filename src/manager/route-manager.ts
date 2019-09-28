import Debug from 'debug';
import Router from 'koa-router';
import ContextDirector from '../executor/director';
import { RouteConfig } from '../model/route';

const debug = Debug('server:router');

export class RouterManager {

  public static router = new Router();
  public static routerMap = new Map<string, Router.Layer>();

  public static async addHttpRouteFromConf(director: ContextDirector, conf: RouteConfig) {
    // register to router
    const layer = this.router.register(conf.location, [conf.method], director.getHandlerByRoute(conf.name));
    layer.name = conf.name;
    this.routerMap.set(layer.name, layer);
    debug('finish initialize routing layer.');
  }

  public static deleteRouteByName(name: string) {
    this.router.stack = this.router.stack.filter(s => s.name && s.name !== name);
    this.routerMap.delete(name);
  }
}