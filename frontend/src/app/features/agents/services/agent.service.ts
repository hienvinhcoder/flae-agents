import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/auth.model';
import { WorkspaceStore } from '../../../core/stores/workspace.store';
import { Agent, ChatSession, ChatMessage } from '../models/agent.model';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private http = inject(HttpClient);
  private workspaceStore = inject(WorkspaceStore);

  private get baseApiUrl(): string {
    const wsId = this.workspaceStore.currentWorkspaceId();
    return `${environment.apiUrl}/workspaces/${wsId}/agents`;
  }

  private getHeaders(wsId?: string): HttpHeaders {
    const activeWsId = wsId || this.workspaceStore.currentWorkspaceId() || '';
    return new HttpHeaders({
      'X-Workspace-ID': activeWsId
    });
  }

  // ── Agent CRUD ────────────────────────────────────────────────────

  getAgents(): Observable<Agent[]> {
    return this.http.get<ApiResponse<Agent[]>>(this.baseApiUrl, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data as Agent[])
    );
  }

  getAgent(id: string): Observable<Agent> {
    return this.http.get<ApiResponse<Agent>>(`${this.baseApiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data as Agent)
    );
  }

  createAgent(agent: Agent): Observable<Agent> {
    return this.http.post<ApiResponse<Agent>>(this.baseApiUrl, agent, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data as Agent)
    );
  }

  updateAgent(id: string, agent: Partial<Agent>): Observable<Agent> {
    return this.http.put<ApiResponse<Agent>>(`${this.baseApiUrl}/${id}`, agent, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data as Agent)
    );
  }

  deleteAgent(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseApiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      map(res => !!res.data)
    );
  }

  // ── Chat Session ──────────────────────────────────────────────────

  getSessions(agentId: string): Observable<ChatSession[]> {
    return this.http.get<ApiResponse<ChatSession[]>>(`${this.baseApiUrl}/${agentId}/sessions`, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data as ChatSession[])
    );
  }

  createSession(agentId: string, title?: string): Observable<ChatSession> {
    return this.http.post<ApiResponse<ChatSession>>(`${this.baseApiUrl}/${agentId}/sessions`, { title }, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data as ChatSession)
    );
  }

  deleteSession(agentId: string, sessionId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseApiUrl}/${agentId}/sessions/${sessionId}`, {
      headers: this.getHeaders()
    }).pipe(
      map(res => !!res.data)
    );
  }

  // ── Chat Message ──────────────────────────────────────────────────

  getMessages(agentId: string, sessionId: string): Observable<ChatMessage[]> {
    return this.http.get<ApiResponse<ChatMessage[]>>(`${this.baseApiUrl}/${agentId}/sessions/${sessionId}/messages`, {
      headers: this.getHeaders()
    }).pipe(
      map(res => res.data as ChatMessage[])
    );
  }
}
