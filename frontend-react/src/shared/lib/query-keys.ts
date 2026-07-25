export const queryKeys = {
  workspaces: ["workspaces"] as const,
  workspaceMembers: (workspaceId: string) =>
    ["workspaces", workspaceId, "members"] as const,
  workspaceInvitations: (workspaceId: string) =>
    ["workspaces", workspaceId, "invitations"] as const,
  knowledge: (workspaceId: string) =>
    ["workspaces", workspaceId, "knowledge"] as const,
  knowledgeDocument: (workspaceId: string, documentId: string) =>
    ["workspaces", workspaceId, "knowledge", documentId] as const,
  topics: (workspaceId: string) =>
    ["workspaces", workspaceId, "topics"] as const,
  topicLists: (workspaceId: string) =>
    ["workspaces", workspaceId, "topics", "list"] as const,
  topicList: (
    workspaceId: string,
    query: string,
    status: string,
    limit: number,
    offset: number,
  ) =>
    [
      "workspaces",
      workspaceId,
      "topics",
      "list",
      query,
      status,
      limit,
      offset,
    ] as const,
  topicDetail: (workspaceId: string, topicIdOrSlug: string) =>
    ["workspaces", workspaceId, "topics", "detail", topicIdOrSlug] as const,
  agents: (workspaceId: string) =>
    ["workspaces", workspaceId, "agents"] as const,
  agentList: (workspaceId: string) =>
    ["workspaces", workspaceId, "agents", "list"] as const,
  defaultAgent: (workspaceId: string) =>
    ["workspaces", workspaceId, "agents", "default"] as const,
  agentDetail: (workspaceId: string, agentId: string) =>
    ["workspaces", workspaceId, "agents", "detail", agentId] as const,
  agentSessions: (workspaceId: string, agentId: string) =>
    ["workspaces", workspaceId, "agents", agentId, "sessions"] as const,
  agentMessages: (
    workspaceId: string,
    agentId: string,
    sessionId: string,
  ) =>
    [
      "workspaces",
      workspaceId,
      "agents",
      agentId,
      "sessions",
      sessionId,
      "messages",
    ] as const,
};
