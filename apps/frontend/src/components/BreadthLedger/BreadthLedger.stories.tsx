import type { Meta, StoryObj } from "@storybook/react-vite";

import type {
  WireMarketBreadth,
  WireMarketOverview,
} from "@marketpulse/shared";

import { marketBreadth } from "../../market/index.js";
import { SAY_NOTHING_ARRIVED_AFTER_MS } from "../MarketProxyStrip/use-waited.js";
import { Region } from "../Region/Region.js";
import { BreadthLedger, BreadthLedgerReservation } from "./BreadthLedger.js";

// The breadth region, in the states the frame can actually produce.
//
// `The breadth ledger.dc.html` §06 and §07. **Derived from what is reachable
// rather than from what is imaginable**: the wire carries a two-member union —
// `observed` with its five-minute window, or `session` with the session date —
// and every state below is built by pushing a real section through the
// **shipped reader**, so a story holds a state the application can reach rather
// than one somebody typed.
//
// **What to review side by side is height.** `Sector performance` sits beside
// this region on the same `fr` row and `Movers` below it on the next, and the
// three share one ratio — so a state a pixel taller than its neighbour moves
// everything under it. Every row, the ladder, the group heading and the
// two-line footer are reserved in every state for exactly that reason, and the
// comparison these stories exist for is that all of them are **one box**.
//
// **The second thing to review is the pair in §06**: `Unchanged 0` and the
// remainder reading `0`. They are told apart by six channels — the group, the
// heading, the band track being present and empty against absent, the origin
// rule stopping above the rule, the weight and the ink — and **not one of them
// is colour**, which is what the greyscale story is for.
//
// **Task 4.4.6 worded the honest states and they are all below.** Three states
// look identical on screen and must read differently — no `breadth` section at
// all (the region's own reserved panel, which is the route's decision and not
// this component's), `measured: 0`, and **no frame ever**, which is the one that
// needs a clock. The fourth thing it added is the N = 1 rule, which is the only
// state where the arithmetic is sound and the picture lies.

const frame = (breadth: WireMarketBreadth): WireMarketOverview => ({
  computedAt: "2026-10-07T18:01:38.000Z",
  feeds: ["iex"],
  figures: [],
  breadth,
});

/** Through the shipped reader, which is the point — see the header. */
const view = (breadth: WireMarketBreadth) => {
  const read = marketBreadth(frame(breadth));
  if (read === undefined)
    throw new Error("the story built an unreadable section");
  return read;
};

/**
 * A live count, mid-session.
 *
 * **Every figure here is an inference and the re-measure is still owed.** Task
 * 4.1.6's band of 446–498 was taken over **518** and nobody may cite it as a
 * figure over 503; `N − 15` is the honest first estimate and it is an inference
 * the instrument never made. Task 4.4.6 could not take the re-measure — it
 * needs a Node client on the deployed gateway sampling through a **regular
 * session**, and the market was shut. Nothing on this component depends on the
 * figures being realistic; what they have to be is internally consistent.
 */
const OBSERVED: WireMarketBreadth = {
  basis: "observed",
  advancing: 284,
  declining: 152,
  unchanged: 15,
  measured: 451,
  tracked: 503,
  windowMinutes: 5,
};

const meta = {
  title: "Market/BreadthLedger",
  component: BreadthLedger,
  parameters: { layout: "padded" },
  args: { view: view(OBSERVED) },
  render: (args) => (
    /*
     * **Every state is drawn inside a `Region`**, which is how it appears on
     * the landing page: the region's frame is what a reader sees the state
     * inside, and a ledger reviewed without its box hides the one thing the box
     * decides, which is whether the content fits.
     *
     * The head's right-hand slot renders **nothing, deliberately**, and the
     * stories show it empty for that reason. `N of 11 ranked` already occupies
     * that slot one region up, and `466 of 503 heard from` here would be a
     * second `N of M` badge 200 px away at a different denominator over a
     * different set — two correct badges that read as one pattern.
     */
    <Region name="Market breadth">
      <BreadthLedger {...args} />
    </Region>
  ),
} satisfies Meta<typeof BreadthLedger>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The ordinary state: a live count inside the five-minute window. */
export const ObservedMidSession: Story = {};

/**
 * **Outside a session — the state the region is in for roughly 80% of the
 * week**, and the common path rather than an edge case.
 *
 * Structurally identical and **two strings differ**: the footer names the
 * session rather than a window, and the trailing row's label is the session
 * grammar's rather than the live one's, because `Not heard from` would be false
 * about a closed market. The denominator is near the whole set, because a
 * close-to-close move needs only a prior close — what falls out is a
 * newly-listed security and one the nightly backfill missed, which is why the
 * row still exists.
 */
export const SessionWithTheMarketShut: Story = {
  args: {
    view: view({
      basis: "session",
      advancing: 206,
      declining: 284,
      unchanged: 11,
      measured: 501,
      tracked: 503,
      session: "2026-10-06",
    }),
  },
};

/**
 * **`Unchanged = 1`: the 2 px floor fires**, which is the one thing on this
 * component only a picture can answer.
 *
 * At 1440 and 390 the band track is ~173 px for ~451 securities, so one
 * security is **0.384 px** — below a device pixel — and a count of 1 draws a
 * band floored at 2 px, in front of the 1 px origin rule running down the same
 * column. Three channels tell them apart: 6 px tall against the rule's full row
 * height, a price ink against the rule's neutral, and in front rather than
 * under. **The count beside it says `1`**, which is why four securities of
 * over-statement is an accepted cost rather than a defect: the count is the
 * claim and the band is the picture of it.
 */
export const TheBandFloorFires: Story = {
  args: {
    view: view({ ...OBSERVED, advancing: 298, unchanged: 1, measured: 451 }),
  },
};

/**
 * **`Unchanged = 0`: a reading of exactly zero, and no band at all.**
 *
 * Review this beside {@link NothingHeardFrom}, which is the pair acceptance
 * criterion 2 is about. The row is present, labelled, counted `0`, **above the
 * rule**, and the origin rule runs through its empty band cell — which is what
 * says this row has a reading and the reading is none. The remainder below the
 * rule has no band track to be empty and no origin rule above it.
 *
 * There is **no anchor tick**, unlike the ranked list: that component needs one
 * because a row with no reading and a row reading `0.00%` sit adjacent in the
 * same list, and breadth has the structural difference instead. A tick here
 * would also be 1 px wide beside a 2 px floored band, which is the one place on
 * this component two marks would be within a pixel of each other.
 */
export const AReadingOfExactlyZero: Story = {
  args: {
    view: view({ ...OBSERVED, advancing: 299, unchanged: 0, measured: 451 }),
  },
};

/**
 * **A perfectly split market — the one value where the caption loses its
 * direction.**
 *
 * 220 advancing, 220 declining, 11 unchanged. The headline's figure, glyph and
 * spoken word all say `unchanged`, and the caption above them reads **`NET`**
 * rather than `NET ADVANCING`, because a caption naming a direction the figure
 * beneath it denies is the one thing in this headline that could be read as a
 * claim.
 *
 * **This state had never been drawn until Task 4.4.8 produced it**, which is
 * the whole argument for walking the producer rather than reasoning about the
 * states: every channel was individually correct, so nothing mechanical could
 * have found it and no existing story showed it. The owner chose the neutral
 * caption at Gate 2 over leaving it and over replacing the figure with a
 * phrase. The accepted cost is that on a live feed the caption itself changes
 * as the net crosses zero; the reversal trigger is the first sighting of it
 * changing more than once in a sitting, and that is the live rehearsal's to
 * report.
 *
 * Review it beside {@link ObservedMidSession}, where the same headline carries
 * `NET ADVANCING` and a signed figure.
 */
export const APerfectlySplitMarket: Story = {
  args: {
    view: view({
      ...OBSERVED,
      advancing: 220,
      declining: 220,
      unchanged: 11,
      measured: 451,
    }),
  },
};

/**
 * **Everything we track was heard from — the remainder reads `0` and the row
 * still renders.**
 *
 * `0` unheard is a strong, true, printable fact, and the ladder's endpoint
 * reads the set's own size because N **is** the set here. The two digits
 * coinciding is the arithmetic rather than a duplication.
 */
export const NothingUnheard: Story = {
  args: {
    view: view({
      ...OBSERVED,
      advancing: 318,
      declining: 170,
      unchanged: 15,
      measured: 503,
    }),
  },
};

/**
 * **N = 0 — nothing heard from at all, and the ledger, the ladder and the
 * headline are all suppressed.**
 *
 * ADR 0029 in the state where it matters most: three rows reading `0 0 0`
 * against a scale whose endpoints are both `0` is a fully-formed partition over
 * zero observations — a false impression rather than a courtesy — and a 0–0
 * scale is undrawable. So their **room is kept** and the quiet group is the only
 * thing with content, carrying the whole truth: the set, and the fact that none
 * of it has been heard from.
 *
 * Reachable rather than theoretical, and **this is CI's permanent state**: the
 * gated store holds 518 securities and zero bars. Mid-session it is an
 * extended-hours or dead-feed reading — the measured five-minute minimum over
 * 518 during a session was 5.
 *
 * The sentence that belongs in the room the suppression holds is Task 4.4.6's.
 */
export const NothingHeardFrom: Story = {
  args: {
    view: view({
      basis: "session",
      advancing: 0,
      declining: 0,
      unchanged: 0,
      measured: 0,
      tracked: 503,
      session: "2026-10-07",
    }),
  },
};

/**
 * **N = 1: the counts stay and the picture goes.**
 *
 * The one state where every figure is right and the drawing is a lie. One
 * security in one bucket is a fraction of `1`, so the band crosses the **whole**
 * track — *the market is entirely advancing* — and that is what a reader takes
 * from a band whatever the count beside it says. So the bands, the origin rule
 * and the printed ladder go together, as one decision with one trigger, and
 * their room is held exactly as it is at N = 0.
 *
 * Review it beside {@link TheBandFloorFires}, which is the **other** small
 * number: a count of 1 inside a scale of 451 is a 2 px band and is honest,
 * because there are 450 other securities on the same track to compare it with.
 *
 * Reachable rather than theoretical — Task 4.1.6 measured a five-minute minimum
 * of 5 during a session, so single figures are an extended-hours or dying-feed
 * reading.
 */
export const OneSecurityHeardFrom: Story = {
  args: {
    view: view({
      ...OBSERVED,
      advancing: 1,
      declining: 0,
      unchanged: 0,
      measured: 1,
    }),
  },
};

/**
 * **The paint before the first frame: the region's geometry, held and
 * invisible.**
 *
 * The real component from `RESERVED_BREADTH`, `visibility: hidden` and
 * `aria-hidden`, so the landing page does not step by the whole of this region
 * a moment after it paints — which at 768 and 390 is what it would do, because
 * the grid row is content-sized there.
 *
 * It looks empty **on purpose**, and what is being reviewed is that the box is
 * the same box as every state above it.
 *
 * **It stops looking empty after two seconds**, which is the story below: the
 * same component, photographed past `useWaited`'s floor. The ordinary load
 * never gets there (first frame measured at 174–277 ms), so this story is the
 * flash and that one is the state a reader actually meets.
 */
export const BeforeTheFirstFrame: Story = {
  render: () => (
    <Region name="Market breadth">
      <BreadthLedgerReservation />
    </Region>
  ),
};

/**
 * **Nothing ever arrived — the same component, two seconds later.**
 *
 * `BreadthLedgerReservation` says nothing for the first 2,000 ms, because for a
 * few hundred milliseconds a sentence would be a promise the next frame breaks.
 * Past the floor it is the **terminal** state — an unreachable aggregate, a
 * half-rolled deploy, a proxy holding the socket open — and a titled region at
 * its full height with nothing in it is `docs/GAPS.md` entry 13 exactly. Task
 * 4.3.8 produced it for `Sector performance`, byte-identical at 600 ms and at
 * 12 s.
 *
 * **The words are breadth's own**: the strip has no *prices*, sectors have no
 * *moves*, breadth has no **count**. Three nouns, one per region, which is also
 * what tells a reader which region went quiet when two do at once.
 *
 * And the sentence sits in room the reservation **already holds** — nothing
 * moves when it appears, which is what is being reviewed here against
 * {@link BeforeTheFirstFrame}.
 */
export const NothingEverArrived: Story = {
  render: () => (
    <Region name="Market breadth">
      <BreadthLedgerReservation />
    </Region>
  ),
  play: async () => {
    // The floor is a real `setTimeout` in a real browser, so the story waits
    // past it rather than faking a clock there is no seam for.
    await new Promise((resolve) => {
      setTimeout(resolve, SAY_NOTHING_ARRIVED_AFTER_MS + 500);
    });
  },
};

/**
 * **`grayscale(1)` — throw the switch and nothing is lost.**
 *
 * The price palette differs by **1.04:1** in greyscale, so hue is the entire
 * difference between the two price inks, and this component re-took the figure
 * at a pair nobody had measured: after `grayscale(1)` the advancing and
 * declining bands are **1.57:1** apart, declining against unchanged is
 * **1.05:1** and advancing against unchanged is **1.50:1**. The three bands are
 * one grey.
 *
 * **That is fine here and fatal to the shape Gate 1 rejected.** The ledger
 * spends 80 px a row on a **word** at `--font-weight-medium`, so direction is
 * carried by the label and the band carries magnitude only. A four-segment
 * partition bar has no word, no fixed track and a **moving** boundary between
 * two greys 1.05:1 apart — so even a fixed segment order does not recover which
 * segment is which. The headline carries direction on three channels at once,
 * all three `PriceChange`'s: the glyph, the sign and the spoken word.
 */
export const InGreyscale: Story = {
  render: (args) => (
    <div style={{ filter: "grayscale(1)" }}>
      <Region name="Market breadth">
        <BreadthLedger {...args} />
      </Region>
    </div>
  ),
};
