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
import { buildServer } from "../server.js";
import { createDiagnosticsRoutes } from "./diagnostics.js";

const PATH = "/diagnostics/database";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function serverWith(check: DatabaseCheckFn): Promise<FastifyInstance> {
  const instance = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  // Registered here rather than by `buildServer()`, exactly as `index.ts` does
  // it — so this test drives the arrangement that ships rather than a
  // convenient one.
  instance.register(createDiagnosticsRoutes(check));

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
  // `database.ts` reserves for Story 2.8.
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
      createDiagnosticsRoutes(() => Promise.resolve(reachable)),
    );
    await instance.ready();
    app = instance;

    const { apiErrorSchema } = await import("../errors.js");
    expect(declared).toHaveLength(1);
    expect(declared[0]).toMatchObject({ response: { 500: apiErrorSchema } });
  });
});
