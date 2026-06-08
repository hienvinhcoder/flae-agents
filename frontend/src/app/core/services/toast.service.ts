import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // Sử dụng Angular Signal để quản lý danh sách toasts, đảm bảo tối ưu hiệu năng và reactivity
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();

  /**
   * Hiển thị một thông báo Toast mới
   * @param toast Nội dung của Toast không bao gồm ID
   */
  show(toast: Omit<ToastMessage, 'id'>): string {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration !== undefined ? toast.duration : 5000;
    const newToast: ToastMessage = { ...toast, id, duration };

    // Thêm toast mới vào danh sách
    this.toastsSignal.update((current) => [...current, newToast]);

    // Nếu duration > 0, thiết lập tự động xoá toast sau khoảng thời gian đó
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  /**
   * Hiển thị Toast Success
   */
  success(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'success', message, title, duration });
  }

  /**
   * Hiển thị Toast Error
   */
  error(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'error', message, title, duration });
  }

  /**
   * Hiển thị Toast Warning
   */
  warning(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'warning', message, title, duration });
  }

  /**
   * Hiển thị Toast Info
   */
  info(message: string, title?: string, duration?: number): string {
    return this.show({ type: 'info', message, title, duration });
  }

  /**
   * Xóa một Toast cụ thể khỏi danh sách theo ID
   */
  remove(id: string): void {
    this.toastsSignal.update((current) => current.filter((t) => t.id !== id));
  }

  /**
   * Xóa toàn bộ Toast hiện có
   */
  clear(): void {
    this.toastsSignal.set([]);
  }
}
