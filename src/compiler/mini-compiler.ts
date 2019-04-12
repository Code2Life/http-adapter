import ts from 'typescript';

const compilerOptions = {
  noEmitOnError: true,
  noImplicitAny: true,
  target: ts.ScriptTarget.ES2017,
  module: ts.ModuleKind.None
};


export class TSCompiler {

  public static transformTS(source: string) {
    let result = ts.transpileModule(source, { compilerOptions });
    return result;
  }

  public static parseToAST(key: string, funcStr: string) {
    let source: ts.Node = ts.createSourceFile(key + '.ts', funcStr, ts.ScriptTarget.ES2016, true);
    return source;
  }

  public static compileFromEntry(fileNames: string[]): void {
    let program = ts.createProgram(fileNames, compilerOptions);
    let emitResult = program.emit();

    let allDiagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);

    allDiagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start!
        );
        let message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n'
        );
        console.log(
          `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
        );
      } else {
        console.log(
          `${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
        );
      }
    });

    let exitCode = emitResult.emitSkipped ? 1 : 0;
    console.log(`compiler finishing with code '${exitCode}'.`);
  }
}