import axios from 'axios';
import Debug from 'debug';
import { Context } from 'koa';
import { AdaptorConfig } from '../model';
import { FunctionResolver } from '../compiler/func-resolver';
import { ModuleResolver } from '../compiler/module-resolver';
import { TemplateResolver } from '../compiler/tmpl-resolver';
import { constants } from '../constants';
import { RunTimeEnvironment } from './runtime';

const debug = Debug('server:director');

type FuncSet = {
  [key: string]: Function;
};

export default class ContextDirector {


  private ctxRunEnv: RunTimeEnvironment;
  private envConf: AdaptorConfig;

  constructor(conf: AdaptorConfig) {
    this.envConf = conf;
    this.ctxRunEnv = new RunTimeEnvironment(conf);
  }

  public async initialize() {
    // init constants
    const runtimeConst = this.envConf.initContext.constants;
    for (let key in runtimeConst) {
      this.ctxRunEnv.setPropertyToRunTime(key, runtimeConst[key]);
    }
    // install and load libs, make env, generate variables
    await ModuleResolver.loadAndInitDependencies(this.envConf.initContext.libraries, this.ctxRunEnv);
    TemplateResolver.compileTemplateObjToFunction(this.envConf.initContext.constants,
      this.ctxRunEnv, constants.INIT_CONTEXT_TEMPLATE_FUNC_PREFIX);
    FunctionResolver.compileAndLoadFunctionObj(this.envConf.initContext.initFunctions,
      this.ctxRunEnv, constants.INIT_FUNC_PREFIX);
    FunctionResolver.compileAndLoadFunctionObj(this.envConf.initContext.functions, this.ctxRunEnv);

    for (let handler of this.envConf.extract.headerHandlers) {
      if (handler.validate) {
        FunctionResolver.compileAndLoadSingleFunction(handler.key, handler.validate, this.ctxRunEnv, constants.VERIFY_REQ_HEADER_PREFIX);
      }
    }
    for (let handler of this.envConf.extract.bodyHandlers) {
      if (handler.validate) {
        FunctionResolver.compileAndLoadSingleFunction(handler.key, handler.validate, this.ctxRunEnv, constants.VERIFY_REQ_BODY_PREFIX);
      }
    }

    let cnt = 0;
    for (let relayConf of this.envConf.relay) {
      TemplateResolver.compileTemplateStrToFunction(constants.URL_PROP_SUFFIX, relayConf.url,
        this.ctxRunEnv, constants.RELAY_PROP_TEMPLATE_FUNC_PREFIX + cnt);
      if (relayConf.headers) {
        TemplateResolver.compileTemplateObjToFunction(relayConf.headers,
          this.ctxRunEnv, constants.RELAY_HEADER_TEMPLATE_FUNC_PREFIX + cnt);
      }
      if (relayConf.body) {
        TemplateResolver.compileTemplateStrToFunction(constants.BODY_PROP_SUFFIX, relayConf.body,
          this.ctxRunEnv, constants.RELAY_PROP_TEMPLATE_FUNC_PREFIX + cnt);
      }
      if (relayConf.interceptors) {
        FunctionResolver.compileAndLoadFunctionObj(relayConf.interceptors,
          this.ctxRunEnv, constants.RELAY_INTERCEPTOR_FUNC_PREFIX + cnt);
      }
      cnt++;
    }

    if (this.envConf.response.headers) {
      TemplateResolver.compileTemplateObjToFunction(this.envConf.response.headers,
        this.ctxRunEnv, constants.RESP_HEADER_TEMPLATE_FUNC_PREFIX);
    }
    if (this.envConf.response.body) {
      TemplateResolver.compileTemplateStrToFunction(constants.BODY_PROP_SUFFIX, this.envConf.response.body,
        this.ctxRunEnv, constants.RESP_PROP_TEMPLATE_FUNC_PREFIX);
    }
    if (this.envConf.response.interceptors) {
      FunctionResolver.compileAndLoadFunctionObj(this.envConf.response.interceptors,
        this.ctxRunEnv, constants.RESP_INTERCEPTOR_FUNC_PREFIX);
    }
    console.log('finish initialize runtime context for :' + this.envConf.name);
  }

  public async extractFromRequest(ctx: Context): Promise<boolean> {
    // validate/filter, extract and set variables from header and body
    let runtime = this.ctxRunEnv.getRunTimeEnv();
    let result = true;
    for (let handler of this.envConf.extract.headerHandlers) {
      let header = ctx.request.headers[handler.key];
      if (handler.validate) {
        let tmpValidateFunc = (<FuncSet>runtime)[constants.VERIFY_REQ_HEADER_PREFIX + handler.key];
        if (typeof tmpValidateFunc === 'function') {
          let validateResult = await tmpValidateFunc(header, ctx.request);
          if (!validateResult) {
            console.error(`header validation not pass: ${handler.key}`);
            result = false;
            break;
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
            let validateResult = await tmpValidateFunc(body, ctx.request);
            if (!validateResult) {
              console.error(`body validation not pass: ${handler.key}`);
              result = false;
              break;
            }
          }
        }
        this.ctxRunEnv.setPropertyToRunTime(handler.alias || handler.key, body);
      }
    }
    return result;
  }

  public async relayRequests(ctx: Context) {
    // compose and send requests to other servers
    let responseMap = new Map();
    let runtime = this.ctxRunEnv.getRunTimeEnv();
    let cnt = 0;
    for (let relayConf of this.envConf.relay) {
      let { name, url, method, body, headers, interceptors } = relayConf;
      let sendMethod = method.toUpperCase();
      let axiosConf = {
        method: sendMethod,
        url,
        headers: Object.assign({}, headers),
        data: body
      };
      console.log(`processing relay request (${name}): ${sendMethod} ${url}`);

      // step1, replace template in url, body and header
      let tmplReplaceFuncURL = (<FuncSet>runtime)[constants.RELAY_PROP_TEMPLATE_FUNC_PREFIX + cnt + constants.URL_PROP_SUFFIX];
      let tmplReplaceFuncBody = (<FuncSet>runtime)[constants.RELAY_PROP_TEMPLATE_FUNC_PREFIX + cnt + constants.BODY_PROP_SUFFIX];
      if (typeof tmplReplaceFuncURL === 'function') {
        axiosConf.url = tmplReplaceFuncURL();
      }
      if (body && typeof tmplReplaceFuncBody === 'function') {
        axiosConf.data = tmplReplaceFuncBody();
      }
      if (headers) {
        for (let key in headers) {
          let tmplReplaceFuncHeader = (<FuncSet>runtime)[constants.RELAY_HEADER_TEMPLATE_FUNC_PREFIX + cnt + key];
          if (typeof tmplReplaceFuncHeader === 'function') {
            axiosConf.headers[key] = tmplReplaceFuncHeader();
          }
        }
      }

      // step2, call interceptors to process request before sending
      if (interceptors) {
        for (let interceptor in interceptors) {
          let interceptorFunc = (<FuncSet>runtime)[constants.RELAY_INTERCEPTOR_FUNC_PREFIX + cnt + interceptor];
          if (typeof interceptorFunc === 'function') {
            axiosConf = await interceptorFunc(axiosConf, ctx);
          }
        }
      }

      // step3, send request to target server
      if (url !== constants.DUMMY_URL) {
        let resp = await axios(axiosConf);
        responseMap.set(name, resp);
      }
      ctx.responseMap = responseMap;
      cnt++;
    }
  }

  public async composeResponse(ctx: Context) {
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
  }
}