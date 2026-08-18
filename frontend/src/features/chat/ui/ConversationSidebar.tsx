import { ArrowLeft, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { ChatSession } from "../types/chat";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";

interface ConversationSidebarProps {
  activeSessionId: string | null;
  backHref?: string;
  backLabel?: string;
  creating: boolean;
  deleting: boolean;
  error: string | null;
  errorAnnounce: boolean;
  loading: boolean;
  onCreate: () => void;
  onDelete: (session: ChatSession) => void;
  onRetry: () => void;
  onSelect: (sessionId: string) => void;
  sessions: readonly ChatSession[];
}

export function ConversationSidebar({
  activeSessionId,
  backHref,
  backLabel,
  creating,
  deleting,
  error,
  errorAnnounce,
  loading,
  onCreate,
  onDelete,
  onRetry,
  onSelect,
  sessions,
}: ConversationSidebarProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? sessions.filter((session) => session.title.toLowerCase().includes(query))
      : sessions;
  }, [search, sessions]);

  return (
    <aside className="flex max-h-[18rem] min-h-72 flex-col overflow-y-auto border-b border-ui-divider bg-ui-raised lg:max-h-none lg:min-h-0 lg:border-b-0 lg:border-r" aria-label={t("CHAT_UI.CONVERSATION_HISTORY")}>
      <div className="border-b border-ui-divider p-4">
        {backHref && backLabel ? (
          <Link className="inline-flex items-center gap-2 text-xs font-semibold text-ui-ink-secondary hover:text-ui-ink" to={backHref}>
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        ) : null}
        <Button className={backHref ? "mt-4 w-full" : "w-full"} isLoading={creating} loadingText={t("CHAT_UI.CREATING_CONVERSATION")} onClick={onCreate}>
          <Plus aria-hidden className="h-4 w-4" />
          {t("CHAT_UI.NEW_CONVERSATION")}
        </Button>
        <label className="mt-3 flex items-center gap-2 rounded-ui-control border border-ui-line bg-ui-surface px-3 py-2 text-ui-ink-muted">
          <Search aria-hidden className="h-4 w-4" />
          <span className="sr-only">{t("CHAT_UI.SEARCH_CONVERSATIONS")}</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-ui-ink outline-none placeholder:text-ui-ink-muted"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("CHAT_UI.SEARCH_CONVERSATIONS")}
            type="search"
            value={search}
          />
        </label>
      </div>

      <div className="flex-1 p-2">
        {error ? (
          <ErrorState announce={errorAnnounce} message={error} onRetry={onRetry} retryLabel={t("AGENTS_UI.RETRY")} title={t("CHAT_UI.HISTORY_UNAVAILABLE")} />
        ) : loading ? (
          <div className="p-3"><Skeleton label={t("COMMON.LOADING")} lines={5} /></div>
        ) : sessions.length === 0 ? (
          <p className="p-6 text-center text-sm text-ui-ink-muted">{t("CHAT_UI.NO_CONVERSATIONS")}</p>
        ) : (
          <ul className="grid gap-1">
            {filtered.map((session) => {
              const active = activeSessionId === session.id;
              return (
                <li className={`group flex items-center gap-1 rounded-ui-control border ${active ? "border-state-info bg-state-info-soft" : "border-transparent hover:bg-ui-interactive"}`} key={session.id}>
                  <button
                    aria-current={active ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-ui-ink"
                    onClick={() => onSelect(session.id)}
                    type="button"
                  >
                    <MessageSquare aria-hidden className="h-4 w-4 shrink-0 text-ui-ink-muted" />
                    <span className="truncate">{session.title}</span>
                  </button>
                  <button
                    aria-label={t("CHAT_UI.DELETE_CONVERSATION", { title: session.title })}
                    className="mr-1 min-h-11 min-w-11 rounded-ui-control p-2 text-ui-ink-muted transition-colors hover:bg-state-danger-soft hover:text-state-danger motion-reduce:transition-none"
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
  );
}
