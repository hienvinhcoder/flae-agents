---
name: code-ui
description: Chuyển đổi bản vẽ từ Stitch thành Code Angular, tuân thủ chặt chẽ Frontend Plan, ép buộc dùng Framework chuẩn (Angular + Tailwind CSS) và ưu tiên tái sử dụng Component.
triggers:
  - "/code-ui"
  - "code giao diện"
---

# NHIỆM VỤ: LẬP TRÌNH GIAO DIỆN (UI EXECUTION)

Khi nhận lệnh `/code-ui [Tên dự án] [Tên Màn Hình / Component]`, bạn đang đóng vai trò là một Frontend Developer thi công. Hãy BẮT BUỘC thực hiện tuần tự 4 bước sau một cách im lặng, chỉ báo cáo kết quả cuối cùng:

## BƯỚC 1: NẠP NGỮ CẢNH VÀ QUY HOẠCH
Trước khi làm bất cứ điều gì, bạn BẮT BUỘC phải đọc ngầm 2 file:
1. `.docs/DESIGN.md` (Để lấy biến màu Tailwind, font chữ, quy tắc bo góc).
2. Tương ứng file kế hoạch trong `.docs/features/[feature-name]/frontend-plans/` (Để biết cấu trúc Smart/Dumb Component và Interface Props).

## BƯỚC 2: QUÉT THƯ VIỆN & TÁI SỬ DỤNG (QUAN TRỌNG TỐI THƯỢNG)
- Quét thư mục `frontend/src/app/shared/ui/` (Thư viện UI dùng chung).
- Nếu bản vẽ của Stitch có chứa Nút bấm (Button), Input, Thẻ (Card)... BẠN PHẢI TÌM XEM component đó đã tồn tại chưa.
- **Luật thép:** Nếu ĐÃ CÓ, tuyệt đối không code lại, BẮT BUỘC phải import component đó vào để dùng. Chỉ tạo file mới cho những cấu trúc UI đặc thù chưa từng xuất hiện.

## BƯỚC 3: ĐỌC BẢN VẼ TỪ STITCH
- Kết nối với bản vẽ mà người dùng vừa cung cấp.
- Ánh xạ (Map) các thuộc tính đồ hoạ sang các class của **Tailwind CSS**. Không dùng CSS thuần hay mã HEX lạ.

## BƯỚC 4: SINH CODE VÀ ÉP KHUÔN FRAMEWORK
Tiến hành gõ code vào thư mục dự án theo các quy tắc của bản Kế hoạch, ĐỒNG THỜI tuân thủ tuyệt đối Đạo luật CODE Framework sau:

[RÀNG BUỘC FRAMEWORK: ANGULAR]
1. Kiến trúc: BẮT BUỘC sử dụng Standalone Components (từ Angular v14+). Không tạo file `.module.ts` dư thừa.
2. Reactivity: BẮT BUỘC sử dụng Signals (`signal`, `computed`, `effect`, `linkedSignal`) thay cho RxJS `BehaviorSubject` khi quản lý state cục bộ.
3. Giao tiếp Component: BẮT BUỘC dùng Signal-based Inputs (`input()`, `input.required()`) và Signal-based Outputs (`output()`) thay cho `@Input()` và `@Output()` decorator truyền thống.
4. Template: BẮT BUỘC dùng Control Flow mới (`@if`, `@for`, `@switch`) thay cho các directive cấu trúc cũ (`*ngIf`, `*ngFor`).
5. Tối ưu: Dùng chỉ thị `NgOptimizedImage` (`ngSrc`) để tối ưu hiệu suất tải ảnh, và sử dụng `RouterLink` chuẩn xác.
6. Forms: Ưu tiên sử dụng Signal Forms (nếu có, từ Angular v21+) hoặc Reactive Forms (`FormGroup`, `FormControl`). Không dùng Template-driven forms trừ khi biểu mẫu cực kỳ đơn giản.

## BÁO CÁO KẾT QUẢ
Sau khi code xong, in ra danh sách các file `.ts`, `.html` (nếu tách template) vừa tạo hoặc chỉnh sửa. Hỏi người dùng xem có cần điều chỉnh padding/margin nào không trước khi chạy lệnh `/save`.