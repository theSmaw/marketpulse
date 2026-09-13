import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import {
  barSeriesFixtureScreen,
  barSeriesViewScreen,
  staleBarSeriesFixtureView,
  windowChangeFixtureScreen,
} from "../../fixtures/bar-series.js";
import gridStyles from "../stories.module.css";
import { ChartAxis } from "../PriceChart/ChartAxis.js";
import { TimeWindowControl } from "../TimeWindowControl/TimeWindowControl.js";
import type { BarSeriesPanelProps } from "./BarSeriesPanel.js";
import { BarSeriesPanel } from "./BarSeriesPanel.js";

// Every state this panel can be in, side by side, with **no backend running**.
//
// ## Why this file is the argument for Task 2.10.6 rather than a convenience
//
// Six of these states cannot be produced in a browser without breaking
// something on purpose: a partial answer needs a store that is behind, an empty
// one needs a window with no prints in it, the two refusals need a window over
// the cap or outside the calendar, the retryable failure needs a database
// pointed at a port nothing listens on, and the unreadable one needs a host that
// is not this service. Producing six deliberate breakages to review six states
// is how a reviewer stops reviewing them.
//
// So every story below is built by `barSeriesFixtureScreen`, from a body
// **recorded off the real endpoint** and collapsed through the **real**
// `toBarSeriesView`. Nothing here is a hand-written state, and that is a rule
// rather than a preference: a hand-built `partial` whose `covered` disagrees
// with its bars is a state the layer cannot reach, and a panel tuned against one
// renders the real thing wrongly. The prices in these stories are NVDA's, on
// 2026-09-04 and 2026-09-08.
//
// ## What the grid is for
//
// Three judgements a reviewer can only make by seeing them together, and each
// has caught something:
//
//  - **A partial answer must not read as a failure.** It is the panel's most
//    common state, and the difference from a complete one is a marker's shape
//    and a sentence — no red, no amber, no box.
//  - **Colour is never the sole encoding.** The only colour in the grid is the
//    change's green or red, which carries its direction in a glyph and a sign
//    as well; and the amber on a synthetic feed, which is on the marker and
//    never on the word. The panel was measured at **1.92:1** with the amber on
//    the word before that moved.
//  - **A refusal offers no retry and a failure that cannot be retried says so.**
//    Three states carry no control and two carry one; getting that wrong is a
//    button that cannot work, which a reader pays for twice.
//  - **Two marks that are not about the answer, in two places, deliberately**
//    (Task 2.10.8). *Stale* is a rail above the body and goes when the answer
//    settles; *untracked* is a badge on the subject and stays whatever the body
//    shows. Seeing them beside a short coverage line is the only way to check
//    that all three can be true at once without any of them being read as the
//    others.

/**
 * Annotated rather than inferred: an inline decorator makes `meta`'s type
 * unnameable and `tsc -b` refuses it (`TS2883`).
 */
const onOneAxis: Decorator<BarSeriesPanelProps> = (Story, context) => (
  <ChartAxis view={context.args.screen.shown}>
    <Story />
  </ChartAxis>
);

const meta = {
  title: "Market/BarSeriesPanel",
  component: BarSeriesPanel,
  parameters: { layout: "padded" },
  /*
   * **The axis the panel's chart hangs on**, which is how the route renders it
   * and how `BarSeriesPanel.test.tsx` renders it (2026-09-13).
   *
   * `useChartAxis` throws outside a `ChartAxis` on purpose — `chart-axis-context
   * .ts` carries why, and it is the only thing stopping a second plot building
   * its own axis — so every story here was a thrown error from the moment Task
   * 2.13.4 put the chart inside this panel. Nothing caught it: `pnpm stories`
   * asserts a stories *file* exists, and Storybook's build compiles a story
   * rather than rendering one.
   *
   * It is built from `screen.shown` and not from `screen.view`: the axis is the
   * window of the picture that is **on screen**, which on a window change is not
   * the window that was asked for. That is the whole of `WindowChanging` below.
   */
  decorators: [onOneAxis],
  args: {
    screen: barSeriesFixtureScreen("partial"),
    /*
     * The real control, inert (2026-09-13). It shares the row above the picture
     * with the rail, which is the whole of §71 — a story that left it out would
     * review a row with one occupant and miss the thing that makes the rail cost
     * nothing. `onChange` does nothing because there is no address here.
     */
    control: <TimeWindowControl onChange={() => undefined} sessions={5} />,
    symbol: "NVDA",
    defaulted: false,
    onRetry: () => undefined,
  },
} satisfies Meta<typeof BarSeriesPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The state the panel is normally in, which is why it is the default.
 *
 * Measured against both the local and the deployed store on 2026-09-10: a named
 * window always reaches to the current session's close and the backfill runs
 * nightly, so an answer that stops short is the ordinary one. It has to read as
 * an answer.
 */
export const Partial: Story = {
  args: { screen: barSeriesFixtureScreen("partial") },
};

/** Every bar of the window asked for. The coverage line says so rather than
 * saying nothing — silence would make *"we hold all of it"* and *"nobody
 * checked"* look identical. */
export const Complete: Story = {
  args: { screen: barSeriesFixtureScreen("full") },
};

/**
 * A series stitched from stored history and a live tail, so provenance names two
 * sources.
 *
 * Both name the **same feed** here, because both halves came from Alpaca's
 * historical API, which is SIP on this plan — a recorded fact rather than a
 * simplification. Two *different* feeds arrive with Epic 3's IEX socket, and the
 * wording for that case is Story 2.14's. The panel renders the distinct feeds,
 * so this row currently shows one label and will show two without a change here.
 */
export const Stitched: Story = {
  args: { screen: barSeriesFixtureScreen("stitched") },
};

/** A 200 with no bars in it. The likeliest cause is the ordinary one and the
 * copy says so, because "no data" leaves a reader choosing between *this stock
 * does not exist* and *this product is broken*. */
export const Empty: Story = {
  args: { screen: barSeriesFixtureScreen("empty") },
};

/** Before the first answer. */
export const Loading: Story = {
  args: { screen: barSeriesViewScreen({ state: "loading" }) },
};

/**
 * The 10,000-bar cap, refused rather than reduced.
 *
 * The sentence is the **server's**, rendered verbatim, and it names the number:
 * the panel does not re-word it, because the arithmetic in it is not the
 * panel's. No retry control — waiting cannot help — and no correlation id,
 * because a refusal is not a failure the reader is being told about.
 */
export const RefusedByTheCap: Story = {
  args: { screen: barSeriesFixtureScreen("refusedCap") },
};

/** A window outside the checked-in trading calendar. The second refusal, here
 * so a reviewer can see that two very different causes produce one calm shape. */
export const RefusedByTheCalendar: Story = {
  args: { screen: barSeriesFixtureScreen("refusedCalendar") },
};

/** A symbol the universe does not hold — a **refusal**, not a failure, which is
 * the finding Task 2.10.4 recorded. It names the symbol the reader typed. */
export const RefusedUnknownSymbol: Story = {
  args: {
    screen: barSeriesFixtureScreen("refusedUnknownSymbol"),
    symbol: "ZZZZ",
  },
};

/** The store unreachable — the one failure this layer treats as retryable, and
 * therefore the one that carries a control. */
export const FailedAndRetryable: Story = {
  args: { screen: barSeriesFixtureScreen("unavailable") },
};

/** The same control, mid-retry. The failure's sentence **stays on screen**
 * rather than returning to `loading`, which would read as the thing breaking
 * twice. */
export const Retrying: Story = {
  args: {
    screen: barSeriesViewScreen({
      state: "failed",
      failure: "answered-badly",
      requestId: "00000000-0000-4000-8000-000000000000",
      retryable: true,
      retrying: true,
    }),
  },
};

/** Our own server answering with a body whose numbers disagree with each other.
 * It looks exactly like any other unreadable answer, deliberately: the
 * diagnosis differs and the reader's options do not. */
export const FailedIncoherent: Story = {
  args: { screen: barSeriesFixtureScreen("incoherent") },
};

/**
 * The same answer, one request old.
 *
 * **The state Task 2.10.5 shipped the behaviour for and could not say.** A held
 * series paints in the first commit while the fresh answer is in flight, and
 * until this task nothing on screen marked it. See it in the real product in
 * two clicks — `/securities/NVDA` → `/securities/AMD` → back — where the third
 * view paints from the cache with a request still going.
 *
 * What to review here is what the mark does **not** do: no number is dimmed,
 * blurred or moved, because these figures are correct and are one request old
 * rather than wrong. The rail is above them, the encoding is dashes rather than
 * colour, and the whole thing survives greyscale.
 */
export const Stale: Story = {
  args: { screen: barSeriesViewScreen(staleBarSeriesFixtureView("partial")) },
};

/**
 * A security MarketPulse holds bars for and no longer follows.
 *
 * **The rendering that shipped in Task 2.10.7 and had never been executed.**
 * `securityStatus` is a field on three of the six members rather than a member
 * of its own, which is exactly the shape a states checklist walks past — so
 * this story exists as much to make the gap un-reopenable as to review the
 * mark.
 *
 * It is a **populated** answer: an untracked security keeps its bars and the
 * route still serves them. The badge sits on the subject rather than in the
 * body because it qualifies the security rather than this answer.
 */
export const Untracked: Story = {
  args: { screen: barSeriesFixtureScreen("untracked"), symbol: "AMD" },
};

/** The bare `/securities`, where nobody named a security. The panel says search
 * is a story away rather than presenting a default as a choice. */
export const DefaultedSymbol: Story = {
  args: { screen: barSeriesFixtureScreen("partial"), defaulted: true },
};

/**
 * Every state at once — the review that cannot be done one story at a time.
 *
 * The landmark rule that bit `AppHeader` and `Region` does not apply: this panel
 * declares no landmark, so thirteen of them on one page is thirteen `<div>`s.
 *
 * **What it does now have is thirteen live regions**, which is a property of
 * the grid rather than of the panel and is worth knowing before anybody reads
 * an axe run here. A `role="status"` is not a landmark and does not want an
 * accessible name, so the uniqueness rule that forced `AppHeader`'s hand does
 * not fire — and every one of them is empty at rest in this story, because
 * nothing here transitions.
 */
export const AllPermutations: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className={gridStyles.grid}>
      {(
        [
          ["Complete", barSeriesFixtureScreen("full"), "NVDA", false],
          ["Partial", barSeriesFixtureScreen("partial"), "NVDA", false],
          [
            "Stitched — two sources",
            barSeriesFixtureScreen("stitched"),
            "NVDA",
            false,
          ],
          ["Empty", barSeriesFixtureScreen("empty"), "NVDA", false],
          ["Loading", barSeriesViewScreen({ state: "loading" }), "NVDA", false],
          [
            "Refused — the cap",
            barSeriesFixtureScreen("refusedCap"),
            "NVDA",
            false,
          ],
          [
            "Refused — the calendar",
            barSeriesFixtureScreen("refusedCalendar"),
            "NVDA",
            false,
          ],
          [
            "Refused — unknown symbol",
            barSeriesFixtureScreen("refusedUnknownSymbol"),
            "ZZZZ",
            false,
          ],
          [
            "Failed — retryable",
            barSeriesFixtureScreen("unavailable"),
            "NVDA",
            false,
          ],
          [
            "Failed — incoherent",
            barSeriesFixtureScreen("incoherent"),
            "NVDA",
            false,
          ],
          [
            "Stale — a newer answer in flight",
            barSeriesViewScreen(staleBarSeriesFixtureView("partial")),
            "NVDA",
            false,
          ],
          ["Untracked", barSeriesFixtureScreen("untracked"), "AMD", false],
          ["Defaulted symbol", barSeriesFixtureScreen("partial"), "NVDA", true],
        ] as const
      ).map(([label, screen, symbol, defaulted]) => (
        <Fragment key={label}>
          <p className={gridStyles.label}>{label}</p>
          {/* One axis per panel: an axis is a window, and these are thirteen. */}
          <ChartAxis view={screen.shown}>
            <BarSeriesPanel
              screen={screen}
              symbol={symbol}
              defaulted={defaulted}
              onRetry={() => undefined}
              control={
                <TimeWindowControl onChange={() => undefined} sessions={5} />
              }
            />
          </ChartAxis>
        </Fragment>
      ))}
    </div>
  ),
};

/**
 * **A window change, still in flight** (Task 2.13.7) — and the state this panel
 * could not express before it.
 *
 * The reader has pressed `1M`. The control above has already moved, because it
 * follows the address rather than the request; the charts and every figure below
 * are still five sessions, because that is the last thing anybody actually
 * answered. The rail is the only thing that changed, and it names **both**
 * windows.
 *
 * Review it against `Stale` above, which occupies the same position and says a
 * different thing: that one is *a newer answer to this question*, this one is
 * *an answer to a different question*. The two never appear together.
 */
export const WindowChanging: Story = {
  args: {
    // The control follows the **address**, so it has already moved to 1M while
    // the picture is still the five-session answer. That disagreement is the
    // state, and the rail beside it is what resolves it.
    control: <TimeWindowControl onChange={() => undefined} sessions={21} />,
    screen: windowChangeFixtureScreen({
      held: "partial",
      heldSessions: 5,
      askedSessions: 21,
    }),
  },
};

/**
 * The new window was **refused**, and the previous one is still drawn.
 *
 * `VOLUME-AND-WINDOW.md` §6.3's tension, resolved. `refused` draws no frame —
 * it carries no window a frame could be built from — while acceptance criterion
 * 4 asks that a failed window change leave the previous data visible. Both are
 * true here, and the only thing that makes them readable together is the label
 * saying which window the picture is of.
 *
 * The server's sentence is verbatim and there is **no** `Try again`: a refusal
 * is a fact about the request rather than about the moment. Reachable in the
 * product by typing `?sessions=1000`, with no stubbing at all.
 */
export const WindowRefused: Story = {
  args: {
    screen: windowChangeFixtureScreen({
      held: "partial",
      heldSessions: 5,
      askedSessions: 1000,
      asked: "refusedCalendar",
    }),
  },
};

/**
 * The new window **failed**, and the screen's one `Try again` is on the rail.
 *
 * It is there rather than in the body because the body is a correct answer to a
 * window that did not fail — a retry sitting under those figures would offer to
 * re-read something that worked. Count the buttons: there is exactly one.
 */
export const WindowFailed: Story = {
  args: {
    screen: windowChangeFixtureScreen({
      held: "partial",
      heldSessions: 5,
      askedSessions: 21,
      asked: "unavailable",
    }),
  },
};

/**
 * A window the address named as something that is not a count at all —
 * `?sessions=abc`, which reaches the server as `NaN`.
 *
 * **No number is invented.** The rail says *the window asked for*, the control's
 * readout says *not a session count*, and the sentence a reader acts on is the
 * server's, which names exactly what was asked. Three surfaces, three different
 * sentences about one event.
 */
export const WindowNotACount: Story = {
  args: {
    screen: windowChangeFixtureScreen({
      held: "partial",
      heldSessions: 5,
      askedSessions: Number.NaN,
      asked: "refusedCalendar",
    }),
  },
};

/**
 * The **security** changed, and the held answer was dropped.
 *
 * The fence, as a story, because it is the one case that must come out
 * empty-handed: a held NVDA series under an AMD heading is plausible and wrong
 * rather than visibly broken. There is no rail here and no chart — just
 * `loading`, exactly as before this task.
 */
export const SecurityChanging: Story = {
  args: {
    symbol: "AMD",
    screen: windowChangeFixtureScreen({
      held: "partial",
      heldSessions: 5,
      askedSessions: 5,
      askedSymbol: "AMD",
    }),
  },
};
