import { Dictionary } from "../types";

export const en: Dictionary = {
  common: {
    connectMemory: "Start Building",
    connectMemoryFree: "Start Building Free",
    signIn: "Sign in",
    startFree: "Start Building",
    startTrial: "Start 14-day Pro trial",
    exploreMcp: "Explore MCP Server",
    exploreMcpDocs: "MCP Docs & Integration",
    allSystemsOperational: "Context graph active · Realtime sync",
    viewArchitecture: "View System Architecture",
    copied: "Copied to clipboard",
    copyConfig: "Copy configuration",
    latency: "Avg latency",
    verifiedFact: "Source Verified",
    continuousSync: "Continuous sync",
  },
  announcement: {
    tag: "MCP Server v1.4",
    message: "Connect your company memory directly to Claude, Cursor & ChatGPT.",
    messageMobile: "MCP Server v1.4 is now live.",
    action: "View setup",
  },
  nav: {
    product: "Product",
    useCases: "Use Cases",
    integrations: "Integrations",
    forAgents: "For AI Agents",
    security: "Security",
    pricing: "Pricing",
    signIn: "Sign in",
    startBuildingMemory: "Start Building",
  },
  hero: {
    eyebrow: "LIVING CONTEXT FOR AI",
    titleStart: "Your AI shouldn't ",
    titleHighlight: "guess what your company knows.",
    subtitle:
      "FLAE connects your docs, conversations and code into a living knowledge layer — so ChatGPT, Claude, Cursor and your AI agents can answer with the right context and the source to prove it.",
    primaryCta: "Start Building",
    secondaryCta: "See a real answer",
    connectorsLabel: "Notion · Slack · Google Drive · GitHub · MCP",
  },
  heroDemo: {
    windowTitle: "Acme Corp / Live Company Context",
    workspaceName: "FLAE Context Inspector",
    statusLabel: "Context Graph Synchronized",
    askerLabel: "Engineer question via Cursor / Slack",
    question: "Is our billing API documentation still correct?",
    answerTitle: "FLAE Living Context",
    answerStatus: "Not anymore.",
    answerDetail:
      "PR #184 changed POST /billing/charge 3 days ago and added a required currency field. The current Notion documentation still describes the previous request schema.",
    staleAlertBadge: "Documentation Stale",
    sourcesTitle: "Traceable Evidence & Provenance",
    sources: [
      {
        id: "src-1",
        title: "PR #184: Add currency parameter to charge endpoint",
        source: "GitHub · Pull Request #184",
        timestamp: "Merged 3 days ago by Sarah Chen",
        type: "pr",
        badge: "Changed Endpoint",
      },
      {
        id: "src-2",
        title: "backend/app/api/v1/billing/routes.py",
        source: "GitHub · main branch",
        timestamp: "Commit 9a8c2f1 · Line 42-68",
        type: "code",
        badge: "Implemented Code",
      },
      {
        id: "src-3",
        title: "Billing API Reference v1.2",
        source: "Notion · Engineering Wiki",
        timestamp: "Updated 2 months ago",
        type: "doc",
        badge: "Possibly Stale Doc",
      },
    ],
    graph: {
      title: "Active Context Subgraph",
      nodes: [
        { id: "pr184", label: "GitHub PR #184", type: "pr" },
        { id: "api", label: "Billing Charge API", type: "api" },
        { id: "code", label: "billing/routes.py", type: "file" },
        { id: "notion", label: "Notion API Docs", type: "doc" },
      ],
      edges: [
        { from: "pr184", to: "api", relation: "changed" },
        { from: "api", to: "code", relation: "implemented_by" },
        { from: "api", to: "notion", relation: "documented_by (outdated)" },
      ],
    },
  },
  contextTimeline: {
    badge: "THE FLAE DIFFERENCE",
    title: "FLAE connects what happened, not just where it was written.",
    subtitle:
      "A decision may start in Slack, change in a GitHub PR, and still be documented incorrectly in Notion. FLAE connects those pieces into one traceable context.",
    timeline: [
      {
        source: "Slack · #eng-architecture",
        badge: "Decision",
        badgeType: "decision",
        quote: "“We'll move the billing charge API to require currency starting next sprint.”",
        subtext: "Agreed by Lead Architect & PM · 5 days ago",
      },
      {
        source: "GitHub · PR #184 Merged",
        badge: "Code Change",
        badgeType: "code",
        quote: "“Add currency parameter validation to POST /billing/charge schema.”",
        subtext: "Implemented in routes.py · 3 days ago",
      },
      {
        source: "Notion · Billing Docs",
        badge: "Documentation",
        badgeType: "doc",
        quote: "“POST /billing/charge takes amount (int) and customer_id (str).”",
        subtext: "Last modified 2 months ago · ⚠ Missing currency field",
      },
    ],
    summary: {
      label: "FLAE Current Understanding",
      heading: "Billing API v2 is active in production. Documentation is outdated.",
      detail:
        "When an engineer or AI assistant asks about the charge endpoint, FLAE synthesizes the live code and PR context while highlighting the discrepancy in Notion documentation.",
    },
  },
  differentiators: {
    badge: "CORE ADVANTAGES",
    title: "Three reasons standard search falls short",
    subtitle:
      "Traditional search matches keywords. FLAE maintains an evolving understanding of your company's relationships, changes, and source evidence.",
    pillars: [
      {
        id: "relationships",
        title: "Understand relationships, not just keywords",
        description:
          "FLAE understands how people, projects, decisions, documents, APIs, pull requests, and code relate to each other across silos.",
        visualFlow: ["Person", "Decision", "Project", "API", "Function", "PR", "Document"],
        highlightBadge: "Graph-structured Context",
      },
      {
        id: "time",
        title: "Know what changed — and when",
        description:
          "Every fact preserves its timestamp and provenance. When newer discussions conflict with older policies, FLAE highlights the tension rather than making blind assumptions.",
        visualFlow: ["2025 Handbook", "→ superseded / conflicts →", "2026 Slack decision", "→ implemented by →", "PR #184"],
        highlightBadge: "Temporal Provenance",
      },
      {
        id: "evidence",
        title: "Every answer comes with source evidence",
        description:
          "Important claims point back to the original Slack thread, document, commit, or pull request with deep-link citations.",
        visualFlow: ["Claim", "Direct Citation", "Original Slack Thread", "Verified Commit"],
        highlightBadge: "Grounded & Verifiable",
      },
    ],
  },
  techComparison: {
    badge: "SEARCH VS CONTEXT",
    title: "Search finds similar text. FLAE reconstructs the context.",
    subtitle:
      "Traditional AI search extracts isolated chunks. FLAE connects evidence, relationships, and temporal changes into a coherent company memory.",
    conventionalHeader: "Traditional AI Search / RAG",
    flaeHeader: "FLAE Living Context Layer",
    rows: [
      {
        dimension: "Data Model",
        conventional: "Finds semantically similar text chunks in vector space",
        flae: "Follows multi-hop relationships between facts, code, and people",
      },
      {
        dimension: "Cross-Source Synthesis",
        conventional: "Treats documents, chats, and repositories independently",
        flae: "Connects evidence across Slack, Notion, Drive, and GitHub",
      },
      {
        dimension: "Distant Evidence",
        conventional: "Easily misses relevant evidence outside the query window",
        flae: "Uses text and graph evidence to cross-check and complete reasoning",
      },
      {
        dimension: "Output & Grounding",
        conventional: "Returns raw retrieved chunks with potential hallucinations",
        flae: "Returns verified context + relationship graph + traceable provenance",
      },
    ],
    footnote:
      "Under the hood, FLAE uses bidirectional text–graph retrieval: graph structure helps identify better textual evidence, while textual evidence helps recover missing reasoning paths.",
  },
  agentMemory: {
    badge: "AI INFRASTRUCTURE",
    title: "One memory layer. Every AI agent.",
    subtitle:
      "Your team shouldn't rebuild company context for every assistant. FLAE exposes one continuously updated knowledge layer through MCP and APIs.",
    mcpBadge: "Model Context Protocol Native",
    mcpTitle: "Standardized Context Protocol (MCP)",
    mcpSubtitle: "Provide zero-friction corporate memory to Claude Desktop, Cursor, ChatGPT, and custom internal agents.",
    connectedAgents: [
      { id: "claude", name: "Claude Desktop", role: "Architecture & research queries" },
      { id: "cursor", name: "Cursor / VS Code", role: "Codebase & PR context in IDE" },
      { id: "chatgpt", name: "ChatGPT / OpenAI", role: "Team assistant & workflow drafting" },
      { id: "codex", name: "Codex / Custom Agents", role: "Automated triage & PR review" },
    ],
    connectedSources: ["Slack", "Notion", "Google Drive", "GitHub", "Jira", "Linear"],
    capabilities: [
      {
        title: "Single Source of Truth",
        description: "Update a document or merge code once; every AI assistant immediately receives the new context.",
      },
      {
        title: "Enterprise Permission Inheritance",
        description: "Respects existing workspace permissions so agents only access context the user is authorized to view.",
      },
      {
        title: "Zero Retraining Overhead",
        description: "No fine-tuning or costly vector index rebuilds. FLAE streams structured context at query time.",
      },
    ],
  },
  useCases: {
    badge: "MULTI-SOURCE REASONING",
    title: "Ask questions that normally require five people and ten tabs.",
    subtitle:
      "FLAE traverses discussions, pull requests, roadmaps, and technical specifications to synthesize answers with complete provenance.",
    questionLabel: "Question",
    reasoningLabel: "Context Reasoning Path",
    evidenceLabel: "Evidence Sources",
    tabs: [
      {
        id: "engineering",
        label: "Engineering",
        role: "Software Engineers & Tech Leads",
        question: "Why was /api/users changed last week?",
        flaeAnswer:
          "The endpoint schema was updated to support OAuth2 scopes following security review feedback in Slack #eng-sec, implemented in PR #312, and documented in the v2 Auth guide.",
        reasoningChain: ["Slack #eng-sec", "Security Decision", "PR #312", "Commit e4f91", "API Docs v2"],
        evidence: ["GitHub PR #312", "routes/auth.py", "Slack thread #eng-sec (Oct 14)"],
      },
      {
        id: "product",
        label: "Product",
        role: "Product Managers & Operations",
        question: "Why was the mobile launch moved to Q3?",
        flaeAnswer:
          "Launch date was adjusted by Sarah Chen on May 12 due to payment provider migration dependencies noted in the Q2 Roadmap review and tracked in Linear issue PAY-402.",
        reasoningChain: ["Roadmap Doc", "Linear PAY-402", "Sarah Chen (Decision)", "Slack #leadership"],
        evidence: ["Notion Q2 Roadmap v3", "Linear PAY-402", "Slack #launch-sync"],
      },
      {
        id: "leadership",
        label: "Leadership",
        role: "Founders & Engineering VPs",
        question: "What is blocking Project Atlas right now?",
        flaeAnswer:
          "Project Atlas is blocked by external SOC2 audit completion and pending review on PR #409 (SSO Integration) assigned to Alex Rivera.",
        reasoningChain: ["Jira ATLAS-104", "GitHub PR #409", "Alex Rivera (Assignee)", "Audit Spreadsheet"],
        evidence: ["GitHub PR #409", "Jira ATLAS-104", "Drive: SOC2 Readiness 2026"],
      },
      {
        id: "onboarding",
        label: "New Joiners",
        role: "New Hires & Team Transitions",
        question: "Give me the context I need to work on billing.",
        flaeAnswer:
          "Billing is owned by Team Alpha (Lead: David Kim). Architecture relies on Stripe webhook workers and async queue. Latest major decision was Stripe Tax migration last month.",
        reasoningChain: ["Team Directory", "Architecture RFC #14", "Stripe Migration PRs", "Open Epics"],
        evidence: ["Notion Billing Overview", "GitHub repo: billing-service", "Slack #team-alpha"],
      },
    ],
  },
  howItWorks: {
    badge: "HOW IT WORKS",
    title: "From scattered information to usable AI context",
    subtitle: "A continuous three-step pipeline turning your company exhaust into verifiable intelligence.",
    stagePrefix: "Step",
    steps: [
      {
        step: 1,
        title: "Connect where your company works",
        subtitle: "One-click OAuth Connectors",
        description:
          "Connect Slack, Notion, Google Drive, GitHub, and internal databases in minutes with read-only permissions.",
        bullets: [
          "Zero-friction OAuth integrations with granular scope control",
          "Continuous delta streaming without heavy webhook maintenance",
          "Strict data isolation and enterprise SOC2 compliance",
        ],
      },
      {
        step: 2,
        title: "FLAE continuously builds your company context",
        subtitle: "Bidirectional Text–Graph Synthesis",
        description:
          "Documents, conversations, code, people, and decisions become linked facts with full temporal provenance.",
        bullets: [
          "Extracts entities, relationships, and decisions across sources",
          "Maintains timestamped histories to detect stale documentation",
          "Cross-references code commits with architectural documents",
        ],
      },
      {
        step: 3,
        title: "Give that context to any AI",
        subtitle: "Direct Search, MCP & APIs",
        description:
          "Ask directly in the FLAE workspace, or expose the knowledge layer to Claude, Cursor, ChatGPT, and custom agents via MCP.",
        bullets: [
          "Native Model Context Protocol (MCP) server endpoints",
          "Rich citations and reasoning paths embedded in every prompt",
          "REST APIs and Webhooks for custom enterprise agents",
        ],
      },
    ],
  },
  integrations: {
    badge: "WORKPLACE CONNECTORS",
    title: "Connect where your team creates context",
    subtitle:
      "FLAE indexes documentation, discussion, and code while preserving fine-grained access permissions.",
    filters: {
      all: "All Sources",
      docs: "Documentation",
      code: "Code & Repos",
      chat: "Communication",
    },
    liveSynced: "Realtime delta sync",
    securityBanner: {
      title: "Enterprise Permission Inheritance",
      description: "Users only receive answers from documents and discussions they have permission to access.",
      cta: "Learn about RBAC & Isolation",
    },
    items: [
      {
        id: "slack",
        name: "Slack",
        category: "chat",
        description: "Indexes public channels, threaded discussions, and recorded decisions.",
        syncType: "Realtime WebSocket",
        itemsCount: "Live sync",
      },
      {
        id: "notion",
        name: "Notion",
        category: "docs",
        description: "Synchronizes workspaces, nested wikis, roadmap tables, and databases.",
        syncType: "Delta Webhook",
        itemsCount: "Full hierarchy",
      },
      {
        id: "github",
        name: "GitHub",
        category: "code",
        description: "Indexes repositories, pull request reviews, commit histories, and issues.",
        syncType: "Webhook + Event API",
        itemsCount: "Code & PRs",
      },
      {
        id: "gdrive",
        name: "Google Drive",
        category: "docs",
        description: "Extracts context from Docs, Sheets, Slides, and shared company folders.",
        syncType: "Continuous Polling",
        itemsCount: "Docs & Sheets",
      },
      {
        id: "mcp",
        name: "Model Context Protocol",
        category: "code",
        description: "Universal standard to connect FLAE to Claude Desktop, Cursor, and IDEs.",
        syncType: "MCP JSON-RPC",
        itemsCount: "Standardized",
      },
      {
        id: "linear",
        name: "Linear / Jira",
        category: "docs",
        description: "Indexes roadmaps, sprint issues, active blockers, and project ownership.",
        syncType: "Event Webhook",
        itemsCount: "Roadmaps & Epics",
      },
    ],
  },
  architecture: {
    badge: "SECURITY & ARCHITECTURE",
    title: "Enterprise control, zero knowledge leaks",
    subtitle:
      "Engineered for high-security environments with tenant isolation and strict read-only guarantees.",
    pillars: [
      {
        title: "Row Level Security (RLS) & Multi-tenancy",
        subtitle: "Cryptographically isolated tenant contexts",
        description:
          "Tenant data is segregated across dedicated database schemas and vector partitions, ensuring no cross-organization leakage.",
        tags: ["PostgreSQL RLS", "Schema Isolation", "Zero Cross-tenant Access"],
      },
      {
        title: "Permission-Aware Querying",
        subtitle: "Inherits source ACLs in real time",
        description:
          "When an employee or AI agent queries FLAE, results are filtered strictly by the user's verified permissions in Slack, Drive, or Notion.",
        tags: ["OAuth Scopes", "Dynamic ACL Filters", "Audit Logging"],
      },
      {
        title: "Zero Model Training",
        subtitle: "Your proprietary data is never used for training",
        description:
          "Data indexed by FLAE remains exclusively in your private memory boundary. We never train public foundation models on your internal data.",
        tags: ["SOC2 Type II Ready", "Zero Data Retention on LLMs", "Read-Only Connectors"],
      },
    ],
  },
  pricing: {
    badge: "PLANS & PRICING",
    title: "Start building your company memory today",
    subtitle: "Transparent pricing designed to scale from fast-growing startups to enterprise organizations.",
    billingToggle: {
      monthly: "Monthly",
      annual: "Annual",
      saveBadge: "Save 20%",
    },
    mostPopular: "Most Popular",
    includedCapabilities: "Included capabilities",
    foreverFree: "Free forever",
    perMonth: "/ seat / month",
    annualBilling: "billed annually",
    plans: [
      {
        id: "starter",
        name: "Starter",
        tagline: "Essential memory layer for small teams and early-stage startups.",
        price: "$0",
        period: "Free forever",
        ctaText: "Start building free",
        features: [
          "Up to 10 team members",
          "Connect Slack, Notion & Google Drive",
          "Model Context Protocol (MCP) access",
          "Basic relationship graph and source citations",
          "Standard community support",
        ],
      },
      {
        id: "pro",
        name: "Team Pro",
        tagline: "Full-fidelity company context layer with code integration and conflict alerts.",
        price: "$29",
        period: "per seat / month",
        ctaText: "Start 14-day Pro trial",
        features: [
          "Unlimited team members",
          "All connectors (GitHub, Linear, Jira included)",
          "Outdated documentation & conflict detection",
          "Unlimited MCP & REST API query calls",
          "Permission inheritance & fine-grained RBAC",
          "Priority 24/7 engineering support",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        tagline: "Custom deployment, dedicated VPC, and enterprise SLAs for regulated industries.",
        price: "Custom",
        period: "custom annual contract",
        ctaText: "Contact Enterprise Sales",
        features: [
          "Dedicated VPC / On-premise deployment option",
          "Custom SSO, SAML & SCIM directory sync",
          "Custom LLM gateway & bring-your-own-keys (BYOK)",
          "Dedicated solutions architect & custom SLAs",
          "Custom connector development",
        ],
      },
    ],
  },
  faq: {
    badge: "FREQUENTLY ASKED QUESTIONS",
    title: "Everything you need to know about FLAE",
    subtitle: "Clear answers to common questions regarding architecture, security, and agent integration.",
    items: [
      {
        question: "How does FLAE differ from enterprise search tools like Glean or Notion AI?",
        answer:
          "Standard enterprise search and RAG tools find isolated chunks of text based on keyword or semantic similarity. FLAE builds a living knowledge graph that understands relationships (e.g., how a Slack discussion relates to a GitHub PR and Notion doc) and tracks time, allowing it to detect when documentation has become outdated after a code commit.",
      },
      {
        question: "How do our AI tools (ChatGPT, Claude, Cursor) connect to FLAE?",
        answer:
          "FLAE provides native support for the Model Context Protocol (MCP). In tools like Claude Desktop or Cursor, you simply add FLAE's MCP endpoint to your configuration. When you ask questions in your IDE or chat client, the agent automatically queries FLAE for verified context.",
      },
      {
        question: "What happens when two sources have conflicting information?",
        answer:
          "FLAE does not blindly assume the newest message is correct (for example, an informal Slack message does not automatically override an official approved policy). Instead, FLAE identifies the discrepancy, presents both pieces of evidence with timestamps and authors, and highlights the potential conflict.",
      },
      {
        question: "Does FLAE train AI models on our company data?",
        answer:
          "No. Your data is stored securely in isolated database partitions and is never used to train public or foundation models. All LLM inferences are performed with strict zero-data-retention agreements.",
      },
      {
        question: "How long does it take to connect our workspace?",
        answer:
          "You can connect your first sources (Notion, Slack, Google Drive, GitHub) in under five minutes via OAuth. Initial indexing runs in the background and streams updates continuously.",
      },
    ],
  },
  footer: {
    ctaBadge: "GET STARTED",
    ctaTitleStart: "Give your AI the context ",
    ctaTitleHighlight: "it's missing.",
    ctaSubtitle:
      "Connect your workspace and turn your existing knowledge into context every employee and AI agent can use.",
    ctaButton: "Start Building",
    ctaButtonSecondary: "Schedule a walkthrough",
    ctaNote: "No credit card required · Connect your first source in minutes",
    brandSummary:
      "The living context layer connecting documentation, conversations, and code for teams and AI agents.",
    columns: {
      product: {
        title: "Product",
        howItWorks: "How It Works",
        whyFlae: "Why FLAE",
        connectors: "Connectors",
        architecture: "Architecture",
        pricing: "Pricing",
      },
      agents: {
        title: "For AI Agents",
        claude: "Claude Desktop MCP",
        chatgpt: "OpenAI & ChatGPT",
        copilot: "Cursor & IDEs",
        provenance: "Provenance API",
        openCore: "Open Source Agents",
      },
      security: {
        title: "Security & Trust",
        rbac: "Role-Based Access",
        sync: "Continuous Delta Sync",
        enterprise: "Enterprise SOC2",
        privacy: "Privacy Policy",
        terms: "Terms of Service",
      },
    },
    craftedText: "Built for AI-native teams",
    allRightsReserved: "FLAE Inc. All rights reserved.",
  },
};
