# Project Context - Frontend
_Last Updated: 2026-05-06_

## 1. Tech Stack
- **Framework**: Angular v20 (Standalone Components, no NgModules)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`, không có `tailwind.config.js`)
- **Language**: TypeScript ~5.9 (strict mode)
- **State**: Angular Signals (`signal`, `computed`, `effect`)
- **Firebase**: `@angular/fire` v20 + `firebase` v11 (Auth + Firestore)
- **Forms**: Angular Reactive Forms
- **Test**: Karma + Jasmine (coverage target > 75%)

## 2. Project Structure
```
frontend/src/app/
├── core/
│   ├── guards/
│   │   └── auth.guard.ts               # authGuard, requireNoAuthGuard (async Observable, chờ isAuthReady)
│   ├── models/
│   │   └── auth.model.ts               # User, SyncUserPayload, ApiResponse<T>, LoginProvider
│   ├── stores/
│   │   └── auth.store.ts               # AuthStore: currentUser, isLoading, error, isAuthReady (Signals)
│   └── services/
│       ├── auth.service.ts             # Wrap Firebase Auth: signIn, register, signInWithGoogle, logout, getIdToken
│       ├── auth-initializer.service.ts # APP_INITIALIZER: authState() → sync backend → update store
│       ├── mock-auth.service.ts        # [DEV ONLY] Mock auth service
│       ├── mock-workspace.service.ts   # [DEV ONLY] Mock workspace/invitation service (chưa có API thật)
│       └── api/
│           └── auth-api.service.ts     # POST /auth/sync-user (gửi Firebase JWT)
├── features/
│   ├── auth/
│   │   ├── auth.routes.ts              # Lazy-loaded child routes cho /auth
│   │   ├── components/                 # LoginFormComponent, RegisterFormComponent (Dumb/Presentational)
│   │   └── pages/
│   │       └── auth-container.component.ts  # Smart container: mode login|register, effect() → navigate
│   └── onboarding/
│       ├── create-workspace.component.ts    # Form 2-step tạo workspace (đang dùng MockWorkspaceService)
│       └── accept-invite.component.ts       # Chấp nhận lời mời (đang dùng MockWorkspaceService)
├── app.config.ts   # provideFirebaseApp, provideAuth, APP_INITIALIZER, provideRouter, provideHttpClient
├── app.routes.ts   # Routes cấp 1
├── app.ts          # Root component
└── app.html / app.css

src/environments/
├── environment.ts              # apiUrl: http://localhost:8000/api/v1, firebase config (dev)
└── environment.development.ts  # Override cho ng serve
```

## 3. Routes
| Path | Guard | Component | Ghi chú |
|---|---|---|---|
| `/` | — | — | redirect → `/auth/login` |
| `/auth/login` | requireNoAuthGuard | AuthContainerComponent | mode=login |
| `/auth/register` | requireNoAuthGuard | AuthContainerComponent | mode=register |
| `/onboarding` | authGuard | — | redirect → `/onboarding/create-workspace` |
| `/onboarding/create-workspace` | authGuard | CreateWorkspaceComponent | Lazy-loaded |
| `/onboarding/accept-invite` | authGuard | AcceptInviteComponent | Lazy-loaded |

## 4. Architecture Rules
- **Dumb components**: Chỉ `@Input`/`@Output`, không inject Service, không business logic.
- **Smart components**: Inject Service, điều phối state qua Signals, dùng `effect()` để react.
- **Không dùng API GET**: Frontend query/lắng nghe Firestore trực tiếp. Backend chỉ POST/PATCH/DELETE.
- **Guards là async**: Dùng `toObservable(isAuthReady).pipe(filter(ready => ready), take(1))` — đảm bảo Firebase khởi tạo xong trước khi router quyết định redirect.
- **Design system**: "Green Growth" — Tailwind custom tokens (`primary`, `accent`, `dark-green`, `mint-white`, `soft-green`), glassmorphism, font Inter/Plus Jakarta Sans.

## 5. Authentication Flow
1. `APP_INITIALIZER` → `AuthInitializerService.initialize()` chạy trước khi router resolve bất kỳ route nào.
2. `authState(firebase).pipe(first())` emit → nếu có session: `getIdToken()` → `POST /auth/sync-user` → `AuthStore.setCurrentUser()`.
3. `AuthStore.setAuthReady(true)` → Guards được phép chạy.
4. `_watchAuthStateChanges()` chạy liên tục: reset store khi Firebase emit `null` (token thu hồi/logout), sync lại khi user đăng nhập mới.
5. Sau `signIn()`: Firebase emit `authState` → `_watchAuthStateChanges` detect → sync backend → `AuthStore.setCurrentUser()` → `effect()` trong `AuthContainerComponent` navigate.

## 6. Trạng thái hiện tại (Development Status)
- ✅ **Auth**: Login (Email/Password + Google SSO), Register, session persistence (F5-safe)
- ⚠️ **Onboarding**: UI hoàn chỉnh nhưng logic đang dùng `MockWorkspaceService` — chưa có API backend thật
- 🔲 **Dashboard**: Chưa có route, `CreateWorkspaceComponent` hiện `alert()` sau submit thành công

## 7. Development Commands
```bash
npm start       # ng serve (http://localhost:4200)
npm run build   # Production build → dist/
npm test        # Karma + Jasmine
```
**API Backend**: `http://localhost:8000/api/v1` (cấu hình trong `environment.ts`)
