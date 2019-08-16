import Debug from 'debug';
import { Context } from 'koa';
import { constants } from '../constants';
import { RouteConfig } from '../model/route';
import { ContextHttpResponse, KVPair } from '../model/types';
import { Executor, FuncSet } from './executor';

const debug = Debug('server:response-stage');

export class ResponseStage extends Executor<void, RouteConfig> {

  async execute(ctx: Context): Promise<void> {
    if (ctx.finishProcessing) {
      return;
    }
    // compose and send response back to origin client
    let respConf = this.envConf.response;
    let routeName = this.envConf.name;
    let { body, headers, interceptors } = respConf;
    let responseObj = {
      statusCode: 200,
      headers: Object.assign({}, headers),
      body: body
    };
    let runtime = this.ctxRunEnv.getRunTimeEnv();

    // replace template strings based on extraction or relay result
    this.replaceTemplate(ctx, runtime, routeName, responseObj);

    // call interceptors to process response data
    if (interceptors) {
      await this.executeResponseInterceptors(ctx, runtime, routeName, responseObj, interceptors);
    }

    // send response back
    ctx.response.status = responseObj.statusCode;
    Object.keys(responseObj.headers).length > 0 && ctx.set(responseObj.headers);
    ctx.body = responseObj.body;
    debug(`${ctx.reqId}: finish response composing`);
  }

  private replaceTemplate(ctx: Context, runtime: Object, routeName: string, responseObj: ContextHttpResponse) {
    try {
      let tmplReplaceFuncBody = (<FuncSet>runtime)[constants.RESP_PROP_TEMPLATE_FUNC_PREFIX + routeName + constants.BODY_PROP_SUFFIX];
      if (typeof tmplReplaceFuncBody === 'function') {
        responseObj.body = tmplReplaceFuncBody(ctx);
      }
      for (let key in responseObj.headers) {
        let tmplReplaceFuncHeader = (<FuncSet>runtime)[constants.RESP_HEADER_TEMPLATE_FUNC_PREFIX + routeName + key];
        if (typeof tmplReplaceFuncHeader === 'function') {
          responseObj.headers[key] = tmplReplaceFuncHeader(ctx);
        }
      }
    } catch (ex) {
      ex.message = `${ctx.reqId}: Error when replacing template strings on response stage for ${routeName}: ${ex.message}`;
      throw ex;
    }
  }

  private async executeResponseInterceptors(ctx: Context, runtime: Object, routeName: string, responseObj: ContextHttpResponse, interceptors: KVPair) {
    for (let interceptor in interceptors) {
      let interceptorFunc = (<FuncSet>runtime)[constants.RESP_INTERCEPTOR_FUNC_PREFIX + routeName + interceptor];
      if (typeof interceptorFunc === 'function') {
        try {
          await interceptorFunc(responseObj, ctx);
          return responseObj;
        } catch (ex) {
          ex.message = `${ctx.reqId}: Error when executing interceptor ${interceptor} for ${routeName}: ${ex.message}`;
          throw ex;
        }
      }
    }
  }
}