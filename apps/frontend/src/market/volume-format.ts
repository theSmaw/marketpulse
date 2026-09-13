// How this product spells a volume — written, and spoken (Task 2.13.3).
//
// `price-format.ts` is the precedent for where this lives and how it is tested,
// and the rule it inherits is `VOLUME-AND-WINDOW.md` §5: **abbreviate on the axis
// and in summaries; never in the reading.** The value scale's single label and any
// headline figure are rounded; the crosshair's readout states the exact integer,
// so the answer to "where does the exact figure still exist" is always one
// pointer move or one arrow key away on the same screen, and never "in the API".
//
// ## Three significant digits, and the reason is a column rather than a taste
//
// `base.css` sets `font-variant-numeric: tabular-nums`, which is what makes Story
// 1.4's columns line up — but `K`, `M` and `B` are **letters**, and letters are
// not tabular. §5b's rule is therefore: the suffix is part of the string, the
// strings are right-aligned on their trailing edge, and the significant digits
// are held constant so the widths stay within a character of each other —
// `9.81M`, `104M`, `1.04B`. Aligning on the decimal point instead is what breaks
// the moment a column mixes `M` and `B`.
//
// ## The spoken form lives here, beside the written one
//
// A volume read aloud as "4.1M" is not English, and `chart-alternative.ts` builds
// a sentence rather than a label. Deciding the two in one file is what stops them
// drifting: a written form that changed its rounding without the spoken one
// following would have a sighted reader and a listener quoting different figures
// off the same bar.
//
// ## No `Intl.NumberFormat` anywhere, for `price-format.ts`'s reason
//
// A locale-aware format renders `1.234,56` for one reader and `1,234.56` for
// another, and a figure that differs between two machines drawing the same data is
// not a figure this product can put on an axis. The grouping below is written out
// by hand for the same reason.

/**
 * How many significant digits an abbreviated volume carries.
 *
 * Three. See the header: it is what keeps `9.81M`, `104M` and `1.04B` within a
 * character of each other in a right-aligned column.
 */
const SIGNIFICANT_DIGITS = 3;

/** The abbreviations, largest first, with the spoken word beside each. */
const MAGNITUDES: readonly {
  readonly at: number;
  readonly suffix: string;
  readonly spoken: string;
}[] = [
  { at: 1e9, suffix: "B", spoken: "billion" },
  { at: 1e6, suffix: "M", spoken: "million" },
  { at: 1e3, suffix: "K", spoken: "thousand" },
];

/**
 * A volume as an axis or a summary shows it — `742`, `9.81K`, `104M`, `1.04B`.
 *
 * Bars carry volumes around 10⁶ intraday and around 10⁹ daily
 * (`packages/shared/src/bar.ts`), so `M` and `B` are the two that matter and `K`
 * exists for a thin security's minute.
 *
 * **Rounding promotes.** 999,500 shares is `1.00M` and not `1000K`: a figure
 * whose rounding takes it past its own magnitude has to change suffix, or the
 * column contains a four-digit mantissa exactly once and jitters.
 *
 * Below a thousand there is no suffix and no decimal point — a volume is a count
 * of shares, so `742` is the whole truth and `742.000` is three characters of
 * false precision.
 */
export function formatVolume(volume: number): string {
  if (!Number.isFinite(volume)) return "—";

  // **Rounded to three significant digits BEFORE the suffix is chosen**, which is
  // the order that matters: 999,500 shares rounds to 1.00 million, so choosing
  // the suffix from the raw value would label it `1.00K` — a figure a thousand
  // times wrong, produced by rounding alone. Picking the magnitude from the
  // rounded value promotes the suffix with the mantissa.
  const rounded = toSignificant(volume);
  const magnitude = Math.abs(rounded);

  for (const { at, suffix } of MAGNITUDES) {
    if (magnitude < at) continue;
    return `${mantissa(rounded / at)}${suffix}`;
  }

  // Under a thousand: no suffix and no decimal point. See the doc comment.
  return String(Math.round(rounded));
}

/**
 * A volume as a sentence says it — `742 shares`, `9.81 thousand`, `4.06 million`.
 *
 * What a screen reader is handed instead of {@link formatVolume}'s string. The
 * figure is the same figure to the same precision, so the two channels cannot
 * quote different numbers off one bar; only the magnitude is a word rather than a
 * letter.
 *
 * `shares` appears only below a thousand, where there is no magnitude word to
 * carry the subject. Above it the sentence around the figure names the subject —
 * `chart-alternative.ts` writes *traded volume*, not a bare number — and "4.06
 * million shares" inside that sentence is the word twice.
 */
export function spokenVolume(volume: number): string {
  if (!Number.isFinite(volume)) return "unknown";

  const rounded = toSignificant(volume);
  const magnitude = Math.abs(rounded);

  for (const { at, spoken } of MAGNITUDES) {
    if (magnitude < at) continue;
    return `${mantissa(rounded / at)} ${spoken}`;
  }

  const whole = Math.round(rounded);
  return `${String(whole)} ${whole === 1 ? "share" : "shares"}`;
}

/**
 * The exact figure, grouped — `4,061,234`.
 *
 * **What the readout states, and the one place volume is not rounded** (§5a).
 * Grouping is a departure from `formatPrice`, which has none: a price is four
 * digits in a tabular column where a separator buys nothing, and a volume is
 * seven to ten digits in a single readout where it is the difference between a
 * figure and a smear. Written out by hand rather than through `Intl`, so two
 * machines drawing the same bar produce the same string.
 */
export function formatVolumeExact(volume: number): string {
  if (!Number.isFinite(volume)) return "—";

  const digits = String(Math.round(Math.abs(volume)));
  const groups: string[] = [];

  // Sliced from the **right**, in threes, which is the only direction the rule is
  // written in: a leading group of one or two digits is what makes 1234 read
  // `1,234` and 123 read `123`.
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }

  const grouped = groups.join(",");

  return volume < 0 ? `−${grouped}` : grouped;
}

/**
 * A value at {@link SIGNIFICANT_DIGITS} significant digits.
 *
 * Exactly three digits of the figure survive, whatever its magnitude: 4,061,234
 * becomes 4,060,000 and 742 stays 742. Zero is its own answer because `log10(0)`
 * is not a number.
 */
function toSignificant(value: number): number {
  if (value === 0) return 0;
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (SIGNIFICANT_DIGITS - 1 - exponent);
  return Math.round(value * factor) / factor;
}

/**
 * An already-rounded mantissa, written to the places its magnitude leaves.
 *
 * `9.81`, `104`, `1.04`. The caller has divided by a magnitude chosen from the
 * rounded value, so the mantissa is in `[1, 1000)` and this only decides where the
 * point goes.
 */
function mantissa(value: number): string {
  const decimals = Math.max(
    0,
    SIGNIFICANT_DIGITS - 1 - Math.floor(Math.log10(Math.abs(value))),
  );
  return value.toFixed(decimals);
}
