import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../../../core/api/client";
import {
  createAgent,
  createSession,
  deleteAgent,
  deleteSession,
  getAgent,
  listAgents,
  listMessages,
  listSessions,
  updateAgent,
} from "./agents-api";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const agent = {
  avatar_color: "bg-blue-500",
  avatar_icon: "bot",
  created_at: "2026-07-20T00:00:00Z",
  created_by: "user-1",
  id: agentId,
  is_active: true,
  is_default: false,
  model_name: "gemini-2.5-flash",
  name: "Research assistant",
  system_prompt: "Answer from workspace sources.",
  temperature: 0.2,
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: workspaceId,
};
const session = {
  agent_id: agentId,
  created_at: "2026-07-23T00:00:00Z",
  created_by: "user-1",
  id: sessionId,
  title: "Launch questions",
  updated_at: "2026-07-24T00:00:00Z",
  workspace_id: workspaceId,
};

describe("agents API", () => {
  it("lists agents with workspace headers and cancellation", async () => {
    const request = vi.fn().mockResolvedValue([agent]);
    const signal = new AbortController().signal;

    await expect(
      listAgents(workspaceId, { request } as ApiClient, signal),
    ).resolves.toEqual([agent]);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      method: "GET",
      path: `/workspaces/${workspaceId}/agents`,
      signal,
      workspaceId,
    });
  });

  it("rejects a missing workspace before issuing a request", async () => {
    const request = vi.fn();

    await expect(
      listAgents("  ", { request } as ApiClient),
    ).rejects.toMatchObject({ kind: "validation" });
    expect(request).not.toHaveBeenCalled();
  });

  it("loads detail and preserves create and partial update bodies", async () => {
    const request = vi.fn().mockResolvedValue(agent);
    const client = { request } as ApiClient;
    const createPayload = {
      avatar_color: agent.avatar_color,
      avatar_icon: agent.avatar_icon,
      is_default: false,
      model_name: agent.model_name,
      name: agent.name,
      system_prompt: agent.system_prompt,
      temperature: agent.temperature,
    };

    await expect(getAgent(workspaceId, agentId, client)).resolves.toEqual(agent);
    await expect(
      createAgent(workspaceId, createPayload, client),
    ).resolves.toEqual(agent);
    await expect(
      updateAgent(
        workspaceId,
        agentId,
        { is_active: false, name: "Archive assistant" },
        client,
      ),
    ).resolves.toEqual(agent);
    expect(request).toHaveBeenNthCalledWith(1, {
      auth: true,
      method: "GET",
      path: `/workspaces/${workspaceId}/agents/${agentId}`,
      signal: undefined,
      workspaceId,
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      auth: true,
      body: createPayload,
      method: "POST",
      path: `/workspaces/${workspaceId}/agents`,
      workspaceId,
    });
    expect(request).toHaveBeenNthCalledWith(3, {
      auth: true,
      body: { is_active: false, name: "Archive assistant" },
      method: "PUT",
      path: `/workspaces/${workspaceId}/agents/${agentId}`,
      workspaceId,
    });
  });

  it("preserves false agent and session deletion responses", async () => {
    const request = vi.fn().mockResolvedValue(false);
    const client = { request } as ApiClient;

    await expect(deleteAgent(workspaceId, agentId, client)).resolves.toBe(false);
    await expect(
      deleteSession(workspaceId, agentId, sessionId, client),
    ).resolves.toBe(false);
  });

  it("lists and creates sessions at the agent-scoped routes", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce([session])
      .mockResolvedValueOnce(session);
    const client = { request } as ApiClient;
    const signal = new AbortController().signal;

    await expect(
      listSessions(workspaceId, agentId, client, signal),
    ).resolves.toEqual([session]);
    await expect(
      createSession(workspaceId, agentId, { title: "Launch questions" }, client),
    ).resolves.toEqual(session);
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

  it("loads typed message history and normalizes nullable citations", async () => {
    const request = vi.fn().mockResolvedValue([
      {
        citations: null,
        content: "What is the launch date?",
        created_at: "2026-07-24T00:00:00Z",
        created_by: "user-1",
        id: "33333333-3333-4333-8333-333333333333",
        role: "user",
        session_id: sessionId,
      },
    ]);
    const signal = new AbortController().signal;

    await expect(
      listMessages(
        workspaceId,
        agentId,
        sessionId,
        { request } as ApiClient,
        signal,
      ),
    ).resolves.toMatchObject([{ citations: [], role: "user" }]);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      method: "GET",
      path: `/workspaces/${workspaceId}/agents/${agentId}/sessions/${sessionId}/messages`,
      signal,
      workspaceId,
    });
  });

  it("turns malformed server data into a safe application error", async () => {
    const request = vi.fn().mockResolvedValue([{ ...agent, temperature: "warm" }]);
    const error: unknown = await listAgents(
      workspaceId,
      { request } as ApiClient,
    ).catch((cause: unknown) => cause);

    expect(error).toMatchObject({
      kind: "server",
      message: "The server returned invalid agent list data.",
    });
    expect(String(error)).not.toContain("warm");
  });
});
