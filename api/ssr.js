// Vercel SSR API handler for Angular Universal
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the generated Angular SSR request handler from the build output.
// The Angular build exports `reqHandler`, not a default function.
const ssrServer = require('../dist/frontend/server/server.mjs');
const requestHandler = ssrServer.reqHandler ?? ssrServer.default;

export default function handler(req, res) {
  if (typeof requestHandler !== 'function') {
    res.statusCode = 500;
    res.end('SSR handler not available');
    return;
  }

  return requestHandler(req, res);
}
