import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../../../core/api/client";
import {
  createSession,
  deleteSession,
  listMessages,
  listSessions,
} from "./chat-sessions-api";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const session = {
  agent_id: agentId,
  created_at: "2026-07-23T00:00:00Z",
  created_by: "user-1",
  id: sessionId,
  title: "Launch questions",
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: workspaceId,
};

describe("chat sessions API", () => {
  it("lists and creates sessions at the existing agent-scoped routes", async () => {
    const request = vi.fn().mockResolvedValueOnce([session]).mockResolvedValueOnce(session);
    const client = { request } as ApiClient;
    const signal = new AbortController().signal;

    await expect(listSessions(workspaceId, agentId, client, signal)).resolves.toEqual([session]);
    await expect(createSession(workspaceId, agentId, { title: "Launch questions" }, client)).resolves.toEqual(session);
    expect(request).toHaveBeenNthCalledWith(1, {
      auth: true,
      method: "GET",
      path: `/workspaces/${workspaceId}/agents/${agentId}/sessions`,
      signal,
      workspaceId,
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      auth: true,
      body: { title: "Launch questions" },
      method: "POST",
      path: `/workspaces/${workspaceId}/agents/${agentId}/sessions`,
      workspaceId,
    });
  });

  it("preserves false deletion responses", async () => {
    const request = vi.fn().mockResolvedValue(false);

    await expect(deleteSession(workspaceId, agentId, sessionId, { request } as ApiClient)).resolves.toBe(false);
  });

  it("loads typed message history and normalizes nullable citations", async () => {
    const request = vi.fn().mockResolvedValue([{
      citations: null,
      content: "What is the launch date?",
      created_at: "2026-07-24T00:00:00Z",
      created_by: "user-1",
      id: "33333333-3333-4333-8333-333333333333",
      role: "user",
      session_id: sessionId,
    }]);
    const signal = new AbortController().signal;

    await expect(listMessages(workspaceId, agentId, sessionId, { request } as ApiClient, signal))
      .resolves.toMatchObject([{ citations: [], role: "user" }]);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      method: "GET",
      path: `/workspaces/${workspaceId}/agents/${agentId}/sessions/${sessionId}/messages`,
      signal,
      workspaceId,
    });
  });

  it("rejects missing workspace context before making a request", async () => {
    const request = vi.fn();

    await expect(listSessions(" ", agentId, { request } as ApiClient)).rejects.toMatchObject({ kind: "validation" });
    expect(request).not.toHaveBeenCalled();
  });
});
