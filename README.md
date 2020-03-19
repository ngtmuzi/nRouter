# nRouter
a objective router middleware for koa/express
## install
```bash
npm i nrouter
```
## usage
`nRouter` convert nested object to a flat route table, like this:
```
{
  a: fn,
  b: {c: fn},
  "d/e": fn,
  "user/:id": fn
}
----to----
/a ==> fn
/b/c ==> fn
/d/e ==> fn
/user/xxxx ==> fn(msg param contains id:'xxxx')
```
All matched request will all route to one function, so if you want make it RESTful, you need to add condition on this function. 

### for koa
```javascript
const nRouter =  require('nrouter').koa;
const Koa = require('koa');
const app = new Koa();

app.use(
  nRouter({hello})
);

function hello(msg,headers,ctx,next) {
  return 'world';
}

app.listen(9000);
```

## API

### nRouter(obj, resolveFn, rejectFn)

#### obj
The route object, can be nested, can contains route parameters like express, final 

#### resolveFn
Wrap the route function, you can defined global output format on here

#### rejectFn
If your route function throw error, it will throw to rejectFn, you can defined global error format on here
