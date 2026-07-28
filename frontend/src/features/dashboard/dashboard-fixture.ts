import type { TFunction } from 'i18next';

import type { DashboardFixture } from './types/dashboard';

export function createDashboardFixture(t: TFunction): DashboardFixture {
  return {
    agentContext: {
      description: t('DASHBOARD_HOME.AGENT_CONTEXT_DESCRIPTION'),
      title: t('DASHBOARD_HOME.AGENT_CONTEXT'),
    },
    agents: [
      { id: 'codex', name: 'Codex', role: 'Repo assistant', status: 'active' },
      { id: 'cursor', name: 'Cursor', role: 'Engineering', status: 'idle' },
      { id: 'openclaw', name: 'OpenClaw', role: 'Ops automation', status: 'active' },
    ],
    graph: {
      description: t('DASHBOARD_HOME.KNOWLEDGE_GRAPH_DESCRIPTION'),
      nodes: [
        { id: 'memory', kind: 'memory', label: 'Company Memory' },
        { id: 'pricing', kind: 'decision', label: 'Q3 Pricing' },
        { id: 'payments', kind: 'project', label: 'Payments Migration' },
        { id: 'amelia', kind: 'person', label: 'Amelia Reed' },
        { id: 'security', kind: 'document', label: 'Enterprise Security' },
        { id: 'onboarding', kind: 'project', label: 'Onboarding v2' },
      ],
      title: t('DASHBOARD_HOME.KNOWLEDGE_GRAPH'),
    },
    hero: {
      description: t('DASHBOARD_HOME.DESCRIPTION'),
      emphasis: t('DASHBOARD_HOME.EMPHASIS'),
      prompts: [
        t('DASHBOARD_HOME.PROMPT_PRICING'),
        t('DASHBOARD_HOME.PROMPT_OWNER'),
        t('DASHBOARD_HOME.PROMPT_RISKS'),
      ],
      syncStatus: t('DASHBOARD_HOME.SYNC_STATUS'),
      title: t('DASHBOARD_HOME.WELCOME'),
    },
    metrics: [
      {
        icon: 'documents',
        id: 'documents',
        label: t('DASHBOARD_HOME.DOCUMENTS'),
        value: '12.4k',
      },
      {
        icon: 'repositories',
        id: 'repositories',
        label: t('DASHBOARD_HOME.REPOSITORIES'),
        value: '38',
      },
      {
        icon: 'people',
        id: 'people',
        label: t('DASHBOARD_HOME.PEOPLE'),
        value: '214',
      },
      {
        icon: 'memory',
        id: 'memory-nodes',
        label: t('DASHBOARD_HOME.MEMORY_NODES'),
        value: '42.1k',
      },
    ],
    recentMemory: [
      {
        id: 'pricing-decision',
        source: 'Notion',
        status: 'Decision',
        title: 'Q3 pricing decision',
        updatedAt: '4m ago',
      },
      {
        id: 'payments-plan',
        source: 'GitHub',
        status: 'Project',
        title: 'Payments migration plan',
        updatedAt: '9m ago',
      },
      {
        id: 'security-notes',
        source: 'Drive',
        status: 'Document',
        title: 'Enterprise security notes',
        updatedAt: '12m ago',
      },
    ],
    risks: [
      {
        id: 'stale-ownership',
        label: 'Stale ownership on 3 critical docs',
        severity: 'warning',
      },
      {
        id: 'missing-decision',
        label: 'Undocumented decision in #leadership',
        severity: 'neutral',
      },
      {
        id: 'duplicate-specs',
        label: 'Duplicate specs for onboarding v2',
        severity: 'neutral',
      },
    ],
    sources: [
      {
        detail: '8,214 files · synced 2m ago',
        id: 'drive',
        mark: 'G',
        name: 'Google Drive',
        status: 'connected',
      },
      {
        detail: '1,982 pages · synced 4m ago',
        id: 'notion',
        mark: 'N',
        name: 'Notion',
        status: 'connected',
      },
      {
        detail: '42 channels · streaming',
        id: 'slack',
        mark: 'S',
        name: 'Slack',
        status: 'connected',
      },
      {
        detail: '38 repos · 12 PRs today',
        id: 'github',
        mark: 'G',
        name: 'GitHub',
        status: 'connected',
      },
      {
        detail: '612 issues · synced 8m ago',
        id: 'linear',
        mark: 'L',
        name: 'Linear',
        status: 'connected',
      },
      {
        detail: 'Not connected',
        id: 'confluence',
        mark: 'C',
        name: 'Confluence',
        status: 'available',
      },
      {
        detail: 'Not connected',
        id: 'jira',
        mark: 'J',
        name: 'Jira',
        status: 'available',
      },
      {
        detail: 'Not connected',
        id: 'figma',
        mark: 'F',
        name: 'Figma',
        status: 'available',
      },
    ],
  };
}
