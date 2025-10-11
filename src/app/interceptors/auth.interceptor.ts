import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Get the token directly from localStorage to avoid circular dependency
  let token: string | null = null;
  if (isPlatformBrowser(platformId)) {
    token = localStorage.getItem('auth_token');
  }

  console.log('🔍 Auth Interceptor:', {
    url: req.url,
    hasToken: !!token,
    token: token ? `${token.substring(0, 20)}...` : 'null',
    existingAuth: req.headers.get('Authorization'),
    method: req.method,
    urlMatch: req.url.includes('localhost:8081/api'),
    fullUrl: req.url,
  });

  // If we have a token and this is an API request, add the Authorization header
  if (token && req.url.includes('localhost:8081/api')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Added Authorization header:', {
      header: authReq.headers.get('Authorization'),
      allHeaders: authReq.headers.keys(),
    });
    return next(authReq);
  }

  console.log('⚠️ No token or not API request, proceeding without auth', {
    hasToken: !!token,
    isApiRequest: req.url.includes('localhost:8081/api'),
  });
  return next(req);
};
