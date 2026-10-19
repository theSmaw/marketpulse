// The volume-share arithmetic, with no database (Task 5.5.2).
//
// **The division of labour with `volume-share.database.test.ts` is
// deliberate.** That file owns everything that needs two rows for one minute to
// exist at all — the SQL pairing, the `undefined`-not-zero parse, the end-to-end
// body — and this one owns the arithmetic and the **refusals**, which are
// states a fixture can reach and a real store mostly cannot:
//
//   - a window that ends before the live writer existed, which is every
//     developer's store and CI's;
//   - a window exposed to two-tape writing that holds no `iex` row, which is
//     what a deployment looks like after a replica restart;
//   - a zero-volume denominator, which AC 5 requires to be a refusal rather
//     than an `Infinity`.
//
// Nothing here opens a socket, reads a clock or touches a store: both functions
// take the sessions and the minutes as arguments.

import { describe, expect, it } from "vitest";

import {
  marketSessionOn,
  toMarketDate,
  type MarketSession,
} from "@marketpulse/shared";

import {
  LIVE_WRITER_FIRST_SESSION,
  volumeDispersionOf,
  volumeShareOf,
  type MinuteVolume,
} from "./volume-share.js";

const MS_PER_MINUTE = 60_000;

/** On or after the cutoff, so an `iex` row could have been written. */
const EXPOSED = session("2026-09-23");
/** Before it, so one could not. */
const BEFORE = session("2026-09-22");

function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) {
    throw new Error(`${date} is not a trading session; the fixture is wrong.`);
  }
  return found;
}

function at(one: MarketSession, offset: number): Date {
  return new Date(one.open.getTime() + offset * MS_PER_MINUTE);
}

function minute(
  one: MarketSession,
  offset: number,
  sip: number | undefined,
  iex: number | undefined,
): MinuteVolume {
  return { startsAt: at(one, offset), sip, iex };
}

describe("volumeShareOf — two ratios, because one conflates two questions", () => {
  it("factors the bias into the venue share times the volume exposure", () => {
    const share = volumeShareOf(
      [EXPOSED],
      [
        minute(EXPOSED, 0, 1000, 100),
        minute(EXPOSED, 1, 1000, 300),
        minute(EXPOSED, 2, 1000, undefined),
        minute(EXPOSED, 3, 1000, undefined),
      ],
    );

    expect(share.measured).toBe(true);
    expect(share.biasOverAllSipMinutes).toBeCloseTo(0.1, 10);
    expect(share.shareOnTwoTapeMinutes).toBeCloseTo(0.2, 10);
    expect(share.volumeExposure).toBeCloseTo(0.5, 10);
  });

  it("puts an absent `iex` bar in the bias as 0 and in the distribution not at all", () => {
    // **AC 4, both halves, in one assertion pair.** The bias sees four `sip`
    // minutes and two `iex` bars; the distribution sees two samples. An
    // implementation that pushed `0.0` for the missing bars would agree about
    // the bias and report a median of 0.05 rather than 0.20.
    const share = volumeShareOf(
      [EXPOSED],
      [
        minute(EXPOSED, 0, 1000, 100),
        minute(EXPOSED, 1, 1000, 300),
        minute(EXPOSED, 2, 1000, undefined),
        minute(EXPOSED, 3, 1000, undefined),
      ],
    );

    expect(share.sipMinutes).toBe(4);
    expect(share.twoTapeMinutes).toBe(2);
    expect(share.perMinuteRatioMedian).toBeCloseTo(0.2, 10);
  });

  it("ignores an `iex`-only minute entirely, because it has no denominator", () => {
    // Pre-market, after-hours, or a minute the consolidated tape has not
    // reconciled. 500,000 shares with nothing to divide by is not a share of
    // anything, and adding it to the numerator would make the ratio 125×.
    const share = volumeShareOf(
      [EXPOSED],
      [minute(EXPOSED, 0, 1000, 100), minute(EXPOSED, 10, undefined, 500_000)],
    );

    expect(share.sipMinutes).toBe(1);
    expect(share.iexVolume).toBe(100);
    expect(share.shareOnTwoTapeMinutes).toBeCloseTo(0.1, 10);
  });

  it("excludes a session before the live writer existed", () => {
    const share = volumeShareOf(
      [BEFORE, EXPOSED],
      [
        minute(BEFORE, 0, 9000, undefined),
        minute(EXPOSED, 0, 1000, 100),
        minute(EXPOSED, 1, 1000, 300),
        minute(EXPOSED, 2, 1000, undefined),
        minute(EXPOSED, 3, 1000, undefined),
      ],
    );

    expect(share.exposureFrom).toBe(LIVE_WRITER_FIRST_SESSION);
    expect(share.sessions).toBe(2);
    expect(share.exposedSessions).toBe(1);
    expect(share.firstExposedSession).toBe("2026-09-23");
    // 4,000 and not 13,000: including 2026-09-22 would make the bias 0.031,
    // which measures how much history we store rather than IEX's reach.
    expect(share.sipVolume).toBe(4000);
    expect(share.biasOverAllSipMinutes).toBeCloseTo(0.1, 10);
  });

  it("REFUSES rather than answering 0.0 when the window holds no `iex` row", () => {
    // **The state every developer's store and every CI run is in, reached the
    // second way.** `Σiex / Σsip` is a well-formed `0` here, and `0` is the one
    // answer this surface must never give: *IEX carries none of the volume*
    // rather than *this store has never heard IEX*.
    const share = volumeShareOf(
      [EXPOSED],
      [
        minute(EXPOSED, 0, 1000, undefined),
        minute(EXPOSED, 1, 2000, undefined),
      ],
    );

    expect(share.measured).toBe(false);
    expect(share.refusal).toBe("no-two-tape-minute");
    expect(share.biasOverAllSipMinutes).toBeNull();
    expect(share.shareOnTwoTapeMinutes).toBeNull();
    // **And it keeps every count it did establish.** A refusal that nulled
    // these would be indistinguishable from a store with no `sip` rows either.
    expect(share.sipMinutes).toBe(2);
    expect(share.sipVolume).toBe(3000);
    expect(share.twoTapeMinutes).toBe(0);
    expect(share.minutePresence).toBe(0);
  });

  it("REFUSES by the earlier route when nothing in the window is exposed at all", () => {
    // A window ending before 2026-09-23 — which is this laptop's store today.
    // Distinguished from the refusal above on purpose: *no session could have
    // held an `iex` row* is a different fact from *the exposed sessions hold
    // none*, and only the second one says anything about our listening.
    const share = volumeShareOf([BEFORE], [minute(BEFORE, 0, 1000, undefined)]);

    expect(share.refusal).toBe("no-exposed-session");
    expect(share.exposedSessions).toBe(0);
    expect(share.sipMinutes).toBe(0);
  });

  it("REFUSES a zero-volume denominator rather than dividing to Infinity (AC 5)", () => {
    const share = volumeShareOf(
      [EXPOSED],
      [minute(EXPOSED, 0, 0, 0), minute(EXPOSED, 1, 0, 0)],
    );

    expect(share.refusal).toBe("no-sip-volume");
    expect(share.biasOverAllSipMinutes).toBeNull();
    // Two two-tape minutes genuinely existed; what failed is the arithmetic.
    expect(share.twoTapeMinutes).toBe(2);
  });

  it("counts a minute outside every session in nothing at all", () => {
    // An `iex` bar 30 minutes before the open is a real row on the deployed
    // store — the live writer keeps extended hours and the backfill never asks
    // for them — and it is in no session's bucket and no ratio.
    const share = volumeShareOf(
      [EXPOSED],
      [minute(EXPOSED, 0, 1000, 100), minute(EXPOSED, -30, undefined, 7000)],
    );

    expect(share.sipMinutes).toBe(1);
    expect(share.iexVolume).toBe(100);
  });

  it("shows presence and volume share disagreeing, which is AC 1's premise", () => {
    // Present in 2 of 4 minutes — 50% — while carrying 20% of the volume it
    // was present for. The whole reason a minute-presence figure cannot stand
    // in for a volume one.
    const share = volumeShareOf(
      [EXPOSED],
      [
        minute(EXPOSED, 0, 1000, 100),
        minute(EXPOSED, 1, 1000, 300),
        minute(EXPOSED, 2, 1000, undefined),
        minute(EXPOSED, 3, 1000, undefined),
      ],
    );

    expect(share.minutePresence).toBeCloseTo(0.5, 10);
    expect(share.shareOnTwoTapeMinutes).toBeCloseTo(0.2, 10);
  });
});

describe("volumeDispersionOf — the floor AC 7 needs is DERIVED from it", () => {
  it("pools one bucket across sessions and derives a sample floor from its CV", () => {
    const dispersion = volumeDispersionOf(
      [BEFORE, EXPOSED],
      [
        minute(BEFORE, 0, 1000, undefined),
        minute(EXPOSED, 0, 1000, undefined),
        minute(EXPOSED, 1, 1000, undefined),
        minute(EXPOSED, 2, 1000, undefined),
        minute(EXPOSED, 3, 9000, undefined),
      ],
    );

    const sip = dispersion.find((one) => one.tape === "sip");

    // Five minutes, all within the first five of a session, so **one** bucket
    // holding `[1000, 1000, 1000, 1000, 9000]` — which is what "typical for
    // this time of day" means and why `n` is minutes rather than sessions.
    expect(sip?.buckets).toBe(1);
    expect(sip?.samplesMedian).toBe(5);

    // sd/mean = 3577.71 / 2600 = 1.3760. The floor follows from it:
    // `(√(π/2) · 1.3760 / 0.05)² = 1,190` samples, 238 sessions at five
    // minutes each. Nothing here is chosen except the 5% target.
    expect(sip?.cvMedian).toBeCloseTo(1.376, 3);
    expect(sip?.samplesForTargetError).toBe(1190);
    expect(sip?.sessionsForTargetError).toBe(238);
    // And the precision actually achieved at this `n`, which is what makes the
    // floor above arguable rather than an assertion.
    expect(sip?.relativeStandardError).toBeCloseTo(0.7713, 3);
  });

  it("separates buckets by minute of session, not by session", () => {
    const dispersion = volumeDispersionOf(
      [EXPOSED],
      [
        minute(EXPOSED, 0, 1000, undefined),
        minute(EXPOSED, 6, 2000, undefined),
        minute(EXPOSED, 12, 3000, undefined),
      ],
    );

    // Minutes 0, 6 and 12 fall in buckets 0, 1 and 2 — the anchor grid's own
    // stride. A single bucket would mean the grid had been forgotten.
    expect(dispersion.find((one) => one.tape === "sip")?.buckets).toBe(3);
  });

  it("refuses a flat bucket rather than reporting a CV of 0", () => {
    // A CV of 0 makes `samplesForTargetError` **1**, which is a licence to
    // print any figure from any sample. A single session is this state.
    const dispersion = volumeDispersionOf(
      [EXPOSED],
      [
        minute(EXPOSED, 0, 1000, undefined),
        minute(EXPOSED, 1, 1000, undefined),
      ],
    );

    const sip = dispersion.find((one) => one.tape === "sip");

    expect(sip?.bucketsWithSpread).toBe(1);
    expect(sip?.measured).toBe(false);
    expect(sip?.refusal).toBe("no-spread");
    expect(sip?.cvMedian).toBeNull();
    expect(sip?.samplesForTargetError).toBeNull();
  });

  it("refuses a bucket with a single sample, because a spread needs a pair", () => {
    const dispersion = volumeDispersionOf(
      [EXPOSED],
      [minute(EXPOSED, 0, 1000, undefined)],
    );

    const sip = dispersion.find((one) => one.tape === "sip");

    expect(sip?.buckets).toBe(1);
    expect(sip?.bucketsWithSpread).toBe(0);
    expect(sip?.refusal).toBe("no-spread");
  });

  it("answers for BOTH tapes always, and counts the minutes it could not place", () => {
    const dispersion = volumeDispersionOf(
      [EXPOSED],
      [
        minute(EXPOSED, 0, 1000, 100),
        minute(EXPOSED, -30, undefined, 7000),
        minute(EXPOSED, 400, undefined, 8000),
      ],
    );

    // Two entries, in a fixed order, never by omission — `FreshnessTimeframe`'s
    // rule. The `iex` entry refuses on every store outside Azure, and an absent
    // entry would be indistinguishable from a tape nobody reported.
    expect(dispersion.map((one) => one.tape)).toEqual(["sip", "iex"]);

    const iex = dispersion.find((one) => one.tape === "iex");
    // One inside the session, one before the open and one after the close —
    // the extended-hours minutes the live writer keeps. They are **counted**
    // rather than placed in bucket 0 or in the last bucket.
    expect(iex?.minutes).toBe(1);
    expect(iex?.minutesOutsideSession).toBe(2);
  });

  it("reports no sample rather than no spread when a tape is entirely absent", () => {
    // The two refusals are different facts: *this tape has no rows at all* is
    // every laptop's permanent state, while *its buckets are flat* is a fixture
    // or a single session.
    const dispersion = volumeDispersionOf(
      [EXPOSED],
      [minute(EXPOSED, 0, 1000, undefined)],
    );

    expect(dispersion.find((one) => one.tape === "iex")?.refusal).toBe(
      "no-sample",
    );
  });
});
