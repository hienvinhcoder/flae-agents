import AxeBuilder from '@axe-core/playwright';
import { expect, test as base, type Page, type Route } from '@playwright/test';

import { createApiState, e2eUser, e2eUserResponse, graphFixture, ids, type ApiState } from './data';

export { ids } from './data';

export async function installAuthSession(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem('flae_language', 'en');
    localStorage.setItem('flae_e2e_auth_session', JSON.stringify(user));
  }, e2eUser);
}

export async function fulfillJson(route: Route, json: unknown, status = 200) {
  await route.fulfill({
    headers: {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': '*',
    },
    json: {
      code: status >= 400 ? 'E2E_ERROR' : 'E2E_OK',
      data: json,
      message: status >= 400 ? 'E2E route error' : 'E2E fixture response',
    },
    status,
  });
  return true;
}

function topicDetail(topic: Record<string, unknown>) {
  const detail = { ...topic };
  delete detail.evidence_count;
  return { ...detail, current_state: 'Planning', members: [] };
}

function chatMessages(state: ApiState, message: string) {
  state.messages = [
    {
      citations: null, content: message, created_at: '2026-07-24T00:00:00Z',
      created_by: ids.user, id: '60000000-0000-4000-8000-000000000001',
      role: 'user', session_id: ids.session,
    },
    {
      citations: [{ content: 'Launch evidence', score: 0.94, source_document: 'Product guide' }],
      content: 'The launch plan is grounded in the product guide.',
      created_at: '2026-07-24T00:00:01Z', created_by: ids.agent,
      id: '60000000-0000-4000-8000-000000000002', role: 'assistant',
      session_id: ids.session,
    },
  ];
}

export async function handleStream(route: Route, state: ApiState, url: URL) {
  const message = url.searchParams.get('message') ?? '';
  if (/retry/i.test(message) && !state.failedStreamMessages.has(message)) {
    state.failedStreamMessages.add(message);
    await route.abort('connectionfailed');
    return;
  }
  if (/stop/i.test(message)) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  const frames = [
    { type: 'token', text: 'The launch plan is grounded in the product guide.' },
    { type: 'citations', citations: [{ content: 'Launch evidence', score: 0.94, source_document: 'Product guide' }] },
    { type: 'done' },
  ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  await route.fulfill({
    body: frames,
    contentType: 'text/event-stream',
    headers: { 'access-control-allow-origin': '*', 'cache-control': 'no-cache' },
  }).then(() => chatMessages(state, message)).catch(() => undefined);
}

async function handleKnowledge(route: Route, state: ApiState, path: string, method: string) {
  if (path === '/knowledge-base/graph') return fulfillJson(route, graphFixture);
  if (path === '/knowledge-base' && method === 'GET') return fulfillJson(route, state.documents);
  if (path === '/knowledge-base/upload' && method === 'POST') {
    const uploaded = {
      chunk_count: null, created_at: '2026-07-24T00:00:00Z', description: 'Uploaded in E2E',
      document_type: 'markdown', entity_count: null, file_name: 'handbook.md', file_size: 64,
      id: '40000000-0000-4000-8000-000000000003', relation_count: null,
      status: 'pending', title: 'Uploaded handbook', updated_at: '2026-07-24T00:00:00Z', uploaded_by: ids.user,
    };
    state.documents.push(uploaded);
    return fulfillJson(route, { id: uploaded.id, status: uploaded.status, temporal_workflow_id: 'workflow-upload', title: uploaded.title });
  }
  const retryMatch = path.match(/^\/knowledge-base\/([^/]+)\/retry$/);
  if (retryMatch && method === 'POST') {
    const document = state.documents.find((item) => item.id === retryMatch[1]);
    if (document) document.status = 'pending';
    return fulfillJson(route, { id: retryMatch[1], status: 'pending', temporal_workflow_id: 'workflow-retry', title: document?.title ?? 'Document' });
  }
  const documentMatch = path.match(/^\/knowledge-base\/([^/]+)$/);
  if (documentMatch && method === 'DELETE') {
    state.documents = state.documents.filter((item) => item.id !== documentMatch[1]);
    return fulfillJson(route, true);
  }
  if (documentMatch && method === 'GET') {
    const item = state.documents.find((document) => document.id === documentMatch[1]);
    return fulfillJson(route, { ...item, content_text: 'Fixture content', error_message: null, gcs_path: null, mime_type: 'text/markdown', processing_time_seconds: 1, temporal_workflow_id: null, token_usage: null });
  }
  return false;
}

async function handleTopics(route: Route, state: ApiState, path: string, method: string) {
  const base = `/workspaces/${ids.workspace}/topics`;
  if (path === `${base}/merge` && method === 'POST') {
    const payload = route.request().postDataJSON() as { source_topic_ids: string[] };
    state.topics = state.topics.filter((topic) => !payload.source_topic_ids.includes(String(topic.topic_id)));
    return fulfillJson(route, true);
  }
  if (path === base && method === 'GET') return fulfillJson(route, state.topics);
  const match = path.match(new RegExp(`^${base}/([^/]+)$`));
  if (match && method === 'GET') {
    const topic = state.topics.find((item) => item.topic_id === match[1] || item.slug === match[1]);
    return topic ? fulfillJson(route, topicDetail(topic)) : fulfillJson(route, { detail: 'Topic not found' }, 404);
  }
  if (match && method === 'PUT') {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    const topic = state.topics.find((item) => item.topic_id === match[1]);
    if (topic) Object.assign(topic, payload);
    return fulfillJson(route, { name: topic?.name, slug: topic?.slug, status: topic?.status, topic_id: topic?.topic_id, workspace_id: ids.workspace });
  }
  return false;
}

async function handleAgents(route: Route, state: ApiState, path: string, method: string) {
  const base = `/workspaces/${ids.workspace}/agents`;
  const messagesPath = `${base}/${ids.agent}/sessions/${ids.session}/messages`;
  if (path === messagesPath && method === 'GET') return fulfillJson(route, state.messages);
  if (path === `${base}/${ids.agent}/sessions` && method === 'GET') return fulfillJson(route, state.sessions);
  if (path === `${base}/default` && method === 'GET') return fulfillJson(route, state.agents[0]);
  if (path === base && method === 'GET') return fulfillJson(route, state.agents);
  if (path === base && method === 'POST') {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    const created = { ...state.agents[0], ...payload, id: '30000000-0000-4000-8000-000000000002', is_default: false };
    state.agents.push(created);
    return fulfillJson(route, created);
  }
  const match = path.match(new RegExp(`^${base}/([^/]+)$`));
  if (match && method === 'GET') return fulfillJson(route, state.agents.find((agent) => agent.id === match[1]));
  if (match && method === 'PUT') {
    const agent = state.agents.find((item) => item.id === match[1]);
    Object.assign(agent ?? {}, route.request().postDataJSON());
    return fulfillJson(route, agent);
  }
  return false;
}

async function installApiRoutes(page: Page, state: ApiState) {
  await page.route('http://127.0.0.1:8000/api/v1/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    if (method === 'OPTIONS') {
      await route.fulfill({ headers: {
        'access-control-allow-headers': 'authorization,content-type,x-workspace-id',
        'access-control-allow-methods': 'DELETE,GET,OPTIONS,POST,PUT',
        'access-control-allow-origin': '*',
      }, status: 204 });
      return;
    }
    if (path.endsWith('/stream')) return handleStream(route, state, url);
    if (await handleKnowledge(route, state, path, method)) return;
    if (await handleTopics(route, state, path, method)) return;
    if (await handleAgents(route, state, path, method)) return;
    if (path === '/workspaces' && method === 'GET') return fulfillJson(route, state.workspaces);
    if (path === '/users/current-workspace' && method === 'PUT') {
      const payload = request.postDataJSON() as { workspace_id: string };
      return fulfillJson(route, { ...e2eUserResponse, current_workspace_id: payload.workspace_id });
    }
    if (path === `/workspaces/${ids.workspace}/members` && method === 'GET') return fulfillJson(route, state.members);
    if (path === `/workspaces/${ids.workspace}/invitations` && method === 'GET') return fulfillJson(route, state.invitations);
    if (path === `/workspaces/${ids.workspace}/invitations` && method === 'POST') {
      const payload = request.postDataJSON() as { email: string; role: string };
      const invitation = { ...payload, created_at: '2026-07-24T00:00:00Z', expires_at: '2026-08-24T00:00:00Z', id: 'invite-e2e', invited_by: ids.user, status: 'pending', token: 'e2e-invite-token', workspace_id: ids.workspace };
      state.invitations.push(invitation);
      return fulfillJson(route, invitation);
    }
    if (path === '/auth/sync-user' && method === 'POST') return fulfillJson(route, e2eUserResponse);
    return fulfillJson(route, { detail: `Unhandled E2E route: ${method} ${path}` }, 501);
  });
}

export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

export const test = base.extend<{ api: ApiState }>({
  api: [async ({ page }, use) => {
    const state = createApiState();
    await installApiRoutes(page, state);
    await use(state);
  }, { auto: true }],
});
export { expect };
