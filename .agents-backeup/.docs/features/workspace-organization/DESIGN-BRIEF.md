# Design Brief: Workspace & Organization Management

Tài liệu đặc tả thiết kế giao diện (UI/UX), Layout và Design System cho tính năng quản lý Workspace và Thành viên (Organization) thuộc nền tảng FLAE Agents.

---

## 1. Hệ thống Lưới & Bố cục (Layout System)

Giao diện quản lý Workspace và Thành viên được tích hợp vào khu vực **Settings** (Cấu hình hệ thống).

- **Root Container:**
  - `min-h-screen bg-app text-text-secondary antialiased p-6 md:p-8`
- **Bố cục chính (Settings Layout):**
  - Sử dụng bố cục 2 cột (Sidebar bên trái và Content panel bên phải).
  - **Desktop (`md:grid grid-cols-4 gap-8`):** 
    - Sidebar chiếm 1 cột (`col-span-1`).
    - Content Panel chiếm 3 cột (`col-span-3`).
  - **Mobile (`flex flex-col gap-6`):**
    - Sidebar chuyển thành thanh điều hướng cuộn ngang hoặc dropdown selector.
- **Khoảng cách (Spacing):**
  - Khoảng cách giữa các panel chính: `gap-8` (32px).
  - Khoảng cách trong các form/card: `p-6` (24px).
  - Khoảng cách giữa các control trong form: `space-y-4` (16px).

---

## 2. Đặc tả Component (Component Specs)

Chỉ liệt kê các Dumb (Presentational) Components thực hiện hiển thị UI và tương tác thô.

### A. `WorkspaceSelectorComponent` [DUMB]
- **Mô tả:** Nút chọn/chuyển đổi Workspace nhanh nằm ở góc trên sidebar chính hoặc thanh header của ứng dụng.
- **Box Style:**
  - `inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-soft transition hover:border-border-strong hover:bg-subtle cursor-pointer`
- **Typography:**
  - Tên workspace hiện tại: `text-sm font-semibold text-text-primary`
  - Nhãn phụ: `text-xs text-text-muted`
- **Tương tác (Interactions):**
  - **Hover:** `hover:border-border-strong hover:bg-subtle`
  - **Active:** `active:scale-95 transition-all`
  - **Dropdown menu:** Khi click, hiển thị menu dạng `bg-elevated border border-border-strong rounded-xl shadow-elevated p-2` chứa danh sách workspace khác và nút "Tạo Workspace Mới".

### B. `WorkspaceSettingsFormComponent` [DUMB]
- **Mô tả:** Form cho phép chỉnh sửa thông tin của Workspace hiện tại (Tên).
- **Box Style:**
  - `rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-6`
- **Typography:**
  - Tiêu đề section: `text-xl font-bold tracking-tight text-text-primary`
  - Label: `text-sm font-medium text-text-primary`
  - Input field: `w-full rounded-xl border border-border bg-app px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20`
- **Tương tác:**
  - **Focus Input:** Đổi viền sang Sunset Orange (`focus:border-primary`) và thêm vòng phát sáng mờ (`focus:ring-2 focus:ring-primary/20`).
  - **Submit Button:** `inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary px-4 py-2 text-sm font-semibold text-app shadow-primary transition hover:bg-primary-hover active:bg-primary-active`

### C. `MemberListComponent` [DUMB]
- **Mô tả:** Bảng hiển thị danh sách thành viên hiện tại trong Workspace cùng với vai trò và trạng thái hoạt động.
- **Box Style:**
  - Container bảng: `overflow-hidden rounded-2xl border border-border bg-surface`
  - Bảng chính: `w-full min-w-full text-left border-collapse`
- **Typography & Sub-components:**
  - **Table Header:** `bg-subtle text-text-muted text-[11px] uppercase tracking-wide px-4 py-3`
  - **Table Row:** `border-t border-border hover:bg-white/5 transition`
  - **Table Cell:** `px-4 py-3.5 text-sm`
  - **Avatar:** `h-8 w-8 rounded-full bg-border border border-border-strong`
  - **Badge Vai trò (Role Badge):**
    - Owner: `border-primary/30 bg-primary-soft text-primary`
    - Admin: `border-ai/30 bg-ai-soft text-ai`
    - Member: `border-info/30 bg-info/10 text-info`
    - Viewer: `border-border bg-subtle text-text-muted`
  - **Badge Trạng thái (Status Badge):**
    - Active (Hoạt động): `border-success/30 bg-success/10 text-success`
    - Suspended (Tạm dừng): `border-error/30 bg-error/10 text-error`
- **Tương tác:**
  - Nút thay đổi vai trò (Dropdown) và nút Xóa thành viên (`text-error hover:bg-error/10` cho nút nguy hiểm).

### D. `InviteMemberModalComponent` [DUMB]
- **Mô tả:** Hộp thoại popup để mời thành viên mới vào workspace qua email.
- **Box Style:**
  - Backdrop: `fixed inset-0 bg-app/80 backdrop-blur-md z-50 flex items-center justify-center p-4`
  - Modal Panel: `w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-elevated space-y-4`
- **Typography:**
  - Tiêu đề modal: `text-lg font-bold text-text-primary`
  - Description: `text-sm text-text-secondary`
- **Tương tác:**
  - Nhập email (Text Input) và chọn Role (Select dropdown).
  - Nút "Gửi Lời Mời" (Primary button) và nút "Hủy" (Secondary button).

---

## 3. Ràng buộc Màu sắc (Color Constraints)

Tuyệt đối tuân thủ bảng màu **Sunset Fire Dark Mode** quy định trong `.docs/DESIGN.md`:

- **Nền chính:** `bg-app` (`#140F0B`) làm nền cho toàn trang.
- **Nền phụ/Card/Bảng:** `bg-surface` (`#1F1711`) cho các component chính và `bg-subtle` (`#201712`) cho header bảng.
- **Đường viền:** `border-border` (`#3F2A1A`) làm viền mặc định, `border-border-strong` (`#5A3822`) cho các viền nổi bật, viền active.
- **Chữ chính:** `text-text-primary` (`#FFF7ED`) cho tiêu đề, `text-text-secondary` (`#FCD7AA`) cho nội dung thường, `text-text-muted` (`#DDB991`) cho text chú thích/metadata.
- **Màu nhấn (Brand Orange):**
  - Nút bấm/CTA: `bg-primary` (`#FB923C`), hover `bg-primary-hover` (`#F97316`), active `bg-primary-active` (`#EA580C`).
- **Màu AI (Purple):** `text-ai`/`bg-ai` (`#C084FC`) cho các phần liên quan tới Admin/AI config.
- **Màu Semantic:**
  - Thành viên Hoạt động: `text-success` (`#4ADE80`)
  - Thành viên Tạm dừng / Xóa: `text-error` (`#F87171`)
  - Lời mời Pending: `text-warning` (`#FBBF24`)

---

## 4. Dữ liệu Hiển thị Mẫu (Mock Data)

Dưới đây là các dữ liệu mẫu bằng tiếng Việt để điền vào UI trong quá trình phát triển và kiểm thử:

### A. Danh sách Workspace
```json
[
  {
    "id": "ws-1",
    "name": "Công ty TNHH FLAE Việt Nam"
  },
  {
    "id": "ws-2",
    "name": "Dự án Wavesales Core"
  }
]
```

### B. Danh sách Thành viên (Members)
```json
[
  {
    "user_uid": "user-owner-123",
    "email": "vinh.nguyen@flae.ai",
    "full_name": "Nguyễn Hiền Vinh",
    "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop",
    "role": "owner",
    "status": "active"
  },
  {
    "user_uid": "user-admin-456",
    "email": "lan.tran@flae.ai",
    "full_name": "Trần Thị Lan",
    "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
    "role": "admin",
    "status": "active"
  },
  {
    "user_uid": "user-member-789",
    "email": "khoa.pham@flae.ai",
    "full_name": "Phạm Đăng Khoa",
    "avatar_url": "",
    "role": "member",
    "status": "active"
  },
  {
    "user_uid": "user-viewer-101",
    "email": "minh.le@partner.com",
    "full_name": "Lê Quang Minh",
    "avatar_url": "",
    "role": "viewer",
    "status": "active"
  },
  {
    "user_uid": "user-suspended-202",
    "email": "cuong.hoang@flae.ai",
    "full_name": "Hoàng Hữu Cường",
    "avatar_url": "",
    "role": "member",
    "status": "suspended"
  }
]
```

### C. Danh sách Lời mời (Invitations)
```json
[
  {
    "id": "inv-1",
    "email": "tuan.anh@flae.ai",
    "role": "admin",
    "status": "pending",
    "expires_at": "2026-06-12T09:30:00Z"
  },
  {
    "id": "inv-2",
    "email": "director@client.com",
    "role": "viewer",
    "status": "pending",
    "expires_at": "2026-06-14T14:15:00Z"
  }
]
```
