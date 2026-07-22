import { z } from 'zod';

export const authUserSchema = z
  .strictObject({
    code: z.string(),
    message: z.string(),
    id: z.string(),
    firebase_uid: z.string().min(1),
    email: z.string().email(),
    full_name: z.string(),
    avatar_url: z.string().nullable(),
    is_active: z.boolean(),
    login_providers: z.array(z.enum(['email_password', 'google', 'facebook'])),
    current_workspace_id: z.string().nullable(),
  })
  .transform((response) => ({
    id: response.id,
    firebase_uid: response.firebase_uid,
    email: response.email,
    full_name: response.full_name,
    avatar_url: response.avatar_url,
    is_active: response.is_active,
    login_providers: response.login_providers,
    current_workspace_id: response.current_workspace_id,
  }));
