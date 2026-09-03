import { describe, expect, it } from "vitest";

import { API_ERROR_CODES, apiError, isApiError } from "./api-error.js";
import type { ApiError, ApiErrorCode } from "./api-error.js";

describe("apiError", () => {
  it("builds the four-field wire shape", () => {
    const error: ApiError = apiError("NOT_FOUND", "No such route", "req-1");

    expect(error).toEqual({
      code: "NOT_FOUND",
      message: "No such route",
      requestId: "req-1",
    });
  });

  // The branch in apiError() exists because exactOptionalPropertyTypes makes an
  // absent `details` and an explicit `details: undefined` different types. This
  // asserts the decision rather than the syntax: a spread-based constructor
  // would pass `toEqual` above and fail here.
  it("omits `details` entirely when none are given", () => {
    const error = apiError("INTERNAL_ERROR", "Something failed", "req-2");

    expect("details" in error).toBe(false);
    expect(Object.keys(error)).toStrictEqual(["code", "message", "requestId"]);
  });

  it("includes `details` when they are given", () => {
    const error = apiError("BAD_REQUEST", "Invalid request", "req-3", [
      "PORT must be an integer between 1 and 65535.",
    ]);

    expect("details" in error).toBe(true);
    expect(error.details).toStrictEqual([
      "PORT must be an integer between 1 and 65535.",
    ]);
  });
});

describe("API_ERROR_CODES", () => {
  // Other packages import this rather than spelling the members, so the set is
  // worth pinning: adding a member is a non-breaking change and this test says
  // so out loud, while removing or renaming one has to be done deliberately.
  it("is the closed set the union is built from", () => {
    const codes: readonly ApiErrorCode[] = API_ERROR_CODES;

    expect(codes).toStrictEqual(["NOT_FOUND", "BAD_REQUEST", "INTERNAL_ERROR"]);
  });

  it("has no duplicates", () => {
    expect(new Set(API_ERROR_CODES).size).toBe(API_ERROR_CODES.length);
  });
});

describe("isApiError", () => {
  const valid = {
    code: "NOT_FOUND",
    message: "Not found",
    requestId: "0199c0de-1234-7000-8000-0123456789ab",
  };

  it("accepts a contracted error body", () => {
    expect(isApiError(valid)).toBe(true);
  });

  it("accepts one carrying details", () => {
    expect(isApiError({ ...valid, details: ["one", "two"] })).toBe(true);
  });

  // The bytes on a failed request are the least trustworthy in the system: a
  // non-2xx at the API's address may have come from a proxy, an ingress or a
  // static host that has never heard of this contract.
  it.each([
    ["a non-object", "NOT_FOUND"],
    ["null", null],
    ["undefined, which is what an unparseable body becomes", undefined],
    ["a missing requestId", { code: "NOT_FOUND", message: "Not found" }],
    ["a numeric message", { ...valid, message: 404 }],
    ["details that are not all strings", { ...valid, details: ["a", 1] }],
    ["details that are not an array", { ...valid, details: "a" }],
  ])("rejects %s", (_name, value) => {
    expect(isApiError(value)).toBe(false);
  });

  // The asymmetry with `isHealthResponse`, asserted so it cannot be "corrected"
  // into consistency by accident. `code` is a discriminator a caller switches
  // on, so a value this client cannot act on is better refused than admitted
  // into a union it does not belong to — where `status` is a value the
  // interface renders, and a newer server reporting a newer one is a version
  // skew a client can still display.
  it("rejects a code it has not been taught, unlike isHealthResponse's status", () => {
    expect(isApiError({ ...valid, code: "TEAPOT" })).toBe(false);
  });

  // Extra fields are not a reason to refuse a body that is otherwise the
  // contract — a newer server is a version skew.
  it("accepts unknown extra fields", () => {
    expect(isApiError({ ...valid, retryAfter: 30 })).toBe(true);
  });
});
