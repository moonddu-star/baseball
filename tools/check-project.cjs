'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const manifest = require('../poc/build-manifest.json');
for (const [source, destination] of Object.entries(manifest.files)) {
  assert.deepEqual(fs.readFileSync(path.join(root, source)), fs.readFileSync(path.join(root, 'dist', destination)),
    `Stale output: ${destination}. Run npm run build.`);
}
const body = manifest.scripts.map(source =>
  `// Source: ${source}\n${fs.readFileSync(path.join(root, source), 'utf8').trim()}\n`
).join('\n');
assert.equal(fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8'), `'use strict';\n(function () {\n${body}\n})();\n`,
  'Stale app.js. Run npm run build.');
const files = [...manifest.scripts, 'poc/src/domain/mines-engine.js', 'poc/src/domain/tiger-balance.js', 'poc/src/game/fx/baseball-swing.js',
  'dist/app.js', 'server.cjs', ...fs.readdirSync(path.join(root, 'tools')).filter(f => f.endsWith('.cjs')).map(f => 'tools/' + f)];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${file}: ${result.stderr}`);
}
console.log(`Source/output match; ${files.length} JavaScript syntax checks passed.`);
