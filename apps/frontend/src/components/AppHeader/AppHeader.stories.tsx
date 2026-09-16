import type { Meta, StoryObj } from "@storybook/react-vite";

import gridStyles from "../stories.module.css";
import { AppHeader } from "./AppHeader.js";
import { PATHS } from "../../routes/paths.js";

// The first component in this workshop that does not render on its own: it
// contains `NavLink`, which throws outside a router. `.storybook/preview.tsx`
// wraps every story in a `MemoryRouter` and reads the entry from the `route`
// parameter below — a memory router rather than a browser one because the
// workshop has no address bar and must not be given the browser's history.
//
// That parameter is also why the current-route states are *stories* rather than
// rows in a permutation grid: the active link comes from routing context, not
// from a prop, and two `MemoryRouter`s cannot be nested. That was a constraint
// worth working around while this file also reviewed two indicators driven by
// five props; **since 2026-09-16 it is the only axis this component has**, so
// the stories below are the whole of it.
//
// **This file lost three-quarters of its content in that change**, and the
// missing half is not missing: the market feed and the backend service moved to
// `AppFooter`, and their renderings — including the chosen-rows permutation
// grid and the note explaining why it is chosen rather than cartesian — went
// with them. What is left is a component with no props at all.
//
// One consequence worth stating because it is the reason this file is now
// simple: the clock is read through `useMarketClock` rather than passed in, so
// every story here renders the real current time. That is deliberate and is
// argued in the component — the hook makes no request and has no failure
// states — and `MarketClock`'s own stories are where its six renderings are
// reviewed against pinned readings.

const meta = {
  title: "Chrome/AppHeader",
  component: AppHeader,
  parameters: { layout: "padded", route: PATHS.overview },
} satisfies Meta<typeof AppHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- The current-route states, one per route plus the unmatched case. ---

export const OnOverview: Story = {
  parameters: { route: PATHS.overview },
};

export const OnInvestigations: Story = {
  parameters: { route: PATHS.investigations },
};

export const OnSecurities: Story = {
  parameters: { route: PATHS.securities },
};

export const OnReplay: Story = {
  parameters: { route: PATHS.replay },
};

// No link is current here, which is the state a mistyped URL produces. Worth a
// story because "nothing is underlined" is easy to mistake for a broken active
// state when it is the correct rendering.
export const OnUnknownRoute: Story = {
  parameters: { route: "/not-a-route" },
};

// The four current-route states side by side, which is the review the stories
// above cannot give: what makes a tab read as current is a 2px bar *and* a
// weight change, and whether those two channels agree is a question about four
// headers at once rather than about any one of them.
//
// **It cannot be a `render` that varies the route**, for the reason at the top
// of this file — the route comes from a `MemoryRouter` in the preview decorator
// and they do not nest — so this renders four copies of the same current state
// and is honest about reviewing the *row* rather than the states. The states
// are the five stories above, and they are reviewed by clicking between them.
export const AllPermutations: Story = {
  parameters: {
    // The first genuine *landmark* finding this workshop produced, and it is
    // the grid's rather than the component's. `AppHeader` renders a `<header>`
    // and a `<nav>` — a banner landmark and a navigation landmark — and several
    // copies on one page are `landmark-no-duplicate-banner` and
    // `landmark-unique`, both moderate. The application renders exactly one,
    // and every single-state story above reports zero violations.
    //
    // So these two rules are switched off **here and nowhere else**. A
    // permanent `2` on this story's a11y tab would train the next author to
    // ignore the badge, which is worse than the finding. The general point is
    // worth knowing before the next landmark component: the permutation-grid
    // convention and landmark uniqueness are in direct conflict, and the grid
    // is the one that has to give.
    a11y: {
      config: {
        rules: [
          { id: "landmark-no-duplicate-banner", enabled: false },
          { id: "landmark-unique", enabled: false },
        ],
      },
    },
  },
  render: () => (
    <div className={gridStyles.stack}>
      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>
          the assembled masthead — identity, tabs, clock
        </span>
        <AppHeader />
      </div>
    </div>
  ),
};
