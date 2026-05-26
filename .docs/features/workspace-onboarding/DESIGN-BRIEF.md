# Design Brief: Workspace Onboarding

## 1. Vibe & Layout Pattern
- **Layout Pattern**: Minimal Single Column.
- **Vibe**: Clean, modern, saas, fast.
- **Định hướng**: Tập trung cao độ vào Single CTA (Tạo Workspace hoặc Kết nối nền tảng). Sử dụng nhiều khoảng trắng (whitespace), typography lớn, loại bỏ hoàn toàn các thanh điều hướng (navigation) không cần thiết để tránh gây xao nhãng.

## 2. Màu sắc & Typography
- **Heading Font**: Plus Jakarta Sans
- **Body Font**: Plus Jakarta Sans
- **Primary Color**: `#29bf26` (CSS Variable: `--color-primary`)
- **Secondary Color**: `#404040` (CSS Variable: `--color-secondary`)
- **CTA/Accent Color**: `#D4AF37` (CSS Variable: `--color-cta`)
- **Background**: `#FFFFFF` (CSS Variable: `--color-background`)

## 3. Cấu trúc Component (Component Tree)
- `OnboardingLayoutComponent` (Container bọc toàn màn hình, canh giữa nội dung).
  - `HeaderLogoComponent` (Hiển thị logo của hệ thống).
  - `OnboardingOptionsComponent` (Hiển thị 2 lựa chọn: Tạo thủ công hoặc Kết nối nền tảng thứ 3).
    - `OptionCardComponent` (Thẻ lựa chọn có hiệu ứng hover mượt mà).
  - `ManualOnboardingFormComponent` (Form nhập liệu tinh gọn khi tạo thủ công).
    - `InputTextComponent` (Tên cửa hàng).
    - `SelectDropdownComponent` (Ngành hàng).
    - `SubmitButtonComponent` (Nút xác nhận, ưu tiên màu `--color-cta`).
  - `SyncLoadingStateComponent` (Hiển thị thông báo đang xử lý OAuth callback).

*Ở giao diện `AdminLayout` (sau khi onboard):*
- `SyncStatusBannerComponent` (Global Banner thông báo quá trình đồng bộ đang diễn ra ngầm).

## 4. Anti-patterns (Tuyệt đối tuân thủ theo DESIGN.md)
- Không dùng Emojis làm icon, chỉ dùng SVG (Heroicons/Lucide).
- Mọi phần tử click được BẮT BUỘC phải có `cursor-pointer`.
- Hiệu ứng hover phải mượt mà (transition 150-300ms ease), không gây layout shift (không dùng `scale` quá mức thay đổi kích thước gây lệch bố cục).
- Đảm bảo độ tương phản (contrast ratio) 4.5:1.
- Hiển thị rõ viền focus (focus states) cho form input để đảm bảo a11y.
- Tuyệt đối không thiết kế form onboarding quá rườm rà, yêu cầu quá nhiều thông tin (anti-pattern: Complex onboarding flow).
