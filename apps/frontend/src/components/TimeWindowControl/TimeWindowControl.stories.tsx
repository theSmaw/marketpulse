import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment, useState } from "react";

import { DEFAULT_WINDOW_SESSIONS, TIME_WINDOWS } from "../../market/index.js";
import gridStyles from "../stories.module.css";
import { TimeWindowControl } from "./TimeWindowControl.js";

// The five windows, the state that has none of them, and the two channels that
// have to be legible at the same moment.
//
// **This is where the selection is reviewed**, because nothing below the browser
// can see it: the selected cell is a 2px near-black bar, a weight change and a
// step of ink, and no test in `pnpm verify` can see a colour or a weight at all.
// What the component tests hold is which cell is *checked*; what these hold is
// whether a person can tell.
//
// Three things to look at rather than read:
//
//  1. **Selected and hovered together.** Put the pointer on a cell that is not
//     the selected one. Two states a person using a mouse and a keyboard at once
//     can have on screen must differ by more than a shade — the selection takes
//     no ground and hover owns it, which is the lesson the combobox's hovered row
//     and active row already paid for.
//  2. **Greyscale.** The control spends no hue, so `grayscale(1)` changes
//     nothing about it. That is the claim; the story below is how it is checked.
//  3. **The readout.** It is the half that explains the other five, and `7
//     SESSIONS` beside five unselected cells is the difference between a product
//     that understood the address and one that looks broken.

const meta = {
  title: "Market/TimeWindowControl",
  component: TimeWindowControl,
  parameters: { layout: "padded" },
  args: {
    sessions: DEFAULT_WINDOW_SESSIONS,
    onChange: () => undefined,
  },
} satisfies Meta<typeof TimeWindowControl>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The window the page opens at, and the only one that writes no parameter. */
export const Default: Story = {};

/**
 * **`1M`, which is not a month.** It is twenty-one trading sessions, and the
 * readout is the only place on screen that says so.
 */
export const Month: Story = { args: { sessions: 21 } };

/**
 * **Nothing selected, and nothing wrong** — the address asked for seven
 * sessions.
 *
 * A real, reachable, permanent state rather than an error: the address admits
 * any count the server accepts, and Epic 11's `setTimeWindow` will routinely ask
 * for one that is none of the five. The control does **not** snap to the
 * nearest, because snapping rewrites somebody's address into a different window
 * and answers a question they did not ask.
 *
 * Read it with the readout covered and then uncovered. Five empty buttons read
 * as broken; five empty buttons beside `7 SESSIONS` read as a product that
 * understood what it was given.
 */
export const NoSelection: Story = { args: { sessions: 7 } };

/**
 * **The address named something that is not a count at all** — `?sessions=abc`.
 *
 * The one state the canvas's `N SESSIONS` could not express, and the reason the
 * readout has two forms. `NaN SESSIONS` is a figure this product must never
 * print. The sentence a reader acts on is not here: it is the server's refusal,
 * in the chart's own region, naming what was asked for.
 */
export const NotACount: Story = { args: { sessions: Number.NaN } };

/**
 * **Every state at once, and the same again with the hue removed.**
 *
 * The pair is the measurement this control did not need to take: the selection
 * is a shape, a weight and two inks that differ by luminance, so the two rows
 * are identical. A change that swapped the bar for a fill, or the weight for a
 * tint, would show up here as a row that stops matching the one above it.
 */
export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.grid}>
      {STATES.map(([label, sessions]) => (
        <Fragment key={label}>
          <span className={gridStyles.label}>{label}</span>
          <span className={gridStyles.specimen}>
            <TimeWindowControl onChange={() => undefined} sessions={sessions} />
          </span>
        </Fragment>
      ))}
      {STATES.map(([label, sessions]) => (
        <Fragment key={`grey-${label}`}>
          <span className={gridStyles.label}>{label} · greyscale</span>
          <span
            className={gridStyles.specimen}
            style={{ filter: "grayscale(1)" }}
          >
            <TimeWindowControl onChange={() => undefined} sessions={sessions} />
          </span>
        </Fragment>
      ))}
    </div>
  ),
};

/**
 * **The one thing an artboard could not answer: does the selection move before
 * anything loads?**
 *
 * In the product it does, and not because the control is quick — because the
 * selection is a pure function of the address, and the address changes in the
 * frame the press lands. There is no pending state, no spinner and no disabled
 * window anywhere on this control; the chart carries the stale rail.
 *
 * This story is the same arrangement with a `useState` standing in for the
 * address. Press cells quickly: the bar keeps up, because nothing is waiting for
 * anything.
 */
export const Interactive: Story = {
  parameters: { controls: { disable: true } },
  render: function Interactive() {
    const [sessions, setSessions] = useState<number>(DEFAULT_WINDOW_SESSIONS);

    return <TimeWindowControl onChange={setSessions} sessions={sessions} />;
  },
};

/** The states worth seeing side by side, with the count that produces each. */
const STATES: readonly (readonly [string, number])[] = [
  ...TIME_WINDOWS.map(
    (window) => [window.label, window.sessions] as readonly [string, number],
  ),
  ["none", 7],
  ["not a count", Number.NaN],
];
