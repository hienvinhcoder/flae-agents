# Hướng dẫn sử dụng Alembic trong FLAE Agents Backend

Alembic là một công cụ database migration nhẹ và linh hoạt, được thiết kế chuyên biệt để hoạt động cùng SQLAlchemy. Nó giúp bạn theo dõi, quản lý và áp dụng (hoặc hoàn tác) các thay đổi cấu trúc dữ liệu (Database Schema) một cách an toàn thông qua các file version control.

Tất cả các lệnh Alembic đều phải được chạy bên trong thư mục `backend/` thông qua `uv run` để đảm bảo môi trường ảo (virtual environment) được kích hoạt đúng chuẩn.

---

## Yêu cầu tiên quyết

Trước khi chạy bất kỳ lệnh Alembic nào, hãy đảm bảo rằng:
1. Bạn đang đứng ở thư mục `backend` trong terminal.
2. Container PostgreSQL đang được bật và hoạt động bình thường ở local (vd: qua `docker compose up -d postgres`).
3. Tệp `.env` trong thư mục `backend` của bạn đã được cấu hình biến môi trường `POSTGRES_URL` hợp lệ.

---

## 1. Tạo Migration mới (Autogenerate)

Mỗi khi bạn chỉnh sửa, thêm, hoặc xóa các cột/bảng trong các tệp model ở `app/models/`, bạn cần tạo một file migration mới để ghi nhận sự thay đổi này.

```bash
# Chạy ở thư mục backend/
uv run alembic revision --autogenerate -m "Mô tả ngắn gọn thay đổi của bạn"
```

**Ví dụ:**
```bash
uv run alembic revision --autogenerate -m "Add avatar_url to users table"
```

> [!NOTE]
> Lệnh này sẽ tự động so sánh trạng thái của các Model hiện tại (được import trong `Base.metadata`) với Database Schema thực tế để tự động sinh code migration lưu vào thư mục `migrations/versions/`. Bạn NÊN mở file vừa được sinh ra để kiểm tra lại tính chính xác trước khi apply.

---

## 2. Cập nhật Database (Upgrade)

Sau khi đã tạo file migration mới (hoặc pull code mới từ Git về mà đồng nghiệp của bạn đã tạo migration), bạn cần apply thay đổi đó vào Database thực tế:

```bash
# Cập nhật database lên phiên bản mới nhất
uv run alembic upgrade head
```

Hoặc để upgrade lên một version cụ thể (ID version lấy ở trong thư mục `versions/`):
```bash
uv run alembic upgrade <version_id>
```

---

## 3. Hoàn tác thay đổi (Downgrade)

Nếu bạn vừa lỡ upgrade database hoặc code migration có lỗi, bạn có thể quay ngược cấu trúc database trở lại phiên bản trước đó:

```bash
# Quay lại 1 bước
uv run alembic downgrade -1

# Hoặc quay lại 2 bước
uv run alembic downgrade -2
```

> [!WARNING]
> Downgrade có thể xóa dữ liệu nếu thao tác liên quan đến lệnh `DROP TABLE` hoặc `DROP COLUMN`. Hãy đặc biệt cẩn trọng trên môi trường production.

---

## 4. Xem lịch sử và trạng thái

Để xem danh sách tất cả các phiên bản migration đã được sinh ra:
```bash
uv run alembic history --verbose
```

Để xem database của bạn hiện đang ở phiên bản migration nào:
```bash
uv run alembic current
```

---

## Trouble-shooting thường gặp

1. **Lỗi `Connection Refused` hoặc `Multiple exceptions`**: 
   - DB chưa chạy. Hãy kiểm tra lại docker/database engine.
2. **Alembic không nhận diện được bảng mới thay đổi**:
   - Bạn cần đảm bảo Model của bạn đã được import trong file `migrations/env.py` hoặc `app/models/base.py` để SQLAlchemy `Base.metadata` có thể "nhìn thấy" cấu trúc của bảng.
3. **Lỗi khi Drop table bằng tay**:
   - Nếu bạn lỡ vào DB xóa bảng bằng tay thay vì dùng Alembic, trạng thái của file `alembic_version` trong DB sẽ bị lệch. Bạn sẽ cần xóa nội dung trong bảng `alembic_version` và setup lại, hoặc phục hồi bằng cách tạo lại bảng cho đúng trạng thái cũ.
4. **Lỗi `Multiple head revisions are present` (Conflict Version)**:
   - Thường xảy ra khi làm việc nhóm, 2 người cùng tạo migration mới từ cùng một base.
   - **Cách 1: Merge 2 heads lại (Khuyên dùng khi đã push code lên nhánh chung)**:
     ```bash
     uv run alembic merge heads -m "Merge multiple heads"
     uv run alembic upgrade head
     ```
   - **Cách 2: Rebase / Nối file bằng tay (Giúp lịch sử sạch, khi chưa push)**:
     - Gõ `uv run alembic heads` để xem 2 ID bị conflict.
     - Mở 1 trong 2 file migration bị conflict, tìm và sửa biến `down_revision = '<ID của file còn lại>'`.
     - Gõ `uv run alembic upgrade head`.

