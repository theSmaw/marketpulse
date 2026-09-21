import { readFileSync } from "node:fs";
import { join } from "node:path";

import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { createCurrentMarketState } from "./current-market-state.js";
import { createFixtureStream } from "./fixture-stream.js";
import { observationsIn, toMappedFrames } from "./alpaca-stream-mapping.js";

import type { LiveObservation } from "./market-data-stream.js";

const CORPUS = join(import.meta.dirname, "fixtures", "alpaca-stream");

/** A recorded vendor frame, mapped through the REAL mapper. */
const observationsFrom = (name: string): readonly LiveObservation[] =>
  observationsIn(
    toMappedFrames(
      JSON.parse(readFileSync(join(CORPUS, `${name}.json`), "utf8")),
      "2026-09-16T14:02:00.000Z",
    ),
  );

const NVDA = toTicker("NVDA");
const AAPL = toTicker("AAPL");

/** 14:03Z — two minutes after the recorded bar at 14:01Z. */
const READ_AT = Date.parse("2026-09-16T14:03:00Z");

const stateAt = (at = READ_AT) => createCurrentMarketState({ now: () => at });

describe("the current market state", () => {
  it("is written by a live stream, and read back with no browser attached", () => {
    // **Criterion 1, and the thing that is impossible before this task.**
    // `index.ts` discarded every observation; a price only reached a screen
    // because the gateway re-broadcast it. Nothing could answer *what is
    // NVDA's latest price* unless a browser happened to be attached.
    //
    // So this drives a real stream — no fake, no hand-built observation — and
    // then asks the object a question, with nothing subscribed to it.
    const state = stateAt();
    const symbols = [NVDA, AAPL];

    const stream = createFixtureStream({ symbols });
    const unsubscribe = stream.subscribe(symbols, {
      onObservations: (batch) => {
        state.observe(batch);
      },
      onConnectionChange: () => undefined,
    });

    stream.tick();
    unsubscribe();

    const nvda = state.read(NVDA);
    expect(nvda).toBeDefined();
    expect(typeof nvda?.bar.close).toBe("number");
    expect(state.size()).toBe(2);
  });

  it("reads a price and its instant in the same call", () => {
    // Criterion 4. §10.3's property 2 is the reason: this map is NOT cleared
    // on a session boundary, so at 09:31 on Monday it still holds Friday —
    // correctly. A reader holding a number with no instant beside it renders
    // Friday's close as today's price, and the repair is shape rather than
    // documentation. There is no `priceOf()` to get this wrong with.
    const state = stateAt();
    state.observe(observationsFrom("bar-nvda"));

    const held = state.read(NVDA);

    expect(held?.bar.close).toBe(214.75);
    expect(held?.bar.startsAt.toISOString()).toBe("2026-09-16T14:01:00.000Z");
    expect(held?.source).toBeDefined();
  });

  it("says how old an observation is, computed on read rather than stored", () => {
    // A stored age is wrong the instant after it is written, and the bug it
    // produces — a price that claims to be four seconds old all afternoon —
    // looks exactly like a working feed. So the same object read two minutes
    // later must report two minutes.
    const state = stateAt();
    state.observe(observationsFrom("bar-nvda"));

    expect(state.read(NVDA)?.ageMs).toBe(120_000);

    const later = createCurrentMarketState({ now: () => READ_AT + 60_000 });
    later.observe(observationsFrom("bar-nvda"));
    expect(later.read(NVDA)?.ageMs).toBe(180_000);
  });

  it("answers `nothing observed` for a symbol it has not seen", () => {
    // **Criterion 3, and an ordinary answer rather than an error.** §7.6
    // measured IEX covering 65.1% of minutes for a median symbol and 2.1% for
    // `ERIE`, and after a restart this map refills unevenly — within a minute
    // for a liquid name, possibly hours for a thin one. A zero or an empty
    // string here would be a price nobody observed.
    const state = stateAt();
    state.observe(observationsFrom("bar-nvda"));

    expect(state.read(AAPL)).toBeUndefined();
    expect(() => state.read(AAPL)).not.toThrow();
  });

  describe("revisions — §14.1's 0.064%, 29.1–30.1 s late, 35.3% changing the close", () => {
    it("replaces the bar it corrects rather than appending a second one", () => {
      // Criterion 2, against the recorded `u` frame. Both fixtures carry
      // `t: 14:01:00Z`; the revision changes the close 214.75 -> 214.71 and
      // the volume 5184 -> 5284. A client that appended would hold two bars
      // for one minute; one that ignored revisions would be quietly wrong for
      // ever. This is where `LiveObservation.supersedes` is finally acted on.
      const state = stateAt();
      state.observe(observationsFrom("bar-nvda"));
      expect(state.read(NVDA)?.bar.close).toBe(214.75);

      state.observe(observationsFrom("bar-nvda-revision-close-changed"));

      expect(state.read(NVDA)?.bar.close).toBe(214.71);
      expect(state.read(NVDA)?.bar.volume).toBe(5284);
      // One security, one entry. Appending would show here as two.
      expect(state.size()).toBe(1);
    });

    it("does not walk backwards when a correction arrives for a minute already passed", () => {
      // **The case that gets written wrong.** A revision lands ~30 s after its
      // bar while bars are 60 s apart, so it normally arrives before the next
      // bar — but not always. Applying a correction to 14:01 while holding
      // 14:02 would make *the latest observation* older than the one it
      // replaced, and every reader of this object would see the price go back
      // in time for no reason a user could understand.
      //
      // The correction is not lost to the product: a revision to a past minute
      // belongs in Story 3.9's store. It is simply not news about *now*.
      const state = stateAt();

      const [recorded] = observationsFrom("bar-nvda");
      if (recorded === undefined) throw new Error("fixture produced no bar");

      const nextMinute: LiveObservation = {
        ...recorded,
        bar: {
          ...recorded.bar,
          startsAt: new Date("2026-09-16T14:02:00.000Z"),
          close: 215.1,
        },
      };

      state.observe([nextMinute]);
      state.observe(observationsFrom("bar-nvda-revision-close-changed"));

      expect(state.read(NVDA)?.bar.close).toBe(215.1);
      expect(state.read(NVDA)?.bar.startsAt.toISOString()).toBe(
        "2026-09-16T14:02:00.000Z",
      );
    });

    it("inserts a revision for a minute it never saw", () => {
      // The task's own words: a `u` frame for a minute we never saw is an
      // insert, not an error. After a restart this is the common shape — the
      // map is empty and whatever arrives first is the latest.
      const state = stateAt();
      state.observe(observationsFrom("bar-nvda-revision-close-changed"));

      expect(state.read(NVDA)?.bar.close).toBe(214.71);
    });
  });

  describe("`status` is filtered — UNIVERSE.md §12.2's invisible predicate", () => {
    it("holds nothing for a symbol outside the tracked universe", () => {
      // §12.2's rule for a reader not in its table: filter when computing over
      // *the market we track now*, and never when showing something we stored.
      // This object is the former — it is named the current market state.
      const state = createCurrentMarketState({
        now: () => READ_AT,
        tracked: new Set(["AAPL"]),
      });

      state.observe(observationsFrom("bar-nvda"));

      expect(state.read(NVDA)).toBeUndefined();
      expect(state.size()).toBe(0);
    });

    it("defaults to the tracked universe rather than to everything", () => {
      // The default matters: a caller who passes no `tracked` set must not
      // silently get an unfiltered object. `ZZQQT` is a well-formed invention
      // in nobody's universe — §4.4 measured that Alpaca accepts such a symbol
      // silently, so the vendor will never tell us it is wrong.
      const state = stateAt();
      const [recorded] = observationsFrom("bar-nvda");
      if (recorded === undefined) throw new Error("fixture produced no bar");

      state.observe([{ ...recorded, symbol: toTicker("ZZQQT") }]);

      expect(state.size()).toBe(0);
    });
  });

  it("exposes everything held, which is what the snapshot will be", () => {
    // Task 3.5.4 turns this into the gateway's snapshot and, in doing so,
    // deletes the three-line identity-block flash that happens on every page
    // load today. §11.1's omission semantics start here: a security observed
    // is present, a security not observed is ABSENT — never present-and-empty.
    const state = stateAt();
    state.observe(observationsFrom("bar-nvda"));

    const all = state.all();

    expect([...all.keys()]).toEqual([NVDA]);
    expect(all.get(NVDA)?.bar.close).toBe(214.75);
    expect(all.has(AAPL)).toBe(false);
  });
});
