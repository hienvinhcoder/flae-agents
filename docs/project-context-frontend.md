# Project Context - Frontend

## 1. Project Identity
- **Name**: FLAE Agent Frontend
- **Type**: Single Page Application (SPA) / Web Application
- **Purpose**: Giao diện người dùng cho chủ doanh nghiệp tương tác với hệ thống quản lý AI, theo dõi báo cáo Morning Briefing, quản lý Omnichannel Inbox, và thiết lập cấu hình Agent Harness.
- **Domain**: Conversational AI for SMBs (AI Workforce)

## 2. Technology Stack
- **Framework**: Angular (v20.3.x)
- **Styling**: Tailwind CSS (v4.x)
- **Language**: TypeScript (v5.9.x)
- **State Management & Reactivity**: Angular Signals
- **Architecture Pattern**: Standalone Components

## 3. Project Structure
```text
frontend/
├── public/                 # Các static assets (favicon, images, fonts)
├── src/
│   ├── app/
│   │   ├── core/           # Guards (auth.guard), Services (auth.service, api/auth-api.service), Stores (auth.store), Models (auth.model)
│   │   ├── features/       # Feature modules: auth (login-form, register-form, auth-container), onboarding...
│   │   ├── app.config.ts   # Cấu hình application, providers, router tổng
│   │   ├── app.routes.ts   # Định nghĩa các routes cấp 1 của ứng dụng
│   │   ├── app.ts / app.html / app.css # Root Component
│   ├── index.html          # HTML entry point (chứa thẻ root)
│   ├── main.ts             # Bootstrapper (bootstrapApplication)
│   └── styles.css          # Global CSS (chứa khai báo Tailwind)
├── angular.json            # Cấu hình workspace của Angular CLI
├── package.json            # Định nghĩa NPM dependencies và scripts
└── Dockerfile              # Cấu hình containerization cho Frontend
```

## 4. Configuration
- **Tailwind CSS**: Sử dụng phiên bản Tailwind CSS v4 thông qua plugin `@tailwindcss/postcss`.
- **Angular CLI**: Quản lý build, serve, test thông qua `angular.json` theo chuẩn Angular 20.
- **TypeScript**: Cấu hình chặt chẽ strict type với `tsconfig.json` và `tsconfig.app.json`.

## 5. Architecture Patterns
- **Standalone Components**: Ứng dụng theo triết lý Standalone hoàn toàn, không sử dụng `NgModules` truyền thống.
- **Smart/Dumb Components**: 
  - *Dumb/Presentational*: Các component thuần túy hiển thị UI, nhận data qua `@Input` và kích hoạt sự kiện bằng `@Output`.
  - *Smart/Container*: Các component quản lý nghiệp vụ logic, khởi tạo state và gọi service.
- **Realtime Data Fetching**: Trực tiếp query dữ liệu và lắng nghe cập nhật realtime (snapshot listener) từ Firestore thay vì gọi API GET backend. Backend chỉ xử lý ghi.
- **Styling Utility-First**: Xây dựng UI thông qua các class tiện ích của Tailwind CSS, tuân thủ "Green Growth" design system và glassmorphism cho ứng dụng có cảm giác premium, sạch sẽ.
- **State Management**: Áp dụng triệt để hệ sinh thái Reactivity của Angular bằng Signals (signal, computed, effect) thay thế RxJS ở phần lớn logic giao diện (trừ các luồng Async event/stream phức tạp).
- **Authentication Flow**: Sử dụng Firebase Auth SDK (Email/Password, Google SSO) ở Client-side. Gửi Firebase JWT Token tới Backend API (`POST /api/v1/auth/sync-user`) để đồng bộ dữ liệu. Kết quả User được lưu trữ toàn cục qua `AuthStore` Signal.
- **Security Guards**: Sử dụng `authGuard` để chặn User chưa đăng nhập vào các trang bảo vệ (chuyển về `/auth/login`), và `requireNoAuthGuard` (Guest Guard) để điều hướng User đã đăng nhập rời khỏi các trang xác thực.

## 6. Routing / Entry Points
- Bootstrapped thông qua file `src/main.ts` nạp component gốc từ `app.ts` cùng với config `app.config.ts`.
- Các Route đang cấu trúc:
  - **Auth**: Quản lý bởi `AuthContainerComponent`.
    - `/auth/login`: Hiển thị Component form đăng nhập (`LoginFormComponent`).
    - `/auth/register`: Hiển thị Component form đăng ký (`RegisterFormComponent`).
  - **Onboarding**: Khởi tạo workspace, xác nhận lời mời tham gia (`/features/onboarding`).

## 7. Development Workflow
- **Serve Locally**: Chạy `npm start` (thực thi ng serve) để phát triển ở môi trường local.
- **Build**: Chạy `npm run build` để tối ưu hóa code.
- **Testing**: Yêu cầu bắt buộc viết test với coverage > 75%, sử dụng `npm test` thông qua Karma và Jasmine.
