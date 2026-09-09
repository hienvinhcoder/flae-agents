export type Locale = "en" | "vi";

export interface Dictionary {
  common: {
    connectMemory: string;
    connectMemoryFree: string;
    signIn: string;
    startFree: string;
    startTrial: string;
    exploreMcp: string;
    exploreMcpDocs: string;
    allSystemsOperational: string;
    viewArchitecture: string;
    copied: string;
    copyConfig: string;
    latency: string;
    verifiedFact: string;
    continuousSync: string;
  };
  announcement: {
    tag: string;
    message: string;
    messageMobile: string;
    action: string;
  };
  nav: {
    product: string;
    useCases: string;
    integrations: string;
    forAgents: string;
    security: string;
    pricing: string;
    signIn: string;
    startBuildingMemory: string;
  };
  hero: {
    eyebrow: string;
    titleStart: string;
    titleHighlight: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    connectorsLabel: string;
  };
  heroDemo: {
    windowTitle: string;
    workspaceName: string;
    statusLabel: string;
    question: string;
    askerLabel: string;
    answerTitle: string;
    answerStatus: string;
    answerDetail: string;
    staleAlertBadge: string;
    sourcesTitle: string;
    sources: {
      id: string;
      title: string;
      source: string;
      timestamp: string;
      type: "pr" | "code" | "doc";
      badge: string;
    }[];
    graph: {
      title: string;
      nodes: {
        id: string;
        label: string;
        type: "pr" | "api" | "doc" | "file";
      }[];
      edges: {
        from: string;
        to: string;
        relation: string;
      }[];
    };
  };
  contextTimeline: {
    badge: string;
    title: string;
    subtitle: string;
    timeline: {
      source: string;
      badge: string;
      badgeType: "decision" | "code" | "doc";
      quote: string;
      subtext: string;
    }[];
    summary: {
      label: string;
      heading: string;
      detail: string;
    };
  };
  differentiators: {
    badge: string;
    title: string;
    subtitle: string;
    pillars: {
      id: string;
      title: string;
      description: string;
      visualFlow: string[];
      highlightBadge: string;
    }[];
  };
  techComparison: {
    badge: string;
    title: string;
    subtitle: string;
    conventionalHeader: string;
    flaeHeader: string;
    rows: {
      dimension: string;
      conventional: string;
      flae: string;
    }[];
    footnote: string;
  };
  agentMemory: {
    badge: string;
    title: string;
    subtitle: string;
    mcpBadge: string;
    mcpTitle: string;
    mcpSubtitle: string;
    connectedAgents: {
      id: string;
      name: string;
      role: string;
    }[];
    connectedSources: string[];
    capabilities: {
      title: string;
      description: string;
    }[];
  };
  useCases: {
    badge: string;
    title: string;
    subtitle: string;
    questionLabel: string;
    reasoningLabel: string;
    evidenceLabel: string;
    tabs: {
      id: string;
      label: string;
      role: string;
      question: string;
      flaeAnswer: string;
      reasoningChain: string[];
      evidence: string[];
    }[];
  };
  howItWorks: {
    badge: string;
    title: string;
    subtitle: string;
    stagePrefix: string;
    steps: {
      step: number;
      title: string;
      subtitle: string;
      description: string;
      bullets: string[];
    }[];
  };
  integrations: {
    badge: string;
    title: string;
    subtitle: string;
    filters: {
      all: string;
      docs: string;
      code: string;
      chat: string;
    };
    liveSynced: string;
    securityBanner: {
      title: string;
      description: string;
      cta: string;
    };
    items: {
      id: string;
      name: string;
      category: "docs" | "code" | "chat";
      description: string;
      syncType: string;
      itemsCount: string;
    }[];
  };
  architecture: {
    badge: string;
    title: string;
    subtitle: string;
    pillars: {
      title: string;
      subtitle: string;
      description: string;
      tags: string[];
    }[];
  };
  pricing: {
    badge: string;
    title: string;
    subtitle: string;
    billingToggle: {
      monthly: string;
      annual: string;
      saveBadge: string;
    };
    mostPopular: string;
    includedCapabilities: string;
    foreverFree: string;
    perMonth: string;
    annualBilling: string;
    plans: {
      id: string;
      name: string;
      tagline: string;
      price: string;
      period: string;
      ctaText: string;
      features: string[];
    }[];
  };
  faq: {
    badge: string;
    title: string;
    subtitle: string;
    items: {
      question: string;
      answer: string;
    }[];
  };
  footer: {
    ctaBadge: string;
    ctaTitleStart: string;
    ctaTitleHighlight: string;
    ctaSubtitle: string;
    ctaButton: string;
    ctaButtonSecondary: string;
    ctaNote: string;
    brandSummary: string;
    columns: {
      product: {
        title: string;
        howItWorks: string;
        whyFlae: string;
        connectors: string;
        architecture: string;
        pricing: string;
      };
      agents: {
        title: string;
        claude: string;
        chatgpt: string;
        copilot: string;
        provenance: string;
        openCore: string;
      };
      security: {
        title: string;
        rbac: string;
        sync: string;
        enterprise: string;
        privacy: string;
        terms: string;
      };
    };
    craftedText: string;
    allRightsReserved: string;
  };
}
