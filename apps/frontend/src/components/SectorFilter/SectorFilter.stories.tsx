import type { Meta, StoryObj } from "@storybook/react-vite";

import { readTopologyFilter } from "../../topology/index.js";
import { BandFilter } from "../BandFilter/BandFilter.js";
import { Region } from "../Region/Region.js";
import { Button } from "../Button/Button.js";
import { SectorFilter } from "./SectorFilter.js";

// **The sector filter, in the two things worth reviewing side by side** (Task
// 6.8.1): the three states its own trigger has, and the region header it
// actually ships in.
//
// **Every `filter` here is driven through `readTopologyFilter`**, the real
// reader, over an address string — never a hand-assembled object. Task
// 2.10.8's rule: a story that spreads `{ sector: "energy" }` in by hand proves
// the component can render a word, and a story that drives the shipped parser
// over `?sector=energy` proves the state is **reachable from an address** and
// that the twelve destinations it builds preserve what else is in the query
// string. The `?sessions=21` in the last story is there for exactly that — the
// panel's links must carry it.
//
// The panel itself is open only under a press: it is local state, and a story
// that forced it open would be reviewing a state the shipped component reaches
// by a gesture nobody made. What a reviewer does here is press it.
const meta = {
  title: "Overview/SectorFilter",
  component: SectorFilter,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SectorFilter>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The whole market — what every reader meets before pressing anything. */
export const AllSectors: Story = {
  args: { filter: readTopologyFilter("") },
};

/** Narrowed to one sector, which is what a shared link opens into. */
export const OneSector: Story = {
  args: { filter: readTopologyFilter("?sector=energy") },
};

/**
 * The longest value in the vocabulary — `Communication Services`, 22
 * characters, which is what decides this control's width and therefore
 * whether the region's header still fits at 390.
 */
export const TheLongestValue: Story = {
  args: { filter: readTopologyFilter("?sector=communication_services") },
};

/**
 * An address naming something that is not a sector we track.
 *
 * The control shows `All sectors`, because the whole market is what is drawn —
 * it does not echo the address back as a value it could not resolve. What says
 * so is the note over the graph, which is `MarketTopology`'s own.
 */
export const AnUnrecognisedSector: Story = {
  args: { filter: readTopologyFilter("?sector=Energy") },
};

/**
 * **In the region header it ships in, beside the band control and
 * `Reset view`** — the state that cannot be reviewed from the control alone,
 * and the one this story exists for since Task 6.8.2 put a third control in
 * that slot.
 *
 * The three controls are 8 px apart and are all `Button`s, so what this story
 * is for is whether they read as a set, whether each panel opens over the
 * region's content rather than being clipped by it, and whether the header
 * still fits — `MARKET-OVERVIEW.md` §1.4's displacement trigger has fired on
 * this region three times and `pnpm probe` is where the real figures come
 * from.
 */
export const InTheTopologyHead: Story = {
  args: {
    filter: readTopologyFilter("?sector=energy&band=high,extreme&sessions=21"),
  },
  render: (args) => (
    <Region
      name="Market topology"
      meta={
        <>
          <SectorFilter {...args} />
          <BandFilter {...args} />
          <Button variant="secondary" icon="refresh">
            Reset view
          </Button>
        </>
      }
    >
      <p>516 securities, clustered by sector.</p>
    </Region>
  ),
};
