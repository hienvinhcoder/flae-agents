import { Bot } from 'lucide-react';

import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';

export interface AgentContextPanelProps {
  copyLabel: string;
  demoLabel: string;
  description: string;
  title: string;
}

export function AgentContextPanel({
  copyLabel,
  demoLabel,
  description,
  title,
}: AgentContextPanelProps) {
  return (
    <Card as="section" aria-label={title} variant="inverse">
      <Bot aria-hidden className="h-5 w-5 text-primary" />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-sidebar-foreground/70">{description}</p>
      <Button
        className="mt-5 disabled:opacity-100"
        disabled
        title={demoLabel}
        variant="primary"
      >
        {copyLabel}
      </Button>
    </Card>
  );
}
