import { ChevronDown, ChevronUp, Database, User } from "lucide-react";
import { useState } from "react";

import type { ChatMessage as ChatMessageData } from "../types/chat";
import { CitationList } from "./CitationList";
import { AgentAvatarIcon } from "../../agents/ui/agent-appearance";
import { getAgentAvatarColor } from "../../agents/ui/agent-avatar-color";

interface ChatMessageProps {
  agentColor: string;
  agentIcon: string;
  message: ChatMessageData;
}

function formatTime(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessage({ agentColor, agentIcon, message }: ChatMessageProps) {
  const [citationsOpen, setCitationsOpen] = useState(false);
  const isUser = message.role === "user";
  const citations = message.citations ?? [];
  return (
    <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getAgentAvatarColor(agentColor)}`}
        >
          <AgentAvatarIcon className="h-5 w-5" icon={agentIcon} />
        </div>
      ) : null}

      <div className={`flex max-w-[min(42rem,82%)] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        <p className="flex items-center gap-2 text-xs text-ui-ink-muted">
          <span className="font-semibold text-ui-ink-secondary">{isUser ? "You" : "AI agent"}</span>
          <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
        </p>
        <div
          className={`rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${
            isUser
              ? "rounded-tr-sm border-state-info bg-state-info-soft text-ui-ink"
              : "rounded-tl-sm border-ui-line bg-ui-raised text-ui-ink-secondary"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {!isUser && citations.length > 0 ? (
          <div className="w-full">
            <button
              aria-expanded={citationsOpen}
              className="inline-flex items-center gap-1.5 rounded-ui-control px-2 py-1 text-xs font-semibold text-state-info hover:bg-state-info-soft"
              onClick={() => setCitationsOpen((open) => !open)}
              type="button"
            >
              <Database aria-hidden className="h-3.5 w-3.5" />
              {citationsOpen ? "Hide citations" : `Show ${citations.length} citation${citations.length === 1 ? "" : "s"}`}
              {citationsOpen ? <ChevronUp aria-hidden className="h-3.5 w-3.5" /> : <ChevronDown aria-hidden className="h-3.5 w-3.5" />}
            </button>
            {citationsOpen ? <div className="mt-2"><CitationList citations={citations} /></div> : null}
          </div>
        ) : null}
      </div>

      {isUser ? (
        <div aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ui-line bg-ui-raised text-ui-ink">
          <User className="h-5 w-5" />
        </div>
      ) : null}
    </article>
  );
}
