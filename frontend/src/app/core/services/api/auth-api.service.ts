import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, SyncUserPayload, User } from '../../models/auth.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  /**
   * Sync user data từ Firebase Auth vào Firestore.
   * Backend trả về DataResponse[UserItemResponse], ta map lấy data.
   */
  syncUser(payload: SyncUserPayload, firebaseToken: string): Observable<User> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${firebaseToken}`
    });
    return this.http
      .post<ApiResponse<User>>(`${this.apiUrl}/sync-user`, payload, { headers })
      .pipe(map((res) => res.data as User));
  }
}
