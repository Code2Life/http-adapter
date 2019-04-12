import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import koaStatic from 'koa-static';
import cors from 'koa2-cors';
import path from 'path';
import ConfLoader from './loader/conf-loader';
import RouterManager from './manager/route-manager';


const app = new Koa();
const router = RouterManager.router;

app.use(cors({ credentials: true }));
app.use(bodyParser({ enableTypes: ['json', 'form', 'text'] }));
app.use(koaStatic(__dirname + '/public'));

app.use(router.routes());
app.use(router.allowedMethods());

const loader = new ConfLoader(router);
loader.loadFromFiles(process.env.CONF_PATH || path.resolve(__dirname, '../adaptors'));

console.log('server started.');

export default app;
