import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

/**
 * Skeleton cho dịch vụ WebSocket quản lý kết nối thời gian thực.
 * Chi tiết implementation sẽ được bổ sung sau.
 */
@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private wsUrl = environment.wsUrl;

  connect() {
    // TODO: Khởi tạo kết nối RxJS webSocket
    console.log(`[WebsocketService] Dự kiến kết nối tới: ${this.wsUrl}`);
  }

  disconnect() {
    // TODO: Đóng kết nối
  }
}
