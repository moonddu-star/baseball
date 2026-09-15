'use strict';
// Keep the existing node server.cjs entry point.
const { buildPoc } = require('./tools/build-poc.cjs');
const { startServer } = require('./tools/dev-server.cjs');
buildPoc();
startServer();
