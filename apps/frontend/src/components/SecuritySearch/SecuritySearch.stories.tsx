import type {
  EquitySecurity,
  IndexEtfSecurity,
  Security,
  SecurityLastClose,
} from "@marketpulse/shared";
import { toMarketDate, toTicker } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { SecuritySearch } from "./SecuritySearch.js";

// The workshop for the product's first interactive control.
//
// **Every story here is live**, which is the opposite of `TextField`'s rule and
// for the opposite reason. A field has states that can be posed side by side; a
// combobox has *behaviour*, and the things worth reviewing — does the list keep
// up with typing, can you tell the active row from the hovered one, does Escape
// do the right thing twice — are only visible by using it. A posed screenshot
// of a listbox proves nothing that the canvas does not already show better.
//
// So each story below is a different **universe**, chosen so that typing one
// obvious query lands you in the case the story is named for. The queries are
// in each story's description.
//
// The rows are real: symbols, names, sectors and closes are the tracked
// universe's own, for session 2026-09-04. A search mock full of invented
// tickers is exactly the thing `SEARCH-AND-SELECTION.md` §5 had to spend a
// section unpicking.

const equity = (
  symbol: string,
  name: string,
  over: Partial<EquitySecurity> = {},
): EquitySecurity => ({
  symbol: toTicker(symbol),
  name,
  exchange: "NYSE",
  kind: "equity",
  sector: "technology",
  industry: null,
  status: "active",
  cik: null,
  ...over,
});

const etf = (
  symbol: string,
  name: string,
  over: Partial<IndexEtfSecurity> = {},
): IndexEtfSecurity => ({
  symbol: toTicker(symbol),
  name,
  exchange: "ARCA",
  kind: "index_etf",
  sector: null,
  industry: null,
  status: "active",
  cik: null,
  ...over,
});

const UNIVERSE: readonly Security[] = [
  equity("NVDA", "NVIDIA Corporation", { exchange: "NASDAQ" }),
  equity("NVR", "NVR, Inc.", { sector: "consumer_discretionary" }),
  equity("HSY", "The Hershey Company", { sector: "consumer_staples" }),
  equity("HCA", "HCA Healthcare, Inc.", { sector: "health_care" }),
  equity("CAH", "Cardinal Health, Inc.", { sector: "health_care" }),
  equity("CVS", "CVS Health Corporation", { sector: "health_care" }),
  equity("ELV", "Elevance Health, Inc.", { sector: "health_care" }),
  equity("HPE", "Hewlett Packard Enterprise Company"),
  equity("HSIC", "Henry Schein, Inc.", { sector: "health_care" }),
  equity("DOC", "Healthpeak Properties, Inc.", { sector: "real_estate" }),
  equity("BAC", "Bank of America Corporation", { sector: "financials" }),
  equity("SYY", "Sysco Corporation", { sector: "consumer_staples" }),
  etf("SPY", "SPDR S&P 500 ETF Trust"),
  {
    ...equity("XLV", "Health Care Select Sector SPDR Fund", {
      sector: "health_care",
    }),
    kind: "sector_etf" as const,
    exchange: "ARCA",
  },
];

const SESSION = "2026-09-04";

const close = (
  symbol: string,
  value: number,
  previous: number,
  session = SESSION,
): readonly [string, SecurityLastClose] => [
  symbol,
  {
    symbol,
    session: toMarketDate(session),
    close: value,
    previousClose: previous,
  },
];

const CLOSES = new Map<string, SecurityLastClose>([
  close("NVDA", 230.36, 228.45),
  close("NVR", 6298.85, 6373.95),
  close("HSY", 173.15, 175.06),
  close("HCA", 405.0, 409.2),
  close("CAH", 247.18, 248.61),
  close("CVS", 96.74, 97.2),
  close("ELV", 407.5, 414.78),
  close("HPE", 52.0, 54.44),
  close("HSIC", 89.81, 90.86),
  close("DOC", 20.65, 21.03),
  close("BAC", 62.68, 63.04),
  close("SYY", 80.05, 81.08),
  close("SPY", 770.19, 773.17),
  close("XLV", 171.45, 173.26),
]);

const meta: Meta<typeof SecuritySearch> = {
  title: "Market/SecuritySearch",
  component: SecuritySearch,
  parameters: {
    layout: "padded",
  },
  args: {
    universe: UNIVERSE,
    lastCloses: CLOSES,
    onOpen: (symbol: string) => {
      // The route is what navigates. A story has nowhere to navigate to, so it
      // says what it would have done.
      console.log(`open ${symbol}`);
    },
  },
  decorators: [
    (Story) => (
      // The surface is absolutely positioned and overlays whatever is beneath
      // it. This block is here so a reviewer can see that it *does* overlay,
      // rather than pushing the page down.
      <div style={{ minHeight: "520px" }}>
        <Story />
        <p
          style={{
            marginTop: "var(--space-16)",
            font: "var(--font-size-body)/1.5 var(--font-sans)",
            color: "var(--ink-secondary)",
          }}
        >
          Content beneath the field. The result surface must cover this rather
          than move it.
        </p>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The ordinary case. Type `he` — thirteen names match, the cap shows ten, and
 * the tenth row is `HSY`, whose emphasis is the whole argument for the offset
 * travelling on the match: it must bold the **He** of *Hershey*, never the
 * `he` of *The*.
 *
 * Also worth doing here: hover one row while arrowing to another. The hovered
 * row and the active row must be distinguishable at a glance.
 */
export const Default: Story = {};

/**
 * Type `nvid`. Exactly one match, and Enter opens it — acceptance criterion 1.
 * Then type `zzz`: no matches, and Enter must do **nothing** rather than
 * navigate somewhere plausible.
 */
export const OneMatchAndNone: Story = {};

/**
 * A universe where nothing carries a close, so every row states that rather
 * than rendering an empty column. `lastCloses` is a separate array on the
 * wire, so a missing entry is a real case and not a hypothetical.
 */
export const WithoutCloses: Story = {
  args: { lastCloses: new Map() },
};

/**
 * An untracked security, which must be **findable and unmistakable** — shown
 * and marked, never filtered out. Type `bbby`.
 *
 * This is the schema's one invisible predicate made visible: a search that
 * quietly dropped untracked rows would reintroduce exactly the failure the
 * table avoids by having no `deleted_at` column.
 */
export const Untracked: Story = {
  args: {
    universe: [
      ...UNIVERSE,
      equity("BBBY", "Bed Bath & Beyond Inc.", {
        sector: "consumer_discretionary",
        status: "untracked",
      }),
    ],
  },
};

/**
 * Closes from more than one session. The surface's footer names a session only
 * when every row shares one — here they do not, so it says nothing about a
 * session and each row carries its own date instead. Type `h`.
 */
export const MixedSessions: Story = {
  args: {
    lastCloses: new Map<string, SecurityLastClose>([
      ...CLOSES,
      close("HSY", 173.15, 175.06, "2026-08-28"),
    ]),
  },
};
