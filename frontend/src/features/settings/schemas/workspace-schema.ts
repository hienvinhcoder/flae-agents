import { z } from "zod";

import { workspaceRoleSchema } from "../types/workspace";

interface WorkspaceValidationMessages {
  emailInvalid: string;
  workspaceNameMax: string;
  workspaceNameMin: string;
}

const defaultMessages: WorkspaceValidationMessages = {
  emailInvalid: "Enter a valid email address.",
  workspaceNameMax: "Workspace name must be 100 characters or fewer.",
  workspaceNameMin: "Workspace name must be at least 3 characters.",
};

export function createWorkspaceNameFormSchema(
  messages: Pick<
    WorkspaceValidationMessages,
    "workspaceNameMax" | "workspaceNameMin"
  >,
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(3, messages.workspaceNameMin)
      .max(100, messages.workspaceNameMax),
  });
}

export function createInviteMemberFormSchema(
  messages: Pick<WorkspaceValidationMessages, "emailInvalid">,
) {
  return z.object({
    email: z.string().trim().email(messages.emailInvalid),
    role: workspaceRoleSchema,
  });
}

export const workspaceNameFormSchema =
  createWorkspaceNameFormSchema(defaultMessages);
export const inviteMemberFormSchema =
  createInviteMemberFormSchema(defaultMessages);

export type WorkspaceNameForm = z.infer<typeof workspaceNameFormSchema>;
export type InviteMemberForm = z.infer<typeof inviteMemberFormSchema>;
