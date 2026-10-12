// The diagnostic endpoint, driven through the assembled server (Task 2.1.7).
//
// It is an integration test in Task 1.9.6's third sense — the real HTTP layer
// through `app.inject()`, with the response schema and both error handlers
// registered — because everything worth asserting here is a property of the
// *serialised* response: that the reason never reaches the wire, that a cached
// answer says it is cached, and that the endpoint answers 200 when the database
// is down.
//
// It needs no socket and no database. The check is a function, which is the
// whole reason `createDiagnosticsRoutes` takes one rather than a pool.

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import type { DatabaseCheck, DatabaseCheckFn } from "../database.js";
import type { AttemptRow, CoverageRow } from "../store-freshness.js";
import { toMarketDate, toTicker, toTimeRange } from "@marketpulse/shared";
import { buildServer } from "../server.js";
import type { FeedDiagnostic } from "./diagnostics.js";
import { createDiagnosticsRoutes } from "./diagnostics.js";

const PATH = "/diagnostics/database";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** What `GET /diagnostics/feed` reports when nothing has configured a stream. */
const NO_FEED: FeedDiagnostic = {
  provider: "none",
  feed: null,
  status: null,
  observedAt: null,
  marketOpen: false,
  checkedAt: "2026-09-18T00:00:00.000Z",
};

async function serverWith(
  check: DatabaseCheckFn,
  coverage: readonly CoverageRow[] = [],
  attempts: readonly AttemptRow[] = [],
  feed: FeedDiagnostic = NO_FEED,
): Promise<FastifyInstance> {
  const instance = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  // Registered here rather than by `buildServer()`, exactly as `index.ts` does
  // it — so this test drives the arrangement that ships rather than a
  // convenient one.
  instance.register(
    createDiagnosticsRoutes(
      check,
      () => Promise.resolve(coverage),
      () => Promise.resolve(attempts),
      () => feed,
    ),
  );

  await instance.ready();
  app = instance;
  return instance;
}

const reachable: DatabaseCheck = {
  ok: true,
  ms: 23.456,
  checkedAt: Date.parse("2026-09-05T12:00:00.000Z"),
  ageMs: 0,
};

describe("GET /diagnostics/database", () => {
  it("reports a reachable database", async () => {
    const instance = await serverWith(() => Promise.resolve(reachable));

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      reachable: true,
      ms: 23.46,
      ageMs: 0,
      checkedAt: "2026-09-05T12:00:00.000Z",
    });
  });

  // The property the whole endpoint rests on. A 503 here would claim this
  // endpoint failed, and would need an `API_ERROR_CODES` member that
  // `database.ts` reserves for Story 2.9.
  it("answers 200 when the database is UNREACHABLE, because the question was answered", async () => {
    const instance = await serverWith(() =>
      Promise.resolve({
        ok: false as const,
        ms: 5001,
        checkedAt: Date.parse("2026-09-05T12:00:00.000Z"),
        ageMs: 0,
        error: new Error("connect ETIMEDOUT 203.0.113.7:5432"),
      }),
    );

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ reachable: false, ms: 5001 });
  });

  // The ingress is public and unauthenticated, so this is the assertion that
  // keeps it safe to be. Written against the raw payload rather than the parsed
  // body, because the thing being checked is what left the process.
  //
  // **Making it fail took two edits rather than one, and that is the finding.**
  // Adding `detail: check.error.message` to the handler alone leaves this test
  // GREEN, because `fast-json-stringify` strips a property the schema does not
  // declare — Task 1.7.3's mechanism, measured again on a new route. It only
  // goes red once the field is declared in `diagnosticProperties` too. So what
  // actually holds this endpoint closed is the **schema**, and this test is a
  // check on the schema as much as on the handler. Do not read a green run here
  // as evidence that a handler could not leak.
  it("never puts the reason, the host or the driver on the wire", async () => {
    const instance = await serverWith(() =>
      Promise.resolve({
        ok: false as const,
        ms: 12,
        checkedAt: Date.now(),
        ageMs: 0,
        error: Object.assign(
          new Error(
            'no pg_hba.conf entry for host "40.121.18.106", user "marketpulse-backend"',
          ),
          {
            code: "28000",
            host: "psql-marketpulse-dev.postgres.database.azure.com",
          },
        ),
      }),
    );

    const response = await instance.inject({ method: "GET", url: PATH });

    for (const needle of [
      "pg_hba",
      "40.121.18.106",
      "marketpulse-backend",
      "postgres.database.azure.com",
      "28000",
      "error",
      "stack",
    ]) {
      expect(response.payload).not.toContain(needle);
    }
  });

  // The half that makes a bounded check honest: a caller must be able to tell a
  // cached answer from a fresh one, or the bound is a lie dressed as a
  // measurement.
  it("reports how stale the answer is", async () => {
    const instance = await serverWith(() =>
      Promise.resolve({ ...reachable, ageMs: 4321.6 }),
    );

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.json()).toMatchObject({ ageMs: 4322 });
  });

  // The correlation id is the entire mechanism joining "reachable: false" to
  // the log record that says why, so its presence on this route is a contract
  // rather than an inherited convenience.
  it("carries the correlation id that joins the body to the reason in the log", async () => {
    const instance = await serverWith(() => Promise.resolve(reachable));

    const response = await instance.inject({ method: "GET", url: PATH });

    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  // `server.test.ts` walks the route table for this and cannot see this route,
  // because it is registered from `index.ts` and not by `buildServer()`. So the
  // check is made here instead, on the same rule: declare `500: apiErrorSchema`
  // on every route that can fail.
  it("declares the error contract on its 500, which the route-table walk cannot see", async () => {
    const declared: unknown[] = [];

    const instance = buildServer({
      logLevel: "silent",
      logFormat: "json",
      corsOrigin: "http://localhost:5173",
    });
    instance.addHook("onRoute", (route) => {
      // Filtered to GET: Fastify's `exposeHeadRoutes` default registers a HEAD
      // route beside every GET, so an unfiltered walk sees two entries for one
      // declaration — the same class of surprise as the `OPTIONS *` preflight
      // route `server.test.ts` found on its first run.
      if (route.url === PATH && route.method === "GET")
        declared.push(route.schema);
    });
    instance.register(
      createDiagnosticsRoutes(
        () => Promise.resolve(reachable),
        () => Promise.resolve([]),
        () => Promise.resolve([]),
        () => NO_FEED,
      ),
    );
    await instance.ready();
    app = instance;

    const { apiErrorSchema } = await import("../errors.js");
    expect(declared).toHaveLength(1);
    expect(declared[0]).toMatchObject({ response: { 500: apiErrorSchema } });
  });
});

describe("GET /diagnostics/freshness", () => {
  it("reports every timeframe the system stores, including one with no rows", () => {
    // The original defect was not a wrong number — it was an ABSENT one. A
    // timeframe reported by omission is a timeframe nobody notices, which is
    // why the arithmetic enumerates `TIMEFRAMES` rather than the ledger.
    return withFreshness([], async (instance) => {
      const response = await instance.inject({
        method: "GET",
        url: "/diagnostics/freshness",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{
        timeframes: { timeframe: string }[];
        checkedAt: string;
      }>();

      expect(body.timeframes.map((entry) => entry.timeframe).sort()).toEqual([
        "1d",
        "1m",
      ]);
      expect(body.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  it("sends an unknown staleness as null and NEVER as zero", () => {
    // **The trap `CLAUDE.md` names, on the one endpoint where it is worst.**
    // `fast-json-stringify` coerces a `null` under a bare `"number"` to `0`.
    // Here `null` means *we cannot tell* and `0` means *perfectly current* — so
    // the wrong schema would make an empty store report as a healthy one, in
    // the diagnostic built to catch exactly that. The schema declares
    // `["number", "null"]`; this is the assertion that it still does.
    return withFreshness([], async (instance) => {
      const body = (
        await instance.inject({
          method: "GET",
          url: "/diagnostics/freshness",
        })
      ).json<{
        timeframes: { sessionsBehind: number | null }[];
      }>();

      for (const entry of body.timeframes) {
        expect(entry.sessionsBehind).toBeNull();
        expect(entry.sessionsBehind).not.toBe(0);
      }
    });
  });

  it("puts a real lag on the wire", () => {
    return withFreshness(
      [
        {
          symbol: toTicker("NVDA"),
          timeframe: "1d",
          covered: toTimeRange(
            new Date("2024-01-02T14:30:00.000Z"),
            new Date("2026-09-04T20:00:00.000Z"),
          ),
        },
      ],
      async (instance) => {
        const body = (
          await instance.inject({
            method: "GET",
            url: "/diagnostics/freshness",
          })
        ).json<{
          timeframes: {
            timeframe: string;
            newestSession: string | null;
            sessionsBehind: number | null;
          }[];
        }>();

        const daily = body.timeframes.find((e) => e.timeframe === "1d");
        expect(daily?.newestSession).toBe("2026-09-04");
        // A number rather than the number: this runs against the real clock, so
        // pinning it would go red every trading day. What must be true is that a
        // store frozen in the past is reported as behind rather than as current.
        expect(daily?.sessionsBehind).toBeGreaterThan(0);
      },
    );
  });

  // **Task 2.8.13's three additions to this wire, and all three were a figure
  // somebody had to leave the endpoint to interpret.**
  it("names the securities a figure is about, so a reader needs no second endpoint", () => {
    // The investigation that produced the split had `stalestSessionsBehind: 4`
    // and nothing else, and finding out it meant WBD and PSKY cost a histogram
    // over 518 ledger rows from a second endpoint.
    return withFreshness(
      [
        coverageRow("WBD", "1d", "2026-09-04T20:00:00.000Z"),
        coverageRow("NVDA", "1d", "2026-10-09T20:00:00.000Z"),
      ],
      async (instance) => {
        const daily = (await freshnessOf(instance)).timeframes.find(
          (entry) => entry.timeframe === "1d",
        );

        // Whatever the clock, `WBD` is further behind than `NVDA`, so it alone
        // is at the stalest figure. Asserting the names rather than the number
        // is what keeps this test off the calendar.
        expect(daily?.stalestSecurities).toEqual(["WBD"]);
        expect(daily?.stalestSecurityCount).toBe(1);
      },
    );
  });

  it("drops a session from the gate's figure when an empty answer explains it", async () => {
    // The whole repair, as a difference rather than as an absolute: the clock is
    // real, so the gap from 2026-09-04 grows every session and no pinned number
    // survives tomorrow. What is stable is that ONE recorded empty answer
    // accounts for exactly one session — and 2026-09-08 is the first session
    // after the 4th, because the 7th is Labor Day.
    const ledger = [coverageRow("WBD", "1d", "2026-09-04T20:00:00.000Z")];

    const before = await dailyFreshness(ledger, []);
    const after = await dailyFreshness(ledger, [
      {
        symbol: toTicker("WBD"),
        timeframe: "1d",
        sessionDate: toMarketDate("2026-09-08"),
        outcome: "ok",
      },
    ]);

    // The reported figure is untouched — it is the true number and the only one
    // that can see a partial fill. Only the gate's figure moves.
    expect(after.stalestSessionsBehind).toBe(before.stalestSessionsBehind);
    expect(after.unexplainedSessionsBehind).toBe(
      (before.unexplainedSessionsBehind ?? 0) - 1,
    );
    expect(after.unexplainedSecurities).toEqual(["WBD"]);
  });

  it("sends an unknown gate figure as null and NEVER as zero", () => {
    // The same trap as `sessionsBehind` above, on the field the deployed gate
    // now fails on — where `0` reads as *nothing unexplained, pass*. The schema
    // declares `["number", "null"]`; this is the assertion that it still does.
    return withFreshness([], async (instance) => {
      for (const entry of (await freshnessOf(instance)).timeframes) {
        expect(entry.unexplainedSessionsBehind).toBeNull();
        expect(entry.unexplainedSessionsBehind).not.toBe(0);
        // An absence here is the other failure: `check-deployed.mjs` reads a
        // missing field as *the running revision predates the gate*, so a field
        // the serialiser stripped would read as a bad rollout for ever.
        expect(entry).toHaveProperty("unexplainedSecurities");
        expect(entry.unexplainedSecurities).toEqual([]);
      }
    });
  });

  it("names nobody when nothing is behind, rather than naming the whole universe", () => {
    // A figure of zero means no security is behind; ten symbols beside it would
    // read as ten findings. The ledger here reaches the current session, so
    // this is the steady state rather than a contrived one.
    return withFreshness(
      [coverageRow("NVDA", "1d", nextSessionClose())],
      async (instance) => {
        const daily = (await freshnessOf(instance)).timeframes.find(
          (entry) => entry.timeframe === "1d",
        );

        expect(daily?.stalestSessionsBehind).toBe(0);
        expect(daily?.stalestSecurities).toEqual([]);
        expect(daily?.stalestSecurityCount).toBe(0);
      },
    );
  });
});

/** The `1d` entry, from a server built, read and closed for this one answer. */
async function dailyFreshness(
  coverage: readonly CoverageRow[],
  attempts: readonly AttemptRow[],
): Promise<{
  stalestSessionsBehind: number | null;
  unexplainedSessionsBehind: number | null;
  unexplainedSecurities: string[];
}> {
  // Closed here rather than left to `afterEach`, because this test needs two
  // servers and that hook closes one. A leaked Fastify instance is an open
  // handle in a suite whose contract is that it opens no socket.
  const instance = await serverWith(
    () => Promise.resolve({ ok: true as const, ms: 0, ageMs: 0, checkedAt: 0 }),
    coverage,
    attempts,
  );

  try {
    const daily = (await freshnessOf(instance)).timeframes.find(
      (entry) => entry.timeframe === "1d",
    );
    if (daily === undefined) throw new Error("no 1d entry on the wire");
    return daily;
  } finally {
    await instance.close();
    app = undefined;
  }
}

/** One ledger row, in the shape the freshness read takes. */
function coverageRow(
  symbol: string,
  timeframe: "1m" | "1d",
  end: string,
): CoverageRow {
  return {
    symbol: toTicker(symbol),
    timeframe,
    covered: toTimeRange(new Date("2024-01-02T14:30:00.000Z"), new Date(end)),
  };
}

/**
 * A covered end far enough ahead that no session can be after it.
 *
 * The honest way to write "current" against a real clock: a store cannot be
 * behind a session that has not happened, and `sessionsBetween` floors at zero
 * rather than going negative.
 */
function nextSessionClose(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

/** The parsed freshness body, typed as the check reads it. */
async function freshnessOf(instance: FastifyInstance): Promise<{
  timeframes: {
    timeframe: string;
    newestSession: string | null;
    sessionsBehind: number | null;
    stalestSessionsBehind: number | null;
    stalestSecurities: string[];
    stalestSecurityCount: number;
    unexplainedSessionsBehind: number | null;
    unexplainedSecurities: string[];
    unexplainedSecurityCount: number;
  }[];
}> {
  const response = await instance.inject({
    method: "GET",
    url: "/diagnostics/freshness",
  });

  expect(response.statusCode).toBe(200);
  return response.json();
}

/** A server with a stubbed coverage ledger, torn down after the assertion. */
async function withFreshness(
  coverage: readonly CoverageRow[],
  assertion: (instance: FastifyInstance) => Promise<void>,
  attempts: readonly AttemptRow[] = [],
): Promise<void> {
  const instance = await serverWith(
    () =>
      Promise.resolve({
        ok: true as const,
        ms: 0,
        ageMs: 0,
        checkedAt: 0,
      }),
    coverage,
    attempts,
  );
  await assertion(instance);
}
