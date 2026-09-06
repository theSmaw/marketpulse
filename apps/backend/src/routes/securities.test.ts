// GET /securities, driven by `app.inject()` (Task 2.4.2).
//
// The integration level, which is where this repository's route tests live: the
// real Fastify instance, the real error contract, the real serialiser, and a
// **stub repository** in place of the database. That last substitution is the
// point rather than a shortcut — the route takes a `SecuritiesRepository`
// interface precisely so every branch of it, the malformed-row failure
// included, is reachable without a socket. `securities.database.test.ts` is
// where the claims only a real server can settle already live.
//
// The route is registered here the way `index.ts` registers it, because
// `buildServer()` does not know about it; `routes/securities.ts` carries the
// argument for that and `server.test.ts`'s route-table walk covers the schema
// declaration from the other side.

import { REQUEST_ID_HEADER, toTicker } from "@marketpulse/shared";
import type {
  ApiError,
  SecuritiesProvenance,
  Security,
} from "@marketpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { SecurityMappingError } from "../securities.js";
import type { SecuritiesRepository } from "../securities.js";
import { buildServer } from "../server.js";

import { createSecuritiesRoutes } from "./securities.js";

const CORS_ORIGIN = "http://localhost:5173";

const NVDA: Security = {
  symbol: toTicker("NVDA"),
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
};

/** An index proxy: the row whose `sector` is genuinely null. */
const SPY: Security = {
  symbol: toTicker("SPY"),
  name: "SPDR S&P 500 ETF Trust",
  exchange: "ARCA",
  kind: "index_etf",
  sector: null,
  industry: null,
  status: "active",
  cik: null,
};

const PROVENANCE: SecuritiesProvenance = {
  profile: { source: "curated", retrievedAt: "2026-09-05T00:00:00.000Z" },
  classification: {
    source: "curated",
    retrievedAt: "2026-09-05T00:00:00.000Z",
  },
};

/**
 * A repository that answers with whatever the test wants, including by
 * throwing.
 *
 * A file-local helper rather than a shared module, for the reason
 * `server.test.ts` states: test files are forced to live inside this package's
 * tsconfig `include`, so a `src/test-support.ts` would emit into `dist/` and
 * ship beside the server.
 */
function stubRepository(
  securities: readonly Security[] | Error,
  provenances: readonly SecuritiesProvenance[] = [PROVENANCE],
): SecuritiesRepository {
  return {
    listSecurities: () =>
      securities instanceof Error
        ? Promise.reject(securities)
        : Promise.resolve(securities),
    listSecuritiesProvenance: () => Promise.resolve(provenances),
  };
}

let open: FastifyInstance | undefined;

async function server(
  repository: SecuritiesRepository,
  configure?: (app: FastifyInstance) => void,
): Promise<FastifyInstance> {
  const app = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: CORS_ORIGIN,
  });

  configure?.(app);
  app.register(createSecuritiesRoutes(repository));

  await app.ready();
  open = app;
  return app;
}

afterEach(async () => {
  await open?.close();
  open = undefined;
});

describe("GET /securities", () => {
  it("answers 200 with the universe in an envelope", async () => {
    const app = await server(stubRepository([NVDA, SPY]));

    const response = await app.inject({ method: "GET", url: "/securities" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toEqual({
      securities: [NVDA, SPY],
      provenance: PROVENANCE,
    });
  });

  it("carries a null sector as null and not as the string 'null'", async () => {
    // The measurement behind `type: ["string", "null"]` in the schema, kept as
    // an assertion because the failure it prevents is silent. Produced by
    // declaring the field plainly `"string"` and running this file: five of
    // these nine tests go red and the value on the wire is the **empty
    // string** — so `sector` stops being "there is no answer" and becomes a
    // blank cell reading as "unclassified", which is the exact distinction the
    // discriminated union in `packages/shared` exists to keep.
    const app = await server(stubRepository([SPY]));

    const body = await app
      .inject({ method: "GET", url: "/securities" })
      .then((response) => response.json<{ securities: Security[] }>());

    expect(body.securities[0]?.sector).toBeNull();
    expect(body.securities[0]?.industry).toBeNull();
    expect(body.securities[0]?.cik).toBeNull();
    // The raw payload, because `JSON.parse` is exactly what would hide it.
    expect(
      await app
        .inject({ method: "GET", url: "/securities" })
        .then((response) => response.body),
    ).toContain('"sector":null');
  });

  it("returns an untracked security rather than filtering it out", async () => {
    // `status` is this schema's one invisible predicate and `UNIVERSE.md` §12.2
    // puts this reader on the *do not filter* side. The route does not filter
    // because the repository does not; this asserts the whole path keeps it,
    // which is the acceptance criterion the page renders against.
    const untracked: Security = {
      ...NVDA,
      symbol: toTicker("GILD"),
      status: "untracked",
    };
    const app = await server(stubRepository([untracked]));

    expect(
      await app
        .inject({ method: "GET", url: "/securities" })
        .then((response) => response.json<{ securities: Security[] }>()),
    ).toEqual({ securities: [untracked], provenance: PROVENANCE });
  });

  it("answers an empty universe with an empty array and no provenance", async () => {
    // The loaded-but-empty case, which is exactly what a migrated but unseeded
    // database looks like — and the one this contract had to decide rather than
    // discover, because there is nothing to attribute a source to.
    const app = await server(stubRepository([], []));

    const response = await app.inject({ method: "GET", url: "/securities" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ securities: [] });
  });

  it("omits provenance when the rows no longer agree", async () => {
    // Story 2.7 arriving: profile fields from Alpaca, classification still
    // curated, so the rows stop sharing a `profile` pair. The envelope's
    // provenance is a claim about *every* security in the response, so it stops
    // being made rather than picking a row to be true of.
    const app = await server(
      stubRepository(
        [NVDA, SPY],
        [
          PROVENANCE,
          {
            ...PROVENANCE,
            profile: {
              source: "alpaca",
              retrievedAt: "2026-11-01T00:00:00.000Z",
            },
          },
        ],
      ),
    );

    expect(
      await app
        .inject({ method: "GET", url: "/securities" })
        .then((response) => response.json<unknown>()),
    ).toEqual({ securities: [NVDA, SPY] });
  });

  it("carries the correlation id like every other response", async () => {
    const app = await server(stubRepository([NVDA]));

    expect(
      (await app.inject({ method: "GET", url: "/securities" })).headers[
        REQUEST_ID_HEADER
      ],
    ).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("a row the database should have refused", () => {
  it("answers 500 in the ApiError shape and names nothing", async () => {
    // Task 2.4.1 decided a row that does not map fails the whole read; this
    // owns what the route does with it, and the answer needed no code —
    // Task 1.7.4's error handler maps an uncaught throw to 500 /
    // INTERNAL_ERROR, which is correct because a malformed row is this server
    // having failed rather than the client having asked wrongly.
    const app = await server(stubRepository(new SecurityMappingError("NVDA")));

    const response = await app.inject({ method: "GET", url: "/securities" });

    expect(response.statusCode).toBe(500);

    const body = response.json<ApiError>();
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.requestId).toBe(response.headers[REQUEST_ID_HEADER]);

    // The thrown message names the offending symbol, and Task 1.7.4's rule is
    // that a 5xx never carries the thrown message. Both halves asserted: the
    // symbol is absent, and so is everything else the error could have leaked.
    expect(response.body).not.toContain("NVDA");
    expect(response.body).not.toContain("check constraints");
    expect(body.message).toBe("An unexpected error occurred.");
  });
});

describe("what the schema strips", () => {
  it("drops a field the schema does not declare", async () => {
    // Asserted on **this route** rather than on a copy of its schema, through a
    // `preSerialization` hook: an `onSend` hook is handed a string that has
    // already been stripped, so it could only ever confirm itself. This is the
    // mechanism behind "no internal detail reaches a client", and it is also
    // the trap the `satisfies` guard exists for — a field added to
    // `SecuritiesResponse` and forgotten in the schema disappears exactly like
    // this, with a green build.
    const app = await server(stubRepository([NVDA]), (instance) => {
      instance.addHook(
        "preSerialization",
        (_request, _reply, payload, done) => {
          done(null, { ...(payload as object), poolPassword: "hunter2" });
        },
      );
    });

    const response = await app.inject({ method: "GET", url: "/securities" });

    expect(response.body).not.toContain("hunter2");
    expect(response.json()).not.toHaveProperty("poolPassword");
  });

  it("drops an undeclared field from inside a security too", async () => {
    // The nested half, which is the one the top-level guard cannot see. A
    // `Security` is serialised through `securitySchema`, so an extra column
    // that ever reached the mapper — a provenance value, an internal `id` —
    // does not reach the wire either.
    const app = await server(
      // The cast goes through `unknown`, because the whole point of this case
      // is a value the type system says cannot exist: a row carrying columns
      // `Security` does not have. The serialiser is what has to refuse it.
      stubRepository([
        { ...NVDA, id: "1", profile_source: "curated" } as unknown as Security,
      ]),
    );

    const response = await app.inject({ method: "GET", url: "/securities" });

    expect(response.body).not.toContain("profile_source");
    expect(response.json<{ securities: Security[] }>().securities[0]).toEqual(
      NVDA,
    );
  });
});
