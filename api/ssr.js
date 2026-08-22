// Vercel SSR API handler for Angular Universal
// Import the generated Angular SSR request handler from the build output.
// The Angular build exports `reqHandler`, not a default function.
const ssrServer = require('../dist/frontend/server/server.mjs');
const requestHandler = ssrServer.reqHandler ?? ssrServer.default;

function handler(req, res) {
  if (typeof requestHandler !== 'function') {
    res.statusCode = 500;
    res.end('SSR handler not available');
    return;
  }

  return requestHandler(req, res);
}

module.exports = handler;
module.exports.default = handler;
