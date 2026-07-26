import { useCallback, useEffect, useRef, useState } from "react";

import { AppError } from "../../../core/api/errors";
import type { ChatMessage, Citation } from "../../agents/types/agent";
import { streamChat } from "../api/chat-api";
import type { StreamCitation, StreamEvent, StreamStatus } from "../types/stream";

const CONNECTION_ERROR_TEXT =
  "The response was interrupted by a connection error. Please try again.";

interface UseChatStreamOptions {
  agentId: string | null;
  persistedMessages: ChatMessage[];
  reloadMessages: () => Promise<unknown>;
  sessionId: string | null;
  workspaceId: string | null;
}

interface SendOptions {
  isRetry: boolean;
}

interface ChatStreamState {
  contextKey: string;
  error: string | null;
  lastFailedInput: string | null;
  messages: ChatMessage[] | null;
  retryBaseMessages: ChatMessage[] | null;
  status: StreamStatus;
}

function temporaryMessage(
  id: string,
  role: ChatMessage["role"],
  content: string,
  sessionId: string,
): ChatMessage {
  return {
    citations: [],
    content,
    created_at: new Date().toISOString(),
    created_by: role,
    id,
    role,
    session_id: sessionId,
  };
}

function citationKey(citation: StreamCitation) {
  return `${citation.source_document}\u0000${citation.content}\u0000${String(citation.score)}`;
}

function deduplicateCitations(incoming: StreamCitation[]) {
  const citations = new Map<string, Citation>();
  incoming.forEach((citation) => {
    citations.set(citationKey(citation), {
      content: citation.content,
      score: citation.score ?? undefined,
      source_document: citation.source_document,
    });
  });
  return [...citations.values()];
}

function isAbort(error: unknown) {
  return error instanceof AppError && error.code === "SSE_ABORTED";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to continue the conversation.";
}

export function useChatStream({
  agentId,
  persistedMessages,
  reloadMessages,
  sessionId,
  workspaceId,
}: UseChatStreamOptions) {
  const contextKey = `${workspaceId ?? ""}\u0000${agentId ?? ""}\u0000${sessionId ?? ""}`;
  const [streamState, setStreamState] = useState<ChatStreamState>({
    contextKey,
    error: null,
    lastFailedInput: null,
    messages: null,
    retryBaseMessages: null,
    status: "idle",
  });
  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const activeState = streamState.contextKey === contextKey ? streamState : null;
  const messages = activeState?.messages ?? persistedMessages;
  const status = activeState?.status ?? "idle";
  const error = activeState?.error ?? null;
  const lastFailedInput = activeState?.lastFailedInput ?? null;
  const retryBaseMessages = activeState?.retryBaseMessages ?? null;

  useEffect(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    return () => {
      generationRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [contextKey]);

  const sendInternal = useCallback(async (
    input: string,
    { isRetry }: SendOptions,
  ) => {
    const message = input.trim();
    if (!message || !workspaceId || !agentId || !sessionId || controllerRef.current) {
      return false;
    }

    const controller = new AbortController();
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    controllerRef.current = controller;
    const stamp = `${Date.now()}-${generation}`;
    const assistantId = `temporary-assistant-${stamp}`;
    const transcript = isRetry && retryBaseMessages
      ? retryBaseMessages
      : messages;
    setStreamState({
      contextKey,
      error: null,
      lastFailedInput: null,
      messages: [
        ...transcript,
        temporaryMessage(`temporary-user-${stamp}`, "user", message, sessionId),
        temporaryMessage(assistantId, "assistant", "", sessionId),
      ],
      retryBaseMessages: isRetry ? null : transcript,
      status: "connecting",
    });

    const updateAssistant = (updater: (message: ChatMessage) => ChatMessage) => {
      if (generationRef.current !== generation || controller.signal.aborted) return;
      setStreamState((current) => current.contextKey !== contextKey ? current : {
        ...current,
        messages: current.messages?.map((item) =>
          item.id === assistantId ? updater(item) : item,
        ) ?? null,
      });
    };
    const onEvent = (event: StreamEvent) => {
      if (generationRef.current !== generation || controller.signal.aborted) return;
      if (event.type === "token") {
        setStreamState((current) => current.contextKey !== contextKey ? current : {
          ...current,
          status: "streaming",
        });
        updateAssistant((item) => ({ ...item, content: item.content + event.text }));
      } else if (event.type === "citations") {
        setStreamState((current) => current.contextKey !== contextKey ? current : {
          ...current,
          status: "streaming",
        });
        updateAssistant((item) => ({
          ...item,
          citations: deduplicateCitations(event.citations),
        }));
      }
    };

    try {
      await streamChat({ agentId, message, onEvent, sessionId, signal: controller.signal, workspaceId });
      if (generationRef.current !== generation || controller.signal.aborted) return false;
      if (controllerRef.current === controller) controllerRef.current = null;
      setStreamState((current) => current.contextKey !== contextKey ? current : {
        ...current,
        status: "completed",
      });
      await reloadMessages();
      if (generationRef.current !== generation || controller.signal.aborted) return true;
      setStreamState((current) => current.contextKey !== contextKey ? current : {
        ...current,
        messages: null,
      });
      return true;
    } catch (cause) {
      if (generationRef.current !== generation) return false;
      if (controller.signal.aborted || isAbort(cause)) {
        setStreamState((current) => current.contextKey !== contextKey ? current : {
          ...current,
          status: "idle",
        });
        return false;
      }
      updateAssistant((item) => ({ ...item, content: CONNECTION_ERROR_TEXT }));
      setStreamState((current) => current.contextKey !== contextKey ? current : {
        ...current,
        error: errorMessage(cause),
        lastFailedInput: isRetry ? null : message,
        status: "failed",
      });
      return false;
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [agentId, contextKey, messages, reloadMessages, retryBaseMessages, sessionId, workspaceId]);

  const send = useCallback(
    (input: string) => sendInternal(input, { isRetry: false }),
    [sendInternal],
  );
  const retry = useCallback(() => {
    if (!lastFailedInput) return Promise.resolve(false);
    return sendInternal(lastFailedInput, { isRetry: true });
  }, [lastFailedInput, sendInternal]);
  const stop = useCallback(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStreamState((current) => current.contextKey !== contextKey ? current : {
      ...current,
      error: null,
      status: "idle",
    });
  }, [contextKey]);

  return {
    canRetry: lastFailedInput !== null,
    error,
    messages,
    retry,
    send,
    status,
    stop,
  };
}
