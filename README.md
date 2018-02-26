# nRouter
a objective router middleware for koa/express
## install
```bash
npm i nrouter
```
## usage

### for koa
```javascript
const nRouter =  require('nrouter');
const Koa = require('koa');
const app = new Koa();

app.use(nRouter({
  hello:world
}));

function world(msg,headers,ctx,next) {
  return 'world';
}
```
