import { afterEach, describe, expect, it, vi } from "vitest";

import { stubFetch } from "../fixtures/stub-fetch.js";
import {
  startInvestigation,
  streamInvestigationEvents,
} from "./investigation-stream.js";

// `fetch` is stubbed at the global, never the module — `stub-fetch.ts`'s own
// header has the measurement behind that choice. Every assertion here runs
// through the real SSE line-framing and the real decoder.

afterEach(() => {
  vi.unstubAllGlobals();
});

function sseBody(frames: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(frame));
      }
      controller.close();
    },
  });
}

const STARTED_FRAME =
  'id: 1\nevent: INVESTIGATION_STARTED\ndata: {"type":"INVESTIGATION_STARTED","seq":1,"investigationId":"inv-1","investigation":{"id":"inv-1","title":"Investigate NVDA","subjectSymbols":["NVDA"]}}\n\n';
const COMPLETED_FRAME =
  'id: 6\nevent: INVESTIGATION_COMPLETED\ndata: {"type":"INVESTIGATION_COMPLETED","seq":6,"investigationId":"inv-1","status":"completed","completedAt":"2026-11-16T14:00:00.012Z","stepCount":1}\n\n';

describe("startInvestigation", () => {
  it("POSTs the symbol and returns the created investigation", async () => {
    const stub = stubFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "inv-1",
            status: "running",
            subjectSymbols: ["NVDA"],
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await startInvestigation("NVDA");

    expect(result).toStrictEqual({
      id: "inv-1",
      status: "running",
      subjectSymbols: ["NVDA"],
    });
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0]?.url).toBe("http://localhost:3000/investigations");
  });

  it("answers undefined rather than throwing on an unreachable backend", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));

    expect(await startInvestigation("NVDA")).toBeUndefined();
  });

  it("answers undefined on a non-2xx response", async () => {
    stubFetch(() => Promise.resolve(new Response("", { status: 503 })));

    expect(await startInvestigation("NVDA")).toBeUndefined();
  });

  it("answers undefined on a 2xx body that is not a readable investigation", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ not: "an investigation" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    expect(await startInvestigation("NVDA")).toBeUndefined();
  });
});

describe("streamInvestigationEvents", () => {
  it("decodes every frame in a stream, in order", async () => {
    stubFetch(() =>
      Promise.resolve(
        new Response(sseBody([STARTED_FRAME, COMPLETED_FRAME]), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const decoded = [];
    for await (const event of streamInvestigationEvents(
      "inv-1",
      0,
      new AbortController().signal,
    )) {
      decoded.push(event);
    }

    expect(decoded).toHaveLength(2);
    expect(decoded[0]).toMatchObject({
      kind: "event",
      event: { type: "INVESTIGATION_STARTED" },
    });
    expect(decoded[1]).toMatchObject({
      kind: "event",
      event: { type: "INVESTIGATION_COMPLETED" },
    });
  });

  it("handles a frame split across two chunks", async () => {
    // The chunk boundary lands mid-frame, exactly the case a byte stream
    // can produce and a frame-per-`read()` assumption cannot survive.
    const whole = STARTED_FRAME;
    const splitAt = Math.floor(whole.length / 2);
    stubFetch(() =>
      Promise.resolve(
        new Response(sseBody([whole.slice(0, splitAt), whole.slice(splitAt)]), {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const decoded = [];
    for await (const event of streamInvestigationEvents(
      "inv-1",
      0,
      new AbortController().signal,
    )) {
      decoded.push(event);
    }

    expect(decoded).toHaveLength(1);
    expect(decoded[0]).toMatchObject({
      kind: "event",
      event: { type: "INVESTIGATION_STARTED" },
    });
  });

  it("yields unreadable rather than throwing when the response is not ok", async () => {
    stubFetch(() => Promise.resolve(new Response("", { status: 503 })));

    const decoded = [];
    for await (const event of streamInvestigationEvents(
      "inv-1",
      0,
      new AbortController().signal,
    )) {
      decoded.push(event);
    }

    expect(decoded).toStrictEqual([
      { kind: "unreadable", reason: "stream answered 503" },
    ]);
  });

  it("throws rather than silently stopping when the connection itself fails", async () => {
    // This is the one case this module does NOT turn into a value — a
    // dropped connection mid-stream is `use-investigation.ts`'s own
    // `connectionLost` fact to produce, not this generator's. Asserted here
    // so that contract stays visible rather than discovered by a stuck UI.
    stubFetch(() => Promise.reject(new Error("connection reset")));

    await expect(async () => {
      const iterator = streamInvestigationEvents(
        "inv-1",
        0,
        new AbortController().signal,
      );
      for (;;) {
        const result = await iterator.next();
        if (result.done ?? false) break;
      }
    }).rejects.toThrow("connection reset");
  });
});
