import { z } from 'zod';

export const loginProviderSchema = z.enum(['email_password', 'google', 'facebook']);
export type LoginProvider = z.infer<typeof loginProviderSchema>;

export const userItemResponseSchema = z
  .strictObject({
    code: z.string(),
    message: z.string(),
    id: z.string(),
    firebase_uid: z.string().min(1),
    email: z.string().email(),
    full_name: z.string(),
    is_active: z.boolean(),
    login_providers: z.array(loginProviderSchema),
    avatar_url: z.string().nullable(),
    current_workspace_id: z.string().nullable(),
  })
  .transform((response) => ({
    id: response.id,
    firebase_uid: response.firebase_uid,
    email: response.email,
    full_name: response.full_name,
    is_active: response.is_active,
    login_providers: response.login_providers,
    avatar_url: response.avatar_url,
    current_workspace_id: response.current_workspace_id,
  }));

export type User = z.output<typeof userItemResponseSchema>;
