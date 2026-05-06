import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  // Chuyển hướng về trang login nếu chưa đăng nhập
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

export const requireNoAuthGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.isAuthenticated()) {
    return true;
  }

  // Chuyển hướng nếu đã đăng nhập rồi (tránh vào lại trang login)
  return router.createUrlTree(['/onboarding']);
};
