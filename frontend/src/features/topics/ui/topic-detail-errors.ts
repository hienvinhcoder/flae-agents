import { AppError } from "../../../core/api/errors";

export function publicTopicErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) return fallback;
  return error instanceof Error ? error.message : fallback;
}

export function isGloballyAnnouncedTopicError(error: unknown) {
  return error instanceof AppError
    && error.kind === "server"
    && (error.status ?? 0) >= 500;
}
