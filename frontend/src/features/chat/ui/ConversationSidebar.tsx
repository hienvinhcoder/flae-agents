import { MessageSquare, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ChatSession } from "../types/chat";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";

interface ConversationSidebarProps {
  activeSessionId: string | null;
  deleting: boolean;
  error: string | null;
  errorAnnounce: boolean;
  loading: boolean;
  onClose: () => void;
  onDelete: (session: ChatSession) => void;
  onRetry: () => void;
  onSelect: (sessionId: string) => void;
  open: boolean;
  sessions: readonly ChatSession[];
}

export function ConversationSidebar({
  activeSessionId,
  deleting,
  error,
  errorAnnounce,
  loading,
  onClose,
  onDelete,
  onRetry,
  onSelect,
  open,
  sessions,
}: ConversationSidebarProps) {
  const { t } = useTranslation();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? sessions.filter((session) => session.title.toLowerCase().includes(query))
      : sessions;
  }, [search, sessions]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        aria-label={t("CHAT_UI.CLOSE_HISTORY_OVERLAY")}
        className="absolute inset-0 z-20 bg-background/55 md:hidden"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label={t("CHAT_UI.CONVERSATION_HISTORY")}
        className="glass-panel-strong relative z-30 flex h-full w-[min(18rem,86vw)] shrink-0 flex-col border-r border-ui-divider max-md:absolute max-md:inset-y-0 max-md:left-0"
        id="conversation-history"
      >
        <div className="px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ui-ink-muted">{t("CHAT_UI.CONVERSATION_HISTORY")}</p>
          <label className="glass-chip mt-2.5 flex items-center gap-2 rounded-ui-status px-2.5 py-1.5 text-ui-ink-muted">
            <Search aria-hidden className="h-3.5 w-3.5" />
            <span className="sr-only">{t("CHAT_UI.SEARCH_CONVERSATIONS")}</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-ui-ink outline-none placeholder:text-ui-ink-muted"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("CHAT_UI.SEARCH_CONVERSATIONS")}
              ref={searchRef}
              type="search"
              value={search}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
          {error ? (
            <ErrorState announce={errorAnnounce} message={error} onRetry={onRetry} retryLabel={t("AGENTS_UI.RETRY")} title={t("CHAT_UI.HISTORY_UNAVAILABLE")} />
          ) : loading ? (
            <div className="p-3"><Skeleton label={t("COMMON.LOADING")} lines={5} /></div>
          ) : sessions.length === 0 ? (
            <p className="p-5 text-center text-sm text-ui-ink-muted">{t("CHAT_UI.NO_CONVERSATIONS")}</p>
          ) : (
            <ul className="grid gap-0.5">
              {filtered.map((session) => {
                const active = activeSessionId === session.id;
                return (
                  <li
                    className={`group flex items-center rounded-ui-control ${
                      active ? "bg-primary-soft" : "hover:bg-ui-interactive"
                    }`}
                    key={session.id}
                  >
                    <button
                      aria-current={active ? "true" : undefined}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2.5 py-2 text-left text-sm text-ui-ink"
                      onClick={() => onSelect(session.id)}
                      type="button"
                    >
                      <MessageSquare aria-hidden className={`h-3.5 w-3.5 shrink-0 ${active ? "text-brand-text" : "text-ui-ink-muted"}`} />
                      <span className={`truncate ${active ? "font-semibold" : "font-medium"}`}>{session.title}</span>
                    </button>
                    <button
                      aria-label={t("CHAT_UI.DELETE_CONVERSATION", { title: session.title })}
                      className="mr-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-ui-control text-ui-ink-muted opacity-100 hover:bg-state-danger-soft hover:text-state-danger md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                      disabled={deleting}
                      onClick={() => onDelete(session)}
                      type="button"
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
