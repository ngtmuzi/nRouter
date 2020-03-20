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
    if (code === undefined)
        console.error(ctx.path, JSON.stringify(originMsg), 'has wrong:\n', error);
    ctx.status = code || 500;
    ctx.body = { code: code || 500, succeed: false, msg: msg || message || 'un handle error', ext };
};
function nRouter(router = {}, resolve = defaultResolve, reject = defaultReject) {
    const pathMaps = makePathMaps(router);
    return matchPathMaps(pathMaps, resolve, reject);
}
exports.nRouter = nRouter;
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
