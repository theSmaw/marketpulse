import { describe, expect, it } from "vitest";

import { isBarSeriesResponse } from "./bar-series-response.js";

// The guard's tests, and the two halves are not the same kind of assertion.
//
// The **rejections** are the ordinary half: a body that is not this contract's
// shape is not this contract's body. The **acceptances** are the half worth
// having, because two of them look exactly like failures — an empty `bars` and
// a null `covered` — and `MARKET-DATA-API.md` §6 makes both a 200. A predicate
// that refused either would turn this contract's own empty answer into
// `api-client.ts`'s `unreadable-body`, which says *something that is not this
// API is answering at this address*. That is the defect these tests exist for.
//
// **The fixtures here stay inline, and Task 2.10.6 decided that explicitly
// rather than leaving it.** That task put a home for recorded response bodies
// under `apps/frontend/src/fixtures/`, so three later stories do not each invent
// one, and the obvious next thought is that this file should read from it. It
// could not: `packages/shared` cannot import from `apps/frontend` — the
// dependency runs the other way, and reversing it for a test fixture would make
// the domain package depend on an application.
//
// It is also the right answer independently of that. This predicate is tested
// against bodies chosen to probe **it** — an unknown feed slug, an empty
// `sources`, a field of the wrong type — rather than against bodies a server
// actually sends, and a recorded body is by definition none of those. What the
// fixture home holds is *what the server produced*; what this file holds is
// *what the guard must survive*. Two sets, two purposes, and neither is the
// other's copy. What must not happen is a **third** set nobody knows about.

/** A body shaped exactly as `GET /market-data/bars` serves one. */
const SERIES_BODY = {
  series: {
    symbol: "NVDA",
    timeframe: "1m",
    bars: [
      {
        startsAt: "2026-09-04T13:30:00.000Z",
        open: 171.02,
        high: 171.48,
        low: 170.9,
        close: 171.31,
        volume: 1_284_311,
      },
      {
        startsAt: "2026-09-04T13:31:00.000Z",
        open: 171.31,
        high: 171.55,
        low: 171.2,
        close: 171.44,
        volume: 612_004,
      },
    ],
    provenance: {
      adjustment: "raw",
      sources: [
        {
          provider: "alpaca",
          feed: "sip",
          retrievedAt: "2026-09-05T02:14:07.000Z",
          barCount: 2,
        },
      ],
    },
    coverage: {
      requested: {
        start: "2026-09-04T13:30:00.000Z",
        end: "2026-09-04T20:00:00.000Z",
      },
      covered: {
        start: "2026-09-04T13:30:00.000Z",
        end: "2026-09-04T13:32:00.000Z",
      },
    },
  },
  securityStatus: "active",
};

/**
 * The same body with one thing changed, as a plain object.
 *
 * Typed `unknown` on the way in and out, because every one of these is a body
 * that arrived from outside the process — asserting on a typed literal would be
 * testing the compiler rather than the predicate.
 */
function withSeries(changes: Record<string, unknown>): unknown {
  return { ...SERIES_BODY, series: { ...SERIES_BODY.series, ...changes } };
}

describe("isBarSeriesResponse", () => {
  it("accepts the body this endpoint serves", () => {
    expect(isBarSeriesResponse(SERIES_BODY)).toBe(true);
  });

  it("accepts a partial answer, which is a 200 and not a failure", () => {
    // `covered` narrower than `requested` — we hold part of the window. There
    // is nothing for the predicate to do about it: it is an answer, and telling
    // a consumer it is a partial one is the state union's job (Task 2.10.4).
    expect(
      isBarSeriesResponse(
        withSeries({
          coverage: {
            requested: {
              start: "2026-09-01T13:30:00.000Z",
              end: "2026-09-04T20:00:00.000Z",
            },
            covered: {
              start: "2026-09-04T13:30:00.000Z",
              end: "2026-09-04T13:32:00.000Z",
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it("accepts an empty series with a null covered — the answer that looks like a failure", () => {
    // *We asked and we hold nothing for this symbol.* A guard requiring a
    // non-empty array turns this into "something else is answering at this
    // address"; a guard requiring a `covered` window does the same. The source
    // is still there, with `barCount: 0`, because `serve-series.ts` gives an
    // empty series exactly one.
    expect(
      isBarSeriesResponse(
        withSeries({
          bars: [],
          provenance: {
            adjustment: "raw",
            sources: [
              {
                provider: "alpaca",
                feed: "sip",
                retrievedAt: "2026-09-05T02:14:07.000Z",
                barCount: 0,
              },
            ],
          },
          coverage: {
            requested: {
              start: "2026-09-04T13:30:00.000Z",
              end: "2026-09-04T20:00:00.000Z",
            },
            covered: null,
          },
        }),
      ),
    ).toBe(true);
  });

  it("accepts a stitched series whose sources name two different feeds", () => {
    // The whole reason `sources` is a list: §7.1 requires each stretch to be
    // labelled for what it is rather than the pair being given one name.
    expect(
      isBarSeriesResponse(
        withSeries({
          provenance: {
            adjustment: "raw",
            sources: [
              {
                provider: "alpaca",
                feed: "sip",
                retrievedAt: "2026-09-05T02:14:07.000Z",
                barCount: 1,
              },
              {
                provider: "alpaca",
                feed: "iex",
                retrievedAt: "2026-09-05T02:14:09.000Z",
                barCount: 1,
              },
            ],
          },
        }),
      ),
    ).toBe(true);
  });

  it("accepts a series for a security we no longer track", () => {
    // `status` is not filtered on this path: the bars are still what happened.
    expect(
      isBarSeriesResponse({ ...SERIES_BODY, securityStatus: "untracked" }),
    ).toBe(true);
  });

  it("accepts unknown extra keys at every level, because a newer server is a skew", () => {
    expect(
      isBarSeriesResponse({
        ...SERIES_BODY,
        futureEnvelopeKey: 1,
        series: {
          ...SERIES_BODY.series,
          futureSeriesKey: "?",
          bars: [{ ...SERIES_BODY.series.bars[0], trades: 4_004 }],
          provenance: {
            ...SERIES_BODY.series.provenance,
            sources: [
              { ...SERIES_BODY.series.provenance.sources[0], venue: "?" },
            ],
          },
        },
      }),
    ).toBe(true);
  });

  it("refuses a body that is not an object at all", () => {
    // The static host answering `index.html` at a 200, which this repository
    // has measured twice.
    expect(isBarSeriesResponse("<!doctype html>")).toBe(false);
    expect(isBarSeriesResponse(null)).toBe(false);
    expect(isBarSeriesResponse(undefined)).toBe(false);
  });

  it("refuses a missing series or a missing security status", () => {
    expect(isBarSeriesResponse({ securityStatus: "active" })).toBe(false);
    expect(isBarSeriesResponse({ series: SERIES_BODY.series })).toBe(false);
  });

  it("refuses a feed this bundle has no words for", () => {
    // Invariant 6 through the one door left open: `MARKET_FEED_DESCRIPTIONS`
    // has no sentence for a slug we have not been taught, so it would be
    // rendered raw or rendered as nothing.
    expect(
      isBarSeriesResponse(
        withSeries({
          provenance: {
            adjustment: "raw",
            sources: [
              {
                ...SERIES_BODY.series.provenance.sources[0],
                feed: "nasdaq-basic",
              },
            ],
          },
        }),
      ),
    ).toBe(false);
  });

  it("refuses a provider, adjustment, timeframe or security status it has not been taught", () => {
    expect(
      isBarSeriesResponse(
        withSeries({
          provenance: {
            adjustment: "raw",
            sources: [
              { ...SERIES_BODY.series.provenance.sources[0], provider: "iex" },
            ],
          },
        }),
      ),
    ).toBe(false);

    expect(
      isBarSeriesResponse(
        withSeries({
          provenance: {
            ...SERIES_BODY.series.provenance,
            adjustment: "dividend-adjusted",
          },
        }),
      ),
    ).toBe(false);

    expect(isBarSeriesResponse(withSeries({ timeframe: "5m" }))).toBe(false);

    expect(
      isBarSeriesResponse({ ...SERIES_BODY, securityStatus: "delisted" }),
    ).toBe(false);
  });

  it("refuses a series that came from nowhere", () => {
    // The domain's non-emptiness, re-established on the way in — the wire type
    // cannot state it because a tuple has no JSON Schema the server could
    // enforce. Note this is NOT the empty-series case above: that one has a
    // source with `barCount: 0`.
    expect(
      isBarSeriesResponse(
        withSeries({ provenance: { adjustment: "raw", sources: [] } }),
      ),
    ).toBe(false);
  });

  it("refuses an absent covered, where it accepts a null one", () => {
    // The null carries meaning; an absent key is a server that does not know
    // about the field at all.
    expect(
      isBarSeriesResponse(
        withSeries({
          coverage: { requested: SERIES_BODY.series.coverage.requested },
        }),
      ),
    ).toBe(false);
  });

  it("refuses a bar whose numbers are not numbers, and a bars that is not an array", () => {
    expect(
      isBarSeriesResponse(
        withSeries({
          bars: [{ ...SERIES_BODY.series.bars[0], close: "171.31" }],
        }),
      ),
    ).toBe(false);

    expect(isBarSeriesResponse(withSeries({ bars: null }))).toBe(false);
  });

  it("accepts an instant it cannot parse, because that fails locally and visibly", () => {
    // `isSecurityCoverage`'s stated asymmetry: a discriminator a consumer
    // switches on is checked, a value it renders is not. `Invalid Date` is what
    // a wrong one produces, in one cell, rather than a whole response reported
    // as coming from the wrong host.
    expect(
      isBarSeriesResponse(
        withSeries({
          bars: [{ ...SERIES_BODY.series.bars[0], startsAt: "yesterday" }],
        }),
      ),
    ).toBe(true);
  });

  it("checks shape and never coherence, which is what an unreadable-body means here", () => {
    // Descending bars, and sources whose counts do not sum to them. Both are
    // real defects and both are OUR server's rather than a stranger's, so the
    // predicate accepts them: reporting them as `unreadable-body` would name
    // the wrong half of the system. `toBarSeries` is what catches them, where
    // the payload becomes domain objects.
    const [first, second] = SERIES_BODY.series.bars;
    expect(
      isBarSeriesResponse(
        withSeries({
          bars: [second, first],
          provenance: {
            adjustment: "raw",
            sources: [
              { ...SERIES_BODY.series.provenance.sources[0], barCount: 99 },
            ],
          },
        }),
      ),
    ).toBe(true);
  });
});
