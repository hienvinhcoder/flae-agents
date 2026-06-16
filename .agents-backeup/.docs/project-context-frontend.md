# Project Context - Frontend (Index)

> **Last Updated**: 2026-06-08

## 1. Overview
Hệ thống frontend của FLAE Agents được thiết kế hoàn toàn bằng kiến trúc **Angular Signals** kết hợp với **REST API (Backend FastAPI)** và **WebSockets**. Mục tiêu là xây dựng giao diện cho nền tảng **Company Memory AI** giúp doanh nghiệp kết nối các nguồn dữ liệu (Notion, Slack, Google Drive, GitHub) và thực hiện hỏi đáp thông minh (Ask AI), phát hiện tài liệu lỗi thời (Stale Docs), và theo dõi báo cáo thay đổi (Briefing). Hệ thống hỗ trợ chuyển đổi Workspace động và quản lý thành viên thông qua `WorkspaceStore` và `WorkspaceApiService`.

**Các quy tắc vàng**:
1. Tuân thủ tuyệt đối kiến trúc **Dumb/Smart component**.
2. **REST API & Realtime**: Mọi truy xuất dữ liệu thông qua REST API (GET/POST/PUT/DELETE) gọi tới Backend. Các dữ liệu cần realtime sẽ được lắng nghe thông qua **WebSockets** (đẩy từ Redis Pub/Sub của Backend).
3. Tất cả UI state quản lý thông qua **Angular Signals** (`signal`, `computed`, `effect`).

## 2. Tech Stack
- **Framework**: Angular v20 (Standalone Components, no NgModules).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`).
- **Language**: TypeScript ~5.9 (Strict Mode).
- **State**: Angular Signals.
- **Localization**: `@ngx-translate/core` & `@ngx-translate/http-loader` (Quản lý đa ngôn ngữ Việt - Anh).
- **Firebase**: `@angular/fire` v20 + `firebase` v11 (Chỉ dùng cho Authentication & Storage).
- **Realtime**: RxJS WebSocketSubject hoặc thư viện WebSocket tương đương.
- **Test**: Karma + Jasmine (Target Coverage > 75%).

## 3. Cấu trúc Thư mục Chính
Thư mục gốc của source code frontend: `frontend/src/app/`
- `core/`: Chứa các nền tảng hệ thống như Guards, Layout, Models, Store (State), và Services (Firebase, API).
- `features/`: Chứa các tính năng được tải động (Lazy-load routes) và các Smart Components thuộc về tính năng đó:
  - `auth/`: Đăng nhập, đồng bộ user.
  - `dashboard/`: Trang điều khiển chính sau khi đăng nhập (gồm các trang con: Briefing, Ask AI, Sources, Stale Docs, Agents, Settings).
- `shared/`: Nơi chứa tài nguyên UI có thể tái sử dụng trên toàn app.
  - `ui/`: Chứa các UI/Dumb Components chung (Buttons, Cards, Inputs, Dialogs...). Các Component này được thiết kế theo Standalone Component pattern, dùng `input()` và `output()`, không gọi API hay chứa logic nghiệp vụ, và có thể import trực tiếp vào bất kỳ Feature nào.
  - `pipes/`: Chứa các custom pipes dùng chung.
- `app.config.ts`: Cài đặt môi trường ứng dụng và các providers chính.
- `app.routes.ts`: Quản lý định tuyến toàn cục với Lazy Loading (đã lược bỏ luồng onboarding cũ).

## 4. Lệnh chạy (Dev Commands)
```bash
npm start       # Khởi chạy server ở http://localhost:4200
npm run build   # Build production folder -> dist/
npm test        # Chạy Karma/Jasmine Unit Test
```

## 5. Tài liệu Chi tiết (Deep Dives)
Để hiểu chi tiết cấu trúc triển khai của các thành phần riêng lẻ, hãy xem các tài liệu chuyên đề sau trong thư mục `docs/frontend/`:

- 📖 [Kiến trúc Component (Smart/Dumb)](frontend/smart-dumb-architecture.md)
- 📖 [Quản lý State với Signals](frontend/state-signals.md)
- 📖 [Quy chuẩn CSS & Design System](frontend/styling-standards.md)
- 📖 [Giao tiếp API & Cấu trúc Firebase](frontend/api-communication.md)
- 📖 [Luồng Xác thực (Authentication Flow)](frontend/auth-flow.md)
- 📖 [Điều hướng (Routing & Navigation)](frontend/routing-navigation.md)
- 📖 [Đa ngôn ngữ & Địa phương hóa (Multi-language)](frontend/multi-language.md)
