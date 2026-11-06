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
 * **Spent, in part, since 2026-11-03 by Task 6.3.2.** Four more fields read
 * `--ink-disabled`/`--ink-secondary`/`--anomaly-high`/`--anomaly-extreme` for
 * the anomaly-band ring and the `unscored` outline — see
 * {@link TopologyPalette.anomalyElevated}'s own note for why `elevated` reads
 * an ink token rather than `--anomaly-elevated` itself. The heading above is
 * left standing as a historical record of this module's state at Story 6.1's
 * close.
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
  /**
   * The `unscored` equity's own stroke — an achromatic outline, no fill
   * (Task 6.3.2). `--ink-disabled`: the same token this application already
   * uses product-wide for *we have no figure for this*, which is the honest
   * reading a node with no composite score wants, rather than a colour this
   * module would be inventing for the occasion.
   */
  readonly anomalyUnscored: string;
  /**
   * The `elevated` ring. **`--ink-secondary`, never `--anomaly-elevated`** —
   * Gate 1's Decision 2 is that the ring spends amber for `high`/`extreme`
   * only and `elevated` is achromatic, so this reads the same ink the sector
   * labels already use rather than the market-wide `--anomaly-elevated`
   * token (`--palette-amber-pale`), which is a hue and would put colour on
   * roughly 40% of the graph in the one ramp this screen's chrome already
   * spends on degraded states.
   */
  readonly anomalyElevated: string;
  /** The `high` ring. `--anomaly-high`. */
  readonly anomalyHigh: string;
  /**
   * The `extreme` ring, **and** the only band whose node fill this changes
   * too (`AnomalyBand`'s own fourth value). `--anomaly-extreme`, measured at
   * shaping against `--surface-raised` at 3.050:1.
   */
  readonly anomalyExtreme: string;
  /**
   * The ground disc under the node a reader is pointing at (Task 6.4.1) —
   * radius 12 CSS px at zoom 1, from `Hover, select, and the way out.dc.html`.
   *
   * **`--surface-sunken`, a VALUE step and no hue at all.** Hover is a
   * transient, pointer-only state over a picture whose entire colour budget is
   * spent on the anomaly ramp (`anomalyHigh`/`anomalyExtreme`): a hue here
   * would compete with a measurement. A value step also survives
   * `grayscale(1)` unchanged, which is this product's standing rule that colour
   * is never the sole encoding of anything — and the disc is not the sole
   * encoding either way, because the cursor changes and the readout plate
   * fills with words.
   */
  readonly hoverGround: string;
  /**
   * The ground disc under the **selected** node (Task 6.4.2) — the hover
   * disc's dark twin, same radius, from
   * `Hover, select, and the way out.dc.html`.
   *
   * **`--surface-inverse`, and the direction of the step is the whole
   * decision.** Hover is a light value step and selection is a dark one, so
   * the two states are told apart by **polarity** rather than by amount — a
   * distinction that survives `grayscale(1)` and does not need the two discs
   * side by side to be read. It spends no hue, for `hoverGround`'s own reason:
   * this picture's entire colour budget is the anomaly ramp, and a hue here
   * would compete with a measurement.
   *
   * **It is drawn UNDER the node's body, halo and anomaly ring, never instead
   * of any of them** — selection adds a ground, it re-encodes nothing Story
   * 6.3 draws. Measured at shaping: contrast only improves on every existing
   * treatment against this ground (equity body 3.50 → 4.88:1, `high` ring
   * 1.92 → 8.89:1, `extreme` 3.05 → 5.60:1).
   */
  readonly selectionGround: string;
  /**
   * The focus ring drawn around the node a keyboard reader is on (Task
   * 6.4.3) — `--ink-inverse`, the **light** half of a two-tone ring whose
   * dark half is {@link TopologyPalette.focusRingEdge}.
   *
   * **It was one ink until 2026-11-06 and the paragraph below is why that was
   * wrong** — kept rather than rewritten, because the reasoning was sound and
   * the premise it rests on is the thing that turned out to be false.
   *
   * The canvas's treatment names two, *light ink on the pale ground and
   * `--ink-inverse` on the dark selected ground*, because it was drawn
   * against a model in which a node can be focused without being selected.
   * The shipped keyboard model has no such state: the first arrow key seeds
   * the selection at the centre (Gate 1 — *focus is never a state with
   * nothing in it*) and every subsequent key moves it, so the focused node
   * **is** the selected node, always, and the ring is always drawn inside
   * `selectionGround`'s own dark disc. The second ink would be a value no
   * frame can reach, which is this repository's own rule about a claim with
   * no mechanism behind it; the day a focus position can outlive a
   * selection, it is one field and the measurement is recorded here.
   *
   * **The false premise is _always drawn inside the dark disc_.** The disc is
   * drawn FIRST in the frame and every later pass paints over it, which is
   * Task 6.4.2's own deliberate order — so inside a crowded cluster
   * (`TECHNOLOGY`, ~20 overlapping neighbours each carrying a 1 px
   * `--surface-raised` halo) the neighbours' bodies and halos cover most of
   * the disc, and this ring, drawn last, lands on near-white halo rather than
   * on the dark ground it was measured against. Task 6.4.3 flagged it and
   * routed it as a question of treatment; this story's own closing review
   * re-confirmed it by driving the real app, at **1.01:1** in spots, which is
   * not a question of treatment but a ring nobody can see.
   *
   * Measured against `--surface-inverse` (`#eef0f5` on `#181c23`, the
   * WCAG relative-luminance formula applied directly to the shipped
   * tokens): **14.98:1** — corrected 2026-11-06 at this story's close from
   * an unreproducible **14.6:1** this docblock carried until then. Either
   * figure clears ADR 0026's standing-exception floor by roughly 5×, so
   * nothing about the verdict moved; only the number was wrong, caught by
   * recomputing it rather than re-citing it. It is not the sole encoding
   * either way — the dark ground disc and the readout plate's words both
   * carry the state, and the ring survives `grayscale(1)` on value alone.
   */
  readonly focusRing: string;
  /**
   * The focus ring's **dark** companion stroke, drawn immediately outside the
   * light one — `--ink-primary` (2026-11-06).
   *
   * ## Why a second tone rather than a different one
   *
   * {@link TopologyPalette.focusRing}'s own note has the defect: in a dense
   * cluster the selection disc is largely overpainted by its neighbours, so
   * the ground under this ring is **unknown**. The standing answer to *a mark
   * must be legible against a ground it cannot know* is a mark carrying both
   * tones, so that whichever ground arrives, one half of it contrasts — the
   * same reasoning as the 1 px `halo` every node already carries, and the
   * same reasoning as the platform's own two-tone focus indicators. A single
   * ink cannot be chosen here at all: this picture's grounds run from
   * `--surface-inverse` (#181c23) to `--surface-raised` (#ffffff), which is
   * every value there is.
   *
   * Measured by the WCAG relative-luminance formula over the shipped tokens,
   * against the two grounds that actually occur:
   *
   * | ground                           | `focusRing` (#eef0f5) | `focusRingEdge` (#181c23) |
   * | -------------------------------- | --------------------- | ------------------------- |
   * | `--surface-inverse`, the disc    | **14.98:1**           | 1.00:1                    |
   * | `--surface-raised`, a halo       | 1.14:1                | **17.08:1**               |
   * | `--chart-grid`, an edge          | 1.11:1                | **13.47:1**               |
   * | `--chart-volume`, an equity body | 3.07:1                | **4.88:1**                |
   * | `--anomaly-high`, a band ring    | 1.69:1                | **8.89:1**                |
   *
   * The diagonal is the claim: **on every ground this picture can put under
   * the ring, the better of the two tones clears 4.88:1** — so the ring's own
   * floor is that figure rather than the 1.01:1 the reviewer photographed,
   * and the worst case is the mid-value equity body, which is exactly the
   * ground a single ink of either polarity cannot serve.
   *
   * ## `--ink-primary` rather than a new token, and no hue
   *
   * It is the ink this renderer already draws the fifteen landmark nodes in,
   * and it is byte-identical to `selectionGround`'s `--surface-inverse` — so
   * the dark half of the ring is the same value as the ground the light half
   * was designed against, which is what makes the pair read as one mark
   * rather than as two rings. No hue, for `hoverGround`'s and
   * `anomalyElevated`'s standing reason: this picture's entire colour budget
   * is the anomaly ramp, and the ring survives `grayscale(1)` on value alone
   * — twice over now, in both directions.
   */
  readonly focusRingEdge: string;
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
    anomalyUnscored: tokens["--ink-disabled"],
    anomalyElevated: tokens["--ink-secondary"],
    anomalyHigh: tokens["--anomaly-high"],
    anomalyExtreme: tokens["--anomaly-extreme"],
    hoverGround: tokens["--surface-sunken"],
    selectionGround: tokens["--surface-inverse"],
    focusRing: tokens["--ink-inverse"],
    focusRingEdge: tokens["--ink-primary"],
  };
}
