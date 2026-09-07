/**
 * The transport, driven against a **real local HTTP server** (Task 2.7.3).
 *
 * ## Why a server and not a `fetch` stub
 *
 * A stubbed `fetch` tests a mock of this file. The things worth asserting here
 * are all properties of a real request — that both headers actually go on the
 * wire, that the composed signal actually cancels an in-flight request, that a
 * deadline actually expires against a server that does not answer — and a stub
 * asserts our belief about each of them instead. `index.process.test.ts` made
 * the same call for the same reason.
 *
 * Loopback only, so `pnpm test` still reaches no host but itself — Story 2.7's
 * acceptance criterion 7 and the property Task 2.6.6 checked with a blocker.
 */

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { toTicker, toTimeRange } from "@marketpulse/shared";
import { afterEach, describe, expect, it } from "vitest";

import { AlpacaPaginationUnsupportedError } from "./alpaca-mapping.js";
import { createAlpacaProvider } from "./alpaca-provider.js";
import type { AlpacaConfig } from "./config.js";
import type { BarsRequest } from "./market-data-provider.js";

const CREDENTIAL: AlpacaConfig = Object.freeze({
  // Deliberately not a real key, and deliberately not shaped like one either.
  keyId: "test-key-id",
  secretKey: "test-secret-key-not-a-real-one",
});

const REQUEST: BarsRequest = {
  symbol: toTicker("NVDA"),
  range: toTimeRange(
    new Date("2026-09-03T13:30:00Z"),
    new Date("2026-09-03T20:00:00Z"),
  ),
  timeframe: "1m",
  adjustment: "raw",
};

/** One bar, enough for a well-formed body. */
const ONE_BAR_BODY = {
  bars: {
    NVDA: [
      {
        t: "2026-09-03T13:30:00Z",
        o: 1.5,
        h: 2,
        l: 1,
        c: 1.75,
        v: 100,
        n: 3,
        vw: 1.6,
      },
    ],
  },
  next_page_token: null,
};

interface Captured {
  readonly url: string;
  readonly headers: Record<string, string | string[] | undefined>;
}

interface Harness {
  readonly origin: string;
  readonly requests: Captured[];
}

let server: Server | undefined;

afterEach(async () => {
  if (server !== undefined) {
    const closing = server;
    server = undefined;
    await new Promise<void>((resolve) =>
      closing.close(() => {
        resolve();
      }),
    );
  }
});

/**
 * A server that answers however the test says.
 *
 * `respond` returning a promise that never settles is how the deadline and the
 * caller's signal are exercised — a real hang rather than a fake clock, because
 * the thing under test is the composition of two real signals.
 */
async function serve(
  respond: (
    captured: Captured,
  ) =>
    | Promise<{ status: number; body: string }>
    | { status: number; body: string },
): Promise<Harness> {
  const requests: Captured[] = [];

  server = createServer((incoming, outgoing) => {
    const captured: Captured = {
      url: incoming.url ?? "",
      headers: incoming.headers,
    };
    requests.push(captured);

    void Promise.resolve(respond(captured)).then(({ status, body }) => {
      outgoing.writeHead(status, { "content-type": "application/json" });
      outgoing.end(body);
    });
  });

  await new Promise<void>((resolve) => {
    server?.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  return { origin: `http://127.0.0.1:${String(address.port)}`, requests };
}

/**
 * A server that accepts the request and never answers it.
 *
 * A real hang rather than a fake clock, because the thing under test is the
 * composition of two real `AbortSignal`s — a fake clock would test the fake.
 */
function neverAnswers(): Promise<never> {
  return new Promise<never>(() => {
    // Deliberately never settles. The caller's signal or the deadline is what
    // ends the request, which is exactly the branch being exercised.
  });
}

describe("what the provider declares about itself", () => {
  it("is the alpaca provider reading the consolidated tape", () => {
    const provider = createAlpacaProvider(CREDENTIAL);
    expect(provider.id).toBe("alpaca");
    expect(provider.feed).toBe("sip");
  });
});

describe("the request that goes on the wire", () => {
  it("sends both credential headers", async () => {
    const harness = await serve(() => ({
      status: 200,
      body: JSON.stringify(ONE_BAR_BODY),
    }));

    await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    const headers = harness.requests[0]?.headers;
    expect(headers?.["apca-api-key-id"]).toBe(CREDENTIAL.keyId);
    expect(headers?.["apca-api-secret-key"]).toBe(CREDENTIAL.secretKey);
  });

  it("carries the mapping's query, with the inclusive end", async () => {
    const harness = await serve(() => ({
      status: 200,
      body: JSON.stringify(ONE_BAR_BODY),
    }));

    await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    const url = new URL(harness.requests[0]?.url ?? "", harness.origin);
    expect(url.pathname).toBe("/v2/stocks/bars");
    expect(url.searchParams.get("symbols")).toBe("NVDA");
    expect(url.searchParams.get("timeframe")).toBe("1Min");
    expect(url.searchParams.get("adjustment")).toBe("raw");
    expect(url.searchParams.get("feed")).toBe("sip");
    expect(url.searchParams.get("sort")).toBe("asc");
    // One millisecond before our half-open end — the whole reason a duplicated
    // bar does not appear at a window seam.
    expect(new Date(url.searchParams.get("end") ?? "").getTime()).toBe(
      REQUEST.range.end.getTime() - 1,
    );
  });

  // The credential must not reach the URL, which is where it would end up in
  // any log of a request path — Task 2.7.2's leak list names exactly that.
  it("puts no part of the credential in the URL", async () => {
    const harness = await serve(() => ({
      status: 200,
      body: JSON.stringify(ONE_BAR_BODY),
    }));

    await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    expect(harness.requests[0]?.url).not.toContain(CREDENTIAL.keyId);
    expect(harness.requests[0]?.url).not.toContain(CREDENTIAL.secretKey);
  });
});

describe("the happy path", () => {
  it("returns ok with a mapped series", async () => {
    const harness = await serve(() => ({
      status: 200,
      body: JSON.stringify(ONE_BAR_BODY),
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    expect(result.outcome).toBe("ok");
    if (result.outcome !== "ok") return;

    expect(result.series.bars.length).toBe(1);
    expect(result.series.symbol).toBe("NVDA");
    expect(result.series.provenance.sources[0].provider).toBe("alpaca");
    expect(result.series.provenance.sources[0].feed).toBe("sip");
  });

  it("stamps retrievedAt at the fetch rather than from the response", async () => {
    const before = Date.now();
    const harness = await serve(() => ({
      status: 200,
      body: JSON.stringify(ONE_BAR_BODY),
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    if (result.outcome !== "ok") throw new Error("expected ok");
    const stamped = Date.parse(result.series.provenance.sources[0].retrievedAt);

    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(Date.now());
    // A UTC instant, which `toSeriesProvenance` refuses otherwise — an offset
    // spelling is how a local-time stamp reaches a provenance record.
    expect(result.series.provenance.sources[0].retrievedAt).toMatch(/Z$/);
  });
});

describe("the two outcomes this task's own signals produce", () => {
  // Checked FIRST in the implementation, and it must not cost a metered
  // request — Task 1.12.3's "resolved after unmount" bug closed at the one
  // place it can be closed.
  it("returns aborted without making a request when the caller has already torn down", async () => {
    const harness = await serve(() => ({
      status: 200,
      body: JSON.stringify(ONE_BAR_BODY),
    }));
    const controller = new AbortController();
    controller.abort();

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST, { signal: controller.signal });

    expect(result.outcome).toBe("aborted");
    expect(harness.requests).toHaveLength(0);
  });

  it("returns aborted when the caller tears down mid-flight", async () => {
    const harness = await serve(
      // Never settles: a real hang, so the signal is what ends the request.
      neverAnswers,
    );
    const controller = new AbortController();

    const pending = createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST, { deadlineMs: 10_000, signal: controller.signal });

    setTimeout(() => {
      controller.abort();
    }, 20);

    expect((await pending).outcome).toBe("aborted");
  });

  it("returns timeout carrying the deadline it was measured against", async () => {
    const harness = await serve(neverAnswers);

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST, { deadlineMs: 40 });

    expect(result).toEqual({ outcome: "timeout", deadlineMs: 40 });
  });

  // When both have fired, the deadline is the one that describes the request
  // rather than the caller — `api-client.ts`'s ordering, reused.
  it("prefers timeout over aborted when both signals have fired", async () => {
    const harness = await serve(neverAnswers);
    const controller = new AbortController();

    const pending = createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST, { deadlineMs: 30, signal: controller.signal });

    setTimeout(() => {
      controller.abort();
    }, 60);

    expect((await pending).outcome).toBe("timeout");
  });
});

describe("what this task refuses to handle, loudly", () => {
  // Task 2.7.6 owns the taxonomy. Until then a non-2xx THROWS rather than being
  // guessed at, because a wrong guess would put a permanent fault in front of a
  // retry wrapper — the laundering PROVIDER.md §8.5 forbids.
  it.each([401, 403, 429, 500])(
    "throws on %i rather than guessing which member it means",
    async (status) => {
      const harness = await serve(() => ({
        status,
        body: '{"message":"nope"}',
      }));

      await expect(
        createAlpacaProvider(CREDENTIAL, {
          baseUrl: harness.origin,
        }).fetchBars(REQUEST),
      ).rejects.toThrow(/2\.7\.6/);
    },
  );

  // The bad-key body is HTML from nginx rather than JSON (`ALPACA.md` §9), so a
  // client that parses an error body turns a clear `unauthorised` into a
  // laundered parse failure. This one never reads it.
  it("does not read the body into the message, HTML included", async () => {
    const harness = await serve(() => ({
      status: 401,
      body: "<html><head><title>401 Authorization Required</title></head></html>",
    }));

    await expect(
      createAlpacaProvider(CREDENTIAL, {
        baseUrl: harness.origin,
      }).fetchBars(REQUEST),
    ).rejects.toThrow(/^(?!.*Authorization Required)/s);
  });

  it("lets the pagination refusal through rather than catching it", async () => {
    const harness = await serve(() => ({
      status: 200,
      body: JSON.stringify({ ...ONE_BAR_BODY, next_page_token: "abc123" }),
    }));

    await expect(
      createAlpacaProvider(CREDENTIAL, {
        baseUrl: harness.origin,
      }).fetchBars(REQUEST),
    ).rejects.toThrow(AlpacaPaginationUnsupportedError);
  });
});
