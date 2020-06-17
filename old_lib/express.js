/**
 * Created by ngtmuzi on 2018/2/10.
 */
'use strict';

const URL = require('url');

const lodash     = require('lodash');
const pathRegexp = require('path-to-regexp');

const pave = require('./pave');

nRouter.reject        = reject;
nRouter.makePathMaps  = makePathMaps;
nRouter.matchPathMaps = matchPathMaps;

module.exports = nRouter;

/**
 * 解析路由对象然后返回一个中间件
 * @param router  {Object}
 * @param resolve {Function}  自定义的正确返回处理函数
 * @param reject  {Function}  自定义的错误处理函数
 * @returns {Function} 中间件
 */
function nRouter(router = {}, resolve = defaultResolve, reject = defaultReject) {
  const pathMaps = makePathMaps(router);
  return matchPathMaps(pathMaps, resolve, reject);
}


/**
 * 拍平并解析路由对象
 * @param router {Object}
 * @returns {Array} 正则数组
 */
function makePathMaps(router = {}) {
  return lodash.map(pave(router, '', '/'), (fn, path) => {
    if (!lodash.isFunction(fn)) throw new Error('router\'s handler must be function.');
    path     = '/' + path;
    let keys = [];
    return {regExp: pathRegexp(path, keys), path, fn, keys};
  });
}

/**
 * 并将方法挂载在对应路径上，并将req中的数据提取出来
 * @param pathMaps  {Array}   正则数组
 * @param resolve {Function}  自定义的正确返回处理函数
 * @param reject  {Function}  自定义的错误处理函数
 * @returns {Function}
 */
function matchPathMaps(pathMaps = [], resolve = defaultResolve, reject = defaultReject) {
  return async function (req, res, next) {
    const path = URL.parse(req.url).pathname;

    let matchPathMap = pathMaps.find(({regExp}) => regExp.test(path));
    if (!matchPathMap) return next();

    const {regExp, fn, keys} = matchPathMap;

    const routeParams = {};
    const matchValues = regExp.exec(path);
    keys.forEach((key, i) => routeParams[key.name] = matchValues[i + 1]);

    const msg = lodash.assign({}, req.query, req.body, routeParams);

    const headers  = lodash.mapKeys(req.headers, (v, k) => lodash.camelCase(k));
    headers.method = req.method.toLowerCase();

    headers.ip = req.ip;

    const ctx = {request: req, response: res};

    try {
      await resolve(fn, msg, headers, ctx, next);
    } catch (err) {
      await reject(err, msg, headers, ctx, next);
    }
  };
}

async function defaultResolve(fn, msg, headers, ctx, next) {
  let result = await fn(msg, headers, ctx, next);
  if (!ctx.response.finished) ctx.response.send(result).end();
}


async function defaultReject(error, originMsg, headers, ctx, next) {
  if (ctx.response.finished) return undefined;

  let {code, message, msg, ext} = error;

  //未捕获的错误要打印错误及堆栈
  if (code === undefined) console.error(ctx.request.path, JSON.stringify(originMsg), 'has wrong:\n', error);

  ctx.response.status(code || 500);
  ctx.response.json({code: code || 500, succeed: false, msg: msg || message || 'un handle error', ext}).end();
}


/**
 * 返回一个表示err对象
 * @param code
 * @param msg
 * @param ext
 */
function reject(code, msg, ext) {
  const e = new Error(msg);
  e.code  = code;
  e.ext   = ext;
  throw e;
}