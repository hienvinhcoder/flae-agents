import { useTranslation } from "react-i18next";

import type { AgentDetail } from "../../agents/types/agent";
import { AgentAvatarIcon } from "../../agents/ui/agent-appearance";
import { getAgentAvatarColor } from "../../agents/ui/agent-avatar-color";
import type { ChatMessage as ChatMessageData } from "../types/chat";
import { CitationList } from "./CitationList";
import { chatToolLabelKey } from "./chat-tool-label";

interface ChatMessageProps {
  agent?: AgentDetail;
  isLast?: boolean;
  message: ChatMessageData;
  streaming?: boolean;
  toolName?: string | null;
}

function formatTime(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessage({
  agent,
  isLast = false,
  message,
  streaming = false,
  toolName = null,
}: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const citations = message.citations ?? [];
  const showStream = !isUser && isLast && streaming;
  const showTool = showStream && Boolean(toolName);
  const toolLabel = toolName
    ? t(chatToolLabelKey(toolName), { name: toolName })
    : null;

  return (
    <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {isUser ? null : (
        <div
          aria-hidden
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-control ${getAgentAvatarColor(agent?.avatar_color ?? "")}`}
        >
          <AgentAvatarIcon className="h-4 w-4" icon={agent?.avatar_icon ?? "bot"} />
        </div>
      )}
      <div className={`flex min-w-0 max-w-[min(42rem,calc(100%-2.5rem))] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        <p className="flex items-center gap-2 text-xs text-ui-ink-muted">
          <span>{isUser ? t("CHAT_UI.ROLE_YOU") : t("CHAT_UI.ROLE_ASSISTANT")}</span>
          <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
        </p>
        {isUser ? (
          <div className="rounded-ui-panel rounded-br-md bg-ui-interactive px-4 py-2.5 text-[15px] leading-6 text-ui-ink">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : (
          <div className="w-full text-[15px] leading-7 text-ui-ink">
            {showTool ? (
              <p
                aria-live="polite"
                className="glass-chip mb-3 inline-flex items-center gap-2 rounded-ui-status px-2.5 py-1 text-xs font-medium text-brand-text"
                role="status"
              >
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                {toolLabel}
              </p>
            ) : null}
            {message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : null}
            {showStream && message.content ? (
              <span
                aria-label={t("CHAT_UI.STREAMING_ARIA")}
                className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-primary motion-reduce:animate-none"
              />
            ) : null}
          </div>
        )}
        {!isUser && citations.length > 0 ? (
          <div className="w-full pt-1">
            <CitationList citations={citations} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
