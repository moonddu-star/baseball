'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = require('../poc/build-manifest.json');
const now = new Date();
const stamp = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(now).replace(/[- :]/g, '');
const name = 'clutch-hit-release-' + stamp + '-' + crypto.randomBytes(3).toString('hex');
const stage = path.join(root, '.work', name);
fs.mkdirSync(stage, { recursive: true });
fs.mkdirSync(path.join(root, 'releases'), { recursive: true });
const files = [...Object.values(manifest.files), 'app.js'];
for (const file of files) {
  const target = path.resolve(stage, file);
  if (!target.startsWith(stage + path.sep)) throw new Error('Invalid release path: ' + file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, 'dist', file), target);
}
fs.copyFileSync(path.join(root, 'THIRD-PARTY.md'), path.join(stage, 'THIRD-PARTY.md'));
const guide = fs.readFileSync(path.join(root, 'doc/deploy-readme-template.md'), 'utf8')
  .replace('{{PACKAGE_NAME}}', name).replace('{{BUILD_TIME_UTC}}', now.toISOString());
fs.writeFileSync(path.join(stage, 'DEPLOY-README.md'), guide);
files.push('THIRD-PARTY.md', 'DEPLOY-README.md');
const sums = files.sort().map(file => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(stage, file))).digest('hex') + '  ' + file);
fs.writeFileSync(path.join(stage, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
const info = { name, stage, zip: path.join(root, 'releases', name + '.zip'), files: files.length + 1 };
fs.writeFileSync(path.join(root, '.work/current-deploy-package.json'), JSON.stringify(info, null, 2));
console.log('Prepared ' + name + ' (' + info.files + ' files)');
