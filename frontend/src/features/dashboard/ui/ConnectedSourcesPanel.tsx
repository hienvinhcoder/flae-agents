import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import type { DashboardSource, SourceStatus } from '../types/dashboard';

export interface ConnectedSourcesPanelProps {
  demoLabel: string;
  description: string;
  manageLabel: string;
  sources: readonly DashboardSource[];
  statusLabels: Record<SourceStatus, string>;
  title: string;
}

export function ConnectedSourcesPanel({
  demoLabel,
  description,
  manageLabel,
  sources,
  statusLabels,
  title,
}: ConnectedSourcesPanelProps) {
  return (
    <Card as="section" aria-labelledby="connected-sources-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold" id="connected-sources-title">
            {title}
          </h2>
          <p className="mt-1 text-sm text-ui-ink-muted">{description}</p>
        </div>
        <Button
          className="disabled:opacity-100"
          disabled
          title={demoLabel}
          variant="outline"
        >
          {manageLabel}
        </Button>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {sources.map((source) => (
          <li className="rounded-ui-panel border border-ui-divider p-4 transition-colors duration-200 hover:border-primary/50 motion-reduce:transition-none" key={source.id}>
            <div className="flex items-center justify-between gap-3">
              <span
                aria-hidden
                className="grid h-9 w-9 place-items-center rounded-ui-control bg-ui-interactive text-sm font-semibold"
              >
                {source.mark}
              </span>
              <Badge variant={source.status === 'connected' ? 'success' : 'neutral'}>
                {statusLabels[source.status]}
              </Badge>
            </div>
            <strong className="mt-3 block text-sm">{source.name}</strong>
            <span className="mt-1 block text-xs text-ui-ink-muted">{source.detail}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
