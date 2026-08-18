import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../../core/api/errors";
import type { ChatMessage } from "../types/chat";
import type { StreamEvent } from "../types/stream";
import { useChatStream } from "./use-chat-stream";

const chatApi = vi.hoisted(() => ({ streamChat: vi.fn() }));
vi.mock("../api/chat-api", () => chatApi);

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const persisted: ChatMessage[] = [{
  citations: [],
  content: "Earlier answer",
  created_at: "2026-07-24T08:00:00Z",
  created_by: "assistant",
  id: "33333333-3333-4333-8333-333333333333",
  role: "assistant",
  session_id: sessionId,
}];

interface CapturedStream {
  onEvent: (event: StreamEvent) => void;
  signal: AbortSignal;
}

function renderStreamHook(overrides: Partial<{
  agentId: string | null;
  failureMessage: string;
  persistedMessages: ChatMessage[];
  reloadMessages: () => Promise<unknown>;
  sessionId: string | null;
  workspaceId: string | null;
}> = {}) {
  const reloadMessages = vi.fn().mockResolvedValue(undefined);
  const values = {
    agentId,
    failureMessage: "Unable to load messages.",
    persistedMessages: persisted,
    reloadMessages,
    sessionId,
    workspaceId,
    ...overrides,
  };
  return {
    reloadMessages: values.reloadMessages,
    ...renderHook(
      (props) => useChatStream(props),
      { initialProps: values },
    ),
  };
}

describe("useChatStream", () => {
  beforeEach(() => {
    chatApi.streamChat.mockReset();
  });

  it("streams one trimmed optimistic message pair and deduplicates citations", async () => {
    let captured: CapturedStream | undefined;
    let resolveStream: (() => void) | undefined;
    chatApi.streamChat.mockImplementation((options: CapturedStream) => {
      captured = options;
      return new Promise<void>((resolve) => { resolveStream = resolve; });
    });
    const { reloadMessages, result } = renderStreamHook();

    act(() => { void result.current.send("  What is covered?  "); });

    expect(result.current.status).toBe("connecting");
    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages.at(-2)).toMatchObject({
      content: "What is covered?",
      role: "user",
    });
    expect(result.current.messages.at(-1)).toMatchObject({ content: "", role: "assistant" });
    act(() => { void result.current.send("duplicate"); });
    expect(chatApi.streamChat).toHaveBeenCalledOnce();

    act(() => {
      captured?.onEvent({ text: "Health ", type: "token" });
      captured?.onEvent({ text: "benefits", type: "token" });
      captured?.onEvent({
        citations: [
          { content: "Coverage", score: null, source_document: "Benefits.pdf" },
          { content: "Coverage", score: null, source_document: "Benefits.pdf" },
        ],
        type: "citations",
      });
    });
    expect(result.current.status).toBe("streaming");
    expect(result.current.messages.at(-1)).toMatchObject({
      citations: [{ content: "Coverage", source_document: "Benefits.pdf" }],
      content: "Health benefits",
    });

    act(() => {
      captured?.onEvent({ type: "done" });
      resolveStream?.();
    });
    await waitFor(() => expect(result.current.status).toBe("completed"));
    expect(reloadMessages).toHaveBeenCalledOnce();
  });

  it("replaces citations with each incoming event and deduplicates that event", () => {
    let captured: CapturedStream | undefined;
    chatApi.streamChat.mockImplementation((options: CapturedStream) => {
      captured = options;
      return new Promise<void>(() => undefined);
    });
    const { result } = renderStreamHook();
    act(() => { void result.current.send("Compare sources"); });

    act(() => captured?.onEvent({
      citations: [{ content: "Old evidence", score: 0.7, source_document: "Old.pdf" }],
      type: "citations",
    }));
    act(() => captured?.onEvent({
      citations: [
        { content: "New evidence", score: null, source_document: "New.pdf" },
        { content: "New evidence", score: null, source_document: "New.pdf" },
      ],
      type: "citations",
    }));

    expect(result.current.messages.at(-1)?.citations).toEqual([
      { content: "New evidence", score: undefined, source_document: "New.pdf" },
    ]);
  });

  it("treats a valid server error as normal completion without fallback", async () => {
    chatApi.streamChat.mockImplementation((options: CapturedStream) => {
      options.onEvent({ detail: "No answer available", type: "error" });
      return Promise.resolve();
    });
    const { reloadMessages, result } = renderStreamHook();

    await act(() => result.current.send("Question"));

    expect(result.current.status).toBe("completed");
    expect(result.current.error).toBeNull();
    expect(result.current.messages.at(-1)?.content).toBe("Earlier answer");
    expect(result.current.messages.some((item) => /connection error/i.test(item.content))).toBe(false);
    expect(reloadMessages).toHaveBeenCalledOnce();
  });

  it("marks transport failure, replaces pending content, and retries once", async () => {
    let retryStream: CapturedStream | undefined;
    let resolveRetry: (() => void) | undefined;
    chatApi.streamChat
      .mockRejectedValueOnce(new AppError({
        code: "SSE_TRANSPORT_ERROR",
        kind: "network",
        message: "Unable to connect.",
        retryable: true,
      }))
      .mockImplementationOnce((options: CapturedStream) => {
        retryStream = options;
        return new Promise<void>((resolve) => { resolveRetry = resolve; });
      });
    const { result } = renderStreamHook();

    await act(() => result.current.send(" Retry this "));

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBe("Unable to load messages.");
    expect(result.current.messages.at(-1)?.content).toBe("Unable to load messages.");
    expect(result.current.canRetry).toBe(true);

    act(() => { void result.current.retry(); });

    expect(chatApi.streamChat).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ message: "Retry this" }),
    );
    expect(result.current.canRetry).toBe(false);
    expect(result.current.messages.map((item) => item.content)).toEqual([
      "Earlier answer",
      "Retry this",
      "",
    ]);
    act(() => {
      retryStream?.onEvent({ text: "Recovered", type: "token" });
      retryStream?.onEvent({ type: "done" });
      resolveRetry?.();
    });
    await waitFor(() => expect(result.current.status).toBe("completed"));
  });

  it("stops without converting cancellation into a failure", async () => {
    let signal: AbortSignal | undefined;
    chatApi.streamChat.mockImplementation((options: CapturedStream) => {
      signal = options.signal;
      return new Promise<void>((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new AppError({
          code: "SSE_ABORTED",
          kind: "network",
          message: "Cancelled",
          retryable: false,
        })));
      });
    });
    const { result } = renderStreamHook();
    act(() => { void result.current.send("Stop me"); });
    await waitFor(() => expect(result.current.status).toBe("connecting"));

    act(() => result.current.stop());

    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(signal?.aborted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("accepts a new send while terminal history reload is still pending", async () => {
    let resolveReload: (() => void) | undefined;
    const reloadMessages = vi.fn(() => new Promise<void>((resolve) => {
      resolveReload = resolve;
    }));
    chatApi.streamChat
      .mockImplementationOnce((options: CapturedStream) => {
        options.onEvent({ type: "done" });
        return Promise.resolve();
      })
      .mockImplementationOnce(() => new Promise<void>(() => undefined));
    const { result } = renderStreamHook({ reloadMessages });

    act(() => { void result.current.send("First question"); });
    await waitFor(() => expect(result.current.status).toBe("completed"));
    act(() => { void result.current.send("Second question"); });

    expect(chatApi.streamChat).toHaveBeenCalledTimes(2);
    expect(result.current.messages.some((item) => item.content === "Second question")).toBe(true);
    act(() => resolveReload?.());
    await waitFor(() => expect(reloadMessages).toHaveBeenCalledOnce());
    expect(result.current.messages.some((item) => item.content === "Second question")).toBe(true);
    expect(result.current.status).toBe("connecting");
  });

  it("preserves a stopped partial pair when sending the next message", () => {
    let firstStream: CapturedStream | undefined;
    chatApi.streamChat
      .mockImplementationOnce((options: CapturedStream) => {
        firstStream = options;
        return new Promise<void>((_resolve, reject) => {
          options.signal.addEventListener("abort", () => reject(new AppError({
            code: "SSE_ABORTED",
            kind: "network",
            message: "Cancelled",
            retryable: false,
          })));
        });
      })
      .mockImplementationOnce(() => new Promise<void>(() => undefined));
    const { result } = renderStreamHook();
    act(() => { void result.current.send("First question"); });
    act(() => firstStream?.onEvent({ text: "Partial answer", type: "token" }));
    expect(result.current.messages.at(-1)?.content).toBe("Partial answer");

    act(() => result.current.stop());
    act(() => { void result.current.send("Second question"); });

    expect(chatApi.streamChat).toHaveBeenCalledTimes(2);
    expect(result.current.messages.map((item) => item.content)).toEqual([
      "Earlier answer",
      "First question",
      "Partial answer",
      "Second question",
      "",
    ]);
  });

  it("aborts and ignores late events when chat context changes", async () => {
    let captured: CapturedStream | undefined;
    chatApi.streamChat.mockImplementation((options: CapturedStream) => {
      captured = options;
      return new Promise<void>(() => undefined);
    });
    const { rerender, result } = renderStreamHook();
    act(() => { void result.current.send("Old workspace question"); });
    await waitFor(() => expect(captured).toBeDefined());
    const nextMessages = [{ ...persisted[0]!, content: "New workspace history" }];

    rerender({
      agentId: "44444444-4444-4444-8444-444444444444",
      failureMessage: "Unable to load messages.",
      persistedMessages: nextMessages,
      reloadMessages: vi.fn().mockResolvedValue(undefined),
      sessionId: "55555555-5555-4555-8555-555555555555",
      workspaceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(captured?.signal.aborted).toBe(true);
    expect(result.current.messages).toEqual(nextMessages);
    act(() => captured?.onEvent({ text: "late", type: "token" }));
    expect(result.current.messages).toEqual(nextMessages);
    expect(result.current.status).toBe("idle");
  });
});
