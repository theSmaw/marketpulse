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
  weakETag,
} from "./http-cache.js";
import { buildServer } from "./server.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("weakETag", () => {
  it("is stable for the same bytes and different for any change", () => {
    const body = '{"a":1,"b":2}';

    expect(weakETag(body)).toBe(weakETag(body));
    expect(weakETag(body)).not.toBe(weakETag('{"a":1,"b":3}'));
    // The property the whole mechanism rests on: a validator recomputed from
    // the body survives a correction to a closed session and a `securityStatus`
    // flip alike, because it does not know or care which field moved.
    expect(weakETag('{"status":"active"}')).not.toBe(
      weakETag('{"status":"untracked"}'),
    );
  });

  it("is a weak, quoted token with no character needing an escape", () => {
    const etag = weakETag("anything");

    // Weak since Task 2.9.10: this application compresses, a content-coding is
    // a different representation, and one tag now covers both codings. See
    // http-cache.ts for the two repairs that were rejected.
    expect(etag.startsWith('W/"')).toBe(true);
    expect(etag.endsWith('"')).toBe(true);
    // base64url, so no `+`, `/`, `=` or backslash — the four characters that
    // would need quoting inside a quoted-string.
    expect(etag.slice(3, -1)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("matchesETag", () => {
  const etag = weakETag("a body");

  it.each([
    { header: undefined, expected: false, why: "no header at all" },
    { header: etag, expected: true, why: "the tag itself" },
    { header: "*", expected: true, why: "the wildcard" },
    { header: ` ${etag} `, expected: true, why: "surrounding whitespace" },
    {
      header: etag.slice(2),
      expected: true,
      why: "a strong tag against our weak one",
    },
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

/**
 * A body big enough for `http-compression.ts`'s 1,024-byte threshold.
 *
 * The two routes above it are a handful of bytes and would never be
 * compressed, which is the whole reason this exists: a test that negotiates an
 * encoding against a payload below the threshold asserts nothing.
 */
const LARGE_BODY = {
  rows: Array.from({ length: 200 }, (_, index) => ({
    index,
    observedAt: "2026-09-04T14:30:00.000Z",
    close: "123.4567",
  })),
};

/** A server with the hook installed and four routes to fire it against. */
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

    scope.get("/large", async (_request, reply) => {
      reply.header("cache-control", REVALIDATE);
      return Promise.resolve(LARGE_BODY);
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
    expect(response.headers.etag).toBe(weakETag(response.body));
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

// The order test (Task 2.9.10).
//
// **Every assertion above this line runs through a bare `app.inject()`, which
// negotiates no encoding — so every one of them goes on passing if compression
// is registered ahead of the validator and no response carries an `ETag` at
// all.** That is the silent failure the task names, produced deliberately
// before the order was chosen, and this block is what would catch it: it asks
// for gzip, and it asks for the `304` afterwards.
describe("the validator under content negotiation", () => {
  it("tags a compressed response, and the tag is the identity body's", async () => {
    const instance = await validatingServer();

    const compressed = await instance.inject({
      method: "GET",
      url: "/large",
      headers: { "accept-encoding": "gzip" },
    });
    const identity = await instance.inject({ method: "GET", url: "/large" });

    expect(compressed.statusCode).toBe(200);
    expect(compressed.headers["content-encoding"]).toBe("gzip");
    expect(compressed.rawPayload.length).toBeLessThan(
      identity.rawPayload.length,
    );

    // The assertion that fails if a compressor ever gets in front of the
    // validator: the hook's first guard is `typeof payload !== "string"`, and a
    // `Buffer` takes its early return silently.
    expect(compressed.headers.etag).toBeDefined();
    // One tag over two codings, which is why it is weak. Established by
    // observation rather than from a README — `@fastify/compress` suffixes
    // nothing.
    expect(compressed.headers.etag).toBe(identity.headers.etag);
    expect(String(compressed.headers.etag).startsWith("W/")).toBe(true);
  });

  it("still earns a 304, and the 304 is not encoded", async () => {
    const instance = await validatingServer();

    const first = await instance.inject({
      method: "GET",
      url: "/large",
      headers: { "accept-encoding": "gzip" },
    });
    const second = await instance.inject({
      method: "GET",
      url: "/large",
      headers: {
        "accept-encoding": "gzip",
        "if-none-match": String(first.headers.etag),
      },
    });

    expect(second.statusCode).toBe(304);
    expect(second.rawPayload.length).toBe(0);
    // The other order's failure, and it was produced: at `threshold: 0` this
    // same arrangement answers a `304` carrying `content-encoding: gzip` and a
    // 20-byte body — gzip's framing of nothing. RFC 9110 §15.4.5 says a `304`
    // carries no content, so it must carry no coding for one either.
    expect(second.headers["content-encoding"]).toBeUndefined();
    expect(second.headers["cache-control"]).toBe(REVALIDATE);
  });

  it("varies on the encoding, whichever representation went out", async () => {
    const instance = await validatingServer();

    const compressed = await instance.inject({
      method: "GET",
      url: "/large",
      headers: { "accept-encoding": "gzip" },
    });
    const identity = await instance.inject({ method: "GET", url: "/large" });
    const conditional = await instance.inject({
      method: "GET",
      url: "/large",
      headers: { "if-none-match": String(identity.headers.etag) },
    });

    // The plugin sets `Vary` only on a response it actually compressed. The
    // other two get it from the validator, which is why that line is there.
    for (const response of [compressed, identity, conditional]) {
      expect(String(response.headers.vary)).toContain("accept-encoding");
    }
  });

  it("leaves a body under the threshold alone, and still tags it", async () => {
    const instance = await validatingServer();

    const response = await instance.inject({
      method: "GET",
      url: "/cacheable",
      headers: { "accept-encoding": "gzip" },
    });

    // 30 bytes. Below the threshold gzip's framing costs more than the coding
    // saves, and every response this API serves under it is a refusal or a 404.
    expect(response.headers["content-encoding"]).toBeUndefined();
    expect(response.headers.etag).toBeDefined();
  });
});
