import { MessageSquare } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import type { AgentDetail } from "../../agents/types/agent";
import type { ChatMessage as ChatMessageData } from "../types/chat";
import { ChatMessage } from "./ChatMessage";
import { AgentAvatarIcon } from "../../agents/ui/agent-appearance";
import { getAgentAvatarColor } from "../../agents/ui/agent-avatar-color";
import type { StreamStatus } from "../types/stream";

interface ConversationMessagesProps {
  activeSessionId: string | null;
  agent?: AgentDetail;
  error: string | null;
  errorAnnounce: boolean;
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
  errorAnnounce,
  loading,
  messages,
  onRetry,
  status,
}: ConversationMessagesProps) {
  const { t } = useTranslation();
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
      aria-label={t("CHAT_UI.MESSAGES_ARIA")}
      className="flex flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 min-h-0"
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
          <h2 className="mt-4 text-lg font-bold text-ui-ink">{t("CHAT_UI.CHOOSE_CONVERSATION")}</h2>
          <p className="mt-2 text-sm text-ui-ink-secondary">{t("CHAT_UI.CHOOSE_DESCRIPTION")}</p>
        </div>
      ) : error ? (
        <div className="m-auto w-full max-w-xl"><ErrorState announce={errorAnnounce} message={error} onRetry={onRetry} retryLabel={t("AGENTS_UI.RETRY")} title={t("CHAT_UI.MESSAGE_HISTORY_UNAVAILABLE")} /></div>
      ) : loading ? (
        <div className="m-auto w-full max-w-2xl"><Skeleton label={t("COMMON.LOADING")} lines={7} /></div>
      ) : messages.length === 0 ? (
        <div className="m-auto max-w-md text-center">
          <div aria-hidden className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${getAgentAvatarColor(agent?.avatar_color ?? "")}`}>
            <AgentAvatarIcon className="h-7 w-7" icon={agent?.avatar_icon ?? "bot"} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-ui-ink">{t("CHAT_UI.START_WITH_AGENT", { name: agent?.name ?? t("AGENTS_UI.TITLE") })}</h2>
          <p className="mt-2 text-sm text-ui-ink-secondary">{t("CHAT_UI.NO_MESSAGES")}</p>
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
