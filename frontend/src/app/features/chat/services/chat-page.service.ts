import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/auth.model';
import { WorkspaceStore } from '../../../core/stores/workspace.store';
import { Agent } from '../../agents/models/agent.model';

@Injectable({
  providedIn: 'root'
})
export class ChatPageService {
  private http = inject(HttpClient);
  private workspaceStore = inject(WorkspaceStore);

  private get baseApiUrl(): string {
    const wsId = this.workspaceStore.currentWorkspaceId();
    return `${environment.apiUrl}/workspaces/${wsId}/agents`;
  }

  private getHeaders(): HttpHeaders {
    const activeWsId = this.workspaceStore.currentWorkspaceId() || '';
    return new HttpHeaders({
      'X-Workspace-ID': activeWsId
    });
  }

  getDefaultAgent(): Observable<Agent> {
    return this.http.get<ApiResponse<Agent>>(`${this.baseApiUrl}/default`, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data as Agent)
    );
  }
}
