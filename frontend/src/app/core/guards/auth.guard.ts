import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthStore } from '../stores/auth.store';

/**
 * Bảo vệ route yêu cầu đăng nhập.
 * Chờ Firebase Auth sẵn sàng (isAuthReady) trước khi kiểm tra trạng thái,
 * tránh redirect nhầm khi SDK đang khởi tạo.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return toObservable(authStore.isAuthReady).pipe(
    filter(ready => ready),
    take(1),
    map(() => {
      if (authStore.isAuthenticated()) {
        return true;
      }
      // Chuyển hướng về trang login nếu chưa đăng nhập
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    })
  );
};

/**
 * Chặn route không cần auth (login, register) khi đã đăng nhập.
 * Chờ Firebase Auth sẵn sàng trước khi kiểm tra.
 */
export const requireNoAuthGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return toObservable(authStore.isAuthReady).pipe(
    filter(ready => ready),
    take(1),
    map(() => {
      if (!authStore.isAuthenticated()) {
        return true;
      }
      // Chuyển hướng nếu đã đăng nhập rồi (tránh vào lại trang login)
      return router.createUrlTree(['/onboarding']);
    })
  );
};

