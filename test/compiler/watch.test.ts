import Chokidar from 'chokidar';

describe('Test Chokidar Watch', () => {
  test('Should not watch node_modules and .x', (done) => {
    const changes: string[] = [];
    const watch = Chokidar.watch(process.cwd(), {
      ignored: [/(^|[\/\\])\../, (path: string) => path.includes('node_modules')],
      // ignoreInitial: true
    }).on('all', async (event, fullPath) => {
      changes.push(fullPath);
    }).on('error', (err) => {
      console.error(err);
    });
    setTimeout(() => {
      if (changes.join(',').indexOf('node_modules') !== -1) {
        done('error contains node_modules');
      } else {
        console.log('watched files: ' + changes.length);
        done();
      }
      watch.close();
    }, 2000);
  });
});
