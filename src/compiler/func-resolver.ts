import Debug from 'debug';
import ts from 'typescript';
import { KVPair } from '../model';
import { RunTimeEnvironment } from '../runtime/context';
import { TSCompiler } from './mini-compiler';

const debug = Debug('server:func-resolver');

const AsyncFunction = Object.getPrototypeOf(async function() {
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
    let tmpFunction: Function;
    let totalCount = 0;
    let param: string[] = [];
    let compiledFunc = '';
    let isAsync = false;
    ts.forEachChild(ast, node => {
      if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
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
      } else if (node.kind === ts.SyntaxKind.ExpressionStatement || node.kind === ts.SyntaxKind.BinaryExpression) {
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
      }
    });
    if (totalCount > 1) {
      throw new Error('multiple function declaration found in :' + key);
    }
    if (!compiledFunc) {
      throw new Error('can not extract function block in : ' + key);
    }
    try {
      if (isAsync) {
        tmpFunction = new AsyncFunction(...param, compiledFunc);
      } else {
        tmpFunction = new Function(...param, compiledFunc);
      }
    } catch (syntaxErr) {
      console.error('syntax error in function: ' + key + ',' + compiledFunc);
      console.error(syntaxErr);
      throw new Error('syntax error - ' + key);
    }
    ctxRunEnv.setPropertyToRunTime(prefix + key, tmpFunction.bind(ctxRunEnv));
  }
}