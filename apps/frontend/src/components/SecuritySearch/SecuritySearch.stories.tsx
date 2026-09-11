import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  LOADING_UNIVERSE,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import { SecuritySearch } from "./SecuritySearch.js";

// Every state the product's first interactive control can be in, with **no
// backend running** (Tasks 2.11.4 and 2.11.6).
//
// ## Live, not posed — and produced, not described
//
// **Every story here is live**, which is the opposite of `TextField`'s rule and
// for the opposite reason. A field has states that can be posed side by side; a
// combobox has *behaviour*, and the things worth reviewing — does the list keep
// up with typing, can you tell the active row from the hovered one, does Escape
// do the right thing twice — are only visible by using it. So each story is a
// different **state of the universe fetch**, and the query that lands you in
// the case it is named for is in its description. Type it.
//
// **And every one of those states is produced rather than set.** The view comes
// from `fixtures/securities.ts`, which collapses a body recorded off the real
// endpoint through the **real** `toSecuritiesView` — the same function the hook
// calls. A story that set `state: "failed"` by hand would prove this component
// can render a string; these prove the state is reachable and that the copy is
// what a person actually sees. That is Task 2.10.8's precedent, applied to the
// other request this application makes.
//
// The rows are therefore the real tracked universe: 518 securities, their real
// names, sectors and closes for session 2026-09-04. A search mock full of
// invented tickers is exactly the thing `SEARCH-AND-SELECTION.md` §5 had to
// spend a section unpicking — and with ten invented rows, half of the states
// below could not be reached at all.

const meta: Meta<typeof SecuritySearch> = {
  title: "Market/SecuritySearch",
  component: SecuritySearch,
  parameters: {
    layout: "padded",
  },
  args: {
    view: securitiesFixtureView("full"),
    onOpen: (symbol: string) => {
      // The route is what navigates. A story has nowhere to navigate to, so it
      // says what it would have done.
      console.log(`open ${symbol}`);
    },
  },
  decorators: [
    (Story) => (
      // The surface is absolutely positioned and overlays whatever is beneath
      // it. This block is here so a reviewer can see that it *does* overlay,
      // rather than pushing the page down.
      <div style={{ minHeight: "560px" }}>
        <Story />
        <p
          style={{
            marginTop: "var(--space-16)",
            font: "var(--font-size-body)/1.5 var(--font-sans)",
            color: "var(--ink-secondary)",
          }}
        >
          Content beneath the field. The result surface must cover this rather
          than move it.
        </p>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The ordinary case, against the real 518.
 *
 * Type `he` — thirteen securities match, ten are shown, and the first row is
 * `DOC`, whose emphasis is the whole argument for the offset travelling on the
 * match: it must bold the **He** of *Healthpeak*, never the `he` of *The*.
 *
 * Three more worth doing here: type `nvid` for the single match that Enter
 * opens; hover one row while arrowing to another, because the hovered row and
 * the active row must be distinguishable at a glance; and type `zzz`, which is
 * the story below.
 */
export const Default: Story = {};

/**
 * A query that matches nothing, which is **not an error**.
 *
 * Type `zzz`. The surface says so in a sentence with a hollow ring beside it —
 * the silhouette this language uses for *an answer with nothing in it* — and
 * Enter must do nothing rather than navigate somewhere plausible. Before Task
 * 2.11.6 this state rendered an empty listbox with `0 matches` under it, which
 * is a result surface reporting its own emptiness as a figure.
 */
export const NoMatches: Story = {};

/**
 * More matches than the cap, with an untracked security **demoted past it**.
 *
 * Type `a`: 99 securities match and ten are shown. Now find `AAPL` — it is not
 * there, because an untracked security loses a tie inside its tier and falls
 * from match 2 to match 50. It has not been filtered out; it is off the end of
 * a slice, and the footer's `showing 10 of 99` is the only thing on screen that
 * says so.
 *
 * Then type `aapl` and watch it come back, marked. That pair is the state this
 * story exists for: the demotion is correct, and it is indistinguishable from
 * the defect it resembles unless the surface refuses to claim the list is the
 * whole answer.
 */
export const UntrackedAndCapped: Story = {
  args: { view: securitiesFixtureView("untracked") },
};

/**
 * A partially backfilled universe — the state that ends the uniformity every
 * other story depends on.
 *
 * Type `ad`. Six securities match and three of them carry a fact that looks
 * like a defect and is not: `ADBE` has no stored bars at all, `ADI` has no
 * close, and `ADM`'s close is from an earlier session than the one the footer
 * names — so it carries its own date. The three symbols are named once, in
 * `FIXTURE_SUBJECTS`, and this list is the only other place they are spelled.
 *
 * None of the three is reachable from today's data: all 518 securities have
 * bars, a close, and the same session. That is exactly why the fixture exists.
 * The bug it guards against is invisible while the data is uniform — a footer
 * stating one session while a row's close came from another.
 */
export const PartiallyBackfilled: Story = {
  args: { view: securitiesFixtureView("gaps") },
};

/**
 * The universe has not arrived yet.
 *
 * The field is **not** disabled and the keystrokes are **not** thrown away:
 * type `nv` and the surface says what it is waiting for. It must never say "no
 * matches" here — an empty corpus answers every query with nothing, and
 * reporting that as a result is a claim about the market rather than a fact
 * about the request.
 *
 * The sweep along the field's inside bottom edge shifts no layout.
 */
export const UniverseLoading: Story = {
  args: { view: LOADING_UNIVERSE },
};

/**
 * Nothing answered at the service's address — the failure where waiting may
 * help.
 *
 * The field is disabled with a reason. There is deliberately no *Try again*
 * here: the tracked universe on the same screen owns that control, because both
 * surfaces read the same fetch.
 */
export const NothingAnswered: Story = {
  args: { view: securitiesFixtureView("nothingAnswered") },
};

/**
 * The store is unreachable and the service said so — a 503, the one failure
 * this client's contract calls retryable.
 *
 * Produced from a body recorded off a backend pointed at a port nothing listens
 * on, rather than from a hand-written error.
 */
export const StoreUnavailable: Story = {
  args: { view: securitiesFixtureView("unavailable") },
};

/**
 * Something answered and it was not this service — the failure where waiting
 * will **not** help.
 *
 * The sentence says so, and the absence of a control is stated rather than
 * merely arranged. A retry offered on something that will fail again is a lie
 * the user pays for twice.
 */
export const NotThisService: Story = {
  args: { view: securitiesFixtureView("notThisService") },
};

/**
 * The service answered correctly and holds nothing.
 *
 * Not a failure and not a loading state: it is what a migrated database nobody
 * has loaded looks like, and it is reachable in production today by a deploy
 * whose migration step ran and whose universe step did not.
 */
export const NothingToSearch: Story = {
  args: { view: securitiesFixtureView("empty") },
};
