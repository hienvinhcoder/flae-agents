import { useCallback, useState } from "react";

import { Button } from "../../../shared/ui/Button";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Toast, ToastViewport } from "../../../shared/ui/Toast";
import { useMessages, useSessionActions, useSessions } from "../../agents/hooks/use-sessions";
import type { AgentDetail, ChatMessage, ChatSession } from "../../agents/types/agent";
import { AgentAvatarIcon } from "../../agents/ui/agent-appearance";
import { getAgentAvatarColor } from "../../agents/ui/agent-avatar-color";
import { useChatStream } from "../hooks/use-chat-stream";
import { ChatComposer } from "./ChatComposer";
import { ConversationMessages } from "./ConversationMessages";
import { ConversationSidebar } from "./ConversationSidebar";

const EMPTY_SESSIONS: readonly ChatSession[] = [];
const EMPTY_MESSAGES: ChatMessage[] = [];

interface ChatExperienceProps {
  agent?: AgentDetail;
  agentId: string | null;
  agentLoading?: boolean;
  ariaLabel: string;
  backHref?: string;
  backLabel?: string;
  workspaceId: string;
}

function readableError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ChatExperience({
  agent,
  agentId,
  agentLoading,
  ariaLabel,
  backHref,
  backLabel,
  workspaceId,
}: ChatExperienceProps) {
  const sessionsQuery = useSessions(workspaceId, agentId);
  const actions = useSessionActions(workspaceId, agentId);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const sessions = sessionsQuery.data ?? EMPTY_SESSIONS;
  const activeSessionId = selectedSessionId && sessions.some((session) => session.id === selectedSessionId)
    ? selectedSessionId
    : sessions.at(0)?.id ?? null;
  const messagesQuery = useMessages(workspaceId, agentId, activeSessionId);
  const refetchMessages = messagesQuery.refetch;
  const reloadMessages = useCallback(async () => {
    await refetchMessages();
  }, [refetchMessages]);
  const stream = useChatStream({
    agentId,
    persistedMessages: messagesQuery.data ?? EMPTY_MESSAGES,
    reloadMessages,
    sessionId: activeSessionId,
    workspaceId,
  });

  const createSession = async () => {
    setActionError(null);
    try {
      const created = await actions.create.mutateAsync({});
      setSelectedSessionId(created.id);
    } catch (error) {
      setActionError(readableError(error, "The conversation could not be created."));
    }
  };
  const deleteSession = async (session: ChatSession) => {
    if (!window.confirm(`Delete conversation "${session.title}"?`)) return;
    setActionError(null);
    const index = sessions.findIndex((item) => item.id === session.id);
    const nextId = sessions[index + 1]?.id ?? sessions[index - 1]?.id ?? null;
    try {
      const deleted = await actions.remove.mutateAsync(session.id);
      if (!deleted) {
        setActionError("The conversation could not be deleted.");
      } else if (activeSessionId === session.id) {
        setSelectedSessionId(nextId);
      }
    } catch (error) {
      setActionError(readableError(error, "The conversation could not be deleted."));
    }
  };

  return (
    <section aria-label={ariaLabel} className="mx-auto grid min-h-[calc(100vh-8.5rem)] w-full max-w-7xl overflow-hidden rounded-ui-panel border border-ui-line bg-ui-surface lg:grid-cols-[19rem_minmax(0,1fr)]">
      <ConversationSidebar
        activeSessionId={activeSessionId}
        backHref={backHref}
        backLabel={backLabel}
        creating={actions.create.isPending}
        deleting={actions.remove.isPending}
        error={sessionsQuery.isError ? readableError(sessionsQuery.error, "Unable to load conversations.") : null}
        loading={sessionsQuery.isPending}
        onCreate={() => void createSession()}
        onDelete={(session) => void deleteSession(session)}
        onRetry={() => void sessionsQuery.refetch()}
        onSelect={setSelectedSessionId}
        sessions={sessions}
      />

      <div className="flex min-h-[36rem] min-w-0 flex-col">
        <header className="flex min-h-16 items-center border-b border-ui-line bg-ui-raised px-5">
          {agentLoading ? <div className="w-52"><Skeleton label="Loading agent" lines={2} /></div> : agent ? (
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
        <ConversationMessages
          activeSessionId={activeSessionId}
          agent={agent}
          error={messagesQuery.isError ? readableError(messagesQuery.error, "Unable to load messages.") : null}
          loading={messagesQuery.isPending}
          messages={stream.messages}
          onRetry={() => void messagesQuery.refetch()}
          status={stream.status}
        />
        {activeSessionId && agent ? (
          <>
            {stream.error && stream.canRetry ? (
              <div className="border-t border-ui-line bg-state-danger-soft px-4 py-2 text-center">
                <Button aria-label="Retry message" onClick={() => void stream.retry()} variant="secondary">Retry message</Button>
              </div>
            ) : null}
            <ChatComposer agentName={agent.name} onSend={(message) => void stream.send(message)} onStop={stream.stop} status={stream.status} />
          </>
        ) : null}
      </div>
      {stream.error ? (
        <ToastViewport><Toast duration={0} message={stream.error} tone="error" /></ToastViewport>
      ) : null}
    </section>
  );
}
