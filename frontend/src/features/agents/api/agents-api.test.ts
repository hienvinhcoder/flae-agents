import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "../../../core/api/client";
import {
  createAgent,
  deleteAgent,
  getAgent,
  getDefaultAgent,
  listAgents,
  updateAgent,
} from "./agents-api";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "11111111-1111-4111-8111-111111111111";
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

  it("loads and validates the workspace default agent", async () => {
    const defaultAgent = { ...agent, is_default: true };
    const request = vi.fn().mockResolvedValue(defaultAgent);

    await expect(
      getDefaultAgent(workspaceId, { request } as ApiClient),
    ).resolves.toEqual(defaultAgent);
    expect(request).toHaveBeenCalledWith({
      auth: true,
      method: "GET",
      path: `/workspaces/${workspaceId}/agents/default`,
      signal: undefined,
      workspaceId,
    });

    request.mockResolvedValueOnce({ ...defaultAgent, is_default: "yes" });
    await expect(
      getDefaultAgent(workspaceId, { request } as ApiClient),
    ).rejects.toMatchObject({ kind: "server" });
  });

  it("preserves false agent deletion responses", async () => {
    const request = vi.fn().mockResolvedValue(false);
    const client = { request } as ApiClient;

    await expect(deleteAgent(workspaceId, agentId, client)).resolves.toBe(false);
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
