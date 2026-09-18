'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const defaultRoot = path.resolve(__dirname, '../dist');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8' };

// Serves files only; this is not the PixiBrown LocalServer game protocol.
function createStaticServer(root = defaultRoot) {
  root = path.resolve(root);
  return http.createServer((req, res) => {
    let route;
    try {
      route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (route.includes('\0')) throw new Error('Invalid path');
    } catch { res.writeHead(400); res.end('Bad request'); return; }
    const file = path.resolve(root, '.' + (route === '/' ? '/index.html' : route));
    const relative = path.relative(root, file);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}

function startServer() {
  const server = createStaticServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? 'Port 4173 is already in use. Open http://127.0.0.1:4173/ or stop the existing server.' : error.message);
    process.exitCode = 1;
  });
  server.listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
  return server;
}
module.exports = { createStaticServer, startServer };
