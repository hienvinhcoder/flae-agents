import { Send, Square } from "lucide-react";
import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import type { StreamStatus } from "../types/stream";

const COMPOSER_MAX_HEIGHT = 144;

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [input]);

  return (
    <footer className="relative px-4 pb-5 pt-2 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-background to-transparent" />
      <form
        className="glass-panel-strong mx-auto flex max-w-3xl items-end gap-2 rounded-ui-panel p-2 pl-4 shadow-ui-glass-pop"
        data-testid="chat-composer"
        onSubmit={onSubmit}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("CHAT_UI.MESSAGE_AGENT", { name: agentName })}</span>
          <textarea
            className="max-h-36 min-h-11 w-full resize-none bg-transparent py-2.5 pr-2 text-[15px] leading-6 text-ui-ink outline-none placeholder:text-ui-ink-muted"
            disabled={disabled}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("CHAT_UI.ASK_AGENT", { name: agentName })}
            ref={textareaRef}
            rows={1}
            value={input}
          />
        </label>
        {active ? (
          <Button aria-label={t("CHAT_UI.STOP_RESPONSE")} onClick={onStop} pill size="icon" type="button" variant="secondary">
            <Square aria-hidden className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button aria-label={t("CHAT_UI.SEND_MESSAGE")} disabled={disabled || !input.trim()} pill size="icon" type="submit">
            <Send aria-hidden className="h-4 w-4" />
          </Button>
        )}
      </form>
    </footer>
  );
}
