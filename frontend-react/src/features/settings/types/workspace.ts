import { z } from 'zod';

export const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  owner_uid: z.string(),
  created_at: z.string().nullable().optional().default(null),
});

export type Workspace = z.infer<typeof workspaceSchema>;
