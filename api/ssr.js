// Vercel SSR API handler for Angular Universal
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the SSR Express server from the build output
const ssrServer = require('../dist/frontend/server/server.mjs');

export default function handler(req, res) {
  ssrServer.default(req, res);
}
