import { beforeEach, describe, expect, it, vi } from "vitest";

interface StreamSseOptions {
  tokenProvider: () => Promise<string | null>;
}

const dependencies = vi.hoisted(() => ({
  getIdToken: vi.fn(),
  streamSse: vi.fn<(options: StreamSseOptions) => Promise<void>>(),
}));

vi.mock("../../../core/realtime/sse", () => ({ streamSse: dependencies.streamSse }));
vi.mock("../../../core/auth/firebase", () => ({
  getAuthToken: dependencies.getIdToken,
}));
vi.mock("../../../core/config/env", () => ({
  env: { VITE_API_URL: "https://api.example.test/v1" },
}));

import { streamChat } from "./chat-api";

describe("streamChat", () => {
  beforeEach(() => {
    dependencies.getIdToken.mockReset().mockResolvedValue("firebase-token");
    dependencies.streamSse.mockReset().mockResolvedValue(undefined);
  });

  it("uses the workspace-scoped SSE URL with an encoded message", async () => {
    const controller = new AbortController();
    const onEvent = vi.fn();

    await streamChat({
      agentId: "agent/id",
      message: "  benefits & leave?  ",
      onEvent,
      sessionId: "session id",
      signal: controller.signal,
      workspaceId: "workspace-id",
    });

    expect(dependencies.streamSse).toHaveBeenCalledWith(expect.objectContaining({
      onEvent,
      signal: controller.signal,
      url: "https://api.example.test/v1/workspaces/workspace-id/agents/agent%2Fid/sessions/session%20id/stream?message=%20%20benefits%20%26%20leave%3F%20%20",
    }));
    const options = dependencies.streamSse.mock.calls[0]?.[0];
    expect(options).toBeDefined();
    if (!options) throw new Error("Expected stream options.");
    await expect(options.tokenProvider()).resolves.toBe("firebase-token");
  });
});
