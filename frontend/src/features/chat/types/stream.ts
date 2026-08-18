import { AppError } from "../../../core/api/errors";

export interface StreamCitation {
  content: string;
  score: number | null;
  source_document: string;
}

export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "citations"; citations: StreamCitation[] }
  | { type: "done" }
  | { type: "error"; detail: string };

export type StreamStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "completed"
  | "failed";

function protocolError() {
  return new AppError({
    code: "SSE_PROTOCOL_ERROR",
    kind: "server",
    message: "The server returned an invalid stream event.",
    retryable: true,
  });
}

function isExactObject(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function parseCitation(value: unknown): StreamCitation {
  if (
    !isExactObject(value, ["source_document", "content", "score"]) ||
    typeof value.source_document !== "string" ||
    typeof value.content !== "string" ||
    !(typeof value.score === "number" || value.score === null)
  ) {
    throw protocolError();
  }
  return {
    content: value.content,
    score: value.score,
    source_document: value.source_document,
  };
}

export function parseStreamEvent(value: unknown): StreamEvent {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    throw protocolError();
  }
  const event = value as Record<string, unknown>;
  switch (event.type) {
    case "token":
      if (!isExactObject(event, ["type", "text"]) || typeof event.text !== "string") {
        throw protocolError();
      }
      return { text: event.text, type: "token" };
    case "citations":
      if (!isExactObject(event, ["type", "citations"]) || !Array.isArray(event.citations)) {
        throw protocolError();
      }
      return { citations: event.citations.map(parseCitation), type: "citations" };
    case "done":
      if (!isExactObject(event, ["type"])) throw protocolError();
      return { type: "done" };
    case "error":
      if (!isExactObject(event, ["type", "detail"]) || typeof event.detail !== "string") {
        throw protocolError();
      }
      return { detail: event.detail, type: "error" };
    default:
      throw protocolError();
  }
}
