# Schema & Response Pattern

## Kế thừa Schema
Mọi schema **phải** kế thừa từ `ResponseSchemaBase`, không phải `pydantic.BaseModel` (để đồng nhất với các logic chung của hệ thống):
```python
from app.schemas.sche_base import ResponseSchemaBase

class XxxItemResponse(ResponseSchemaBase): ...  # ✅
class XxxRequest(ResponseSchemaBase): ...       # ✅
```

## DataResponse Wrapper
Mọi endpoint trả về dữ liệu phải bọc bằng generic class `DataResponse[T]`:
```python
from app.schemas.sche_base import DataResponse

# code=200, message="Success"
return DataResponse[UserItemResponse].success_response(data=UserItemResponse(...))

# Custom code & message
return DataResponse[UserItemResponse].custom_response(code="201", message="Created", data=...)
```

**Response shape**:
```json
{
  "code": "200",
  "message": "Success",
  "data": { ... }
}
```

## Naming Convention
- **Request Models**: `XxxRequest` (ví dụ: `UserCreateRequest`)
- **Response Items**: `XxxItemResponse` (ví dụ: `UserItemResponse`)
- **Response Lists**: `XxxListResponse`
