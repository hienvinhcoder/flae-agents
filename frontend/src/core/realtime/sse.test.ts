import { describe, expect, it, vi } from "vitest";

import { AppError } from "../api/errors";
import { streamSse } from "./sse";

function responseFromChunks(chunks: string[], init: ResponseInit = {}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, ...init });
}

function parseObject(value: unknown) {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    throw new AppError({
      code: "SSE_PROTOCOL_ERROR",
      kind: "server",
      message: "Invalid stream event.",
      retryable: true,
    });
  }
  return value as { type: string };
}

describe("streamSse", () => {
  it("authenticates with a header and parses split frames and multiple data lines", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(responseFromChunks([
      'data: {"type":"token",\n',
      'data: "text":"Hel',
      'lo"}\r\n\r\ndata: {"type":"done"}\n\n',
    ]));
    const onEvent = vi.fn();

    await streamSse({
      fetchImpl,
      onEvent,
      parseEvent: parseObject,
      tokenProvider: () => Promise.resolve("secret-token"),
      url: "https://api.example.test/workspaces/ws/agents/a/sessions/s/stream?message=hello%20world",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/workspaces/ws/agents/a/sessions/s/stream?message=hello%20world",
      expect.objectContaining({
        method: "GET",
      }),
    );
    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer secret-token");
    expect(new Headers(request.headers).get("Accept")).toBe("text/event-stream");
    expect(fetchImpl.mock.calls[0]?.[0]).not.toContain("token=");
    expect(onEvent).toHaveBeenNthCalledWith(1, { type: "token", text: "Hello" });
    expect(onEvent).toHaveBeenNthCalledWith(2, { type: "done" });
  });

  it("cancels the reader after a terminal event and ignores later frames", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const read = vi
      .fn()
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"done"}\n\n') })
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"token","text":"late"}\n\n') });
    const fetchImpl = vi.fn().mockResolvedValue({
      body: { getReader: () => ({ cancel, read, releaseLock: vi.fn() }) },
      ok: true,
      status: 200,
    });
    const onEvent = vi.fn();

    await streamSse({
      fetchImpl: fetchImpl as typeof fetch,
      onEvent,
      parseEvent: parseObject,
      tokenProvider: () => Promise.resolve("token"),
      url: "https://api.example.test/stream",
    });

    expect(onEvent).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledOnce();
  });

  it("rejects missing credentials before fetching", async () => {
    const fetchImpl = vi.fn();

    await expect(streamSse({
      fetchImpl,
      onEvent: vi.fn(),
      parseEvent: parseObject,
      tokenProvider: () => Promise.resolve(null),
      url: "https://api.example.test/stream",
    })).rejects.toMatchObject({ code: "SSE_AUTH_REQUIRED", kind: "auth" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["non-OK response", new Response(null, { status: 503 }), "SSE_HTTP_ERROR"],
    ["missing body", { body: null, ok: true, status: 200 } as Response, "SSE_BODY_REQUIRED"],
  ])("returns a typed failure for a %s", async (_name, response, code) => {
    await expect(streamSse({
      fetchImpl: vi.fn().mockResolvedValue(response),
      onEvent: vi.fn(),
      parseEvent: parseObject,
      tokenProvider: () => Promise.resolve("token"),
      url: "https://api.example.test/stream",
    })).rejects.toMatchObject({ code });
  });

  it("turns invalid JSON and invalid variants into protocol failures", async () => {
    const invalidVariant = (value: unknown) => {
      const parsed = parseObject(value);
      if (parsed.type !== "done") throw new Error("unknown event");
      return parsed;
    };

    await expect(streamSse({
      fetchImpl: vi.fn().mockResolvedValue(responseFromChunks(["data: not-json\n\n"])),
      onEvent: vi.fn(),
      parseEvent: parseObject,
      tokenProvider: () => Promise.resolve("token"),
      url: "https://api.example.test/stream",
    })).rejects.toMatchObject({ code: "SSE_PROTOCOL_ERROR" });
    await expect(streamSse({
      fetchImpl: vi.fn().mockResolvedValue(responseFromChunks(['data: {"type":"mystery"}\n\n'])),
      onEvent: vi.fn(),
      parseEvent: invalidVariant,
      tokenProvider: () => Promise.resolve("token"),
      url: "https://api.example.test/stream",
    })).rejects.toMatchObject({ code: "SSE_PROTOCOL_ERROR" });
  });

  it("cancels an active reader when aborted", async () => {
    const controller = new AbortController();
    const cancel = vi.fn().mockResolvedValue(undefined);
    const read = vi.fn(() => new Promise(() => undefined));
    const fetchImpl = vi.fn().mockResolvedValue({
      body: { getReader: () => ({ cancel, read, releaseLock: vi.fn() }) },
      ok: true,
      status: 200,
    });
    const promise = streamSse({
      fetchImpl: fetchImpl as typeof fetch,
      onEvent: vi.fn(),
      parseEvent: parseObject,
      signal: controller.signal,
      tokenProvider: () => Promise.resolve("token"),
      url: "https://api.example.test/stream",
    });

    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());
    controller.abort();

    await expect(promise).rejects.toMatchObject({ code: "SSE_ABORTED" });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("parses a terminal frame at EOF without a trailing blank line", async () => {
    const onEvent = vi.fn();

    await streamSse({
      fetchImpl: vi.fn().mockResolvedValue(responseFromChunks(['data: {"type":"done"}'])),
      onEvent,
      parseEvent: parseObject,
      tokenProvider: () => Promise.resolve("token"),
      url: "https://api.example.test/stream",
    });

    expect(onEvent).toHaveBeenCalledWith({ type: "done" });
  });

  it("treats EOF before a terminal event as a transport failure", async () => {
    await expect(streamSse({
      fetchImpl: vi.fn().mockResolvedValue(responseFromChunks(['data: {"type":"token","text":"partial"}\n\n'])),
      onEvent: vi.fn(),
      parseEvent: parseObject,
      tokenProvider: () => Promise.resolve("token"),
      url: "https://api.example.test/stream",
    })).rejects.toMatchObject({ code: "SSE_TRANSPORT_ERROR" });
  });

  it("waits for reader cancellation before releasing the lock", async () => {
    const controller = new AbortController();
    let resolveCancel: (() => void) | undefined;
    const cancel = vi.fn(() => new Promise<void>((resolve) => { resolveCancel = resolve; }));
    const read = vi.fn(() => new Promise(() => undefined));
    const releaseLock = vi.fn();
    const promise = streamSse({
      fetchImpl: vi.fn().mockResolvedValue({
        body: { getReader: () => ({ cancel, read, releaseLock }) },
        ok: true,
        status: 200,
      }) as typeof fetch,
      onEvent: vi.fn(),
      parseEvent: parseObject,
      signal: controller.signal,
      tokenProvider: () => Promise.resolve("token"),
      url: "https://api.example.test/stream",
    });
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce());

    controller.abort();
    await Promise.resolve();
    expect(releaseLock).not.toHaveBeenCalled();
    resolveCancel?.();

    await expect(promise).rejects.toMatchObject({ code: "SSE_ABORTED" });
    expect(releaseLock).toHaveBeenCalledOnce();
  });
});
