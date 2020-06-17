/**
 * Created by ngtmuzi on 2020/3/19.
 */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const URL = require("url");
const lodash = require("lodash");
const pathRegexp = require("path-to-regexp");
const pave_1 = require("./pave");
exports.default = nRouter;
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
    return lodash.map(pave_1.default(router, '', '/'), (fn, path) => {
        if (!lodash.isFunction(fn))
            throw new Error('router\'s handler must be function.');
        path = '/' + path;
        let keys = [];
        return { regExp: pathRegexp(path, keys), path, fn, keys };
    });
}
exports.makePathMaps = makePathMaps;
/**
 * 并将方法挂载在对应路径上，并将req中的数据提取出来
 * @param pathMaps  {Array}   正则数组
 * @param resolve {Function}  自定义的正确返回处理函数
 * @param reject  {Function}  自定义的错误处理函数
 * @returns {Function}
 */
function matchPathMaps(pathMaps = [], resolve = defaultResolve, reject = defaultReject) {
    return (ctx, next) => __awaiter(this, void 0, void 0, function* () {
        const path = URL.parse(ctx.request.url).pathname;
        let matchPathMap = pathMaps.find(({ regExp }) => regExp.test(path));
        if (!matchPathMap)
            return next();
        const { regExp, fn, keys } = matchPathMap;
        const routeParams = {};
        const matchValues = regExp.exec(path);
        keys.forEach((key, i) => routeParams[key.name] = matchValues[i + 1]);
        const msg = lodash.assign({}, ctx.request.query, ctx.request.body, routeParams);
        const headers = lodash.mapKeys(ctx.request.header, (v, k) => lodash.camelCase(k));
        headers.method = ctx.method.toLowerCase();
        headers.ip = ctx.ip;
        try {
            yield resolve(fn, msg, headers, ctx, next);
        }
        catch (err) {
            yield reject(err, msg, headers, ctx, next);
        }
    });
}
exports.matchPathMaps = matchPathMaps;
function defaultResolve(fn, msg, headers, ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield fn(msg, headers, ctx, next);
        if (!ctx.body)
            ctx.body = result;
    });
}
function defaultReject(error, originMsg, headers, ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (ctx.body)
            return undefined;
        let { code, message, msg, ext } = error;
        //未捕获的错误要打印错误及堆栈
        if (code === undefined)
            console.error(ctx.path, JSON.stringify(originMsg), 'has wrong:\n', error);
        ctx.status = code || 500;
        ctx.body = { code: code || 500, succeed: false, msg: msg || message || 'un handle error', ext };
    });
}
/**
 * 返回一个表示err对象
 * @param code
 * @param msg
 * @param ext
 */
function reject(code, msg, ext) {
    const e = new Error(msg);
    e.code = code;
    e.ext = ext;
    throw e;
}
exports.reject = reject;
