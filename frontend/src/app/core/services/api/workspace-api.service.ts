import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class WorkspaceApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/workspaces`;
  private userApiUrl = `${environment.apiUrl}/users`;

  getWorkspaces(): Observable<Workspace[]> {
    return this.http.get<ApiResponse<Workspace[]>>(`${this.apiUrl}`).pipe(
      map(res => res.data as Workspace[])
    );
  }

  createManualWorkspace(payload: CreateManualWorkspacePayload): Observable<Workspace> {
    return this.http.post<ApiResponse<Workspace>>(`${this.apiUrl}/manual`, payload).pipe(
      map(res => res.data as Workspace)
    );
  }

  updateWorkspace(workspaceId: string, payload: { name: string }): Observable<Workspace> {
    return this.http.put<ApiResponse<Workspace>>(`${this.apiUrl}/${workspaceId}`, payload, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => res.data as Workspace)
    );
  }

  getWorkspaceMembers(workspaceId: string): Observable<WorkspaceMember[]> {
    return this.http.get<ApiResponse<WorkspaceMember[]>>(`${this.apiUrl}/${workspaceId}/members`, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => res.data as WorkspaceMember[])
    );
  }

  getPendingInvitations(workspaceId: string): Observable<WorkspaceInvitation[]> {
    return this.http.get<ApiResponse<WorkspaceInvitation[]>>(`${this.apiUrl}/${workspaceId}/invitations`, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => res.data as WorkspaceInvitation[])
    );
  }

  inviteMember(workspaceId: string, payload: { email: string; role: WorkspaceRole }): Observable<WorkspaceInvitation> {
    return this.http.post<ApiResponse<WorkspaceInvitation>>(`${this.apiUrl}/${workspaceId}/invitations`, payload, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => res.data as WorkspaceInvitation)
    );
  }

  acceptInvitation(payload: { token: string }): Observable<Workspace> {
    return this.http.post<ApiResponse<Workspace>>(`${this.apiUrl}/invitations/accept`, payload).pipe(
      map(res => res.data as Workspace)
    );
  }

  updateMemberRole(workspaceId: string, userUid: string, payload: { role: WorkspaceRole; status: WorkspaceMemberStatus }): Observable<WorkspaceMember> {
    return this.http.put<ApiResponse<WorkspaceMember>>(`${this.apiUrl}/${workspaceId}/members/${userUid}`, payload, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => res.data as WorkspaceMember)
    );
  }

  removeMember(workspaceId: string, userUid: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${workspaceId}/members/${userUid}`, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => !!res.data)
    );
  }

  updateCurrentWorkspace(workspaceId: string): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.userApiUrl}/current-workspace`, { workspace_id: workspaceId }).pipe(
      map(res => res.data)
    );
  }

  getOauthUrl(payload: GetOauthUrlPayload): Observable<GetOauthUrlResponse> {
    return this.http.post<ApiResponse<GetOauthUrlResponse>>(`${this.apiUrl}/oauth/url`, payload).pipe(
      map(res => res.data as GetOauthUrlResponse)
    );
  }

  handleOauthCallback(payload: HandleOauthCallbackPayload): Observable<Workspace> {
    return this.http.post<ApiResponse<Workspace>>(`${this.apiUrl}/oauth/callback`, payload).pipe(
      map(res => res.data as Workspace)
    );
  }
}
