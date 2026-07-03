import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  // Only skip auth header for public endpoints that don't need a caller identity
  const publicPaths = ['/api/auth/login', '/api/auth/verify', '/api/auth/setup'];
  const isPublic = publicPaths.some(p => req.url.includes(p));
  if (token && !isPublic) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};
