import { Injectable, inject, NgZone } from '@angular/core';
import { Auth, authState, getRedirectResult, User as FirebaseUser } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { firstValueFrom, of, catchError, BehaviorSubject } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { AuthApiService } from './api/auth-api.service';
import { ConnectionModalService } from './connection-modal.service';
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
  private connectionModalService = inject(ConnectionModalService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  // Gọi các hàm của AngularFire trong Injection Context (lúc class được khởi tạo bởi Angular DI)
  private readonly authState$ = authState(this.auth);
  private readonly redirectPromise = getRedirectResult(this.auth);

  /**
   * Được gọi bởi APP_INITIALIZER. Trả về Promise để Angular chờ
   * Firebase Auth hoàn tất check session trước khi render routes.
   *
   * Luồng quan trọng cho Google Login (signInWithRedirect):
   *  1. Await getRedirectResult() TRƯỚC — Firebase cần xử lý redirect callback
   *     trước khi authState$ có thể emit đúng trạng thái session.
   *  2. Sau đó mới subscribe authState$ để sync user với backend.
   *  3. Nếu bỏ qua bước 1, authState$ có thể emit null (chưa restore session)
   *     → Guard redirect nhầm về login.
   */
  initialize(): Promise<void> {
    console.log('[AuthInitializer] initialize() called');

    return this._handleRedirectResult().then(() => {
      // Sau khi getRedirectResult() hoàn tất, gọi auth.authStateReady() —
      // Promise này CHỜ Firebase SDK hoàn tất việc restore session từ
      // IndexedDB (nếu có) rồi mới resolve. Đây là cách chính thức của
      // Firebase để tránh race condition khi:
      //   1. User mới login Google bằng signInWithRedirect → app reload
      //   2. Trước khi session restore xong, authState$ có thể emit null
      //      (và từng emit null trong code cũ → store bị reset nhầm)
      //
      // Sau khi authStateReady() resolve, auth.currentUser đã ổn định:
      //   - User nếu có session
      //   - null nếu chưa đăng nhập
      return this.auth.authStateReady().then(() => {
        const firebaseUser = this.auth.currentUser;
        console.log('[AuthInitializer] authStateReady resolved:', firebaseUser ? 'user exists' : 'null');

        if (!firebaseUser) {
          this.authStore.reset();
          this.authStore.setAuthReady(true);
          return;
        }

        // Có session → lấy token và sync với backend.
        // KHÔNG đánh dấu authReady=true cho tới khi syncUser HOÀN TẤT,
        // để guard không redirect về login trong khi chờ backend.
        return this._syncAndSetUser(firebaseUser).finally(() => {
          this.authStore.setAuthReady(true);
        });
      }).then(() => {
        this.ngZone.run(() => {
          console.log('[AuthInitializer] initialize() completed, starting auth state watcher');
          this._watchAuthStateChanges();
        });
      });
    });
  }

  /**
   * Sync Firebase user với backend và set vào AuthStore.
   * Trả về Promise với User|null.
   * Nếu sync fail, KHÔNG reset store (để user có thể thử lại ở lần watch tiếp theo).
   */
  private async _syncAndSetUser(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const token = await firebaseUser.getIdToken(false);

      const providerData = firebaseUser.providerData[0];
      const loginProvider: 'google' | 'email_password' =
        providerData?.providerId === 'google.com' ? 'google' : 'email_password';

      const payload: SyncUserPayload = {
        email: firebaseUser.email ?? '',
        full_name: firebaseUser.displayName ?? 'User',
        avatar_url: firebaseUser.photoURL ?? null,
        login_provider: loginProvider
      };

      const dbUser = await firstValueFrom(this.authApiService.syncUser(payload, token));
      if (dbUser) {
        this.authStore.setCurrentUser(dbUser);
      } else {
        console.warn('[AuthInitializer] Sync returned null user, store not updated');
      }
    } catch (err) {
      // KHÔNG reset store nếu sync fail — để watch có thể retry.
      // Chỉ log lỗi.
      console.error('[AuthInitializer] Sync user failed (will be retried by watcher):', err);
    }
  }

  /**
   * Xử lý kết quả từ signInWithRedirect (Google Login).
   * PHẢI được gọi TRƯỚC khi subscribe authState$ để đảm bảo
   * Firebase SDK đã xử lý xong redirect callback và restore session đúng.
   */
  private async _handleRedirectResult(): Promise<void> {
    try {
      const redirectResult = await this.redirectPromise;
      if (redirectResult?.user) {
        console.log('[AuthInitializer] Redirect result detected, user:', redirectResult.user.email);
      }
    } catch (err) {
      // Lỗi getRedirectResult không nghiêm trọng — có thể xảy ra khi:
      // - Không có redirect pending (navigate bình thường, không phải Google login)
      // - Browser đã clear redirect state
      console.warn('[AuthInitializer] getRedirectResult error (non-critical):', err);
    }
  }

  /**
   * Lắng nghe Firebase Auth State liên tục sau khi app đã khởi động.
   * - User = null: auto logout (reset store)
   * - User có mới (đăng nhập): sync với backend và cập nhật store
   *
   * Lưu ý quan trọng: authState$ (từ rxfire) chỉ emit khi có THAY ĐỔI,
   * KHÔNG replay giá trị hiện tại khi subscribe. Vì vậy nếu user login
   * TRƯỚC khi watch subscribe (vd: login bằng email/password ngay khi
   * app load), watch sẽ miss event.
   *
   * Fix: Dùng BehaviorSubject để emit giá trị hiện tại (auth.currentUser)
   * ngay khi watch subscribe, kèm forward các emit mới từ authState$.
   */
  private _watchAuthStateChanges(): void {
    // Seed BehaviorSubject với currentUser hiện tại (nếu có)
    // để watch không miss event khi user login trước khi watch setup.
    const userStream$ = new BehaviorSubject<FirebaseUser | null>(this.auth.currentUser);
    this.authState$.subscribe(user => userStream$.next(user));

    userStream$.subscribe(async firebaseUser => {
      this.ngZone.run(async () => {
        if (!this.authStore.isAuthReady()) return;

        if (!firebaseUser) {
          // Token hết hạn / logout từ tab khác / bị thu hồi
          this.authStore.reset();

          // Chuyển hướng ngay lập tức về trang login
          const currentUrl = this.router.url;
          if (!currentUrl.startsWith('/auth')) {
            console.log('[AuthInitializer] User logged out, redirecting to login');
            this.router.navigate(['/auth/login'], { queryParams: { returnUrl: currentUrl } });
          }
          return;
        }

        // Chỉ thực hiện sync nếu UID mới khác với user hiện tại trong store
        const currentUser = this.authStore.currentUser();
        if (currentUser && currentUser.firebase_uid === firebaseUser.uid) {
          console.log('[AuthInitializer] User already synced, skipping redundant API call');
          return;
        }

        // Firebase phát hiện user đăng nhập mới sau khi app đã load
        // (ví dụ: user vừa signIn từ AuthContainerComponent hoặc redirect từ Google)
        try {
          // Reset connection modal trước khi sync:
          // Nếu trước đó server tạm thời mất kết nối (Docker đang build, v.v.),
          // flag isServerDown có thể đang = true khiến interceptor chặn request.
          // Firebase Auth đã xác nhận user hợp lệ → ta thử sync bất chấp.
          if (this.connectionModalService.isServerDown()) {
            console.warn('[AuthInitializer] Server was marked down, attempting sync anyway...');
          }

          const token = await firebaseUser.getIdToken(false);
          const providerData = firebaseUser.providerData[0];
          const loginProvider: 'google' | 'email_password' =
            providerData?.providerId === 'google.com' ? 'google' : 'email_password';

          const payload: SyncUserPayload = {
            email: firebaseUser.email ?? '',
            full_name: firebaseUser.displayName ?? 'User',
            avatar_url: firebaseUser.photoURL ?? null,
            login_provider: loginProvider
          };

          console.log('[AuthInitializer] Watch: syncing user with backend...', payload.email);

          this.authApiService.syncUser(payload, token).pipe(
            catchError(err => {
              console.error('[AuthInitializer] Watch: sync user failed:', err);
              return of(null);
            })
          ).subscribe(dbUser => {
            if (dbUser) {
              console.log('[AuthInitializer] Watch: sync success, setting user in store');
              this.authStore.setCurrentUser(dbUser);

              // Navigate đến dashboard ngay sau khi sync thành công.
              // Không phụ thuộc vào effect() trong AuthContainerComponent
              // vì effect có thể không re-trigger từ async subscribe callback.
              const currentUrl = this.router.url;
              if (currentUrl.startsWith('/auth')) {
                console.log('[AuthInitializer] Watch: redirecting to /dashboard from', currentUrl);
                this.router.navigateByUrl('/dashboard');
              }
            } else {
              console.warn('[AuthInitializer] Watch: sync returned null, user not set');
            }
          });
        } catch (err) {
          console.error('[AuthInitializer] Watch: get token failed:', err);
        }
      });
    });
  }
}
