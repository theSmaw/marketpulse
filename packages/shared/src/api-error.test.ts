import { describe, expect, it } from "vitest";

import { API_ERROR_CODES, apiError } from "./api-error.js";
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

it("probe 4: deliberately fails (Task 1.10.8)", () => {
  expect(1).toBe(2);
});
