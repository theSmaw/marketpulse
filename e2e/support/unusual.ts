import type {
  WireMarketOverview,
  WireUnusualActivity,
  WireUnusualRow,
} from "@marketpulse/shared";

// **A furnished `unusual` section, and the one place the specs that need rows
// build one** (Task 5.4.3).
//
// ## Why furnishing is unavoidable here, and what it costs
//
// CI's store is **516 securities, zero bars and no baseline generation**, and
// a developer's machine runs `MARKET_DATA_PROVIDER=none` — so the real
// producer answers `rows: []`, `eligible: 0` for ever on every gated run. The
// region's drawn state there is permanent and honest, and **no assertion
// about a drawn row can be made against it.**
//
// So the rows below are furnished, through the shipped socket path, which is
// the degraded grid's method: the frame goes down a real `routeWebSocket`, is
// encoded by the shipped encoder, and is read by the shipped `readUnusual` —
// so a protocol change breaks these at the compiler and a decoder change
// breaks them at the screen.
//
// **What that buys and what it cannot**: it proves what the browser does with
// a section, and **nothing whatever about whether the producer would send
// one**. Task 5.2.4's lesson in one line — a pass-through forwards a
// producer's bytes honestly, so a producer broken into inventing a figure is
// drawn exactly as faithfully as a correct one. The claim that a producer
// is honest is `overview-unusual-ranking.spec.ts`', which furnishes nothing
// and grounds itself **out of frame**.

/** The tape both endpoints came from. The move is `iex`-over-`iex` by construction. */
const NUMERATOR = "iex" as const;

/**
 * One furnished row.
 *
 * The endpoints are real fields rather than filler: `WireUnusualRow` requires
 * them, because an ordinal with no instant is a claim about a move nobody can
 * date — and `readUnusual` refuses a row without them, so a helper that
 * elided them would furnish a frame the browser throws away.
 */
export const unusualRow = (
  symbol: string,
  rank: number,
  percent: number,
  options: {
    readonly aboveSample?: boolean;
    readonly sampleCount?: number;
  } = {},
): WireUnusualRow => ({
  symbol,
  rank,
  aboveSample: options.aboveSample ?? false,
  sampleCount: options.sampleCount ?? 4620,
  percent,
  from: { at: "2026-10-15T17:55:00.000Z", price: 100, feed: NUMERATOR },
  to: { at: "2026-10-15T18:00:00.000Z", price: 100 + percent, feed: NUMERATOR },
  observed: 5,
});

/**
 * A whole section around a set of rows.
 *
 * The three counts **nest** — `rows ≤ scored ≤ eligible ≤ tracked` — because
 * `readUnusual` refuses a section where they do not, which is the cross-field
 * chain the region's cut sentence rests on. A helper that let a caller pass
 * them freely would mostly be used to build frames the browser silently drops.
 *
 * ## The generation's session is a PARAMETER since Task 5.4.6, and why
 *
 * It was a constant, and `overview-degraded-grid.spec.ts` drove this helper
 * from a frame dated 2026-09-16 — so the source note drew *Ranked against 60
 * sessions of stored bars, generated for **Oct 14***, a month after the
 * session being scored. ADR 0044 keys a generation **by the session it is
 * for**, and `market-unusual.ts` reads *the generation whose window ends at
 * the session being scored*, so that frame is one no producer builds: this
 * harness's standing hazard, a state the server cannot reach drawn as though
 * it could. It had never shown because every existing caller happens to use
 * the default on both fields at once.
 */
export const unusualSection = (
  rows: readonly WireUnusualRow[],
  counts: {
    readonly scored?: number;
    readonly eligible?: number;
    readonly tracked?: number;
  } = {},
  generationSession = "2026-10-14",
): WireUnusualActivity => {
  const scored = counts.scored ?? Math.max(rows.length, 455);
  const eligible = counts.eligible ?? Math.max(scored, 466);
  const tracked = counts.tracked ?? Math.max(eligible, 501);

  return {
    basis: "observed",
    rows,
    tracked,
    eligible,
    scored,
    windowMinutes: 5,
    spanMinutes: 5,
    baseline: {
      // **The denominator's tape is not the numerator's**, which is the whole
      // of invariant 6's sentence on this section: the move is `iex` and the
      // 60-session distribution it is ranked against is `sip`.
      feed: "sip",
      spanMinutes: 5,
      minimumSampleCount: 2500,
      generation: { session: generationSession, lookbackSessions: 60 },
    },
    refusals: {
      figure: {
        "nothing-observed": 35,
        "no-earlier-endpoint": 0,
        "no-basis": 0,
      },
      comparison: { "too-few-samples": 11, "split-discontinuity": 0 },
    },
  };
};

/** The section fitted onto an otherwise minimal overview frame. */
export const overviewWithUnusual = (
  unusual: WireUnusualActivity,
  computedAt = "2026-10-15T18:00:00.000Z",
): WireMarketOverview => ({
  computedAt,
  observedAt: "2026-10-15T18:00:00.000Z",
  feeds: [NUMERATOR],
  figures: [],
  unusual,
});

/**
 * **The same section on the SESSION arm** — the last completed session's
 * stored closing ranking, which is what `/` draws for about 80% of the week
 * (Task 5.4.5).
 *
 * Built from {@link unusualSection} and then re-armed field by field, so the
 * two differ in **exactly** the discriminant and its companion field: a
 * spread would leave `windowMinutes` hanging off a session section, and the
 * whole point of the arm is that *heard from in the last five minutes* is not
 * a sentence about a session that has ended.
 *
 * Furnished for `unusualSection`'s reason and with its caveat: CI's store has
 * no nightly runner, so the real producer answers with an empty session arm
 * for ever and no assertion about a drawn row could be made against it.
 */
export const sessionUnusualSection = (
  rows: readonly WireUnusualRow[],
  counts: {
    readonly scored?: number;
    readonly eligible?: number;
    readonly tracked?: number;
  } = {},
  session = "2026-10-14",
): WireUnusualActivity => {
  // **The generation is keyed by the session being scored** (ADR 0044), so the
  // one session argument drives both — a section dated Friday ranked against a
  // generation dated a month later is a frame no producer builds.
  const observed = unusualSection(rows, counts, session);

  return {
    basis: "session",
    rows: observed.rows,
    tracked: observed.tracked,
    eligible: observed.eligible,
    scored: observed.scored,
    spanMinutes: observed.spanMinutes,
    baseline: observed.baseline,
    refusals: observed.refusals,
    session,
  };
};

/**
 * **What a gateway that ranked NOTHING actually sends** — and it is not
 * {@link unusualSection} with an empty array (Task 5.4.6).
 *
 * This is CI's permanent state on both arms: 516 securities, zero bars and
 * **no baseline generation**, so the degraded grid needs it furnished at full
 * fidelity rather than approximated. Three fields differ from an emptied
 * {@link unusualSection}, and every one of them is a claim:
 *
 * - **No `generation`.** `market-unusual.ts` resolves one off a stored row it
 *   actually read, and a pass that scored nothing read none — so a frame with
 *   `scored: 0` and a generation beside it is a frame no producer builds, and
 *   it would draw `OverviewSourceNote`' third source over a baseline nobody
 *   held. ADR 0029's false impression, furnished by a harness.
 * - **Both refusal tallies zero.** `eligible − scored` is `0`, so a
 *   `too-few-samples: 11` here counts refusals over an empty candidate set.
 *   The decoder tolerates it on purpose (the identity is an inequality), which
 *   is exactly why a harness must not lean on that tolerance.
 * - **`eligible: 0` and `scored: 0`** rather than the helper's floors.
 *
 * The two arms differ in the discriminant and its companion field alone,
 * which is {@link sessionUnusualSection}'s rule: the region's honest-nothing
 * noun is read off **this section's** basis, so an arm built by spreading the
 * other would make `Nothing ranked yet.` and `Nothing ranked while the market
 * is shut.` one state with two spellings of the same frame.
 */
export const unrankedSection = (
  basis: WireUnusualActivity["basis"],
  options: { readonly tracked?: number; readonly session?: string } = {},
): WireUnusualActivity => {
  const shared = {
    rows: [],
    tracked: options.tracked ?? 503,
    eligible: 0,
    scored: 0,
    spanMinutes: 5,
    baseline: {
      feed: "sip" as const,
      spanMinutes: 5,
      minimumSampleCount: 2500,
    },
    refusals: {
      figure: {
        "nothing-observed": 0,
        "no-earlier-endpoint": 0,
        "no-basis": 0,
      },
      comparison: { "too-few-samples": 0, "split-discontinuity": 0 },
    },
  };

  return basis === "session"
    ? { basis: "session", ...shared, session: options.session ?? "2026-09-11" }
    : { basis: "observed", ...shared, windowMinutes: 5 };
};
