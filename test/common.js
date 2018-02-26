/**
 * Created by ngtmuzi on 2018/2/11.
 */
'use strict';

const request = require('supertest');

const pave = require('../lib/pave');

module.exports = function runtest({nr, createServer}) {

  const makeRouter = function () {
    return () => nr(...arguments);
  };

  describe('Type check', function () {
    test('through Number will throw Error', () => {
      expect(makeRouter(1)).toThrow();
    });
    test('through Null will throw Error', () => {
      expect(makeRouter(null)).toThrow();
    });
    test('through Function will throw Error', () => {
      expect(makeRouter(() => {})).toThrow();
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
      expect(makeRouter({a: 1})).toThrow('must be function');
    });
    test('through valid Object will return middleware function', () => {
      expect(makeRouter({a: () => 'hi'})).toBeInstanceOf(Function);
    });
    test('pave() function only receive object', () => {
      expect(() => pave(null)).toThrow('');
    });
  });


  describe('lib function check', function () {
    test('nRouter.reject function throw a error with code', () => {
      expect(() => nr.reject(400, 'params error', {a: 1}))
        .toThrow();
    });

    test('pave function throw a error with code', () => {
      expect(() => nr.reject(400, 'params error', {a: 1}))
        .toThrow();
    });
  });

  describe('Route rule check', function () {
    const routerObj = {
      jump_to_abc   : (msg, headers, ctx) => {
        ctx.response.redirect('/a/b/c')
      },
      a             : {
        b           : {
          c      : () => 'from /a/b/c',
          'd/eee': () => 'from /a/b/d/eee'
        },
        'f/:gggg'   : msg => msg.gggg,
        'h/:i/:j/:k': msg => msg
      },
      sync_err      : () => {
        throw new Error('sync_err!');
      },
      promise_reject: () => Promise.reject('promise_reject!'),
      async_err     : async () => {
        throw new Error('async_err!');
      },
      no_throw_err  : (msg, headers, ctx) => {
        if (ctx.response.end)
          ctx.response.end('ok');
        else
          ctx.body = 'ok';

        throw new Error('oh!');
      }

    };

    const server = createServer(routerObj);

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
        request(server).get('/a/h/iii/jjj/kkkk').expect({i: 'iii', j: 'jjj', k: 'kkkk'})
      );
    });

    describe('test default rejection handler', function () {
      test('throw sync error', () =>
        request(server).get('/sync_err')
          .expect(500).expect({code: 500, succeed: false, msg: 'sync_err!'})
      );

      test('throw async error', () =>
        request(server).get('/async_err')
          .expect(500).expect({code: 500, succeed: false, msg: 'async_err!'})
      );

      test('return rejected promise', () =>
        request(server).get('/promise_reject')
          .expect(500).expect({code: 500, succeed: false, msg: 'un handle error'})
      );

      test('not handle when ctx.body has be set', () =>
        request(server).get('/no_throw_err').expect(200).expect('ok')
      );

    });

    afterAll(() => {
      server.close();
    })
  });

};
