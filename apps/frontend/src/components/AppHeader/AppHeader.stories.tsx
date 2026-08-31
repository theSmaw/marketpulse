import { FEED_STATUSES, type FeedStatus } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

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
// rows in the permutation grid: the active link comes from routing context, not
// from a prop, and two `MemoryRouter`s cannot be nested. The grid below covers
// the props — three feed statuses times detail present or absent — and the
// named stories cover the routes.

const DETAIL: Readonly<Record<FeedStatus, string>> = {
  live: "Updating",
  stale: "Last update 10:41:58 — slower than expected",
  disconnected: "Displaying data through 10:42:17",
};

const meta = {
  title: "Chrome/AppHeader",
  component: AppHeader,
  parameters: { layout: "padded", route: PATHS.overview },
  args: { feedStatus: "live" },
} satisfies Meta<typeof AppHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- The feed states. None of the three is an error. ---

export const Live: Story = { args: { feedStatus: "live" } };

export const Stale: Story = {
  args: { feedStatus: "stale", feedDetail: DETAIL.stale },
};

export const Disconnected: Story = {
  args: { feedStatus: "disconnected", feedDetail: DETAIL.disconnected },
};

// --- The current-route states, one per route plus the unmatched case. ---

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

// Six: three statuses times detail present or absent. The row that earns the
// grid is `disconnected` without a detail — the state PRODUCT_SPEC.md §36 asks
// to be avoided, and seeing it beside the version carrying a timestamp is the
// argument for always passing one.
export const AllPermutations: Story = {
  parameters: {
    // The first genuine a11y finding this workshop has produced, and it is the
    // grid's rather than the component's. `AppHeader` renders a `<header>` and
    // a `<nav>` — a banner landmark and a navigation landmark — and six copies
    // on one page are `landmark-no-duplicate-banner` and `landmark-unique`,
    // both moderate. The application renders exactly one, and every
    // single-state story above reports 0 violations and 13 passes.
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
      {FEED_STATUSES.map((status) => (
        <Fragment key={status}>
          <div className={gridStyles.stackItem}>
            <span className={gridStyles.label}>{status}</span>
            <AppHeader feedStatus={status} />
          </div>
          <div className={gridStyles.stackItem}>
            <span className={gridStyles.label}>{status} + detail</span>
            <AppHeader feedStatus={status} feedDetail={DETAIL[status]} />
          </div>
        </Fragment>
      ))}
    </div>
  ),
};
