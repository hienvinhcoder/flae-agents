import {
  Bot,
  FileText,
  GitBranch,
  Plug,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import { Card } from '../../../shared/ui/Card';
import type {
  DashboardFixture,
  DashboardIcon,
  DashboardMetric,
} from '../types/dashboard';

const metricIcons: Record<DashboardIcon, LucideIcon> = {
  agents: Bot,
  documents: FileText,
  memory: Workflow,
  people: Users,
  repositories: GitBranch,
  sources: Plug,
};

export interface DashboardHeroProps {
  demoLabel: string;
  hero: DashboardFixture['hero'];
  metrics: readonly DashboardMetric[];
}

export function DashboardHero({ demoLabel, hero, metrics }: DashboardHeroProps) {
  return (
    <Card
      as="section"
      aria-labelledby="dashboard-welcome"
      className="relative overflow-hidden p-6 sm:p-8"
      variant="inverse"
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-ui-status bg-sidebar-accent px-3 py-1 text-xs">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
            {hero.syncStatus}
          </div>
          <h1
            className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
            id="dashboard-welcome"
          >
            {hero.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-sidebar-foreground/70 sm:text-base">
            {hero.description}{' '}
            <strong className="font-medium text-brand">{hero.emphasis}</strong>.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {hero.prompts.map((prompt) => (
              <button
                className="min-h-10 rounded-ui-status bg-sidebar-accent px-3 py-2 text-xs text-sidebar-foreground/80 disabled:cursor-not-allowed disabled:opacity-100"
                disabled
                key={prompt}
                title={demoLabel}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => {
            const Icon = metricIcons[metric.icon];
            return (
              <div
                className="rounded-ui-panel border border-sidebar-border bg-sidebar-accent/60 p-3"
                key={metric.id}
              >
                <Icon aria-hidden className="h-4 w-4 text-brand" />
                <strong className="mt-2 block text-lg">{metric.value}</strong>
                <span className="text-xs text-sidebar-foreground/60">{metric.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
