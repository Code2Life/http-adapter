import { ModuleResolver } from '../../src/compiler/module-resolver';
import { RunTimeEnvironment } from '../../src/runtime/context';
import { AdapterConfig } from '../../src/model';

jest.setTimeout(60000);

describe('Dynamic module resolver test', () => {
  test('none existing module should not be installed', async () => {
    const originalError = console.error;
    console.error = jest.fn();
    let context = new RunTimeEnvironment({} as AdapterConfig);
    await ModuleResolver.loadAndInitDependencies({ 'none-existing-module-test': '_'}, context);
    let obj = context.getRunTimeEnv() as any;
    expect(Object.keys(obj._).length).toBe(0);
    console.error = originalError;
  });

  test('none existing module should be installed and loaded', async () => {
    let context = new RunTimeEnvironment({} as AdapterConfig);
    await ModuleResolver.loadAndInitDependencies({ 'lodash': '_'}, context);
    let obj = context.getRunTimeEnv() as any;
    expect(obj._).toBeDefined();
    expect(typeof obj._.get).toEqual('function');
  });
});

