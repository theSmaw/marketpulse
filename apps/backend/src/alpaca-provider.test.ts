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

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";

import { toTicker, toTimeRange } from "@marketpulse/shared";
import { afterEach, describe, expect, it } from "vitest";

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

/**
 * Every server a test started.
 *
 * An array rather than a single handle since Task 2.7.6: the leak assertion
 * drives five recorded failure bodies in one test, and a single handle would
 * leave four listening sockets behind per run.
 */
const servers: Server[] = [];

/** Close everything this test started. Idempotent. */
async function closeServer(): Promise<void> {
  const closing = servers.splice(0, servers.length);
  await Promise.all(
    closing.map(
      (one) =>
        new Promise<void>((resolve) => {
          one.close(() => {
            resolve();
          });
        }),
    ),
  );
}

afterEach(closeServer);

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
  return serveRaw(async (captured) => ({
    contentType: "application/json",
    ...(await respond(captured)),
  }));
}

/**
 * The same, but the test chooses the content type and any extra headers.
 *
 * Task 2.7.6 needs both: the bad-key body arrives as `text/html` from nginx
 * rather than as JSON, and a `Retry-After` is a header rather than a body. A
 * harness that can only send `application/json` cannot express either, and the
 * HTML one is precisely the case a hand-written JSON fixture passes while the
 * shipped path throws.
 */
async function serveRaw(
  respond: (captured: Captured) =>
    | Promise<{
        status: number;
        body: string;
        contentType?: string;
        headers?: Record<string, string>;
      }>
    | {
        status: number;
        body: string;
        contentType?: string;
        headers?: Record<string, string>;
      },
): Promise<Harness> {
  const requests: Captured[] = [];

  const started = createServer((incoming, outgoing) => {
    const captured: Captured = {
      url: incoming.url ?? "",
      headers: incoming.headers,
    };
    requests.push(captured);

    void Promise.resolve(respond(captured)).then(
      ({ status, body, contentType, headers }) => {
        outgoing.writeHead(status, {
          "content-type": contentType ?? "application/json",
          ...headers,
        });
        outgoing.end(body);
      },
    );
  });
  servers.push(started);

  await new Promise<void>((resolve) => {
    started.listen(0, "127.0.0.1", resolve);
  });

  const address = started.address() as AddressInfo;
  return { origin: `http://127.0.0.1:${String(address.port)}`, requests };
}

/**
 * A port nothing is listening on.
 *
 * Bound and released rather than picked, so the number is genuinely free and
 * this cannot collide with something else on the machine. A real refused
 * connection rather than a stubbed rejection, which is what the rest of this
 * file already insists on.
 */
async function closedPort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => {
    probe.listen(0, "127.0.0.1", resolve);
  });
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((resolve) => {
    probe.close(() => {
      resolve();
    });
  });
  return port;
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

/**
 * The error taxonomy, driven through the shipped client with the vendor's own
 * recorded bytes (Task 2.7.6).
 *
 * **Every body here was produced against the live API and written to
 * `fixtures/alpaca/` verbatim.** `alpaca-mapping.test.ts` asserts the mapping
 * as a pure function; what these add is that the transport reaches it — with
 * the real status, the real content type and the real body — because the one
 * failure a documentation-based client gets wrong is a body-shape assumption,
 * and a fixture written by hand as JSON would pass while the shipped path
 * throws.
 */
describe("the failures this vendor actually produces", () => {
  /** The vendor's own bytes, and the content type it sent them with. */
  function recorded(file: string): string {
    return readFileSync(
      join(import.meta.dirname, "fixtures", "alpaca", file),
      "utf8",
    );
  }

  it("maps a real 401 — whose body is HTML from nginx — onto unauthorised", async () => {
    // **The sharpest trap in the task.** A bad key never reaches Alpaca's
    // application: nginx refuses it and answers `text/html`. A client that
    // parses an error body turns the clearest authorisation failure there is
    // into a laundered parse error, which is what `PROVIDER.md` §8.5 forbids
    // and is what a documentation-based mapping does. This asserts the real
    // bytes rather than a JSON stand-in, because a JSON stand-in passes while
    // the shipped path throws.
    const html = recorded("error-401-bad-key.html");
    expect(html).toContain("401 Authorization Required");
    expect(() => {
      // The `void` is the lint rule making the point: there is nothing usable
      // to return from parsing this body, which is exactly the finding.
      void (JSON.parse(html) as unknown);
    }).toThrow();

    const harness = await serveRaw(() => ({
      status: 401,
      contentType: "text/html",
      body: html,
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    expect(result).toEqual({ outcome: "unauthorised" });
  });

  it("maps the real recency 403 onto unauthorised too", async () => {
    // The one 403 this vendor produces. The shipped clamp means it cannot
    // arrive through `fetchBars` at all — see the test below — so this drives
    // the status directly, which is what makes the branch defence in depth
    // rather than dead code.
    const harness = await serveRaw(() => ({
      status: 403,
      contentType: "application/json",
      body: recorded("error-403-recent-window.json"),
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    expect(result).toEqual({ outcome: "unauthorised" });
  });

  it("does not ask at all for a window the clamp has already refused", async () => {
    // Why the 403 above is unreachable in practice. A request whose `end` is in
    // the future — which the vendor answers 403, measured — never leaves this
    // process, because `alpacaServableEnd` moves `end` back and the whole
    // window then sits before `start`. A costless empty success rather than a
    // metered refusal.
    const harness = await serveRaw(() => ({
      status: 403,
      contentType: "application/json",
      body: recorded("error-403-recent-window.json"),
    }));
    const now = Date.now();

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars({
      ...REQUEST,
      range: toTimeRange(
        new Date(now + 24 * 60 * 60_000),
        new Date(now + 25 * 60 * 60_000),
      ),
    });

    assert(result.outcome === "ok");
    expect(result.series.bars).toHaveLength(0);
    expect(harness.requests).toHaveLength(0);
  });

  it("maps the real 429 onto rate-limited with NO hint, because this vendor sends none", async () => {
    // Produced by 320 concurrent requests: 207 answered, 113 refused, and not
    // one of the 113 carried a `Retry-After` or any `x-ratelimit-*` header.
    // Task 2.7.7's backoff has to work from that.
    const harness = await serveRaw(() => ({
      status: 429,
      contentType: "application/json",
      body: recorded("error-429-rate-limited.json"),
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    expect(result).toEqual({ outcome: "rate-limited" });
    expect("retryAfterMs" in result).toBe(false);
  });

  it("carries a Retry-After through to the caller as a duration when one is sent", async () => {
    const harness = await serveRaw(() => ({
      status: 429,
      contentType: "application/json",
      body: recorded("error-429-rate-limited.json"),
      headers: { "retry-after": "45" },
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    expect(result).toEqual({ outcome: "rate-limited", retryAfterMs: 45_000 });
  });

  it("maps a 5xx onto upstream-unavailable", async () => {
    const harness = await serveRaw(() => ({
      status: 503,
      contentType: "text/html",
      body: "<html>502 Bad Gateway</html>",
    }));

    expect(
      await createAlpacaProvider(CREDENTIAL, {
        baseUrl: harness.origin,
      }).fetchBars(REQUEST),
    ).toEqual({ outcome: "upstream-unavailable" });
  });

  // Each of these is a request only this codebase could have built, so each is
  // a THROW rather than a member — `PROVIDER.md` §8.5's line. Two of the three
  // are additionally unreachable by construction, because `toTimeRange` refuses
  // a reversed range and `Timeframe` is a closed union; that is why the bodies
  // had to be produced with a hand-built URL rather than through this client.
  it.each([
    ["error-400-end-before-start.json", "end should not be before start"],
    ["error-400-malformed-date.json", "Invalid format for parameter start"],
    ["error-400-bad-timeframe.json", "invalid timeframe"],
  ])(
    "throws on the real 400 body %s rather than mapping it",
    async (file, phrase) => {
      expect(recorded(file)).toContain(phrase);

      const harness = await serveRaw(() => ({
        status: 400,
        contentType: "application/json",
        body: recorded(file),
      }));

      const failing = createAlpacaProvider(CREDENTIAL, {
        baseUrl: harness.origin,
      }).fetchBars(REQUEST);

      await expect(failing).rejects.toThrow(/built\s+wrongly/);
      // And never with the vendor's own words in it: Task 2.7.2's leak list names
      // an interpolated vendor response as a way this credential escapes.
      await expect(failing).rejects.not.toThrow(new RegExp(phrase));
    },
  );

  it("maps a refused connection onto upstream-unavailable", async () => {
    // A real closed socket rather than a stub. Node rejects `fetch` with a
    // `TypeError` whose message is the constant `fetch failed` for every
    // network class — refused, DNS, unroutable — carrying the real cause
    // underneath, and all of them mean the same thing to a caller.
    const closed = await closedPort();

    expect(
      await createAlpacaProvider(CREDENTIAL, {
        baseUrl: `http://127.0.0.1:${String(closed)}`,
      }).fetchBars(REQUEST),
    ).toEqual({ outcome: "upstream-unavailable" });
  });

  it("still returns TIMEOUT rather than upstream-unavailable for a host that hangs", async () => {
    // The distinction the two members exist for, and the reason Task 2.1.7 used
    // an unroutable address to produce a timeout: *"we gave up after N ms"*
    // admits raising N, where *"they are down"* does not. An unroutable host
    // never reaches the `TypeError` branch at all, because our own deadline
    // fires first.
    const harness = await serve(neverAnswers);

    expect(
      await createAlpacaProvider(CREDENTIAL, {
        baseUrl: harness.origin,
      }).fetchBars(REQUEST, { deadlineMs: 40 }),
    ).toEqual({ outcome: "timeout", deadlineMs: 40 });
  });

  it("still THROWS on a 200 whose body is not the shape we believe", async () => {
    // The one throw this task did not remove, and the line it sits on:
    // a status that already tells us everything is a member, and a body we
    // needed to read and could not is a defect. Laundering this into
    // `upstream-unavailable` would put a permanent break — a vendor shape
    // change — in front of a retry wrapper that would retry it forever.
    const harness = await serveRaw(() => ({
      status: 200,
      contentType: "text/html",
      body: "<html>not a bars body at all</html>",
    }));

    await expect(
      createAlpacaProvider(CREDENTIAL, {
        baseUrl: harness.origin,
      }).fetchBars(REQUEST),
    ).rejects.toThrow();
  });

  it("answers ok-and-empty for an unknown symbol, because this endpoint cannot tell", async () => {
    // **`unknown-symbol` is not producible from this endpoint**, measured: a
    // ticker that does not exist answers `200 {"bars":{},"next_page_token":null}`,
    // byte-identical to a real symbol with no prints in the window. `PROVIDER.md`
    // §8.2 makes the second a success, so the two are indistinguishable and
    // inventing the member from an empty answer would tell a user a real
    // security does not exist. Task 2.7.8's assets endpoint is the only thing
    // that can separate them.
    const harness = await serveRaw(() => ({
      status: 200,
      contentType: "application/json",
      body: recorded("empty-200-unknown-symbol.json"),
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    assert(result.outcome === "ok");
    expect(result.series.bars).toHaveLength(0);
    expect(result.series.coverage.covered).toBeNull();
  });

  it("answers ok-and-empty for a range before this plan's history depth", async () => {
    // And the same for `range-not-available`: 1990 is a `200` and empty rather
    // than a refusal, so that member is not producible by this route either.
    const harness = await serveRaw(() => ({
      status: 200,
      contentType: "application/json",
      body: recorded("empty-200-before-history.json"),
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(REQUEST);

    assert(result.outcome === "ok");
    expect(result.series.bars).toHaveLength(0);
  });

  it("puts nothing of the credential in any failure it returns or throws", async () => {
    // Task 2.1.6's discipline applied to a second vendor: read the whole result
    // and the whole error rather than its message, because a body may echo a
    // header and a serialised error may carry properties nobody enumerated. The
    // needle is deliberately not the local fixture credential either — a test
    // written against a public fixture passes while leaking a real one.
    const secret = "SECRET-THAT-MUST-NEVER-APPEAR-6f2a";
    const credential: AlpacaConfig = { keyId: "key-id-9c1", secretKey: secret };

    const cases: { status: number; body: string }[] = [
      { status: 401, body: recorded("error-401-bad-key.html") },
      { status: 403, body: recorded("error-403-recent-window.json") },
      { status: 429, body: recorded("error-429-rate-limited.json") },
      { status: 500, body: "<html>500</html>" },
      { status: 400, body: recorded("error-400-end-before-start.json") },
    ];

    for (const { status, body } of cases) {
      const harness = await serveRaw(() => ({
        status,
        contentType: "application/json",
        body,
      }));
      const provider = createAlpacaProvider(credential, {
        baseUrl: harness.origin,
      });

      let seen: unknown;
      try {
        seen = await provider.fetchBars(REQUEST);
      } catch (error) {
        // The WHOLE object, own properties and all — not `error.message`.
        seen = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          own: Object.getOwnPropertyNames(error as object).map((key) =>
            String((error as Record<string, unknown>)[key]),
          ),
        };
      }

      const rendered = JSON.stringify(seen);
      expect(rendered).not.toContain(secret);
      expect(rendered).not.toContain(credential.keyId);
      await closeServer();
    }
  });
});

/**
 * The walk (Task 2.7.5).
 *
 * These drive a **real local HTTP server** rather than a `fetch` stub, which is
 * what `baseUrl` exists for and is the difference between testing this file and
 * testing a mock of it. Pages are served from an array, so the assertions are
 * about what the client *did* — how many requests, carrying which tokens, and
 * what it assembled — rather than about how it is written.
 */
describe("createAlpacaProvider — pagination", () => {
  /**
   * A range wide enough that several pages are *legitimate*.
   *
   * **The page bound makes this necessary, and that is the bound working
   * rather than an inconvenience.** `REQUEST` is one regular session — 390
   * minutes — and at a measured 10,000-bar page ceiling a correct answer to it
   * **cannot** span three pages. Written against `REQUEST`, the walk tests
   * below fail on the bound, which is exactly the diagnosis the bound exists to
   * give. Thirty days of wall clock is 43,200 possible minute bars, which is
   * five pages of headroom.
   */
  const WIDE_REQUEST: BarsRequest = {
    ...REQUEST,
    range: toTimeRange(
      new Date("2026-08-03T13:30:00Z"),
      new Date("2026-09-04T20:00:00Z"),
    ),
  };

  /** A body whose single bar is stamped `minute` minutes after the open. */
  function pageBody(minute: number, token: string | null) {
    const at = new Date(WIDE_REQUEST.range.start.getTime() + minute * 60_000);
    return JSON.stringify({
      bars: {
        NVDA: [
          {
            t: at.toISOString(),
            o: 1.5,
            h: 2,
            l: 1,
            c: 1.75 + minute,
            v: 100,
            n: 3,
            vw: 1.6,
          },
        ],
      },
      next_page_token: token,
    });
  }

  it("walks every page and concatenates them into one series", async () => {
    const pages = [pageBody(0, "p2"), pageBody(1, "p3"), pageBody(2, null)];
    let served = 0;
    const harness = await serve(() => ({
      status: 200,
      body: pages[served++] ?? "unreachable",
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(WIDE_REQUEST);

    assert(result.outcome === "ok");
    expect(harness.requests).toHaveLength(3);
    expect(result.series.bars).toHaveLength(3);

    // Ascending across the seams, which is what `toBarSeries` refuses if a walk
    // concatenates out of order — the check a pagination bug trips first.
    expect(result.series.bars.map((bar) => bar.close)).toEqual([
      1.75, 2.75, 3.75,
    ]);
  });

  it("sends the token it was given, and sends none on the first page", async () => {
    const pages = [pageBody(0, "TOKEN-TWO"), pageBody(1, null)];
    let served = 0;
    const harness = await serve(() => ({
      status: 200,
      body: pages[served++] ?? "unreachable",
    }));

    await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(WIDE_REQUEST);

    const [first, second] = harness.requests.map(
      (captured) => new URL(captured.url, "http://x").searchParams,
    );

    // **Absent on the first page rather than empty.** An `undefined` spread into
    // the query would reach the URL as the literal string `"undefined"`, which
    // this vendor answers `400` for — the same absent-versus-present-and-
    // undefined distinction `apiError()` makes, in a place that costs a metered
    // request.
    expect(first?.has("page_token")).toBe(false);
    expect(second?.get("page_token")).toBe("TOKEN-TWO");
  });

  it("counts every page in the one provenance record", async () => {
    const pages = [pageBody(0, "p2"), pageBody(1, null)];
    let served = 0;
    const harness = await serve(() => ({
      status: 200,
      body: pages[served++] ?? "unreachable",
    }));

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(WIDE_REQUEST);

    assert(result.outcome === "ok");

    // One fetch of one symbol from one feed at one adjustment is ONE source,
    // however many HTTP requests it took — and `barCount` is the total, which
    // `toBarSeries` cross-checks against `bars.length`. That check is exactly
    // what a walk that drops or double-counts a page trips.
    expect(result.series.provenance.sources).toHaveLength(1);
    expect(result.series.provenance.sources[0].barCount).toBe(2);
  });

  it("stamps retrievedAt once, at the START of the walk", async () => {
    const pages = [pageBody(0, "p2"), pageBody(1, null)];
    let served = 0;
    const before = Date.now();
    const harness = await serve(async () => {
      // A slow second page, so a stamp taken at completion would be visibly
      // later than one taken at the start.
      await new Promise((resolve) => setTimeout(resolve, 60));
      return { status: 200, body: pages[served++] ?? "unreachable" };
    });

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(WIDE_REQUEST);
    const after = Date.now();

    assert(result.outcome === "ok");
    const stamped = Date.parse(result.series.provenance.sources[0].retrievedAt);

    // Stamped before the first request rather than after the last: a slow walk
    // stamped at completion claims a freshness its EARLIEST bars do not have,
    // and reporting staleness is the field's whole job.
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThan(after - 100);
  });

  it("assembles three RECORDED pages into the session they came from", async () => {
    // **Real vendor bodies rather than synthetic ones**, recorded 2026-09-07 by
    // walking 2026-09-03's regular session at a deliberately small page size:
    // 150 + 150 + 90 = 390, which is what the trading calendar says that
    // session contains. The page size is small on purpose — the loop behaves
    // identically at any size, and three pages at the shipped 10,000-bar
    // ceiling is ~2.7 MB of fixtures to prove that a loop iterates.
    //
    // What these add over the synthetic pages above is everything the vendor
    // decides: the real token format, the real bar shape, and a real page
    // boundary falling mid-session.
    const pages = [1, 2, 3].map((page) =>
      readFileSync(
        join(
          import.meta.dirname,
          "fixtures",
          "alpaca",
          `nvda-1min-walk-page-${String(page)}.json`,
        ),
        "utf8",
      ),
    );
    let served = 0;
    const harness = await serve(() => ({
      status: 200,
      body: pages[served++] ?? "unreachable",
    }));

    // **`WIDE_REQUEST` rather than the session's own range, and the reason is a
    // constraint anyone recording more fixtures needs.** The page bound is
    // derived from the requested range against the *shipped* 10,000-bar
    // ceiling, so a 390-bar session can never legitimately span three pages —
    // and these bodies were recorded at 150. A fixture taken at a reduced page
    // size is therefore only replayable against a range wide enough to justify
    // its page count. The alternative was making the bound injectable, which is
    // test-shaped API on shipped code and is what Task 1.10.5 refused with
    // `MIN_PORT`.
    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(WIDE_REQUEST);

    assert(result.outcome === "ok");
    expect(harness.requests).toHaveLength(3);

    // 390 — the calendar's `minuteBars` for that session, reassembled across
    // three pages. This is the assertion a walk that drops or double-counts a
    // page fails, and `toBarSeries` cross-checks it against `barCount` too.
    expect(result.series.bars).toHaveLength(390);
    expect(result.series.provenance.sources[0].barCount).toBe(390);

    // Ascending ACROSS the seams, which is what a walk that concatenates out of
    // order breaks. `toBarSeries` refuses a non-ascending series outright, so
    // this is belt and braces on the boundary specifically.
    expect(result.series.bars[149]?.startsAt.getTime()).toBeLessThan(
      result.series.bars[150]?.startsAt.getTime() ?? 0,
    );
    expect(result.series.bars[0]?.startsAt.toISOString()).toBe(
      "2026-09-03T13:30:00.000Z",
    );
    expect(result.series.bars.at(-1)?.startsAt.toISOString()).toBe(
      "2026-09-03T19:59:00.000Z",
    );
  });

  it("costs no request at all when the whole window is withheld", async () => {
    // A range entirely inside the last ~16 minutes. There is nothing the vendor
    // could serve, so asking is a metered request guaranteed to be refused —
    // and Story 2.8's backfill will produce exactly this shape on a symbol it
    // is already caught up on.
    const harness = await serve(() => ({ status: 200, body: "unreachable" }));
    const now = Date.now();

    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars({
      ...REQUEST,
      range: toTimeRange(new Date(now - 5 * 60_000), new Date(now)),
    });

    // **A success with nothing in it**, which `PROVIDER.md` §8.2 makes the
    // correct answer — never an error, because §7 says the withheld window must
    // not map onto one.
    assert(result.outcome === "ok");
    expect(result.series.bars).toHaveLength(0);

    // `covered` is null rather than a window, so this reports "we reached
    // nothing" rather than claiming coverage it does not have.
    expect(result.series.coverage.covered).toBeNull();

    // And the point: no HTTP request was made.
    expect(harness.requests).toHaveLength(0);
  });

  it("refuses a token loop rather than returning what it has", async () => {
    // A vendor that never stops. Without a bound this is an infinite loop that
    // looks like a slow request and burns a rate limit producing nothing.
    let served = 0;
    const harness = await serve(() => ({
      status: 200,
      body: pageBody(served++ % 300, "never-ends"),
    }));

    await expect(
      createAlpacaProvider(CREDENTIAL, {
        baseUrl: harness.origin,
      }).fetchBars(REQUEST),
    ).rejects.toThrow(/next_page_token after/);

    // **The bound is derived, and this is the tight case.** `REQUEST` is one
    // regular session — 390 possible minute bars against a 10,000-bar page
    // ceiling — so a correct answer cannot span two pages, let alone many. The
    // floor of 2 plus the boundary slack is all this range ever gets, and a
    // vendor that keeps handing out tokens is stopped almost immediately rather
    // than after some round number nobody derived.
    expect(harness.requests.length).toBeLessThanOrEqual(3);
  });

  it("bounds the whole walk by the caller's deadline, not each page", async () => {
    const harness = await serve(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return { status: 200, body: pageBody(0, "keeps-going") };
    });

    const started = Date.now();
    const result = await createAlpacaProvider(CREDENTIAL, {
      baseUrl: harness.origin,
    }).fetchBars(WIDE_REQUEST, { deadlineMs: 90 });
    const elapsed = Date.now() - started;

    // `timeout`, discarding the pages already fetched — never a partial `ok`.
    // A clipped `covered` is indistinguishable from "the vendor had nothing
    // after this point", which is the one distinction Story 2.8's backfill has
    // to make: one means resume, the other means done.
    expect(result.outcome).toBe("timeout");

    // A PER-PAGE deadline would let this run for as many pages as the vendor
    // chose. One composed signal is what makes the promise the caller was given
    // the promise they get.
    expect(elapsed).toBeLessThan(400);
  });
});
