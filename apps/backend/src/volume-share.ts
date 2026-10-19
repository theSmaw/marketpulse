import {
  marketDateAt,
  toMarketDate,
  type MarketDate,
  type MarketSession,
} from "@marketpulse/shared";

import { breakpointsOf, SAMPLE_SPAN_MINUTES } from "./return-baseline.js";

/**
 * **IEX's share of volume, and the dispersion AC 7's floor is derived from**
 * (Task 5.5.2).
 *
 * ## Why this exists, and why it is not one number
 *
 * Every coverage figure in this repository is a **minute-presence** share —
 * 65.1% median per-symbol minutes on IEX, 82.8% on the stored endpoint, 99.7%
 * on the consolidated tape. **None of them is a share of VOLUME**, and a
 * security present in 65% of minutes may carry 2% of the shares.
 *
 * `STORY.md` asks for a single `sum(iex.volume) / sum(sip.volume)`, and that
 * conflates **two different questions**:
 *
 *   - over **every** `sip` minute of an exposed session, it is the **bias** of
 *     an `iex` numerator over a `sip` baseline — the quantity Gate 1 decision 1
 *     exists to avoid paying, and the one a fallback has to be bounded by;
 *   - restricted to **minutes present on both tapes**, it is **IEX's share of
 *     volume** — a venue fact, with no coverage term in it at all.
 *
 * They differ by exactly the **volume-weighted** coverage shortfall, and this
 * module reports the factorisation rather than leaving it to be inferred:
 *
 *     biasOverAllSipMinutes = shareOnTwoTapeMinutes × volumeExposure
 *
 * which is an identity by construction — the three fields are
 * `Σiex / Σsip(all)`, `Σiex / Σsip(both)` and `Σsip(both) / Σsip(all)` over one
 * read — so a reader can check the arithmetic on the body in front of them.
 * Neither ratio alone answers the story's question.
 *
 * ## An absent `iex` bar: zero in one place and NOT A SAMPLE in the other
 *
 * This is AC 4, and the two halves look contradictory until the claim each one
 * makes is spelled out.
 *
 * In the **bias** numerator an absent `iex` bar contributes **0**. A bar exists
 * for an interval the security traded in *on that venue*, so an absent `iex`
 * bar beside a present `sip` bar says *IEX printed nothing in this minute* —
 * which is a true statement about a venue and is exactly the thing the bias is
 * measuring. What AC 4 forbids is reading it as *nothing traded*, a claim about
 * the market, which here the `sip` bar in the denominator is making instead.
 * `describeSilence`'s lesson, from the other side.
 *
 * In the **per-minute ratio distribution** an absent `iex` bar is **not a
 * sample at all**. A `0.0` there is not an observation of a venue's share, it is
 * the coverage shortfall smuggled into a distribution whose whole purpose is to
 * say how much the *venue share* moves minute to minute — the two effects are
 * the ones the pair of ratios above exists to keep apart, and folding one into
 * the other collapses them again.
 *
 * **The hazard that survives both, named rather than smoothed:** an absent
 * `iex` bar can also mean *this replica was not listening*. `live-bar-writer.ts`
 * only stores what a running process heard, and the socket closed 38 times in
 * 4h 36m on the 2026-09-23 watch. So the **bias** is a lower bound that moves
 * with our own uptime, while the **share** over two-tape minutes is immune to
 * it. That is why `exposedSessions` and `sessionsHoldingIex` are both reported:
 * a gap between them is our downtime, visible on the body.
 *
 * ## Exposure, which is a per-tape count and never the ledger
 *
 * A session qualifies only if it holds **≥1 `sip` row for this security** and
 * is **on or after {@link LIVE_WRITER_FIRST_SESSION}**, because an earlier
 * session cannot hold an `iex` row at all and including one would push the bias
 * towards zero by construction, in proportion to how much history the window
 * has rather than to anything about IEX.
 *
 * It is counted off the rows themselves and **not** off `bar_coverage`, which
 * is tape-blind — the defect Task 5.5.1 repaired one module over, and
 * reintroducing it here would make the exposure count the frontier the IEX
 * socket reached rather than the sessions the consolidated tape is present in.
 *
 * ## The dispersion, and what AC 7's floor is derived FROM
 *
 * Gate 1 widened AC 1 to carry per-bucket dispersion, because without it AC 7's
 * sample floor is **chosen rather than derived**. The median of a sample has
 * relative standard error ≈ `√(π/2)·CV/√n`, so a floor follows from two
 * measurements — a bucket's CV and its `n` — and **one** stated target. The
 * target is the only chosen input on this surface
 * ({@link TARGET_RELATIVE_STANDARD_ERROR}); everything multiplied by it is
 * measured.
 *
 * The bucket is the **anchor grid's own stride**, {@link SAMPLE_SPAN_MINUTES},
 * sampled per minute — Gate 1 decision 4 — so one span serves the return, the
 * grid and this. The samples of a bucket are the individual minute volumes
 * falling inside it across every session of the window, which is why `n` runs
 * into the thousands rather than sitting at the ~18 session sums that would
 * make `4.1×` really mean `2.9–5.3×`.
 *
 * **It is reported per tape and over the WHOLE window, not only the exposed
 * sessions.** Dispersion is a property of the baseline's own population and has
 * nothing to do with IEX's reach, so restricting it to exposed sessions would
 * throw away most of the `n` the figure is about — and Gate 1 decision 1 makes
 * the shipped baseline the `iex` one, whose dispersion is measurable on no
 * machine outside Azure. Both tapes are therefore answered, always, and the
 * `iex` entry refuses on every developer's store rather than being absent.
 *
 * ## Purity
 *
 * Nothing here reads a clock, a store or the environment: the sessions and the
 * minutes are arguments, which is `closesAsOf`'s shape and the reason invariant
 * 4 is structural rather than instructed. The one calendar question — *which
 * bucket is this minute in* — is answered from the session's own `open` and
 * `minuteBars`, both of which `market-time.ts` produced.
 */

/** 60,000. A module-local, which is `return-baseline.ts`' own idiom. */
const MS_PER_MINUTE = 60_000;

/**
 * **The first session an `iex` row can exist for, anywhere.**
 *
 * `live-bar-writer.ts` landed on 2026-09-23 (ADR 0035, `LIVE-SESSION.md`), and
 * before it the only writer was the nightly backfill, which fetches the
 * consolidated tape. So a window reaching further back holds `sip` rows that
 * could never have had an `iex` counterpart, and counting them in the bias
 * denominator measures **how much history we store** rather than IEX's share.
 *
 * It is a **date and not a feature flag**: the rows either exist or they do
 * not, and no configuration changes what was written in the past.
 */
export const LIVE_WRITER_FIRST_SESSION: MarketDate = toMarketDate("2026-09-23");

/**
 * The precision a printed multiple has to support — the **one chosen input**
 * on this surface, stated so it can be argued with.
 *
 * At 5%, a figure printed `4.1× typical` is `4.1 ± 0.2`, so the first decimal
 * place carries information rather than noise. Every other number in the
 * dispersion block is measured; this one is a product judgement about how
 * precisely the figure is drawn, and the achieved
 * {@link BaselineVolumeDispersion.relativeStandardError} is reported beside the
 * floor it implies so a reader can re-derive the floor against a different
 * target without re-running anything.
 */
export const TARGET_RELATIVE_STANDARD_ERROR = 0.05;

/**
 * `√(π/2)` ≈ 1.2533 — the asymptotic ratio of a **median's** standard error to
 * a mean's, at the same `n` and spread.
 *
 * **Derived rather than typed as `1.253`**, which is the figure Gate 1 quotes;
 * a literal is a second, lower-precision home for a constant of mathematics.
 * It is exact for a normal sample and an **approximation** for minute volume,
 * which is heavy-tailed — so the floor it implies is an estimate of the right
 * order, and the measured CV beside it is what makes that estimate checkable
 * rather than a guess.
 */
const MEDIAN_SE_FACTOR = Math.sqrt(Math.PI / 2);

/** Why no share was measured. A fixed vocabulary; see the type. */
export type VolumeShareRefusal =
  "unmeasured" | "no-exposed-session" | "no-two-tape-minute" | "no-sip-volume";

/** Why no dispersion was measured. A fixed vocabulary; see the type. */
export type VolumeDispersionRefusal = "unmeasured" | "no-sample" | "no-spread";

/** One minute of the window, with each tape's volume or `undefined`. */
export interface MinuteVolume {
  /** The minute the bar describes, as `Bar.startsAt`. */
  readonly startsAt: Date;
  /** Shares printed on the consolidated tape, or `undefined` — no row. */
  readonly sip: number | undefined;
  /** Shares printed on IEX, or `undefined` — no row. See AC 4 above. */
  readonly iex: number | undefined;
}

/**
 * IEX's share of volume, both ways, with the factorisation between them.
 *
 * **`measured` means a SHARE was measured.** The counts beside it are honest
 * whatever it says — a store with no `iex` row at all still knows how many
 * `sip` minutes it held — so a refusal here nulls every **ratio** and keeps
 * every **count**, which is the difference between *we could not measure this*
 * and *there was nothing there*.
 */
export interface BaselineVolumeShare {
  /** Whether a share was computed. See the note above. */
  measured: boolean;
  /** Why not, or `null`. One of {@link VolumeShareRefusal}. */
  refusal: string | null;
  /** {@link LIVE_WRITER_FIRST_SESSION}, stated rather than implied. */
  exposureFrom: string;
  /** Sessions in the baseline's window. */
  sessions: number;
  /** Of those, sessions holding ≥1 `sip` row and at or after `exposureFrom`. */
  exposedSessions: number;
  /** Of the exposed ones, how many hold any `iex` row — our own uptime. */
  sessionsHoldingIex: number;
  /** The exposed span, as market dates, or `null` when there is none. */
  firstExposedSession: string | null;
  lastExposedSession: string | null;
  /** `sip` minutes inside the exposed sessions. The bias's denominator. */
  sipMinutes: number;
  /** Of those, minutes that hold an `iex` row too. The share's denominator. */
  twoTapeMinutes: number;
  /** `twoTapeMinutes / sipMinutes` — the minute-presence figure, for contrast. */
  minutePresence: number | null;
  /** Σ `sip` volume over `sipMinutes`. */
  sipVolume: number | null;
  /** Σ `sip` volume over `twoTapeMinutes`. */
  sipVolumeOnTwoTapeMinutes: number | null;
  /** Σ `iex` volume over `twoTapeMinutes` — which is every `iex` row there is. */
  iexVolume: number | null;
  /** **The BIAS**: `iexVolume / sipVolume`. */
  biasOverAllSipMinutes: number | null;
  /** **The SHARE**: `iexVolume / sipVolumeOnTwoTapeMinutes`. */
  shareOnTwoTapeMinutes: number | null;
  /** `sipVolumeOnTwoTapeMinutes / sipVolume` — the factor between them. */
  volumeExposure: number | null;
  /**
   * The per-minute ratio distribution over **two-tape minutes only**.
   *
   * `Σiex/Σsip` above is the **volume-weighted** mean of these; the unweighted
   * mean is a different number, because the intraday curve is U-shaped and a
   * thin midday minute would otherwise weigh the same as the open. The spread
   * is what decides whether any single constant is defensible, because the
   * factor compares **one bucket** rather than a whole session.
   */
  perMinuteRatioP10: number | null;
  perMinuteRatioMedian: number | null;
  perMinuteRatioP90: number | null;
}

/** One tape's within-bucket dispersion of minute volume. */
export interface BaselineVolumeDispersion {
  /** `sip` or `iex`. Both are always answered, never omitted. */
  tape: string;
  /** Whether a CV was computed for any bucket. */
  measured: boolean;
  /** Why not, or `null`. One of {@link VolumeDispersionRefusal}. */
  refusal: string | null;
  /** {@link SAMPLE_SPAN_MINUTES} — the anchor grid's own stride. */
  bucketMinutes: number;
  /** Minutes of this tape that landed in a regular-session bucket. */
  minutes: number;
  /**
   * Minutes of this tape **outside** any regular session — pre-market and
   * after-hours, which the live writer keeps and the backfill never asks for.
   *
   * They are excluded from every figure here, because the baseline's buckets
   * are a grid over the regular session; counting them would put the thinnest
   * minutes of the day into a bucket that does not exist.
   */
  minutesOutsideSession: number;
  /** Buckets holding at least one sample. */
  buckets: number;
  /** Of those, buckets holding at least two — a spread needs a pair. */
  bucketsWithSpread: number;
  /** The median bucket's sample count. */
  samplesMedian: number | null;
  /** The within-bucket coefficient of variation, across buckets. */
  cvP10: number | null;
  cvMedian: number | null;
  cvP90: number | null;
  /**
   * The achieved relative SE of a bucket median at the median bucket's `n` and
   * CV — `√(π/2)·cvMedian/√samplesMedian`.
   */
  relativeStandardError: number | null;
  /**
   * **AC 7's floor, derived.** The samples one bucket needs for a median whose
   * relative SE meets {@link TARGET_RELATIVE_STANDARD_ERROR} at the **p90**
   * CV — the ninetieth percentile rather than the median, so the floor holds
   * for nearly every bucket rather than for the typical one.
   */
  samplesForTargetError: number | null;
  /**
   * The same floor in **sessions**, which is the unit AC 7 is written in: each
   * session contributes {@link SAMPLE_SPAN_MINUTES} minutes to a bucket.
   */
  sessionsForTargetError: number | null;
}

/**
 * Everything the diagnostic reports about volume, from one read.
 *
 * **The members are named as the wire names them**, so
 * `{ ...unmeasuredVolumeShare() }` at the call site is the body's two fields
 * and not a rename — one spelling for each fact, which is what stops a refusal
 * shape and an answered shape drifting apart.
 */
export interface VolumeShareMeasurement {
  readonly volumeShare: BaselineVolumeShare;
  readonly volumeDispersion: readonly BaselineVolumeDispersion[];
}

/** The two tapes this product can hold a minute bar of, in reporting order. */
const TAPES = ["sip", "iex"] as const;

/** What the diagnostic answers when no read was taken at all. */
export function unmeasuredVolumeShare(): VolumeShareMeasurement {
  return {
    volumeShare: {
      measured: false,
      refusal: "unmeasured",
      exposureFrom: LIVE_WRITER_FIRST_SESSION,
      sessions: 0,
      exposedSessions: 0,
      sessionsHoldingIex: 0,
      firstExposedSession: null,
      lastExposedSession: null,
      sipMinutes: 0,
      twoTapeMinutes: 0,
      minutePresence: null,
      sipVolume: null,
      sipVolumeOnTwoTapeMinutes: null,
      iexVolume: null,
      biasOverAllSipMinutes: null,
      shareOnTwoTapeMinutes: null,
      volumeExposure: null,
      perMinuteRatioP10: null,
      perMinuteRatioMedian: null,
      perMinuteRatioP90: null,
    },
    volumeDispersion: TAPES.map((tape) => ({
      tape,
      measured: false,
      refusal: "unmeasured",
      bucketMinutes: SAMPLE_SPAN_MINUTES,
      minutes: 0,
      minutesOutsideSession: 0,
      buckets: 0,
      bucketsWithSpread: 0,
      samplesMedian: null,
      cvP10: null,
      cvMedian: null,
      cvP90: null,
      relativeStandardError: null,
      samplesForTargetError: null,
      sessionsForTargetError: null,
    })),
  };
}

/** Where one minute of the window sits: its session, and its bucket in it. */
interface Placed {
  readonly session: MarketSession;
  readonly date: MarketDate;
  /** The grid bucket, or `undefined` for a minute outside the session. */
  readonly bucket: number | undefined;
}

/**
 * Places a minute on the grid.
 *
 * **A division and never a cutoff.** The bucket is `minuteOfSession` divided by
 * the grid's stride, so there is no minute-scaled quantity subtracted from an
 * instant anywhere in this module — which is why
 * `one-home-for-the-observation-window` is correctly silent about it, exactly
 * as it is about `sessionAnchors`.
 */
function place(
  startsAt: Date,
  sessions: ReadonlyMap<MarketDate, MarketSession>,
): Placed | undefined {
  const date = marketDateAt(startsAt);
  const session = sessions.get(date);
  if (session === undefined) return undefined;

  const minuteOfSession = Math.floor(
    (startsAt.getTime() - session.open.getTime()) / MS_PER_MINUTE,
  );

  // `minuteBars` is derived from the session's own bounds, so an early close
  // has 210 of them rather than 390 and this cannot disagree with the close
  // instant the way a hard-coded pair would.
  const inside = minuteOfSession >= 0 && minuteOfSession < session.minuteBars;

  return {
    session,
    date,
    bucket: inside
      ? Math.floor(minuteOfSession / SAMPLE_SPAN_MINUTES)
      : undefined,
  };
}

function byDate(
  sessions: readonly MarketSession[],
): ReadonlyMap<MarketDate, MarketSession> {
  return new Map(sessions.map((one) => [marketDateAt(one.open), one]));
}

/**
 * A finite ratio, or `undefined`.
 *
 * **AC 5, in one place.** A zero denominator is a **refusal** and never an
 * `Infinity` — `directionOf`'s precedent, and the reason it matters here is
 * that a non-finite figure serialises to `null` and would then read as *we
 * could not measure* rather than as *the arithmetic was impossible*.
 */
function ratio(numerator: number, denominator: number): number | undefined {
  if (denominator === 0) return undefined;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : undefined;
}

/** `breakpointsOf`'s rank, or `undefined` for an empty sample. */
function quantile(
  samples: readonly number[],
  rank: 10 | 50 | 90,
): number | undefined {
  if (samples.length === 0) return undefined;
  // **`breakpointsOf` and not a second quantile.** It is the inclusive,
  // interpolated definition this product already computes every baseline with,
  // and a second implementation beside it is a second answer to *what is a
  // percentile here*.
  return breakpointsOf(samples)[rank];
}

/** Six significant figures, so a ratio reads as a measurement not a float. */
function rounded(value: number | undefined): number | null {
  if (value === undefined) return null;
  return Number(value.toPrecision(6));
}

/**
 * IEX's share of volume over one security's baseline window.
 *
 * @param sessions the window's sessions, oldest first — `BaselineWindow.sessions`
 * @param minutes one row per minute holding either tape, in any order
 */
export function volumeShareOf(
  sessions: readonly MarketSession[],
  minutes: readonly MinuteVolume[],
): BaselineVolumeShare {
  const calendar = byDate(sessions);

  // **Exposure is counted off the rows, not off the ledger.** See the header:
  // `bar_coverage` is tape-blind and Task 5.5.1 is the repair of trusting it.
  const sipSessions = new Set<MarketDate>();
  const iexSessions = new Set<MarketDate>();

  for (const minute of minutes) {
    const placed = place(minute.startsAt, calendar);
    if (placed === undefined) continue;
    if (placed.date < LIVE_WRITER_FIRST_SESSION) continue;

    if (minute.sip !== undefined) sipSessions.add(placed.date);
    if (minute.iex !== undefined) iexSessions.add(placed.date);
  }

  const exposed = [...sipSessions].sort();
  const base = {
    exposureFrom: LIVE_WRITER_FIRST_SESSION,
    sessions: sessions.length,
    exposedSessions: exposed.length,
    sessionsHoldingIex: [...iexSessions].filter((date) => sipSessions.has(date))
      .length,
    firstExposedSession: exposed[0] ?? null,
    lastExposedSession: exposed[exposed.length - 1] ?? null,
  };

  if (exposed.length === 0) {
    // Every developer's store and CI's, and **not** by the route the zero-`iex`
    // refusal below takes: a window that ends before the live writer existed
    // has no session in which an `iex` row could ever have been written, so the
    // honest answer is that nothing was exposed rather than that IEX carried
    // none of it.
    return refusedShare(base, "no-exposed-session", 0, 0, undefined);
  }

  const exposedDates = new Set(exposed);
  let sipMinutes = 0;
  let twoTapeMinutes = 0;
  let sipVolume = 0;
  let sipVolumeOnBoth = 0;
  let iexVolume = 0;
  const perMinuteRatios: number[] = [];

  for (const minute of minutes) {
    const placed = place(minute.startsAt, calendar);
    if (placed === undefined || !exposedDates.has(placed.date)) continue;

    const sip = minute.sip;
    // **The `sip` minute is the unit.** An `iex`-only minute is pre-market,
    // after-hours or a minute the consolidated tape has not yet reconciled: it
    // has no denominator, so it is in neither the bias nor the share.
    if (sip === undefined) continue;

    sipMinutes += 1;
    sipVolume += sip;

    const iex = minute.iex;
    // **An absent `iex` bar contributes 0 here and no sample below.** AC 4,
    // both halves; the header says why they are not in conflict.
    if (iex === undefined) continue;

    twoTapeMinutes += 1;
    sipVolumeOnBoth += sip;
    iexVolume += iex;

    const share = ratio(iex, sip);
    if (share !== undefined) perMinuteRatios.push(share);
  }

  // **One gate rather than two `if`s, and that is the shape the break
  // demanded.** The two refusals below overlap — `twoTapeMinutes === 0`
  // implies `sipVolumeOnBoth === 0` — so each guard written as its own early
  // return is individually breakable **without the number ever escaping**,
  // which made a break of either one red for the weaker reason. Expressed as
  // one gate, the defect a re-implementer actually writes — `STORY.md`'s single
  // unconditional `Σiex / Σsip` — is one edit, and the `0.0` it produces is
  // what the break shows. See the task record for the transcript.
  const refusal = shareRefusalFor(twoTapeMinutes, sipVolume, sipVolumeOnBoth);
  if (refusal !== undefined) {
    return refusedShare(base, refusal, sipMinutes, twoTapeMinutes, sipVolume);
  }

  return {
    ...base,
    measured: true,
    refusal: null,
    sipMinutes,
    twoTapeMinutes,
    minutePresence: rounded(ratio(twoTapeMinutes, sipMinutes)),
    sipVolume,
    sipVolumeOnTwoTapeMinutes: sipVolumeOnBoth,
    iexVolume,
    biasOverAllSipMinutes: rounded(ratio(iexVolume, sipVolume)),
    shareOnTwoTapeMinutes: rounded(ratio(iexVolume, sipVolumeOnBoth)),
    volumeExposure: rounded(ratio(sipVolumeOnBoth, sipVolume)),
    perMinuteRatioP10: rounded(quantile(perMinuteRatios, 10)),
    perMinuteRatioMedian: rounded(quantile(perMinuteRatios, 50)),
    perMinuteRatioP90: rounded(quantile(perMinuteRatios, 90)),
  };
}

/**
 * Why a share cannot be stated from these sums, or `undefined`.
 *
 * **Order is load-bearing.** A store with no `iex` row has
 * `sipVolumeOnBoth === 0` as well, so both conditions hold and the one asked
 * first decides the word on the wire. `no-two-tape-minute` goes first because
 * it is the **informative** one — *this store has never heard IEX*, which is
 * every laptop's and every CI run's permanent state — while `no-sip-volume`
 * says only *the arithmetic was impossible* and would send a reader looking for
 * a data fault that is not there.
 */
function shareRefusalFor(
  twoTapeMinutes: number,
  sipVolume: number,
  sipVolumeOnBoth: number,
): VolumeShareRefusal | undefined {
  // **The zero-`iex` path, and it must not read `0.0`.** `Σiex / Σsip` is a
  // well-formed `0` on a store that holds no `iex` row, and `0` is the single
  // most misleading answer this surface could give: *IEX carries none of the
  // volume* rather than *this store has never heard IEX*.
  if (twoTapeMinutes === 0) return "no-two-tape-minute";
  // AC 5. A zero-volume denominator is a refusal, never an `Infinity`.
  if (sipVolume === 0 || sipVolumeOnBoth === 0) return "no-sip-volume";
  return undefined;
}

/** A refusal that keeps every count it did establish. See the interface. */
function refusedShare(
  base: Omit<
    BaselineVolumeShare,
    | "measured"
    | "refusal"
    | "sipMinutes"
    | "twoTapeMinutes"
    | "minutePresence"
    | "sipVolume"
    | "sipVolumeOnTwoTapeMinutes"
    | "iexVolume"
    | "biasOverAllSipMinutes"
    | "shareOnTwoTapeMinutes"
    | "volumeExposure"
    | "perMinuteRatioP10"
    | "perMinuteRatioMedian"
    | "perMinuteRatioP90"
  >,
  refusal: VolumeShareRefusal,
  sipMinutes: number,
  twoTapeMinutes: number,
  sipVolume: number | undefined,
): BaselineVolumeShare {
  return {
    ...base,
    measured: false,
    refusal,
    sipMinutes,
    twoTapeMinutes,
    minutePresence: rounded(
      sipMinutes === 0 ? undefined : ratio(twoTapeMinutes, sipMinutes),
    ),
    sipVolume: sipVolume ?? null,
    sipVolumeOnTwoTapeMinutes: null,
    iexVolume: null,
    biasOverAllSipMinutes: null,
    shareOnTwoTapeMinutes: null,
    volumeExposure: null,
    perMinuteRatioP10: null,
    perMinuteRatioMedian: null,
    perMinuteRatioP90: null,
  };
}

/**
 * Within-bucket dispersion of minute volume, one entry per tape.
 *
 * Over the **whole** window rather than the exposed sessions, and both tapes
 * always — see the header for both reasons.
 */
export function volumeDispersionOf(
  sessions: readonly MarketSession[],
  minutes: readonly MinuteVolume[],
): readonly BaselineVolumeDispersion[] {
  const calendar = byDate(sessions);

  return TAPES.map((tape) => {
    const buckets = new Map<string, number[]>();
    let counted = 0;
    let outside = 0;

    for (const minute of minutes) {
      const volume = tape === "sip" ? minute.sip : minute.iex;
      if (volume === undefined) continue;

      // **A minute of no session and a minute outside its session are one
      // answer here**, deliberately: both are *this bar is not on the grid the
      // baseline's buckets are a grid over*, and the only thing either can be
      // is counted. They are told apart nowhere because nothing downstream
      // would do anything different with them.
      const bucket = place(minute.startsAt, calendar)?.bucket;
      if (bucket === undefined) {
        outside += 1;
        continue;
      }

      counted += 1;
      // Keyed on the bucket's **index**, so the same time of day across every
      // session is one bucket — which is what "typical for this time of day"
      // means and what makes `n` the thousands rather than the sessions.
      const key = String(bucket);
      const samples = buckets.get(key);
      if (samples === undefined) buckets.set(key, [volume]);
      else samples.push(volume);
    }

    return dispersionOf(tape, counted, outside, [...buckets.values()]);
  });
}

function dispersionOf(
  tape: string,
  minutes: number,
  minutesOutsideSession: number,
  buckets: readonly number[][],
): BaselineVolumeDispersion {
  const shape = {
    tape,
    bucketMinutes: SAMPLE_SPAN_MINUTES,
    minutes,
    minutesOutsideSession,
    buckets: buckets.length,
    bucketsWithSpread: buckets.filter((samples) => samples.length >= 2).length,
  };

  const empty = {
    ...shape,
    measured: false,
    samplesMedian: null,
    cvP10: null,
    cvMedian: null,
    cvP90: null,
    relativeStandardError: null,
    samplesForTargetError: null,
    sessionsForTargetError: null,
  };

  if (buckets.length === 0) {
    return { ...empty, refusal: "no-sample" };
  }

  const cvs: number[] = [];
  for (const samples of buckets) {
    const cv = coefficientOfVariation(samples);
    if (cv !== undefined) cvs.push(cv);
  }

  if (cvs.length === 0) {
    // Buckets exist but none holds a pair, or every pair is flat — a fixture
    // seeded at one volume reaches this, and so would a single session.
    return { ...empty, refusal: "no-spread" };
  }

  const samplesMedian = quantile(
    buckets.map((samples) => samples.length),
    50,
  );
  const cvMedian = quantile(cvs, 50);
  const cvP90 = quantile(cvs, 90);

  // The achieved precision, and the floor that the measured p90 CV implies for
  // the stated target. Both are `√(π/2)·CV/√n` rearranged; see the header.
  const achieved =
    cvMedian === undefined || samplesMedian === undefined || samplesMedian === 0
      ? undefined
      : (MEDIAN_SE_FACTOR * cvMedian) / Math.sqrt(samplesMedian);

  const needed =
    cvP90 === undefined
      ? undefined
      : Math.ceil(
          ((MEDIAN_SE_FACTOR * cvP90) / TARGET_RELATIVE_STANDARD_ERROR) ** 2,
        );

  return {
    ...shape,
    measured: true,
    refusal: null,
    samplesMedian:
      samplesMedian === undefined ? null : Math.round(samplesMedian),
    cvP10: rounded(quantile(cvs, 10)),
    cvMedian: rounded(cvMedian),
    cvP90: rounded(cvP90),
    relativeStandardError: rounded(achieved),
    samplesForTargetError: needed ?? null,
    // Each session contributes one bucket's worth of minutes — the stride — so
    // the floor in sessions is the floor in samples over it. AC 7 is written in
    // sessions, which is why both are reported rather than only the one the
    // arithmetic produced.
    sessionsForTargetError:
      needed === undefined ? null : Math.ceil(needed / SAMPLE_SPAN_MINUTES),
  };
}

/**
 * `sd / mean` over a bucket's samples, or `undefined`.
 *
 * **The sample standard deviation (`n − 1`)**, because these are samples of a
 * bucket's volume rather than its population — and `undefined` rather than `0`
 * for a single sample, a zero mean or a flat bucket, so a floor is never
 * derived from a bucket that has no spread to measure.
 */
function coefficientOfVariation(
  samples: readonly number[],
): number | undefined {
  if (samples.length < 2) return undefined;

  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  if (mean === 0) return undefined;

  const variance =
    samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (samples.length - 1);

  const cv = Math.sqrt(variance) / mean;
  return cv > 0 && Number.isFinite(cv) ? cv : undefined;
}
