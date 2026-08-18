import { z } from 'zod';

function urlWithProtocols(protocols: readonly string[]) {
  return z
    .string()
    .trim()
    .min(1)
    .url()
    .refine((value) => {
      try {
        return protocols.includes(new URL(value).protocol);
      } catch {
        return false;
      }
    });
}

const environmentSchema = z.object({
  VITE_API_URL: urlWithProtocols(['http:', 'https:']),
  VITE_WS_URL: urlWithProtocols(['ws:', 'wss:']),
  VITE_FIREBASE_API_KEY: z.string().trim().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().trim().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().trim().min(1),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().trim().min(1),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().trim().min(1),
  VITE_FIREBASE_APP_ID: z.string().trim().min(1),
  VITE_USE_FIREBASE_EMULATORS: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true'),
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
