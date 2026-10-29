import { mkdir, writeFile } from "node:fs/promises";

import type {
  MarketFeed,
  ReturnMessage,
  WireAbsentClause,
  WireAnomalyOutcome,
  WireFactorClause,
  WireSymbolReturn,
  WireVolumeComparison,
} from "@marketpulse/shared";
import {
  ANOMALY_BAND_FLOORS,
  FACTOR_WEIGHTS,
  MARKET_STREAM_PROTOCOL_VERSION,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";
import { HEALTH_ROUTE_PATTERN } from "../support/pair.js";

// **The amber conjunction, produced and photographed** (Task 5.6.8) — the one
// design question Story 5.6 leaves that **cannot be settled by reading**.
//
// ## The finding this file exists to make visible
//
// Four semantic tokens in `market.css` resolve to **one** palette entry,
// `--palette-amber: #e2b544`:
//
// | token | what it marks | where |
// | --- | --- | --- |
// | `--anomaly-high` | a score in the second band from the top | the chip, in `Abnormal-move indicators` |
// | `--feed-stale` | the market feed has gone quiet | the sticky status bar's feed cell |
// | `--service-degraded` | the backend answered, and badly | the sticky status bar's service cell |
// | `--provenance-synthetic` | **these prices are invented** | the same feed cell |
//
// **The status bar is sticky.** So a drawn `high` chip and an amber chrome
// mark are in the viewport **together**, always — and the three chrome marks
// are in the same bar as each other. How far apart they are at each width is
// measured below rather than quoted.
//
// ## Why no greyscale simulation of the region alone can show it
//
// The chip-against-chrome step is **1.000** for `high`, because it is the same
// colour: `grayscale(1)` is a function of the colour and two identical colours
// are identical under it. The ramp's own internal steps are 1.12 / 1.43 / 1.59
// — **larger than the collision** — so a region photographed on its own looks
// correctly graduated in greyscale while saying the same thing as the chrome
// two cells away. The collision exists **only in the pairing**, which is why
// this is a conjunction row and not a new surface.
//
// ## Whole-viewport, and NOT `fullPage` — which is the opposite of the kept
// ## grid's idiom, on purpose
//
// `overview-degraded-grid.spec.ts` photographs `fullPage` and records that the
// sticky bar then *"draws across the middle of the page"*. That artefact is
// harmless there and is **fatal here**: a full-page capture un-sticks the one
// element whose stickiness is the entire claim, so the chip and the chrome
// mark would be photographed at whatever distance the document happens to put
// them, which is a picture of something else. Every photograph below is a
// **viewport** capture taken after the chip has been scrolled into view, which
// is a reader's own situation.
//
// ## FURNISHED — and the word is here rather than in a task file for a reason
//
// **Every score below is written by this file.** It crosses the shipped
// encoder, the shipped decoder, the real renderer and a real socket route, so
// the *transition* is produced; the *content* is not. On CI the store is 516
// securities with zero bars and `provider=none`, so every member of the
// `return` frame is a refusal **for ever** and no gated run has ever drawn a
// chip. A green flagged run of this file is therefore **not** evidence that the
// collision was examined — only that it is still producible. The examination
// is a person looking at 56 photographs, and `LIVE-REHEARSAL.md` owns that.
//
// What stops a furnished score being a fiction is the decoder:
// `readAnomalyScore` re-adds the published contributions, re-derives each from
// `round(weight × rank / 100)`, requires `Σ weight === max`, and recomputes the
// band from **this bundle's** floors. So the two scores below are arithmetic
// against exported constants rather than numbers that looked plausible — see
// {@link scoreOf}.
//
// ## What this file does NOT decide
//
// **Nothing.** It does not repair the ramp and must not: moving
// `--service-degraded` is one line and no component moves, but which token
// moves — and whether `--provenance-synthetic`, whose amber carries a
// **safety** argument rather than a legibility one, moves **louder** instead
// of quieter — is the owner's call with the photographs in hand.

const EXPLORER = "/securities/NVDA";

/** The one venue value, except on the row that is about a second one. */
const VENUE: MarketFeed = "iex";

const WIDTHS = [1440, 1024, 768, 390] as const;

/**
 * Whether to write the contact sheet as well as the readings.
 *
 * **The readings are the record and the photographs are the illustration**,
 * and only the first can be asserted — nothing at any level can see *two amber
 * marks read as one claim*. So the assertions run on every gated run and the
 * PNGs are produced by a person who is going to look at them:
 *
 * **The count is `STATES.length × WIDTHS.length × 2`**, spelled as arithmetic
 * because the equivalent comment in the kept grid was wrong for two epics:
 * 7 × 4 × 2 = **56**.
 *
 * ```
 * AMBER_CONJUNCTION_PHOTOS=1 pnpm e2e security-amber-conjunction.spec.ts
 * ```
 *
 * They land in `.capture/security-amber-conjunction/`, which is gitignored,
 * beside a `readings-<width>.json` of every mark this run found.
 */
const PHOTOGRAPH = process.env.AMBER_CONJUNCTION_PHOTOS === "1";

const CAPTURE = ".capture/security-amber-conjunction";

// ---------------------------------------------------------------------------
// The frames
// ---------------------------------------------------------------------------

const at = (minutesAgo: number): string =>
  new Date(Date.now() - minutesAgo * 60_000).toISOString();

/**
 * A measured 5-minute return, so the region is at its drawn height rather
 * than at a refusal's.
 *
 * Nothing below asserts these figures — `security-abnormal-move.spec.ts` owns
 * the return and its percentile, against the server's own frame. They are here
 * so the photograph is of the region a reader meets, with the chip in the row
 * it actually sits in.
 */
const MEASURED_RETURN: WireSymbolReturn = {
  measured: true,
  percent: 4.62,
  from: { at: at(6), price: 178.4, feed: VENUE },
  to: { at: at(1), price: 186.64, feed: VENUE },
  observed: 5,
  spanMinutes: 5,
  percentile: {
    ranked: true,
    rank: 99,
    aboveSample: false,
    sampleCount: 4620,
    spanMinutes: 5,
    feed: "sip",
  },
};

/**
 * **The volume factor refuses, which is not a convenience** — it is the state
 * of every machine in this repository and of the deployment until the
 * same-tape `iex` baseline has 132 sessions behind it (Story 5.5). A furnished
 * three-factor score would photograph a screen this product cannot render.
 */
const REFUSED_VOLUME: WireVolumeComparison = {
  measured: false,
  refusal: "no-same-tape-baseline",
  sampleCount: 0,
  observed: 0,
  spanMinutes: 5,
};

/** `round(weight × rank / 100)` — `contributionOf`, which is not exported. */
const contributionOf = (weight: number, rank: number): number =>
  Math.round((weight * rank) / 100);

const ranked = (
  factor: "price" | "excess",
  rank: number,
  sampleCount: number,
): WireFactorClause => ({
  factor,
  weight: FACTOR_WEIGHTS[factor],
  rank,
  aboveSample: false,
  sampleCount,
  contribution: contributionOf(FACTOR_WEIGHTS[factor], rank),
});

/**
 * The volume factor's absence, in the **payload-free** arm.
 *
 * `no-distribution` rather than `refused` on purpose: a `refused` clause
 * carries a sample and a minimum, which would be *a second answer to a
 * question the frame's own `volume` half already answers* — the arm's own
 * docblock — and two numbers for this harness to get quietly wrong.
 */
const noVolumeDistribution = (): WireAbsentClause => ({
  factor: "volume",
  weight: FACTOR_WEIGHTS.volume,
  state: "no-distribution",
});

/**
 * **A two-factor score that lands exactly on a named band floor, by
 * arithmetic against the exported floors rather than by a number that looked
 * right.**
 *
 * The price factor is pinned at `rank: 99` — the ceiling, since `100th` is
 * never printed — so its contribution is `round(40 × 99 / 100) = 40`, and the
 * excess factor's rank is solved for the remainder. Both scores are therefore
 * **the lowest score in their band**, which is the hardest case for the
 * collision: a chip at the bottom of `extreme` is the one most easily mistaken
 * for `high`, and a chip at the bottom of `high` is the one most easily
 * mistaken for the chrome.
 *
 * `readAnomalyScore` recomputes the band from `ANOMALY_BAND_FLOORS` and
 * refuses a frame whose sent band disagrees, so getting this wrong draws the
 * **deferred** state — no ink at all — which looks exactly like a gateway that
 * sent no score. {@link expectedMarks} is what makes that loud rather than
 * silent: a row declaring a chip and finding none fails on the mark set.
 */
function scoreOf(floor: number): WireAnomalyOutcome {
  const price = ranked("price", 99, 4620);
  const remainder = floor - price.contribution;
  // The rank that produces exactly `remainder` points of the excess factor's
  // 35. Solved and then **checked** by re-deriving the contribution, because
  // `round` is not injective and an off-by-one here is a silent empty rail.
  const rank = Math.round((remainder * 100) / FACTOR_WEIGHTS.excess);
  const excess = ranked("excess", rank, 1872);
  if (excess.contribution !== remainder) {
    throw new Error(
      `no excess rank contributes ${String(remainder)} of ` +
        `${String(FACTOR_WEIGHTS.excess)}: rank ${String(rank)} gives ` +
        String(excess.contribution),
    );
  }

  const contributing = [price, excess];
  return {
    scored: true,
    score: floor,
    band: floor >= ANOMALY_BAND_FLOORS.extreme ? "extreme" : "high",
    max: FACTOR_WEIGHTS.price + FACTOR_WEIGHTS.excess,
    contributing,
    absent: [noVolumeDistribution()],
  };
}

const HIGH = scoreOf(ANOMALY_BAND_FLOORS.high);
const EXTREME = scoreOf(ANOMALY_BAND_FLOORS.extreme);

/**
 * **Every factor absent — the control, and this product's state on every
 * machine that exists.**
 *
 * It draws `0 of 3` in **words** and **no chip at all**, which is what makes
 * it the control rather than a fourth chip: the chrome's amber marks are
 * photographed in the same frame with nothing in the rail to pair them with.
 * A reader comparing it with row 01 is looking at the collision and at nothing
 * else.
 */
const UNSCORED: WireAnomalyOutcome = {
  scored: false,
  absent: [
    { factor: "price", weight: FACTOR_WEIGHTS.price, state: "no-distribution" },
    {
      factor: "excess",
      weight: FACTOR_WEIGHTS.excess,
      state: "no-distribution",
    },
    noVolumeDistribution(),
  ],
};

const returnFrame = (score: WireAnomalyOutcome): ReturnMessage => ({
  type: "return",
  version: MARKET_STREAM_PROTOCOL_VERSION,
  sentAt: new Date().toISOString(),
  symbol: "NVDA",
  return: MEASURED_RETURN,
  volume: REFUSED_VOLUME,
  score,
});

// ---------------------------------------------------------------------------
// The instrument: every amber mark on the screen, found by its RESOLVED colour
// ---------------------------------------------------------------------------

/**
 * One drawn amber mark.
 *
 * **Found by its resolved colour rather than by a selector**, which is the one
 * thing that makes this instrument able to find a mark nobody predicted — a
 * class name is a hypothesis and `getComputedStyle` is not. It is also what
 * makes it blind in exactly the ways `amber-appears-once-in-the-rail` is: an
 * image, an SVG `fill` attribute in markup, or a canvas would each escape it,
 * and none exists in this tree.
 */
interface Mark {
  /** Which step of the ramp, by value — `pale`, `amber` or `deep`. */
  readonly step: string;
  /** Which channel carries it: a fill, a border or an inset shadow. */
  readonly channel: string;
  /** `disc`, `square` or `chip` — the silhouette, which is channel two. */
  readonly shape: string;
  /** Where on the screen: a footer cell, the masthead, or a named region. */
  readonly where: string;
  /** The mark's **own** text, which is the whole of the chip/marker divide. */
  readonly text: string;
  /** Whether it is hidden from the accessibility tree. */
  readonly ariaHidden: boolean;
  readonly box: { x: number; y: number; width: number; height: number };
  /** Whether the whole mark is inside the viewport as it currently stands. */
  readonly inViewport: boolean;
}

/** The resolved ramp, read out of the page rather than typed into this file. */
interface Ramp {
  readonly pale: string;
  readonly amber: string;
  readonly deep: string;
}

interface Sweep {
  readonly ramp: Ramp;
  readonly marks: readonly Mark[];
  readonly viewport: { width: number; height: number };
}

/**
 * Walk every element, resolve the ramp off `:root`, and return every mark
 * drawn in one of its three values.
 *
 * `--palette-amber` is read with `getPropertyValue`, which answers the
 * declared text (`#e2b544`); a computed `background-color` answers
 * `rgb(226, 181, 68)`. So the comparison is made by **painting the declared
 * value into a throwaway element and reading it back**, which makes the page's
 * own colour parser the only normaliser and cannot drift from it.
 */
async function sweep(page: Page): Promise<Sweep> {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement("div");
    probe.style.display = "none";
    document.body.append(probe);
    const normalise = (declared: string): string => {
      probe.style.backgroundColor = "";
      probe.style.backgroundColor = declared.trim();
      return getComputedStyle(probe).backgroundColor;
    };

    const ramp = {
      pale: normalise(root.getPropertyValue("--palette-amber-pale")),
      amber: normalise(root.getPropertyValue("--palette-amber")),
      deep: normalise(root.getPropertyValue("--palette-amber-deep")),
    };
    probe.remove();

    const stepOf = (colour: string): string | null => {
      for (const [name, value] of Object.entries(ramp)) {
        if (value === colour && value !== "") return name;
      }
      return null;
    };

    const footer = document.querySelector("footer");
    const cells = footer === null ? [] : [...footer.children];
    const cellOf = (element: Element): string | null => {
      const cell = cells.find((candidate) => candidate.contains(element));
      if (cell === undefined) return null;
      const head = cell.textContent.replace(/\s+/gu, " ").trim();
      if (head.startsWith("Market feed")) return "status bar · feed cell";
      if (head.startsWith("Backend service"))
        return "status bar · service cell";
      return "status bar";
    };

    /**
     * **A `<section>` with an accessible name, not `[role="region"]`.**
     *
     * The first draft looked for the attribute and reported the chip as
     * `elsewhere`, because `Region` renders a bare `<section aria-label>` and
     * the role is **implicit** — `getByRole("region")` matches it and a CSS
     * attribute selector cannot. The failure was loud rather than silent only
     * because the declared mark set names the region; a `where` that fell back
     * to a coordinate would have made the row pass with the chip filed under
     * nothing.
     */
    const regionOf = (element: Element): string | null => {
      const region = element.closest(
        '[role="region"], section[aria-label], section[aria-labelledby]',
      );
      if (region === null) return null;
      const labelledBy = region.getAttribute("aria-labelledby");
      const named =
        labelledBy === null
          ? null
          : (document.getElementById(labelledBy)?.textContent.trim() ?? null);
      const label = region.getAttribute("aria-label") ?? named;
      return `region · ${label ?? "(unnamed)"}`;
    };

    const whereOf = (element: Element): string =>
      cellOf(element) ??
      regionOf(element) ??
      (element.closest("header") === null ? "elsewhere" : "masthead");

    const shapeOf = (element: Element, style: CSSStyleDeclaration): string => {
      const text = element.textContent.trim();
      if (text !== "") return "chip (encloses its own name)";
      return style.borderTopLeftRadius.includes("%") ? "disc" : "square";
    };

    const marks: {
      step: string;
      channel: string;
      shape: string;
      where: string;
      text: string;
      ariaHidden: boolean;
      box: { x: number; y: number; width: number; height: number };
      inViewport: boolean;
    }[] = [];

    for (const element of document.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      // Three channels, because a repair that moved the ramp onto a border or
      // an inset shadow would be invisible to a fill-only sweep — and the
      // marker language already uses all three for its grey states.
      const channels: readonly (readonly [string, string])[] = [
        ["fill", style.backgroundColor],
        ["border", style.borderTopColor],
      ];

      let found: readonly [string, string] | undefined;
      for (const [channel, colour] of channels) {
        const step = stepOf(colour);
        if (step !== null) {
          found = [channel, step];
          break;
        }
      }
      if (found === undefined) {
        // `box-shadow` resolves to a string with the colour in it, which is
        // how the hollow silhouette carries its ink.
        for (const [name, value] of Object.entries(ramp)) {
          if (value !== "" && style.boxShadow.includes(value)) {
            found = ["inset shadow", name];
            break;
          }
        }
      }
      if (found === undefined) continue;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (style.visibility === "hidden" || style.display === "none") continue;

      marks.push({
        step: found[1],
        channel: found[0],
        shape: shapeOf(element, style),
        where: whereOf(element),
        text: element.textContent.replace(/\s+/gu, " ").trim(),
        ariaHidden: element.closest('[aria-hidden="true"]') !== null,
        box: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        inViewport:
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth,
      });
    }

    return {
      ramp,
      marks,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
}

/** One mark as a declarable string — the key the declared set is compared on. */
const labelOf = (mark: Mark): string =>
  `${mark.step} ${mark.channel} ${mark.shape} @ ${mark.where}`;

const labelsOf = (marks: readonly Mark[]): readonly string[] =>
  [...marks].map(labelOf).sort();

// ---------------------------------------------------------------------------
// The greyscale arithmetic, with the document's own figures as the calibrator
// ---------------------------------------------------------------------------

const channelsOf = (rgb: string): readonly number[] => {
  const parts = /^rgba?\(([^)]+)\)$/u.exec(rgb);
  if (parts === null) throw new Error(`not an rgb() value: ${rgb}`);
  return (parts[1] ?? "")
    .split(/[\s,/]+/u)
    .slice(0, 3)
    .map((part) => Number(part) / 255);
};

/**
 * **A colour's luminance after `grayscale(1)`, which is also its WCAG
 * relative luminance** — and the identity is the point rather than a shortcut.
 *
 * An SVG `feColorMatrix` saturate operates in **linearRGB**, so the grey it
 * produces has linear value `0.2126·R + 0.7152·G + 0.0722·B` over the
 * *linearised* channels — which is the definition of relative luminance. A
 * grey's relative luminance is that same value, so the greyscale contrast
 * between two colours equals their ordinary contrast ratio.
 *
 * **It is calibrated rather than asserted.** `market.css` records the ramp's
 * three internal steps as 1.12 / 1.43 / 1.59 from a measurement nobody here
 * re-ran, and this method reproduces them to the printed precision — see
 * {@link EXPECTED_RAMP_STEPS}. The sRGB-space alternative (the CSS shorthand
 * filter's nominal space) gives 1.13 / 1.49 / 1.65 and does **not**, so the
 * figures below are in this repository's own established unit rather than in a
 * second one that would silently disagree with every amber figure already
 * recorded.
 */
const luminanceOf = (rgb: string): number => {
  const [r = 0, g = 0, b = 0] = channelsOf(rgb).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const stepBetween = (one: string, two: string): number => {
  const a = luminanceOf(one);
  const b = luminanceOf(two);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/**
 * **The calibrator.** `market.css`' own figures for the ramp's three internal
 * steps, to the precision it prints them at. An instrument that cannot
 * reproduce a number the document already records is measuring something else,
 * and every figure this file prints would be in an unknown unit.
 */
const EXPECTED_RAMP_STEPS = {
  "normal → elevated": 1.12,
  "elevated → high": 1.43,
  "high → extreme": 1.59,
} as const;

// ---------------------------------------------------------------------------
// The states
// ---------------------------------------------------------------------------

interface State {
  readonly id: string;
  /** What a reader is meant to be looking at in this photograph. */
  readonly subject: string;
  /**
   * **The amber marks this row must draw, declared rather than counted**, and
   * the assertion is set equality in **both** directions — the kept grid's own
   * rule applied to marks instead of to strings.
   *
   * A row that finds a mark it did not declare is an amber that has appeared
   * somewhere nobody looked; a row that declares one and finds none has had
   * its frame silently refused, which draws the deferred state and reads
   * exactly like a correct absence. The second direction is the one that
   * matters here: a furnished score is one rounding away from furnishing
   * nothing.
   *
   * **If the owner's decision moves a token off `--palette-amber`, this is
   * where it is recorded, and this spec goes red until it is updated.** That
   * is the kept-grid contract rather than friction: a documented collision
   * that has silently stopped holding must not stay green.
   */
  readonly marks: readonly string[];
  readonly drive: (page: Page, width: number) => Promise<void>;
}

/**
 * Scroll the chip's region into view, which is where a reader puts it.
 *
 * **`band` is REQUIRED for every state that serves a score, and that is the
 * repair for a race this spec shipped with** (2026-10-29). The first version
 * waited only for the region to be **visible** — but the region is visible
 * before its score arrives, because the score rides a frame the harness sends
 * **after** navigation. So the mark sweep could run against a rail still
 * drawing its deferred state, and the failure's shape is the one this spec's
 * own error text predicts: *a mark declared and not found is most likely a
 * REFUSED frame drawing the deferred state, which looks exactly like a correct
 * absence.*
 *
 * It went red on `main` at **390 only** — the width where the rail is last in
 * the column and therefore last to lay out — while passing on the pull request
 * and on a developer's machine, which is the signature of a race rather than a
 * defect. **Waiting for the band word is the condition the sleep below was
 * standing in for**, and a condition cannot be outrun by a slow runner.
 */
async function reveal(page: Page, band?: string): Promise<void> {
  const region = page.getByRole("region", {
    name: "Abnormal-move indicators",
  });
  await expect(region).toBeVisible();

  // **The chip itself, not the region that will hold it.** A state serving a
  // score is not ready to be photographed until its band word is on screen;
  // the control serves none and passes `undefined` deliberately.
  if (band !== undefined) {
    await expect(region.getByText(band, { exact: false })).toBeVisible();
  }

  await region.scrollIntoViewIfNeeded();
  // The sticky bar republishes its own height when the feed cell grows to a
  // second row, and the page's `scroll-padding-bottom` follows it — so the
  // scroll has to settle before a box is worth reading. **This one is a
  // LAYOUT settle rather than a data wait**, which is why it survives the
  // repair above: there is no condition to wait for, only a reflow.
  await page.waitForTimeout(300);
}

/** The band word a served score will draw, or `undefined` for the control. */
const bandOf = (score: WireAnomalyOutcome): string | undefined =>
  score.scored ? score.band : undefined;

const CHIP = (band: string) =>
  `${band === "extreme" ? "deep" : "amber"} fill chip (encloses its own name) @ region · Abnormal-move indicators`;

const FEED_STALE = "amber fill disc @ status bar · feed cell";
const SERVICE_DEGRADED = "amber fill square @ status bar · service cell";
const PROVENANCE_SYNTHETIC = "amber fill square @ status bar · feed cell";

/**
 * **One observation, and it is what keeps the feed cell OUT of this picture
 * when the row is not about it.**
 *
 * Produced rather than reasoned, by this file's first run: `feedStatusFrom`
 * returns `stale` the moment `lastObservationAt` is undefined and the market is
 * open, so a `serveFeed` with no snapshot draws **an amber disc in the feed
 * cell on arrival** — a correct state (a connected socket that has delivered no
 * bar during the session) and the wrong one for a row meant to isolate the
 * backend's square. Three rows were accidentally inside the conjunction they
 * were written to be the comparison for, and the declared mark set is the only
 * thing that saw it.
 */
/**
 * **A FUNCTION, not a constant, and that is the repair for a defect this spec
 * shipped with** (2026-10-29).
 *
 * It was `const LIVE_PRICE = { … startsAt: Date.now() - 5_000 … }`, evaluated
 * **once at module load**. By the time row 06 ran — the sixth of seven states,
 * minutes into the suite — that *"five seconds ago"* observation was minutes
 * old, so `feedStatusFrom` read the feed as **stale** and drew an amber disc
 * beside the synthetic square. The row then found THREE amber marks where it
 * declared two, and the sweep failed with an **extra** mark rather than a
 * missing one.
 *
 * It is the same shape as the `serveFeed` defect this spec already records —
 * *a row written to isolate one mark, silently inside the conjunction it was
 * the control for* — arriving through **time** rather than through a missing
 * snapshot, and only on a runner slow enough for the clock to matter.
 *
 * **Evaluated at serve time**, the observation is always five seconds old when
 * the gateway sends it, whatever the suite has been doing.
 */
const livePrice = () => ({
  NVDA: {
    startsAt: new Date(Date.now() - 5_000).toISOString(),
    open: 186.1,
    high: 186.8,
    low: 185.9,
    close: 186.64,
    volume: 412_000,
  },
});

/** Serve a frame, open the page, and make the feed say it has gone quiet. */
const withStaleFeed =
  (score: WireAnomalyOutcome, feed: MarketFeed = VENUE) =>
  async (page: Page): Promise<void> => {
    const produced = await serveFeed(page, {
      feed,
      snapshot: livePrice(),
      symbolReturn: returnFrame(score),
    });
    await page.goto(EXPLORER, { waitUntil: "domcontentloaded" });
    await expect(page.locator("footer").first()).toContainText(/live/iu);

    // **A frame the gateway really sends** rather than a status somebody set —
    // `serveFeed`'s own rule: the browser takes the worse of its own reading
    // and the server's, so a component with `status` poked into it would
    // assert nothing about the path a real outage travels.
    produced.goStale();
    await expect(page.locator("footer").first()).toContainText(/stale/iu);
    await reveal(page, bandOf(score));
  };

/** Serve a frame, and make the backend answer badly. */
const withDegradedBackend =
  (score: WireAnomalyOutcome, alsoStale: boolean) =>
  async (page: Page): Promise<void> => {
    // A 200 that is not this service — `backend-failure-states.spec.ts`'
    // `not-ok-status` sibling, and the realistic producer is a misconfigured
    // API base pointed at the frontend's own static host.
    await page.route(HEALTH_ROUTE_PATTERN, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><html><body>a static host</body></html>",
      }),
    );

    const produced = await serveFeed(page, {
      feed: VENUE,
      // **See `livePrice`.** Without it the feed cell is amber too and this
      // row stops being the one-mark comparison it is declared as.
      snapshot: livePrice(),
      symbolReturn: returnFrame(score),
    });
    await page.goto(EXPLORER, { waitUntil: "domcontentloaded" });
    await expect(page.locator("footer").first()).toContainText(/degraded/iu);

    if (alsoStale) {
      produced.goStale();
      await expect(page.locator("footer").first()).toContainText(/stale/iu);
    }
    await reveal(page, bandOf(score));
  };

const STATES: readonly State[] = [
  {
    id: "01-high-chip-feed-stale",
    subject:
      "The chip and the feed mark are the SAME colour. Two claims about " +
      "two unrelated facts, in one hue, on one screen.",
    marks: [CHIP("high"), FEED_STALE],
    drive: withStaleFeed(HIGH),
  },
  {
    id: "02-extreme-chip-feed-stale",
    subject:
      "The chip is one ramp step darker and the feed mark has not moved. " +
      "The step is 1.59 and the collision has become a near-miss, which is " +
      "the harder reading rather than the easier one.",
    marks: [CHIP("extreme"), FEED_STALE],
    drive: withStaleFeed(EXTREME),
  },
  {
    id: "03-high-chip-backend-degraded",
    subject:
      "The same collision in the other corner, and the chrome mark is a " +
      "SQUARE — the one channel market.css already claims separates this " +
      "pair. Whether 8px of silhouette does that at 700px of separation is " +
      "the question.",
    marks: [CHIP("high"), SERVICE_DEGRADED],
    drive: withDegradedBackend(HIGH, false),
  },
  {
    id: "04-extreme-chip-backend-degraded",
    subject:
      "Row 03 one ramp step darker, for row 02's reason: the near-miss is " +
      "the reading a graduated ramp is most likely to be misread by.",
    marks: [CHIP("extreme"), SERVICE_DEGRADED],
    drive: withDegradedBackend(EXTREME, false),
  },
  {
    id: "05-high-chip-stale-and-degraded",
    subject:
      "THREE amber marks, in both corners of the status bar and in the " +
      "rail. The bar is at its tallest here — the feed cell carries two " +
      "sentences — so this is the row where the chrome is loudest.",
    marks: [CHIP("high"), FEED_STALE, SERVICE_DEGRADED],
    drive: withDegradedBackend(HIGH, true),
  },
  {
    id: "06-high-chip-synthetic-venue",
    subject:
      "The row with a SAFETY argument on the other side. The amber here is " +
      "`--provenance-synthetic` — invented prices advertising themselves — " +
      "and market.css records that it stays or moves LOUDER, never quieter. " +
      "Two amber squares in one cell plus the chip, and the feed is LIVE.",
    marks: [CHIP("high"), PROVENANCE_SYNTHETIC],
    drive: async (page) => {
      await serveFeed(page, {
        feed: "synthetic",
        // **See `livePrice`.** This row is about the provenance square, so
        // the connection must be LIVE — and without an observation it is not.
        snapshot: livePrice(),
        symbolReturn: returnFrame(HIGH),
      });
      await page.goto(EXPLORER, { waitUntil: "domcontentloaded" });
      await expect(page.locator("footer").first()).toContainText(
        "Generated test data",
      );
      await reveal(page, bandOf(HIGH));
    },
  },
  {
    id: "07-control-no-chip-stale-and-degraded",
    subject:
      "The CONTROL: row 05 with every factor absent, so the rail draws " +
      "`0 of 3` in words and no chip at all. The two chrome marks are in " +
      "the same frame with nothing to pair them with, which is what makes " +
      "rows 01 and 05 readable as a pairing rather than as a palette.",
    marks: [FEED_STALE, SERVICE_DEGRADED],
    drive: withDegradedBackend(UNSCORED, true),
  },
];

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

interface Row {
  readonly state: State;
  readonly sweep: Sweep;
  readonly spread: string;
}

/**
 * The widest centre-to-centre separation between any two marks on the screen,
 * which is the figure the claim *always co-visible* is worth measuring at.
 */
function spreadOf(marks: readonly Mark[]): string {
  if (marks.length < 2) return "one mark; no pairing";
  let widest = { gap: -1, pair: "" };
  for (let a = 0; a < marks.length; a += 1) {
    for (let b = a + 1; b < marks.length; b += 1) {
      const one = marks[a];
      const two = marks[b];
      if (one === undefined || two === undefined) continue;
      const dx =
        one.box.x + one.box.width / 2 - (two.box.x + two.box.width / 2);
      const dy =
        one.box.y + one.box.height / 2 - (two.box.y + two.box.height / 2);
      const gap = Math.round(Math.hypot(dx, dy));
      if (gap > widest.gap) {
        widest = {
          gap,
          pair: `${labelOf(one)}  ↔  ${labelOf(two)}`,
        };
      }
    }
  }
  return `${String(widest.gap)} px between ${widest.pair}`;
}

async function photograph(page: Page, name: string): Promise<void> {
  await mkdir(CAPTURE, { recursive: true });

  // **The VIEWPORT and never `fullPage`** — see the header. A full-page
  // capture un-sticks the status bar, and the bar's stickiness is the whole
  // claim.
  await page.screenshot({ path: `${CAPTURE}/${name}.png` });

  await page.addStyleTag({
    content: `html { filter: grayscale(1) !important }`,
  });
  await page.screenshot({ path: `${CAPTURE}/${name}-grey.png` });

  await page.evaluate(() => {
    for (const tag of document.querySelectorAll("style")) {
      if (tag.textContent.includes("grayscale(1)")) tag.remove();
    }
  });
}

for (const width of WIDTHS) {
  test.describe(`the amber conjunction at ${String(width)}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 780 : 900 } });

    test(`every amber mark, every state, and the measured steps`, async ({
      context,
    }) => {
      test.slow();
      const rows: Row[] = [];

      for (const state of STATES) {
        // **Every state gets its own page.** A `page.route` one state installs
        // would otherwise answer the next — which is how a degraded backend
        // becomes a finding about a state that never had one.
        const page = await context.newPage();
        try {
          await state.drive(page, width);

          // **No state here is a crash**, which is the claim every degraded
          // picture is only worth anything under.
          await expectNothingFailedToRender(page);

          const found = await sweep(page);

          expect(
            labelsOf(found.marks),
            `${state.id} at ${String(width)}: the amber marks on screen are ` +
              `not the declared set. A mark found and not declared is an ` +
              `amber somewhere nobody looked; a mark declared and not found ` +
              `is most likely a REFUSED frame drawing the deferred state, ` +
              `which looks exactly like a correct absence. If a token has ` +
              `been moved off --palette-amber deliberately, this declaration ` +
              `is what records it and must move in the same change.`,
          ).toEqual([...state.marks].sort());

          // **The co-visibility, measured rather than quoted.** This is the
          // claim the whole file rests on: the status bar is sticky, so the
          // chip and the chrome mark are in the viewport TOGETHER and a
          // reader cannot consult one without the other being on screen.
          for (const mark of found.marks) {
            expect(
              mark.inViewport,
              `${state.id} at ${String(width)}: ${labelOf(mark)} is not ` +
                `wholly inside the viewport, so this row is not a picture ` +
                `of a conjunction`,
            ).toBe(true);
          }

          rows.push({
            state,
            sweep: found,
            spread: spreadOf(found.marks),
          });

          if (PHOTOGRAPH) {
            await photograph(page, `${state.id}-${String(width)}`);
          }
        } finally {
          await page.close();
        }
      }

      const ramp = rows[0]?.sweep.ramp;
      expect(ramp, "no row resolved the ramp").toBeDefined();
      if (ramp === undefined) return;

      // **The calibrator, first, because every figure below is in its unit.**
      // An instrument that cannot reproduce `market.css`' own three steps is
      // measuring something else.
      const neutral = await (async () => {
        const page = await context.newPage();
        try {
          await page.goto(EXPLORER, { waitUntil: "domcontentloaded" });
          return await page.evaluate(() => {
            const probe = document.createElement("div");
            probe.style.backgroundColor = getComputedStyle(
              document.documentElement,
            )
              .getPropertyValue("--palette-neutral-pale")
              .trim();
            document.body.append(probe);
            const read = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return read;
          });
        } finally {
          await page.close();
        }
      })();

      const measuredRampSteps = {
        "normal → elevated": stepBetween(neutral, ramp.pale),
        "elevated → high": stepBetween(ramp.pale, ramp.amber),
        "high → extreme": stepBetween(ramp.amber, ramp.deep),
      };
      for (const [name, expected] of Object.entries(EXPECTED_RAMP_STEPS)) {
        expect(
          measuredRampSteps[name as keyof typeof EXPECTED_RAMP_STEPS],
          `the greyscale method does not reproduce market.css' own ` +
            `${name} step of ${String(expected)} — every figure this file ` +
            `prints would be in an unknown unit`,
        ).toBeCloseTo(expected, 2);
      }

      // **The collision itself, as a figure.** `high` against the chrome is
      // the same colour, so the step is exactly 1; `extreme` against it is one
      // ramp step. Printed rather than asserted — the decision is the owner's
      // and this file produces the evidence for it.
      const collisions = {
        "chip high → chrome amber": stepBetween(ramp.amber, ramp.amber),
        "chip extreme → chrome amber": stepBetween(ramp.deep, ramp.amber),
        "chip elevated → chrome amber": stepBetween(ramp.pale, ramp.amber),
      };

      console.log(
        renderGrid(rows, width, ramp, measuredRampSteps, collisions, neutral),
      );

      if (PHOTOGRAPH) {
        await mkdir(CAPTURE, { recursive: true });
        await writeFile(
          `${CAPTURE}/readings-${String(width)}.json`,
          `${JSON.stringify(
            {
              width,
              ramp,
              neutral,
              measuredRampSteps,
              collisions,
              rows: rows.map((row) => ({
                id: row.state.id,
                subject: row.state.subject,
                spread: row.spread,
                viewport: row.sweep.viewport,
                marks: row.sweep.marks,
              })),
            },
            null,
            1,
          )}\n`,
          "utf8",
        );
      }
    });
  });
}

function renderGrid(
  rows: readonly Row[],
  width: number,
  ramp: Ramp,
  rampSteps: Readonly<Record<string, number>>,
  collisions: Readonly<Record<string, number>>,
  neutral: string,
): string {
  const lines: string[] = [
    `# The amber conjunction at ${String(width)} — FURNISHED`,
    "",
    "Every score below was written by this spec. The transition is produced;",
    "the content is not. On CI every member of the `return` frame is a refusal",
    "for ever, so a green run of this file is NOT evidence the collision was",
    "examined — only that it is still producible.",
    "",
    "## The resolved ramp, read out of the page",
    `    --palette-neutral-pale : ${neutral}`,
    `    --palette-amber-pale   : ${ramp.pale}`,
    `    --palette-amber        : ${ramp.amber}   <- FOUR semantic tokens`,
    `    --palette-amber-deep   : ${ramp.deep}`,
    "",
    "## Greyscale steps (WCAG relative-luminance contrast; see `luminanceOf`)",
    "",
    "    The ramp's own internal steps — the calibrator, against market.css:",
  ];
  for (const [name, value] of Object.entries(rampSteps)) {
    lines.push(`      ${name.padEnd(20)}: ${value.toFixed(3)}`);
  }
  lines.push("", "    The chip against the chrome mark it sits beside:");
  for (const [name, value] of Object.entries(collisions)) {
    lines.push(`      ${name.padEnd(28)}: ${value.toFixed(3)}`);
  }
  lines.push("");

  for (const row of rows) {
    lines.push(`## ${row.state.id}`);
    lines.push(`    subject : ${row.state.subject}`);
    lines.push(`    spread  : ${row.spread}`);
    for (const mark of row.sweep.marks) {
      lines.push(
        `    mark    : ${labelOf(mark)}` +
          `  box ${String(mark.box.width)}x${String(mark.box.height)}` +
          ` at (${String(mark.box.x)}, ${String(mark.box.y)})` +
          `  aria-hidden=${String(mark.ariaHidden)}` +
          (mark.text === "" ? "  (no text of its own)" : `  "${mark.text}"`),
      );
    }
    lines.push("");
  }

  lines.push(
    "## What separates the two marks, other than hue",
    "  - SIZE: the chip reserves `min-width: 6rem` and the chrome markers are",
    "    `--space-8` square. Read the boxes above.",
    "  - ENCLOSURE: the chip contains its own band name and the markers",
    "    contain nothing — they are `aria-hidden` silhouettes beside a word",
    "    that is a sibling, not a child.",
    "  - SHAPE: the service and provenance marks are squares and the stale",
    "    feed mark is a disc. The disc is the same silhouette `live` uses, so",
    "    within the feed cell the stale/live pair is separated by HUE and by",
    "    the written word alone.",
    "  - POSITION: the chrome marks are in a sticky bar at the foot of the",
    "    viewport and the chip is in the rail. The spread is measured above.",
  );

  return lines.join("\n");
}
