---
name: integrate-api
description: Kỹ năng tích hợp Frontend (Angular) với Backend (FastAPI/Firestore). Tự động gỡ bỏ Mockup Data, thay bằng fetch realtime (Firestore) và mutate (API).
triggers:
  - "/integrate-api"
  - "tích hợp"
  - "nối dây"
---

# NHIỆM VỤ: FULLSTACK INTEGRATOR

Khi nhận lệnh `/integrate-api [tên-tính-năng]`, bạn đóng vai trò là một Fullstack Integrator. Nhiệm vụ của bạn là kết nối phần UI đã dựng sẵn với Database (Firestore) và API (FastAPI) để hoàn thiện luồng nghiệp vụ thực tế.

BẮT BUỘC thực hiện tuần tự các bước sau một cách im lặng:

## 1. NẠP NGỮ CẢNH
1. **Frontend Architecture:** Đọc `ARCHITECTURE.md` và `docs/frontend/index.md` để nắm rõ quy chuẩn dự án (Angular, Signals, Standalone Components).
2. **Backend Architecture:** Đọc `docs/backend/index.md` để nắm chuẩn Response từ API.
3. **Plan:** Đọc `FRONTEND-PLAN.md` và `BACKEND-PLAN.md` của tính năng để biết cần map trường dữ liệu nào.

## 2. QUY TẮC TÍCH HỢP (ANGULAR)
- **Data Fetching (GET):** TUYỆT ĐỐI KHÔNG gọi API GET từ Backend. Bắt buộc sử dụng Firestore/Firebase Client SDK kết hợp với Angular Signals (hoặc `rxResource`) để lắng nghe và map dữ liệu realtime trực tiếp lên UI.
- **Mutations (POST, PUT, DELETE):** Sử dụng `HttpClient` của Angular (`inject(HttpClient)`) để gọi đến API endpoints của Backend. 
- **State Management:** Xử lý triệt để 3 trạng thái: Loading, Error, Success bằng Signals. Đảm bảo UI phản hồi tốt cho người dùng (ví dụ: Toast thông báo lỗi/thành công, Disable nút khi đang loading).
- **Dọn dẹp:** Tìm và xóa bỏ toàn bộ mockup data, dummy function tĩnh trên code Frontend.

## 3. THỰC THI LƯU FILE
- Khảo sát các Component và Service ở thư mục frontend.
- Cập nhật/Tạo Data Access Service (`[feature].service.ts`) xử lý gọi API & Firestore.
- Cập nhật UI Component (`[feature].component.ts`) dùng dữ liệu thật từ Service.
- TRỰC TIẾP LƯU FILE VẬT LÝ vào dự án.

## 4. BÁO CÁO KẾT QUẢ
- Hiển thị danh sách các file Frontend đã được tích hợp data thật kèm mô tả ngắn gọn thay đổi.
