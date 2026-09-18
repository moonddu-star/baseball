'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = require('../poc/build-manifest.json');
function verifyRelease(directory) {
  const base = path.resolve(directory);
  const runtimeFiles = [...Object.values(manifest.files), 'app.js'];
  const contentFiles = [...runtimeFiles, 'THIRD-PARTY.md', 'DEPLOY-README.md'].sort();
  const expected = [...contentFiles, 'SHA256SUMS.txt'].sort();
  const actual = [];
  function walk(relative = '') {
    for (const entry of fs.readdirSync(path.join(base, relative), { withFileTypes: true })) {
      const file = relative ? relative + '/' + entry.name : entry.name;
      assert.ok(!entry.isSymbolicLink(), 'Unexpected symlink: ' + file);
      if (entry.isDirectory()) walk(file);
      else actual.push(file);
    }
  }
  walk();
  assert.deepEqual(actual.sort(), expected, 'Release must contain exactly the manifest and deployment documents');
  const lines = fs.readFileSync(path.join(base, 'SHA256SUMS.txt'), 'utf8').trim().split(/\r?\n/);
  const hashedFiles = [];
  for (const line of lines) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert.ok(match, 'Invalid checksum line');
    const [, hash, file] = match;
    assert.ok(contentFiles.includes(file), 'Unexpected checksum path: ' + file);
    hashedFiles.push(file);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(base, file))).digest('hex'), hash, file);
  }
  assert.deepEqual(hashedFiles.sort(), contentFiles, 'Missing or duplicate checksum');
  for (const file of runtimeFiles) {
    assert.deepEqual(fs.readFileSync(path.join(base, file)), fs.readFileSync(path.join(root, 'dist', file)), file);
  }
  assert.deepEqual(fs.readFileSync(path.join(base, 'THIRD-PARTY.md')), fs.readFileSync(path.join(root, 'THIRD-PARTY.md')));
  console.log('Verified extracted release: ' + expected.length + ' files, checksums and build match.');
}
if (require.main === module) {
  assert.ok(process.argv[2], 'Usage: node tools/verify-release.cjs <extracted-directory>');
  verifyRelease(process.argv[2]);
}
module.exports = { verifyRelease };
