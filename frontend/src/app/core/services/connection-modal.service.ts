import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectionModalService {
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);
  private readonly translateService = inject(TranslateService);

  // Trạng thái modal mất kết nối
  readonly isServerDown = signal<boolean>(false);
  // Trạng thái đang kiểm tra kết nối lại
  readonly isChecking = signal<boolean>(false);

  /**
   * Hiển thị modal mất kết nối
   */
  show(): void {
    this.isServerDown.set(true);
  }

  /**
   * Ẩn modal mất kết nối
   */
  hide(): void {
    this.isServerDown.set(false);
  }

  /**
   * Thực hiện kết nối lại tới backend bằng cách ping API /health
   */
  async retryConnection(): Promise<boolean> {
    if (this.isChecking()) return false;

    this.isChecking.set(true);
    try {
      // Thực hiện ping API /health
      await firstValueFrom(this.http.get<{ status: string }>(`${environment.apiUrl}/health`));
      
      // Thành công -> ẩn modal và tắt trạng thái kiểm tra
      this.isServerDown.set(false);
      this.isChecking.set(false);
      return true;
    } catch (error) {
      // Thất bại -> hiển thị Toast cảnh báo thất bại ngắn
      this.isChecking.set(false);
      
      const title = this.translateService.instant('HTTP_ERROR.CONNECTION_FAILED_TITLE') || 'Lỗi kết nối';
      const message = this.translateService.instant('CONNECTION_MODAL.FAILED_TOAST') || 'Kết nối tới server vẫn thất bại. Vui lòng thử lại sau ít phút.';
      this.toastService.error(message, title);
      
      return false;
    }
  }
}
