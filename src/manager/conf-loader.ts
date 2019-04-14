import Debug from 'debug';
import fs from 'fs';
import { safeLoad } from 'js-yaml';
import Router from 'koa-router';
import path from 'path';
import { TSCompiler } from '../compiler/mini-compiler';
import { ConfigManager } from './conf-manager';
import { AdaptorConfig, CommonHttpMethod, ExtractionConfig, InitContextConfig, KVPair } from '../model';

const debug = Debug('server:conf-loader');

export default class ConfLoader {
  router: Router<any, {}>;

  constructor(router: Router) {
    this.router = router;
  }

  async loadFromFiles(directory: string): Promise<void> {
    try {
      const paths = await fs.promises.readdir(directory);
      for (let subPath of paths) {
        // fs.promises.fstat()
        const fullPath = path.join(directory, subPath);
        const stat = await fs.promises.lstat(fullPath);
        if (stat.isDirectory()) {
          await this.loadFromFiles(fullPath);
        } else if (subPath.endsWith('.yaml')) {
          debug('load conf from %s', fullPath);
          try {
            const buffer = await fs.promises.readFile(fullPath);
            const rawObj: AdaptorConfig = safeLoad(buffer.toString());
            const validObj = this.validateRawConf(rawObj, directory, subPath);
            const compiledObj = await this.loadRelatedCodeFiles(validObj, directory);
            await ConfigManager.addConfig(compiledObj);
          } catch (err) {
            console.error(`fail to load configuration of ${fullPath}`, err);
          }
        }
      }
    } catch (ex) {
      console.error(`fail to load configuration`, ex);
    }
  }

  /**
   * @remarks validate and set default values, because yaml could be invalid
   */
  validateRawConf(rawObj: AdaptorConfig, parentDirectory: string, path: string): AdaptorConfig {
    // validate and set default value for main fields
    if (!rawObj.name || !rawObj.location)  {
      throw new Error(`no name or location for this config: ${parentDirectory}/${path}`);
    }
    if (!rawObj.method) {
      rawObj.method = 'get';
    } else {
      rawObj.method = <CommonHttpMethod>rawObj.method.toLocaleLowerCase();
    }

    // validate and set default value for initContext section
    if (!rawObj.initContext) {
      rawObj.initContext = <InitContextConfig>{};
    }
    // init default libraries
    rawObj.initContext.libraries = Object.assign({
      _: 'lodash',
      axios: 'axios'
    }, rawObj.initContext.libraries);
    rawObj.initContext.constants = rawObj.initContext.constants || {};
    rawObj.initContext.initFunctions = rawObj.initContext.initFunctions || {};

    // validate and set default value for extraction section
    if (!rawObj.extract) {
      rawObj.extract = <ExtractionConfig>{};
    }
    rawObj.extract = Object.assign({
      headerHandlers: [],
      bodyHandlers: []
    }, rawObj.extract);
    for (let handler of rawObj.extract.headerHandlers) {
      if (!handler.key) {
        throw new Error(`no name of header extraction handler ${parentDirectory}/${path}`);
      }
    }
    for (let handler of rawObj.extract.bodyHandlers) {
      if (!handler.key) {
        throw new Error(`no name of header extraction handler ${parentDirectory}/${path}`);
      }
    }

    if (!rawObj.relay || !(rawObj.relay instanceof Array)) {
      rawObj.relay = [];
    } else {
      for (let relayReq of rawObj.relay) {
        relayReq.method = <CommonHttpMethod>(relayReq.method || 'get').toLocaleLowerCase();
        if (!relayReq.name || !relayReq.url) {
          throw new Error(`no name or url of relay request config ${parentDirectory}/${path}`);
        }
      }
    }

    // validate and set default value for response section
    if (!rawObj.response) {
      rawObj.response = {
        policy: 'immediate'
      };
    }
    return rawObj;
  }

  async loadRelatedCodeFiles(confObj: AdaptorConfig, parentDirectory: string): Promise<AdaptorConfig> {
    await this.loadCodeInConf(confObj.initContext.initFunctions, parentDirectory);
    await this.loadCodeInConf(confObj.initContext.functions, parentDirectory);
    for (let handler of confObj.extract.headerHandlers) {
      if (handler.validate) {
        handler.validate = await this.loadCodeInConf(handler.validate, parentDirectory) as string;
      }
    }
    for (let handler of confObj.extract.bodyHandlers) {
      if (handler.validate) {
        handler.validate = await this.loadCodeInConf(handler.validate, parentDirectory) as string;
      }
    }
    for (let relayReq of confObj.relay) {
      if (relayReq.interceptors) {
        await this.loadCodeInConf(relayReq.interceptors, parentDirectory);
      }
    }
    if (confObj.response.interceptors) {
      await this.loadCodeInConf(confObj.response.interceptors, parentDirectory);
    }
    return confObj;
  }

  async loadCodeInConf(target: KVPair | string, parentDirectory: string) {
    if (typeof target === 'string') {
      return await this.loadSingleFunctionCode(target, parentDirectory);
    } else {
      for (let funcName in target) {
        let funcStr = target[funcName].trim();
        target[funcName] = await this.loadSingleFunctionCode(funcStr, parentDirectory);
      }
    }
    return target;
  }

  async loadSingleFunctionCode(target: string, parentDirectory: string) {
    let funcBody = target;
    if (target && (target.endsWith('.js') || target.endsWith('.ts'))) {
      let buffer = await fs.promises.readFile(path.join(parentDirectory, target));
      funcBody = buffer.toString().trim();
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