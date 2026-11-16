// The transport: `fetch` + `ReadableStream`, never `EventSource` (Story 7.1's
// own Gate 1 settled rule). `EventSource` reconnects automatically on any
// drop, which would silently start a second investigation on a flaky
// connection — exactly the state the second-press guard exists to prevent —
// and it carries no request header, so the correlation id this product
// already attaches to every other request would be missing from the one
// transport that most needs it to debug a dropped stream.
//
// **A second, deliberate `fetch` call site.** `api-client.ts`'s own header
// says it is "the only file in `apps/frontend/src/` that calls `fetch`", and
// that stops being true here on purpose: it answers one JSON request with one
// JSON response, and an SSE stream is neither — it is an open body a reader
// consumes incrementally, with its own framing to parse. Folding this into
// that client would make its one method signature a lie for every other
// caller. `CLAUDE.md`'s repo map owes this line a dated correction at this
// story's own close.

import { apiBaseUrl } from "../api-base-url.js";
import {
  readInvestigationEvent,
  type DecodedInvestigationEvent,
} from "./investigation-event.js";

/** The investigation this story's one tool starts, as the POST response's own
 * body — just enough to seed the checklist's first paint before the stream's
 * own replay arrives. Mirrors `toWireInvestigation`'s field set; this module
 * reads only the three fields it needs. */
export interface StartedInvestigation {
  readonly id: string;
  readonly status: string;
  readonly subjectSymbols: readonly string[];
}

function isStartedInvestigation(value: unknown): value is StartedInvestigation {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.status === "string" &&
    Array.isArray(record.subjectSymbols) &&
    record.subjectSymbols.every((symbol) => typeof symbol === "string")
  );
}

/**
 * `POST /investigations` for one symbol.
 *
 * Returns `undefined` on anything that is not a readable, successful
 * response — a 400 for a malformed symbol cannot happen here, because
 * `symbol` always comes off a page whose own route already resolved it to a
 * tracked security — so the only realistic failure is the backend being
 * unreachable, which this hands back as an absence rather than a thrown
 * error for the same reason `market-stream-protocol.ts`'s decoder never
 * throws: a dropped tool call is this product's vocabulary for "we could not
 * get an answer", never an exception a component has to catch.
 */
export async function startInvestigation(
  symbol: string,
  signal?: AbortSignal,
): Promise<StartedInvestigation | undefined> {
  try {
    const response = await fetch(`${apiBaseUrl}/investigations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol }),
      ...(signal === undefined ? {} : { signal }),
    });
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    return isStartedInvestigation(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads one `id:`/`event:`/`data:` frame at a time out of a raw SSE byte
 * stream and decodes its payload.
 *
 * **Why this exists rather than a library.** The whole of the SSE framing
 * this route ever sends is three known lines and a blank one (this product's
 * server writes nothing else — see `routes/investigations.ts`), so a general
 * parser would be weight spent on cases this stream cannot produce. What it
 * does buy, and does correctly, is a chunk boundary landing mid-frame: `fetch`
 * delivers bytes in whatever pieces the network gave it, not one per frame,
 * so this buffers until a blank line closes a frame rather than assuming one
 * `read()` is one event.
 */
export async function* streamInvestigationEvents(
  investigationId: string,
  fromSeq: number,
  signal: AbortSignal,
): AsyncGenerator<DecodedInvestigationEvent> {
  const url = `${apiBaseUrl}/investigations/${investigationId}/events?from=${String(fromSeq)}`;
  const response = await fetch(url, { signal });
  if (!response.ok || response.body === null) {
    yield {
      kind: "unreadable",
      reason: `stream answered ${String(response.status)}`,
    };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;

      buffer += decoder.decode(value, { stream: true });

      // A frame ends at a blank line. `buffer` may hold more than one —
      // the common case once a run has queued several events — or less
      // than one, which is the chunk-boundary case this generator exists
      // to handle: the loop below simply does not fire until `\n\n`
      // actually appears, and the partial frame waits in `buffer` for the
      // next `read()`.
      for (;;) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary === -1) break;

        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const decoded = decodeFrame(frame);
        if (decoded !== undefined) yield decoded;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function decodeFrame(frame: string): DecodedInvestigationEvent | undefined {
  const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
  if (dataLine === undefined) return undefined;

  try {
    const parsed: unknown = JSON.parse(dataLine.slice("data: ".length));
    return readInvestigationEvent(parsed);
  } catch {
    return { kind: "unreadable", reason: "data line was not JSON" };
  }
}
