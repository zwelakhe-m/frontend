import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'messages/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'items/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'items/:id/bookings',
    renderMode: RenderMode.Server
  },
  {
    path: 'browse',
    renderMode: RenderMode.Server
  },
  {
    path: 'items',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
