import { measuredTape } from "./measured-tape.js";

import type {
  VolumeRefusal,
  WireRefusedVolume,
  WireVolumeRate,
} from "@marketpulse/shared";
import type { SymbolReturnView } from "./live-feed.js";

// **The volume multiple's words** (Task 5.5.4) — the second indicator of
// `Abnormal-move indicators`, and the first figure in this product that is a
// **multiple** rather than a percentage.
//
// ## Nothing here computes the figure
//
// The ratio, the counted `n`, the lookback, the grid stride, the span and the
// tape are all the backend's, off the frame (`apps/backend/src/volume-ratio.ts`
// against a 60-session baseline no browser holds). What this module does is
// **spell** them — `five-minute-return.ts`' own division of labour, and
// invariant 1's: a renderer that derived a multiple would be a second producer
// for a number nobody can eyeball.
//
// ## Five channels tell a multiple from everything else, and three carry no
// ## colour
//
// A multiple and a percentage are the same glyphs — digits and a decimal point
// — and one of them is a price move. So:
//
// 1. the **`×`**, U+00D7, glued to the digits at the same size, weight and ink.
//    **No other figure in this product ends in `×`**, and it is never the
//    letter `x`, never superscript and never a smaller suffix;
// 2. **no sign, ever.** `+4.1×` is a category error — a multiple has no
//    direction — and unsignedness is the strongest single discriminator on a
//    screen where every other figure carries a `+` or a `−`;
// 3. the word **`typical`** immediately after, which is the **comparand**
//    rather than a unit: the figure is a ratio against a stated quantity, and
//    the quantity is named in the row beneath;
// 4. **one decimal, always** — `1.0×`, `10.0×` — so the column is one shape;
// 5. and the untinted ink, which is the one channel that is only a channel in
//    colour and therefore the one that does not count on its own.
//
// **Untinted is inherited rather than decided**: *volume does not encode
// direction* is already settled in `VISUAL-LANGUAGE.md`, and a tint here would
// be the price palette standing where meaning normally is — on a figure that
// has no direction to encode.
//
// ## And it reads no clock
//
// `computedAt`, `sentAt` and `Date.now()` appear nowhere in this module or in
// the component that draws it, which is the region's rule since Task 5.2.3.
// There is no instant on this indicator at all: the five minutes it is about
// are the return's own, stated one indicator up.

/**
 * The micro label over the figure — **`VOLUME PER MINUTE` when drawn**, and
 * the per-minute grain is load-bearing rather than pedantic.
 *
 * `5-minute volume` over `4.1× typical` would assert that the five minutes'
 * **sum** is 4.1× a typical five minutes, which is a quantity this product does
 * not hold: the median of a sum is not the sum of medians, so *the typical
 * five-minute volume* cannot be derived from a per-minute median. Both the
 * numerator and the denominator here are shares **per minute**, and the label
 * says so — which is Gate 1 decision 3's own argument (a figure under a label
 * is a claim about what that label names) applied to this indicator's own wording.
 */
export const VOLUME_LABEL = "Volume per minute";

/** The comparand, drawn beside the multiple rather than as a unit. */
const TYPICAL = "typical";

/**
 * **The digit cap, and the glyph above it is the percentile's own `>`.**
 *
 * A multiple is unbounded above — a security printing its first shares of the
 * day into a quiet bucket can reach four figures — and `1,482.3×` is a number
 * nobody reads as a number. Above the cap the figure says `>999× typical`,
 * which is the stronger statement rather than a clamp hiding one.
 */
const MULTIPLE_CEILING = 999;

/**
 * **The floor, which the task file did not name and which `toFixed(1)` makes
 * necessary** (Task 5.5.4).
 *
 * One decimal renders every ratio below 0.05 as **`0.0×`**, and `0.0× typical`
 * is the one sentence this whole figure exists to keep off a screen: it reads
 * as *nothing traded*, which is a claim about a stock exchange rather than
 * about our arithmetic. The producer guarantees a ratio strictly above zero and
 * the decoder refuses one that is not, so a `0.0×` could only ever be the
 * **formatter** inventing it — which is AC 4's lesson arriving at the last
 * place anybody would look for it.
 *
 * So below the floor the figure says `<0.1× typical`, the ceiling's glyph
 * mirrored, and the reader is told what they can act on: *far quieter than
 * typical, and we are not pretending to a second digit*.
 */
const MULTIPLE_FLOOR = 0.1;

/**
 * `4.1×`, `0.3×`, `1.0×`, `>999×`, `<0.1×` — **the one home for drawing a
 * multiple in this product.**
 *
 * ## Below 1 gets no reciprocal and no word
 *
 * `0.3× typical` and not `3.3× quieter`: a reciprocal invents a second scale
 * running the other way, and the reader then has to notice which of two scales
 * a figure is on before they can compare two securities. And `quiet` / `heavy`
 * collide with Story 5.6's band vocabulary — the collision AC 3 is about, one
 * word earlier than the one it names.
 *
 * ## Exactly 1 draws `1.0× typical`, never a dash
 *
 * `—` is `unchanged` in `PriceChange`, so a dash in this slot would assert
 * **zero volume** rather than *exactly typical* — AC 4's own lesson, in the
 * glyph rather than in the arithmetic.
 */
export function formatMultiple(ratio: number): string {
  // Rounded first, so the cap is decided on the figure that would be DRAWN:
  // `999.96` renders `1000.0` at one decimal, which is four digits inside a
  // cap that reads three.
  const rounded = Number(ratio.toFixed(1));

  // **`>=` the next integer, not `>` the cap.** `999.4×` is three integer
  // digits and draws; the cap is about the digit the figure would GROW by, so
  // it fires at a thousand — which is also exactly when `>999` becomes true of
  // the rounded figure.
  if (rounded >= MULTIPLE_CEILING + 1) return `>${String(MULTIPLE_CEILING)}×`;
  if (rounded < MULTIPLE_FLOOR) return `<${MULTIPLE_FLOOR.toFixed(1)}×`;

  // `toFixed(1)` and never `toLocaleString`: a multiple below the cap has at
  // most three integer digits, so there is no grouping separator to decide
  // about — and the one decimal is the whole precision claim.
  return `${rounded.toFixed(1)}×`;
}

/**
 * **What the multiple was taken against — the baseline's three facts in one
 * row**, in the register `.sample` already set one indicator up.
 *
 * `last 5 minutes · median minute of 60 sessions · same 5-minute bucket ·
 * today excluded`, and every number in it is **read** rather than spelled: the
 * span is the numerator's, the lookback and the stride are the stored
 * generation's. A rollback can put a gateway and a bundle two values apart,
 * which is `spanMinutes`' own argument one module over.
 *
 * ## Four clauses rather than three, and the first is the numerator's
 *
 * AC 6 asks for the bucket width, the lookback and the exclusion of the scored
 * window. The fourth — *last 5 minutes* — is here because this indicator has
 * no qualifier row of its own: the return indicator states the two instants,
 * and without this clause nothing on the volume indicator would say **what**
 * was divided. It is the same five minutes, said once.
 *
 * ## `median minute`, because the robustness is the one choice §11 makes
 *
 * A mean of a heavy-tailed minute distribution is dragged by the open and by
 * every block trade in the window; §11 says *median* and the pass computes one.
 * Saying so on screen is what stops a reader reading `typical` as *average*.
 *
 * ## `today excluded`, because the window ends at the last completed session
 *
 * The generation is keyed by the session it is **for** and its window ends at
 * that session's close, so the figure is never compared with a baseline that
 * contains it. ADR 0044.
 */
export const volumeSample = (rate: WireVolumeRate): string =>
  `last ${String(rate.spanMinutes)} minutes · ` +
  `median minute of ${String(rate.lookbackSessions)} sessions · ` +
  `same ${String(rate.bucketMinutes)}-minute bucket · today excluded`;

/**
 * **The six sentences, and why none of them is one of the fourteen already
 * approved** (Task 5.5.4).
 *
 * The register is inherited — short, no connection word, no status word, no
 * terminal stop — and the strings are not. The two in `return-percentile.ts`
 * are about a **distribution of returns** and stand in this region's other
 * indicator; the four in `five-minute-return.ts` say *no figure* about a **price
 * move**; the eight in `relative-performance.ts` are about a comparison
 * between two securities. Every one of them would, reused here, tell a reader
 * that something other than the volume is missing.
 *
 * **Each names IEX where the fact is about IEX**, which is invariant 6 at the
 * grain of a refusal: *we have no history* is about our store, and *nothing
 * printed in these five minutes* is about **one venue's tape** — on IEX an
 * absent bar is ordinary rather than a claim that nothing traded, and a
 * sentence that said *no trades* would be the market claim `describeSilence`
 * was narrowed to avoid.
 *
 * **A total record over `VolumeRefusal`**, so a seventh word on the wire is a
 * compile error naming the missing member rather than an `undefined` reaching
 * the figure slot.
 *
 * ## Every one of them has to fit ONE line at 308 px, and that is measured
 *
 * They are drawn in the figure's own row, which reserves a single metric line
 * box — so a sentence that wraps does not clip, it **steps the region by
 * 26 px** at the narrow width nobody develops at, which is Story 4.7's defect
 * in `Movers` arriving here. Probed in Chromium at 11px on 2026-10-20, in the
 * rail's **308 px** content box: a **58-character** sentence fits on one line
 * and a **62-character** one does not. Both of this set's long sentences were
 * written over that line and shortened — `Baseline too short to compare — 80
 * minutes of this time of day` (62) and `History crosses an unadjusted price
 * break — shares not comparable` (65) each measured **282 px** where every
 * other state measured 256.
 *
 * So the budget for a seventh sentence is **58 characters at the largest `n`
 * it can print**, and the instrument is `pnpm probe --story
 * market-abnormalmove--volume-baseline-too-short --viewports 374x900` — the
 * story box at 374 is the rail's 308.
 */
const REFUSALS: Readonly<
  Record<VolumeRefusal, (of: WireRefusedVolume) => string>
> = {
  // *We have never heard IEX for this security* — a gap in our listening
  // rather than a wait, and the state of every machine without a provider.
  "no-same-tape-baseline": () => "No IEX volume history for this security",
  // *We have some and it cannot carry a decimal.* The counted `n` travels
  // because a refusal's first question is how much we had; there is no
  // `of N` beside it, because the floor is a **function** of the measured
  // dispersion per bucket rather than one number (Task 5.5.2).
  "too-few-sessions": (of) =>
    "Too little history — " +
    `${of.sampleCount.toLocaleString("en-US")} IEX minutes at this time of day`,
  // It names a **price break** rather than a split, as the percentile's does
  // and for the same reason — the detector reads a session-boundary ratio
  // and has no corporate-action calendar — but it says what that costs
  // HERE: a split multiplies the share count by exactly the factor it
  // divides the price by, so the shares either side are not comparable.
  "split-discontinuity": () => "Unadjusted price break — shares not comparable",
  // The denominator is zero. A refusal, never an `Infinity`, and it says
  // which venue printed nothing.
  "zero-volume-baseline": () =>
    "No IEX shares in a typical minute at this time of day",
  // **Absent, never zero.** The window holds no bar at all in these five
  // minutes; the sentence is about IEX's printing rather than about trading.
  "no-bar-in-bucket": (of) =>
    `No IEX bars in the last ${String(of.spanMinutes)} minutes`,
  // **A coverage fact, and the one that must not read like the one above.**
  // It says how many minutes we heard, because that is the number a reader
  // can watch change — and the figure is refused rather than scaled by
  // `5/k`, which would impute the minutes IEX did not print.
  "bucket-partially-observed": (of) =>
    `IEX printed in only ${String(of.observed)} of ` +
    `${String(of.spanMinutes)} minutes`,
};

/**
 * What the volume indicator draws. {@link ReturnIndicator}'s shape, one
 * indicator down.
 */
export interface VolumeIndicator {
  /** The micro label. Spelled by the component, read from here. */
  readonly label: string;
  /** `4.1×`, or `undefined` where there is no multiple. */
  readonly multiple: string | undefined;
  /** `typical` — the comparand, drawn only beside a figure. */
  readonly comparand: string | undefined;
  /**
   * The sentence standing where a figure would be — **words rather than
   * digits**, and never a dash.
   */
  readonly absent: string | undefined;
  /** What the multiple was taken against, or `undefined` on a refusal. */
  readonly sample: string | undefined;
  /** Which tapes the two halves came from — invariant 6, or `undefined`. */
  readonly tape: string | undefined;
}

/** The indicator's room with nothing in it — the paint before the first frame. */
export const RESERVED_VOLUME: VolumeIndicator = {
  label: VOLUME_LABEL,
  multiple: undefined,
  comparand: undefined,
  absent: undefined,
  sample: undefined,
  tape: undefined,
};

/**
 * **The volume indicator, for the security this page is about.**
 *
 * The symbol is compared rather than trusted, for `fiveMinuteReturnIndicator`'s
 * reason exactly: the gateway answers the focus a browser last declared, and a
 * reader moving from NVDA to AMD has one subscribe round trip in which the last
 * answer is about NVDA.
 *
 * **A `null` comparison draws nothing but the label**, which is ADR 0029's
 * defer rule: the gateway said nothing about the volume at all — a browser
 * holding a bundle across a deploy — and a sentence explaining an absence we
 * were not told about would be a claim of its own. It is **not** the same state
 * as a refusal, which has a word and gets a sentence.
 *
 * @param symbol The security on screen.
 * @param held What the feed is holding, or `undefined` before the first frame.
 */
export function volumeRatioIndicator(
  symbol: string,
  held: SymbolReturnView | undefined,
): VolumeIndicator {
  if (held?.symbol !== symbol) return RESERVED_VOLUME;

  const { volume } = held;
  if (volume === null) return RESERVED_VOLUME;

  if (!volume.measured) {
    return {
      label: VOLUME_LABEL,
      multiple: undefined,
      comparand: undefined,
      absent: REFUSALS[volume.refusal](volume),
      // **No sample row and no tape line on a refusal** (ADR 0029): there is
      // no figure, so there is nothing whose baseline or provenance could be
      // claimed — and a fully-formed source line about no figure is the false
      // impression that rule exists for. The refusal sentence itself carries
      // the one number it needs.
      sample: undefined,
      tape: undefined,
    };
  }

  return {
    label: VOLUME_LABEL,
    multiple: formatMultiple(volume.ratio),
    comparand: TYPICAL,
    absent: undefined,
    sample: volumeSample(volume),
    // **Both tapes named, and they are the SAME tape** — Gate 1 decision 1,
    // displayed rather than implied. The indicator above says `baseline on All US
    // exchanges`, so a reader comparing the two lines is reading the
    // difference between the two factors rather than being left to assume one.
    tape: measuredTape([volume.feed], volume.feed),
  };
}
