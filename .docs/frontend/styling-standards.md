# Styling Standards & Design System

Dự án Frontend sử dụng **Tailwind CSS v4** kết hợp chặt chẽ với Design System "Green Growth".

## 1. Tech Stack & Cấu hình
- **Framework**: Tailwind CSS v4 (`@tailwindcss/postcss`).
- Khác với bản v3, hệ thống không sử dụng file `tailwind.config.js` bên ngoài.
- Mọi tuỳ chỉnh (theme variables, colors, fonts) được khai báo trực tiếp qua `@theme` directive trong file `src/styles.css`.

## 2. Design System: "Green Growth"
Hệ thống tận dụng các màu sắc chủ đạo mang hơi hướng thiên nhiên, sinh trưởng và hiện đại:
- **Primary**: `#00C27A` (Xanh ngọc - màu chủ đạo thương hiệu)
- **Accent**: `#B9FF3B` (Xanh dạ quang - tạo điểm nhấn, nút CTA)
- **Dark Green**: `#062E24` (Xanh rêu sậm - làm background tối hoặc header)
- **Mint White**: `#F4FBF9` (Trắng ánh xanh - màu nền ứng dụng sáng)
- **Soft Green**: `#E6F5F0` (Màu xanh rất nhạt - nền card, phân cách)

## 3. Typography
- **Font nội dung (Body text)**: Inter.
- **Font tiêu đề (Headings)**: Plus Jakarta Sans.
- Các font được tích hợp trực tiếp và sử dụng class utility của Tailwind (ví dụ `font-sans`, `font-heading`).

## 4. Quy định chung về CSS
- **Utility-first**: Khuyến khích 100% sử dụng Tailwind utility classes trực tiếp trong template HTML.
- **Chống lạm dụng Custom CSS**: Chỉ tạo file `.css` của component khi thực sự không thể giải quyết bằng utility class của Tailwind (ví dụ keyframe animation phức tạp, cấu trúc DOM động đặc thù).
- Tuyệt đối không dùng inline style cứng (`style="margin: 10px;"`).
- Tận dụng hiệu ứng UI hiện đại như Glassmorphism (làm mờ phông nền với độ trong suốt) ở các Modal, Dropdown, Nav.
