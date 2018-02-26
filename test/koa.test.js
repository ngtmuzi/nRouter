/**
 * Created by ngtmuzi on 2018/2/10.
 */
'use strict';

const http = require('http');

const Koa = require('koa');

const common = require('./common');
const nr     = require('../lib/koa');

common({
  nr,
  createServer(routerObj) {
    const app = new Koa();
    app.use(nr(routerObj));
    return http.createServer(app.callback());
  }
});