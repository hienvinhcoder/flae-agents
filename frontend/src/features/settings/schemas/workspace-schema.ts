import { z } from "zod";

import { workspaceRoleSchema } from "../types/workspace";

export const workspaceNameFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Workspace name must be at least 3 characters.")
    .max(100),
});

export const inviteMemberFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: workspaceRoleSchema,
});

export type WorkspaceNameForm = z.infer<typeof workspaceNameFormSchema>;
export type InviteMemberForm = z.infer<typeof inviteMemberFormSchema>;
