import { Link } from 'react-router-dom';

import { Card } from '../../../shared/ui/Card';
import type { DashboardFixture } from '../types/dashboard';

export interface KnowledgeGraphPreviewProps {
  exploreLabel: string;
  graph: DashboardFixture['graph'];
}

export function KnowledgeGraphPreview({ exploreLabel, graph }: KnowledgeGraphPreviewProps) {
  return (
    <Card as="section" aria-labelledby="dashboard-graph-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold tracking-tight" id="dashboard-graph-title">
            {graph.title}
          </h2>
          <p className="mt-1 text-sm text-ui-ink-muted">{graph.description}</p>
        </div>
        <Link className="text-sm font-medium text-ui-link" to="/dashboard/knowledge/graph">
          {exploreLabel}
        </Link>
      </div>
      <div
        aria-label={graph.description}
        className="relative mt-5 min-h-64 overflow-hidden rounded-ui-panel border border-ui-divider bg-ui-interactive/50 p-4"
        role="img"
      >
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full text-ui-divider"
          viewBox="0 0 600 260"
        >
          <path
            d="M300 130 110 55M300 130 490 55M300 130 95 205M300 130 505 205M300 130 300 30"
            fill="none"
            stroke="currentColor"
          />
        </svg>
        <ul className="relative grid min-h-56 grid-cols-2 content-between gap-4 sm:grid-cols-3">
          {graph.nodes.map((node) => (
            <li
              className={
                node.kind === 'memory'
                  ? 'rounded-ui-panel border border-brand bg-brand px-3 py-2 text-center text-sm font-semibold text-brand-foreground'
                  : 'rounded-ui-panel border border-ui-divider bg-ui-raised px-3 py-2 text-center text-sm'
              }
              key={node.id}
            >
              {node.label}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
