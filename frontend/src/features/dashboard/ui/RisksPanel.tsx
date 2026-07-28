import { Info, TriangleAlert } from 'lucide-react';

import { Card } from '../../../shared/ui/Card';
import type { DashboardRisk } from '../types/dashboard';

export interface RisksPanelProps {
  noticeLabel: string;
  risks: readonly DashboardRisk[];
  title: string;
  warningLabel: string;
}

export function RisksPanel({
  noticeLabel,
  risks,
  title,
  warningLabel,
}: RisksPanelProps) {
  return (
    <Card as="section" aria-labelledby="dashboard-risks-title">
      <h2 className="font-semibold" id="dashboard-risks-title">
        {title}
      </h2>
      <ul className="mt-4 grid gap-3">
        {risks.map((risk) => (
          <li
            className="flex items-start gap-3 rounded-ui-control bg-ui-interactive/70 p-3 text-sm"
            key={risk.id}
          >
            {risk.severity === 'warning' ? (
              <TriangleAlert
                aria-label={warningLabel}
                className="mt-0.5 h-4 w-4 shrink-0 text-state-warning"
              />
            ) : (
              <Info
                aria-label={noticeLabel}
                className="mt-0.5 h-4 w-4 shrink-0 text-ui-ink-muted"
              />
            )}
            <span>{risk.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
