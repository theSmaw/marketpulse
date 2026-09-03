import { describe, expect, it } from "vitest";

import { REQUEST_ID_HEADER } from "./request-id.js";

describe("REQUEST_ID_HEADER", () => {
  // Both apps import this rather than writing the string out, because a
  // header-name typo is a compile error nowhere. That makes the literal value
  // itself the contract, so it is worth one assertion.
  it("is the header name both apps agree on", () => {
    expect(REQUEST_ID_HEADER).toBe("x-request-id");
  });

  // Node lower-cases inbound header names before they reach request.headers,
  // so this value is usable as a lookup key directly. An upper-case letter here
  // would break that silently.
  it("is lower case, so it works as a `request.headers` key", () => {
    expect(REQUEST_ID_HEADER).toBe(REQUEST_ID_HEADER.toLowerCase());
  });
});

describe("probe", () => {
  it("fails on purpose, to make the runner go red in the test step", () => {
    expect(1).toBe(2);
  });
});
