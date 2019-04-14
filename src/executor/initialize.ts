
import Debug from 'debug';
import { FunctionResolver } from '../compiler/func-resolver';
import { ModuleResolver } from '../compiler/module-resolver';
import { TemplateResolver } from '../compiler/tmpl-resolver';
import { constants } from '../constants';
import { Executor, FuncSet } from './executor';

const debug = Debug('server:initialize-stage');

export class InitializeStage extends Executor<void> {

  public async execute(): Promise<void> {
    await this.generateInitialContext();
    this.generateExtractStageFunctions();
    this.generateRelayStageFunctions();
    this.generateResponseStageFunctions();
    debug('finish initialize runtime context for :' + this.envConf.name);
  }

  private async generateInitialContext() {
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
    // call initFunctions
    await this.invokeInitFunctions();
  }

  private async invokeInitFunctions() {
    const initFunctions = this.envConf.initContext.initFunctions;
    const runtime = this.ctxRunEnv.getRunTimeEnv();
    for (let funcName in initFunctions) {
      let tmpFunc = (<FuncSet>runtime)[constants.INIT_CONTEXT_TEMPLATE_FUNC_PREFIX + funcName];
      if (typeof tmpFunc === 'function') {
        await tmpFunc();
        debug(`finish execute init function ${funcName} for context ${this.envConf.name}`);
      }
    }
  }

  private generateExtractStageFunctions() {
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
  }

  private generateRelayStageFunctions() {
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
  }

  private generateResponseStageFunctions() {
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
  }
}