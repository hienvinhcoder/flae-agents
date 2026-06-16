---
description: Dây chuyền tự động thi công lõi hệ thống. Điều phối tuần tự các kỹ năng /code-db, /code-api và /integrate để hoàn thiện Full-stack.
---

# ⚙️ WORKFLOW: TỔNG THẦU THI CÔNG BACKEND & TÍCH HỢP

**Kích hoạt:** `/execute-backend [tên-tính-năng]`
**Hệ thống ghi nhận yêu cầu thi công lõi cho:** `$ARGUMENTS`

Bạn là Điều phối viên Backend (Backend Orchestrator). Nhiệm vụ của bạn là gom bản vẽ và điều phối 3 đội thợ chuyên trách (`code-db-sql`, `code-api`, `integrate`) làm việc theo một trình tự nghiêm ngặt.

**🔥 NGUYÊN TẮC SINH TỬ (ANTI-TRUNCATION):** Bạn tuyệt đối KHÔNG ĐƯỢC làm nhiều bước cùng một lúc. Sau khi gọi một đội thợ hoàn thành công việc của họ, **BẠN PHẢI DỪNG LẠI** và yêu cầu người dùng gõ chữ *"Tiếp tục"* rồi mới được phép chuyển sang bước tiếp theo.

---

## 📥 1. GOM HỒ SƠ BẢN VẼ (PREPARATION)
BẮT BUỘC đọc ngầm các file sau để nắm toàn bộ bức tranh kiến trúc:
1. **Backend Plan:** Đọc `.docs/features/[feature_name]/BACKEND-PLAN.md`
2. **Frontend Plan:** Đọc `.docs/features/[feature_name]/FRONTEND-PLAN.md` (Để đối chiếu cấu trúc JSON mà API cần trả về).
3. **Hiến pháp:** Đọc `ARCHITECTURE.md` để tuân thủ cách viết Database và Route API của dự án.

---

## 🗄️ BƯỚC 1: ĐIỀU PHỐI THI CÔNG DATABASE
1. **Đọc luật:** Mở file `.agents/skills/code-db-sql/SKILL.md`.
2. **Hành động:** Kích hoạt kỹ năng `code-db-sql` để viết/cập nhật các file model và Firestore Rules cần thiết dựa trên Backend Plan.
3. **Nghiệm thu Bước 1:** Sau khi ghi file, dừng lại và in ra thông báo:
> *"✅ [1/3] Đã hoàn thiện Database Schema và Firestore Rules. Chạy xong, hãy gõ **'Tiếp tục'** để tôi điều phối code API."*
4. **[DỪNG LẠI VÀ CHỜ LỆNH]**

---

## 🔌 BƯỚC 2: ĐIỀU PHỐI THI CÔNG API
*(Chỉ được phép chạy khi người dùng đã ra lệnh Tiếp tục)*
1. **Đọc luật:** Mở file `.agents/skills/code-api/SKILL.md`.
2. **Hành động:** Kích hoạt kỹ năng `code-api` để tạo các file code tương ứng với Backend Techstack chuẩn RESTful.
3. **Nghiệm thu Bước 2:** Sau khi ghi file, dừng lại và in ra thông báo:
> *"✅ [2/3] Đã xây xong đường ống API Endpoints. Hãy dùng Postman/ThunderClient test thử API nếu muốn, sau đó gõ **'Tiếp tục'** để chúng ta nối dây vào UI."*
4. **[DỪNG LẠI VÀ CHỜ LỆNH]**

---

## ⚡ BƯỚC 3: ĐIỀU PHỐI TÍCH HỢP (INTEGRATION)
*(Chỉ được phép chạy khi người dùng đã ra lệnh Tiếp tục)*
1. **Đọc luật:** Mở file `.agents/skills/integrate-api/SKILL.md`.
2. **Hành động:** Kích hoạt kỹ năng `integrate-api`. Quét các UI Components liên quan đến `$ARGUMENTS` đã dựng mockup để gỡ bỏ chúng. Sử dụng Angular Signals để fetch dữ liệu realtime từ Firestore (đối với hành động GET) và `HttpClient` để thao tác mutation qua Backend (đối với POST/PUT/DELETE). Bắt buộc xử lý kỹ state Loading/Error.
3. **Nghiệm thu Bước 3:** In ra thông báo:
> *"✅ [3/3] Đã tích hợp API và Firestore Realtime thành công. Tiến hành lưu bộ nhớ và cập nhật ngữ cảnh!"*

---

## 💾 BƯỚC 4: LƯU BỘ NHỚ VÀ CẬP NHẬT NGỮ CẢNH (POST-EXECUTION)
*(Chạy TỰ ĐỘNG ngay sau khi kết thúc Bước 3, không cần chờ)*
1. **Lưu trữ:** Kích hoạt kỹ năng `save-memory` để hệ thống tự động tổng hợp thay đổi và sinh ra file `feature_done.md` cho tính năng `$ARGUMENTS`, đồng thời cảnh báo các tính năng cũ bị ảnh hưởng nếu có sửa code dùng chung.
2. **Cập nhật:** Kích hoạt workflow `/update-project-context` để quét lại codebase và tự động cập nhật các file ngữ cảnh dự án.
3. **Nghiệm thu cuối cùng:** In ra thông báo chốt hạ:

> **🎉 HOÀN TẤT VÀ BÀN GIAO TOÀN DIỆN: `$ARGUMENTS`**
> 
> Dây chuyền Backend & Tích hợp đã vận hành xong 100%:
> - 🗄️ **Database:** Đã setup xong Model Firestore.
> - 🔌 **API:** Đã mở route giao tiếp Mutations.
> - ⚡ **UI:** Đã được bơm data thật, xử lý state bằng Signals.
> - 💾 **Context:** Đã tự động lưu lại tiến độ và kiến trúc mới.
> 
> **Kiểm tra:** Hãy ra trình duyệt test ngay luồng nghiệp vụ thực tế!