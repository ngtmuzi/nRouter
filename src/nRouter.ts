/**
 * Created by ngtmuzi on 2020/3/19.
 */
'use strict';

import * as URL from 'url';
import * as lodash from 'lodash';
import * as  pathToRegexp from 'path-to-regexp';

import pave from './pave';
import * as koa from 'koa'



interface workFn {
  (message: any, headers: any, ctx: koa.Context, next: koa.Next): any
}

interface ResolveFn {
  (fn: workFn, message: any, headers: any, ctx: koa.Context, next: koa.Next): Promise<any>
}

interface RejectFn {
  (error: error, message: any, headers: any, ctx: koa.Context, next: koa.Next): Promise<any>
}

interface pathMaps {
  regExp: RegExp,
  path: string,
  fn: workFn,
  keys: pathToRegexp.Key[],
  method: string
}

interface error extends Error {
  code?: number,
  msg?: string | any,
  ext?: string | any
}

interface Restful {
  get?: workFn,
  post?: workFn,
  put?: workFn,
  patch?: workFn,
  delete?: workFn,
  copy?: workFn,
  head?: workFn,
  options?: workFn,
  link?: workFn,
  unlink?: workFn,
  purge?: workFn,
  lock?: workFn,
  unlock?: workFn,
  propfind?: workFn,
  view?: workFn,
}


export class Rest implements Restful {
  constructor(obj: Restful) {
    lodash.assign(this, obj);
  }
}

const defaultResolve: ResolveFn = async function (fn, msg, headers, ctx, next) {
  let result = await fn(msg, headers, ctx, next);
  if (!ctx.body) ctx.body = result;
}

const defaultReject: RejectFn = async function (error, originMsg, headers, ctx, next) {
  if (ctx.body) return undefined;

  let { code, message, msg, ext } = error;

  //未捕获的错误要打印错误及堆栈
  if (code === undefined) console.error(ctx.path, JSON.stringify(originMsg), 'has wrong:\n', error);

  ctx.status = code || 500;
  ctx.body = { code: code || 500, succeed: false, msg: msg || message || 'un handle error', ext };
}


/**
 * 解析路由对象然后返回一个中间件
 * @param router  {Object}
 * @param resolve {Function}  自定义的正确返回处理函数
 * @param reject  {Function}  自定义的错误处理函数
 * @returns {Function} 中间件
 */
export function nRouter(router = {}, resolve: ResolveFn = defaultResolve, reject: RejectFn = defaultReject): koa.Middleware {
  const pathMaps = makePathMaps(router);
  return matchPathMaps(pathMaps, resolve, reject);
}


/**
 * 拍平并解析路由对象
 * @param router {Object}
 * @returns {Array} 正则数组
 */
function makePathMaps(router = {}): pathMaps[] {
  return lodash.flatMap(pave(router, '', '/'), (fn: workFn | Rest, path) => {
    path = '/' + path;

    if (fn instanceof Rest) {
      return Object.keys(fn).map(method => {
        if (typeof fn[method] === 'function') {
          let keys = [];
          return { regExp: pathToRegexp.pathToRegexp(path, keys), path, fn: fn[method], keys, method };
        }
      }).filter(Boolean);
    } else if (typeof fn === 'function') {
      let keys = [];
      return { regExp: pathToRegexp.pathToRegexp(path, keys), path, fn, keys, method: 'all' };
    } else {
      throw new Error('router\'s handler must be function.');
    }
  });
}

/**
 * 将方法挂载在对应路径上，并将req中的数据提取出来
 * @param pathMaps  {Array}   正则数组
 * @param resolve {Function}  自定义的正确返回处理函数
 * @param reject  {Function}  自定义的错误处理函数
 * @returns {Function}
 */
function matchPathMaps(pathMaps: pathMaps[] = [], resolve: ResolveFn = defaultResolve, reject: RejectFn = defaultReject): koa.Middleware {
  return async (ctx, next) => {
    const path = URL.parse(ctx.request.url).pathname;
    const reqMethod = ctx.method.toLowerCase();

    let matchPathMap = pathMaps.find(({ regExp, method }) =>
      regExp.test(path) && (method === reqMethod || method === 'all'));

    if (!matchPathMap) return next();

    const { regExp, fn, keys } = matchPathMap;

    const routeParams = {};
    const matchValues = regExp.exec(path);
    keys.forEach((key, i) => routeParams[key.name] = matchValues[i + 1]);

    const msg = lodash.assign({}, ctx.request.query, ctx.request['body'], routeParams);

    const headers = lodash.mapKeys(ctx.request.header, (v, k) => lodash.camelCase(k));
    headers.method = ctx.method.toLowerCase();

    headers.ip = ctx.ip;

    try {
      await resolve(fn, msg, headers, ctx, next);
    } catch (err) {
      await reject(err, msg, headers, ctx, next);
    }
  };
}
