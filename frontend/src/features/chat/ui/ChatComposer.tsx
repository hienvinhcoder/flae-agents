import { Send, Square } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import type { StreamStatus } from "../types/stream";

interface ChatComposerProps {
  agentName: string;
  disabled?: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  status: StreamStatus;
}

export function ChatComposer({ agentName, disabled, onSend, onStop, status }: ChatComposerProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const active = status === "connecting" || status === "streaming";
  const submit = () => {
    if (active || disabled || !input.trim()) return;
    onSend(input);
    setInput("");
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <footer className="border-t border-ui-divider bg-ui-raised p-3 sm:p-4">
      <form className="mx-auto flex max-w-4xl items-end gap-2 border border-ui-divider bg-ui-canvas p-2 shadow-sm" onSubmit={onSubmit}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("CHAT_UI.MESSAGE_AGENT", { name: agentName })}</span>
          <textarea
            className="max-h-36 min-h-11 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-ui-ink outline-none placeholder:text-ui-ink-muted"
            disabled={disabled}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("CHAT_UI.ASK_AGENT", { name: agentName })}
            rows={1}
            value={input}
          />
        </label>
        {active ? (
          <Button aria-label={t("CHAT_UI.STOP_RESPONSE")} onClick={onStop} type="button" variant="secondary">
            <Square aria-hidden className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button aria-label={t("CHAT_UI.SEND_MESSAGE")} disabled={disabled || !input.trim()} type="submit">
            <Send aria-hidden className="h-4 w-4" />
          </Button>
        )}
      </form>
    </footer>
  );
}
