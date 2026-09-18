import { isTicker } from "@marketpulse/shared";
import type {
  BarSource,
  MarketFeed,
  ProviderId,
  Ticker,
} from "@marketpulse/shared";

import { ALPACA_PROVIDER_ID, type AlpacaBar, toBar } from "./alpaca-mapping.js";
import type { LiveObservation } from "./market-data-stream.js";

/**
 * Vendor socket frame → domain observation. **Pure: no socket, no clock, no
 * network.** Task 3.2.5 owns the transport; this file owns the meaning.
 *
 * The arrangement is `alpaca-mapping.ts` / `alpaca-provider.ts`'s, one stream
 * over: splitting the two is the reason the historical client's mapping is
 * testable at all, and every test here runs against
 * `src/fixtures/alpaca-stream/`.
 *
 * ## `sip` is unreachable by construction, not by omission
 *
 * Acceptance criterion 4: the free plan refuses a SIP socket with `409` at
 * authentication (`LIVE-DATA.md` §4.5), so **a code path that could claim one
 * is a code path that lies.**
 *
 * **A narrow constant is NOT enough, and that was verified by trying it.**
 * {@link ALPACA_STREAM_FEED} is `"iex" as const satisfies MarketFeed`, which
 * keeps the literal type — but `BarSource.feed` is the wide {@link MarketFeed},
 * so `feed: "sip"` written directly into {@link toStreamBarSource} still
 * compiled. The guard has to be on the **destination**, not the source: hence
 * {@link StreamBarSource}, whose `feed` is the literal. Substituting `"sip"`
 * into this module is now `TS2322`, proven by doing it.
 *
 * (`ALPACA_FEED` in `alpaca-mapping.ts` is deliberately still the wide type:
 * the HTTP plan really does serve the consolidated tape, and that constant has
 * no equivalent lie to prevent.)
 */
export const ALPACA_STREAM_FEED = "iex" as const satisfies MarketFeed;

/** The provider is the same vendor; only the feed differs. */
export const ALPACA_STREAM_PROVIDER_ID: ProviderId = ALPACA_PROVIDER_ID;

/**
 * A bar frame, in the vendor's spelling.
 *
 * `T` is `"b"` for a new bar and `"u"` for a revision of one already sent. The
 * remaining fields are an {@link AlpacaBar} plus `S`, `n` and `vw` — which is
 * why {@link toBar} is reused rather than reimplemented.
 */
interface AlpacaStreamBarFrame extends AlpacaBar {
  readonly T: "b" | "u";
  readonly S: Ticker;
}

/**
 * What a frame turned into. **A value, never a throw** — `PROVIDER.md` §8.5's
 * line: a result says what happened to a message, a throw says the program is
 * wrong, and a vendor sending something unexpected is not our program being
 * wrong.
 *
 * `unmappable` exists so that a frame we cannot read is **visibly** dropped.
 * `fast-json-stringify`'s lesson transfers and it is the reason this union has
 * three members rather than two: a `null` under a numeric field reaches the
 * wire as `0`, **a plausible price**. A defaulted `Bar` is the same failure one
 * layer up — it looks like data, it charts, and nothing anywhere says it was
 * invented.
 */
export type MappedFrame =
  | { readonly kind: "observation"; readonly observation: LiveObservation }
  /**
   * A frame this mapping does not turn into an observation — a subscription
   * acknowledgement, an error, the greeting. **Not an error**: §4.4 measured
   * nine bad requests producing nine frames on a connection that survived all
   * of them, so a frame that is not a bar is routine traffic.
   */
  | { readonly kind: "ignored"; readonly messageType: string }
  /** A frame that claims to be a bar and is not one we can read. */
  | { readonly kind: "unmappable"; readonly reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Every numeric field must be a finite number.
 *
 * **`Number.isFinite` rather than `typeof === "number"`**, which is the whole
 * point: `NaN` and `Infinity` are both `number`, both survive `JSON.parse` of a
 * malformed payload, and both produce a `Bar` that renders as a blank or a
 * broken axis rather than as an error.
 */
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * One frame from the socket to one {@link MappedFrame}.
 *
 * `retrievedAt` is a **parameter and never read from a clock here**, which is
 * `alpaca-mapping.ts`'s own rule and the trap this repository has fallen into
 * once already: Task 2.3.5's `checkedOn` defaulting to `now()` made a
 * provenance date always today, and therefore permanently silent about the one
 * thing it exists to report.
 */
export function toMappedFrame(
  frame: unknown,
  retrievedAt: string,
): MappedFrame {
  if (!isRecord(frame)) {
    return { kind: "unmappable", reason: "frame is not an object" };
  }

  const messageType = frame.T;
  if (typeof messageType !== "string") {
    return { kind: "unmappable", reason: "frame has no `T`" };
  }

  if (messageType !== "b" && messageType !== "u") {
    return { kind: "ignored", messageType };
  }

  const symbol = frame.S;
  if (typeof symbol !== "string") {
    return {
      kind: "unmappable",
      reason: `\`${messageType}\` frame has no \`S\``,
    };
  }
  // **`isTicker` rather than `toTicker`, because a socket frame is untrusted
  // input** — `ticker.ts` says exactly that, and `toTicker` throws, which would
  // make one malformed symbol tear down a connection carrying 517 good ones.
  //
  // This is a FORMAT check and deliberately nothing more. §4.4 measured that
  // Alpaca does **not** validate symbols: `ZZQQTESTX` was subscribed, accepted,
  // and echoed back as held. Nine characters fails the pattern so this catches
  // that particular string — but a well-formed invention like `ZZQQT` would
  // pass here and still be in nobody's universe. **Validating against our own
  // universe is Story 3.5's, and it has to happen BEFORE the subscribe frame is
  // sent**, which is a different place from this one. A mapping that tried to
  // do it would need the universe, and a pure function that reads the universe
  // is no longer pure.
  if (!isTicker(symbol)) {
    return {
      kind: "unmappable",
      reason: `\`${symbol}\` is not a well-formed ticker`,
    };
  }

  const startsAt = frame.t;
  if (typeof startsAt !== "string" || Number.isNaN(Date.parse(startsAt))) {
    return {
      kind: "unmappable",
      reason: `\`${symbol}\` has no readable \`t\``,
    };
  }

  // Volume is checked with the others and NOT specially: a zero-volume bar is
  // real (§7.2) and is not an error, so the only test that can be applied here
  // is finiteness.
  for (const field of ["o", "h", "l", "c", "v"] as const) {
    if (!finite(frame[field])) {
      return {
        kind: "unmappable",
        reason: `\`${symbol}\` has no finite \`${field}\``,
      };
    }
  }

  const bar = frame as unknown as AlpacaStreamBarFrame;

  return {
    kind: "observation",
    observation: {
      symbol: bar.S,
      // The SAME function the HTTP client's bars go through. `startsAt` takes
      // `t` with no shift, because §7.3 confirmed with an HTTP control that `t`
      // marks the interval's START on the stream too — a mapping that shifted
      // would put every live bar a minute out, silently, on every surface.
      bar: toBar(bar),
      source: toStreamBarSource(retrievedAt),
      // **The whole point of this file.** A `u` is a replacement for a
      // (symbol, minute) already delivered, not another bar in it.
      supersedes: bar.T === "u",
    },
  };
}

/**
 * A {@link BarSource} that **cannot** name the consolidated tape.
 *
 * The narrowing is the mechanism behind acceptance criterion 4. `BarSource`
 * permits any {@link MarketFeed}, which is right for the type in general — the
 * HTTP client really does serve `sip`. It is wrong for anything downstream of
 * this socket, where the plan refuses SIP outright, and a wide field is exactly
 * where a lie fits.
 */
export type StreamBarSource = BarSource & {
  readonly feed: typeof ALPACA_STREAM_FEED;
};

/**
 * The provenance every streamed bar carries.
 *
 * `barCount` is 1 because a stream delivers observations one at a time; the
 * field exists on {@link BarSource} for a fetched *series*, and stating it
 * rather than omitting it keeps the type honest.
 */
export function toStreamBarSource(retrievedAt: string): StreamBarSource {
  return {
    provider: ALPACA_STREAM_PROVIDER_ID,
    feed: ALPACA_STREAM_FEED,
    retrievedAt,
    barCount: 1,
  };
}

/**
 * A whole inbound message — Alpaca sends an **array** of frames — to one
 * {@link MappedFrame} each.
 *
 * Batched because the vendor batches (§7.2), and one frame failing must not
 * discard the others in the same message: a malformed bar for one symbol is
 * not a reason to drop a good bar for another.
 */
export function toMappedFrames(
  message: unknown,
  retrievedAt: string,
): readonly MappedFrame[] {
  if (!Array.isArray(message)) {
    return [{ kind: "unmappable", reason: "message is not an array" }];
  }
  return message.map((frame) => toMappedFrame(frame, retrievedAt));
}

/** The observations in a message, for a caller that wants only those. */
export function observationsIn(
  frames: readonly MappedFrame[],
): readonly LiveObservation[] {
  return frames.flatMap((frame) =>
    frame.kind === "observation" ? [frame.observation] : [],
  );
}
