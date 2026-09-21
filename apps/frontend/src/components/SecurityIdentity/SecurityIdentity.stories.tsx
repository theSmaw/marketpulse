import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  FIXTURE_SUBJECTS,
  LOADING_UNIVERSE,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import { SecurityIdentity } from "./SecurityIdentity.js";

// Every state the page's identity block can be in, with no backend running.
//
// **Produced rather than posed.** Each view comes from `fixtures/securities.ts`,
// which collapses a body recorded off the real endpoint through the **real**
// `toSecuritiesView` — the same function the hook calls. A story that set
// `state: "failed"` by hand would prove this component can render a string;
// these prove the state is reachable and that the copy is what somebody
// actually sees. That is Task 2.10.8's precedent and Task 2.11.6 applied it to
// this fetch.
//
// The one thing a story cannot show is the thing worth knowing about the
// motion: the block animates **once, on mount, and never on a change of
// symbol**, and a story that re-renders is exactly where that is invisible.
// `CLAUDE.md` records the trap in full — motion cannot be measured from a
// backgrounded tab either, so "it replays every time" and "it never runs" look
// identical there.

const meta = {
  title: "Market/SecurityIdentity",
  component: SecurityIdentity,
  parameters: { layout: "padded" },
  args: { symbol: "NVDA", view: securitiesFixtureView("full") },
} satisfies Meta<typeof SecurityIdentity>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The common case: a tracked equity with a close and a previous close. */
export const Listed: Story = {};

/** A market proxy — no sector, so the classification line omits it rather than
    printing "no sector" for a thing sectors do not apply to. */
export const MarketProxy: Story = { args: { symbol: "SPY" } };

/** A security we hold no daily close for: the figure is absent and says so,
    rather than reading zero. */
export const NoClose: Story = {
  args: {
    symbol: FIXTURE_SUBJECTS.withoutClose,
    view: securitiesFixtureView("gaps"),
  },
};

/** Shown and marked, never hidden — `UNIVERSE.md` §12.2's rule. The chip is a
    fact; the sentence about what it means for the bars belongs to the panel
    below, which is why there is not one here. */
export const Untracked: Story = {
  args: {
    symbol: FIXTURE_SUBJECTS.untracked,
    view: securitiesFixtureView("untracked"),
  },
};

/** The symbol is known from the address before the profile is known from the
    fetch, so it is printed at full size immediately and nothing moves when the
    rest lands. */
export const ProfileInFlight: Story = { args: { view: LOADING_UNIVERSE } };

/** Reachable by typing an address, which is a thing people do with a URL that
    has a symbol in it. Not a 404 — the route is correct. */
export const NotInTheUniverse: Story = { args: { symbol: "ZZZZ" } };

/** §36 degrading locally: one failed fetch takes the name and the sector and
    leaves the bars, the search field and the retry untouched. */
export const UniverseUnreadable: Story = {
  args: { view: securitiesFixtureView("nothingAnswered") },
};

/** Migrated and never loaded — a service that answered correctly and holds
    nothing. Folding this into the failure above would blame a service that did
    its job. */
export const UniverseEmpty: Story = {
  args: { view: securitiesFixtureView("empty") },
};

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-40)" }}>
      {(
        [
          ["listed", "NVDA", securitiesFixtureView("full")],
          ["market proxy", "SPY", securitiesFixtureView("full")],
          [
            "no close",
            FIXTURE_SUBJECTS.withoutClose,
            securitiesFixtureView("gaps"),
          ],
          [
            "untracked",
            FIXTURE_SUBJECTS.untracked,
            securitiesFixtureView("untracked"),
          ],
          ["profile in flight", "AMD", LOADING_UNIVERSE],
          ["not in the universe", "ZZZZ", securitiesFixtureView("full")],
          [
            "universe unreadable",
            "NVDA",
            securitiesFixtureView("nothingAnswered"),
          ],
          ["universe empty", "NVDA", securitiesFixtureView("empty")],
        ] as const
      ).map(([label, symbol, view]) => (
        <div key={label}>
          <p
            style={{
              margin: "0 0 var(--space-8)",
              color: "var(--ink-secondary)",
              fontSize: "var(--font-size-micro)",
              lineHeight: "var(--line-height-micro)",
              letterSpacing: "var(--letter-spacing-micro)",
              textTransform: "uppercase",
            }}
          >
            {label}
          </p>
          <SecurityIdentity symbol={symbol} view={view} />
        </div>
      ))}
    </div>
  ),
};

/**
 * **The three times of day a live price can come from** (Task 3.4.6), read as a
 * set rather than one at a time — which is what the 2.14 pass established as
 * the way to review states, and what found the defect in §04 of that pass.
 *
 * The replay cannot produce these on the running page: it re-stamps recorded
 * bars onto the **wall clock**, so out of hours every one of them is a weekend
 * and none carries a mark. This is where the three are comparable.
 *
 * **Silence is a member of the set.** A regular-session price says nothing
 * about the hour, which is `PROVENANCE.md`'s rule that a clause renders only
 * when its own data is present — and the same call the chrome makes for `LIVE`
 * carrying no timestamp.
 */
export const ExtendedHours: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-40)" }}>
      {(
        [
          ["pre-market — 07:42 ET", "2026-09-16T11:42:00Z"],
          ["regular session — 14:01 ET", "2026-09-16T18:01:00Z"],
          ["after-hours — 17:18 ET", "2026-09-16T21:18:00Z"],
        ] as const
      ).map(([label, startsAt]) => (
        <div key={label}>
          <p
            style={{
              margin: "0 0 var(--space-8)",
              color: "var(--ink-secondary)",
              fontSize: "var(--font-size-micro)",
              lineHeight: "var(--line-height-micro)",
              letterSpacing: "var(--letter-spacing-micro)",
              textTransform: "uppercase",
            }}
          >
            {label}
          </p>
          <SecurityIdentity
            symbol="NVDA"
            view={securitiesFixtureView("full")}
            live={{
              startsAt: new Date(startsAt),
              open: 219.4,
              high: 219.62,
              low: 219.31,
              close: 219.5,
              volume: 482958,
            }}
          />
        </div>
      ))}
    </div>
  ),
};
