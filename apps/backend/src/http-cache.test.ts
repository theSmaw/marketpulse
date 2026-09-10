// The validator, at the two levels it can be wrong at (Task 2.9.8).
//
// The pure half — the digest and the `If-None-Match` comparison — is unit
// tested here because every interesting input is a header string a browser
// might send and none of them need a server. The hook itself is driven through
// an assembled server in this same file, because *when* it fires is the half
// with the failure modes: a validator on a `400`, or on a response no handler
// declared cacheable, is a `304` that answers with an empty body carrying no
// message at all.

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import {
  installResponseValidator,
  matchesETag,
  REVALIDATE,
  reusableFor,
  strongETag,
} from "./http-cache.js";
import { buildServer } from "./server.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("strongETag", () => {
  it("is stable for the same bytes and different for any change", () => {
    const body = '{"a":1,"b":2}';

    expect(strongETag(body)).toBe(strongETag(body));
    expect(strongETag(body)).not.toBe(strongETag('{"a":1,"b":3}'));
    // The property the whole mechanism rests on: a validator recomputed from
    // the body survives a correction to a closed session and a `securityStatus`
    // flip alike, because it does not know or care which field moved.
    expect(strongETag('{"status":"active"}')).not.toBe(
      strongETag('{"status":"untracked"}'),
    );
  });

  it("is a quoted token with no character needing an escape", () => {
    const etag = strongETag("anything");

    expect(etag.startsWith('"')).toBe(true);
    expect(etag.endsWith('"')).toBe(true);
    // base64url, so no `+`, `/`, `=` or backslash — the four characters that
    // would need quoting inside a quoted-string.
    expect(etag.slice(1, -1)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("matchesETag", () => {
  const etag = strongETag("a body");

  it.each([
    { header: undefined, expected: false, why: "no header at all" },
    { header: etag, expected: true, why: "the tag itself" },
    { header: "*", expected: true, why: "the wildcard" },
    { header: ` ${etag} `, expected: true, why: "surrounding whitespace" },
    { header: `W/${etag}`, expected: true, why: "the weak comparison" },
    {
      header: `"other", ${etag}`,
      expected: true,
      why: "a list holding the tag",
    },
    { header: '"other"', expected: false, why: "a tag we did not send" },
    { header: etag.slice(1, -1), expected: false, why: "an unquoted tag" },
  ])("$why → $expected", ({ header, expected }) => {
    expect(matchesETag(header, etag)).toBe(expected);
  });
});

describe("the Cache-Control directives", () => {
  it("never says immutable and never says a long lifetime", () => {
    // The rule this file exists to hold, asserted rather than described. Two
    // things have been found mutable in a response the calendar calls immutable
    // — a vendor correction and a `securityStatus` flip — and a promise a client
    // cannot be reached to withdraw is the one mechanism that survives neither.
    expect(REVALIDATE).not.toContain("max-age");
    expect(reusableFor(300)).toBe("private, max-age=300");
    expect(reusableFor(300)).not.toContain("immutable");
  });

  it("keeps every cacheable answer private to one client", () => {
    // `x-request-id` is per requester and `access-control-allow-origin` is
    // computed from the configured origin; neither is safe for a shared proxy
    // to hand to a second client.
    expect(REVALIDATE).toContain("private");
    expect(reusableFor(60)).toContain("private");
  });
});

/** A server with the hook installed and three routes to fire it against. */
async function validatingServer(): Promise<FastifyInstance> {
  const instance = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  instance.register((scope, _options, done) => {
    installResponseValidator(scope);

    scope.get("/cacheable", async (_request, reply) => {
      reply.header("cache-control", REVALIDATE);
      return Promise.resolve({ value: "steady" });
    });

    scope.get("/uncacheable", async () => Promise.resolve({ value: "steady" }));

    scope.get("/refused", async (_request, reply) => {
      reply.header("cache-control", REVALIDATE);
      return reply.code(400).send({ code: "BAD_REQUEST" });
    });

    done();
  });

  await instance.ready();
  app = instance;
  return instance;
}

describe("the response validator", () => {
  it("tags a response whose handler declared it cacheable", async () => {
    const instance = await validatingServer();

    const response = await instance.inject({
      method: "GET",
      url: "/cacheable",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers.etag).toBe(strongETag(response.body));
  });

  it("answers a matching conditional request with a bodiless 304", async () => {
    const instance = await validatingServer();

    const first = await instance.inject({ method: "GET", url: "/cacheable" });
    const second = await instance.inject({
      method: "GET",
      url: "/cacheable",
      headers: { "if-none-match": String(first.headers.etag) },
    });

    expect(second.statusCode).toBe(304);
    expect(second.body).toBe("");
    // Both travel with the 304. A 304 that omitted them would tell the client
    // nothing about how long what it kept is good for, and it would revalidate
    // again on the very next request.
    expect(second.headers.etag).toBe(first.headers.etag);
    expect(second.headers["cache-control"]).toBe(REVALIDATE);
  });

  it("answers a stale conditional request with the whole body", async () => {
    const instance = await validatingServer();

    const response = await instance.inject({
      method: "GET",
      url: "/cacheable",
      headers: { "if-none-match": '"a tag from a previous deployment"' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toStrictEqual({ value: "steady" });
  });

  it("leaves a response whose handler said nothing untagged", async () => {
    const instance = await validatingServer();

    const response = await instance.inject({
      method: "GET",
      url: "/uncacheable",
      headers: { "if-none-match": "*" },
    });

    // `*` matches any existing representation, so a hook that did not check for
    // the handler's declaration would answer this 304 — and `GET /market-data`,
    // `/health` and every `ApiError` would go with it.
    expect(response.statusCode).toBe(200);
    expect(response.headers.etag).toBeUndefined();
  });

  it("never turns a refusal into a 304, even a declared one", async () => {
    const instance = await validatingServer();

    const response = await instance.inject({
      method: "GET",
      url: "/refused",
      headers: { "if-none-match": "*" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers.etag).toBeUndefined();
    // The message is the whole value of an error response; a 304 would send an
    // empty body carrying none of it.
    expect(response.json()).toStrictEqual({ code: "BAD_REQUEST" });
  });
});
