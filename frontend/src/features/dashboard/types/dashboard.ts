export type AgentStatus = 'active' | 'idle';
export type DashboardIcon =
  | 'agents'
  | 'documents'
  | 'memory'
  | 'people'
  | 'repositories'
  | 'sources';
export type RiskSeverity = 'neutral' | 'warning';
export type SourceStatus = 'available' | 'connected';

export interface DashboardMetric {
  readonly icon: DashboardIcon;
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface DashboardGraphNode {
  readonly id: string;
  readonly kind: 'decision' | 'document' | 'memory' | 'person' | 'project';
  readonly label: string;
}

export interface DashboardMemoryUpdate {
  readonly id: string;
  readonly source: string;
  readonly status: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface DashboardAgent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly status: AgentStatus;
}

export interface DashboardRisk {
  readonly id: string;
  readonly label: string;
  readonly severity: RiskSeverity;
}

export interface DashboardSource {
  readonly detail: string;
  readonly id: string;
  readonly mark: string;
  readonly name: string;
  readonly status: SourceStatus;
}

export interface DashboardFixture {
  readonly agentContext: {
    readonly description: string;
    readonly title: string;
  };
  readonly agents: readonly DashboardAgent[];
  readonly graph: {
    readonly description: string;
    readonly nodes: readonly DashboardGraphNode[];
    readonly title: string;
  };
  readonly hero: {
    readonly description: string;
    readonly emphasis: string;
    readonly prompts: readonly string[];
    readonly syncStatus: string;
    readonly title: string;
  };
  readonly metrics: readonly DashboardMetric[];
  readonly recentMemory: readonly DashboardMemoryUpdate[];
  readonly risks: readonly DashboardRisk[];
  readonly sources: readonly DashboardSource[];
}
