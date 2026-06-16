import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../auth.service';
import { WorkspaceStore } from '../../stores/workspace.store';

/**
 * HTTP Interceptor tự động đính kèm Firebase ID Token vào Authorization header
 * và current workspace ID vào X-Workspace-ID header cho mọi API request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const workspaceStore = inject(WorkspaceStore);

  const firebaseUser = authService.getCurrentFirebaseUser();

  // Chỉ can thiệp vào các API request gửi đến Backend (chứa '/api/')
  // và khi đã có firebaseUser
  if (!firebaseUser || !req.url.includes('/api/')) {
    return next(req);
  }

  // Chuyển Promise token từ Firebase thành Observable
  return from(authService.getFirebaseToken(firebaseUser)).pipe(
    switchMap(token => {
      let headers = req.headers;

      // Chỉ đính kèm Authorization header nếu chưa có sẵn
      if (!headers.has('Authorization')) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }

      // Tự động đính kèm X-Workspace-ID nếu có trong store và chưa được set thủ công
      const currentWsId = workspaceStore.currentWorkspaceId();
      if (currentWsId && !headers.has('X-Workspace-ID')) {
        headers = headers.set('X-Workspace-ID', currentWsId);
      }

      const clonedReq = req.clone({ headers });
      return next(clonedReq);
    })
  );
};
