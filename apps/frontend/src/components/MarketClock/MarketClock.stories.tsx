import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import { readMarketClock } from "../../use-market-clock.js";
import gridStyles from "../stories.module.css";
import { MarketClock } from "./MarketClock.js";

// Six renderings from six instants, and **two of them cannot be reached in a
// browser at all**: a holiday needs the right day of the year, and the
// out-of-range state needs the system clock to be past 2028. That is the
// clearest case yet for why this workshop exists — the alternative is changing
// a laptop's date.
//
// Every specimen is built by passing an instant through the real
// `readMarketClock`, not by hand-writing a reading. So what is on screen here
// is what the header shows on that date, and a change to the calendar or to the
// session rules shows up in the workshop rather than only in production.
//
// **Fixed instants rather than the clock**, so a reload renders the same thing
// and a visual diff of the workshop is not a clock. That is the same choice
// `BackendIndicator`'s stories make about `lastSuccessAt`, and it matters more
// here.
//
// Read the grid for the argument the component is making: nothing is red,
// nothing is green, and `open` and `closed` are the same grey told apart by the
// **shape** of the marker — the encoding that survives the greyscale check this
// palette's red and green fail at 1.05:1. `unknown` is dashed and recedes,
// because it is the one rendering saying nothing about the market at all.

// September is EDT and late November is EST, which is why two instants an hour
// apart in UTC are the same hour on the market's clock.
const INSTANTS = {
  open: "2026-09-08T14:00:00Z", // Tuesday, 10:00 ET
  beforeOpen: "2026-09-08T12:00:00Z", // Tuesday, 08:00 ET
  afterClose: "2026-09-08T21:30:00Z", // Tuesday, 17:30 ET
  halfDayOpen: "2026-11-27T17:00:00Z", // 12:00 ET, closes 13:00
  halfDayAfter: "2026-11-27T19:00:00Z", // 14:00 ET
  holiday: "2026-11-26T15:00:00Z", // Thanksgiving Day
  mourning: "2025-01-09T15:00:00Z", // a closure that is not a holiday
  weekend: "2026-09-05T16:00:00Z", // Saturday
  beyond: "2029-01-02T15:00:00Z", // past the calendar's range
} as const;

const reading = (iso: string) => readMarketClock(new Date(iso));

const meta = {
  title: "Status/MarketClock",
  component: MarketClock,
  parameters: { layout: "padded" },
  args: { reading: reading(INSTANTS.open) },
} satisfies Meta<typeof MarketClock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const BeforeOpen: Story = {
  args: { reading: reading(INSTANTS.beforeOpen) },
};

export const AfterClose: Story = {
  args: { reading: reading(INSTANTS.afterClose) },
};

// The fact a boolean throws away, and the reason the close comes off the
// session rather than from a constant.
export const HalfDay: Story = {
  args: { reading: reading(INSTANTS.halfDayOpen) },
};

export const Holiday: Story = { args: { reading: reading(INSTANTS.holiday) } };

// The row that decided the copy: a real closure, in range, whose name is not a
// holiday, is not annual and is not short. A label template of the shape
// "Closed for the holiday: X" is wrong for it.
export const ClosureWithoutAHoliday: Story = {
  args: { reading: reading(INSTANTS.mourning) },
};

export const Weekend: Story = { args: { reading: reading(INSTANTS.weekend) } };

// Not a market state. What the header renders once the system clock passes the
// trading calendar's covered range — the time survives, the claim does not, and
// the alternative is the chrome's ErrorBoundary replacing the whole header on
// New Year's Day 2029.
export const BeyondTheCalendar: Story = {
  args: { reading: reading(INSTANTS.beyond) },
};

export const AllPermutations: Story = {
  render: () => (
    <div className={gridStyles.grid}>
      {(
        [
          ["open", INSTANTS.open],
          ["before the open", INSTANTS.beforeOpen],
          ["after the close", INSTANTS.afterClose],
          ["half day — open", INSTANTS.halfDayOpen],
          ["half day — closed", INSTANTS.halfDayAfter],
          ["holiday", INSTANTS.holiday],
          ["closure without a holiday", INSTANTS.mourning],
          ["weekend", INSTANTS.weekend],
          ["beyond the calendar", INSTANTS.beyond],
        ] as const
      ).map(([label, iso]) => (
        <Fragment key={label}>
          <span className={gridStyles.label}>{label}</span>
          <MarketClock reading={reading(iso)} />
        </Fragment>
      ))}
    </div>
  ),
};
