import Debug from 'debug';
import { TSCompiler } from '../compiler/mini-compiler';
import { ConfigManager } from '../manager/conf-manager';
import { ApplicationConfig, CommonHttpMethod, ExtractionConfig, InitContextConfig, KVPair } from './model';

const debug = Debug('server:conf-normalizer');

export class ConfNormalizer {

  public static validateAndSetDefault4Application(rawObj: ApplicationConfig) {
    // validate and set default value for initContext section
    if (!rawObj.initContext) {
      rawObj.initContext = <InitContextConfig>{};
    }
    // init default libraries (lodash axios installed to all applications)
    rawObj.initContext.libraries = Object.assign({
      lodash: '_',
      axios: 'axios'
    }, rawObj.initContext.libraries);
    rawObj.initContext.constants = rawObj.initContext.constants || {};
    rawObj.initContext.initFunctions = rawObj.initContext.initFunctions || {};

    for (let routeObj of rawObj.routes) {
      // validate and set default value for main fields
      if (!routeObj.method) {
        routeObj.method = 'get';
      } else {
        routeObj.method = <CommonHttpMethod>routeObj.method.toLocaleLowerCase();
      }

      // validate and set default value for extraction section
      if (!routeObj.extract) {
        routeObj.extract = <ExtractionConfig>{};
      }
      routeObj.extract = Object.assign({
        headerHandlers: [],
        bodyHandlers: []
      }, routeObj.extract);
      for (let handler of routeObj.extract.headerHandlers) {
        if (!handler.key) {
          throw new Error(`no name of header extraction handler in ${rawObj.name} / ${routeObj.name}`);
        }
      }
      for (let handler of routeObj.extract.bodyHandlers) {
        if (!handler.key) {
          throw new Error(`no name of header extraction handler ${rawObj.name} / ${routeObj.name}`);
        }
      }

      if (!routeObj.relay || !(routeObj.relay instanceof Array)) {
        routeObj.relay = [];
      } else {
        for (let relayReq of routeObj.relay) {
          relayReq.method = <CommonHttpMethod>(relayReq.method || 'get').toLocaleLowerCase();
          if (!relayReq.name || !relayReq.url) {
            throw new Error(`no name or url of relay request config ${rawObj.name} / ${routeObj.name}`);
          }
        }
      }

      // validate and set default value for response section
      if (!routeObj.response) {
        routeObj.response = {
          policy: 'immediate'
        };
      }
    }
    return rawObj;
  }

  public static async loadRelatedTmplAndFuncFiles(confObj: ApplicationConfig) {
    // todo load extra template files
    await this.loadCodeInConf(confObj.initContext.initFunctions, confObj);
    await this.loadCodeInConf(confObj.initContext.functions, confObj);

    for (let route of confObj.routes) {
      for (let handler of route.extract.headerHandlers) {
        if (handler.validate) {
          handler.validate = await this.loadCodeInConf(handler.validate, confObj) as string;
        }
      }
      for (let handler of route.extract.bodyHandlers) {
        if (handler.validate) {
          handler.validate = await this.loadCodeInConf(handler.validate, confObj) as string;
        }
      }
      for (let relayReq of route.relay) {
        if (relayReq.interceptors) {
          await this.loadCodeInConf(relayReq.interceptors, confObj);
        }
      }
      if (route.response.interceptors) {
        await this.loadCodeInConf(route.response.interceptors, confObj);
      }
    }
    return confObj;
  }

  private static async loadCodeInConf(target: KVPair | string, confObj: ApplicationConfig) {
    if (typeof target === 'string') {
      return await this.loadSingleFunctionCode(target, confObj);
    } else {
      for (let funcName in target) {
        let funcStr = target[funcName].trim();
        target[funcName] = await this.loadSingleFunctionCode(funcStr, confObj);
      }
    }
    return target;
  }

  private static async loadSingleFunctionCode(target: string, confObj: ApplicationConfig) {
    let funcBody = target;
    if (target && (target.endsWith('.js') || target.endsWith('.ts'))) {
      funcBody = await ConfigManager.storage.loadSeparateFunction(target, confObj);
    }
    // parse TS/JS function using TS Compiler
    let output = TSCompiler.transformTS(funcBody);
    if (output.diagnostics && output.diagnostics.length > 0) {
      console.log('warn or error from TS compiler: ' + JSON.stringify(output.diagnostics));
    }
    if (!output.outputText) {
      throw new Error('error/no-output when loading TS source file: ' + target);
    }
    return output.outputText;
  }
}