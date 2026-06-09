export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DocumentType = 'pdf' | 'markdown' | 'text' | 'manual_input';

export interface KnowledgeDocument {
  id: string;
  title: string;
  description?: string;
  document_type: DocumentType;
  status: DocumentStatus;
  file_name?: string;
  file_size?: number;
  chunk_count?: number;
  entity_count?: number;
  relation_count?: number;
  error_message?: string;
  token_usage?: Record<string, number>;
  processing_time_seconds?: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ManualDocumentPayload {
  title: string;
  description?: string;
  content_text: string;
}
