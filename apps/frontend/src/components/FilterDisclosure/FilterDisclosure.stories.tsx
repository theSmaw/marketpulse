import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "react-router";

import {
  FilterDisclosure,
  filterDisclosureOption,
} from "./FilterDisclosure.js";

// **The disclosure both topology filters are built from** (extracted at Task
// 6.8.2) — reviewed here as the shell it is, with destinations that go
// nowhere.
//
// What is worth seeing side by side is the **trigger's own two-part label** at
// its extremes: the subject and the value are separate spans with a real space
// between them (a CSS margin is a gap a sighted reader sees and a listener does
// not — this control announced itself as `SectorAll sectors` for a day), and
// the value is `nowrap`, so a long one decides this control's width and
// therefore whether a three-control region header still fits at 390.
//
// `SectorFilter.stories.tsx` and `BandFilter.stories.tsx` are where the real
// vocabularies are reviewed. This file deliberately uses neither: a story that
// drove the shipped sector list through here would be a third place that knows
// what a sector is.
const meta = {
  title: "Overview/FilterDisclosure",
  component: FilterDisclosure,
  parameters: { layout: "padded" },
  args: {
    subject: "Subject",
    value: "A value",
    children: (close: () => void) =>
      ["A value", "Another value", "A third"].map((label) => (
        <Link
          className={filterDisclosureOption(label === "A value")}
          key={label}
          onClick={close}
          to="/"
        >
          {label}
        </Link>
      )),
  },
} satisfies Meta<typeof FilterDisclosure>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Shut, which is the state a reader meets. Press it. */
export const Shut: Story = {};

/**
 * The longest value either shipped control can hold — `Communication
 * Services`, 22 characters.
 *
 * It is what decides this control's width, and the header it sits in is 308 px
 * at 390 with two siblings in it.
 */
export const ALongValue: Story = {
  args: { value: "Communication Services" },
};

/** A one-word value, the other end of the same question. */
export const AShortValue: Story = {
  args: { value: "high" },
};
