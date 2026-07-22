import { z } from 'zod';

export const authUserSchema = z.strictObject({
  id: z.string(),
  firebase_uid: z.string().min(1),
  email: z.string().email(),
  full_name: z.string(),
  avatar_url: z.string().nullable(),
  is_active: z.boolean(),
  login_providers: z.array(z.enum(['email_password', 'google', 'facebook'])),
  current_workspace_id: z.string().nullable(),
});
