'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createStaticServer } = require('../tools/dev-server.cjs');
test('preview serves assets and rejects escaping or malformed paths', async t => {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  function request(path) {
    return new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: server.address().port, path }, res => {
        let body = ''; res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
      }).on('error', reject);
    });
  }
  assert.equal((await request('/')).status, 200);
  assert.match((await request('/app.js')).type, /javascript/);
  assert.equal((await request('/assets/stadium-clean.png')).status, 200);
  const music = await request('/assets/baseball-bg.mp3');
  assert.equal(music.status, 200); assert.match(music.type, /audio\/mpeg/);
  assert.equal((await request('/missing.png')).status, 404);
  assert.equal((await request('/%2e%2e%2fpackage.json')).status, 403);
  assert.equal((await request('/%')).status, 400);
});
