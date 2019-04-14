import { KVPair } from '../model';
import { RunTimeEnvironment } from '../runtime/context';

export class TemplateResolver {

  public static compileTemplateObjToFunction(tmplObj: KVPair, ctxRunEnv: RunTimeEnvironment, prefix: string = '') {
    for (let key in tmplObj) {
      this.compileTemplateStrToFunction(key, tmplObj[key], ctxRunEnv, prefix);
    }
  }

  public static compileTemplateStrToFunction(key: string, tmpl: string, ctxRunEnv: RunTimeEnvironment, prefix: string = '') {
    // strip first and last ` if exists
    if (tmpl.length > 0) {
      if (tmpl[0] === '`') {
        tmpl = tmpl.substr(1);
      }
    }
    if (tmpl.length > 0) {
      if (tmpl[tmpl.length - 1] === '`') {
        tmpl = tmpl.substr(0, tmpl.length - 1);
      }
    }
    // generate function
    let funcStr = `return \`${tmpl}\`;`;
    let func = new Function(funcStr);
    func.prototype.name = prefix + key;
    func.bind(ctxRunEnv);
    ctxRunEnv.setPropertyToRunTime(prefix + key, func);
  }
}