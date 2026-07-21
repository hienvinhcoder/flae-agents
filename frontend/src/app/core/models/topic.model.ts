export interface Topic {
  workspace_id: string;
  topic_id: string;
  parent_topic_id?: string;
  name: string;
  slug: string;
  type: 'domain' | 'topic' | 'subtopic';
  summary?: string;
  current_state?: string;
  status: 'active' | 'archived' | 'needs_review';
  confidence: number;
  evidence_count?: number;
  created_at: string;
  updated_at: string;
}

export interface MemberDetail {
  member_type: 'chunk' | 'document' | 'entity' | 'relationship' | 'fact' | 'code_symbol' | 'stale_doc_finding';
  member_id: string;
  relevance_score: number;
  evidence_count: number;
  created_at: string;
  metadata: Record<string, any>;
}

export interface TopicDetailResponse extends Topic {
  members: MemberDetail[];
}

export interface TopicMergePayload {
  target_topic_id: string;
  source_topic_ids: string[];
}
