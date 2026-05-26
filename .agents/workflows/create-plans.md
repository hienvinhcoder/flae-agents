---
name: create-plans
description: Tự động phân rã file Idea thành 3 bản vẽ kiến trúc chi tiết (Design, Frontend, Backend).
triggers:
  - "/create-plans"
---

# 🎯 NHIỆM VỤ CỐT LÕI (TECHNICAL PROJECT MANAGER)
Hệ thống vừa nhận được yêu cầu quy hoạch kiến trúc cho tính năng: **$ARGUMENTS**
Nhiệm vụ của bạn là đọc ý tưởng thô và tự động phân rã thành 3 bản vẽ kỹ thuật chuyên sâu. Tuyệt đối KHÔNG viết mã nguồn (source code) ở bước này.

## 📥 1. NẠP NGUỒN CHÂN LÝ VÀ HIẾN PHÁP (INPUTS)
1. **Idea Gốc:** Đọc file `.docs/features/[feature_name]/IDEAS.md`. Nếu file này không tồn tại, DỪNG LẠI NGAY và báo lỗi: *"Không tìm thấy file ý tưởng `.docs/features/[feature_name]/IDEAS.md`."*
2. **Hiến pháp Hệ thống:** Đọc file `AGENTS.md`.
3. **Bối cảnh Dự án (Project Context):** BẮT BUỘC đọc các file tài liệu kiến trúc hiện tại của dự án để đảm bảo bản vẽ thiết kế bám sát kiến trúc tổng thể:
   - **Backend:** Đọc `docs/backend/index.md` và các file cấu trúc liên quan.
   - **Frontend:** Đọc `docs/frontend/index.md` và các file cấu trúc liên quan.
4. **Tiêu chuẩn Thi công:** Đọc lướt qua các file trong `.agents/skills/` để hiểu định dạng code mà thợ thi công yêu cầu.
5. **Design System:** BẮT BUỘC đọc file `.docs/DESIGN.md` để biết các quy chuẩn về UI/UX, Design System, màu sắc, font chữ trước khi tạo Design Brief.

## 🖨️ 2. QUY TRÌNH GHI FILE TỰ ĐỘNG (OUTPUTS)
Dựa vào nguồn dữ liệu trên, BẮT BUỘC tạo và lưu nội dung vào 3 file vật lý dưới đây. KHÔNG in toàn bộ nội dung file ra khung chat.

- 📄 **Design Brief:** Tạo file `.docs/features/[feature_name]/DESIGN-BRIEF.md` (Mô tả Layout, Component Tree, Tailwind Vibe). **BẮT BUỘC** kế thừa chính xác mã màu (Primary, Secondary, CTA...), Font chữ (Typography), tuyệt đối tuân thủ các quy tắc cấm (Anti-patterns) được quy định trong `.docs/DESIGN.md` và thực hiện các công việc sau:
+ **HỆ THỐNG LƯỚI & BỐ CỤC (LAYOUT SYSTEM)**
  + Xác định rõ cấu trúc Root (Ví dụ: `max-w-7xl mx-auto`, `min-h-screen`).
  + Xác định rõ Grid/Flexbox cho các Section chính (Ví dụ: Desktop chia 3 cột `grid-cols-3`, Mobile `flex-col`).
  + Quy định khoảng cách (Spacing) chuẩn bằng class Tailwind (VD: `gap-8`, `px-4`, `py-12`).

+ **ĐẶC TẢ COMPONENT (COMPONENT SPECS):**
  + CHỈ liệt kê các Component được đánh nhãn `[DUMB]` trong file Kế hoạch.
+ Ứng với mỗi Dumb Component, hãy quy định rõ:
  + Box Style: Bo góc (`rounded-xl`), Bóng đổ (`shadow-sm`, `shadow-lg`), Viền (`border`).
  + Typography: Kích thước và độ đậm font chữ (VD: `text-2xl font-bold tracking-tight`).
  + Trạng thái tương tác (Hover/Active/Disabled): VD: `hover:-translate-y-1 hover:shadow-md transition-all`.

+ **RÀNG BUỘC MÀU SẮC (COLOR CONSTRAINTS):**
  + Dịch các màu sắc trong file Ý Tưởng sang các class của Tailwind CSS (VD: Đỏ là `bg-red-500`, Xanh neon là `text-cyan-400`).
  + TUYỆT ĐỐI KHÔNG sử dụng mã màu HEX hoặc RGB tự chế trừ khi có yêu cầu đặc biệt.

+ **MOCK DATA (DỮ LIỆU HIỂN THỊ):**
  + Cung cấp sẵn văn bản/số liệu mẫu (Placeholder data) bằng tiếng Việt để thợ vẽ điền vào UI cho thực tế (VD: Tên khóa học mẫu, Giá tiền mẫu, Hình ảnh placeholder).


- 📄 **Frontend Plan:** Tạo file `.docs/features/[feature_name]/FRONTEND-PLAN.md` và thực hiện các công việc sau:
+ Phân rã giao diện thành các khối Component nhỏ theo dạng cây thư mục (Cha - Con) sử dụng Standalone Components.
+ BẮT BUỘC gắn nhãn phân loại cho từng Component:
  + `[SMART]`: Nếu nó là Container chứa logic, gọi API, quản lý State phức tạp hoặc tương tác trực tiếp với Services.
  + `[DUMB]`: Nếu nó là Presentational Component (chỉ nhận data qua `@Input()` và phát sự kiện qua `@Output()`), tuyệt đối không chứa logic gọi data hay tương tác trực tiếp với API/Services.
+ Ghi chú rõ Component nào có tiềm năng là "Shared UI" (Dùng chung cho toàn dự án).

+ Quản lý trạng thái:
  + Liệt kê các State (Trạng thái) cần thiết để tính năng này hoạt động (VD: IsLoading, CartItems, SearchQuery...).
  + Đề xuất chiến lược quản lý trạng thái bằng Angular Signals (cục bộ/reactive) hoặc RxJS / Services (chia sẻ trạng thái giữa các component), và quyết định State nào nên đẩy lên URL Query Parameters (để dễ share link).

+ Cấu trúc dữ liệu:
  + Viết mã giả TypeScript (`interface` hoặc `type`) định nghĩa cấu trúc `@Input()` và `@Output()` cho các Dumb Component quan trọng nhất.
  + CẤM sử dụng kiểu `any`.


- 📄 **Backend Plan:** Tạo file `.docs/features/[feature_name]/BACKEND-PLAN.md` (BẮT BUỘC đọc file skill `.agents/skills/plan-backend/SKILL.md` để hiểu rõ quy chuẩn xây dựng Backend Plan). Bản vẽ Backend phải đảm bảo tuân thủ các nguyên tắc:
+ Phân tích xem API có cần sử dụng Redis Cache để giảm tải cho Database hay không.
+ Thiết kế WebSockets API kết hợp Redis Pub/Sub nếu tính năng yêu cầu cập nhật Realtime (ví dụ: tiến độ xử lý lead, trạng thái agent).
+ Định nghĩa rõ cơ chế Authorization của từng API (sử dụng `Depends(verify_token)`, `Depends(get_current_user_uid)` hoặc `Depends(get_current_user)` từ `app/core/security.py`).

## ⚖️ 3. QUY TẮC RÀ SOÁT CHÉO
- Cấu trúc JSON trả về ở `Backend Plan` PHẢI KHỚP 100% với dữ liệu mà `Frontend Plan` cần để render.

## ✅ 4. NGHIỆM THU
In ra bảng thông báo:
*"✅ Đã rải xong 3 bản vẽ thiết kế cho feature \`$ARGUMENTS\`. Nội dung đã được lưu tại \`.docs/features/[feature_name]/\`."*