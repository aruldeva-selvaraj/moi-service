import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  const role = auth.currentUser()?.role;
  if (role === 'admin' || role === 'superadmin') return true;
  return router.createUrlTree(['/dashboard']);
};
