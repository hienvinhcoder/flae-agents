# 🌐 Đa Ngôn Ngữ & Địa Phương Hóa (Multi-language & Localization)

Tài liệu này chi tiết hóa cách thiết kế, cấu hình và sử dụng hệ thống Đa ngôn ngữ (Localization) trên Frontend của FLAE Agents.

---

## 1. Kiến Trúc Tổng Quan
Hệ thống sử dụng thư viện `@ngx-translate/core` kết hợp với `@ngx-translate/http-loader` để tải các file dịch thuật định dạng JSON bất đồng bộ từ thư mục tài nguyên tĩnh (`assets/i18n/`).
Trạng thái ngôn ngữ hiện tại được quản lý tập trung và reactive thông qua **Angular Signals** tại [language.service.ts](../../frontend/src/app/core/services/language.service.ts).

```text
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────────┐
│  Angular Pages  │ ◄──── │ LanguageService │ ◄──── │   TranslateService   │
│ (TranslatePipe) │       │ (currentLang)   │       │ (@ngx-translate/core)│
└─────────────────┘       └────────┬────────┘       └──────────┬───────────┘
                                   │                           │ (Load JSON)
                                   ▼                           ▼
                           ┌───────────────┐       ┌──────────────────────┐
                           │ LocalStorage  │       │  assets/i18n/*.json  │
                           └───────────────┘       └──────────────────────┘
```

---

## 2. Các Thành Phần Chi Tiết

### A. Cấu Hình Global (`app.config.ts`)
Hệ thống dịch thuật được khởi tạo thông qua `appConfig` trong [app.config.ts](../../frontend/src/app/app.config.ts):

```typescript
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... các providers khác
    importProvidersFrom(
      TranslateModule.forRoot()
    ),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json'
    })
  ]
};
```

### B. Dịch Vụ Ngôn Ngữ (`LanguageService`)
Nằm tại [language.service.ts](../../frontend/src/app/core/services/language.service.ts), dịch vụ này chịu trách nhiệm:
1. **Khởi tạo ngôn ngữ ban đầu**:
   - Kiểm tra `localStorage` lấy ngôn ngữ đã lưu (`flae_selected_language`).
   - Nếu không có, tự động dò ngôn ngữ trình duyệt (ưu tiên `vi` nếu trình duyệt dùng tiếng Việt, ngược lại mặc định là `en`).
2. **Cung cấp State Reactive**:
   - Dùng Signal `currentLang` để lưu trữ trạng thái ngôn ngữ hiện tại, giúp UI tự động re-render mượt mà khi đổi ngôn ngữ.
3. **API chuyển đổi ngôn ngữ**:
   - `setLanguage(lang: SupportedLang)`: Lưu vào localStorage, kích hoạt dịch thuật, và cập nhật signal.
   - `toggleLanguage()`: Chuyển đổi nhanh qua lại giữa `vi` & `en`.

### C. Quản Lý File Dịch (I18n JSON Files)
Các file ngôn ngữ được đặt tại `frontend/public/assets/i18n/`:
- [vi.json](../../frontend/public/assets/i18n/vi.json): Chứa các bản dịch tiếng Việt.
- [en.json](../../frontend/public/assets/i18n/en.json): Chứa các bản dịch tiếng Anh.

Cấu trúc file JSON được phân nhóm rõ ràng theo tính năng/component (ví dụ: `COMMON`, `NAV`, `TOPBAR`, `SIDEBAR`, `AUTH`, `VALIDATION`):
```json
{
  "COMMON": {
    "CANCEL": "Hủy bỏ",
    "SAVE": "Lưu"
  },
  "AUTH": {
    "EMAIL": "Địa chỉ Email",
    "PASSWORD": "Mật khẩu"
  }
}
```

---

## 3. Quy Chuẩn Sử Dụng (Coding Standards)

### Bước 1: Khai Báo Dịch Thuật tại Component
Trong các Angular Standalone Components, cần import `TranslateModule` vào mảng `imports`:

```typescript
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <h2>{{ 'AUTH.CREATE_ACCOUNT' | translate }}</h2>
  `
})
export class MyComponent {}
```

### Bước 2: Sử Dụng Pipe Translate
Để hiển thị nội dung động hoặc dịch nhãn, sử dụng `translate` pipe:
- **Dịch text tĩnh trong HTML**:
  ```html
  <label>{{ 'AUTH.EMAIL' | translate }}</label>
  ```
- **Sử dụng trong Title hoặc Tooltip (Attribute binding)**:
  ```html
  <button [title]="'COMMON.SAVE' | translate}">...</button>
  ```
- **Sử dụng với Router Link hoặc Array dữ liệu**:
  ```html
  <span [title]="collapsed ? (item.translationKey | translate) : ''">
    {{ item.translationKey | translate }}
  </span>
  ```

### Bước 3: Tích hợp Bộ Chọn Ngôn Ngữ (Language Selector Selector)
Hiện tại, bộ chọn ngôn ngữ được tích hợp trực tiếp tại Topbar [topbar.component.ts](../../frontend/src/app/core/layout/admin-layout/ui/topbar.component.ts) dưới dạng dropdown menu.
Khi người dùng chọn một ngôn ngữ, app sẽ gọi hàm:
```typescript
languageService.setLanguage('vi'); // hoặc 'en'
```
Ngay lập tức, `currentLang()` cập nhật và `@ngx-translate` tự động nạp file ngôn ngữ tương ứng.
