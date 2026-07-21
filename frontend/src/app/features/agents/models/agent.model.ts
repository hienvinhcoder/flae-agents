export interface Agent {
  id?: string;
  workspace_id?: string;
  name: string;
  avatar_color: string;
  avatar_icon: string;
  system_prompt: string;
  model_name?: string;
  temperature?: number;
  created_by?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChatSession {
  id: string;
  workspace_id: string;
  agent_id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  source_document: string;
  content: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_by: string;
  created_at: string;
}
