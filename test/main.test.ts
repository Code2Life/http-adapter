import server from '../src/main';

jest.setTimeout(15000);

describe('E2E test of HTTP server', () => {
  test('server should be loaded correctly', async () => {
    return new Promise((resolve, _) => {
      setTimeout(() => {
        if ((global as any).watcher) {
          (global as any).watcher.close();
        }
        server.close((err) => {
          expect(server).toBeDefined();
          expect(err).toBe(undefined);
          resolve();
        });
      }, 5000);
    });
  });
});

