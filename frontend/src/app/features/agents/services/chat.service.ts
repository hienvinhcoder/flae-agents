import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, take } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { WorkspaceStore } from '../../../core/stores/workspace.store';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private authService = inject(AuthService);
  private workspaceStore = inject(WorkspaceStore);

  /**
   * Kết nối tới SSE stream để nhận câu trả lời thời gian thực từ Agent.
   */
  connectStream(agentId: string, sessionId: string, message: string): Observable<any> {
    const firebaseUser = this.authService.getCurrentFirebaseUser();
    if (!firebaseUser) {
      throw new Error('Người dùng chưa đăng nhập');
    }

    return this.authService.getFirebaseToken(firebaseUser).pipe(
      take(1),
      switchMap(token => {
        return new Observable<any>(observer => {
          const workspaceId = this.workspaceStore.currentWorkspaceId();
          
          // Build URL cho EventSource kèm token và message dạng query params
          const url = `${environment.apiUrl}/workspaces/${workspaceId}/agents/${agentId}/sessions/${sessionId}/stream` +
                      `?message=${encodeURIComponent(message)}&token=${token}`;

          const eventSource = new EventSource(url);

          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              observer.next(data);

              if (data.type === 'done' || data.type === 'error') {
                eventSource.close();
                observer.complete();
              }
            } catch (err) {
              observer.error(err);
              eventSource.close();
            }
          };

          eventSource.onerror = (error) => {
            observer.error(error);
            eventSource.close();
          };

          // Dọn dẹp kết nối khi unsubscribe
          return () => {
            if (eventSource.readyState !== EventSource.CLOSED) {
              eventSource.close();
            }
          };
        });
      })
    );
  }
}
