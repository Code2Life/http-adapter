import Debug from 'debug';
import ts from 'typescript';
import { KVPair } from '../model/types';
import { RunTimeEnvironment } from '../runtime/context';
import { TSCompiler } from './mini-compiler';

const debug = Debug('server:func-resolver');

const AsyncFunction = Object.getPrototypeOf(async function () {
  await Promise.resolve();
}).constructor;

export class FunctionResolver {

  public static compileAndLoadFunctionObj(funcObj: KVPair, ctxRunEnv: RunTimeEnvironment, prefix: string = '') {
    for (let key in funcObj) {
      this.compileAndLoadSingleFunction(key, funcObj[key], ctxRunEnv, prefix);
    }
  }

  public static compileAndLoadSingleFunction(key: string, funcStr: string, ctxRunEnv: RunTimeEnvironment, prefix: string = '') {
    let ast = TSCompiler.parseToAST(key, funcStr);
    let { totalCount, compiledFunc, param, isAsync } = this.loadSingleFuncFromAST(ast);

    if (totalCount > 1) {
      throw new Error('multiple function declaration found in :' + key);
    }
    if (!compiledFunc) {
      throw new Error('can not extract function block in : ' + key);
    }
    // valid function string, try to create function in JS context
    let tmpFunction: Function;
    try {
      if (isAsync) {
        tmpFunction = new AsyncFunction(...param, compiledFunc);
      } else {
        tmpFunction = new Function(...param, compiledFunc);
      }
    } catch (syntaxErr) {
      console.error(`syntax error in function: ${key}, ${compiledFunc}, ${syntaxErr.message}`);
      throw new Error(`syntax error - ${key} - ${syntaxErr.message}`);
    }
    ctxRunEnv.setPropertyToRunTime(prefix + key, tmpFunction.bind(ctxRunEnv.getRunTimeEnv()));
  }

  private static loadSingleFuncFromAST(ast: ts.Node) {
    let totalCount = 0;
    let param: string[] = [];
    let compiledFunc = '';
    let isAsync = false;

    const loadFuncFromDeclaration = (node: ts.Node) => {
      ts.forEachChild(node, child => {
        // strip function block
        // debug(ts.SyntaxKind[child.kind]);
        if (child.kind === ts.SyntaxKind.Block) {
          let func = child.getText();
          compiledFunc = func.substring(1, func.length - 1);
          totalCount++;
        } else if (child.kind === ts.SyntaxKind.Parameter) {
          param.push(child.getChildAt(0).getText());
        } else if (child.kind === ts.SyntaxKind.AsyncKeyword) {
          isAsync = true;
        }
      });
    };
    const loadFuncFromLambda = (node: ts.Node) => {
      ts.forEachChild(node, child => {
        // debug(ts.SyntaxKind[child.kind]);
        if (child.kind === ts.SyntaxKind.ArrowFunction) {
          // strip block in arrow function
          let hasBlock = false;
          ts.forEachChild(child, arrowFunc => {
            // debug('    ' + ts.SyntaxKind[arrowFunc.kind]);
            if (arrowFunc.kind === ts.SyntaxKind.Block) {
              let func = arrowFunc.getText();
              compiledFunc = func.substring(1, func.length - 1);
              hasBlock = true;
              totalCount++;
            } else if (arrowFunc.kind === ts.SyntaxKind.Parameter) {
              param.push(arrowFunc.getChildAt(0).getText());
            } else if (arrowFunc.kind === ts.SyntaxKind.AsyncKeyword) {
              isAsync = true;
            }
          });
          // no block '{}' in arrow function body, it's an expression
          if (!hasBlock) {
            compiledFunc = 'return ' + child.getText().split('=>').slice(1).join('=>').trim();
            totalCount++;
          }
        }
      });
    };
    ts.forEachChild(ast, node => {
      if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
        loadFuncFromDeclaration(node);
      } else if (node.kind === ts.SyntaxKind.ExpressionStatement || node.kind === ts.SyntaxKind.BinaryExpression) {
        loadFuncFromLambda(node);
      }
    });
    return { totalCount, param, compiledFunc, isAsync };
  }
}