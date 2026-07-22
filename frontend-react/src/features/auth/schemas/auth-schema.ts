import { z } from 'zod';

const email = z.string().trim().email('Enter a valid email address.');
const password = z.string().min(6, 'Password must contain at least 6 characters.');

export const loginSchema = z.object({ email, password });

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must contain at least 2 characters.'),
  email,
  password,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
