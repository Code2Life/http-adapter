import Debug from 'debug';
import { Context } from 'koa';
import { constants } from '../constants';
import { Executor, FuncSet } from './executor';

const debug = Debug('server:response-stage');

export class ResponseStage extends Executor<void> {

  async execute(ctx: Context): Promise<void> {
    // compose and send response back to origin client
    let respConf = this.envConf.response;
    let { body, headers, interceptors } = respConf;
    let responseObj = {
      statusCode: 200,
      headers: Object.assign({}, headers),
      body: ''
    };
    let runtime = this.ctxRunEnv.getRunTimeEnv();

    let tmplReplaceFuncBody = (<FuncSet>runtime)[constants.RESP_PROP_TEMPLATE_FUNC_PREFIX + constants.BODY_PROP_SUFFIX];
    if (body && typeof tmplReplaceFuncBody === 'function') {
      responseObj.body = tmplReplaceFuncBody();
    }
    if (headers) {
      for (let key in headers) {
        let tmplReplaceFuncHeader = (<FuncSet>runtime)[constants.RESP_HEADER_TEMPLATE_FUNC_PREFIX + key];
        if (typeof tmplReplaceFuncHeader === 'function') {
          responseObj.headers[key] = tmplReplaceFuncHeader();
        }
      }
    }

    // call interceptors to process response data
    if (interceptors) {
      for (let interceptor in interceptors) {
        let interceptorFunc = (<FuncSet>runtime)[constants.RESP_INTERCEPTOR_FUNC_PREFIX + interceptor];
        if (typeof interceptorFunc === 'function') {
          responseObj = await interceptorFunc(responseObj, ctx);
        }
      }
    }

    // send response back
    ctx.response.status = responseObj.statusCode;
    ctx.headers = responseObj.headers;
    ctx.body = responseObj.body;
    debug(`${ctx.reqId}: finish response composing`);
  }
}