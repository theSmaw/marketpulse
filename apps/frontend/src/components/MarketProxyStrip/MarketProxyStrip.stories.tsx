import type { Meta, StoryObj } from "@storybook/react-vite";

import type {
  Bar,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import gridStyles from "../stories.module.css";
import { MarketProxyStrip } from "./MarketProxyStrip.js";

// Nine states, one box, and nothing jumps between any two of them.
//
// `Market proxies.dc.html` §04 is the drawing and this is the grid it asks for.
// Two rules govern the whole set. **ADR 0029**: a surface that owns nothing
// defers, points once and never says nothing — and a clause renders only when
// its own data is present, so a fully-formed qualifier about zero figures is a
// false impression rather than a courtesy. **Story 3.10's one-home rule**:
// `live | stale | disconnected` has exactly one home and it is the status bar.
// Seven of the nine below are therefore states of the *data*, and the strip
// says nothing about the feed in any of them — including the two Task 4.2.6
// added, which are about the **calendar** and the **store** rather than about
// whether anything is arriving.
//
// The thing to review side by side here is **height**. `.regions` begins
// immediately below this strip in a flex column on the landing page, so every
// state that is a pixel taller than its neighbour moves the entire seven-region
// grid. A permutation grid is the only place that is visible at a glance — and
// the browser is the only place it can be measured at all, which Task 4.2.5
// does with `pnpm probe`.

const at = (time: string): string => `2026-09-25T${time}:00.000Z`;

const observed = (
  symbol: string,
  price: number,
  changePercent: number,
  time = "18:01",
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: at(time),
  price,
  changePercent,
  changeBasis: "2026-09-24",
});

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

const frame = (figures: readonly WireOverviewFigure[]): WireMarketOverview => ({
  computedAt: at("18:01"),
  feeds: ["iex"],
  figures,
});

// **The same figures, read on the Saturday** — 2026-09-25 is a Friday, so this
// is the instant the aggregate was computed at and nothing else changes. The
// absolute rule keys on it, which is why a story can produce the state without
// waiting for a weekend.
const frameOnSaturday = (
  figures: readonly WireOverviewFigure[],
): WireMarketOverview => ({
  ...frame(figures),
  computedAt: "2026-09-26T14:00:00.000Z",
});

const storedIn = (
  symbol: string,
  session: string,
  close: number,
): WireOverviewFigure => ({ state: "stored", symbol, session, close });

const stored = (symbol: string, close: number): WireOverviewFigure =>
  storedIn(symbol, "2026-09-11", close);

// The order is the frame's, and the frame's is `PRODUCT_SPEC.md` §6's. Nothing
// in the component sorts.
const LIVE = frame([
  observed("SPY", 774.03, 0.42),
  observed("QQQ", 601.88, 0.71),
  observed("DIA", 452.17, -0.18),
  observed("IWM", 243.6, 0),
]);

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();

const meta = {
  title: "Market/MarketProxyStrip",
  component: MarketProxyStrip,
  parameters: { layout: "padded" },
  args: {
    overview: LIVE,
    observations: NO_OBSERVATIONS,
    fromSnapshot: NO_SNAPSHOT,
  },
} satisfies Meta<typeof MarketProxyStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The ordinary state. One qualifier, four cells, no exception line. */
export const Live: Story = {};

/**
 * **On IEX this is ordinary rather than broken** (§7.6: 65.1% of minutes for a
 * median symbol, 2.1% for `ERIE`). The exception occupies row 3, so the cell
 * does not grow and the other three do not move — and it is an **age, never a
 * verdict**: no threshold word, and the shared claim above does not bend to
 * accommodate it.
 */
export const OneProxyBehind: Story = {
  args: {
    overview: frame([
      observed("SPY", 774.03, 0.42),
      observed("QQQ", 601.88, 0.71),
      observed("DIA", 452.17, -0.18, "16:07"),
      observed("IWM", 243.6, 0),
    ]),
  },
};

/**
 * Nothing observed, four stored closes from one session. **The noun is the
 * point of this story** (Task 4.2.6).
 *
 * It read `SPY / 764.29 / 2026-09-11` in four cells until 2026-09-26 — a date
 * with no preposition and no noun beside a figure, under a heading saying
 * `Market proxies`, with the shared line suppressed in exactly this state. So
 * the words *close* and *closing* were nowhere in the strip, and a reader had
 * to infer that `764.29` was a **session close** rather than a price observed
 * at some point that day. A listener got `SPY. 764.29. 2026-09-11.`
 *
 * The claim is now stated **once**, with its noun — the shared-claim idiom the
 * strip already uses for the instant — and the four cells defer to it. Where
 * the sessions disagree they do not; see `StoredClosesFromTwoSessions`.
 *
 * This is what a developer's machine with no provider configured shows, and it
 * is the state the layout was measured against.
 */
export const AllStored: Story = {
  args: {
    overview: frame([
      stored("SPY", 764.29),
      stored("QQQ", 714.88),
      stored("DIA", 525.79),
      stored("IWM", 288.89),
    ]),
  },
};

/**
 * **The absolute rule, and the state that is most of the week** (Task 4.2.6).
 *
 * The same four observed figures as `Live`, read at 10:00 on the Saturday.
 * `currentMarketState` is not cleared on a session boundary — deliberately —
 * so Friday's 15:59 bars are what a weekend reader meets, and the universe
 * table's **relative** rule dates none of them: nothing is behind anything.
 *
 * The strip gets the rule the table is deliberately not given, because four
 * large figures at the top of the landing page are a different kind of claim
 * from one row of 518. It is keyed on ADR 0028's calendar — *the last session
 * whose bell has rung* — and never on an elapsed time: §11.2 measured an
 * ordinary maximum gap of 187 minutes between one security's bars and refused
 * a threshold on that measurement.
 *
 * **It says nothing about whether the market is open.** That is the masthead's
 * clock, and this line is a property of the figures rather than of the market.
 *
 * **This is the longest sentence the strip produces**, and it is therefore the
 * story the two-line qualifier reserve at 390 is measured against. Review it
 * at 390.
 */
export const SessionClosed: Story = {
  args: { overview: frameOnSaturday(LIVE.figures) },
};

/**
 * Two stored sessions, so there is no single claim to share. The line says
 * nothing about the session and **every cell says its own, with the noun** —
 * ADR 0029: a clause renders only when its own data is present, applied to a
 * clause whose data is four values rather than one.
 *
 * A gapped store produces this ordinarily enough that `pnpm bars:check` exists
 * for it.
 */
export const StoredClosesFromTwoSessions: Story = {
  args: {
    overview: frame([
      storedIn("SPY", "2026-09-11", 764.29),
      storedIn("QQQ", "2026-09-11", 714.88),
      storedIn("DIA", "2026-09-10", 525.79),
      storedIn("IWM", "2026-09-10", 288.89),
    ]),
  },
};

/**
 * `None stored` is this product's existing words, from `SecurityIdentity`, at
 * `--ink-secondary` rather than `--ink-disabled` — `#74777f` is 4.48:1 and this
 * is a sentence a person has to read, not a greyed-out control. It is told
 * apart from a figure by **saying words instead of digits**. The change is
 * absent entirely: a clause renders only when its own data is present.
 */
export const OneProxyWithNoFigure: Story = {
  args: {
    overview: frame([
      observed("SPY", 774.03, 0.42),
      observed("QQQ", 601.88, 0.71),
      unknown("DIA"),
      observed("IWM", 243.6, 0),
    ]),
  },
};

/**
 * **CI's state, and it is correct rather than broken.** CI's store is 518
 * securities and zero bars, so this is the only state a browser spec on the
 * runner can assert about — a spec that asserts on a *figure* here will go red
 * for a reason that has nothing to do with the code. `pnpm store:bare`
 * reproduces it locally.
 *
 * The qualifier **changes shape rather than going missing**, and it is a
 * different sentence from both of the security page's empty answers: four named
 * securities have no window to change, so the sentence must not suggest one.
 */
export const NothingStored: Story = {
  args: {
    overview: frame([
      unknown("SPY"),
      unknown("QQQ"),
      unknown("DIA"),
      unknown("IWM"),
    ]),
  },
};

/**
 * **The first fraction of a second, and it should be rare and short** — the
 * gateway sends an overview on connect, unscoped, so a browser has one before
 * it has subscribed to anything. Measured 2026-09-26 against a local pair, five
 * runs: **277, 174, 182, 193, 184 ms** from navigation to a figure on screen.
 *
 * The symbols are not drawn, and that is the set being **served** rather than
 * hard-coded: before the first frame this browser does not know which
 * securities the overview is about.
 *
 * Storybook holds this state still. **In the application it has a floor** —
 * after two seconds it becomes `NoFiguresAtAll` below, because `overview` is
 * only ever written by an overview frame and a frame that never arrives makes
 * this the *terminal* state rather than a flash.
 */
export const FirstPaint: Story = { args: { overview: undefined } };

/**
 * **What the region says when nothing arrives**, which is the same state
 * `figures: []` produces and is a different fact from every other empty answer
 * on this screen.
 *
 * `overview` is only ever written by an overview frame, so an unreachable
 * backend, a proxy blocking the socket or the deploy window leaves the strip
 * reserved and empty **for ever** — a 1392×183 panel with a heading and nothing
 * in it, while the six regions below are hatched and each say what they are
 * waiting for. That is `docs/GAPS.md` entry 13 exactly, and its owner is a
 * condition — *the next story that adds a region*.
 *
 * `No prices yet.` rather than `No prices stored for these four yet.`: the
 * second is a claim about the **store**, and in this state we have not been
 * told anything about the store. It names no feed, no venue and no connection
 * word — whether the socket is up has one home and it is the status bar.
 */
export const NoFiguresAtAll: Story = {
  args: { overview: frame([]) },
};

/**
 * **Byte-identical to `Live`, and that is the decision rather than an
 * omission.** Killing the feed leaves `main`'s text unchanged in all nine
 * states Story 3.10 produced; five surfaces stay quiet, each with a measurement
 * behind it, and the market-feed cell announces a degradation and nothing else.
 * Three tasks decided that, and a strip at the top of the landing page
 * reversing it is a conversation rather than a fix.
 *
 * The same holds when the aggregate frame stops arriving: the last answer stays
 * with the instant it belongs to, and the qualifier stops advancing — which is
 * the honest signal, and is a **visible** fact rather than a missing one. The
 * discs simply stop firing, which is an absence nobody notices.
 */
export const FeedStopped: Story = {};

/**
 * **Four marks, simultaneous, no stagger.** A stagger would encode an order the
 * data does not have and turn one event into four — and whether the four bars
 * arrive in one gateway frame or in several is unmeasured, which is the prior
 * question `Market proxies.dc.html` §05 leaves open and Story 4.9's rehearsal
 * answers.
 *
 * **What this story is here to be measured against is `Live`.** The acceptance
 * the motion vocabulary set for this treatment is **0 layout shift at 1440,
 * 1024, 768 and 390**, *measured in the browser, never drawn* — so the boxes in
 * this story and in `Live` must be identical, and the mark's 8 px slot is
 * reserved statically to make that true by construction rather than by luck.
 *
 * Under `prefers-reduced-motion` the decay resolves to `0ms` and the animation
 * does not run; the `opacity: 0` base in the motion layer is what stops that
 * leaving four permanent dots at the top of the landing page.
 */
export const ArrivalMark: Story = {
  args: {
    observations: new Map<string, Bar>(
      (["SPY", "QQQ", "DIA", "IWM"] as const).map((symbol, index) => [
        symbol,
        {
          startsAt: new Date(at("18:01")),
          open: 100 + index,
          high: 100 + index,
          low: 100 + index,
          close: 100 + index,
          volume: 1_000 + index,
        },
      ]),
    ),
  },
};

/**
 * **The binding case, and it did not fit when this story was written.**
 *
 * Measured 2026-09-26 in Chromium, this story, `1234.56` in all four cells:
 * the figure is **82.61 px** at every width, `PriceChange` is **62.03** at
 * `--font-size-dense` and **54.95** at `--font-size-micro`. So a cell needs
 * `82.61 + gap + change` — **145.56 px** at the micro size with an 8 px gap.
 *
 * The threshold this component shipped with was derived from `4 × 112 + 60`,
 * where 112 px is where a **six**-glyph price stops sharing a line. Against a
 * seven-glyph one a 700 px viewport overflowed by 6 px and a 593 px one by 33,
 * and **390's two-up column of 144 was 1.6 px short**. The micro step does not
 * close that, because the 55 px above already *is* the micro size — an earlier
 * version of this docblock said it did, and was wrong.
 *
 * The repair is in the stylesheet and is two numbers: four across now stops at
 * **48rem** (`4 × 146 + 60 = 644` content, 726 px of viewport, rounded up to an
 * existing breakpoint), and below it the inner gap closes to `--space-4` —
 * `82.61 + 4 + 54.95 = 141.56` against 144, clearing by 2.44 px.
 *
 * **The figure never steps**, at any width.
 *
 * Review this one at 390 and at 700 rather than here.
 */
export const FourDigitPrices: Story = {
  args: {
    overview: frame([
      observed("SPY", 1234.56, 0.42),
      observed("QQQ", 1234.56, 0.71),
      observed("DIA", 1234.56, -0.18),
      observed("IWM", 1234.56, 0),
    ]),
  },
};

/**
 * Every state in one column, so the thing that matters is reviewable: **the box
 * is the same height in all of them**.
 */
export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.stack}>
      {(
        [
          ["live — all four current", LIVE],
          [
            "one proxy behind — the exception line",
            frame([
              observed("SPY", 774.03, 0.42),
              observed("QQQ", 601.88, 0.71),
              observed("DIA", 452.17, -0.18, "16:07"),
              observed("IWM", 243.6, 0),
            ]),
          ],
          [
            "one proxy with no figure",
            frame([
              observed("SPY", 774.03, 0.42),
              observed("QQQ", 601.88, 0.71),
              unknown("DIA"),
              observed("IWM", 243.6, 0),
            ]),
          ],
          [
            "nothing observed — four stored closes, each dated",
            frame([
              stored("SPY", 764.29),
              stored("QQQ", 714.88),
              stored("DIA", 525.79),
              stored("IWM", 288.89),
            ]),
          ],
          [
            "the session’s bell has rung — the absolute rule",
            frameOnSaturday(LIVE.figures),
          ],
          [
            "two stored sessions — each cell carries its own",
            frame([
              storedIn("SPY", "2026-09-11", 764.29),
              storedIn("QQQ", "2026-09-11", 714.88),
              storedIn("DIA", "2026-09-10", 525.79),
              storedIn("IWM", "2026-09-10", 288.89),
            ]),
          ],
          [
            "nothing stored at all — CI's state",
            frame([
              unknown("SPY"),
              unknown("QQQ"),
              unknown("DIA"),
              unknown("IWM"),
            ]),
          ],
          ["first paint — before the first frame", undefined],
          ["no figures at all — the floor", frame([])],
        ] as const
      ).map(([label, overview]) => (
        <div className={gridStyles.stackItem} key={label}>
          <p className={gridStyles.label}>{label}</p>
          <MarketProxyStrip
            overview={overview}
            observations={NO_OBSERVATIONS}
            fromSnapshot={NO_SNAPSHOT}
          />
        </div>
      ))}
    </div>
  ),
};
