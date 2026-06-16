import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth.model';
import { KnowledgeDocument, ManualDocumentPayload, KnowledgeGraphData } from '../../models/knowledge-base.model';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/knowledge-base`;

  getDocuments(workspaceId: string): Observable<KnowledgeDocument[]> {
    return this.http.get<ApiResponse<KnowledgeDocument[]>>(`${this.apiUrl}`, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => res.data || [])
    );
  }

  uploadDocument(workspaceId: string, file: File, title: string, description?: string): Observable<KnowledgeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) {
      formData.append('description', description);
    }
    return this.http.post<ApiResponse<KnowledgeDocument>>(`${this.apiUrl}/upload`, formData, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Upload failed: no data returned');
        }
        return res.data;
      })
    );
  }

  createManualDocument(workspaceId: string, payload: ManualDocumentPayload): Observable<KnowledgeDocument> {
    return this.http.post<ApiResponse<KnowledgeDocument>>(`${this.apiUrl}/manual`, payload, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Creation failed: no data returned');
        }
        return res.data;
      })
    );
  }

  getDocument(workspaceId: string, docId: string): Observable<KnowledgeDocument> {
    return this.http.get<ApiResponse<KnowledgeDocument>>(`${this.apiUrl}/${docId}`, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Document not found');
        }
        return res.data;
      })
    );
  }

  deleteDocument(workspaceId: string, docId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${docId}`, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => !!res.data)
    );
  }

  retryIngestion(workspaceId: string, docId: string): Observable<KnowledgeDocument> {
    return this.http.post<ApiResponse<KnowledgeDocument>>(`${this.apiUrl}/${docId}/retry`, {}, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Retry failed: no data returned');
        }
        return res.data;
      })
    );
  }

  getIngestionStatus(workspaceId: string, docId: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${docId}/status`, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => res.data)
    );
  }

  getKnowledgeGraph(workspaceId: string): Observable<KnowledgeGraphData> {
    return this.http.get<ApiResponse<KnowledgeGraphData>>(`${this.apiUrl}/graph`, {
      headers: new HttpHeaders({ 'X-Workspace-ID': workspaceId })
    }).pipe(
      map(res => res.data || { nodes: [], edges: [] })
    );
  }
}
