import { ArrowLeft, MessageSquare, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useWorkspaceStore } from "../../../core/stores/workspace-store";
import { Button } from "../../../shared/ui/Button";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { useAgentDetail } from "../hooks/use-agents";
import { useMessages, useSessionActions, useSessions } from "../hooks/use-sessions";
import { ChatMessage } from "../ui/ChatMessage";
import { AgentAvatarIcon } from "../ui/agent-appearance";
import { getAgentAvatarColor } from "../ui/agent-avatar-color";

const EMPTY_SESSIONS: readonly import("../types/agent").ChatSession[] = [];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AgentChatPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const detailQuery = useAgentDetail(workspaceId, agentId ?? null);
  const sessionsQuery = useSessions(workspaceId, agentId ?? null);
  const actions = useSessionActions(workspaceId, agentId ?? null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const sessions = sessionsQuery.data ?? EMPTY_SESSIONS;
  const activeSessionId = selectedSessionId && sessions.some((session) => session.id === selectedSessionId)
    ? selectedSessionId
    : sessions.at(0)?.id ?? null;
  const messagesQuery = useMessages(workspaceId, agentId ?? null, activeSessionId);
  const agent = detailQuery.data;

  useEffect(() => {
    if (!workspaceId || !agentId) void navigate("/dashboard/agents", { replace: true });
  }, [agentId, navigate, workspaceId]);

  useEffect(() => {
    if (detailQuery.isError) void navigate("/dashboard/agents", { replace: true });
  }, [detailQuery.isError, navigate]);

  const createSession = async () => {
    setActionError(null);
    try {
      const created = await actions.create.mutateAsync({});
      setSelectedSessionId(created.id);
    } catch (error) {
      setActionError(errorMessage(error, "The conversation could not be created."));
    }
  };

  const deleteSession = async (sessionId: string, title: string) => {
    if (!window.confirm(`Delete conversation "${title}"?`)) return;
    setActionError(null);
    try {
      const deleted = await actions.remove.mutateAsync(sessionId);
      if (!deleted) setActionError("The conversation could not be deleted.");
    } catch (error) {
      setActionError(errorMessage(error, "The conversation could not be deleted."));
    }
  };

  return (
    <section aria-label="Agent conversation" className="mx-auto grid min-h-[calc(100vh-8.5rem)] w-full max-w-7xl overflow-hidden rounded-ui-panel border border-ui-line bg-ui-surface lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="flex min-h-72 flex-col border-b border-ui-line bg-ui-raised lg:border-b-0 lg:border-r" aria-label="Conversation history">
        <div className="border-b border-ui-line p-4">
          <Link className="inline-flex items-center gap-2 text-xs font-semibold text-ui-ink-secondary hover:text-ui-ink" to="/dashboard/agents">
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            AI agents
          </Link>
          <Button className="mt-4 w-full" isLoading={actions.create.isPending} loadingText="Creating conversation" onClick={() => void createSession()}>
            <Plus aria-hidden className="h-4 w-4" />
            New conversation
          </Button>
        </div>

        <div className="flex-1 p-2">
          {sessionsQuery.isError ? (
            <ErrorState message={errorMessage(sessionsQuery.error, "Unable to load conversations.")} onRetry={() => void sessionsQuery.refetch()} title="Conversation history unavailable" />
          ) : sessionsQuery.isPending ? (
            <div className="p-3"><Skeleton label="Loading conversations" lines={5} /></div>
          ) : sessions.length === 0 ? (
            <p className="p-6 text-center text-sm text-ui-ink-muted">No conversations yet.</p>
          ) : (
            <ul className="grid gap-1">
              {sessions.map((session) => {
                const active = activeSessionId === session.id;
                return (
                  <li className={`group flex items-center gap-1 rounded-ui-control border ${active ? "border-state-info bg-state-info-soft" : "border-transparent hover:bg-ui-interactive"}`} key={session.id}>
                    <button
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-ui-ink"
                      onClick={() => setSelectedSessionId(session.id)}
                      type="button"
                    >
                      <MessageSquare aria-hidden className="h-4 w-4 shrink-0 text-ui-ink-muted" />
                      <span className="truncate">{session.title}</span>
                    </button>
                    <button
                      aria-label={`Delete ${session.title}`}
                      className="mr-1 rounded-ui-control p-2 text-ui-ink-muted hover:bg-state-danger-soft hover:text-state-danger"
                      disabled={actions.remove.isPending}
                      onClick={() => void deleteSession(session.id, session.title)}
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

      <div className="flex min-h-[36rem] min-w-0 flex-col">
        <header className="flex min-h-16 items-center border-b border-ui-line bg-ui-raised px-5">
          {detailQuery.isPending ? <div className="w-52"><Skeleton label="Loading agent" lines={2} /></div> : agent ? (
            <div className="flex items-center gap-3">
              <div aria-hidden className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${getAgentAvatarColor(agent.avatar_color)}`}>
                <AgentAvatarIcon className="h-5 w-5" icon={agent.avatar_icon} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-ui-ink">{agent.name}</h1>
                <p className="mt-0.5 text-xs text-ui-ink-muted">Ready on {agent.model_name}</p>
              </div>
            </div>
          ) : null}
        </header>

        {actionError ? <p className="m-4 rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-sm text-state-danger" role="alert">{actionError}</p> : null}

        <div className="flex flex-1 flex-col overflow-y-auto p-5 sm:p-7">
          {!activeSessionId ? (
            <div className="m-auto max-w-sm text-center">
              <MessageSquare aria-hidden className="mx-auto h-12 w-12 text-ui-ink-muted" />
              <h2 className="mt-4 text-lg font-bold text-ui-ink">Choose a conversation</h2>
              <p className="mt-2 text-sm text-ui-ink-secondary">Select a conversation from history or create a new one.</p>
            </div>
          ) : messagesQuery.isError ? (
            <div className="m-auto w-full max-w-xl"><ErrorState message={errorMessage(messagesQuery.error, "Unable to load messages.")} onRetry={() => void messagesQuery.refetch()} title="Message history unavailable" /></div>
          ) : messagesQuery.isPending ? (
            <div className="m-auto w-full max-w-2xl"><Skeleton label="Loading messages" lines={7} /></div>
          ) : (messagesQuery.data ?? []).length === 0 ? (
            <div className="m-auto max-w-md text-center">
              <div aria-hidden className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white ${getAgentAvatarColor(agent?.avatar_color ?? "")}`}>
                <AgentAvatarIcon className="h-7 w-7" icon={agent?.avatar_icon ?? "bot"} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-ui-ink">Start with {agent?.name ?? "this agent"}</h2>
              <p className="mt-2 text-sm text-ui-ink-secondary">This conversation has no messages yet.</p>
            </div>
          ) : (
            <div className="mx-auto grid w-full max-w-4xl gap-6">
              {(messagesQuery.data ?? []).map((message) => (
                <ChatMessage agentColor={agent?.avatar_color ?? ""} agentIcon={agent?.avatar_icon ?? "bot"} key={message.id} message={message} />
              ))}
            </div>
          )}
        </div>

        {activeSessionId ? (
          <footer className="border-t border-ui-line bg-ui-raised p-4">
            <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-ui-control border border-ui-line bg-ui-surface px-4 py-3 text-ui-ink-muted">
              <p className="flex-1 text-sm">Secure message streaming arrives in the next migration step.</p>
              <button aria-label="Send message unavailable" className="rounded-ui-control bg-ui-interactive p-2" disabled type="button">
                <Send aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </section>
  );
}
