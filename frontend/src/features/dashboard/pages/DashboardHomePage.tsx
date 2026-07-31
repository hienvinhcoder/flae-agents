import { useTranslation } from 'react-i18next';

import { createDashboardFixture } from '../dashboard-fixture';
import { AgentContextPanel } from '../ui/AgentContextPanel';
import { ConnectedAgentsPanel } from '../ui/ConnectedAgentsPanel';
import { ConnectedSourcesPanel } from '../ui/ConnectedSourcesPanel';
import { DashboardHero } from '../ui/DashboardHero';
import { KnowledgeGraphPreview } from '../ui/KnowledgeGraphPreview';
import { RecentMemoryPanel } from '../ui/RecentMemoryPanel';
import { RisksPanel } from '../ui/RisksPanel';

export function DashboardHomePage() {
  const { t } = useTranslation();
  const fixture = createDashboardFixture(t);
  const demoLabel = t('DASHBOARD_HOME.DEMO_ONLY');

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-6">
      <DashboardHero demoLabel={demoLabel} hero={fixture.hero} metrics={fixture.metrics} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <KnowledgeGraphPreview
          exploreLabel={t('DASHBOARD_HOME.EXPLORE')}
          graph={fixture.graph}
        />
        <RecentMemoryPanel
          items={fixture.recentMemory}
          title={t('DASHBOARD_HOME.RECENT_MEMORY')}
          viewAllLabel={t('DASHBOARD_HOME.VIEW_ALL')}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <AgentContextPanel
          copyLabel={t('DASHBOARD_HOME.COPY_CONNECTION')}
          demoLabel={demoLabel}
          description={fixture.agentContext.description}
          title={fixture.agentContext.title}
        />
        <ConnectedAgentsPanel
          agents={fixture.agents}
          statusLabels={{
            active: t('DASHBOARD_HOME.STATUS_ACTIVE'),
            idle: t('DASHBOARD_HOME.STATUS_IDLE'),
          }}
          title={t('DASHBOARD_HOME.CONNECTED_AGENTS')}
          viewLabel={t('DASHBOARD_HOME.VIEW_AGENTS')}
        />
        <RisksPanel
          noticeLabel={t('DASHBOARD_HOME.NOTICE')}
          risks={fixture.risks}
          title={t('DASHBOARD_HOME.RISKS')}
          warningLabel={t('DASHBOARD_HOME.WARNING')}
        />
      </div>
      <ConnectedSourcesPanel
        demoLabel={demoLabel}
        description={t('DASHBOARD_HOME.CONNECTED_SOURCES_DESCRIPTION')}
        manageLabel={t('DASHBOARD_HOME.MANAGE_CONNECTORS')}
        sources={fixture.sources}
        statusLabels={{
          available: t('DASHBOARD_HOME.STATUS_AVAILABLE'),
          connected: t('DASHBOARD_HOME.STATUS_CONNECTED'),
        }}
        title={t('DASHBOARD_HOME.CONNECTED_SOURCES')}
      />
    </div>
  );
}
