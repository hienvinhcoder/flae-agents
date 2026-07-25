import { AppError } from "../api/errors";

interface StreamSseOptions<T> {
  fetchImpl?: typeof fetch;
  onEvent: (event: T) => void;
  parseEvent: (value: unknown) => T;
  signal?: AbortSignal;
  tokenProvider: () => Promise<string | null>;
  url: string;
}

function failure(
  code: string,
  kind: "auth" | "network" | "server",
  message: string,
  retryable: boolean,
  status?: number,
) {
  return new AppError({ code, kind, message, retryable, status });
}

function aborted() {
  return failure("SSE_ABORTED", "network", "The stream was cancelled.", false);
}

function protocolFailure() {
  return failure(
    "SSE_PROTOCOL_ERROR",
    "server",
    "The server returned an invalid stream event.",
    true,
  );
}

function isTerminal(event: unknown) {
  return typeof event === "object" && event !== null && "type" in event &&
    ((event as { type?: unknown }).type === "done" ||
      (event as { type?: unknown }).type === "error");
}

function parseFrame<T>(frame: string, parseEvent: (value: unknown) => T) {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!data) return null;
  try {
    return parseEvent(JSON.parse(data));
  } catch (cause) {
    if (cause instanceof AppError && cause.code === "SSE_PROTOCOL_ERROR") {
      throw cause;
    }
    throw protocolFailure();
  }
}

export async function streamSse<T>({
  fetchImpl = fetch,
  onEvent,
  parseEvent,
  signal,
  tokenProvider,
  url,
}: StreamSseOptions<T>): Promise<void> {
  if (signal?.aborted) throw aborted();
  let token: string | null;
  try {
    token = await tokenProvider();
  } catch {
    throw failure("SSE_AUTH_FAILED", "auth", "Unable to authenticate the stream.", false);
  }
  if (!token) {
    throw failure("SSE_AUTH_REQUIRED", "auth", "Authentication is required to start the stream.", false);
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      method: "GET",
      signal,
    });
  } catch {
    if (signal?.aborted) throw aborted();
    throw failure("SSE_TRANSPORT_ERROR", "network", "Unable to connect to the stream.", true);
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw failure(
      "SSE_HTTP_ERROR",
      response.status === 401 ? "auth" : "server",
      "The server could not start the stream.",
      response.status >= 500,
      response.status,
    );
  }
  if (!response.body) {
    throw failure("SSE_BODY_REQUIRED", "server", "The server returned an empty stream.", true);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let cancelPromise: Promise<void> | null = null;
  let stopped = false;
  let terminal = false;
  let rejectAbort: (() => void) | undefined;
  const abortPromise = new Promise<never>((_resolve, reject) => {
    rejectAbort = () => reject(aborted());
  });
  const cancelReader = async () => {
    cancelPromise ??= Promise.resolve()
      .then(() => reader.cancel())
      .then(() => undefined)
      .catch(() => undefined);
    await cancelPromise;
  };
  const onAbort = () => {
    stopped = true;
    void cancelReader().finally(() => rejectAbort?.());
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    while (!stopped) {
      const result = await (signal ? Promise.race([reader.read(), abortPromise]) : reader.read());
      if (signal?.aborted) throw aborted();
      if (result.done) {
        buffer += decoder.decode();
        if (buffer.trim()) {
          const event = parseFrame(buffer, parseEvent);
          if (event) {
            onEvent(event);
            terminal = isTerminal(event);
          }
        }
        break;
      }
      buffer += decoder.decode(result.value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (stopped) break;
        const event = parseFrame(frame, parseEvent);
        if (!event) continue;
        onEvent(event);
        if (isTerminal(event)) {
          terminal = true;
          stopped = true;
          await cancelReader();
          break;
        }
      }
    }
    if (!terminal && !stopped) {
      throw failure(
        "SSE_TRANSPORT_ERROR",
        "network",
        "The stream connection ended before completion.",
        true,
      );
    }
  } catch (cause) {
    await cancelReader();
    if (cause instanceof AppError) throw cause;
    throw failure("SSE_TRANSPORT_ERROR", "network", "The stream connection was interrupted.", true);
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}
