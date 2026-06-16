# Frontend Plan: Workspace & Organization Management

Tài liệu thiết kế kiến trúc Frontend (Angular 20) cho tính năng quản lý Workspace và Thành viên (Organization) sử dụng Standalone Components và Angular Signals.

---

## 1. Phân rã Component Tree

Các component liên quan đến tính năng này được thiết kế và đặt tại cấu trúc thư mục như sau:

```text
frontend/src/app/
├── core/
│   └── interceptors/
│       └── workspace.interceptor.ts [Shared Utility] - Đính kèm X-Workspace-ID vào API headers
├── shared/
│   └── ui/
│       ├── workspace-selector/
│       │   ├── workspace-selector.component.ts [DUMB] [Shared UI] - Dropdown chuyển đổi workspace
│       │   └── workspace-selector.component.html
│       └── modal/
│           └── dialog.component.ts [DUMB] [Shared UI] - Modal khung dùng chung toàn hệ thống
└── features/
    └── dashboard/
        └── pages/
            └── settings/
                ├── settings.component.ts [SMART] - Layout chính của trang Settings (chứa các Tab)
                ├── settings.component.html
                ├── tabs/
                │   ├── workspace-general/
                │   │   ├── workspace-general.component.ts [SMART] - Quản lý cấu hình chung Workspace
                │   │   ├── workspace-general.component.html
                │   │   └── components/
                │   │       ├── workspace-form.component.ts [DUMB] - Form chỉnh sửa thông tin Workspace
                │   │       └── workspace-form.component.html
                │   └── workspace-members/
                │       ├── workspace-members.component.ts [SMART] - Quản lý danh sách thành viên & lời mời
                │       ├── workspace-members.component.html
                │       └── components/
                │           ├── member-list.component.ts [DUMB] - Bảng hiển thị danh sách thành viên
                │           ├── member-list.component.html
                │           ├── invitation-list.component.ts [DUMB] - Bảng hiển thị danh sách lời mời pending
                │           ├── invitation-list.component.html
                │           ├── invite-modal.component.ts [DUMB] - Hộp thoại mời thành viên
                │           └── invite-modal.component.html
                └── invite-accept/
                    ├── invite-accept.component.ts [SMART] - Trang xử lý chấp nhận lời mời (/invite?token=xxx)
                    └── invite-accept.component.html
```

### Chi tiết phân loại:
- **`WorkspaceSelectorComponent` [DUMB] [Shared UI]**: Tái sử dụng ở thanh Side Navigation hoặc Top Header để người dùng chuyển đổi qua lại nhanh chóng giữa các Workspace.
- **`WorkspaceGeneralComponent` [SMART]**: Gọi service lấy thông tin chi tiết Workspace hiện tại, truyền dữ liệu xuống Form Component, và handle sự kiện lưu để gọi API cập nhật.
- **`WorkspaceMembersComponent` [SMART]**: Gọi API lấy danh sách thành viên & danh sách lời mời. Handle các action: mời thành viên, cập nhật vai trò, đình chỉ/xóa thành viên, thu hồi lời mời.
- **`InviteAcceptComponent` [SMART]**: Nhận token từ URL Query Parameter, kiểm tra tính hợp lệ, gọi API chấp nhận lời mời, chuyển hướng người dùng vào workspace mới.

---

## 2. Chiến lược Quản lý Trạng thái (State Management)

### A. Angular Signals cho State cục bộ và chia sẻ
Hệ thống sử dụng một service toàn cục `WorkspaceStoreService` đặt tại `core/services/workspace-store.service.ts` để quản lý Workspace hiện tại đang được chọn:

- **State lưu trữ:**
  - `currentWorkspace = signal<Workspace | null>(null)`
  - `workspaces = signal<Workspace[]>([])`
  - `isLoading = signal<boolean>(false)`
- **Derived State (Computed Signals):**
  - `currentWorkspaceId = computed(() => this.currentWorkspace()?.id || null)`
  - `currentUserRole = computed(() => { ... })` - Xác định vai trò của user hiện tại trong Workspace đang chọn để bật/tắt các tính năng UI (RBAC).

### B. URL Query Parameters
- Khi người dùng click link mời từ email dạng `https://flae.ai/invite?token=abc_xyz_123`, route `invite` sẽ match với `InviteAcceptComponent`.
- `InviteAcceptComponent` sẽ đọc `token` qua `ActivatedRoute` query parameters: `this.route.snapshot.queryParamMap.get('token')` để gửi lên backend.

### C. Workspace HTTP Interceptor (`WorkspaceInterceptor`)
- Một Angular functional interceptor sẽ tự động chèn header `X-Workspace-ID` vào mọi HTTP request gửi đi.
- **Luồng hoạt động:**
  1. Lấy `workspaceId` hiện tại từ `WorkspaceStoreService`.
  2. Nếu có `workspaceId` và URL request thuộc API backend của dự án (trừ API `/auth/sync-user` và `/workspaces/invitations/accept` vì các endpoint này không cần context workspace hiện tại), chèn header:
     `headers: req.headers.set('X-Workspace-ID', workspaceId)`
  3. Chuyển tiếp request.

---

## 3. Cấu trúc Dữ liệu & Interfaces (TypeScript)

Mã nguồn frontend sử dụng các kiểu dữ liệu khai báo nghiêm ngặt (Strict Typing), tuyệt đối cấm sử dụng `any`.

```typescript
// core/models/workspace.model.ts

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type WorkspaceMemberStatus = 'active' | 'suspended';
export type WorkspaceInvitationStatus = 'pending' | 'accepted' | 'expired';

export interface Workspace {
  id: string;
  name: string;
  owner_uid: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_uid: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  created_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  invited_by: string;
  invited_by_name: string;
  status: WorkspaceInvitationStatus;
  expires_at: string;
  created_at: string;
}
```

### Đặc tả Input/Output của các Dumb Component chính

#### 1. `WorkspaceSelectorComponent`
```typescript
@Component({
  selector: 'app-workspace-selector',
  standalone: true,
  ...
})
export class WorkspaceSelectorComponent {
  // Inputs
  workspaces = input.required<Workspace[]>();
  currentWorkspace = input<Workspace | null>(null);
  isLoading = input<boolean>(false);

  // Outputs
  workspaceSelected = output<string>(); // Phát ra workspace_id khi người dùng đổi
  createWorkspaceRequested = output<void>(); // Phát khi click "Tạo Workspace Mới"
}
```

#### 2. `MemberListComponent`
```typescript
@Component({
  selector: 'app-member-list',
  standalone: true,
  ...
})
export class MemberListComponent {
  // Inputs
  members = input.required<WorkspaceMember[]>();
  currentUserRole = input.required<WorkspaceRole>(); // Dùng để ẩn/hiển các nút thao tác
  currentUserUid = input.required<string>(); // Không cho phép tự xóa/tự đổi quyền bản thân
  isLoading = input<boolean>(false);

  // Outputs
  roleChanged = output<{ userUid: string; newRole: WorkspaceRole }>();
  statusChanged = output<{ userUid: string; newStatus: WorkspaceMemberStatus }>();
  memberRemoved = output<string>(); // Phát ra userUid cần xóa
}
```

#### 3. `InviteModalComponent`
```typescript
@Component({
  selector: 'app-invite-modal',
  standalone: true,
  ...
})
export class InviteModalComponent {
  // Inputs
  isOpen = input.required<boolean>();
  isSubmitting = input<boolean>(false);

  // Outputs
  close = output<void>();
  invited = output<{ email: string; role: WorkspaceRole }>();
}
```
