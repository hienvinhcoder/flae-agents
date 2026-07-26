export const ids = {
  agent: '30000000-0000-4000-8000-000000000001',
  document: '40000000-0000-4000-8000-000000000001',
  failedDocument: '40000000-0000-4000-8000-000000000002',
  secondWorkspace: '20000000-0000-4000-8000-000000000002',
  session: '50000000-0000-4000-8000-000000000001',
  topic: 'topic-product-strategy',
  topicSource: 'topic-market-research',
  user: '10000000-0000-4000-8000-000000000001',
  workspace: '20000000-0000-4000-8000-000000000001',
} as const;

export const e2eUser = {
  avatar_url: null,
  current_workspace_id: ids.workspace,
  email: 'tester@example.invalid',
  firebase_uid: ids.user,
  full_name: 'E2E Tester',
  id: ids.user,
  is_active: true,
  login_providers: ['email_password'],
} as const;

export const e2eUserResponse = {
  ...e2eUser,
  code: 'USER_SYNCED',
  message: 'User synchronized',
};

export function createApiState() {
  const now = '2026-07-24T00:00:00Z';
  return {
    agents: [{
      avatar_color: 'bg-blue-500', avatar_icon: 'bot', created_at: now,
      created_by: ids.user, id: ids.agent, is_active: true, is_default: true,
      model_name: 'gemini-2.5-flash', name: 'Research assistant',
      system_prompt: 'Answer from workspace sources.', temperature: 0.2,
      updated_at: now, workspace_id: ids.workspace,
    }] as Array<Record<string, unknown>>,
    documents: [
      {
        chunk_count: 4, created_at: now, description: 'Product reference',
        document_type: 'markdown', entity_count: 3, file_name: 'guide.md',
        file_size: 2048, id: ids.document, relation_count: 2,
        status: 'completed', title: 'Product guide', updated_at: now,
        uploaded_by: ids.user,
      },
      {
        chunk_count: null, created_at: now, description: 'Retry fixture',
        document_type: 'text', entity_count: null, file_name: 'failed.txt',
        file_size: 128, id: ids.failedDocument, relation_count: null,
        status: 'failed', title: 'Failed import', updated_at: now,
        uploaded_by: ids.user,
      },
    ] as Array<Record<string, unknown>>,
    invitations: [] as Array<Record<string, unknown>>,
    members: [
      {
        avatar_url: null, email: e2eUser.email, full_name: e2eUser.full_name,
        role: 'owner', status: 'active', user_uid: ids.user,
        workspace_id: ids.workspace,
      },
      {
        avatar_url: null, email: 'member@example.invalid', full_name: 'E2E Member',
        role: 'member', status: 'active',
        user_uid: '10000000-0000-4000-8000-000000000002',
        workspace_id: ids.workspace,
      },
    ],
    messages: [] as Array<Record<string, unknown>>,
    sessions: [{
      agent_id: ids.agent, created_at: now, created_by: ids.user,
      id: ids.session, title: 'Launch questions', updated_at: now,
      workspace_id: ids.workspace,
    }],
    failedStreamMessages: new Set<string>(),
    topics: [
      {
        confidence: 0.86, created_at: now, evidence_count: 12,
        name: 'Product strategy', parent_topic_id: null,
        slug: 'product-strategy', status: 'active',
        summary: 'Direction and positioning', topic_id: ids.topic,
        type: 'domain', updated_at: now, workspace_id: ids.workspace,
      },
      {
        confidence: 0.71, created_at: now, evidence_count: 6,
        name: 'Market research', parent_topic_id: null,
        slug: 'market-research', status: 'needs_review',
        summary: 'Customer and competitor evidence', topic_id: ids.topicSource,
        type: 'topic', updated_at: now, workspace_id: ids.workspace,
      },
    ] as Array<Record<string, unknown>>,
    workspaces: [
      { created_at: now, id: ids.workspace, name: 'E2E Platform', owner_uid: ids.user },
      { created_at: now, id: ids.secondWorkspace, name: 'E2E Research', owner_uid: ids.user },
    ],
  };
}

export type ApiState = ReturnType<typeof createApiState>;

export const graphFixture = {
  edges: [{
    description: 'The platform is maintained by the team.', id: 'edge-maintains',
    label: 'MAINTAINS', source: 'node-team', target: 'node-platform', weight: 2,
  }],
  nodes: [
    { degree: 1, description: 'Engineering team', frequency: 3, id: 'node-team', name: 'Platform team', type: 'team' },
    { degree: 1, description: 'Workspace product', frequency: 5, id: 'node-platform', name: 'FLAE platform', type: 'product' },
  ],
};
