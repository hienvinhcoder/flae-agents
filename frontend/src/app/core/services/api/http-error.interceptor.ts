import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, EMPTY } from 'rxjs';
import { ToastService } from '../toast.service';
import { ConnectionModalService } from '../connection-modal.service';
import { TranslateService } from '@ngx-translate/core';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const connectionModalService = inject(ConnectionModalService);
  const translateService = inject(TranslateService);

  // Nếu đã xác định server down và request không phải check /health,
  // trả về EMPTY ngay lập tức để kết thúc request im lặng.
  // Điều này triệt tiêu hoàn toàn việc ném lỗi ra ngoài làm nghẽn console và làm nặng máy (Change Detection).
  if (connectionModalService.isServerDown() && !req.url.endsWith('/health')) {
    return EMPTY;
  }

  // BỎ QUA KIỂM TRA LỖI cho request ping kiểm tra trạng thái /health
  // Nếu không, chính request check connection này cũng kích hoạt interceptor gây lỗi vòng lặp
  if (req.url.endsWith('/health')) {
    return next(req);
  }

  const getTranslation = (key: string, fallback: string): string => {
    try {
      const translated = translateService.instant(key);
      return translated && translated !== key ? translated : fallback;
    } catch {
      return fallback;
    }
  };

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Trường hợp 1: Không thể kết nối tới Server (status = 0, ví dụ Connection Refused, CORS error do server tắt, hoặc mất internet)
      if (error.status === 0) {
        // Chỉ gọi show nếu trước đó chưa xác định server down để tránh trigger cập nhật signal liên tục
        if (!connectionModalService.isServerDown()) {
          connectionModalService.show();
        }
      } 
      // Trường hợp 2: Lỗi phía Server (status >= 500, ví dụ 500 Internal Server Error, 502 Bad Gateway, 504 Gateway Timeout)
      else if (error.status >= 500) {
        const title = getTranslation('HTTP_ERROR.SERVER_ERROR_TITLE', 'Lỗi máy chủ');
        const message = getTranslation('HTTP_ERROR.SERVER_ERROR_MESSAGE', 'Máy chủ gặp sự cố trong quá trình xử lý. Vui lòng thử lại sau.');
        toastService.error(message, title);
      }
      // Trường hợp 3: Lỗi Authentication (status = 401, token hết hạn hoặc không hợp lệ)
      else if (error.status === 401) {
        // Chỉ hiện toast khi không phải là route login/auth-sync
        if (!req.url.includes('/auth/sync')) {
          const title = getTranslation('HTTP_ERROR.UNAUTHORIZED_TITLE', 'Hết phiên làm việc');
          const message = getTranslation('HTTP_ERROR.UNAUTHORIZED_MESSAGE', 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.');
          toastService.warning(message, title);
        }
      }

      // Tiếp tục chuyển tiếp lỗi cho các service/component xử lý cục bộ
      return throwError(() => error);
    })
  );
};
