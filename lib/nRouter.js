/**
 * Created by ngtmuzi on 2020/3/19.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const URL = require("url");
const lodash = require("lodash");
const pathToRegexp = require("path-to-regexp");
const pave_1 = require("./pave");
class Rest {
    constructor(obj) {
        lodash.assign(this, obj);
    }
}
exports.Rest = Rest;
const defaultResolve = async function (fn, msg, headers, ctx, next) {
    let result = await fn(msg, headers, ctx, next);
    if (!ctx.body)
        ctx.body = result;
};
const defaultReject = async function (error, originMsg, headers, ctx, next) {
    if (ctx.body)
        return undefined;
    let { code, message, msg, ext } = error;
    //未捕获的错误要打印错误及堆栈
    if (code === undefined)
        console.error(ctx.path, JSON.stringify(originMsg), 'has wrong:\n', error);
    ctx.status = code || 500;
    ctx.body = { code: code || 500, succeed: false, msg: msg || message || 'un handle error', ext };
};
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
exports.nRouter = nRouter;
/**
 * 拍平并解析路由对象
 * @param router {Object}
 * @returns {Array} 正则数组
 */
function makePathMaps(router = {}) {
    return lodash.flatMap(pave_1.default(router, '', '/'), (fn, path) => {
        path = '/' + path;
        if (fn instanceof Rest) {
            return Object.keys(fn).map(method => {
                if (typeof fn[method] === 'function') {
                    let keys = [];
                    return { regExp: pathToRegexp.pathToRegexp(path, keys), path, fn: fn[method], keys, method };
                }
            }).filter(Boolean);
        }
        else if (typeof fn === 'function') {
            let keys = [];
            return { regExp: pathToRegexp.pathToRegexp(path, keys), path, fn, keys, method: 'all' };
        }
        else {
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
function matchPathMaps(pathMaps = [], resolve = defaultResolve, reject = defaultReject) {
    return async (ctx, next) => {
        const path = URL.parse(ctx.request.url).pathname;
        const reqMethod = ctx.method.toLowerCase();
        let matchPathMap = pathMaps.find(({ regExp, method }) => regExp.test(path) && (method === reqMethod || method === 'all'));
        if (!matchPathMap)
            return next();
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
        }
        catch (err) {
            await reject(err, msg, headers, ctx, next);
        }
    };
}
