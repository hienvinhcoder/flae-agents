import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth.model';
import { KnowledgeDocument, ManualDocumentPayload, KnowledgeGraphData } from '../../models/knowledge-base.model';
import { AuthService } from '../auth.service';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseApiService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/knowledge-base`;

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

  getDocuments(workspaceId: string): Observable<KnowledgeDocument[]> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers =>
        this.http.get<ApiResponse<KnowledgeDocument[]>>(`${this.apiUrl}`, { headers })
      ),
      map(res => res.data || [])
    );
  }

  uploadDocument(workspaceId: string, file: File, title: string, description?: string): Observable<KnowledgeDocument> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        if (description) {
          formData.append('description', description);
        }
        return this.http.post<ApiResponse<KnowledgeDocument>>(`${this.apiUrl}/upload`, formData, { headers });
      }),
      map(res => {
        if (!res.data) {
          throw new Error('Upload failed: no data returned');
        }
        return res.data;
      })
    );
  }

  createManualDocument(workspaceId: string, payload: ManualDocumentPayload): Observable<KnowledgeDocument> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers =>
        this.http.post<ApiResponse<KnowledgeDocument>>(`${this.apiUrl}/manual`, payload, { headers })
      ),
      map(res => {
        if (!res.data) {
          throw new Error('Creation failed: no data returned');
        }
        return res.data;
      })
    );
  }

  getDocument(workspaceId: string, docId: string): Observable<KnowledgeDocument> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers =>
        this.http.get<ApiResponse<KnowledgeDocument>>(`${this.apiUrl}/${docId}`, { headers })
      ),
      map(res => {
        if (!res.data) {
          throw new Error('Document not found');
        }
        return res.data;
      })
    );
  }

  deleteDocument(workspaceId: string, docId: string): Observable<boolean> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers =>
        this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${docId}`, { headers })
      ),
      map(res => !!res.data)
    );
  }

  retryIngestion(workspaceId: string, docId: string): Observable<KnowledgeDocument> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers =>
        this.http.post<ApiResponse<KnowledgeDocument>>(`${this.apiUrl}/${docId}/retry`, {}, { headers })
      ),
      map(res => {
        if (!res.data) {
          throw new Error('Retry failed: no data returned');
        }
        return res.data;
      })
    );
  }

  getIngestionStatus(workspaceId: string, docId: string): Observable<any> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers =>
        this.http.get<ApiResponse<any>>(`${this.apiUrl}/${docId}/status`, { headers })
      ),
      map(res => res.data)
    );
  }

  getKnowledgeGraph(workspaceId: string): Observable<KnowledgeGraphData> {
    return this.getHeadersWithWorkspace(workspaceId).pipe(
      switchMap(headers =>
        this.http.get<ApiResponse<KnowledgeGraphData>>(`${this.apiUrl}/graph`, { headers })
      ),
      map(res => res.data || { nodes: [], edges: [] })
    );
  }
}
