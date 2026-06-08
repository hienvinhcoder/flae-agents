---

description: Dây chuyền tự động chuẩn bị tài liệu và điều phối thợ thi công UI tĩnh dựa trên Frontend Plan và Design Brief.
---

# ⚙️ WORKFLOW: ĐIỀU PHỐI THI CÔNG GIAO DIỆN

**Kích hoạt:** `/execute-ui [tên-tính-năng]`
**Hệ thống ghi nhận lệnh:** `$ARGUMENTS`

Bạn là **Quản lý Phân xưởng Frontend**.  
Nhiệm vụ của bạn là thu thập hồ sơ bản vẽ, đọc đúng tài liệu cần thiết và điều phối thợ chuyên trách thi công UI.

> TUYỆT ĐỐI KHÔNG tự tay viết mã nguồn ở bước này.  
> Việc triển khai mã nguồn phải được giao cho kỹ năng `code-ui`.

---

## 📥 1. GOM HỒ SƠ BẢN VẼ

BẮT BUỘC phân tích `$ARGUMENTS` để trích xuất `feature_name`.

Sau đó nạp vào bộ nhớ các tài liệu sau:

1. **Frontend Plan**  
   Đọc file:

   ```txt
   .docs/features/[feature_name]/FRONTEND-PLAN.md
````

2. **Design Brief**
   Đọc file:

   ```txt
   .docs/features/[feature_name]/DESIGN-BRIEF.md
   ```

Nếu thiếu một trong hai file trên, phải dừng quy trình và báo rõ file nào đang thiếu.

---

## 🎨 2. XÁC ĐỊNH HƯỚNG THIẾT KẾ UI

Dựa trên nội dung của:

* `FRONTEND-PLAN.md`
* `DESIGN-BRIEF.md`

Xác định các thông tin quan trọng sau trước khi bàn giao:

* Mục tiêu của tính năng
* Danh sách màn hình hoặc component cần thi công
* Layout chính
* Trạng thái UI cần có
* Dữ liệu mockup cần dùng
* Ràng buộc UX/UI
* Quy chuẩn style, design system hoặc component library nếu có

Thợ thi công BẮT BUỘC sử dụng kỹ năng `ui-ux-pro-max` kết hợp với `Design Brief` để tự thiết kế UI phù hợp.

---

## 🛠️ 3. GIAO VIỆC CHO THỢ THI CÔNG

Mở và đọc file kỹ năng:

```txt
.agents/skills/code-ui/SKILL.md
```

Sau đó chuyển giao toàn bộ dữ liệu đã thu thập cho kỹ năng `code-ui`.

Kèm theo các chỉ thị bắt buộc sau:

1. Triển khai UI tĩnh cho tính năng `[feature_name]`.
2. Tuân thủ đầy đủ `FRONTEND-PLAN.md`.
3. Bám sát định hướng giao diện trong `DESIGN-BRIEF.md`.
4. Sử dụng kỹ năng `ui-ux-pro-max` để hoàn thiện thiết kế UI nếu tài liệu chưa đủ chi tiết.
5. Tuân thủ quy tắc **Mockup Data** của `code-ui`.
6. Không tích hợp API thật ở bước này.
7. Không xử lý business logic phức tạp ngoài phạm vi UI tĩnh.
8. Chia nhỏ giao diện thành các component rõ ràng, dễ bảo trì.
9. Đặt tên file, component và folder theo convention hiện có của dự án.
10. Sau khi thi công xong, lưu mã nguồn vào đúng vị trí được quy định trong `FRONTEND-PLAN.md` hoặc `code-ui`.

---

## ✅ 4. NGHIỆM THU

Sau khi kỹ năng `code-ui` hoàn tất và lưu file, in báo cáo nghiệm thu theo mẫu:

```txt
✅ Đã thi công xong UI tĩnh cho tính năng [feature_name].

Đã sử dụng:
- FRONTEND-PLAN.md
- DESIGN-BRIEF.md
- Kỹ năng code-ui
- Kỹ năng ui-ux-pro-max

Vui lòng kiểm tra giao diện trên trình duyệt!
```

Nếu có lỗi hoặc thiếu thông tin, báo rõ:

```txt
⚠️ Chưa thể hoàn tất thi công UI cho tính năng [feature_name].

Lý do:
- [Mô tả lỗi hoặc file bị thiếu]

Vui lòng bổ sung thông tin cần thiết rồi chạy lại lệnh.
```

````

Bản gọn hơn nếu bạn muốn dùng trực tiếp trong agent:

```md
---
description: Workflow tự động chuẩn bị tài liệu và điều phối thi công UI tĩnh dựa trên Frontend Plan và Design Brief.
---

# ⚙️ WORKFLOW: ĐIỀU PHỐI THI CÔNG GIAO DIỆN

**Kích hoạt:** `/execute-ui [tên-tính-năng]`  
**Input:** `$ARGUMENTS`

Bạn là **Quản lý Phân xưởng Frontend**.  
Nhiệm vụ của bạn là chuẩn bị hồ sơ và giao việc cho thợ thi công UI.  
TUYỆT ĐỐI KHÔNG tự viết mã nguồn trong workflow này.

## 1. Chuẩn bị hồ sơ

Phân tích `$ARGUMENTS` để lấy `feature_name`.

Bắt buộc đọc:

```txt
.docs/features/[feature_name]/FRONTEND-PLAN.md
.docs/features/[feature_name]/DESIGN-BRIEF.md
````

Nếu thiếu file, dừng lại và báo rõ file bị thiếu.

## 2. Đọc kỹ năng thi công

Đọc file:

```txt
.agents/skills/code-ui/SKILL.md
```

## 3. Giao việc cho `code-ui`

Chuyển toàn bộ nội dung từ `FRONTEND-PLAN.md` và `DESIGN-BRIEF.md` cho kỹ năng `code-ui`.

Chỉ thị bắt buộc:

* Thi công UI tĩnh cho tính năng `[feature_name]`.
* Bám sát Frontend Plan.
* Bám sát Design Brief.
* Sử dụng `ui-ux-pro-max` để hoàn thiện thiết kế UI nếu cần.
* Tuân thủ quy tắc Mockup Data của `code-ui`.
* Không gọi API thật.
* Không xử lý business logic ngoài phạm vi UI tĩnh.
* Chia nhỏ UI thành component rõ ràng.
* Lưu mã nguồn đúng vị trí theo quy định của dự án.

## 4. Nghiệm thu

Sau khi `code-ui` hoàn tất, in:

```txt
✅ Đã thi công xong UI tĩnh cho tính năng [feature_name].
Đã sử dụng FRONTEND-PLAN.md, DESIGN-BRIEF.md, code-ui và ui-ux-pro-max.
Vui lòng kiểm tra giao diện trên trình duyệt!
```

```

Bản đầu tiên phù hợp nếu bạn muốn agent làm việc chặt chẽ, có kiểm tra lỗi rõ ràng. Bản thứ hai phù hợp nếu bạn muốn prompt ngắn, dễ bảo trì.
```
