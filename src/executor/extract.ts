import Debug from 'debug';
import { Context } from 'koa';
import { constants } from '../constants';
import { Executor, FuncSet } from './executor';

const debug = Debug('server:extract-stage');

export class ExtractStage extends Executor<boolean> {
  async execute(ctx: Context): Promise<boolean> {
    // validate/filter, extract and set variables from header and body
    let runtime = this.ctxRunEnv.getRunTimeEnv();
    let result = true;
    for (let handler of this.envConf.extract.headerHandlers) {
      let header = ctx.request.headers[handler.key];
      if (handler.validate) {
        let tmpValidateFunc = (<FuncSet>runtime)[constants.VERIFY_REQ_HEADER_PREFIX + handler.key];
        if (typeof tmpValidateFunc === 'function') {
          try {
            let validateResult = await tmpValidateFunc(header, ctx.request);
            if (!validateResult) {
              throw new Error(`header validation not pass: ${handler.key}`);
            }
          } catch (ex) {
            result = false;
            this.ctxRunEnv.appendError(ex);
            console.error(`Error when calling validate header function ${handler.key} in context ${this.envConf.name}`, ex);
          }
        }
      }
      this.ctxRunEnv.setPropertyToRunTime(handler.alias || handler.key, header);
    }

    // pass header validation, now process body
    if (result) {
      for (let handler of this.envConf.extract.bodyHandlers) {
        let body = ctx.request.body[handler.key];
        if (handler.validate) {
          let tmpValidateFunc = (<FuncSet>runtime)[constants.VERIFY_REQ_BODY_PREFIX + handler.key];
          if (typeof tmpValidateFunc === 'function') {
            try {
              let validateResult = await tmpValidateFunc(body, ctx.request);
              if (!validateResult) {
                throw new Error(`body validation not pass: ${handler.key}`);
              }
            } catch (ex) {
              result = false;
              this.ctxRunEnv.appendError(ex);
              console.error(`Error when calling validate body function ${handler.key} in context ${this.envConf.name}`, ex);
            }
          }
        }
        this.ctxRunEnv.setPropertyToRunTime(handler.alias || handler.key, body);
      }
    }
    debug(`${ctx.reqId}: finish request extraction`);
    return result;
  }

}