const strCode = 'var str="",i=0;for(;i<1000;i+=1){str+="a";};';

const start = Date.now(); 
const func = new Function(strCode);

/**
 * @summary: Benchmark at i7-8550U CPU @ 1.80GHz / node v11.7.0
 * - eval is evil, awful performance !
 * - new Function is much better, even as fast as plain call!
 * * two things wired: 
 * ? new Function has the same call stack with eval, see below
 * ? when executing by all 4 ways together rather than 
 *   running by one way and others commented, it takes ~80ms
 */
for (let c = 0;c < 1000;c++) {

  // use eval()
  eval(strCode); // about 550 ms

  // create function in each call
  (new Function(strCode))(); // about 12-13ms

  // create function before
  func(); // about 10-12 ms

  // plain call
  var str="",i=0;for(;i<1000;i+=1){str+="a";} // about 11-13ms
}

console.log('duration: ' + (Date.now() - start) + ' ms');

// * new Function call stack
// at eval (eval at <anonymous> (***http-adapter/benchmark/dynamic-function.js:18:4), <anonymous>:3:49)
// at Object.<anonymous> (***http-adapter/benchmark/dynamic-function.js:18:26)
// at Module._compile (internal/modules/cjs/loader.js:721:30)
// at Object.Module._extensions..js (internal/modules/cjs/loader.js:732:10)
// at Module.load (internal/modules/cjs/loader.js:620:32)
// at tryModuleLoad (internal/modules/cjs/loader.js:560:12)
// at Function.Module._load (internal/modules/cjs/loader.js:552:3)
// at Function.Module.runMain (internal/modules/cjs/loader.js:774:12)
// at executeUserCode (internal/bootstrap/node.js:499:15)

// * eval call stack
// at eval (eval at <anonymous> (***http-adapter/benchmark/dynamic-function.js:15:3), <anonymous>:1:49)
// at Object.<anonymous> (***http-adapter/benchmark/dynamic-function.js:15:3)
// at Module._compile (internal/modules/cjs/loader.js:721:30)
// at Object.Module._extensions..js (internal/modules/cjs/loader.js:732:10)
// at Module.load (internal/modules/cjs/loader.js:620:32)
// at tryModuleLoad (internal/modules/cjs/loader.js:560:12)
// at Function.Module._load (internal/modules/cjs/loader.js:552:3)
// at Function.Module.runMain (internal/modules/cjs/loader.js:774:12)
// at executeUserCode (internal/bootstrap/node.js:499:15)
// at startMainThreadExecution (internal/bootstrap/node.js:436:3)
// ➜  http-adapter git:(master) ✗ 