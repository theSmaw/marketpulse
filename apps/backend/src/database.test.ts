// The pool's construction, tested without a database and without a socket.
//
// **This file is in the fast suite deliberately, and it is only allowed to be
// because `new Pool()` is lazy.** `pg` opens nothing until something asks it
// for a client — verified below by reading `totalCount`, which is 0 on a
// freshly constructed pool — so everything this file asserts is a property of
// the configuration rather than of a connection. That is what keeps the
// property Story 1.9 and Task 1.10.5 both defended: `pnpm test` needs no build
// and no socket.
//
// Anything that needs a real connection is in `index.process.test.ts`, which
// spawns the built entrypoint, and its cost is stated there.

import type pg from "pg";
import { describe, expect, it } from "vitest";

import type { DatabaseConfig } from "./config.js";
import {
  CONNECT_TIMEOUT_MESSAGE,
  DIAGNOSTIC_CACHE_TTL_MS,
  POOL_IDLE_TIMEOUT_MS,
  createCachedDatabaseCheck,
  createDatabasePool,
  isDatabaseUnavailable,
  pingDatabase,
  throughDatabase,
} from "./database.js";

const base: DatabaseConfig = {
  host: "127.0.0.1",
  port: 5432,
  name: "marketpulse",
  user: "marketpulse",
  auth: "password",
  password: "fixture",
  ssl: "disable",
};

/**
 * Records what the pool reported, so the error handler can be asserted on.
 *
 * It records `debug` as well as `warn` since Task 2.1.6, and the two go into
 * **separate** arrays rather than one: `seen` is what this file's existing
 * assertions are written against, and a token-mint record landing in it would
 * make an assertion about the error handler pass or fail for the wrong reason.
 */
function recorder(): {
  warn: (o: object, m: string) => void;
  debug: (o: object, m: string) => void;
  seen: string[];
  debugged: { object: object; message: string }[];
} {
  const seen: string[] = [];
  const debugged: { object: object; message: string }[] = [];
  return {
    warn: (_o: object, m: string) => seen.push(m),
    debug: (object: object, message: string) =>
      debugged.push({ object, message }),
    seen,
    debugged,
  };
}

describe("createDatabasePool", () => {
  it("opens no socket, which is what lets this file be a fast test", async () => {
    const pool = createDatabasePool(base, recorder());

    expect(pool.totalCount).toBe(0);

    await pool.end();
  });

  // **The most important assertion in this file.** `pg.Pool` is an
  // `EventEmitter`, and an `EventEmitter` with no `error` listener *throws*
  // when one is emitted — so an idle pooled client whose connection the server
  // drops becomes an `uncaughtException`, which `index.ts` turns into a
  // level-60 record and `process.exit(1)`, which on a platform whose liveness
  // probe restarts the replica is a crash-loop caused by a Postgres restart.
  //
  // Produced against a real database while this was being written: with no
  // handler the process died on `terminating connection due to administrator
  // command`; with one, the message was logged and the next query succeeded on
  // a fresh client. This asserts the handler is still attached, which is the
  // half a unit test can hold.
  it("attaches an error handler, without which a dropped connection kills the process", async () => {
    const log = recorder();
    const pool = createDatabasePool(base, log);

    expect(pool.listenerCount("error")).toBe(1);

    // Emitting is safe precisely because the listener is there — this line is
    // what would throw if it were not.
    pool.emit("error", new Error("terminating connection"));
    expect(log.seen).toStrictEqual([
      "database pool client error, discarding the connection",
    ]);

    await pool.end();
  });

  it("bounds the wait for a connection, which pg does not do by default", async () => {
    const pool = createDatabasePool(base, recorder());

    // pg's own default is 0, meaning wait forever — measured against a socket
    // that accepts and never answers, where `query()` was still pending after
    // four seconds. Asserting "not 0" rather than the number keeps this about
    // the property rather than about the tuning.
    expect(pool.options.connectionTimeoutMillis).toBeGreaterThan(0);
    expect(pool.options.max).toBeGreaterThan(0);

    // What the database sees in `pg_stat_activity`, so Task 2.1.6 can evidence
    // a connection at both ends rather than guessing which row is ours.
    expect(pool.options.application_name).toBe("marketpulse-backend");

    await pool.end();
  });
});

describe("createDatabasePool TLS", () => {
  // The mapping is the reason `DATABASE_SSL` is three named modes rather than a
  // boolean: `require` encrypts without verifying and `verify-full` verifies,
  // and Task 2.1.1 recorded that Microsoft's own sample connection string does
  // the first while calling it TLS.
  it.each([
    ["disable", false],
    ["require", { rejectUnauthorized: false }],
    ["verify-full", { rejectUnauthorized: true }],
  ] as const)("maps %s onto what pg takes", async (ssl, expected) => {
    const pool = createDatabasePool({ ...base, ssl }, recorder());

    expect(pool.options.ssl).toStrictEqual(expected);

    await pool.end();
  });
});

describe("createDatabasePool credentials", () => {
  it("uses the literal password under password mode", async () => {
    const pool = createDatabasePool(base, recorder());

    expect(pool.options.password).toBe("fixture");

    await pool.end();
  });

  // The seam Task 2.1.6 fills. It is a discriminator rather than an inference:
  // `password` is structurally absent under `entra`, so this branch cannot be
  // reached by forgetting a variable, and it fails at **connect** time rather
  // than at construction — which is what keeps a process configured for `entra`
  // starting and serving `/health` instead of crash-looping.
  it("supplies a credential FUNCTION under entra, evaluated per connection rather than at construction", async () => {
    // Written out rather than spread from `base` with the password removed:
    // under `exactOptionalPropertyTypes` the entra shape is genuinely a
    // different object, and building it here is what the deployed environment
    // will actually produce.
    const pool = createDatabasePool(
      {
        host: base.host,
        port: base.port,
        name: base.name,
        user: "marketpulse-backend",
        auth: "entra",
        ssl: "verify-full",
      },
      recorder(),
    );

    const credential = pool.options.password;
    if (typeof credential !== "function") {
      expect.fail("entra mode should supply a credential function");
    }

    // The failure is deferred to a connection attempt rather than raised at
    // construction, which is what makes a misconfigured deployed replica
    // *degrade* rather than crash-loop. Driven here with no managed identity in
    // the environment, which is exactly what a laptop is: the rejection names
    // the platform and the way out rather than the mode.
    await expect(credential()).rejects.toThrow("IDENTITY_ENDPOINT is not set");

    await pool.end();
  });

  // **The leak assertion at this layer.** `entra-token.test.ts` proves the
  // acquisition itself carries nothing; this proves the pool's own record of it
  // carries nothing either, on the one line in this file that touches a token.
  it("logs that a token was minted and never any part of the token", async () => {
    const log = recorder();
    const token = "eyJhbGciOiJSUzI1NiJ9.PAYLOAD.SIGNATURE";

    const pool = createDatabasePool(
      {
        host: base.host,
        port: base.port,
        name: base.name,
        user: "marketpulse-backend",
        auth: "entra",
        ssl: "verify-full",
      },
      log,
    );

    // The identity endpoint stands in as a plain environment read inside the
    // acquisition, so the pool is driven through its real path with a stub
    // `fetch` supplied to the module rather than to the pool.
    const credential = pool.options.password;
    if (typeof credential !== "function") {
      expect.fail("entra mode should supply a credential function");
    }

    const original = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ access_token: token })),
      })) as unknown as typeof fetch;
    const originalEndpoint = process.env.IDENTITY_ENDPOINT;
    const originalHeader = process.env.IDENTITY_HEADER;
    process.env.IDENTITY_ENDPOINT = "http://localhost:42356/msi/token";
    process.env.IDENTITY_HEADER = "header-secret-value";

    try {
      await expect(credential()).resolves.toBe(token);
    } finally {
      globalThis.fetch = original;
      if (originalEndpoint === undefined) {
        delete process.env.IDENTITY_ENDPOINT;
      } else {
        process.env.IDENTITY_ENDPOINT = originalEndpoint;
      }
      if (originalHeader === undefined) {
        delete process.env.IDENTITY_HEADER;
      } else {
        process.env.IDENTITY_HEADER = originalHeader;
      }
    }

    expect(log.debugged).toHaveLength(1);
    const record = JSON.stringify(log.debugged);
    expect(record).toContain("tokenLength");
    expect(record).not.toContain(token);
    expect(record).not.toContain("eyJ");
    expect(record).not.toContain("header-secret-value");

    await pool.end();
  });
});

describe("pingDatabase", () => {
  // It returns a result rather than throwing, for the reason `api-client.ts`
  // gives on the frontend: a database that is down is a state to report, and a
  // caller that has to wrap it in a `try` will eventually forget to. Both
  // branches are driven with a stub, because the point is the shape rather than
  // the query.
  it("reports success without throwing", async () => {
    const stub = { query: async () => Promise.resolve({}) };

    const result = await pingDatabase(stub as never);

    expect(result.ok).toBe(true);
  });

  it("reports failure without throwing, carrying the error", async () => {
    const stub = {
      query: async () => Promise.reject(new Error("ECONNREFUSED")),
    };

    const result = await pingDatabase(stub as never);

    if (result.ok) {
      expect.fail("a rejecting query should not report success");
    }
    expect(result.error.message).toBe("ECONNREFUSED");
  });

  // A rejection's reason need not be an `Error`, and the same rule `index.ts`
  // applies to a crashed process applies here: report what arrived rather than
  // manufacture a stack that points at this file.
  it("survives a rejection that is not an Error", async () => {
    // Typed `unknown` on purpose. A rejection reason need not be an `Error` —
    // that is the case this test exists for — and the lint rules that would
    // otherwise object to rejecting with a string permit throwing an `unknown`,
    // which is what this actually is.
    const notAnError: unknown = "just a string";
    const stub = {
      query: async (): Promise<never> => {
        await Promise.resolve();
        throw notAnError;
      },
    };

    const result = await pingDatabase(stub as never);

    if (result.ok) {
      expect.fail("a rejecting query should not report success");
    }
    expect(result.error.message).toBe("just a string");
  });
});

describe("createCachedDatabaseCheck", () => {
  // A pool stub rather than a real one: this is about how often the query is
  // made, not about what it returns, so a counter is the whole subject.
  function countingPool(
    result: () => Promise<unknown> = () => Promise.resolve(),
  ) {
    let queries = 0;
    const pool = {
      query: async () => {
        queries += 1;
        return result();
      },
    } as unknown as pg.Pool;
    return { pool, queries: () => queries };
  }

  it("serves an answer younger than the TTL without querying", async () => {
    const { pool, queries } = countingPool();
    let clock = 1_000_000;
    const check = createCachedDatabaseCheck(pool, 5000, () => clock);

    await check();
    expect(queries()).toBe(1);

    clock += 4999;
    const cached = await check();

    expect(queries()).toBe(1);
    expect(cached.ageMs).toBe(4999);
  });

  it("queries again once the TTL has passed", async () => {
    const { pool, queries } = countingPool();
    let clock = 1_000_000;
    const check = createCachedDatabaseCheck(pool, 5000, () => clock);

    await check();
    clock += 5000;
    const fresh = await check();

    expect(queries()).toBe(2);
    expect(fresh.ageMs).toBe(0);
  });

  // The half that matters more than the TTL, and the case the TTL alone does
  // not cover: ten simultaneous requests to a public endpoint on a cold pool
  // would otherwise be ten connections and, deployed, ten 866 ms token mints.
  it("collapses concurrent callers onto ONE in-flight query", async () => {
    // Assigned inside the executor, which runs synchronously, so it is defined
    // by the time anything reads it. Typed as possibly undefined rather than
    // seeded with an empty arrow, which `no-empty-function` rejects.
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { pool, queries } = countingPool(() => gate);
    const check = createCachedDatabaseCheck(pool, 5000);

    const all = Promise.all([check(), check(), check(), check()]);
    release?.();
    const results = await all;

    expect(queries()).toBe(1);
    expect(results.every((result) => result.ok)).toBe(true);
  });

  // Not caching failures would make an unreachable database an *unbounded*
  // query rate at the moment the connection ceiling matters most.
  it("caches a FAILURE too, so an outage does not become an unbounded query rate", async () => {
    const { pool, queries } = countingPool(() =>
      Promise.reject(new Error("connect ETIMEDOUT")),
    );
    let clock = 1_000_000;
    const check = createCachedDatabaseCheck(pool, 5000, () => clock);

    const first = await check();
    clock += 1;
    const second = await check();

    expect(queries()).toBe(1);
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
  });

  // The coupled pair `pnpm verify` cannot see, checked here for the reason
  // `use-backend-health.test.ts` checks the poll interval against the request
  // deadline: the thing being checked is reachable from code, so a test beats a
  // paragraph. Inverting these does not break anything visibly — it makes every
  // check pay a cold connection and, deployed, an 866 ms token mint.
  it("bounds checks BELOW the pool's idle timeout, which is what keeps a check warm", () => {
    expect(DIAGNOSTIC_CACHE_TTL_MS).toBeLessThan(POOL_IDLE_TIMEOUT_MS);
  });
});

// The classifier behind `MARKET-DATA-API.md` §6's 503 row (Task 2.9.6).
//
// Unit tests and not a database test on purpose: what is being checked is a
// *judgement about an error object*, and the errors are constructed here in the
// shapes `pg` produces. A real outage would exercise one branch of eight and
// could not exercise the negatives at all.
describe("isDatabaseUnavailable", () => {
  function withCode(code: string, message = "failed"): Error {
    const error: NodeJS.ErrnoException = new Error(message);
    error.code = code;
    return error;
  }

  it.each([
    "ECONNREFUSED",
    "ECONNRESET",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EPIPE",
    "ETIMEDOUT",
  ])("recognises the system error %s", (code) => {
    expect(isDatabaseUnavailable(withCode(code))).toBe(true);
  });

  it.each([
    "08000",
    "08006",
    "08003",
    "57P01",
    "57P02",
    "57P03",
    "53300",
    "53400",
  ])("recognises SQLSTATE %s", (code) => {
    expect(isDatabaseUnavailable(withCode(code))).toBe(true);
  });

  // The three that must stay 500s. A statement this server got wrong, a
  // constraint this server violated and a statement this server cancelled are
  // all ours, and answering them 503 would tell a client to retry something
  // that cannot succeed.
  it.each(["42601", "42P01", "23505", "57014"])(
    "does not recognise SQLSTATE %s, which is ours",
    (code) => {
      expect(isDatabaseUnavailable(withCode(code))).toBe(false);
    },
  );

  // The one case with no code at all: `pg-pool` constructs a bare `Error` when
  // `connectionTimeoutMillis` elapses, so the message is the only thing to key
  // on.
  //
  // **This asserts the matching, not the string.** The constant is copied from
  // the driver and nothing here re-derives it — producing the real message
  // needs a pool that fails to connect, which needs a network this suite does
  // not have. See the constant's own note for what that costs and how to
  // re-measure it.
  it("recognises the pool's connection timeout, which carries no code", () => {
    expect(isDatabaseUnavailable(new Error(CONNECT_TIMEOUT_MESSAGE))).toBe(
      true,
    );
    // And the surrounding text does not matter, which is what makes the match a
    // `includes` rather than an equality: `pg` prepends nothing today and a
    // wrapper might.
    expect(
      isDatabaseUnavailable(
        new Error(`pool: ${CONNECT_TIMEOUT_MESSAGE} (5000ms)`),
      ),
    ).toBe(true);
  });

  // Kysely rethrows the driver's error untouched today; a wrapper is the kind
  // of thing a dependency upgrade introduces, and `cause` is where it would put
  // the original.
  it("looks through a wrapper's cause", () => {
    const wrapped = new Error("query failed", {
      cause: withCode("ECONNREFUSED"),
    });

    expect(isDatabaseUnavailable(wrapped)).toBe(true);
  });

  it.each([
    ["a mapping error this server threw", new Error("row is not a security")],
    ["something that is not an Error at all", "ECONNREFUSED"],
  ])("errs towards 500 for %s", (_name, thrown) => {
    expect(isDatabaseUnavailable(thrown)).toBe(false);
  });
});

describe("throughDatabase", () => {
  it("passes an answer through untouched", async () => {
    await expect(
      throughDatabase("The store", () => Promise.resolve(7)),
    ).resolves.toBe(7);
  });

  it("turns an unavailable database into a 503-carrying error", async () => {
    const cause: NodeJS.ErrnoException = new Error("connect ECONNREFUSED");
    cause.code = "ECONNREFUSED";

    const thrown = await throughDatabase("The store", () =>
      Promise.reject(cause),
    ).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as { statusCode?: number }).statusCode).toBe(503);
    // The driver's own error is kept as the cause, which is what puts the host
    // and the code in the log record while the body stays a constant.
    expect((thrown as Error).cause).toBe(cause);
  });

  it("rethrows anything else exactly as it was", async () => {
    const ours = new Error("the ledger disagrees with the bars");

    const thrown = await throughDatabase("The store", () =>
      Promise.reject(ours),
    ).catch((error: unknown) => error);

    expect(thrown).toBe(ours);
  });
});
