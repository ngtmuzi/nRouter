/**
 * Created by ngtmuzi on 2018/2/11.
 */
'use strict';

const request = require('supertest');
const http = require('http');
const Koa = require('koa');

const { nRouter, Rest } = require('../lib/nRouter');
const pave = require('../lib/pave');


const makeRouter = function () {
  return () => nRouter(...arguments);
};

describe('Type check', function () {
  test('through Number will throw Error', () => {
    expect(makeRouter(1)).toThrow();
  });
  test('through Null will throw Error', () => {
    expect(makeRouter(null)).toThrow();
  });
  test('through Function will throw Error', () => {
    expect(makeRouter(() => { })).toThrow();
  });
  test('through Undefined will return middleware function use empty route rule', () => {
    expect(makeRouter(undefined)).toBeInstanceOf(Function);
  });
  test('through empty Object will return middleware function use empty route rule', () => {
    expect(makeRouter({})).toBeInstanceOf(Function);
  });
  test('through undefined will return middleware function use empty route rule', () => {
    expect(makeRouter()).toBeInstanceOf(Function);
  });
  test('through a invalid Object will throw Error', () => {
    expect(makeRouter({ a: 1 })).toThrow('must be function');
  });
  test('through valid Object will return middleware function', () => {
    expect(makeRouter({ a: () => 'hi' })).toBeInstanceOf(Function);
  });
  test('pave() function only receive object', () => {
    expect(() => pave(null)).toThrow('');
  });
});


describe('lib function check', function () {
  test('nRouter.reject function throw a error with code', () => {
    expect(() => nr.reject(400, 'params error', { a: 1 }))
      .toThrow();
  });

});

describe('Route rule check', function () {
  const routerObj = {
    jump_to_abc: (msg, headers, ctx) => {
      ctx.response.redirect('/a/b/c')
    },
    a: {
      b: {
        c: () => 'from /a/b/c',
        'd/eee': () => 'from /a/b/d/eee'
      },
      'f/:gggg': msg => msg.gggg,
      'h/:i/:j/:k': msg => msg
    },
    restful: new Rest({
      get: () => `get`,
      post: () => `post`,
      put: () => `put`,
      patch: () => `patch`,
      delete: () => `delete`,
      copy: () => `copy`,
      head: () => `head`,
      options: () => `options`,
      link: () => `link`,
      unlink: () => `unlink`,
      purge: () => `purge`,
      lock: () => `lock`,
      unlock: () => `unlock`,
      propfind: () => `propfind`,
      view: () => `view`,
    }),
    sync_err: () => {
      throw new Error('sync_err!');
    },
    promise_reject: () => Promise.reject('promise_reject!'),
    async_err: async () => {
      throw new Error('async_err!');
    },
    no_throw_err: (msg, headers, ctx) => {
      if (ctx.response.end)
        ctx.response.end('ok');
      else
        ctx.body = 'ok';

      throw new Error('oh!');
    },
    nrouter_reject:()=>{

    }

  };

  const app = new Koa();
  app.use(nRouter(routerObj));
  const server = http.createServer(app.callback());

  test('un match path will return 404', () =>
    request(server).get('/nothing').expect(404)
  );

  test('not handler when return 302 status code', () =>
    request(server).get('/jump_to_abc').expect(302)
  );

  describe('test default resolve handler', function () {
    test('request /a/b/c', () =>
      request(server).get('/a/b/c').expect('from /a/b/c')
    );

    test('request path that contains /', () =>
      request(server).get('/a/b/d/eee').expect('from /a/b/d/eee')
    );

    test('request path that contains route parameters', () =>
      request(server).get('/a/f/some_string').expect('some_string')
    );

    test('request path that contains multi route parameters', () =>
      request(server).get('/a/h/iii/jjj/kkkk').expect({ i: 'iii', j: 'jjj', k: 'kkkk' })
    );

    describe('restful request handler',function(){
      test('get',()=>request(server).get('/restful').expect(200));
      test('post',()=>request(server).post('/restful').expect(200));
      test('put',()=>request(server).put('/restful').expect(200));
      test('patch',()=>request(server).patch('/restful').expect(200));
      test('delete',()=>request(server).delete('/restful').expect(200));
      test('copy',()=>request(server).copy('/restful').expect(200));
      test('head',()=>request(server).head('/restful').expect(200));
      test('options',()=>request(server).options('/restful').expect(200));
      test('link',()=>request(server).link('/restful').expect(200));
      test('unlink',()=>request(server).unlink('/restful').expect(200));
      test('purge',()=>request(server).purge('/restful').expect(200));
      test('lock',()=>request(server).lock('/restful').expect(200));
      test('unlock',()=>request(server).unlock('/restful').expect(200));
      test('propfind',()=>request(server).propfind('/restful').expect(200));
    });
  });

  describe('test default rejection handler', function () {
    test('throw sync error', () =>
      request(server).get('/sync_err')
        .expect(500).expect({ code: 500, succeed: false, msg: 'sync_err!' })
    );

    test('throw async error', () =>
      request(server).get('/async_err')
        .expect(500).expect({ code: 500, succeed: false, msg: 'async_err!' })
    );

    test('return rejected promise', () =>
      request(server).get('/promise_reject')
        .expect(500).expect({ code: 500, succeed: false, msg: 'un handle error' })
    );

    test('not handle when ctx.body has be set', () =>
      request(server).get('/no_throw_err').expect(200).expect('ok')
    );

  });

  afterAll(() => {
    server.close();
  })
});