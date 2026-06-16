import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { ApiResponse, SyncUserPayload, User } from '../../models/auth.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  /**
   * Sync user data từ Firebase Auth vào Database.
   * Backend trả về DataResponse[UserItemResponse], ta map lấy data.
   *
   * Lưu ý: Nếu `res.data` là `null` (response wrapper không có data,
   * thường là do backend error hoặc response không đúng shape), ta throw
   * lỗi để caller biết sync fail thay vì âm thầm trả về null.
   */
  syncUser(payload: SyncUserPayload, firebaseToken: string): Observable<User> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${firebaseToken}`
    });
    return this.http
      .post<ApiResponse<User>>(`${this.apiUrl}/sync-user`, payload, { headers })
      .pipe(
        map((res) => {
          if (!res.data) {
            // Backend trả wrapper không có data — coi như sync fail
            // để AuthInitializer biết và retry hoặc log rõ ràng.
            throw new Error(
              `Sync user failed: response has no data (code=${res.code}, message=${res.message})`
            );
          }
          return res.data;
        })
      );
  }
}
