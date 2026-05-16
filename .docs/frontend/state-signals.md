# State Management với Angular Signals

Hệ thống sử dụng **Angular Signals** làm cơ chế quản lý state cốt lõi, thay thế hoàn toàn cho RxJS BehaviorSubject trong việc xử lý state của các UI components.

## 1. Nguyên tắc cơ bản
- **Reactive State**: Mọi state nội tại của component phải được định nghĩa bằng `signal()` hoặc `computed()`.
- **Luồng dữ liệu 1 chiều**: State được cập nhật thông qua `.set()` hoặc `.update()` và luân chuyển từ Smart Component xuống Dumb Component.
- **Tính phản ứng**: Sử dụng `effect()` cho các side effects (như gọi API khi state thay đổi, lưu localStorage, logging) thay vì bắt sự kiện thủ công.

## 2. Các Store Pattern
- Các state toàn cục (ví dụ như user session, current workspace) được tổ chức thành các Service/Store sử dụng Signal.
- Khuyến khích sử dụng Standalone Services với `providedIn: 'root'`.

## 3. Tích hợp RxJS (với Firebase/Router)
- Mặc dù sử dụng Signal cho UI state, các kết nối API tới Firebase (Firestore realtime listeners) hay Router events vẫn chủ yếu là RxJS Observables.
- Khi subscribe vào một RxJS Observable, bắt buộc phải quản lý vòng đời (unsubcribe khi destroy) để tránh memory leak.
- Cân nhắc sử dụng hàm `toSignal()` từ `@angular/core/rxjs-interop` để chuyển đổi tự nhiên luồng dữ liệu RxJS sang Signals giúp UI dễ render.
