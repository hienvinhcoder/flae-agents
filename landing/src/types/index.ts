export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  isExternal?: boolean;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: "docs" | "code" | "chat" | "tasks";
  description: string;
  syncType: "Realtime Webhook" | "Bidirectional Sync" | "Scheduled Delta";
  status: "synced" | "indexing" | "ready";
  itemsCount: string;
  icon: string;
}

export interface McpQueryScenario {
  id: string;
  question: string;
  toolCall: {
    tool: string;
    arguments: Record<string, unknown>;
  };
  provenance: {
    source: string;
    sourceType: "github" | "notion" | "slack" | "gdrive";
    path: string;
    snippet: string;
    verifiedScore: number;
    timestamp: string;
  }[];
  agentSynthesizedResponse: string;
  latencyMs: number;
  tokensIndexed: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  isPopular?: boolean;
  ctaText: string;
  ctaVariant: "primary" | "secondary";
  features: string[];
  specs: {
    documents: string;
    mcpQueries: string;
    connectors: string;
    support: string;
  };
}
