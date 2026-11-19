// `get_market_breadth` — the market-breadth step (Task 7.2.5), and the fourth
// tool this product has.
//
// ## It READS rather than computes, and that is the whole tool
//
// `marketBreadth` needs `eligibleMoves(...)`, which needs
// `MarketOverviewEntry[]` from `buildMarketOverview(...)` — and
// `one-producer-of-the-overview-aggregate` permits exactly one call site of
// that builder, in `index.ts`, beside the market state it reads. So this tool
// reads the latest pass that producer computed
// (`latest-overview-pass.ts`) and takes the breadth section off its frame.
//
// **Recomputing was not merely forbidden, it was wrong.** A second join is a
// second answer to one question at a second instant, so the figure this step
// reports and the figure `/`'s own `Market breadth` region draws could differ
// with both individually correct — ADR 0038's decision 1 and Task 4.7.3's
// *two true halves, one contradiction* arriving by a sixth door. And it is the
// one call shape Epic 13's replay has to refuse: a join filters on
// `status = 'active'`, the market we track **now**, which is invariant 4's own
// named gap.
//
// ## Why `Input` carries no ticker
//
// `EPIC.md`'s hand-off from Epic 5 is explicit that breadth is *"a stated
// clause rather than a weighted factor"* — identical for every member of a
// group — and Story 7.2's AC 5 asks that the output type **structurally**
// cannot carry a per-security verdict. Both halves are held by the shapes
// here rather than by a convention: the input is `{}`, so there is no symbol
// to grade, and {@link MarketBreadthReading} declares no symbol, score, rank
// or band (`tool-market-breadth.test.ts` holds that as a
// `@ts-expect-error`, the one assertion that cannot be forgotten).
//
// It is therefore the only tool in this pipeline with **no `not-tracked`
// arm**. `PSKY` runs the full checklist and every other tool answers that
// refusal independently; this step has no security to answer it about, and
// breadth is correctly a fact about the 501 equities whether or not the
// investigated symbol is one of them — the subject is never the population,
// which `breadth-is-counted-over-the-equities-alone` already holds at the
// producer.
//
// ## The one refusal, and the word it is NOT
//
// `no-aggregate-yet` — no overview aggregate has been computed in this
// process yet. Never `nothing-observed`, which is a different fact with a
// different repair: *we have an aggregate and it says the market was quiet*
// is a count of zero over a stated denominator, and that is the measurement
// CI draws for ever. `TOOL_REFUSALS`' own docblock carries the pair.
//
// ## What every machine sees, and what none does
//
// On **CI** (zero bars, no provider) the join still runs on the first
// browser's connect, so this tool answers `ok` with
// `measured: 0, tracked: 516` on the session basis — an honest count with an
// honest denominator, and the first tool in this story whose `ok` arm a gated
// machine reaches at all. What no gated machine will ever see is a NON-ZERO
// count: that needs stored bars and a live feed. And the refusal arm is
// reachable on every machine, before any browser has connected — which the
// investigation route can genuinely be, because `POST /investigations` needs
// no socket.

import type { AnalyticalTool } from "./analytical-tool.js";
import type { OverviewPass } from "./market-overview.js";
import type {
  JsonValue,
  ToolOutcome,
  WireMarketBreadth,
} from "@marketpulse/shared";

/**
 * The mint-site brand — `tool-volume-ratio.ts`'s pattern and its reason: the
 * symbol is declared and never exported, so the only way to produce one of
 * these is through {@link createMarketBreadthTool}'s own `run`, which can
 * only build one from a pass the single producer computed. A reading a caller
 * could assemble from a literal is a reading the model could assemble too,
 * which is invariant 1's whole subject.
 */
const brand = Symbol("market-breadth-reading");

/**
 * **A group fact about the whole tracked market, and nothing about any one
 * security.**
 *
 * `counts` is `WireMarketBreadth` **verbatim** rather than a parallel shape —
 * the three buckets, the `measured` they sum to, the `tracked` they are a
 * part of, and the basis discriminant with its own `windowMinutes` or
 * `session`. Reusing it is deliberate on two counts: it is the type `/`'s own
 * region already draws, so the two surfaces cannot disagree about what the
 * figure means; and it carries **no symbol and no score**, so this reading
 * structurally cannot grade the investigated security.
 */
export interface MarketBreadthReading {
  readonly counts: WireMarketBreadth;
  /**
   * **When the aggregate these counts came from was true** — the frame's own
   * `observedAt`, the newest observation it contains, and **absent** where it
   * contains none (ADR 0038's decision 3: say nothing rather than say now).
   *
   * Deliberately NOT `computedAt`, which is a reading of this process's
   * clock and which that same ADR forbids any surface to date data from: it
   * advances whenever somebody opens a tab, with no market data behind it.
   */
  readonly observedAt?: string;
  readonly [brand]: true;
}

/** No ticker, by decision — see this module's own header. */
export type MarketBreadthInput = Record<string, never>;

/**
 * Builds the market-breadth tool over the one read of the retained pass.
 *
 * A **function** rather than the holder, for `market-gateway.ts`'s reason one
 * layer down: a tool may read what the producer computed and may never write
 * it (`one-writer-of-the-latest-overview-pass`), and a parameter that cannot
 * write is the cheapest way to say so.
 */
export function createMarketBreadthTool(
  latestOverviewPass: () => OverviewPass | undefined,
): AnalyticalTool<MarketBreadthInput, MarketBreadthReading> {
  return {
    name: "get_market_breadth",
    // `EPIC.md`'s fourth of five, as the checklist's own sentence — never the
    // tool's identifier, which is a separate field for a separate reader.
    description: "Calculate market breadth",
    // Never `async`: a field read and a property access, with nothing to
    // await. `asOf` is deliberately unread — the instant this answer is about
    // travels **on the pass**, as `observedAt`, and reading the context's
    // clock here would date a retained aggregate by when it was asked for.
    run(): Promise<ToolOutcome<MarketBreadthReading>> {
      const pass = latestOverviewPass();

      // **The honest absence, and it is a state rather than a failure.**
      // `undefined` is a process that has computed no aggregate — nobody has
      // connected, or this is the first seconds of a deployment. Refusing
      // here rather than computing one is the decision, not a shortfall: see
      // the header.
      if (pass === undefined) {
        return Promise.resolve({ kind: "refused", reason: "no-aggregate-yet" });
      }

      // **A frame may carry no breadth section at all**, which the wire's own
      // type says (`breadth?:`) and which the region already draws as *this
      // gateway does not send breadth*. It is a different fact again from
      // both arms above, and the honest answer for a tool is the same word as
      // for a missing pass: there is no count to report.
      const counts = pass.frame.breadth;
      if (counts === undefined) {
        return Promise.resolve({ kind: "refused", reason: "no-aggregate-yet" });
      }

      return Promise.resolve({
        kind: "ok",
        value: {
          counts,
          // Two branches rather than one spread of a possibly-`undefined`
          // value: `exactOptionalPropertyTypes` is on, and *absent* is what
          // an aggregate containing no observation means.
          ...(pass.frame.observedAt === undefined
            ? {}
            : { observedAt: pass.frame.observedAt }),
          [brand]: true,
        },
      });
    },
  };
}

/**
 * The wire projection for a `TOOL_CALL_COMPLETED` event's `outcome.value` —
 * named fields rather than a spread, for `toWireSecuritySnapshot`'s reason: a
 * field added to {@link MarketBreadthReading} without being added here is
 * never read, so it cannot reach the wire unexamined.
 *
 * The counts are spread from `WireMarketBreadth`, which is already a wire
 * type with its own encoder and its own two cross-field checks — this is the
 * one place in the projection where naming each field again would be a second
 * copy of that shape rather than a guard over it.
 */
export function toWireMarketBreadthReading(
  reading: MarketBreadthReading,
): Readonly<Record<string, JsonValue>> {
  return {
    ...reading.counts,
    ...(reading.observedAt === undefined
      ? {}
      : { observedAt: reading.observedAt }),
  };
}
