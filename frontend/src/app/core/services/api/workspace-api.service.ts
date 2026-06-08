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
  HandleOauthCallbackPayload,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceRole,
  WorkspaceMemberStatus
} from '../../models/workspace.model';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceApiService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/workspaces`;
  private userApiUrl = `${environment.apiUrl}/users`;

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

  private getHeadersWithWorkspace(workspaceId: string): Observable<HttpHeaders> {
    return this.getHeaders().pipe(
      map(headers => headers.set('X-Workspace-ID', workspaceId))
    );
  }

  getWorkspaces(): Observable<Workspace[]> {
    return this.getHeaders().pipe(
      switchMap(headers => 
        this.http.get<ApiResponse<Workspace[]>>(`${this.apiUrl}`, { headers })
      ),
      map(res => res.data as Workspace[])
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

  updateWorkspace(workspaceId: string, payload: { name: string }): Observable<Workspace> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers => 
        this.http.put<ApiResponse<Workspace>>(`${this.apiUrl}/${workspaceId}`, payload, { headers })
      ),
      map(res => res.data as Workspace)
    );
  }

  getWorkspaceMembers(workspaceId: string): Observable<WorkspaceMember[]> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers => 
        this.http.get<ApiResponse<WorkspaceMember[]>>(`${this.apiUrl}/${workspaceId}/members`, { headers })
      ),
      map(res => res.data as WorkspaceMember[])
    );
  }

  getPendingInvitations(workspaceId: string): Observable<WorkspaceInvitation[]> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers => 
        this.http.get<ApiResponse<WorkspaceInvitation[]>>(`${this.apiUrl}/${workspaceId}/invitations`, { headers })
      ),
      map(res => res.data as WorkspaceInvitation[])
    );
  }

  inviteMember(workspaceId: string, payload: { email: string; role: WorkspaceRole }): Observable<WorkspaceInvitation> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers => 
        this.http.post<ApiResponse<WorkspaceInvitation>>(`${this.apiUrl}/${workspaceId}/invitations`, payload, { headers })
      ),
      map(res => res.data as WorkspaceInvitation)
    );
  }

  acceptInvitation(payload: { token: string }): Observable<Workspace> {
    return this.getHeaders().pipe(
      switchMap(headers => 
        this.http.post<ApiResponse<Workspace>>(`${this.apiUrl}/invitations/accept`, payload, { headers })
      ),
      map(res => res.data as Workspace)
    );
  }

  updateMemberRole(workspaceId: string, userUid: string, payload: { role: WorkspaceRole; status: WorkspaceMemberStatus }): Observable<WorkspaceMember> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers => 
        this.http.put<ApiResponse<WorkspaceMember>>(`${this.apiUrl}/${workspaceId}/members/${userUid}`, payload, { headers })
      ),
      map(res => res.data as WorkspaceMember)
    );
  }

  removeMember(workspaceId: string, userUid: string): Observable<boolean> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers => 
        this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${workspaceId}/members/${userUid}`, { headers })
      ),
      map(res => !!res.data)
    );
  }

  updateCurrentWorkspace(workspaceId: string): Observable<any> {
    return this.getHeaders().pipe(
      switchMap(headers => 
        this.http.put<ApiResponse<any>>(`${this.userApiUrl}/current-workspace`, { workspace_id: workspaceId }, { headers })
      ),
      map(res => res.data)
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
