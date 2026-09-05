// The tracked universe: the securities MarketPulse watches, as data.
//
// This is the list PRODUCT_SPEC.md §6 asks for — "approximately 100 liquid
// US-listed equities plus a small number of useful ETFs" — and it is the input
// to Epics 4, 5, 6 and 7 rather than a fixture. Every argument behind it is in
// `planning/epic-02-security-universe-historical-data/story-03-.../UNIVERSE.md`,
// which is this story's one document about the subject: §1 the taxonomy, §6 why
// this is a `.ts` module under `src/` and not a `.json` or a migration, §7 the
// selection rule this list was written to satisfy, §8 why nothing here knows the
// count.
//
// ## What this file is NOT
//
// **It is not a loader.** Nothing here opens a connection, and `securities`
// holds zero rows for as long as this file is the newest thing in the story.
// Task 2.3.5 writes the loader, and the split is deliberate: a product decision
// (which securities?) and an engineering one (how do they reach the database?)
// should fail separately when they fail.
//
// **No ROW carries provenance, and no row can.** `Security` deliberately does
// not embed a source or a retrieval timestamp, because a row in a checked-in
// file cannot know when it was retrieved — a `git log` date is when somebody
// typed it, which is a different claim. The loader supplies `profile_source`,
// `profile_retrieved_at`, `classification_source` and
// `classification_retrieved_at` at load time, and `0003_security_vocabulary.sql`
// makes all four `not null` with no default so it cannot forget. What this file
// owes that arrangement is one negative fact, and it holds: **every row below
// has the same source.** The profile fields (`symbol`, `name`, `exchange`) and
// the classification fields (`sector`, `industry`) were both hand-curated here,
// so the loader writes one source string for the whole file and no row needs an
// override.
//
// **The FILE does carry one thing, and Task 2.3.5 put it here on purpose:
// {@link UNIVERSE_PROVENANCE}, the date this list was last checked against a
// source.** That is not the same claim as "when was this row retrieved" and it
// is the only honest home for it — see the constant's own comment, and
// `UNIVERSE.md` §5 for what it is a mitigation against.
//
// **It states no count.** There is no `EXPECTED_COUNT`, no asserted array
// length and no number anywhere below that would have to change to reach §6's
// 500. The count is a fact about today's file, recorded in `UNIVERSE.md` §9 and
// derived everywhere else.
//
// ## What holds it honest
//
// Three guards stand behind this list and this file is only the first.
//
//  1. **The compiler**, here. `Security` is a discriminated union on `kind`, so
//     an equity or a sector proxy without a sector does not compile, a sector
//     outside `SECTORS` does not compile, and an index proxy carrying a sector
//     does not compile either. That is the whole reason `UNIVERSE.md` §6 chose a
//     `.ts` module over a data file.
//  2. **The loader** (Task 2.3.5), for the rules a type cannot express because
//     they are statements about the whole list rather than about a row — "every
//     sector present has its ETF", "no duplicate symbol". They are deliberately
//     not half-expressed here.
//  3. **The database**, through `securities_kind_check`,
//     `securities_status_check`, `securities_sector_check` and
//     `securities_sector_matches_kind`.
//
// If a row here is wrong in a way the compiler catches, that is the arrangement
// working. Do not reach for a cast.

import {
  SECTOR_ETFS,
  SECTORS,
  toTicker,
  type EquitySecurity,
  type IndexEtfSecurity,
  type Sector,
  type SectorEtfSecurity,
  type Security,
  type SecurityFieldGroup,
} from "@marketpulse/shared";

/**
 * One curated row, before it becomes a {@link Security}.
 *
 * `symbol` is a plain `string` here and a `Ticker` on the far side of the
 * constructors below. That is the one cost `UNIVERSE.md` §6 stated in advance:
 * `Security.symbol` is branded, so `symbol: "AAPL"` does not satisfy it and
 * every row would otherwise read `symbol: toTicker("AAPL")`. Wrapping ~100 rows
 * individually is noise in a file whose whole job is to read as data, so the
 * wrapping happens in one place — which is also the only place it could be
 * validated, and a curated file is exactly where a boundary check belongs. A
 * malformed ticker is a `TypeError` at module load naming the value, not a
 * symbol that quietly matches nothing.
 */
interface CuratedRow {
  symbol: string;
  name: string;
  /** The listing venue. `NASDAQ`, `NYSE` or `ARCA` in this file. */
  exchange: string;
  /**
   * The finer classification, or `null` where there genuinely is not one — a
   * fund is not in an industry.
   *
   * Required rather than optional even though it is nullable: under
   * `exactOptionalPropertyTypes` an omitted key and an explicit `null` are
   * different types, and `Security` requires the key. That is deliberate, and
   * it is the difference between an author who decided there is no answer and
   * an author who never decided.
   */
  industry: string | null;
}

/**
 * The equities of one sector.
 *
 * Grouped by sector rather than carrying a `sector` on each row, which is a
 * decision and not a convenience. It makes the sector a single typed argument
 * per block — so a sector outside {@link SECTORS} is one compile error rather
 * than one per row, and a row cannot acquire the wrong sector by being pasted
 * into the wrong place. It also makes §7's allocation rule legible in the file
 * itself: the floor of 6 and the ceiling of 12 are the length of these blocks,
 * which is what {@link UNIVERSE.md} §9's distribution table counts.
 *
 * `cik` is `null` on every row, and that is the stated instruction rather than
 * an omission: it is Epic 9's field, Epic 9 will trust it, and **a guessed
 * identifier is worse than an absent one**. It is null forever for the ETFs
 * below, which do not file the reports Epic 9 reads.
 */
function equities(
  sector: Sector,
  rows: readonly CuratedRow[],
): readonly EquitySecurity[] {
  return rows.map((row) => ({
    kind: "equity",
    symbol: toTicker(row.symbol),
    name: row.name,
    exchange: row.exchange,
    sector,
    industry: row.industry,
    status: "active",
    cik: null,
  }));
}

/**
 * The eleven sector proxies, **derived from `SECTOR_ETFS` rather than typed
 * out**.
 *
 * A `sector_etf` row's `sector` is precisely the key it is the value of, so
 * hand-typing `XLK`, `XLV` and the rest here would put a second copy of that
 * table in the tree in the same commit as the first — and the copy would be the
 * one a reader of this file believes. `UNIVERSE.md` §1 records this as the one
 * real cost of putting the mapping in `packages/shared`, and this function is
 * the stated mitigation: the symbols come from the mapping and only the fund
 * names and venues are data here.
 *
 * Mapping over `SECTORS` rather than over `Object.keys` is what makes the set
 * complete by construction: a twelfth sector added to the union arrives here
 * with no edit, and it cannot be added without also naming its ETF, because
 * `SECTOR_ETFS` is a `Record` total over the union. `SECTOR_ETF_PROFILES` below
 * is total for the same reason, so the twelfth sector is a compile error until
 * somebody names its fund.
 */
const SECTOR_ETF_PROFILES: Record<Sector, { name: string; exchange: string }> =
  {
    technology: {
      name: "Technology Select Sector SPDR Fund",
      exchange: "ARCA",
    },
    health_care: {
      name: "Health Care Select Sector SPDR Fund",
      exchange: "ARCA",
    },
    financials: { name: "Financial Select Sector SPDR Fund", exchange: "ARCA" },
    consumer_discretionary: {
      name: "Consumer Discretionary Select Sector SPDR Fund",
      exchange: "ARCA",
    },
    communication_services: {
      name: "Communication Services Select Sector SPDR Fund",
      exchange: "ARCA",
    },
    industrials: {
      name: "Industrial Select Sector SPDR Fund",
      exchange: "ARCA",
    },
    consumer_staples: {
      name: "Consumer Staples Select Sector SPDR Fund",
      exchange: "ARCA",
    },
    energy: { name: "Energy Select Sector SPDR Fund", exchange: "ARCA" },
    utilities: { name: "Utilities Select Sector SPDR Fund", exchange: "ARCA" },
    real_estate: {
      name: "Real Estate Select Sector SPDR Fund",
      exchange: "ARCA",
    },
    materials: { name: "Materials Select Sector SPDR Fund", exchange: "ARCA" },
  };

const SECTOR_PROXIES: readonly SectorEtfSecurity[] = SECTORS.map((sector) => ({
  kind: "sector_etf",
  symbol: SECTOR_ETFS[sector],
  name: SECTOR_ETF_PROFILES[sector].name,
  exchange: SECTOR_ETF_PROFILES[sector].exchange,
  sector,
  industry: null,
  status: "active",
  cik: null,
}));

/**
 * The four market proxies, which are genuinely data.
 *
 * Unlike the sector proxies there is nothing to derive these from — there is no
 * `Record` in `packages/shared` mapping "the market" to a symbol, because there
 * is no key to map from. §6 of PRODUCT_SPEC.md names all four by hand and this
 * is where they are written down.
 *
 * Their `sector` is `null` **and the type requires it to be**, which is the
 * difference between "we do not know" and "there is no answer": an index proxy
 * does not belong to a sector, and Epic 5 keying a benchmark lookup off a null
 * sector here would be reading an absence as a claim.
 */
const INDEX_PROXIES: readonly IndexEtfSecurity[] = (
  [
    {
      symbol: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      exchange: "ARCA",
      industry: null,
    },
    {
      symbol: "QQQ",
      name: "Invesco QQQ Trust, Series 1",
      exchange: "NASDAQ",
      industry: null,
    },
    {
      symbol: "DIA",
      name: "SPDR Dow Jones Industrial Average ETF Trust",
      exchange: "ARCA",
      industry: null,
    },
    {
      symbol: "IWM",
      name: "iShares Russell 2000 ETF",
      exchange: "ARCA",
      industry: null,
    },
  ] as const satisfies readonly CuratedRow[]
).map((row) => ({
  kind: "index_etf",
  symbol: toTicker(row.symbol),
  name: row.name,
  exchange: row.exchange,
  sector: null,
  industry: row.industry,
  status: "active",
  cik: null,
}));

/**
 * The equities, allocated by sector against `UNIVERSE.md` §7 and **not ranked
 * by market capitalisation**.
 *
 * That ordering is the rule a naive "top 100 by market cap" list fails: it
 * produces a universe that is ~40% technology, which makes half of Epic 5
 * uninteresting — a sector with one constituent has no peers to be relative to,
 * and its breadth number is 0% or 100% forever. So the sector allocation is
 * chosen first (a floor of 6, a ceiling of 12) and the names inside each block
 * are chosen second.
 *
 * The rule pulling the other way is liquidity, and it means liquid **on IEX**
 * rather than on the consolidated tape — invariant 6 and §7.1: Alpaca's free
 * tier is IEX, so a name that is busy on the SIP and thin on IEX gives an
 * anomaly score computed over noise. Every name below is a large, heavily
 * traded US listing for that reason. Within each block there is deliberate
 * market-capitalisation spread (§7 rule 5): a sector of ten mega-caps moves as
 * one thing.
 */
const EQUITIES: readonly EquitySecurity[] = [
  // 12 — at §7's ceiling, and the ceiling is why: 12 of 86 is 14.0%, so the
  // "not 40% technology" criterion is met with margin rather than approached.
  //
  // EIGHT of the twelve are `Semiconductors`, which is §7 rule 7 and is the
  // most consequential shape in this file. PRODUCT_SPEC.md §38's flagship demo
  // concludes "semiconductor weakness is broad" and §11's worked breadth
  // example is "82% of semiconductor securities currently negative" — both
  // INDUSTRY-level claims, not sector-level. A group of two or three makes
  // those sentences arithmetic over nothing. AMAT is `Semiconductor Equipment`
  // and deliberately not folded in: it sells to the group rather than
  // competing in it, and a curated file that blurs that to make a number look
  // better is the failure this list is checked against.
  ...equities("technology", [
    {
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      exchange: "NASDAQ",
      industry: "Semiconductors",
    },
    {
      symbol: "AMD",
      name: "Advanced Micro Devices, Inc.",
      exchange: "NASDAQ",
      industry: "Semiconductors",
    },
    {
      symbol: "AVGO",
      name: "Broadcom Inc.",
      exchange: "NASDAQ",
      industry: "Semiconductors",
    },
    {
      symbol: "INTC",
      name: "Intel Corporation",
      exchange: "NASDAQ",
      industry: "Semiconductors",
    },
    {
      symbol: "MU",
      name: "Micron Technology, Inc.",
      exchange: "NASDAQ",
      industry: "Semiconductors",
    },
    {
      symbol: "QCOM",
      name: "QUALCOMM Incorporated",
      exchange: "NASDAQ",
      industry: "Semiconductors",
    },
    {
      symbol: "TXN",
      name: "Texas Instruments Incorporated",
      exchange: "NASDAQ",
      industry: "Semiconductors",
    },
    {
      symbol: "ADI",
      name: "Analog Devices, Inc.",
      exchange: "NASDAQ",
      industry: "Semiconductors",
    },
    {
      symbol: "AMAT",
      name: "Applied Materials, Inc.",
      exchange: "NASDAQ",
      industry: "Semiconductor Equipment",
    },
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      industry: "Technology Hardware, Storage & Peripherals",
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      exchange: "NASDAQ",
      industry: "Systems Software",
    },
    {
      symbol: "ORCL",
      name: "Oracle Corporation",
      exchange: "NYSE",
      industry: "Systems Software",
    },
  ]),

  // 9 — three industries deep enough to be compared against each other, which
  // is what makes a health-care move readable as "pharma, not biotech".
  ...equities("health_care", [
    {
      symbol: "LLY",
      name: "Eli Lilly and Company",
      exchange: "NYSE",
      industry: "Pharmaceuticals",
    },
    {
      symbol: "JNJ",
      name: "Johnson & Johnson",
      exchange: "NYSE",
      industry: "Pharmaceuticals",
    },
    {
      symbol: "PFE",
      name: "Pfizer Inc.",
      exchange: "NYSE",
      industry: "Pharmaceuticals",
    },
    {
      symbol: "MRK",
      name: "Merck & Co., Inc.",
      exchange: "NYSE",
      industry: "Pharmaceuticals",
    },
    {
      symbol: "ABBV",
      name: "AbbVie Inc.",
      exchange: "NYSE",
      industry: "Biotechnology",
    },
    {
      symbol: "AMGN",
      name: "Amgen Inc.",
      exchange: "NASDAQ",
      industry: "Biotechnology",
    },
    {
      symbol: "GILD",
      name: "Gilead Sciences, Inc.",
      exchange: "NASDAQ",
      industry: "Biotechnology",
    },
    {
      symbol: "UNH",
      name: "UnitedHealth Group Incorporated",
      exchange: "NYSE",
      industry: "Managed Health Care",
    },
    {
      symbol: "TMO",
      name: "Thermo Fisher Scientific Inc.",
      exchange: "NYSE",
      industry: "Life Sciences Tools & Services",
    },
  ]),

  // 9 — the banks are the point. Four diversified banks moving together is the
  // clearest "this is not company-specific" signal in the whole universe, and
  // it is the answer Epic 7's deterministic investigation should be able to
  // reach without an LLM.
  ...equities("financials", [
    {
      symbol: "JPM",
      name: "JPMorgan Chase & Co.",
      exchange: "NYSE",
      industry: "Diversified Banks",
    },
    {
      symbol: "BAC",
      name: "Bank of America Corporation",
      exchange: "NYSE",
      industry: "Diversified Banks",
    },
    {
      symbol: "WFC",
      name: "Wells Fargo & Company",
      exchange: "NYSE",
      industry: "Diversified Banks",
    },
    {
      symbol: "C",
      name: "Citigroup Inc.",
      exchange: "NYSE",
      industry: "Diversified Banks",
    },
    {
      symbol: "GS",
      name: "The Goldman Sachs Group, Inc.",
      exchange: "NYSE",
      industry: "Investment Banking & Brokerage",
    },
    {
      symbol: "MS",
      name: "Morgan Stanley",
      exchange: "NYSE",
      industry: "Investment Banking & Brokerage",
    },
    {
      symbol: "SCHW",
      name: "The Charles Schwab Corporation",
      exchange: "NYSE",
      industry: "Investment Banking & Brokerage",
    },
    {
      symbol: "V",
      name: "Visa Inc.",
      exchange: "NYSE",
      industry: "Transaction & Payment Processing Services",
    },
    {
      symbol: "AXP",
      name: "American Express Company",
      exchange: "NYSE",
      industry: "Consumer Finance",
    },
  ]),

  // 9 — AMZN and TSLA live HERE and not in technology, which is `UNIVERSE.md`
  // §1's stated boundary rather than an oversight. Three automakers is the
  // deliberate spread: TSLA against GM and F is a peer comparison that will
  // usually disagree, which is more interesting than one that always agrees.
  ...equities("consumer_discretionary", [
    {
      symbol: "AMZN",
      name: "Amazon.com, Inc.",
      exchange: "NASDAQ",
      industry: "Broadline Retail",
    },
    {
      symbol: "TSLA",
      name: "Tesla, Inc.",
      exchange: "NASDAQ",
      industry: "Automobile Manufacturers",
    },
    {
      symbol: "GM",
      name: "General Motors Company",
      exchange: "NYSE",
      industry: "Automobile Manufacturers",
    },
    {
      symbol: "F",
      name: "Ford Motor Company",
      exchange: "NYSE",
      industry: "Automobile Manufacturers",
    },
    {
      symbol: "HD",
      name: "The Home Depot, Inc.",
      exchange: "NYSE",
      industry: "Home Improvement Retail",
    },
    {
      symbol: "LOW",
      name: "Lowe's Companies, Inc.",
      exchange: "NYSE",
      industry: "Home Improvement Retail",
    },
    {
      symbol: "MCD",
      name: "McDonald's Corporation",
      exchange: "NYSE",
      industry: "Restaurants",
    },
    {
      symbol: "SBUX",
      name: "Starbucks Corporation",
      exchange: "NASDAQ",
      industry: "Restaurants",
    },
    {
      symbol: "NKE",
      name: "NIKE, Inc.",
      exchange: "NYSE",
      industry: "Apparel, Accessories & Luxury Goods",
    },
  ]),

  // 7 — GOOGL and META live HERE and not in technology, the other half of
  // §1's stated boundary. The two telecoms are the market-cap spread: they
  // move on interest rates rather than on advertising, so this sector's breadth
  // number is genuinely informative rather than a proxy for two mega-caps.
  ...equities("communication_services", [
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      exchange: "NASDAQ",
      industry: "Interactive Media & Services",
    },
    {
      symbol: "META",
      name: "Meta Platforms, Inc.",
      exchange: "NASDAQ",
      industry: "Interactive Media & Services",
    },
    {
      symbol: "NFLX",
      name: "Netflix, Inc.",
      exchange: "NASDAQ",
      industry: "Movies & Entertainment",
    },
    {
      symbol: "DIS",
      name: "The Walt Disney Company",
      exchange: "NYSE",
      industry: "Movies & Entertainment",
    },
    {
      symbol: "WBD",
      name: "Warner Bros. Discovery, Inc.",
      exchange: "NASDAQ",
      industry: "Movies & Entertainment",
    },
    {
      symbol: "T",
      name: "AT&T Inc.",
      exchange: "NYSE",
      industry: "Integrated Telecommunication Services",
    },
    {
      symbol: "VZ",
      name: "Verizon Communications Inc.",
      exchange: "NYSE",
      industry: "Integrated Telecommunication Services",
    },
  ]),

  // 8 — three aerospace names, which is the second-deepest industry group in
  // the file after semiconductors and exists so that §11's breadth reading has
  // somewhere to be tested that the demo does not already own.
  ...equities("industrials", [
    {
      symbol: "GE",
      name: "GE Aerospace",
      exchange: "NYSE",
      industry: "Aerospace & Defense",
    },
    {
      symbol: "BA",
      name: "The Boeing Company",
      exchange: "NYSE",
      industry: "Aerospace & Defense",
    },
    {
      symbol: "LMT",
      name: "Lockheed Martin Corporation",
      exchange: "NYSE",
      industry: "Aerospace & Defense",
    },
    {
      symbol: "CAT",
      name: "Caterpillar Inc.",
      exchange: "NYSE",
      industry: "Construction Machinery & Heavy Transportation Equipment",
    },
    {
      symbol: "DE",
      name: "Deere & Company",
      exchange: "NYSE",
      industry: "Agricultural & Farm Machinery",
    },
    {
      symbol: "HON",
      name: "Honeywell International Inc.",
      exchange: "NASDAQ",
      industry: "Industrial Conglomerates",
    },
    {
      symbol: "UPS",
      name: "United Parcel Service, Inc.",
      exchange: "NYSE",
      industry: "Air Freight & Logistics",
    },
    {
      symbol: "DAL",
      name: "Delta Air Lines, Inc.",
      exchange: "NYSE",
      industry: "Passenger Airlines",
    },
  ]),

  // 7 — the defensive sector, and the one whose value to this product is that
  // it usually does NOT move with technology. An anomaly score is a comparison,
  // and a universe of only cyclicals gives it nothing to be unusual against.
  ...equities("consumer_staples", [
    {
      symbol: "PG",
      name: "The Procter & Gamble Company",
      exchange: "NYSE",
      industry: "Household Products",
    },
    {
      symbol: "KO",
      name: "The Coca-Cola Company",
      exchange: "NYSE",
      industry: "Soft Drinks & Non-alcoholic Beverages",
    },
    {
      symbol: "PEP",
      name: "PepsiCo, Inc.",
      exchange: "NASDAQ",
      industry: "Soft Drinks & Non-alcoholic Beverages",
    },
    {
      symbol: "COST",
      name: "Costco Wholesale Corporation",
      exchange: "NASDAQ",
      industry: "Consumer Staples Merchandise Retail",
    },
    {
      symbol: "WMT",
      name: "Walmart Inc.",
      exchange: "NYSE",
      industry: "Consumer Staples Merchandise Retail",
    },
    {
      symbol: "MO",
      name: "Altria Group, Inc.",
      exchange: "NYSE",
      industry: "Tobacco",
    },
    {
      symbol: "KHC",
      name: "The Kraft Heinz Company",
      exchange: "NASDAQ",
      industry: "Packaged Foods & Meats",
    },
  ]),

  // 7 — the sector that most reliably moves as a bloc, on a commodity price
  // nothing else in the universe reacts to. That makes it the cleanest test
  // case Epic 5's relative-move has: an energy name down 4% while the sector is
  // down 4% is not news, and the score has to say so.
  ...equities("energy", [
    {
      symbol: "XOM",
      name: "Exxon Mobil Corporation",
      exchange: "NYSE",
      industry: "Integrated Oil & Gas",
    },
    {
      symbol: "CVX",
      name: "Chevron Corporation",
      exchange: "NYSE",
      industry: "Integrated Oil & Gas",
    },
    {
      symbol: "COP",
      name: "ConocoPhillips",
      exchange: "NYSE",
      industry: "Oil & Gas Exploration & Production",
    },
    {
      symbol: "EOG",
      name: "EOG Resources, Inc.",
      exchange: "NYSE",
      industry: "Oil & Gas Exploration & Production",
    },
    {
      symbol: "DVN",
      name: "Devon Energy Corporation",
      exchange: "NYSE",
      industry: "Oil & Gas Exploration & Production",
    },
    {
      symbol: "SLB",
      name: "SLB",
      exchange: "NYSE",
      industry: "Oil & Gas Equipment & Services",
    },
    {
      symbol: "HAL",
      name: "Halliburton Company",
      exchange: "NYSE",
      industry: "Oil & Gas Equipment & Services",
    },
  ]),

  // 6 — at §7's floor, and that is a decision rather than a shortfall. There
  // are not many large, IEX-liquid US utilities, and rule 4 (liquid on IEX)
  // beats padding the block with thin names whose anomaly scores would be
  // computed over noise. Six is the number below which a breadth percentage
  // stops meaning anything, so this sector sits exactly on the line.
  ...equities("utilities", [
    {
      symbol: "NEE",
      name: "NextEra Energy, Inc.",
      exchange: "NYSE",
      industry: "Electric Utilities",
    },
    {
      symbol: "DUK",
      name: "Duke Energy Corporation",
      exchange: "NYSE",
      industry: "Electric Utilities",
    },
    {
      symbol: "SO",
      name: "The Southern Company",
      exchange: "NYSE",
      industry: "Electric Utilities",
    },
    {
      symbol: "AEP",
      name: "American Electric Power Company, Inc.",
      exchange: "NASDAQ",
      industry: "Electric Utilities",
    },
    {
      symbol: "EXC",
      name: "Exelon Corporation",
      exchange: "NASDAQ",
      industry: "Electric Utilities",
    },
    {
      symbol: "SRE",
      name: "Sempra",
      exchange: "NYSE",
      industry: "Multi-Utilities",
    },
  ]),

  // 6 — at the floor, for the same liquidity reason as utilities. Note AMT and
  // CCI: they are REITs that own mobile-phone towers, so they trade on interest
  // rates and on telecom capital spending at once. Epic 6's topology should
  // eventually put an edge between them and the telecoms above, and this file
  // is why there is something to connect.
  ...equities("real_estate", [
    {
      symbol: "PLD",
      name: "Prologis, Inc.",
      exchange: "NYSE",
      industry: "Industrial REITs",
    },
    {
      symbol: "AMT",
      name: "American Tower Corporation",
      exchange: "NYSE",
      industry: "Telecom Tower REITs",
    },
    {
      symbol: "CCI",
      name: "Crown Castle Inc.",
      exchange: "NYSE",
      industry: "Telecom Tower REITs",
    },
    {
      symbol: "SPG",
      name: "Simon Property Group, Inc.",
      exchange: "NYSE",
      industry: "Retail REITs",
    },
    {
      symbol: "O",
      name: "Realty Income Corporation",
      exchange: "NYSE",
      industry: "Retail REITs",
    },
    {
      symbol: "EQIX",
      name: "Equinix, Inc.",
      exchange: "NASDAQ",
      industry: "Data Center REITs",
    },
  ]),

  // 6 — at the floor. The widest industry spread of any block: industrial
  // gases, paint, bulk chemicals, gold and copper have almost nothing in
  // common, which makes this the sector where a sector-level breadth number is
  // least informative and the industry column earns its place.
  ...equities("materials", [
    {
      symbol: "LIN",
      name: "Linde plc",
      exchange: "NASDAQ",
      industry: "Industrial Gases",
    },
    {
      symbol: "APD",
      name: "Air Products and Chemicals, Inc.",
      exchange: "NYSE",
      industry: "Industrial Gases",
    },
    {
      symbol: "SHW",
      name: "The Sherwin-Williams Company",
      exchange: "NYSE",
      industry: "Specialty Chemicals",
    },
    {
      symbol: "DOW",
      name: "Dow Inc.",
      exchange: "NYSE",
      industry: "Commodity Chemicals",
    },
    {
      symbol: "NEM",
      name: "Newmont Corporation",
      exchange: "NYSE",
      industry: "Gold",
    },
    {
      symbol: "FCX",
      name: "Freeport-McMoRan Inc.",
      exchange: "NYSE",
      industry: "Copper",
    },
  ]),
];

/**
 * The tracked universe: every security MarketPulse follows.
 *
 * Ordered proxies-first because that is the order a reader wants — the fifteen
 * benchmarks everything else is measured against, then the things being
 * measured — and because nothing depends on the order. The loader keys on
 * `symbol`.
 *
 * **There is deliberately no count here and no assertion of one.** §6 of
 * PRODUCT_SPEC.md asks for expansion to 500 without a redesign, and the way a
 * hard-coded 100 gets into a codebase is as an `EXPECTED_COUNT` beside the list
 * that somebody then reads as a contract. `UNIVERSE.md` §9 records what today's
 * count is; anything that needs it computes `UNIVERSE.length`.
 */
export const UNIVERSE: readonly Security[] = [
  ...SECTOR_PROXIES,
  ...INDEX_PROXIES,
  ...EQUITIES,
];

/**
 * When this file was last checked against a source, and what that source is.
 *
 * **This exists because the obvious implementation of the loader is wrong**, and
 * the wrongness is invisible. `0003_security_vocabulary.sql` makes
 * `profile_retrieved_at` and `classification_retrieved_at` `not null` with no
 * default, so the loader has to supply a value; the tempting one is `now()`, and
 * `now()` makes the column mean *when the loader last ran*. That is always
 * today, carries no information, and destroys the one thing `UNIVERSE.md` §5
 * offers against this file's silent staleness — it names
 * `classification_retrieved_at` as the mitigation that "makes the file's age
 * visible on screen through Story 2.14 rather than only in git history". A
 * timestamp that resets on every deploy makes the age permanently invisible and
 * turns the mitigation into decoration.
 *
 * So the column means **when the data was last checked against its source**, and
 * for a curated list that is a value only the file can state. It lives here
 * rather than in the loader for the same reason the rows do: the loader is a
 * mechanism and does not know when a person last read a fund's fact sheet. Move
 * the date **when you have actually re-checked the list**, in the same commit as
 * whatever that check changed — and note that moving it is the whole point.
 * Leaving it at 2026-09-05 while the file drifts is exactly the state Story 2.14
 * is meant to be able to show a user.
 *
 * `Date`-free on purpose: a plain `YYYY-MM-DD` string is what a person edits and
 * reviews in a diff, and the loader parses it as UTC midnight so a run in any
 * timezone stores the same instant. A malformed value is a violation the loader
 * reports beside every other one rather than an `Invalid Date` reaching Postgres.
 *
 * **Two groups and not four**, matching the two `0003` gave columns to.
 * `identity` (`cik`) waits for Epic 9 and `ours` (`kind`, `status`) gets no pair
 * at all, because "we decided this" is not a retrieval — the reasoning is
 * `SECURITY_FIELD_GROUP`'s in `packages/shared` and `UNIVERSE.md` §4.
 *
 * The `source` strings are what Story 2.14 renders. `curated` rather than a file
 * path or a git SHA: a path is a fact about this repository's layout that a
 * screen has no use for, and a SHA is a claim about *when it was typed*, which
 * is the claim this constant exists to separate from.
 */
export const UNIVERSE_PROVENANCE: Record<
  Extract<SecurityFieldGroup, "profile" | "classification">,
  { readonly source: string; readonly checkedOn: string }
> = {
  profile: { source: "curated", checkedOn: "2026-09-05" },
  classification: { source: "curated", checkedOn: "2026-09-05" },
};
