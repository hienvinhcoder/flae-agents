import { getAuthToken } from "../../../core/auth/firebase";
import { env } from "../../../core/config/env";
import { streamSse } from "../../../core/realtime/sse";
import { parseStreamEvent, type StreamEvent } from "../types/stream";

interface StreamChatOptions {
  agentId: string;
  message: string;
  onEvent: (event: StreamEvent) => void;
  sessionId: string;
  signal: AbortSignal;
  workspaceId: string;
}

function encodeSegment(value: string) {
  return encodeURIComponent(value);
}

export function streamChat({
  agentId,
  message,
  onEvent,
  sessionId,
  signal,
  workspaceId,
}: StreamChatOptions) {
  const path = `/workspaces/${encodeSegment(workspaceId)}/agents/${encodeSegment(agentId)}/sessions/${encodeSegment(sessionId)}/stream`;
  const url = `${env.VITE_API_URL.replace(/\/+$/, "")}${path}?message=${encodeURIComponent(message)}`;
  return streamSse({
    onEvent,
    parseEvent: parseStreamEvent,
    signal,
    tokenProvider: getAuthToken,
    url,
  });
}
