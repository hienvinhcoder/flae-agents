# Error Handling

Backend cấu hình cơ chế bắt lỗi tập trung (Global Exception Handler) tại `main.py` để đảm bảo định dạng trả về luôn đồng nhất với Frontend.

## CustomException
Sử dụng `CustomException` để throw ra các lỗi logic của ứng dụng.

```python
from app.helpers.exception_handler import CustomException

# Raise một lỗi custom
raise CustomException(
    http_code=404,
    code="404",
    message="User không tồn tại hoặc đã bị xóa."
)
```

## Global Handlers
Hệ thống xử lý sẵn các trường hợp ngoại lệ chính và chuẩn hóa format trả về như `DataResponse` nhưng chứa thông tin lỗi:

1. **`CustomException`**: Xử lý `http_exception_handler`. Trả về `http_code` và body bao gồm `code`, `message`.
2. **`RequestValidationError`**: Bắt lỗi Pydantic Validation (422) từ FastAPI và mapping qua `validation_exception_handler`. Trả ra thông điệp chi tiết lý do payload không hợp lệ.
3. **`Exception`**: Bắt mọi ngoại lệ chưa bắt (500) qua `fastapi_error_handler`, ghi log lại bằng `logging` và trả về một Error JSON an toàn cho Client (không làm lộ stack trace trên Production).
