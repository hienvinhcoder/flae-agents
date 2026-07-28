import { Link } from 'react-router-dom';

import { Badge } from '../../../shared/ui/Badge';
import { Card } from '../../../shared/ui/Card';
import type { AgentStatus, DashboardAgent } from '../types/dashboard';

export interface ConnectedAgentsPanelProps {
  agents: readonly DashboardAgent[];
  statusLabels: Record<AgentStatus, string>;
  title: string;
  viewLabel: string;
}

export function ConnectedAgentsPanel({
  agents,
  statusLabels,
  title,
  viewLabel,
}: ConnectedAgentsPanelProps) {
  return (
    <Card as="section" aria-labelledby="connected-agents-title">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold" id="connected-agents-title">
          {title}
        </h2>
        <Link className="shrink-0 text-sm text-ui-link" to="/dashboard/agents">
          {viewLabel}
        </Link>
      </div>
      <ul className="mt-4 grid gap-3">
        {agents.map((agent) => (
          <li className="flex items-center gap-3" key={agent.id}>
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-ui-control bg-ui-interactive text-xs font-semibold"
            >
              {agent.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{agent.name}</strong>
              <span className="block text-xs text-ui-ink-muted">{agent.role}</span>
            </span>
            <Badge variant={agent.status === 'active' ? 'success' : 'neutral'}>
              {statusLabels[agent.status]}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
