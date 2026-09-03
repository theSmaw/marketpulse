// The assembled server, driven by `app.inject()`.
//
// Why one file for what is arguably four subjects — the route, the error
// contract, the correlation id and CORS. Every one of those is a property of
// the *assembled instance* rather than of a module in isolation:
// `registerErrorHandling` and `registerCors` are functions taking a Fastify
// instance and returning nothing, so there is no unit to test that is not the
// server. `request-id.ts` is the exception and has its own file, because
// `resolveRequestId` is a pure function over headers.
//
// There is deliberately no shared `src/test-support.ts`. It would sit inside
// this package's tsconfig `include` — which is where test files are forced to
// live — and so would emit into `dist/`, which is scaffolding shipped beside
// the server for no reason. A file-local helper costs nothing.
//
// What this file cannot reach is stated once, at the bottom.

import { REQUEST_ID_HEADER } from "@marketpulse/shared";
import type { HealthResponse } from "@marketpulse/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { apiErrorSchema } from "./errors.js";

import { buildServer } from "./server.js";

const CORS_ORIGIN = "http://localhost:5173";

// `silent` and not `warn`: an `app.inject()` suite at `info` writes two records
// per request and buries whatever the test was about. Both settings are passed
// explicitly because `buildServer()` defaults neither on purpose — a default in
// `server.ts` would be a second copy of `config.ts`'s.
//
// Async from the first line, and that is the decision Task 1.9.3 asked to take
// rather than discover. `buildServer()` is synchronous today; the first
// `await app.register(...)` or explicit `await app.ready()` inside it turns it
// into `Promise<FastifyInstance>` (ADR 0002 §3) and changes every caller. The
// `await` here costs nothing now and is the difference between one edit and
// every edit later. `app.ready()` is also required in its own right: plugin
// registration is deferred, so the routes do not exist until it resolves.
async function buildTestServer(
  configure?: (app: FastifyInstance) => void,
): Promise<FastifyInstance> {
  const app = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: CORS_ORIGIN,
  });

  // Anything the test needs on the instance goes in here, before `ready()`.
  // Fastify refuses a route added afterwards, and an `onRoute` hook only sees
  // routes registered after it — which is every route, because
  // `app.register(healthRoutes)` runs at `ready()` time.
  configure?.(app);

  await app.ready();
  return app;
}

// One instance per test, closed afterwards. `inject()` needs no socket, so this
// is cheap; sharing an instance would let a test that registers a throwing
// route leak it into the next one.
let open: FastifyInstance | undefined;

async function server(
  configure?: (app: FastifyInstance) => void,
): Promise<FastifyInstance> {
  open = await buildTestServer(configure);
  return open;
}

afterEach(async () => {
  await open?.close();
  open = undefined;
});

describe("GET /health", () => {
  it("answers 200 with the HealthResponse shape", async () => {
    const app = await server();

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);

    const body = response.json<HealthResponse>();
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(Object.keys(body).sort()).toStrictEqual([
      "status",
      "uptimeSeconds",
      "version",
    ]);
  });

  // The assertion worth more than the shape above. Fastify serialises through
  // `fast-json-stringify`, which strips every property the response schema does
  // not declare — measured in Task 1.7.3 with a `secret` field that vanished
  // from the wire. That is the *mechanism* behind "no internal detail reaches a
  // client", as opposed to a habit of remembering.
  //
  // `preSerialization` is what puts the extra field on the real route's real
  // payload; a second route declaring a copy of the schema would only prove the
  // copy works. The hook runs before serialisation, which is the whole point —
  // an `onSend` hook is handed a string that has already been stripped.
  it("strips a property the response schema does not declare", async () => {
    const app = await server((instance) => {
      instance.addHook(
        "preSerialization",
        (_request, _reply, payload, done) => {
          done(null, {
            ...(payload as HealthResponse),
            secret: "postgres://user:hunter2@10.0.0.4:5432/marketpulse",
          });
        },
      );
    });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("hunter2");
    expect(response.json()).not.toHaveProperty("secret");
  });
});

describe("the error contract", () => {
  // Four paths, because `buildServer()` registers two handlers and they are two
  // paths rather than one: `setErrorHandler` never sees an unmatched route.
  //
  // A 415 is deliberately absent — an unparseable content type resolves to a
  // 404, so there is no request that produces one (Task 1.7.4).
  it("answers an unmatched route 404 NOT_FOUND", async () => {
    const app = await server();

    const response = await app.inject({ method: "GET", url: "/nope" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: "NOT_FOUND",
      message: expect.any(String) as unknown,
      requestId: expect.any(String) as unknown,
    });
    // The 404 deliberately does not name the route: reflecting an unvalidated
    // request URL into a response body is a shape worth not having, and the
    // client already knows what it asked for.
    expect(response.body).not.toContain("/nope");
  });

  // Fastify's content-type parser runs *before* its not-found handler, so this
  // is a 400 on a server whose only route is `GET /health`.
  it("answers a malformed JSON body 400 BAD_REQUEST", async () => {
    const app = await server();

    const response = await app.inject({
      method: "POST",
      url: "/health",
      headers: { "content-type": "application/json" },
      payload: "{ not json",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "BAD_REQUEST" });
  });

  // Same code, different status: one member covers 400 and 413 together because
  // both mean "your request was not acceptable, fix it and retry", and the
  // status line still carries the difference. The reversal trigger is a caller
  // that has to behave differently on a 413.
  it("answers an oversized body 413 BAD_REQUEST", async () => {
    const app = await server();

    const response = await app.inject({
      method: "POST",
      url: "/health",
      headers: { "content-type": "application/json" },
      payload: `"${"x".repeat(2 * 1024 * 1024)}"`,
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({ code: "BAD_REQUEST" });
  });

  it("answers a thrown error 500 INTERNAL_ERROR", async () => {
    const app = await server(throwingRoute);

    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      code: "INTERNAL_ERROR",
      requestId: expect.any(String) as unknown,
    });
  });

  it("maps an unmapped 4xx to BAD_REQUEST and an error with no status to 500", async () => {
    const app = await server((instance) => {
      instance.get("/teapot", () => {
        throw Object.assign(new Error("I refuse"), { statusCode: 418 });
      });
      instance.get("/statusless", () => {
        throw new Error("no status on me");
      });
    });

    const teapot = await app.inject({ method: "GET", url: "/teapot" });
    expect(teapot.statusCode).toBe(418);
    expect(teapot.json()).toMatchObject({ code: "BAD_REQUEST" });

    // An error handler running at all means something failed, so an error
    // carrying no usable status is a 500. A reassuring status would be a lie.
    const statusless = await app.inject({ method: "GET", url: "/statusless" });
    expect(statusless.statusCode).toBe(500);
    expect(statusless.json()).toMatchObject({ code: "INTERNAL_ERROR" });
  });
});

// The route that throws the measured case from Task 1.7.4: a message written
// for a developer, a stack, and a `cause` carrying a credential. All three
// reach the log record; none may reach the wire.
const THROWN_MESSAGE = "connection to postgres at 10.0.0.4:5432 refused";
const THROWN_DSN = "postgres://user:hunter2@10.0.0.4:5432/marketpulse";

function throwingRoute(app: FastifyInstance): void {
  app.get("/boom", () => {
    throw Object.assign(new Error(THROWN_MESSAGE), {
      cause: { dsn: THROWN_DSN },
      query: "select 1",
    });
  });
}

describe("what a 5xx body must not carry", () => {
  // Both of these were real Fastify defaults before Task 1.7.4 replaced them.
  // The stack was never the whole risk: a message written for a developer is
  // internal detail too, and it is the half that looks harmless.
  it("carries neither the thrown message, a stack, nor a cause", async () => {
    const app = await server(throwingRoute);

    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(response.body).not.toContain(THROWN_MESSAGE);
    expect(response.body).not.toContain("hunter2");
    expect(response.body).not.toContain("10.0.0.4");
    expect(response.body).not.toContain("select 1");

    const body: unknown = response.json();
    expect(body).not.toHaveProperty("stack");
    expect(body).not.toHaveProperty("cause");
    // `statusCode` is deliberately absent from ApiError — Fastify's own default
    // body has it, and it is a second place for the status to be wrong.
    expect(Object.keys(body as object).sort()).toStrictEqual([
      "code",
      "message",
      "requestId",
    ]);
  });

  // The response schema is the second mechanism and it is per-route and
  // opt-in; `apiError()` is the one that covers everything, because it builds
  // an object with four slots and no room for a fifth. This asserts the
  // constructor's guarantee on a route that has *no* 500 schema at all, which
  // is the case `setNotFoundHandler` is permanently in.
  it("carries nothing extra even on a route with no 500 schema", async () => {
    const app = await server(throwingRoute);

    const response = await app.inject({ method: "GET", url: "/boom" });

    expect(Object.keys(response.json<object>()).sort()).toStrictEqual([
      "code",
      "message",
      "requestId",
    ]);
  });
});

describe("the correlation id", () => {
  it("is on a success, a 404 and a 500", async () => {
    const app = await server(throwingRoute);

    for (const url of ["/health", "/nope", "/boom"]) {
      const response = await app.inject({ method: "GET", url });

      expect(response.headers[REQUEST_ID_HEADER]).toEqual(expect.any(String));
    }
  });

  it("matches the body's requestId on every failure", async () => {
    const app = await server(throwingRoute);

    for (const url of ["/nope", "/boom"]) {
      const response = await app.inject({ method: "GET", url });

      expect(response.json<{ requestId: string }>().requestId).toBe(
        response.headers[REQUEST_ID_HEADER],
      );
    }
  });

  it("honours an inbound id that matches the pattern", async () => {
    const app = await server();

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { [REQUEST_ID_HEADER]: "caller-supplied_ID-1" },
    });

    expect(response.headers[REQUEST_ID_HEADER]).toBe("caller-supplied_ID-1");
  });

  // Dropped rather than sanitised, which is the decision this test protects: a
  // repaired id is a different id, so a caller correlating on what it sent
  // would be correlating on nothing. The replacement is a fresh UUID.
  it("drops an inbound id that does not, rather than repairing it", async () => {
    const app = await server();

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { [REQUEST_ID_HEADER]: 'a", "forged": "b' },
    });

    const id = response.headers[REQUEST_ID_HEADER];
    expect(id).not.toContain("forged");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("CORS", () => {
  // Easy to assert the wrong thing here. With a **string** origin
  // `@fastify/cors` asserts `access-control-allow-origin` *unconditionally* —
  // an unlisted origin and a request with no `Origin` at all both get the
  // allowed origin back. The browser compares and refuses; the server never
  // sees the check fail. So a test sending an unlisted `Origin` and expecting a
  // rejection would fail, and `app.inject()` is not an enforcer.
  it("asserts the configured origin", async () => {
    const app = await server();

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: CORS_ORIGIN },
    });

    expect(response.headers["access-control-allow-origin"]).toBe(CORS_ORIGIN);
  });

  // The correlation id is not on the CORS-safelisted response header set, so
  // without this a browser at the allowed origin gets the header on the wire
  // and cannot read it. `REQUEST_ID_HEADER` is imported rather than spelled —
  // that is the rule the move to `packages/shared` exists for.
  it("exposes the correlation-id header to the browser", async () => {
    const app = await server();

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: CORS_ORIGIN },
    });

    expect(response.headers["access-control-expose-headers"]).toContain(
      REQUEST_ID_HEADER,
    );
  });

  // Read out of the package rather than assumed in Task 1.8.3: the plausible
  // guess is the wider CRUD set and it is wrong. The first route taking a `PUT`
  // needs a `methods` line in `cors.ts`, and its symptom will be a browser
  // error on a route that answers `curl` perfectly — so this pins the default.
  it("preflights GET, HEAD and POST and not PUT", async () => {
    const app = await server();

    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: CORS_ORIGIN,
        "access-control-request-method": "PUT",
      },
    });

    expect(response.headers["access-control-allow-methods"]).toBe(
      "GET,HEAD,POST",
    );
  });
});

describe("the response-schema declaration", () => {
  // The gap Story 1.9 was handed: nothing in `pnpm verify` checks that a route
  // which can fail declared `500: apiErrorSchema`, and forgetting it is silent
  // — the route answers correctly until something throws, and then leaks
  // whatever the error handler decorated the body with.
  //
  // The route table *is* reachable in a form worth asserting on, via an
  // `onRoute` hook added before `ready()`. That works because plugin
  // registration is deferred: `app.register(healthRoutes)` inside
  // `buildServer()` has not run when the factory returns, so a hook added by
  // the caller still sees every route it registers. Cheaper than a seventh
  // `verify` step, and it is the only mechanism that would ever catch this.
  //
  // `setNotFoundHandler` is not a route and can never have a response schema,
  // so it is structurally outside this check; `apiError()` is what holds there,
  // asserted above.
  it("declares apiErrorSchema on 500 for every registered route", async () => {
    const seen: { url: string; method: string; schema: unknown }[] = [];

    await server((app) => {
      app.addHook("onRoute", (route) => {
        const response = (
          route.schema as { response?: Record<string, unknown> } | undefined
        )?.response;
        seen.push({
          url: route.url,
          method: String(route.method),
          schema: response?.["500"],
        });
      });
    });

    // A guard on the guard: if the hook ever stops seeing routes, this test
    // would pass vacuously — which is exactly the failure mode it exists to
    // prevent elsewhere.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.map((route) => route.url)).toContain("/health");

    // The one exemption, and it is a finding rather than a convenience: this
    // check's first run reported `OPTIONS *`, a route **nobody in this
    // repository wrote**. `@fastify/cors` registers a wildcard preflight
    // handler when it is given no `preflight: false`, and it answers 204 with
    // no body at all — so there is nothing for a response schema to strip, and
    // requiring one would mean forking the library's route. Exempted by its
    // exact signature rather than by "anything OPTIONS", so a preflight route
    // we ever declare ourselves is still checked.
    const ours = seen.filter(
      (route) => !(route.method === "OPTIONS" && route.url === "*"),
    );
    expect(ours.length).toBeGreaterThan(0);

    for (const route of ours) {
      // Fastify registers a HEAD alongside every GET by default; it shares the
      // GET's schema, so it is asserted rather than exempted.
      expect(
        route.schema,
        `${route.method} ${route.url} does not declare 500: apiErrorSchema`,
      ).toBe(apiErrorSchema);
    }
  });
});

// --- What this suite cannot reach -------------------------------------------
//
// `app.inject()` drives an instance with **no listening socket**, so everything
// index.ts owns is outside it: signal handling, exit codes, the 5-second
// shutdown ceiling, the second-signal path, `EADDRINUSE`, and both
// process-level crash handlers. Those need a real child process started against
// a *built* tree — the shape Tasks 1.2.4 and 1.2.6 used by hand.
//
// This story does not build one, and that is a decision rather than an
// omission. Such a test is a different kind of test: it needs `pnpm build` to
// have run, it spawns and signals processes, it is timing-sensitive by nature,
// and its first failure mode is a port left held by a previous run. Putting one
// process test in the same `vitest run` as 40 injected ones buys a single
// demonstration at the price of making the fast suite conditional on a build
// and occasionally flaky — and the class needs a home with a runner
// configuration of its own, not a foothold.
//
// **Owner: Story 1.10**, which builds CI and is where a suite that requires a
// built tree and spawns processes belongs. `CLAUDE.md` and STORY.md record it.
