/**
 * Created by ngtmuzi on 2018/2/10.
 */
'use strict';

const http = require('http');

const express = require('express');

const common = require('./common');
const nr     = require('../lib/express');

common({
  nr,
  createServer(routerObj) {
    const app = new express();
    app.use(nr(routerObj));
    return http.createServer(app);
  }
});