import { MessageSquare } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import type { AgentDetail } from "../../agents/types/agent";
import type { ChatMessage as ChatMessageData } from "../types/chat";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessage } from "./ChatMessage";
import type { StreamStatus } from "../types/stream";

interface ConversationMessagesProps {
  activeSessionId: string | null;
  activeToolName?: string | null;
  agent?: AgentDetail;
  error: string | null;
  errorAnnounce: boolean;
  loading: boolean;
  messages: ChatMessageData[];
  onPromptSelect?: (prompt: string) => void;
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
  activeToolName = null,
  agent,
  error,
  errorAnnounce,
  loading,
  messages,
  onPromptSelect,
  onRetry,
  status,
}: ConversationMessagesProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const emptyThread = Boolean(activeSessionId) && !loading && !error && messages.length === 0;

  useLayoutEffect(() => {
    if (!activeSessionId || loading || !viewportRef.current) return;
    nearBottomRef.current = true;
    scrollToBottom(viewportRef.current);
  }, [activeSessionId, loading]);

  useLayoutEffect(() => {
    if (status !== "streaming" || !nearBottomRef.current || !viewportRef.current) return;
    scrollToBottom(viewportRef.current);
  }, [messages, status, activeToolName]);

  return (
    <div
      aria-label={t("CHAT_UI.MESSAGES_ARIA")}
      className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 ${emptyThread ? "justify-center" : ""}`}
      data-testid="message-viewport"
      onScroll={(event) => {
        const element = event.currentTarget;
        nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 120;
      }}
      ref={viewportRef}
    >
      {!activeSessionId ? (
        <div className="m-auto max-w-sm text-center">
          <MessageSquare aria-hidden className="mx-auto h-10 w-10 text-ui-ink-muted" />
          <h2 className="mt-3 text-base font-semibold text-ui-ink">{t("CHAT_UI.CHOOSE_CONVERSATION")}</h2>
          <p className="mt-2 text-sm text-ui-ink-secondary">{t("CHAT_UI.CHOOSE_DESCRIPTION")}</p>
        </div>
      ) : error ? (
        <div className="m-auto w-full max-w-xl"><ErrorState announce={errorAnnounce} message={error} onRetry={onRetry} retryLabel={t("AGENTS_UI.RETRY")} title={t("CHAT_UI.MESSAGE_HISTORY_UNAVAILABLE")} /></div>
      ) : loading ? (
        <div className="m-auto w-full max-w-3xl"><Skeleton label={t("COMMON.LOADING")} lines={7} /></div>
      ) : messages.length === 0 ? (
        <ChatEmptyState
          agent={agent}
          agentName={agent?.name ?? t("AGENTS_UI.TITLE")}
          onPromptSelect={onPromptSelect}
        />
      ) : (
        <div className="mx-auto grid w-full max-w-3xl gap-6 pb-4">
          {messages.map((message, index) => (
            <ChatMessage
              agent={agent}
              isLast={index === messages.length - 1}
              key={message.id}
              message={message}
              streaming={status === "connecting" || status === "streaming"}
              toolName={index === messages.length - 1 ? activeToolName : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
