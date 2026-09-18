import { describe, expect, it } from "vitest";

import { toTicker } from "@marketpulse/shared";

import { createFixtureStream } from "./fixture-stream.js";
import { readFeedDiagnostic } from "./feed-diagnostic.js";

const SHUT = new Date("2026-09-19T07:00:00Z"); // Saturday 03:00 ET
const OPEN = new Date("2026-09-16T14:30:00Z"); // Wednesday 10:30 ET

describe("what it reports with no stream running", () => {
  // **The state this endpoint most needs to survive.** ADR 0030 §7c fails a
  // deployed check at ANY hour if the feed is `replay`, and that is answerable
  // from the CONFIGURED provider alone — before a socket exists and whether or
  // not one ever does. A reading that needed a live stream would go silent in
  // exactly the state it exists to catch.
  it("still reports the configured provider", () => {
    const body = readFeedDiagnostic({ marketDataProvider: "replay" }, SHUT);

    expect(body.provider).toBe("replay");
  });

  it("reports absence as null rather than as a healthy default", () => {
    const body = readFeedDiagnostic({ marketDataProvider: "none" }, SHUT);

    expect(body.feed).toBeNull();
    expect(body.status).toBeNull();
    expect(body.observedAt).toBeNull();
  });
});

describe("the market clock", () => {
  it("reads the calendar rather than the hour", () => {
    expect(
      readFeedDiagnostic({ marketDataProvider: "alpaca" }, OPEN).marketOpen,
    ).toBe(true);
    expect(
      readFeedDiagnostic({ marketDataProvider: "alpaca" }, SHUT).marketOpen,
    ).toBe(false);
  });

  it("reports SHUT past the calendar's horizon, which is the opposite of the replay guard", () => {
    // Both directions are deliberate. The replay guard fails CLOSED —
    // unanswerable means "open", so a replay stops. This is a REPORT, and a
    // report that turned a calendar gap into "the market is open" would make
    // `check-deployed.mjs` demand a connected feed on a date nobody can say is
    // a trading day. `false` is the claim we can defend.
    const beyond = new Date("2029-03-01T15:00:00Z");

    expect(
      readFeedDiagnostic({ marketDataProvider: "alpaca" }, beyond).marketOpen,
    ).toBe(false);
  });
});

describe("what it reports with a stream", () => {
  const withStream = (at: Date) => {
    const stream = createFixtureStream({
      symbols: [toTicker("NVDA")],
      startingMinute: new Date("2026-09-19T06:59:00Z"),
      now: () => 0,
    });
    stream.subscribe([toTicker("NVDA")], {
      onObservations: () => undefined,
      onConnectionChange: () => undefined,
    });
    stream.tick();
    return readFeedDiagnostic({ marketDataProvider: "fixture" }, at, stream);
  };

  it("reports the feed identity and the connection state separately", () => {
    // §11.2: *our socket is fine and the market feed behind it is dead* must be
    // expressible, and a single boolean cannot say it.
    const body = withStream(SHUT);

    expect(body.feed).toBe("synthetic");
    expect(body.status).not.toBeNull();
  });

  it("reports when the observation was TRUE IN THE MARKET, not when a frame arrived", () => {
    // §6.7 measured `dailyBars` re-sending a byte-identical aggregate every
    // minute out of hours; an arrival-keyed reading would call that liveness.
    const body = withStream(SHUT);

    expect(body.observedAt).toBe("2026-09-19T06:59:00.000Z");
  });
});

describe("what it must never carry", () => {
  it("leaks no credential, endpoint or vendor hostname", () => {
    // `CLAUDE.md`: a 5xx never carries the thrown message, and a message
    // written for a developer is internal detail too. The vendor's hostname is
    // not a secret and is not an operator's question either — a diagnostic that
    // drifts into describing our upstream is how one eventually reports a key.
    const serialised = JSON.stringify(
      readFeedDiagnostic({ marketDataProvider: "alpaca" }, SHUT),
    );

    for (const forbidden of [
      "alpaca.markets",
      "wss://",
      "https://",
      "key",
      "secret",
      "APCA",
    ]) {
      expect(serialised.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it("reports exactly six fields and no more", () => {
    // A field added to the interface and not to the schema vanishes silently on
    // the wire; a field added to BOTH without being thought about is how an
    // endpoint drifts. This fails either way round.
    expect(
      Object.keys(readFeedDiagnostic({ marketDataProvider: "none" }, SHUT)),
    ).toEqual([
      "provider",
      "feed",
      "status",
      "observedAt",
      "marketOpen",
      "checkedAt",
    ]);
  });
});
