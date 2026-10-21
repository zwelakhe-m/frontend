import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { getContext } from '@netlify/angular-runtime/context.mjs';

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

const angularAppEngine = new AngularAppEngine();

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext();
  const result = await angularAppEngine.handle(request, context);
  return result || new Response('Not found', { status: 404 });
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
