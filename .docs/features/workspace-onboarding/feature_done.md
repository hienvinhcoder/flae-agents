# Cầu nối bộ nhớ: Refactor Workspace Model (RBAC)

## Ngày cập nhật
2026-05-07

## Tóm tắt thay đổi
- Đã thực hiện refactor kiến trúc dữ liệu phân quyền (RBAC) cho Workspace. Loại bỏ collection mapping `UserWorkspace` dư thừa và chuyển sang sử dụng embedded dictionary trực tiếp bên trong model `Workspace`.
- Việc lưu trữ dạng `admins: { [uid]: true }` và `members: { [uid]: true }` giúp Frontend và Backend có thể thực hiện filter query trực tiếp trên collection `workspaces` thông qua object properties (Firestore map querying), tối ưu hóa số lượng document reads và giảm độ trễ.

## File bị ảnh hưởng (Thực tế)
- **Backend:** 
  - `backend/app/models/workspace.py`: Xóa class `UserWorkspace`, bổ sung `admins: Dict[str, bool] = {}` và `members: Dict[str, bool] = {}` vào `Workspace`.
  - `backend/app/services/workspace_srv.py`: Cập nhật logic trong `create_manual_workspace` và `handle_oauth_callback`. Loại bỏ lệnh gọi lưu `UserWorkspace`, thay vào đó gán trực tiếp người tạo vào dictionary `admins`.
- **Frontend:**
  - `frontend/src/app/core/models/workspace.model.ts`: Thêm tùy chọn `admins?: Record<string, boolean>` và `members?: Record<string, boolean>` vào interface `Workspace`.
- **Tài liệu (Context):**
  - `docs/features/workspace-onboarding/BACKEND_PLAN.md`: Cập nhật thiết kế Database (Open Questions & Schema).
  - `docs/features/workspace-onboarding/API_CONTRACT.md`: Cập nhật response interface cho Frontend.

## Tài nguyên dùng chung bị thay đổi (Cần chú ý lan truyền)
1. **[XÓA] Backend Model:** `UserWorkspace` không còn tồn tại. Bất kỳ query nào lấy danh sách workspace dựa trên `user_workspaces` collection trong tương lai đều sẽ thất bại.
2. **[SỬA] Cấu trúc truy vấn:** Thay vì query `user_workspaces` where `user_uid == uid`, các tính năng sau này phải query `workspaces` where `admins.uid == true` hoặc `owner_uid == uid`.

## Ảnh hưởng lan truyền (Cascade Updates)
- Đã quét bằng `grep_search`. Hiện tại chưa có feature nào khác (như Authentication) query trực tiếp vào bảng `user_workspaces` nên không có ảnh hưởng phá vỡ (breaking changes) đối với các tính năng cũ.

---

# Cầu nối bộ nhớ: Bổ sung Current Workspace ID & Refactor Service

## Ngày cập nhật
2026-05-07

## Tóm tắt thay đổi
- Đã bổ sung trường `current_workspace_id` vào `User` model để ghi nhận workspace người dùng đang truy cập hiện tại.
- Refactor `WorkspaceService` thêm hàm tĩnh dùng chung `update_current_workspace(user_uid, workspace_id)` và tự động gọi hàm này để cập nhật thông tin vào User document ngay sau khi tạo mới Workspace thành công.

## File bị ảnh hưởng (Thực tế)
- **Backend:**
  - `backend/app/models/user.py`: Thêm thuộc tính `current_workspace_id: Optional[str] = None`.
  - `backend/app/services/workspace_srv.py`: Thêm hàm tĩnh `update_current_workspace`. Sửa `create_manual_workspace` và `handle_oauth_callback` để gọi hàm này.

## Tài nguyên dùng chung bị thay đổi (Cần chú ý lan truyền)
1. **[SỬA] Backend Model:** Thêm trường `current_workspace_id` cho model `User`. Thay đổi này là Optional/tương thích ngược nên không làm vỡ các module fetch user hiện tại.
2. **[THÊM] Backend Service:** Cung cấp hàm `WorkspaceService.update_current_workspace`. Hàm này sử dụng `User.get_by_doc_id` để lấy và cập nhật thông tin user. Các tính năng sắp tới về đổi Workspace có thể tái sử dụng trực tiếp hàm này.

## Ảnh hưởng lan truyền (Cascade Updates)
- Việc thêm trường Optional vào `User` model không làm ảnh hưởng hay phá vỡ Pydantic validation cũ. Đã kiểm tra lại qua hệ thống tìm kiếm nội dung file `grep_search`, các tính năng hiện tại về xác thực và auth sync không bị gián đoạn.
