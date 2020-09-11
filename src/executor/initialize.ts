
import Debug from 'debug';
import { FunctionResolver } from '../compiler/func-resolver';
import { ModuleResolver } from '../compiler/module-resolver';
import { TemplateResolver } from '../compiler/tmpl-resolver';
import { MixinResolver } from '../compiler/mixin-resolver';
import { constants } from '../constants';
import { ApplicationConfig } from '../model/application';
import { ExtractionSpec } from '../model/route';
import { Executor, FuncSet } from './executor';

const debug = Debug('server:initialize-stage');

export class InitializeStage extends Executor<void, ApplicationConfig> {

  public async execute(): Promise<void> {
    try {
      await this.generateInitialContext();
      this.generateExtractStageFunctions();
      this.generateRelayStageFunctions();
      this.generateResponseStageFunctions();
      debug('finish initialize runtime context for :' + this.envConf.name);
    } catch (ex) {
      console.error('context initialization error of ' + this.envConf.name, ex);
      this.ctxRunEnv.appendError(ex);
      throw ex;
    }
  }

  private async generateInitialContext() {
    // install and load libs, make env, generate variables
    await ModuleResolver.loadAndInitDependencies(this.envConf.initContext.libraries, this.ctxRunEnv);
    TemplateResolver.compileTemplateObjToFunction(this.envConf.initContext.constants,
      this.ctxRunEnv, constants.INIT_CONTEXT_TEMPLATE_FUNC_PREFIX);
    FunctionResolver.compileAndLoadFunctionObj(this.envConf.initContext.initFunctions,
      this.ctxRunEnv, constants.INIT_FUNC_PREFIX);
    FunctionResolver.compileAndLoadFunctionObj(this.envConf.initContext.functions, this.ctxRunEnv);
    // call initTemplates and initFunctions, to initialize constants and context
    MixinResolver.loadMixins(this.envConf.mixins, this.ctxRunEnv);
    await this.invokeInitFunctions();
  }

  private async invokeInitFunctions() {
    const initConstants = this.envConf.initContext.constants;
    const initFunctions = this.envConf.initContext.initFunctions;

    const runtime = this.ctxRunEnv.getRunTimeEnv();
    for (let constName in initConstants) {
      let tmpFunc = (<FuncSet>runtime)[constants.INIT_CONTEXT_TEMPLATE_FUNC_PREFIX + constName];
      if (typeof tmpFunc === 'function') {
        try {
          this.ctxRunEnv.setPropertyToRunTime(constName, tmpFunc());
        } catch (ex) {
          ex.message = `error when initialize constant (${constName}): ${ex.message}`;
          this.ctxRunEnv.appendError(ex);
        }
        debug(`finish execute init constant ${constName} for context ${this.envConf.name}`);
      }
    }
    for (let funcName in initFunctions) {
      let tmpFunc = (<FuncSet>runtime)[constants.INIT_FUNC_PREFIX + funcName];
      if (typeof tmpFunc === 'function') {
        try {
          await tmpFunc();
        } catch (ex) {
          ex.message = `error when initialize function (${funcName}): ${ex.message}`;
          this.ctxRunEnv.appendError(ex);
        }
        debug(`finish execute init function ${funcName} for context ${this.envConf.name}`);
      }
    }
  }

  private generateExtractStageFunctions() {
    for (let routeConf of this.envConf.routes) {
      this.generateValidateFunctions(routeConf.extract.headerHandlers, routeConf.name, constants.VERIFY_REQ_HEADER_PREFIX);
      this.generateValidateFunctions(routeConf.extract.bodyHandlers, routeConf.name, constants.VERIFY_REQ_BODY_PREFIX);
    }
  }

  private generateValidateFunctions(spec: ExtractionSpec[], routeName: string, prefix: string) {
    for (let handler of spec) {
      if (handler.validate) {
        FunctionResolver.compileAndLoadSingleFunction(handler.key, handler.validate, this.ctxRunEnv, prefix + routeName);
      }
    }
  }

  private generateRelayStageFunctions() {
    for (let routeConf of this.envConf.routes) {
      let cnt = 0;
      for (let relayConf of routeConf.relay) {
        TemplateResolver.compileTemplateStrToFunction(constants.URL_PROP_SUFFIX, relayConf.location,
          this.ctxRunEnv, constants.RELAY_PROP_TEMPLATE_FUNC_PREFIX + routeConf.name + cnt);
        if (relayConf.headers) {
          TemplateResolver.compileTemplateObjToFunction(relayConf.headers,
            this.ctxRunEnv, constants.RELAY_HEADER_TEMPLATE_FUNC_PREFIX + routeConf.name + cnt);
        }
        if (relayConf.body) {
          TemplateResolver.compileTemplateStrToFunction(constants.BODY_PROP_SUFFIX, relayConf.body,
            this.ctxRunEnv, constants.RELAY_PROP_TEMPLATE_FUNC_PREFIX + routeConf.name + cnt);
        }
        if (relayConf.interceptors) {
          FunctionResolver.compileAndLoadFunctionObj(relayConf.interceptors,
            this.ctxRunEnv, constants.RELAY_INTERCEPTOR_FUNC_PREFIX + routeConf.name + cnt);
        }
        cnt++;
      }
    }
  }

  private generateResponseStageFunctions() {
    for (let routeConf of this.envConf.routes) {
      if (routeConf.response.headers) {
        TemplateResolver.compileTemplateObjToFunction(routeConf.response.headers,
          this.ctxRunEnv, constants.RESP_HEADER_TEMPLATE_FUNC_PREFIX + routeConf.name);
      }
      if (routeConf.response.body) {
        TemplateResolver.compileTemplateStrToFunction(constants.BODY_PROP_SUFFIX, routeConf.response.body,
          this.ctxRunEnv, constants.RESP_PROP_TEMPLATE_FUNC_PREFIX + routeConf.name);
      }
      if (routeConf.response.interceptors) {
        FunctionResolver.compileAndLoadFunctionObj(routeConf.response.interceptors,
          this.ctxRunEnv, constants.RESP_INTERCEPTOR_FUNC_PREFIX + routeConf.name);
      }
    }
  }
}