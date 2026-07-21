import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/auth.model';
import { Topic, TopicDetailResponse, TopicMergePayload } from '../../models/topic.model';

@Injectable({
  providedIn: 'root'
})
export class TopicsApiService {
  private http = inject(HttpClient);

  private getUrl(workspaceId: string): string {
    return `${environment.apiUrl}/workspaces/${workspaceId}/topics`;
  }

  getTopics(workspaceId: string, params: { query?: string; status?: string; limit?: number; offset?: number } = {}): Observable<Topic[]> {
    let queryParams = '';
    const parts: string[] = [];
    if (params.query) parts.push(`query=${encodeURIComponent(params.query)}`);
    if (params.status) parts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.limit !== undefined) parts.push(`limit=${params.limit}`);
    if (params.offset !== undefined) parts.push(`offset=${params.offset}`);
    if (parts.length > 0) {
      queryParams = `?${parts.join('&')}`;
    }

    return this.http.get<ApiResponse<Topic[]>>(`${this.getUrl(workspaceId)}${queryParams}`).pipe(
      map(res => res.data || [])
    );
  }

  getTopic(workspaceId: string, topicIdOrSlug: string): Observable<TopicDetailResponse> {
    return this.http.get<ApiResponse<TopicDetailResponse>>(`${this.getUrl(workspaceId)}/${topicIdOrSlug}`).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Topic not found');
        }
        return res.data;
      })
    );
  }

  updateTopic(workspaceId: string, topicId: string, payload: Partial<Topic>): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.getUrl(workspaceId)}/${topicId}`, payload).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Update failed');
        }
        return res.data;
      })
    );
  }

  mergeTopics(workspaceId: string, payload: TopicMergePayload): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.getUrl(workspaceId)}/merge`, payload).pipe(
      map(res => !!res.data)
    );
  }

  reSummarizeTopic(workspaceId: string, topicId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.getUrl(workspaceId)}/${topicId}/re-summarize`, {}).pipe(
      map(res => !!res.data)
    );
  }
}
