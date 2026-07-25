import { ArrowLeft, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { ChatSession } from "../../agents/types/agent";
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
  loading,
  onCreate,
  onDelete,
  onRetry,
  onSelect,
  sessions,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? sessions.filter((session) => session.title.toLowerCase().includes(query))
      : sessions;
  }, [search, sessions]);

  return (
    <aside className="flex min-h-72 flex-col border-b border-ui-line bg-ui-raised lg:border-b-0 lg:border-r" aria-label="Conversation history">
      <div className="border-b border-ui-line p-4">
        {backHref && backLabel ? (
          <Link className="inline-flex items-center gap-2 text-xs font-semibold text-ui-ink-secondary hover:text-ui-ink" to={backHref}>
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        ) : null}
        <Button className={backHref ? "mt-4 w-full" : "w-full"} isLoading={creating} loadingText="Creating conversation" onClick={onCreate}>
          <Plus aria-hidden className="h-4 w-4" />
          New conversation
        </Button>
        <label className="mt-3 flex items-center gap-2 rounded-ui-control border border-ui-line bg-ui-surface px-3 py-2 text-ui-ink-muted">
          <Search aria-hidden className="h-4 w-4" />
          <span className="sr-only">Search conversations</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-ui-ink outline-none placeholder:text-ui-ink-muted"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            type="search"
            value={search}
          />
        </label>
      </div>

      <div className="flex-1 p-2">
        {error ? (
          <ErrorState message={error} onRetry={onRetry} title="Conversation history unavailable" />
        ) : loading ? (
          <div className="p-3"><Skeleton label="Loading conversations" lines={5} /></div>
        ) : sessions.length === 0 ? (
          <p className="p-6 text-center text-sm text-ui-ink-muted">No conversations yet.</p>
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
                    aria-label={`Delete ${session.title}`}
                    className="mr-1 rounded-ui-control p-2 text-ui-ink-muted hover:bg-state-danger-soft hover:text-state-danger"
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
