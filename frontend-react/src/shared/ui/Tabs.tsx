import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  content: ReactNode;
  disabled?: boolean;
  id: string;
  label: string;
}

export interface TabsProps {
  ariaLabel: string;
  defaultValue?: string;
  items: readonly TabItem[];
  onValueChange?: (value: string) => void;
}

export function Tabs({ ariaLabel, defaultValue, items, onValueChange }: TabsProps) {
  const instanceId = useId();
  const enabled = items.filter((item) => !item.disabled);
  const [value, setValue] = useState(defaultValue ?? enabled[0]?.id ?? '');
  const active = items.find((item) => item.id === value && !item.disabled) ?? enabled[0];

  const select = (item: TabItem) => {
    setValue(item.id);
    onValueChange?.(item.id);
    document.getElementById(`${instanceId}-${item.id}-tab`)?.focus();
  };

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, item: TabItem) => {
    const current = enabled.findIndex((candidate) => candidate.id === item.id);
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % enabled.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else return;
    event.preventDefault();
    const nextItem = enabled[next];
    if (nextItem) select(nextItem);
  };

  return (
    <div>
      <div aria-label={ariaLabel} className="flex gap-1 overflow-x-auto border-b border-ui-divider" role="tablist">
        {items.map((item) => (
          <button
            aria-controls={`${instanceId}-${item.id}-panel`}
            aria-selected={active?.id === item.id}
            className="min-h-11 shrink-0 border-b-2 border-transparent px-4 py-2 font-semibold text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink aria-selected:border-brand aria-selected:text-ui-ink disabled:text-ui-ink-disabled"
            disabled={item.disabled}
            id={`${instanceId}-${item.id}-tab`}
            key={item.id}
            onClick={() => select(item)}
            onKeyDown={(event) => navigate(event, item)}
            role="tab"
            tabIndex={active?.id === item.id ? 0 : -1}
            type="button"
          >{item.label}</button>
        ))}
      </div>
      {active ? <div aria-labelledby={`${instanceId}-${active.id}-tab`} className="py-4" id={`${instanceId}-${active.id}-panel`} role="tabpanel">{active.content}</div> : null}
    </div>
  );
}
