import type { Meta, StoryObj } from "@storybook/react-vite";

import { readTopologyFilter } from "../../topology/index.js";
import { BandFilter } from "./BandFilter.js";

// **The band filter, in the five values its trigger can read** (Task 6.8.2).
//
// **Every `filter` here is driven through `readTopologyFilter`**, the real
// reader, over an address string — never a hand-assembled object. Task
// 2.10.8's rule, and it binds harder on this control than on the sector's:
// the band parameter is multi-valued, canonically ordered and toggled, so a
// story that spread `{ bands: ["high"] }` in by hand would prove the component
// can render a word while saying nothing about whether `?band=extreme,high`
// reaches the same state as `?band=high,extreme` — which is the one thing a
// reviewer looking at this control wants to know.
//
// The panel itself is open only under a press: it is local state, and a story
// that forced it open would be reviewing a state the shipped component reaches
// by a gesture nobody made. What a reviewer does here is press it — and the
// thing to look at is that **more than one** option can be marked at once,
// which is correct here and would be a defect in the sector control.
//
// **What no story here can show is the picture.** A band cut is a cut over a
// live measurement, and the counts it produces live in `MarketTopology`'s own
// population note; on CI, on a fresh store and in Storybook there is no
// treatment map at all, so the graph beside this control is refusing
// (`TOPOLOGY_BAND_REFUSAL`) whatever is chosen here.
const meta = {
  title: "Overview/BandFilter",
  component: BandFilter,
  parameters: { layout: "padded" },
} satisfies Meta<typeof BandFilter>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every band — what every reader meets before pressing anything. */
export const AllBands: Story = {
  args: { filter: readTopologyFilter("") },
};

/** One band, the simplest cut a shared link can open into. */
export const OneBand: Story = {
  args: { filter: readTopologyFilter("?band=extreme") },
};

/**
 * **Two, which is the question this feature exists for** — `high or extreme`,
 * spelled out rather than counted, which is where
 * `bandFilterValue`'s own threshold falls and why.
 */
export const TwoBands: Story = {
  args: { filter: readTopologyFilter("?band=high,extreme") },
};

/**
 * Three, where the trigger stops spelling the vocabulary out.
 *
 * `elevated, high or extreme` is 25 characters of `--font-data` under
 * `white-space: nowrap`, in a control that shares a 308 px region header at
 * 390 with two others — so the value becomes `3 bands` and the note over the
 * graph carries the words in full.
 */
export const ThreeBands: Story = {
  args: { filter: readTopologyFilter("?band=elevated,high,extreme") },
};

/**
 * **Canonical order out of a reversed address**, which is the one state only
 * the real reader can produce: `?band=extreme,high` and `?band=high,extreme`
 * are one criterion and must be one word.
 */
export const AReversedAddress: Story = {
  args: { filter: readTopologyFilter("?band=extreme,high") },
};

/**
 * An address naming something that is not a band we score.
 *
 * The control shows `All bands`, because every band is what is drawn — it does
 * not echo the address back as a value it could not resolve. What says so is
 * the note over the graph, which is `MarketTopology`'s own.
 */
export const AnUnrecognisedBand: Story = {
  args: { filter: readTopologyFilter("?band=HIGH") },
};
