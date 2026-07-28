import { Link } from 'react-router-dom';

import { Badge } from '../../../shared/ui/Badge';
import { Card } from '../../../shared/ui/Card';
import type { DashboardMemoryUpdate } from '../types/dashboard';

export interface RecentMemoryPanelProps {
  items: readonly DashboardMemoryUpdate[];
  title: string;
  viewAllLabel: string;
}

export function RecentMemoryPanel({
  items,
  title,
  viewAllLabel,
}: RecentMemoryPanelProps) {
  return (
    <Card as="section" aria-labelledby="recent-memory-title">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold" id="recent-memory-title">
          {title}
        </h2>
        <Link className="shrink-0 text-sm text-ui-link" to="/dashboard/knowledge">
          {viewAllLabel}
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-ui-divider">
        {items.map((item) => (
          <li
            className="grid gap-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-3"
            key={item.id}
          >
            <strong className="text-sm">{item.title}</strong>
            <span className="text-xs text-ui-ink-muted">
              {item.source} · {item.updatedAt}
            </span>
            <Badge variant="primary">{item.status}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
