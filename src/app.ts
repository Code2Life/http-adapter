import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import koaStatic from 'koa-static';
import cors from 'koa2-cors';
import { collectDefaultMetrics, register } from 'prom-client';
import { ConfigManager } from './manager/conf-manager';
import { RouterManager } from './manager/route-manager';


const PRELOAD_CONF_URL = process.env.PRELOAD_CONF || '';

const METRICS_TIMEOUT = 5000;

const app = new Koa();
const router = RouterManager.router;

// init metrics client and register to router
const metricsInterval = collectDefaultMetrics({
  timeout: METRICS_TIMEOUT
});
router.get('_metrics', '/_metrics', ctx => {
  ctx.headers['content-type'] = register.contentType;
  ctx.body = register.metrics();
});

// declare middleware
app.use(cors({ credentials: true }));
app.use(bodyParser({ enableTypes: ['json', 'form', 'text'] }));
app.use(koaStatic(__dirname + '/public'));
app.use(router.routes());
app.use(router.allowedMethods());

// load existing configurations from directory
ConfigManager.initAllConfAndStartWatch(PRELOAD_CONF_URL);

console.log('server started.');

export const Application = {
  app, metricsInterval
};
