import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppError } from "../../../core/api/errors";
import { Button } from "../../../shared/ui/Button";
import { Toast, ToastViewport } from "../../../shared/ui/Toast";
import type { AgentDetail } from "../../agents/types/agent";
import {
  useConversationActions,
  useConversationMessages,
  useConversationSessions,
} from "../hooks/use-conversations";
import { useChatStream } from "../hooks/use-chat-stream";
import type { ChatMessage, ChatSession } from "../types/chat";
import { ChatComposer } from "./ChatComposer";
import { ChatToolbar } from "./ChatToolbar";
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const selectedSessionId = selection.contextKey === contextKey ? selection.sessionId : null;
  const actionError = actionErrorState?.contextKey === contextKey ? actionErrorState : null;
  const sessions = sessionsQuery.data ?? EMPTY_SESSIONS;
  const activeSessionId = selectedSessionId && sessions.some((session) => session.id === selectedSessionId)
    ? selectedSessionId
    : sessions.at(0)?.id ?? null;
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
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

  if (sessionsQuery.isError && !historyOpen) {
    setHistoryOpen(true);
  }

  useEffect(() => {
    if (!historyOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [historyOpen]);

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
    <section
      aria-label={ariaLabel}
      className="relative flex h-full min-h-[32rem] w-full min-w-0 flex-col overflow-hidden"
      role="region"
    >
      <ChatToolbar
        agent={agent}
        agentLoading={agentLoading}
        backHref={backHref}
        backLabel={backLabel}
        creating={actions.create.isPending}
        historyOpen={historyOpen}
        onCreate={() => void createSession()}
        onToggleHistory={() => setHistoryOpen((open) => !open)}
        sessionTitle={activeSession?.title ?? null}
      />
      {actionError ? (
        <p
          className="mx-4 mt-3 rounded-ui-control border border-state-danger bg-state-danger-soft px-3 py-2 text-sm text-state-danger"
          role={actionError.announce ? "alert" : undefined}
        >
          {actionError.message}
        </p>
      ) : null}
      <div className="relative flex min-h-0 flex-1">
        <ConversationSidebar
          activeSessionId={activeSessionId}
          deleting={actions.remove.isPending}
          error={sessionsQuery.isError ? publicErrorMessage(sessionsQuery.error, t("CHAT_UI.HISTORY_LOAD_ERROR")) : null}
          errorAnnounce={!isGloballyAnnouncedServerError(sessionsQuery.error)}
          loading={sessionsQuery.isPending}
          onClose={() => setHistoryOpen(false)}
          onDelete={(session) => void deleteSession(session)}
          onRetry={() => void sessionsQuery.refetch()}
          onSelect={(sessionId) => {
            interactionGenerationRef.current += 1;
            setSelection({ contextKey, sessionId });
            if (!window.matchMedia?.("(min-width: 48rem)")?.matches) setHistoryOpen(false);
          }}
          open={historyOpen}
          sessions={sessions}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ConversationMessages
            activeSessionId={activeSessionId}
            activeToolName={stream.activeToolName}
            agent={agent}
            error={messagesQuery.isError ? publicErrorMessage(messagesQuery.error, t("CHAT_UI.MESSAGE_LOAD_ERROR")) : null}
            errorAnnounce={!isGloballyAnnouncedServerError(messagesQuery.error)}
            loading={messagesQuery.isPending}
            messages={stream.messages}
            onPromptSelect={(prompt) => void stream.send(prompt)}
            onRetry={() => void messagesQuery.refetch()}
            status={stream.status}
          />
          {activeSessionId && agent ? (
            <>
              {stream.error && stream.canRetry ? (
                <div className="px-4 py-2 text-center">
                  <Button aria-label={t("CHAT_UI.RETRY_MESSAGE")} onClick={() => void stream.retry()} variant="secondary">
                    {t("CHAT_UI.RETRY_MESSAGE")}
                  </Button>
                </div>
              ) : null}
              <ChatComposer agentName={agent.name} onSend={(message) => void stream.send(message)} onStop={stream.stop} status={stream.status} />
            </>
          ) : null}
        </div>
      </div>
      {stream.error ? (
        <ToastViewport><Toast duration={0} message={stream.error} tone="error" /></ToastViewport>
      ) : null}
    </section>
  );
}
