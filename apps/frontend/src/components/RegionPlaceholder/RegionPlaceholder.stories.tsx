import type { Meta, StoryObj } from "@storybook/react-vite";

import { Region } from "../Region/Region.js";
import { RegionPlaceholder } from "./RegionPlaceholder.js";

// The five empty regions of the Security Explorer, side by side, which is the
// only way to answer the question this component exists for: **do five of these
// on one screen read as a product that is being built, or as a page that is
// broken?**
//
// `AllPermutations` renders them in a `Region` each, because the placeholder
// alone is not the thing under review. What a stranger sees is a *panel* — a
// real heading, a real near-black rule, a real sentence — with a dashed field
// inside it, and it is the finished furniture around the unfinished content
// that does the work. The bare specimen below is here so the component itself
// can be inspected, not because that is how it ships.

const meta = {
  title: "Market/RegionPlaceholder",
  component: RegionPlaceholder,
  parameters: { layout: "padded" },
  args: { filledBy: "Epic 5 — Anomaly Detection" },
} satisfies Meta<typeof RegionPlaceholder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bare: Story = {};

/** Every sentence this screen actually ships, in the order the grid holds them. */
const REGIONS = [
  {
    name: "Volume",
    filledBy:
      "Traded volume across the same window as the price above it, which is why it sits directly beneath at the same width.",
    plan: "Story 2.13 — Volume Chart",
  },
  {
    name: "Abnormal-move indicators",
    filledBy:
      "How unusual this security's behaviour is right now, scored 0–100 with the reason beside it.",
    plan: "Epic 5 — Anomaly Detection",
  },
  {
    name: "Relative performance",
    filledBy:
      "This security measured against its sector proxy and the broad market, so a move can be told apart from a tide.",
    plan: "Epic 5 — Anomaly Detection",
  },
  {
    name: "Connected securities",
    filledBy:
      "Which securities move with this one, and the evidence for saying so.",
    plan: "Epic 6 — Market Topology",
  },
  {
    name: "Relevant filings",
    filledBy:
      "Primary-source evidence from SEC EDGAR — 8-K, 10-Q, 10-K — filed around the days this security moved.",
    plan: "Epic 9 — Corporate Filing Evidence",
  },
  {
    name: "Anomaly history",
    filledBy:
      "Every earlier occasion this security behaved unusually, so today can be read against its own past.",
    plan: "Epic 5 — Anomaly Detection",
  },
] as const;

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "var(--space-16)",
        alignItems: "start",
      }}
    >
      {REGIONS.map((region) => (
        // Each region is named, so the six `region` landmarks in this grid are
        // distinct and `landmark-unique` has nothing to say about them — the
        // rule only fires for landmarks with **no** accessible name.
        <Region key={region.name} name={region.name} filledBy={region.filledBy}>
          <RegionPlaceholder filledBy={region.plan} />
        </Region>
      ))}
    </div>
  ),
};
