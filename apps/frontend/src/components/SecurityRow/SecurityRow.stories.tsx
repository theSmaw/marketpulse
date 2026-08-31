import {
  ANOMALY_BANDS,
  FEED_STATUSES,
  toTicker,
  type AnomalyBand,
} from "@marketpulse/shared";
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { PRICE_DIRECTIONS } from "../PriceChange/PriceChange.js";
import { SecurityRow } from "./SecurityRow.js";
import styles from "./SecurityRow.module.css";

// The representative component's stories, and the largest permutation set in
// the workshop: three directions × four bands × three feed states = 36 rows,
// all of them rendered by `AllPermutations`.
//
// Thirty-six is not padding. It is the set of states one row of Epic 4's
// overview can actually be in, and the two things worth checking about this
// component — that the numeric column stays aligned, and that no state is
// legible by colour alone — are properties of the set rather than of any
// member of it. Reviewing them one story at a time would not show either.
//
// The row renders a `<tr>` and nothing around it, so every story supplies the
// table. The class comes from the component's own stylesheet: `border-collapse`
// and the cell padding decide where the decimal points land, so a story that
// invented its own table would be demonstrating a different component.

const BAND_EXPLANATION: Readonly<Record<AnomalyBand, string>> = {
  normal: "Behaviour is within this security's own history",
  elevated: "Moving more than usual, within recognisable bounds",
  unusual: "Clearly outside the historical distribution",
  extreme: "Far outside it — the case an investigation starts from",
};

// Same digit count, different glyph widths — the strings that break a column
// if the tabular figure set is ever lost.
const CHANGE_BY_DIRECTION = {
  positive: "+11.11",
  negative: "−88.88",
  unchanged: "00.00",
} as const;

function Table({ children }: { readonly children: ReactNode }) {
  return (
    <table className={styles.table}>
      <tbody>{children}</tbody>
    </table>
  );
}

// Annotated rather than inferred. Without the annotation TypeScript reaches
// for `PartialStoryFn` from a path inside Storybook's internals to name the
// decorator's type and fails with TS2883 — "cannot be named without a
// reference to ... This is likely not portable." A named type on the decorator
// keeps the inferred `meta` nameable, which is what `satisfies` below needs.
const withTable: Decorator = (Story) => (
  <Table>
    <Story />
  </Table>
);

const meta = {
  title: "Market/SecurityRow",
  component: SecurityRow,
  parameters: { layout: "padded" },
  decorators: [withTable],
} satisfies Meta<typeof SecurityRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Rising: Story = {
  args: {
    ticker: toTicker("AAPL"),
    last: "1,111.11",
    change: "+12.40",
    direction: "positive",
    band: "elevated",
    bandExplanation: BAND_EXPLANATION.elevated,
    status: "live",
  },
};

export const Falling: Story = {
  args: {
    ...Rising.args,
    ticker: toTicker("NVDA"),
    last: "8,888.88",
    change: "−34.02",
    direction: "negative",
    band: "extreme",
    bandExplanation: BAND_EXPLANATION.extreme,
  },
};

export const Unchanged: Story = {
  args: {
    ...Rising.args,
    ticker: toTicker("KO"),
    last: "1,088.18",
    change: "0.00",
    direction: "unchanged",
    band: "normal",
    bandExplanation: BAND_EXPLANATION.normal,
  },
};

// Not an error. The figures are still shown and still correct as of a stated
// time — the row degrades locally, which is the whole of PRODUCT_SPEC.md §36.
export const StaleFeed: Story = {
  args: { ...Rising.args, status: "stale" },
};

export const DisconnectedFeed: Story = {
  args: { ...Rising.args, status: "disconnected" },
};

// The tabular column under the widest and narrowest digits it will ever carry.
// Task 1.4.3 measured a 14.3 px spread across these three strings without
// `tabular-nums` — about a third of the column — so this is the story that
// fails if a component ever re-declares the figure set.
export const NumericExtremes: Story = {
  args: { ...Rising.args },
  render: () => (
    <>
      <SecurityRow
        ticker={toTicker("AAPL")}
        last="1,111.11"
        change="+11.11"
        direction="positive"
        band="normal"
        bandExplanation={BAND_EXPLANATION.normal}
        status="live"
      />
      <SecurityRow
        ticker={toTicker("NVDA")}
        last="8,888.88"
        change="−88.88"
        direction="negative"
        band="extreme"
        bandExplanation={BAND_EXPLANATION.extreme}
        status="live"
      />
      <SecurityRow
        ticker={toTicker("GOOGL")}
        last="1,088.18"
        change="00.00"
        direction="unchanged"
        band="unusual"
        bandExplanation={BAND_EXPLANATION.unusual}
        status="live"
      />
    </>
  ),
};

export const AllPermutations: Story = {
  args: { ...Rising.args },
  render: () => (
    <>
      {PRICE_DIRECTIONS.map((direction) =>
        ANOMALY_BANDS.map((band) =>
          FEED_STATUSES.map((status) => (
            <SecurityRow
              key={`${direction}-${band}-${status}`}
              ticker={toTicker("AAPL")}
              last="1,111.11"
              change={CHANGE_BY_DIRECTION[direction]}
              direction={direction}
              band={band}
              bandExplanation={BAND_EXPLANATION[band]}
              status={status}
            />
          )),
        ),
      )}
    </>
  ),
};
