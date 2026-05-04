import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { MockAuthService } from '../services/mock-auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(MockAuthService);
  const router = inject(Router);

  if (authService.currentUser()) {
    return true;
  }

  // Chuyển hướng về trang login nếu chưa đăng nhập
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

export const requireNoAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(MockAuthService);
  const router = inject(Router);

  if (!authService.currentUser()) {
    return true;
  }

  // Chuyển hướng nếu đã đăng nhập rồi (tránh vào lại trang login)
  return router.createUrlTree(['/onboarding']);
};
