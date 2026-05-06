import { Injectable, inject } from '@angular/core';
import { Auth, authState, getIdToken } from '@angular/fire/auth';
import { firstValueFrom, switchMap, of, catchError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { AuthApiService } from './api/auth-api.service';
import { SyncUserPayload } from '../models/auth.model';

/**
 * Service khởi tạo và theo dõi Firebase Authentication State.
 *
 * Được chạy qua APP_INITIALIZER để đảm bảo Firebase Auth đã sẵn sàng
 * trước khi Angular bắt đầu resolve các route.
 *
 * Luồng hoạt động:
 *  - Có Firebase session: getIdToken() → syncUser(backend) → AuthStore.setCurrentUser()
 *  - Không có session: AuthStore.reset()
 *  - Cả 2 trường hợp: AuthStore.setAuthReady(true)
 */
@Injectable({
  providedIn: 'root'
})
export class AuthInitializerService {
  private auth = inject(Auth);
  private authStore = inject(AuthStore);
  private authApiService = inject(AuthApiService);

  /**
   * Được gọi bởi APP_INITIALIZER. Trả về Promise để Angular chờ
   * Firebase Auth hoàn tất check session trước khi render routes.
   */
  initialize(): Promise<void> {
    return firstValueFrom(
      authState(this.auth).pipe(
        // Chỉ lấy lần emit đầu tiên (trạng thái ban đầu khi app load)
        // Subscription liên tục để watch state thay đổi sẽ được setup riêng
        switchMap(firebaseUser => {
          if (!firebaseUser) {
            // Không có session → reset store và đánh dấu ready
            this.authStore.reset();
            this.authStore.setAuthReady(true);
            return of(undefined);
          }

          // Có session → lấy token và sync với backend
          return new Promise<void>(async (resolve) => {
            try {
              const token = await getIdToken(firebaseUser, false);

              // Xác định login provider từ providerData
              const providerData = firebaseUser.providerData[0];
              const loginProvider =
                providerData?.providerId === 'google.com'
                  ? 'google'
                  : 'email_password';

              const payload: SyncUserPayload = {
                email: firebaseUser.email ?? '',
                full_name: firebaseUser.displayName ?? 'User',
                avatar_url: firebaseUser.photoURL ?? null,
                login_provider: loginProvider
              };

              this.authApiService.syncUser(payload, token).pipe(
                catchError(err => {
                  // Backend sync thất bại: vẫn đánh dấu ready nhưng không set user
                  // → Guard sẽ redirect về login
                  console.error('[AuthInitializer] Sync user failed:', err);
                  this.authStore.reset();
                  this.authStore.setAuthReady(true);
                  resolve();
                  return of(null);
                })
              ).subscribe(dbUser => {
                if (dbUser) {
                  this.authStore.setCurrentUser(dbUser);
                }
                this.authStore.setAuthReady(true);
                resolve();
              });
            } catch (err) {
              console.error('[AuthInitializer] Get token failed:', err);
              this.authStore.reset();
              this.authStore.setAuthReady(true);
              resolve();
            }
          });
        }),
        catchError(err => {
          console.error('[AuthInitializer] Auth state error:', err);
          this.authStore.reset();
          this.authStore.setAuthReady(true);
          return of(undefined);
        })
      )
    ).then(() => {
      // Sau khi khởi tạo xong, lắng nghe thay đổi Auth State liên tục
      // để xử lý tự động logout khi token hết hạn / bị thu hồi
      this._watchAuthStateChanges();
    });
  }

  /**
   * Lắng nghe Firebase Auth State liên tục sau khi app đã khởi động.
   * - User = null: auto logout (reset store)
   * - User có mới (đăng nhập): sync với backend và cập nhật store
   */
  private _watchAuthStateChanges(): void {
    authState(this.auth).subscribe(async firebaseUser => {
      if (!this.authStore.isAuthReady()) return;

      if (!firebaseUser) {
        // Token hết hạn / logout từ tab khác / bị thu hồi
        this.authStore.reset();
        return;
      }

      // Firebase phát hiện user đăng nhập mới sau khi app đã load
      // (ví dụ: user vừa signIn từ AuthContainerComponent)
      try {
        const token = await getIdToken(firebaseUser, false);
        const providerData = firebaseUser.providerData[0];
        const loginProvider: 'google' | 'email_password' =
          providerData?.providerId === 'google.com' ? 'google' : 'email_password';

        const payload: SyncUserPayload = {
          email: firebaseUser.email ?? '',
          full_name: firebaseUser.displayName ?? 'User',
          avatar_url: firebaseUser.photoURL ?? null,
          login_provider: loginProvider
        };

        this.authApiService.syncUser(payload, token).pipe(
          catchError(err => {
            console.error('[AuthInitializer] Watch: sync user failed:', err);
            return of(null);
          })
        ).subscribe(dbUser => {
          if (dbUser) {
            this.authStore.setCurrentUser(dbUser);
          }
        });
      } catch (err) {
        console.error('[AuthInitializer] Watch: get token failed:', err);
      }
    });
  }
}
