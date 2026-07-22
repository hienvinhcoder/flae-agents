import { z } from 'zod';

const environmentSchema = z.object({
  VITE_API_URL: z.string().trim().min(1).url(),
  VITE_WS_URL: z.string().trim().min(1).url(),
  VITE_FIREBASE_API_KEY: z.string().trim().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().trim().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().trim().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().trim().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().trim().min(1),
  VITE_FIREBASE_APP_ID: z.string().trim().min(1),
});

export type Environment = Readonly<z.infer<typeof environmentSchema>>;

export function parseEnv(source: Record<string, unknown>): Environment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const invalidKeys = [
      ...new Set(
        result.error.issues.map((issue) =>
          issue.path.length > 0 ? String(issue.path[0]) : 'environment',
        ),
      ),
    ].sort();

    throw new Error(`Invalid environment configuration: ${invalidKeys.join(', ')}`);
  }

  return Object.freeze(result.data);
}

export const env: Environment = parseEnv(import.meta.env);
