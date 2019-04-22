import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import Debug from 'debug';
import { Context } from 'koa';
import { constants } from '../constants';
import { MessageType } from '../model/enums';
import { RelayConfig, RouteConfig } from '../model/route';
import { Executor, FuncSet } from './executor';

const debug = Debug('server:relay-stage');

export class RelayStage extends Executor<void, RouteConfig> {

  async execute(ctx: Context): Promise<void> {
    // compose and send requests to other servers
    let relayResultMap = new Map<string, AxiosResponse>();
    let cnt = 0;
    for (let relayConf of this.envConf.relay) {
      switch (relayConf.outboundType) {
        case MessageType.HTTP:
          const result = await this.httpRequestRelay(ctx, relayConf, cnt);
          if (result) {
            relayResultMap.set(relayConf.name, result);
          }
          break;
        case MessageType.WebSocket:
          // todo support websocket later
          break;
        default:
          throw new Error(`relay message type not supported: ${relayConf.outboundType}`);
      }
      cnt++;
    }
    ctx.relayResultMap = relayResultMap;
    debug(`${ctx.reqId}: finish request relay`);
  }

  async httpRequestRelay(ctx: Context, relayConf: RelayConfig, confIndex: number) {
    let runtime = this.ctxRunEnv.getRunTimeEnv();
    let routeName = this.envConf.name;
    let { name, location, method, body, headers, interceptors } = relayConf;
    let sendMethod = method.toUpperCase();
    let axiosConf = {
      method: sendMethod,
      url: location,
      headers: Object.assign({}, headers),
      data: body
    };

    // step1, replace template in url, body and header
    this.replaceTemplate(ctx, runtime, axiosConf, routeName, confIndex);
    debug(`${ctx.reqId}: processing relay request (${name}) - ${sendMethod} ${location}`);

    // step2, call interceptors to process request before sending
    if (interceptors) {
      for (let interceptor in interceptors) {
        let interceptorFunc = (<FuncSet>runtime)[constants.RELAY_INTERCEPTOR_FUNC_PREFIX + routeName + confIndex + interceptor];
        if (typeof interceptorFunc === 'function') {
          try {
            await interceptorFunc(axiosConf, ctx);
          } catch (ex) {
            ex.message = `${ctx.reqId}: Error when executing interceptor ${interceptor} for ${routeName} - ${confIndex}: ${ex.message}`;
            throw ex;
          }
        }
      }
    }
    // no actual call if magic dummy URL set, this could prevent real http request being sent
    if (location !== constants.NO_RELAY_DUMMY_URL) {
      return await axios(axiosConf);
    }
  }

  private replaceTemplate(ctx: Context, runtime: Object, axiosConf: AxiosRequestConfig, routeName: string, confIndex: number) {
    try {
      let tmplReplaceFuncURL = (<FuncSet>runtime)[constants.RELAY_PROP_TEMPLATE_FUNC_PREFIX +
        routeName + confIndex + constants.URL_PROP_SUFFIX];
      let tmplReplaceFuncBody = (<FuncSet>runtime)[constants.RELAY_PROP_TEMPLATE_FUNC_PREFIX +
        routeName + confIndex + constants.BODY_PROP_SUFFIX];
      if (typeof tmplReplaceFuncURL === 'function') {
        axiosConf.url = tmplReplaceFuncURL(ctx);
      }
      if (axiosConf.data && typeof tmplReplaceFuncBody === 'function') {
        axiosConf.data = tmplReplaceFuncBody(ctx);
      }
      for (let key in axiosConf.headers) {
        let tmplReplaceFuncHeader = (<FuncSet>runtime)[constants.RELAY_HEADER_TEMPLATE_FUNC_PREFIX + routeName + confIndex + key];
        if (typeof tmplReplaceFuncHeader === 'function') {
          axiosConf.headers[key] = tmplReplaceFuncHeader(ctx);
        }
      }
    } catch (ex) {
      ex.message = `${ctx.reqId}: Error when replacing template strings on relay stage for ${routeName} - ${confIndex}: ${ex.message}`;
      throw ex;
    }
  }
}