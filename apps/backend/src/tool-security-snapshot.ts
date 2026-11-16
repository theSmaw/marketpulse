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

import { asInstant } from "@marketpulse/shared";

import { trackedSymbols } from "./universe.js";

import type { AnalyticalTool } from "./analytical-tool.js";
import type { CurrentMarketState } from "./current-market-state.js";
import type {
  BarSource,
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
      if (!universe.has(symbol)) {
        return Promise.resolve({ kind: "refused", reason: "not-tracked" });
      }

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
