import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppError } from "../../../core/api/errors";
import { Button } from "../../../shared/ui/Button";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Toast, ToastViewport } from "../../../shared/ui/Toast";
import type { AgentDetail } from "../../agents/types/agent";
import { AgentAvatarIcon } from "../../agents/ui/agent-appearance";
import { getAgentAvatarColor } from "../../agents/ui/agent-avatar-color";
import {
  useConversationActions,
  useConversationMessages,
  useConversationSessions,
} from "../hooks/use-conversations";
import { useChatStream } from "../hooks/use-chat-stream";
import type { ChatMessage, ChatSession } from "../types/chat";
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

interface ActionError {
  announce: boolean;
  contextKey: string;
  message: string;
}

interface SelectionState {
  contextKey: string;
  sessionId: string | null;
}

function publicErrorMessage(_error: unknown, fallback: string) {
  return fallback;
}

function isGloballyAnnouncedServerError(error: unknown) {
  return error instanceof AppError && error.kind === "server" && (error.status ?? 0) >= 500;
}

export function ChatExperience(props: ChatExperienceProps) {
  const contextKey = `${props.workspaceId}:${props.agentId ?? ""}`;
  return <ContextualChatExperience key={contextKey} {...props} />;
}

function ContextualChatExperience({
  agent,
  agentId,
  agentLoading,
  ariaLabel,
  backHref,
  backLabel,
  workspaceId,
}: ChatExperienceProps) {
  const { t } = useTranslation();
  const contextKey = `${workspaceId}:${agentId ?? ""}`;
  const sessionsQuery = useConversationSessions(workspaceId, agentId);
  const actions = useConversationActions(workspaceId, agentId);
  const [selection, setSelection] = useState<SelectionState>({ contextKey, sessionId: null });
  const [actionErrorState, setActionError] = useState<ActionError | null>(null);
  const selectedSessionId = selection.contextKey === contextKey ? selection.sessionId : null;
  const actionError = actionErrorState?.contextKey === contextKey ? actionErrorState : null;
  const sessions = sessionsQuery.data ?? EMPTY_SESSIONS;
  const activeSessionId = selectedSessionId && sessions.some((session) => session.id === selectedSessionId)
    ? selectedSessionId
    : sessions.at(0)?.id ?? null;
  const mountedRef = useRef(true);
  const createRequestRef = useRef(0);
  const deleteRequestRef = useRef(0);
  const interactionGenerationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      createRequestRef.current += 1;
      deleteRequestRef.current += 1;
    };
  }, []);

  const messagesQuery = useConversationMessages(workspaceId, agentId, activeSessionId);
  const refetchMessages = messagesQuery.refetch;
  const reloadMessages = useCallback(async () => {
    await refetchMessages();
  }, [refetchMessages]);
  const stream = useChatStream({
    agentId,
    persistedMessages: messagesQuery.data ?? EMPTY_MESSAGES,
    failureMessage: t("CHAT_UI.MESSAGE_LOAD_ERROR"),
    reloadMessages,
    sessionId: activeSessionId,
    workspaceId,
  });

  const createSession = async () => {
    const interactionGeneration = interactionGenerationRef.current + 1;
    interactionGenerationRef.current = interactionGeneration;
    const requestContext = contextKey;
    const requestToken = createRequestRef.current + 1;
    createRequestRef.current = requestToken;
    setActionError(null);
    try {
      const created = await actions.create.mutateAsync({});
      if (!mountedRef.current
        || createRequestRef.current !== requestToken
        || interactionGenerationRef.current !== interactionGeneration) return;
      setSelection({ contextKey: requestContext, sessionId: created.id });
    } catch (error) {
      if (!mountedRef.current
        || createRequestRef.current !== requestToken
        || interactionGenerationRef.current !== interactionGeneration) return;
      setActionError({
        announce: !isGloballyAnnouncedServerError(error),
        contextKey: requestContext,
        message: publicErrorMessage(error, t("CHAT_UI.CREATE_FAILED")),
      });
    }
  };
  const deleteSession = async (session: ChatSession) => {
    if (!window.confirm(t("CHAT_UI.DELETE_CONFIRM", { title: session.title }))) return;
    const interactionGeneration = interactionGenerationRef.current + 1;
    interactionGenerationRef.current = interactionGeneration;
    const requestContext = contextKey;
    const requestToken = deleteRequestRef.current + 1;
    const deletingActiveSession = activeSessionId === session.id;
    const deletedIndex = sessions.findIndex((item) => item.id === session.id);
    const fallbackSessionId = deletedIndex < 0
      ? null
      : sessions[deletedIndex + 1]?.id ?? sessions[deletedIndex - 1]?.id ?? null;
    deleteRequestRef.current = requestToken;
    setActionError(null);
    try {
      const deleted = await actions.remove.mutateAsync(session.id);
      if (!mountedRef.current
        || deleteRequestRef.current !== requestToken
        || interactionGenerationRef.current !== interactionGeneration) return;
      if (!deleted) {
        setActionError({ announce: true, contextKey: requestContext, message: t("CHAT_UI.DELETE_FAILED") });
      } else if (deletingActiveSession) {
        setSelection({ contextKey: requestContext, sessionId: fallbackSessionId });
      }
    } catch (error) {
      if (!mountedRef.current
        || deleteRequestRef.current !== requestToken
        || interactionGenerationRef.current !== interactionGeneration) return;
      setActionError({
        announce: !isGloballyAnnouncedServerError(error),
        contextKey: requestContext,
        message: publicErrorMessage(error, t("CHAT_UI.DELETE_FAILED")),
      });
    }
  };

  return (
    <section aria-label={ariaLabel} className="mx-auto grid min-h-[calc(100vh-10rem)] w-full max-w-[96rem] overflow-hidden border-y border-ui-divider bg-ui-raised/35 lg:h-[calc(100dvh-8rem)] lg:min-h-[36rem] lg:grid-cols-[19rem_minmax(0,1fr)]" role="region">
      <ConversationSidebar
        activeSessionId={activeSessionId}
        backHref={backHref}
        backLabel={backLabel}
        creating={actions.create.isPending}
        deleting={actions.remove.isPending}
        error={sessionsQuery.isError ? publicErrorMessage(sessionsQuery.error, t("CHAT_UI.HISTORY_LOAD_ERROR")) : null}
        errorAnnounce={!isGloballyAnnouncedServerError(sessionsQuery.error)}
        loading={sessionsQuery.isPending}
        onCreate={() => void createSession()}
        onDelete={(session) => void deleteSession(session)}
        onRetry={() => void sessionsQuery.refetch()}
        onSelect={(sessionId) => {
          interactionGenerationRef.current += 1;
          setSelection({ contextKey, sessionId });
        }}
        sessions={sessions}
      />

      <div className="flex min-h-[36rem] min-w-0 flex-col bg-ui-canvas h-[calc(100dvh-8rem)] lg:h-full lg:min-h-0">
        <header className="flex min-h-16 items-center border-b border-ui-divider bg-ui-raised px-5">
          {agentLoading ? <div className="w-52"><Skeleton label={t("AGENTS_UI.LOADING_CARD")} lines={2} /></div> : agent ? (
            <div className="flex items-center gap-3">
              <div aria-hidden className={`flex h-10 w-10 items-center justify-center rounded-xl ${getAgentAvatarColor(agent.avatar_color)}`}>
                <AgentAvatarIcon className="h-5 w-5" icon={agent.avatar_icon} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-ui-ink">{agent.name}</h1>
                <p className="mt-0.5 text-xs text-ui-ink-muted">{t("CHAT_UI.READY_ON_MODEL", { model: agent.model_name })}</p>
              </div>
            </div>
          ) : null}
        </header>

        {actionError ? <p className="m-4 rounded-ui-control border border-state-danger bg-state-danger-soft p-3 text-sm text-state-danger" role={actionError.announce ? "alert" : undefined}>{actionError.message}</p> : null}
        <ConversationMessages
          activeSessionId={activeSessionId}
          agent={agent}
          error={messagesQuery.isError ? publicErrorMessage(messagesQuery.error, t("CHAT_UI.MESSAGE_LOAD_ERROR")) : null}
          errorAnnounce={!isGloballyAnnouncedServerError(messagesQuery.error)}
          loading={messagesQuery.isPending}
          messages={stream.messages}
          onRetry={() => void messagesQuery.refetch()}
          status={stream.status}
        />
        {activeSessionId && agent ? (
          <>
            {stream.error && stream.canRetry ? (
              <div className="border-t border-ui-line bg-state-danger-soft px-4 py-2 text-center">
                <Button aria-label={t("CHAT_UI.RETRY_MESSAGE")} onClick={() => void stream.retry()} variant="secondary">{t("CHAT_UI.RETRY_MESSAGE")}</Button>
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
