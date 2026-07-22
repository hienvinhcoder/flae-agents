export const queryKeys = {
  workspaces: ['workspaces'] as const,
  knowledge: (workspaceId: string) => ['knowledge', workspaceId] as const,
  topics: (workspaceId: string) => ['topics', workspaceId] as const,
  agents: (workspaceId: string) => ['agents', workspaceId] as const,
};
