import { useTranslation } from "react-i18next";

import type { AgentDetail } from "../../agents/types/agent";
import { AgentAvatarIcon } from "../../agents/ui/agent-appearance";
import { getAgentAvatarColor } from "../../agents/ui/agent-avatar-color";

const STARTER_PROMPT_KEYS = [
  "CHAT_UI.PROMPT_WHAT_CHANGED",
  "CHAT_UI.PROMPT_KEY_DECISIONS",
  "CHAT_UI.PROMPT_FIND_POLICY",
  "CHAT_UI.PROMPT_WHO_OWNS",
] as const;

interface ChatEmptyStateProps {
  agent?: AgentDetail;
  agentName: string;
  onPromptSelect?: (prompt: string) => void;
}

export function ChatEmptyState({ agent, agentName, onPromptSelect }: ChatEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-2xl px-2 text-center">
      <div
        aria-hidden
        className={`glass-chip mx-auto flex h-16 w-16 items-center justify-center rounded-ui-panel ${getAgentAvatarColor(agent?.avatar_color ?? "")}`}
      >
        <AgentAvatarIcon className="h-8 w-8" icon={agent?.avatar_icon ?? "bot"} />
      </div>
      <h2 className="mt-5 font-display text-2xl font-medium tracking-tight text-ui-ink">
        {t("CHAT_UI.START_WITH_AGENT", { name: agentName })}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ui-ink-secondary">{t("CHAT_UI.MEMORY_EMPTY_HINT")}</p>
      <p className="mt-1 text-sm text-ui-ink-muted">{t("CHAT_UI.NO_MESSAGES")}</p>
      {onPromptSelect ? (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {STARTER_PROMPT_KEYS.map((key) => {
            const prompt = t(key);
            return (
              <li key={key}>
                <button
                  className="glass-chip h-full w-full cursor-pointer rounded-ui-panel px-3.5 py-3 text-left text-sm leading-5 text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink"
                  onClick={() => onPromptSelect(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
