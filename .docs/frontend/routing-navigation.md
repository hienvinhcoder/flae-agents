# Routing & Navigation

## 1. Route Map
| Path | Guard | Component | Ghi chú |
|---|---|---|---|
| `/` | — | — | Redirect mặc định về `/auth/login` |
| `/auth/login` | `requireNoAuthGuard` | `AuthContainerComponent` | Đăng nhập (mode=login) |
| `/auth/register` | `requireNoAuthGuard` | `AuthContainerComponent` | Đăng ký (mode=register) |
| `/onboarding` | `authGuard` | — | Redirect về `/onboarding/create-workspace` |
| `/onboarding/create-workspace` | `authGuard` | `OnboardingContainerComponent` | Lazy-loaded, Multi-step Wizard |
| `/onboarding/oauth-callback` | `authGuard` | `OauthCallbackComponent` | Lazy-loaded, Xử lý redirect từ 3rd party |
| `/onboarding/accept-invite` | `authGuard` | `AcceptInviteComponent` | Lazy-loaded, Chấp nhận lời mời workspace |

## 2. Guard Strategy
- Các Guards (`authGuard`, `requireNoAuthGuard`) đều xử lý bất đồng bộ (async).
- Dùng `toObservable(isAuthReady).pipe(filter(ready => ready), take(1))` để đảm bảo Firebase đã hoàn tất khởi tạo state trước khi router quyết định cho phép truy cập hay điều hướng (redirect) đi nơi khác.
