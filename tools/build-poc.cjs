'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// dist is deliberately kept as the same static entry point for local/offline use.
// Copy only known build inputs; never remove unrelated files in the output folder.
function buildPoc() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'poc/build-manifest.json'), 'utf8'));
  for (const [source, destination] of Object.entries(manifest.files)) {
    const target = path.join(root, 'dist', destination);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, source), target);
  }
  const app = manifest.scripts.map(source =>
    `// Source: ${source}\n${fs.readFileSync(path.join(root, source), 'utf8').trim()}\n`
  ).join('\n');
  fs.writeFileSync(path.join(root, 'dist/app.js'), `'use strict';\n(function () {\n${app}\n})();\n`);
  console.log(`POC built: ${Object.keys(manifest.files).length} files + app.js`);
}

if (require.main === module) buildPoc();
module.exports = { buildPoc };
