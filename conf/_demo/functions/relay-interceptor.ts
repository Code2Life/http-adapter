import { Context } from 'koa';
import { AxiosRequestConfig } from 'axios';
import { DynamicRuntime } from '../types';

/**
 *
 * @param {AxiosConfig} axiosConf
 * @param {KoaContext} context
 */
async function relayInterceptor(this: DynamicRuntime, axiosConf: AxiosRequestConfig, ctx: Context) {
  this.log(`relay interceptor from config: ${ctx.hostname}, ${JSON.stringify(axiosConf)}`);
}

export default relayInterceptor;