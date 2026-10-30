/**
 * **Every colour and type value the topology draws, read from a token** (Task
 * 6.1.2).
 *
 * Story 6.1's acceptance criterion 6: *every colour the renderer draws is read
 * from a token, never a literal* — and the parse layer **throws rather than
 * defaults**, because a `parse(...) ?? 0x000000` draws an invisible black node
 * that nothing on screen and no test can see. That rule is not invented here:
 * `getTokens()` already throws when a declared token resolves to nothing, and
 * this module is a projection of its answer rather than a second reader.
 *
 * ## Four tokens, zero new ones, zero hue
 *
 * From the design canvas (`The graph at rest.dc.html`): `--chart-volume` for
 * the 501 equity discs (measured **3.50:1** against the panel ground, the best
 * of four grounds this family was measured on, so ADR 0026's standing exception
 * does not fire), `--ink-primary` for the eleven sector SPDRs and the four
 * market proxies, `--chart-grid` for the 501 membership edges, `--chart-reference`
 * for the eleven hub edges, and `--surface-raised` for every node's 1 px halo.
 * `grayscale(1)` changes nothing — the resting graph is already achromatic, so
 * **every bit of the amber ramp is unspent and is Story 6.3's**.
 *
 * ## Why strings rather than packed numbers
 *
 * `styles/tokens.ts`' own docblock predicted that *"Epic 6's Sigma.js/WebGL
 * renderer wants numbers and packed colours, so it will need a parse layer"*.
 * **Measured 2026-10-30: it does not.** Canvas2D's `fillStyle`/`strokeStyle`
 * take a CSS colour string, and Sigma 4's node and edge `color` is a string it
 * parses itself. Neither candidate ever wanted a `0xrrggbb`, so the parse layer
 * that prediction reserved is **not written** — which is this repository's own
 * *do not scaffold ahead of the current step* applied to a prediction three
 * years old rather than to a story. The day something wants a packed colour it
 * is one function, and the throw-rather-than-default rule above is what it
 * inherits.
 *
 * ## What no level below a browser can check
 *
 * `getTokens()` throws in the test environment — **no stylesheet is applied in
 * jsdom** — so nothing below `pnpm e2e` or `pnpm probe` can verify a single
 * colour this renderer draws. That is structural and is the same limit every
 * other token reader in this application lives under.
 */

import { getTokens } from "../styles/tokens.js";

/** Every value the two renderers draw with. Strings, as the stylesheet holds them. */
export interface TopologyPalette {
  /** The 501 equity discs. `--chart-volume`. */
  readonly equity: string;
  /** The eleven sector SPDRs. `--ink-primary`. */
  readonly sectorEtf: string;
  /** The four market proxies. `--ink-primary`. */
  readonly marketProxy: string;
  /** The 501 equity → sector-ETF edges. `--chart-grid`. */
  readonly membershipEdge: string;
  /** The eleven SPY → sector-ETF edges. `--chart-reference`. */
  readonly hubEdge: string;
  /** The 1 px halo every node carries. `--surface-raised`. */
  readonly halo: string;
  /** Sector names and proxy tickers. `--ink-secondary`. */
  readonly label: string;
  /** The micro-label family — sector names. `--font-sans`. */
  readonly labelFamily: string;
  /** The figures-and-identifiers family — proxy tickers. `--font-data`. */
  readonly dataFamily: string;
  /** `--font-size-micro`, in CSS pixels. */
  readonly labelSizePx: number;
  /** `--letter-spacing-micro`, in em. */
  readonly labelTrackingEm: number;
}

/**
 * Parse a `px` token into a number, or **throw**.
 *
 * The throw is the point and it is acceptance criterion 6's named half: a
 * `?? 0` here is an 11 px label drawn at zero, which is a label that is not
 * there and reads on screen as a design decision.
 */
function pixels(name: string, value: string): number {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Design token ${name} is "${value}", which is not a positive length. ` +
        "The topology renderer draws with it, and a default here is a mark " +
        "nothing on screen can see.",
    );
  }

  return parsed;
}

/** `0.08em` → `0.08`, or **throw**. See {@link pixels}. */
function em(name: string, value: string): number {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Design token ${name} is "${value}", which is not a length in em. ` +
        "See the note on pixels() above: a default is an invisible difference.",
    );
  }

  return parsed;
}

/**
 * A font-family list, with its whitespace collapsed.
 *
 * `--font-sans` and `--font-data` are declared across three and four source
 * lines, and `getPropertyValue` hands back the newlines. `ctx.font` is parsed
 * as a CSS shorthand and a newline in the middle of it is not a parse error —
 * **the assignment is silently ignored and the canvas keeps the previous
 * font**, which is the invisible-difference failure this module's throws exist
 * to avoid, arriving by a route no throw can catch. Collapsing is the cure and
 * it is applied to the family rather than to the whole token read, because
 * nothing else here is multi-line.
 */
function family(value: string): string {
  return value.replaceAll(/\s+/gu, " ").trim();
}

/**
 * The palette, from the document's own computed tokens.
 *
 * Not cached here — `getTokens()` already caches, and a second cache is a
 * second home for one fact.
 */
export function topologyPalette(): TopologyPalette {
  const tokens = getTokens();

  return {
    equity: tokens["--chart-volume"],
    sectorEtf: tokens["--ink-primary"],
    marketProxy: tokens["--ink-primary"],
    membershipEdge: tokens["--chart-grid"],
    hubEdge: tokens["--chart-reference"],
    halo: tokens["--surface-raised"],
    label: tokens["--ink-secondary"],
    labelFamily: family(tokens["--font-sans"]),
    dataFamily: family(tokens["--font-data"]),
    labelSizePx: pixels("--font-size-micro", tokens["--font-size-micro"]),
    labelTrackingEm: em(
      "--letter-spacing-micro",
      tokens["--letter-spacing-micro"],
    ),
  };
}
