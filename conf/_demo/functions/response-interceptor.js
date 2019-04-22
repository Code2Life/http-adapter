// import { ResponseObj } from '../types' ;
// import { Context} from 'koa';

/**
 * @param respObj, statusCode, headers, body
 * @param ctx, Koa2 request context
 */
async (respObj, ctx) => {
  this.log(`response interceptor from config: ${ctx.reqId}`);
}