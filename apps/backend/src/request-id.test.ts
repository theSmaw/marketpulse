// `resolveRequestId` is the one part of the correlation id that is a pure
// function over headers, so it gets a file beside its subject. The rest of the
// behaviour — the header on the reply, on a 404 and on a thrown 500 — is a
// property of the assembled instance and is asserted in `server.test.ts`.
//
// The threat model is why this is worth testing directly rather than only
// through the server: Fastify's own `requestIdHeader` adopts an inbound header
// with **no validation at all**, so turning it on is a regression dressed as a
// simplification. This function is what replaced it.

import { REQUEST_ID_HEADER } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { generateRequestId, resolveRequestId } from "./request-id.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("generateRequestId", () => {
  // A UUID and not Fastify's default, which is a per-process counter starting
  // at 1 — it collides across every restart and across every instance Story
  // 1.11 might run, which is precisely when correlation matters.
  it("is a UUID and does not repeat", () => {
    const ids = Array.from({ length: 1000 }, () => generateRequestId());

    for (const id of ids) {
      expect(id).toMatch(UUID);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveRequestId", () => {
  it("generates one when no header is present", () => {
    expect(resolveRequestId({})).toMatch(UUID);
  });

  it.each(["a", "abc-123_XYZ", "0123456789abcdef", "x".repeat(128)])(
    "honours an inbound id matching the pattern: %s",
    (inbound) => {
      expect(resolveRequestId({ [REQUEST_ID_HEADER]: inbound })).toBe(inbound);
    },
  );

  // Dropped rather than sanitised. A repaired id is a different id, so a caller
  // correlating on what it sent would silently be correlating on nothing.
  //
  // The pattern excludes whitespace, control characters, quotes and commas,
  // which is what stops a raw-socket attempt to close the JSON object and forge
  // a log record — measured in Task 1.7.2 at zero forged lines.
  it.each([
    ["empty", ""],
    ["too long", "x".repeat(129)],
    ["a space", "req 1"],
    ["a quote", 'a", "forged": "b'],
    ["a newline", "req\n{}"],
    ["a comma", "a,b"],
    ["a slash", "req/1"],
    ["a colon", "req:1"],
    ["a non-ASCII letter", "réq"],
  ])("drops an inbound id containing %s", (_label, inbound) => {
    const id = resolveRequestId({ [REQUEST_ID_HEADER]: inbound });

    expect(id).not.toBe(inbound);
    expect(id).toMatch(UUID);
  });

  // A repeated header arrives as an array. Nothing in the pattern would
  // validate it, and the type guard is what keeps it from being coerced into a
  // string — `["a", "b"].toString()` is `"a,b"`, which the comma case above
  // rejects anyway, but only by luck.
  it("drops a repeated header rather than joining it", () => {
    const id = resolveRequestId({ [REQUEST_ID_HEADER]: ["abc", "def"] });

    expect(id).toMatch(UUID);
  });
});
