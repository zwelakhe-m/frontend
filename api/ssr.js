// Vercel SSR API handler for Angular Universal.
// The generated Angular SSR bundle is an ES module, so it must be loaded
// with dynamic import() instead of CommonJS require().
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let requestHandler;

async function loadRequestHandler() {
  if (requestHandler) {
    return requestHandler;
  }

  const serverBundlePath = path.join(__dirname, '..', 'dist', 'frontend', 'server', 'server.mjs');
  const ssrServer = await import(pathToFileURL(serverBundlePath).href);
  requestHandler = ssrServer.reqHandler ?? ssrServer.default;
  return requestHandler;
}

async function handler(req, res) {
  const resolvedHandler = await loadRequestHandler();

  if (typeof resolvedHandler !== 'function') {
    res.statusCode = 500;
    res.end('SSR handler not available');
    return;
  }

  return resolvedHandler(req, res);
}

module.exports = handler;
module.exports.default = handler;
