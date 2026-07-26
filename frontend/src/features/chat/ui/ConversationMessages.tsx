import { MessageSquare } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import type { AgentDetail, ChatMessage as ChatMessageData } from "../../agents/types/agent";
import { ChatMessage } from "../../agents/ui/ChatMessage";
import { AgentAvatarIcon } from "../../agents/ui/agent-appearance";
import { getAgentAvatarColor } from "../../agents/ui/agent-avatar-color";
import type { StreamStatus } from "../types/stream";

interface ConversationMessagesProps {
  activeSessionId: string | null;
  agent?: AgentDetail;
  error: string | null;
  loading: boolean;
  messages: ChatMessageData[];
  onRetry: () => void;
  status: StreamStatus;
}

function scrollToBottom(element: HTMLDivElement) {
  if (typeof element.scrollTo === "function") {
    element.scrollTo({ behavior: "auto", top: element.scrollHeight });
  } else {
    element.scrollTop = element.scrollHeight;
  }
}

export function ConversationMessages({
  activeSessionId,
  agent,
  error,
  loading,
  messages,
  onRetry,
  status,
}: ConversationMessagesProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  useLayoutEffect(() => {
    if (!activeSessionId || loading || !viewportRef.current) return;
    nearBottomRef.current = true;
    scrollToBottom(viewportRef.current);
  }, [activeSessionId, loading]);

  useLayoutEffect(() => {
    if (status !== "streaming" || !nearBottomRef.current || !viewportRef.current) return;
    scrollToBottom(viewportRef.current);
  }, [messages, status]);

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto p-5 sm:p-7"
      data-testid="message-viewport"
      onScroll={(event) => {
        const element = event.currentTarget;
        nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 120;
      }}
      ref={viewportRef}
    >
      {!activeSessionId ? (
        <div className="m-auto max-w-sm text-center">
          <MessageSquare aria-hidden className="mx-auto h-12 w-12 text-ui-ink-muted" />
          <h2 className="mt-4 text-lg font-bold text-ui-ink">Choose a conversation</h2>
          <p className="mt-2 text-sm text-ui-ink-secondary">Select a conversation from history or create a new one.</p>
        </div>
      ) : error ? (
        <div className="m-auto w-full max-w-xl"><ErrorState message={error} onRetry={onRetry} title="Message history unavailable" /></div>
      ) : loading ? (
        <div className="m-auto w-full max-w-2xl"><Skeleton label="Loading messages" lines={7} /></div>
      ) : messages.length === 0 ? (
        <div className="m-auto max-w-md text-center">
          <div aria-hidden className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white ${getAgentAvatarColor(agent?.avatar_color ?? "")}`}>
            <AgentAvatarIcon className="h-7 w-7" icon={agent?.avatar_icon ?? "bot"} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-ui-ink">Start with {agent?.name ?? "this agent"}</h2>
          <p className="mt-2 text-sm text-ui-ink-secondary">This conversation has no messages yet.</p>
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-4xl gap-6">
          {messages.map((message) => (
            <ChatMessage agentColor={agent?.avatar_color ?? ""} agentIcon={agent?.avatar_icon ?? "bot"} key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}
