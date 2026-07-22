export const queryKeys = {
  workspaces: ['workspaces'] as const,
  knowledge: (workspaceId: string) => ['workspaces', workspaceId, 'knowledge'] as const,
  topics: (workspaceId: string) => ['workspaces', workspaceId, 'topics'] as const,
  agents: (workspaceId: string) => ['workspaces', workspaceId, 'agents'] as const,
};
