import type { Meta, StoryObj } from "@storybook/react-vite";

import type {
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import type { MarketFeedView } from "../../use-market-feed.js";
import gridStyles from "../stories.module.css";
import { OverviewSourceNote } from "./OverviewSourceNote.js";

// Every shape of the landing screen's source note at once.
//
// **The review this grid exists for is a subtraction rather than an
// addition**: put the masthead, the status bar and this on one screenshot and
// check that no fact appears twice. `PROVENANCE.md` §1.3's rule is the
// acceptance test — *the note states what the chrome cannot, and never repeats
// what the chrome can* — and it is what keeps this at two lines rather than
// five while three more stories land regions above it.
//
// **The interesting state cannot be produced by any local server and is not a
// stitch.** It is a session running: every live figure is IEX, every
// denominator is the consolidated tape, and the note is the only surface in the
// product that can say both. A developer's machine with no provider renders the
// state at the bottom of this grid — one clause about closes, and nothing about
// a feed — which is also what CI renders and what the 2026-09-26 probe
// photographed.

const at = (time: string): string => `2026-09-25T${time}:00.000Z`;

const observed = (
  symbol: string,
  price: number,
  changePercent?: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: at("18:01"),
  price,
  ...(changePercent === undefined
    ? {}
    : { changePercent, changeBasis: "2026-09-24" }),
});

const stored = (symbol: string, close: number): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-09-11",
  close,
});

const frame = (
  figures: readonly WireOverviewFigure[],
  feeds: readonly ("iex" | "sip" | "replay" | "synthetic")[],
): WireMarketOverview => ({ computedAt: at("18:01"), feeds, figures });

/** A session running on the free plan: IEX figures, consolidated denominators. */
const SESSION = frame(
  [
    observed("SPY", 774.03, 0.42),
    observed("QQQ", 601.88, 0.71),
    observed("DIA", 452.17, -0.18),
    observed("IWM", 243.6, 0),
  ],
  ["iex"],
);

/** What a developer's machine and CI both render: four stored closes. */
const CLOSES = frame(
  [
    stored("SPY", 764.29),
    stored("QQQ", 714.88),
    stored("DIA", 525.79),
    stored("IWM", 288.89),
  ],
  [],
);

const NOT_CONFIGURED: MarketFeedView = { state: "not-configured" };

const meta = {
  title: "Market/OverviewSourceNote",
  component: OverviewSourceNote,
  parameters: { layout: "padded" },
  args: { overview: SESSION, feed: NOT_CONFIGURED },
} satisfies Meta<typeof OverviewSourceNote>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * **The state invariant 6 exists for, and the first surface in this product
 * that can state it.**
 *
 * Both tapes, named separately, because they are two subjects rather than two
 * facts about one: the figures are one venue's and the denominators are the
 * whole consolidated tape. A single `Source` row could only name one of them,
 * and `WireMarketOverview.feeds` deliberately carries only the first —
 * naming a stored close's tape on the wire would be invariant 6 implied rather
 * than displayed.
 *
 * What it does **not** say is which tape a particular tile is showing. That
 * varies per figure and per minute, and the tiles carry it.
 */
export const ASessionRunning: Story = {
  args: { feed: { state: "configured", feed: "iex" } },
};

/**
 * The same session on a deployment that has not answered yet.
 *
 * Identical, and that is the rule rather than a coincidence: **suppression
 * requires a positive match.** The chrome goes quiet only while it is naming
 * *this* feed correctly, so everything else — no provider, an unreadable
 * answer, a different feed — leaves the note speaking.
 */
export const TheChromeClaimsNothing: Story = {};

/**
 * The chrome is naming this exact feed, correctly — so the note stops naming
 * it.
 *
 * The only state in the grid where the live clause is absent while live figures
 * are on screen, and it is §1.3's whole mechanism: a fact appearing twice on
 * one screen teaches a reader that the small type is not worth reading. The
 * closes clause stays, because the chrome can never state it.
 */
export const TheChromeAlreadySaysIt: Story = {
  args: {
    overview: frame(
      [observed("SPY", 774.03, 0.42), observed("QQQ", 601.88, 0.71)],
      ["sip"],
    ),
    feed: { state: "configured", feed: "sip" },
  },
};

/**
 * Live figures with nothing to measure from — a store holding no closes.
 *
 * **The sentence goes and the clause stays**, which is ADR 0029's per-clause
 * rule applied inside a clause: no percentage is on screen, so a sentence
 * saying how percentages were measured would be a claim about numbers a reader
 * cannot see. `All US exchanges` is absent entirely here, because nothing on
 * the screen rests on a stored close.
 */
export const LiveFiguresWithNoDenominator: Story = {
  args: {
    overview: frame(
      [observed("SPY", 774.03), observed("QQQ", 601.88)],
      ["iex"],
    ),
    feed: { state: "configured", feed: "iex" },
  },
};

/**
 * **What a developer's machine renders, and what CI renders** — four stored
 * closes and no provider.
 *
 * The state the note says the least in, and the one it is most important to get
 * right: there is no live figure, so there is no feed to name and the clause is
 * absent rather than hedged. What is left is true of every figure above it.
 */
export const StoredClosesOnly: Story = {
  args: { overview: CLOSES },
};

/**
 * Two tapes among the **observed** figures — a state no deployment this
 * product runs can produce today.
 *
 * It is here because the frame's type is a list and a renderer that flattened
 * it would name whichever came first and be wrong about the rest. The day a
 * replay or a second venue puts two in there, this is what a reader gets.
 */
export const TwoObservedTapes: Story = {
  args: {
    overview: frame(
      [observed("SPY", 774.03, 0.42), observed("QQQ", 601.88, 0.71)],
      ["sip", "iex"],
    ),
    feed: { state: "configured", feed: "iex" },
  },
};

/**
 * **First paint: no frame, no note.** Not an empty box with a hairline over
 * it — a claim about data requires data, and there is no data.
 *
 * It should be rare and short: the gateway sends an overview on connect,
 * unscoped, so a browser has one before it has subscribed to anything.
 */
export const NoFrame: Story = {
  args: { overview: undefined },
};

/**
 * Every state in one column, which is how the footnote pile gets caught.
 *
 * The thing to review here is **how much each state says**, read downward: the
 * note grows a clause when the screen grows a fact and never otherwise, and no
 * two states below say the same thing in different words.
 */
export const EveryState: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className={gridStyles.stack}>
      {(
        [
          [
            "A session running, chrome naming IEX",
            SESSION,
            { state: "configured", feed: "iex" },
          ],
          ["A session running, chrome silent", SESSION, NOT_CONFIGURED],
          ["Stored closes only, no provider", CLOSES, NOT_CONFIGURED],
          ["No frame yet", undefined, NOT_CONFIGURED],
        ] as const
      ).map(([label, overview, feed]) => (
        <div className={gridStyles.stackItem} key={label}>
          <p className={gridStyles.label}>{label}</p>
          <OverviewSourceNote overview={overview} feed={feed} />
        </div>
      ))}
    </div>
  ),
};
