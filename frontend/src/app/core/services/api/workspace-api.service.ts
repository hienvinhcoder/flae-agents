import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, from, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth.model';
import { 
  Workspace, 
  CreateManualWorkspacePayload, 
  GetOauthUrlPayload, 
  GetOauthUrlResponse, 
  HandleOauthCallbackPayload 
} from '../../models/workspace.model';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceApiService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/workspaces`;

  private getHeaders(): Observable<HttpHeaders> {
    const user = this.authService.getCurrentFirebaseUser();
    if (!user) {
      throw new Error('User not logged in');
    }
    return from(user.getIdToken()).pipe(
      map(token => new HttpHeaders({
        Authorization: `Bearer ${token}`
      }))
    );
  }

  createManualWorkspace(payload: CreateManualWorkspacePayload): Observable<Workspace> {
    return this.getHeaders().pipe(
      switchMap(headers => 
        this.http.post<ApiResponse<Workspace>>(`${this.apiUrl}/manual`, payload, { headers })
      ),
      map(res => res.data as Workspace)
    );
  }

  getOauthUrl(payload: GetOauthUrlPayload): Observable<GetOauthUrlResponse> {
    return this.getHeaders().pipe(
      switchMap(headers => 
        this.http.post<ApiResponse<GetOauthUrlResponse>>(`${this.apiUrl}/oauth/url`, payload, { headers })
      ),
      map(res => res.data as GetOauthUrlResponse)
    );
  }

  handleOauthCallback(payload: HandleOauthCallbackPayload): Observable<Workspace> {
    return this.getHeaders().pipe(
      switchMap(headers => 
        this.http.post<ApiResponse<Workspace>>(`${this.apiUrl}/oauth/callback`, payload, { headers })
      ),
      map(res => res.data as Workspace)
    );
  }
}
