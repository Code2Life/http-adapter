import { exec } from 'child_process';
import Debug from 'debug';
import path from 'path';
import { KVPair } from '../model';
import { RunTimeEnvironment } from '../runtime/context';

const debug = Debug('server:compiler:module-resolver');
const MAX_INSTALL_TIME = 60000;

export class ModuleResolver {

  private static errorModuleCache = new Map<string, boolean>();
  private static installedModuleCache = new Map<string, boolean>();

  public static async loadAndInitDependencies(libraries: KVPair, ctxRunEnv: RunTimeEnvironment) {
    for (let alias in libraries) {
      let moduleName = libraries[alias];
      let moduleObj = {};
      if (this.errorModuleCache.has(moduleName)) {
        console.error('server refuse to load none-existing or wrong module again');
      } else {
        try {
          // dynamic install require on demand
          if (!this.installedModuleCache.has(moduleName)) {
            let result = await this.dynamicInstallModule(moduleName);
            if (result) {
              this.installedModuleCache.set(moduleName, true);
            } else {
              this.errorModuleCache.set(moduleName, true);
            }
          }
          moduleObj = require(moduleName);
          this.installedModuleCache.set(moduleName, true);
        } catch (ex) {
          this.errorModuleCache.set(moduleName, true);
          console.error('load module dependency error: ' + ex.message);
        }
      }
      ctxRunEnv.setPropertyToRunTime(alias, moduleObj);
    }
  }

  private static async dynamicInstallModule(moduleName: string): Promise<boolean> {
    return new Promise((resolve, _) => {
      try {
        require(moduleName);
        resolve(true);
      } catch (ex) {
        // none-existing or something error with the module
        const cwd = path.resolve(__dirname, '../../node_modules');
        exec('npm uninstall ' + moduleName, { cwd }, (err, stdout, stderr) => {
          debug(stdout);
          console.log(`finish uninstall before install ${moduleName}`);
          if (err) {
            console.error(err.code, err.message, stderr);
          }
          // install module with timeout
          exec('npm install ' + moduleName, {
            cwd, timeout: MAX_INSTALL_TIME
          }, (err, stdout, stderr) => {
            if (err) {
              console.error(err.code, err.message, stderr);
              resolve(false);
            } else {
              debug(stdout);
              console.log(`finish install: ${moduleName}`);
              resolve(true);
            }
          });
        });
      }
    });
  }

}