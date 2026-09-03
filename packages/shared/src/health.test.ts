import { describe, expect, it } from "vitest";

import {
  HEALTH_STATUSES,
  isHealthResponse,
  type HealthResponse,
} from "./health.js";

describe("HEALTH_STATUSES", () => {
  // One member, deliberately. The assertion is here so widening it is a
  // decision somebody takes with a failing test in front of them rather than an
  // edit that slips past — Epic 3 adds market-feed state and that is a
  // non-breaking addition, but it is still a change to a wire contract.
  it("is the one-member union the server can currently report", () => {
    expect(HEALTH_STATUSES).toStrictEqual(["ok"]);
  });

  // The schema declares `enum: HEALTH_STATUSES`, and fast-json-stringify would
  // strip a status not listed there. A duplicate or a non-string member would
  // be a contract this server cannot satisfy.
  it("holds distinct string members", () => {
    expect(new Set(HEALTH_STATUSES).size).toBe(HEALTH_STATUSES.length);
    for (const status of HEALTH_STATUSES) expect(typeof status).toBe("string");
  });
});

describe("isHealthResponse", () => {
  const valid: HealthResponse = {
    status: "ok",
    version: "0.0.0",
    uptimeSeconds: 1.5,
  };

  it("accepts the response the server actually sends", () => {
    expect(isHealthResponse(valid)).toBe(true);
  });

  // The two producible causes of `degraded`, as data. A static host answering
  // its own index.html with a 200 is the measured case — `vite preview` and
  // Static Web Apps' navigationFallback both do exactly this — and it arrives
  // here as a string rather than as an object.
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string body", "<!doctype html>"],
    ["a number", 42],
    ["an array", []],
    ["an empty object", {}],
  ])("rejects %s", (_label, value) => {
    expect(isHealthResponse(value)).toBe(false);
  });

  it.each([
    ["status", { version: "0.0.0", uptimeSeconds: 1 }],
    ["version", { status: "ok", uptimeSeconds: 1 }],
    ["uptimeSeconds", { status: "ok", version: "0.0.0" }],
  ])("rejects a body missing %s", (_field, value) => {
    expect(isHealthResponse(value)).toBe(false);
  });

  // The unit travels in the name, so a server sending `uptimeSeconds` as a
  // pre-formatted string is a contract violation and not a formatting choice.
  it("rejects uptimeSeconds sent as a string", () => {
    expect(isHealthResponse({ ...valid, uptimeSeconds: "1.5" })).toBe(false);
  });

  // Deliberately NOT rejected: a status this client has not been taught. That
  // is a version skew rather than a broken server, and rejecting it here would
  // undo the whole reason HealthStatus is a union that can grow.
  it("accepts a status member it does not recognise", () => {
    expect(isHealthResponse({ ...valid, status: "degraded-feed" })).toBe(true);
  });

  // Extra fields are accepted for the same reason: a newer server is not a
  // broken one. The serialiser is what keeps the wire narrow, on the way out.
  it("accepts a body carrying fields it does not know", () => {
    expect(isHealthResponse({ ...valid, marketFeed: "live" })).toBe(true);
  });
});
