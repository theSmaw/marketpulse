// `get_security_snapshot` — the one tool this story ships. It wraps
// `current-market-state.ts`'s `read(symbol)` and nothing else: never
// `snapshotOf`, which discards `source`/`ageMs` for the gateway's own wire
// shape (`CLAUDE.md`'s own dated note on the two stores agreeing about the
// row count and nothing else). A tool answers from the same object a human
// reading `/securities` would see, not a second, thinner view of it.
//
// Two refusals, and they are genuinely different checks rather than one
// check with two labels: `not-tracked` is a universe-membership question,
// decided before `current-market-state.ts` is consulted at all; `nothing-
// observed` is what that object itself says about a security it does know.
//
// **The membership half moved to `tool-universe.ts` in Task 7.2.2**, where
// Story 7.2's other four tools read it. The check is unchanged; what changed
// is that the word is spelled once for the whole pipeline rather than once
// per tool.

import {
  FINDING_TYPE_FOR_TOOL,
  asInstant,
  createEvidencedFinding,
  createUnevidencedFinding,
  formatCount,
  formatPrice,
  refusalClaim,
} from "@marketpulse/shared";

import { untrackedRefusal } from "./tool-universe.js";
import { trackedSymbols } from "./universe.js";

import type { AnalyticalTool } from "./analytical-tool.js";
import type { CurrentMarketState } from "./current-market-state.js";
import type {
  BarSource,
  Finding,
  FindingStamp,
  JsonValue,
  Ticker,
  ToolOutcome,
} from "@marketpulse/shared";

/**
 * The mint-site brand (`composite-score.ts`'s own pattern): the symbol is
 * declared and never exported, so no file outside this module can satisfy
 * this interface structurally — the only way to produce one is to go
 * through {@link createSecuritySnapshotTool}'s own `run`, which is what
 * invariant 1 ("the model never calculates") needs from a tool's result
 * type specifically: a figure a caller could otherwise assemble from a
 * literal is a figure the model could assemble too.
 */
const brand = Symbol("security-snapshot");

export interface SecuritySnapshot {
  readonly symbol: Ticker;
  /** `bar.startsAt` — the interval's own start, never a retrieval time. */
  readonly observedAt: Date;
  readonly price: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly volume: number;
  /** The same {@link BarSource} object `current-market-state.ts` holds —
   * passed through, not copied, so a test can assert identity rather than
   * approximate equality. */
  readonly source: BarSource;
  readonly ageMs: number;
  readonly [brand]: true;
}

export interface SecuritySnapshotInput {
  readonly symbol: Ticker;
}

/**
 * Builds the one tool this story has. Takes the market-state object and the
 * universe membership set as dependencies rather than reading the module
 * singletons directly, so a test can supply a furnished state and a small
 * universe without touching the real one.
 */
export function createSecuritySnapshotTool(
  state: CurrentMarketState,
  universe: ReadonlySet<string> = trackedSymbols(),
): AnalyticalTool<SecuritySnapshotInput, SecuritySnapshot> {
  return {
    name: "get_security_snapshot",
    description: "Measure move",
    // Never `async` — invariant 4's own point: a `Map` lookup needs no
    // `await`, and a tool that is not actually asynchronous should not
    // look like one. `ToolContext` is still part of this signature (every
    // tool receives `asOf`), simply unused by this particular tool.
    run({ symbol }): Promise<ToolOutcome<SecuritySnapshot>> {
      const untracked = untrackedRefusal(symbol, universe);
      if (untracked !== undefined) return Promise.resolve(untracked);

      const observation = state.read(symbol);
      if (observation === undefined) {
        return Promise.resolve({
          kind: "refused",
          reason: "nothing-observed",
        });
      }

      return Promise.resolve({
        kind: "ok",
        value: {
          symbol,
          observedAt: observation.bar.startsAt,
          price: observation.bar.close,
          open: observation.bar.open,
          high: observation.bar.high,
          low: observation.bar.low,
          volume: observation.bar.volume,
          source: observation.source,
          ageMs: observation.ageMs,
          [brand]: true,
        },
      });
    },
  };
}

/**
 * The wire projection for a `TOOL_CALL_COMPLETED` event's `outcome.value` —
 * named fields rather than a spread, for the same reason
 * `wire-serialiser.ts`'s own `toWire` walks a map's keys and not a value's:
 * a field added to {@link SecuritySnapshot} without being added here is
 * never read, so it cannot leak onto the wire unexamined. Not routed
 * through `WireFields`/`toWire` itself, because the brand's own symbol key
 * would have to appear in that map too — a worse reader for no protection
 * `Object.keys` was not already giving this hand-written version.
 */
export function toWireSecuritySnapshot(
  snapshot: SecuritySnapshot,
): Readonly<Record<string, JsonValue>> {
  const source: BarSource = snapshot.source;
  return {
    symbol: snapshot.symbol,
    observedAt: asInstant(snapshot.observedAt),
    price: snapshot.price,
    open: snapshot.open,
    high: snapshot.high,
    low: snapshot.low,
    volume: snapshot.volume,
    source: {
      provider: source.provider,
      feed: source.feed,
      retrievedAt: source.retrievedAt,
      barCount: source.barCount,
    },
    ageMs: snapshot.ageMs,
  };
}

/** This step's claim kind, read from the one home rather than spelled —
 * `FINDING_TYPE_FOR_TOOL` is `satisfies Record<ToolName, FindingType>`, so a
 * seventh tool is a compile error there until it declares its own. */
const TYPE = FINDING_TYPE_FOR_TOOL.get_security_snapshot;

/**
 * **This step's claim** (Task 7.3.1) — the finding `FINDING_CREATED` carries,
 * minted from the tool's own typed `Output` rather than from the wire record
 * beside it.
 *
 * ## Confidence: `SUPPORTED` on every `ok`, and this tool has no floor at all
 *
 * The other five tools each have a shipped sufficiency floor — a sample count,
 * an overlap, a significance verdict — and map `ok` below it to `POSSIBLE`.
 * This one has none, because there is nothing to be insufficient about: a bar
 * either arrived or it did not, and *it did not* is the `nothing-observed`
 * refusal rather than a weakly-evidenced reading.
 *
 * **Deliberately NOT keyed on `ageMs`.** A stale bar is still an honest
 * observation of the minute it describes, and *how current is this feed* has
 * exactly one home in this product — the status bar's `LIVE`/`STALE`/
 * `DISCONNECTED` cell, which `pnpm invariants` refuses a second of. A
 * confidence level that fell to `POSSIBLE` at some age would be a second,
 * quieter connection word, with its own threshold nobody had derived.
 *
 * ## The claim states the span it was measured over, and nothing else
 *
 * `Traded at 184.52 on 12,480 shares in the latest bar`. No ticker (Gate 1 —
 * the route and the identity block already name it), no instant (the identity
 * block draws one a few centimetres up and the evidence carries the real
 * `observedAt`), and no freshness adjective.
 */
export function toSecuritySnapshotFinding(
  outcome: ToolOutcome<SecuritySnapshot>,
  stamp: FindingStamp,
): Finding | undefined {
  // **No finding at all for an inapplicable outcome** — Story 7.3's AC 3.
  // Unreachable from this tool, which has no inapplicable arm, and written as
  // a narrowing rather than omitted so the day one arrives it is already
  // right.
  if (outcome.kind === "inapplicable") return undefined;

  if (outcome.kind === "refused") {
    return createUnevidencedFinding(
      {
        type: TYPE,
        claim: refusalClaim(TYPE, outcome.reason),
        because: outcome.reason,
      },
      stamp,
    );
  }

  const snapshot = outcome.value;

  return createEvidencedFinding(
    {
      type: TYPE,
      claim:
        `Traded at ${formatPrice(snapshot.price)} on ` +
        `${formatCount(snapshot.volume)} shares in the latest bar`,
      confidence: "SUPPORTED",
      evidence: [
        {
          kind: "market_observation",
          // **The feed is NAMED rather than implied** — invariant 6's field,
          // taken off the observation's own `BarSource` rather than assumed:
          // a live bar is `iex` and a stored one is `sip`, and the whole point
          // of this product's provenance rule is that the two are not
          // interchangeable.
          source: `${snapshot.source.provider}:${snapshot.source.feed}`,
          observedAt: snapshot.observedAt,
          security: snapshot.symbol,
          // A **reference** to the read, never a copy of the figure — the
          // claim above already states it, and a second copy could disagree.
          rawData: `current-market-state:${snapshot.symbol}`,
        },
      ],
    },
    stamp,
  );
}
