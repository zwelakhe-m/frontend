import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

if (typeof CSSStyleDeclaration !== 'undefined' && !CSSStyleDeclaration.prototype.setProperty) {
  CSSStyleDeclaration.prototype.setProperty = function (name: string, value: string, priority?: string) {
    const style = this as unknown as Record<string, string | undefined>;

    if (typeof name === 'string' && name.startsWith('--')) {
      style[name] = value;
      return;
    }

    const camelCaseName = name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
    style[camelCaseName] = value;
    if (priority) {
      style[`${camelCaseName}Priority`] = priority;
    }
  };

  CSSStyleDeclaration.prototype.getPropertyValue = function (name: string) {
    const style = this as unknown as Record<string, string | undefined>;

    if (typeof name === 'string' && name.startsWith('--')) {
      return style[name] ?? '';
    }

    const camelCaseName = name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
    return style[camelCaseName] ?? '';
  };

  CSSStyleDeclaration.prototype.removeProperty = function (name: string) {
    const style = this as unknown as Record<string, string | undefined>;

    if (typeof name === 'string' && name.startsWith('--')) {
      const value = style[name] ?? '';
      delete style[name];
      return value;
    }

    const camelCaseName = name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
    const value = style[camelCaseName] ?? '';
    delete style[camelCaseName];
    return value;
  };
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
