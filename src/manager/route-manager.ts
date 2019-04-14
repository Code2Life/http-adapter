import Debug from 'debug';
import Router from 'koa-router';
import ContextDirector from '../executor/director';
import { AdaptorConfig } from '../model';

const debug = Debug('server:router');

export default class RouterManager {

  public static router = new Router();
  public static routerMap = new Map<string, Router.Layer>();
  public static directorMap = new Map<string, ContextDirector>();

  public static async addRouterFromConf(conf: AdaptorConfig) {
    // initialize context runtime
    const director = new ContextDirector(conf);
    await director.initialize();
    // register to router
    const layer = this.router.register(conf.location, [conf.method], director.handler);
    layer.name = conf.name;
    this.routerMap.set(layer.name, layer);
    this.directorMap.set(layer.name, director);
    debug('finish initialize routing layer.');
  }

  public static deleteRouteByName(name: string) {
    this.router.delete(name);
    this.routerMap.delete(name);
    this.directorMap.delete(name);
  }
}