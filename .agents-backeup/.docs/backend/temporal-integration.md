# ⏳ Tích Hợp Temporal (Durable Execution Orchestration)

Tài liệu này mô tả chi tiết kiến trúc tích hợp Temporal trên Backend của FLAE Agents, phục vụ việc vận hành và quản lý các long-running tasks/workflows một cách an toàn và bền bỉ.

---

## 1. Kiến Trúc Tổng Quan
Temporal cung cấp cơ chế thực thi bền bỉ (durable execution). Backend của FLAE Agents sử dụng Temporal Python SDK để giao tiếp với Temporal Server. Hệ thống được chia thành hai phần chính:
- **Temporal Client**: Được tích hợp trực tiếp trong ứng dụng FastAPI để kích hoạt, truy vấn hoặc kiểm soát các workflows thông qua REST API endpoints.
- **Temporal Worker**: Là một process độc lập (`flae-worker`) chạy nền để thực thi mã nguồn của các workflows và activities.

```text
                           ┌─────────────────┐
                           │ Temporal Server │
                           └────────┬────────┘
                                    ▲
                   (Task Queue)     │     (Trigger Workflow)
             ┌──────────────────────┴──────────────────────┐
             │                                             │
    ┌────────┴────────┐                           ┌────────┴────────┐
    │ Temporal Worker │                           │ Temporal Client │
    │  (flae-worker)  │                           │(FastAPI Backend)│
    └────────┬────────┘                           └────────┬────────┘
             │                                             │
             ▼                                             ▼
    ┌─────────────────┐                           ┌─────────────────┐
    │ Workflows &     │                           │  REST API       │
    │ Activities      │                           │  Endpoints      │
    └─────────────────┘                           └─────────────────┘
```

---

## 2. Các Thành Phần Chi Tiết

### A. Temporal Client Config (`backend/app/core/temporal.py`)
Nằm tại [temporal.py](../../backend/app/core/temporal.py), client được thiết kế dưới dạng **Singleton** thông qua hàm `get_temporal_client()`.
Đặc biệt, do Temporal Server chạy trong Docker có thể khởi động chậm hơn FastAPI backend, chúng ta áp dụng cơ chế tự động thử lại kết nối bằng thư viện `tenacity`:
```python
@retry(
    stop=stop_after_attempt(12),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    reraise=True,
    before_sleep=lambda retry_state: logger.warning(...)
)
async def _connect_client() -> Client:
    return await Client.connect(
        settings.TEMPORAL_HOST,
        namespace=settings.TEMPORAL_NAMESPACE,
    )
```

### B. Định Nghĩa Workflows & Activities
Được thiết lập trong thư mục `backend/app/temporal/`:

1. **Activities** (`app/temporal/activities/`):
   - Chứa logic xử lý I/O hoặc CPU-intensive thực tế.
   - Ví dụ mẫu: [greet.py](../../backend/app/temporal/activities/greet.py).
   - Đánh dấu bằng decorator `@activity.defn`.
   - Các activity có thể là đồng bộ hoặc bất đồng bộ.

2. **Workflows** (`app/temporal/workflows/`):
   - Định nghĩa luồng phối hợp (orchestration logic). Chỉ được dùng các hàm deterministic.
   - Ví dụ mẫu: [greeting.py](../../backend/app/temporal/workflows/greeting.py).
   - Đánh dấu bằng decorator `@workflow.defn` và phương thức chính được bọc bằng `@workflow.run`.
   - **Quy tắc an toàn import**: Đối với các import modules nằm ngoài workflow sandbox (như import activities), bắt buộc bọc trong block `unsafe.imports_passed_through()`:
     ```python
     with workflow.unsafe.imports_passed_through():
         from app.temporal.activities.greet import greet
     ```

### C. Background Worker (`backend/workers/flae_worker.py`)
Nằm tại [flae_worker.py](../../backend/workers/flae_worker.py). Đây là entry point của worker chạy nền lắng nghe queue `flae-default-queue`.
- Worker tự động đăng ký danh sách các Workflows và Activities được hỗ trợ.
- Sử dụng `ThreadPoolExecutor` để chạy các synchronous activities nhằm tránh block event loop:
  ```python
  with concurrent.futures.ThreadPoolExecutor(max_workers=100) as activity_executor:
      worker = Worker(
          client,
          task_queue="flae-default-queue",
          workflows=[GreetingWorkflow],
          activities=[greet],
          activity_executor=activity_executor,
      )
      await worker.run()
  ```

---

## 3. Quy Chuẩn Phát Triển & Vận Hành (Best Practices)
1. **Durable Execution & Determinism**: Logic bên trong `@workflow.run` tuyệt đối không được gọi trực tiếp I/O, database, sinh số ngẫu nhiên, hoặc lấy thời gian hệ thống thực tế. Mọi tác vụ có side-effect phải được thực thi bên trong một **Activity**.
2. **Quản Lý Phiên Bản Workflows**: Khi cập nhật workflow logic đã đang chạy trên production, phải dùng API versioning của Temporal để tránh lỗi không đồng nhất lịch sử thực thi (non-determinism errors).
3. **Task Queue**: Tất cả workflows mặc định sử dụng hàng đợi `flae-default-queue`. Tránh tạo quá nhiều hàng đợi không cần thiết.
4. **Dev Command**:
   - Chạy worker local: `cd backend && uv run flae-worker` (hoặc cấu hình lệnh chạy qua file scripts).
