// The tracked universe: the securities MarketPulse watches, as data.
//
// This is the list PRODUCT_SPEC.md §6 asks for — its stated V1 range is
// "100-500 liquid US-listed equities plus a small number of useful ETFs", and
// since Task 2.8.2 this file sits at the top of it: the **S&P 500** plus the
// eleven sector SPDRs and four market proxies, 518 securities. It is the input
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
// has the same source, per group.** All 503 equities' profile fields (`symbol`,
// `name`, `exchange`) come from Alpaca's asset catalogue and all their
// classification fields (`sector`, `industry`) from the published S&P 500 GICS
// classification, so the loader writes one source string per group for the whole
// file and no row needs an override. The fifteen ETFs are the stated exception
// and are curated by hand, because neither source classifies a fund — see
// {@link UNIVERSE_PROVENANCE}.
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
 * **A labelled tuple rather than an object, and that is a decision the size
 * forced.** At 86 equities the object form fitted on five lines a reviewer read
 * as one unit; at 503 it is ~2,500 lines, and a tuple carrying the same fields
 * is one line each. The labels survive in the type — an editor still shows
 * `symbol`, `name`, `exchange` on hover — so what is lost is the field name at
 * the call site and what is bought is a whole industry group visible at once,
 * which is exactly the property `UNIVERSE.md` §5 justifies this file with.
 *
 * **`industry` is NOT on the row**, and that is §5's grouping argument applied
 * one level down. The sector has never been on a row: it is a single typed
 * argument per block, so a sector outside {@link SECTORS} is one compile error
 * rather than one per row, and a row cannot acquire the wrong sector by being
 * pasted into the wrong place. Every word of that is true of the industry group
 * as well — and it buys something the sector version did not, because the group
 * is what PRODUCT_SPEC.md §11's breadth example counts, so a block's length is
 * the number that example is arithmetic over. You can read the depth of
 * `Semiconductors & Semiconductor Equipment` off the file.
 *
 * `symbol` is a plain `string` here and a `Ticker` on the far side of the
 * constructors below. That is the one cost `UNIVERSE.md` §6 stated in advance:
 * `Security.symbol` is branded, so `"AAPL"` does not satisfy it and every row
 * would otherwise read `toTicker("AAPL")`. Wrapping 500 rows individually is
 * noise in a file whose whole job is to read as data, so the wrapping happens in
 * one place — which is also the only place it could be validated, and a curated
 * file is exactly where a boundary check belongs. A malformed ticker is a
 * `TypeError` at module load naming the value, not a symbol that quietly matches
 * nothing.
 */
type CuratedRow = readonly [symbol: string, name: string, exchange: string];

/**
 * The equities of one sector and one industry group.
 *
 * `cik` is `null` on every row, and that is the stated instruction rather than
 * an omission: it is Epic 9's field, Epic 9 will trust it, and **a guessed
 * identifier is worse than an absent one**. Task 2.8.2 had a validated CIK for
 * all 503 in front of it — the S&P 500 constituent list carries one — and
 * deliberately did not write it, because populating a field with no reader is
 * the quiet over-building this repository has already had to remove twice, and
 * because EDGAR is the authority for a CIK rather than a constituent table.
 * It is null forever for the ETFs below, which do not file the reports Epic 9
 * reads.
 */
function equities(
  sector: Sector,
  industry: string,
  rows: readonly CuratedRow[],
): readonly EquitySecurity[] {
  return rows.map(([symbol, name, exchange]) => ({
    kind: "equity",
    symbol: toTicker(symbol),
    name,
    exchange,
    sector,
    industry,
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
    ["SPY", "SPDR S&P 500 ETF Trust", "ARCA"],
    ["QQQ", "Invesco QQQ Trust, Series 1", "NASDAQ"],
    ["DIA", "SPDR Dow Jones Industrial Average ETF Trust", "ARCA"],
    ["IWM", "iShares Russell 2000 ETF", "ARCA"],
  ] as const satisfies readonly CuratedRow[]
).map(([symbol, name, exchange]) => ({
  kind: "index_etf",
  symbol: toTicker(symbol),
  name,
  exchange,
  sector: null,
  industry: null,
  status: "active",
  cik: null,
}));

/**
 * The equities: **the S&P 500, as published**, grouped by GICS sector and then
 * by GICS industry group.
 *
 * **Membership is an index rather than an allocation, and that is the change
 * Task 2.8.2 made.** Until then this list was 86 names hand-allocated against
 * `UNIVERSE.md` §7 — a floor of six and a ceiling of twelve per sector, chosen
 * so a naive "top 100 by market cap" universe (~40% technology, most sectors too
 * thin to be relative to anything) did not happen. That rule did its job and is
 * now **superseded rather than broken**: an index constituent list needs no
 * allocation rule, because the index already is one, and unlike a hand
 * allocation it is a rule a reader can check against a published source.
 *
 * **Why this index and not a bigger list.** `UNIVERSE.md` §5 declined a metadata
 * fetcher and §10 declined deriving sectors from the sector-SPDR holdings, on
 * one decisive objection: *the SPDRs hold S&P 500 constituents only, so every
 * tracked equity outside the index would derive to no sector at all.* Defining
 * the universe **as** that index dissolves the objection rather than working
 * around it — coverage becomes 100% by construction, the eleven sector SPDRs
 * partition the list exactly, and `SECTOR_ETFS` stops being a mapping we assert
 * and becomes one the data satisfies. That is why the size and the metadata
 * source had to be settled in the same breath, which is what §10 meant by
 * "settle §5 before picking a number".
 *
 * **The classification is GICS at two levels and neither is invented.** `sector`
 * is the GICS sector, which §1 already shaped this product's eleven around.
 * `industry` is the GICS **industry group** (level 2, 25 of them) rather than the
 * sub-industry (level 4, 127 of them) this file carried before. That is the
 * coarsening §10 called free and never blocked, and it is a published level of a
 * published taxonomy rather than merges we chose: 45 labels at a mean depth of
 * 1.91 with 23 singletons become 25 groups at a mean depth of 20.1 with **none**.
 * PRODUCT_SPEC.md §11's worked breadth example — "82% of semiconductor
 * securities currently negative" — needs a group of at least 11 to be reachable
 * at all, and was arithmetic over 8; `Semiconductors & Semiconductor Equipment`
 * is 20 here, and 20 of the 25 groups clear that bar.
 *
 * **The liquidity rule that used to pull the other way is gone, and it is worth
 * saying why rather than letting it lapse.** §7 required names liquid *on IEX*,
 * because Alpaca's free tier is IEX and a name thin there gives an anomaly score
 * computed over noise. Task 2.7.1 measured that the free plan is asymmetric: the
 * live stream is IEX, but **historical bars default to SIP** — 99.7% mean minute
 * coverage against IEX's 82.8%. So the constraint survives for Epic 3's live
 * feed and does not bind anything Story 2.8 stores, and it would not have
 * excluded an S&P 500 constituent in any case.
 *
 * Ordering is `SECTORS` order, then industry groups by descending depth, then
 * symbol. None of it is load-bearing — the loader keys on `symbol` — and all of
 * it is for the reader.
 */
const EQUITIES: readonly EquitySecurity[] = [
  // technology — 73 of 503, in 3 industry groups.
  ...equities("technology", "Software & Services", [
    ["ACN", "Accenture PLC", "NYSE"],
    ["ADBE", "Adobe Inc.", "NASDAQ"],
    ["ADSK", "Autodesk, Inc.", "NASDAQ"],
    ["AKAM", "Akamai Technologies, Inc.", "NASDAQ"],
    ["CDNS", "Cadence Design Systems, Inc.", "NASDAQ"],
    ["CRM", "Salesforce, Inc.", "NYSE"],
    ["CRWD", "CrowdStrike Holdings, Inc. Class A", "NASDAQ"],
    ["CTSH", "Cognizant Technology Solutions Corporation Class A", "NASDAQ"],
    ["DDOG", "Datadog, Inc. Class A", "NASDAQ"],
    ["FICO", "Fair Isaac Corporation", "NYSE"],
    ["FTNT", "Fortinet, Inc.", "NASDAQ"],
    ["GDDY", "GoDaddy Inc", "NYSE"],
    ["GEN", "Gen Digital Inc.", "NASDAQ"],
    ["IBM", "International Business Machines Corporation", "NYSE"],
    ["INTU", "Intuit Inc.", "NASDAQ"],
    ["IT", "Gartner, Inc.", "NYSE"],
    ["MSFT", "Microsoft Corporation", "NASDAQ"],
    ["NOW", "ServiceNow, Inc.", "NYSE"],
    ["ORCL", "Oracle Corp", "NYSE"],
    ["PANW", "Palo Alto Networks, Inc.", "NASDAQ"],
    ["PLTR", "Palantir Technologies Inc. Class A", "NASDAQ"],
    ["PTC", "PTC Inc.", "NASDAQ"],
    ["SNPS", "Synopsys, Inc.", "NASDAQ"],
    ["TRMB", "Trimble Inc.", "NASDAQ"],
    ["TYL", "Tyler Technologies, Inc.", "NYSE"],
    ["VRSN", "VeriSign, Inc.", "NASDAQ"],
    ["WDAY", "Workday, Inc. Class A", "NASDAQ"],
  ]),
  ...equities("technology", "Technology Hardware & Equipment", [
    ["AAPL", "Apple Inc.", "NASDAQ"],
    ["ANET", "Arista Networks", "NYSE"],
    ["APH", "Amphenol Corporation", "NYSE"],
    ["CDW", "CDW Corporation", "NASDAQ"],
    ["CIEN", "Ciena Corporation", "NYSE"],
    ["COHR", "Coherent Corp.", "NYSE"],
    ["CSCO", "Cisco Systems, Inc.", "NASDAQ"],
    ["DELL", "Dell Technologies Inc.", "NYSE"],
    ["FFIV", "F5, Inc.", "NASDAQ"],
    ["FLEX", "Flex Ltd.", "NASDAQ"],
    ["GLW", "Corning Incorporated", "NYSE"],
    ["HPE", "Hewlett Packard Enterprise Company", "NYSE"],
    ["HPQ", "HP Inc.", "NYSE"],
    ["JBL", "Jabil Inc.", "NYSE"],
    ["KEYS", "Keysight Technologies, Inc.", "NYSE"],
    ["LITE", "Lumentum Holdings Inc.", "NASDAQ"],
    ["MSI", "Motorola Solutions, Inc.", "NYSE"],
    ["NTAP", "NetApp, Inc.", "NASDAQ"],
    ["ROP", "Roper Technologies, Inc.", "NASDAQ"],
    ["SMCI", "Super Micro Computer, Inc.", "NASDAQ"],
    ["SNDK", "Sandisk Corporation", "NASDAQ"],
    ["STX", "Seagate Technology Holdings PLC", "NASDAQ"],
    ["TDY", "Teledyne Technologies Incorporated", "NYSE"],
    ["TEL", "TE Connectivity plc", "NYSE"],
    ["WDC", "Western Digital Corporation", "NASDAQ"],
    ["ZBRA", "Zebra Technologies Corporation Class A", "NASDAQ"],
  ]),
  ...equities("technology", "Semiconductors & Semiconductor Equipment", [
    ["ADI", "Analog Devices, Inc.", "NASDAQ"],
    ["AMAT", "Applied Materials, Inc.", "NASDAQ"],
    ["AMD", "Advanced Micro Devices, Inc.", "NASDAQ"],
    ["AVGO", "Broadcom Inc.", "NASDAQ"],
    ["FSLR", "First Solar, Inc.", "NASDAQ"],
    ["INTC", "Intel Corporation", "NASDAQ"],
    ["KLAC", "KLA Corporation", "NASDAQ"],
    ["LRCX", "Lam Research Corporation", "NASDAQ"],
    ["MCHP", "Microchip Technology Incorporated", "NASDAQ"],
    ["MPWR", "Monolithic Power Systems, Inc.", "NASDAQ"],
    ["MRVL", "Marvell Technology, Inc.", "NASDAQ"],
    ["MU", "Micron Technology, Inc.", "NASDAQ"],
    ["NVDA", "NVIDIA Corporation", "NASDAQ"],
    ["NXPI", "NXP Semiconductors N.V.", "NASDAQ"],
    ["ON", "ON Semiconductor Corporation", "NASDAQ"],
    ["Q", "Qnity Electronics, Inc.", "NYSE"],
    ["QCOM", "QUALCOMM Incorporated", "NASDAQ"],
    ["SWKS", "Skyworks Solutions, Inc.", "NASDAQ"],
    ["TER", "Teradyne, Inc.", "NASDAQ"],
    ["TXN", "Texas Instruments Incorporated", "NASDAQ"],
  ]),

  // health_care — 59 of 503, in 2 industry groups.
  ...equities("health_care", "Health Care Equipment & Services", [
    ["ABT", "Abbott Laboratories", "NYSE"],
    ["ALGN", "Align Technology, Inc.", "NASDAQ"],
    ["BAX", "Baxter International Inc.", "NYSE"],
    ["BDX", "Becton, Dickinson and Co.", "NYSE"],
    ["BSX", "Boston Scientific Corp.", "NYSE"],
    ["CAH", "Cardinal Health, Inc.", "NYSE"],
    ["CI", "The Cigna Group", "NYSE"],
    ["CNC", "Centene Corporation", "NYSE"],
    ["COO", "The Cooper Companies, Inc.", "NASDAQ"],
    ["COR", "Cencora, Inc.", "NYSE"],
    ["CVS", "CVS Health Corporation", "NYSE"],
    ["DGX", "Quest Diagnostics Inc.", "NYSE"],
    ["DVA", "DaVita Inc.", "NYSE"],
    ["DXCM", "DexCom, Inc.", "NASDAQ"],
    ["ELV", "Elevance Health, Inc.", "NYSE"],
    ["EW", "Edwards Lifesciences Corp", "NYSE"],
    ["GEHC", "GE HealthCare Technologies Inc.", "NASDAQ"],
    ["HCA", "HCA Healthcare, Inc.", "NYSE"],
    ["HSIC", "Henry Schein, Inc.", "NASDAQ"],
    ["HUM", "Humana Inc.", "NYSE"],
    ["IDXX", "IDEXX Laboratories, Inc.", "NASDAQ"],
    ["ISRG", "Intuitive Surgical, Inc.", "NASDAQ"],
    ["LH", "Labcorp Holdings Inc.", "NYSE"],
    ["MCK", "McKesson Corporation", "NYSE"],
    ["MDT", "Medtronic plc", "NYSE"],
    ["PODD", "Insulet Corporation", "NASDAQ"],
    ["RMD", "ResMed Inc.", "NYSE"],
    ["RVTY", "Revvity, Inc.", "NYSE"],
    ["SOLV", "Solventum Corporation", "NYSE"],
    ["STE", "STERIS plc", "NYSE"],
    ["SYK", "Stryker Corporation", "NYSE"],
    ["UHS", "Universal Health Services, Inc. Class B", "NYSE"],
    ["UNH", "UNITEDHEALTH GROUP INCORPORATED (Delaware)", "NYSE"],
    ["VEEV", "Veeva Systems Inc.", "NYSE"],
    ["WST", "West Pharmaceutical Services, Inc.", "NYSE"],
    ["ZBH", "Zimmer Biomet Holdings, Inc.", "NYSE"],
  ]),
  ...equities("health_care", "Pharmaceuticals, Biotechnology & Life Sciences", [
    ["A", "Agilent Technologies Inc.", "NYSE"],
    ["ABBV", "AbbVie Inc.", "NYSE"],
    ["AMGN", "Amgen Inc.", "NASDAQ"],
    ["BIIB", "Biogen Inc.", "NASDAQ"],
    ["BMY", "Bristol-Myers Squibb Co.", "NYSE"],
    ["CRL", "Charles River Laboratories International, Inc.", "NYSE"],
    ["DHR", "Danaher Corporation", "NYSE"],
    ["GILD", "Gilead Sciences, Inc.", "NASDAQ"],
    ["INCY", "Incyte Corp.", "NASDAQ"],
    ["IQV", "IQVIA Holdings Inc.", "NYSE"],
    ["JNJ", "Johnson & Johnson", "NYSE"],
    ["LLY", "Eli Lilly & Co.", "NYSE"],
    ["MRK", "Merck & Co., Inc.", "NYSE"],
    ["MRNA", "Moderna, Inc.", "NASDAQ"],
    ["MTD", "Mettler-Toledo International", "NYSE"],
    ["PFE", "Pfizer Inc.", "NYSE"],
    ["REGN", "Regeneron Pharmaceuticals, Inc.", "NASDAQ"],
    ["TECH", "Bio-Techne Corp", "NASDAQ"],
    ["TMO", "Thermo Fisher Scientific, Inc.", "NYSE"],
    ["VRTX", "Vertex Pharmaceuticals Incorporated", "NASDAQ"],
    ["VTRS", "Viatris Inc.", "NASDAQ"],
    ["WAT", "Waters Corp", "NYSE"],
    ["ZTS", "Zoetis Inc.", "NYSE"],
  ]),

  // financials — 76 of 503, in 3 industry groups.
  ...equities("financials", "Financial Services", [
    ["AMP", "Ameriprise Financial, Inc.", "NYSE"],
    ["APO", "Apollo Global Management, Inc.", "NYSE"],
    ["ARES", "Ares Management Corporation Class A", "NYSE"],
    ["AXP", "American Express Company", "NYSE"],
    ["BEN", "Franklin Templeton, Inc.", "NYSE"],
    ["BLK", "Blackrock, Inc.", "NYSE"],
    ["BNY", "Bank of New York Mellon Corporation", "NYSE"],
    ["BRK.B", "Berkshire Hathaway Inc. Class B", "NYSE"],
    ["BX", "Blackstone Inc.", "NYSE"],
    ["CBOE", "Cboe Global Markets, Inc.", "BATS"],
    ["CME", "CME Group Inc. Class A", "NASDAQ"],
    ["COF", "Capital One Financial", "NYSE"],
    ["COIN", "Coinbase Global, Inc. Class A", "NASDAQ"],
    ["CPAY", "Corpay, Inc.", "NYSE"],
    ["FDS", "Factset Research Systems", "NYSE"],
    ["FIS", "Fidelity National Information Services, Inc.", "NYSE"],
    ["FISV", "Fiserv, Inc.", "NASDAQ"],
    ["GPN", "Global Payments, Inc.", "NYSE"],
    ["GS", "Goldman Sachs Group Inc.", "NYSE"],
    ["HOOD", "Robinhood Markets, Inc. Class A", "NASDAQ"],
    ["IBKR", "Interactive Brokers Group, Inc. Class A", "NASDAQ"],
    ["ICE", "Intercontinental Exchange  Inc.", "NYSE"],
    ["IVZ", "Invesco LTD", "NYSE"],
    ["JKHY", "Jack Henry & Associates, Inc.", "NASDAQ"],
    ["KKR", "KKR & Co. Inc.", "NYSE"],
    ["MA", "Mastercard Incorporated", "NYSE"],
    ["MCO", "Moody's Corporation", "NYSE"],
    ["MS", "Morgan Stanley", "NYSE"],
    ["MSCI", "MSCI, Inc.", "NYSE"],
    ["NDAQ", "Nasdaq, Inc.", "NASDAQ"],
    ["NTRS", "Northern Trust Corporation", "NASDAQ"],
    ["PYPL", "PayPal Holdings, Inc.", "NASDAQ"],
    ["RJF", "Raymond James Financial, Inc.", "NYSE"],
    ["SCHW", "The Charles Schwab Corporation", "NYSE"],
    ["SPGI", "S&P Global Inc.", "NYSE"],
    ["STT", "State Street Corporation", "NYSE"],
    ["SYF", "Synchrony Financial", "NYSE"],
    ["TROW", "T. Rowe Price Group, Inc.", "NASDAQ"],
    ["V", "VISA Inc.", "NYSE"],
    ["XYZ", "Block, Inc.", "NYSE"],
  ]),
  ...equities("financials", "Insurance", [
    ["ACGL", "Arch Capital Group Ltd.", "NASDAQ"],
    ["AFL", "Aflac Inc.", "NYSE"],
    ["AIG", "American International Group, Inc.", "NYSE"],
    ["AIZ", "Assurant, Inc.", "NYSE"],
    ["AJG", "Arthur J. Gallagher & Co.", "NYSE"],
    ["ALL", "The Allstate Corporation", "NYSE"],
    ["AON", "Aon plc Class A", "NYSE"],
    ["BRO", "Brown & Brown, Inc.", "NYSE"],
    ["CB", "Chubb Limited", "NYSE"],
    ["CINF", "Cincinnati Financial Corporation", "NASDAQ"],
    ["EG", "Everest Group, Ltd.", "NYSE"],
    ["ERIE", "Erie Indemnity Company Class A", "NASDAQ"],
    ["GL", "Globe Life Inc.", "NYSE"],
    ["HIG", "The Hartford Insurance Group, Inc.", "NYSE"],
    ["L", "Loews Corporation", "NYSE"],
    ["MET", "MetLife, Inc.", "NYSE"],
    ["MRSH", "Marsh", "NYSE"],
    ["PFG", "Principal Financial Group Inc", "NASDAQ"],
    ["PGR", "Progressive Corporation", "NYSE"],
    ["PRU", "Prudential Financial, Inc.", "NYSE"],
    ["TRV", "The Travelers Companies, Inc.", "NYSE"],
    ["WRB", "W.R. Berkley Corporation", "NYSE"],
    ["WTW", "Willis Towers Watson Public Limited Company", "NASDAQ"],
  ]),
  ...equities("financials", "Banks", [
    ["BAC", "Bank of America Corporation", "NYSE"],
    ["C", "Citigroup Inc.", "NYSE"],
    ["CFG", "Citizens Financial Group, Inc.", "NYSE"],
    ["FITB", "Fifth Third Bancorp", "NYSE"],
    ["HBAN", "Huntington Bancshares Incorporated", "NASDAQ"],
    ["JPM", "JPMorgan Chase & Co.", "NYSE"],
    ["KEY", "KeyCorp", "NYSE"],
    ["MTB", "M&T Bank Corp.", "NYSE"],
    ["PNC", "PNC Financial Services Group", "NYSE"],
    ["RF", "Regions Financial Corp.", "NYSE"],
    ["TFC", "Truist Financial Corporation", "NYSE"],
    ["USB", "U.S. Bancorp", "NYSE"],
    ["WFC", "Wells Fargo & Co.", "NYSE"],
  ]),

  // consumer_discretionary — 47 of 503, in 4 industry groups.
  ...equities("consumer_discretionary", "Consumer Services", [
    ["ABNB", "Airbnb, Inc. Class A", "NASDAQ"],
    ["BKNG", "Booking Holdings Inc.", "NASDAQ"],
    ["CCL", "Carnival Corporation Ltd.", "NYSE"],
    ["CMG", "Chipotle Mexican Grill, Inc.", "NYSE"],
    ["DASH", "DoorDash, Inc. Class A", "NASDAQ"],
    ["DPZ", "Domino's Pizza Inc", "NASDAQ"],
    ["DRI", "Darden Restaurants, Inc.", "NYSE"],
    ["EXPE", "Expedia Group, Inc.", "NASDAQ"],
    ["HLT", "Hilton Worldwide Holdings Inc.", "NYSE"],
    ["LVS", "Las Vegas Sands Corp.", "NYSE"],
    ["MAR", "Marriott International Class A", "NASDAQ"],
    ["MCD", "McDonald's Corporation", "NYSE"],
    ["MGM", "MGM Resorts International", "NYSE"],
    ["NCLH", "Norwegian Cruise Line Holdings Ltd.", "NYSE"],
    ["RCL", "Royal Caribbean Group", "NYSE"],
    ["SBUX", "Starbucks Corporation", "NASDAQ"],
    ["WYNN", "Wynn Resorts, Limited", "NASDAQ"],
    ["YUM", "Yum! Brands, Inc.", "NYSE"],
  ]),
  ...equities(
    "consumer_discretionary",
    "Consumer Discretionary Distribution & Retail",
    [
      ["AMZN", "Amazon.com, Inc.", "NASDAQ"],
      ["AZO", "AutoZone, Inc.", "NYSE"],
      ["BBY", "Best Buy Company, Inc.", "NYSE"],
      ["CVNA", "Carvana Co.", "NYSE"],
      ["EBAY", "eBay Inc.", "NASDAQ"],
      ["GPC", "Genuine Parts Company", "NYSE"],
      ["HD", "Home Depot, Inc.", "NYSE"],
      ["LOW", "Lowe's Companies Inc.", "NYSE"],
      ["ORLY", "O'Reilly Automotive, Inc.", "NASDAQ"],
      ["ROST", "Ross Stores, Inc.", "NASDAQ"],
      ["TJX", "TJX Companies, Inc. (The)", "NYSE"],
      ["TSCO", "Tractor Supply Company", "NASDAQ"],
      ["ULTA", "Ulta Beauty, Inc.", "NASDAQ"],
      ["WSM", "Williams-Sonoma, Inc.", "NYSE"],
    ],
  ),
  ...equities("consumer_discretionary", "Consumer Durables & Apparel", [
    ["DECK", "Deckers Outdoor Corp", "NYSE"],
    ["DHI", "D.R. Horton Inc.", "NYSE"],
    ["GRMN", "Garmin Ltd", "NYSE"],
    ["HAS", "Hasbro, Inc.", "NASDAQ"],
    ["LEN", "Lennar Corporation Class A", "NYSE"],
    ["LULU", "lululemon athletica inc.", "NASDAQ"],
    ["NKE", "Nike, Inc.", "NYSE"],
    ["NVR", "NVR, Inc.", "NYSE"],
    ["PHM", "Pultegroup, Inc.", "NYSE"],
    ["RL", "Ralph Lauren Corporation", "NYSE"],
    ["TPR", "Tapestry, Inc.", "NYSE"],
  ]),
  ...equities("consumer_discretionary", "Automobiles & Components", [
    ["APTV", "Aptiv PLC", "NYSE"],
    ["F", "Ford Motor Company", "NYSE"],
    ["GM", "General Motors Company", "NYSE"],
    ["TSLA", "Tesla, Inc.", "NASDAQ"],
  ]),

  // communication_services — 24 of 503, in 2 industry groups.
  ...equities("communication_services", "Media & Entertainment", [
    ["APP", "Applovin Corporation Class A", "NASDAQ"],
    ["CHTR", "Charter Communications, Inc. Class A", "NASDAQ"],
    ["CMCSA", "Comcast Corporation Class A", "NASDAQ"],
    ["DIS", "The Walt Disney Company", "NYSE"],
    ["FOX", "Fox Corporation Class B", "NASDAQ"],
    ["FOXA", "Fox Corporation Class A", "NASDAQ"],
    ["GOOG", "Alphabet Inc. Class C", "NASDAQ"],
    ["GOOGL", "Alphabet Inc. Class A", "NASDAQ"],
    ["LYV", "Live Nation Entertainment Inc.", "NYSE"],
    ["META", "Meta Platforms, Inc. Class A", "NASDAQ"],
    ["NFLX", "Netflix, Inc.", "NASDAQ"],
    ["NWS", "News Corporation Class B", "NASDAQ"],
    ["NWSA", "News Corporation Class A", "NASDAQ"],
    ["OMC", "Omnicom Group Inc.", "NYSE"],
    ["PSKY", "Paramount Skydance Corporation Class B", "NASDAQ"],
    ["RDDT", "Reddit, Inc.", "NYSE"],
    ["TKO", "TKO Group Holdings, Inc.", "NYSE"],
    ["TTD", "The Trade Desk, Inc. Class A", "NASDAQ"],
    ["TTWO", "Take-Two Interactive Software, Inc.", "NASDAQ"],
    ["WBD", "Warner Bros. Discovery, Inc. Series A", "NASDAQ"],
  ]),
  ...equities("communication_services", "Telecommunication Services", [
    ["ECHO", "EchoStar Corporation", "NASDAQ"],
    ["T", "AT&T Inc.", "NYSE"],
    ["TMUS", "T-Mobile US, Inc.", "NASDAQ"],
    ["VZ", "Verizon Communications", "NYSE"],
  ]),

  // industrials — 83 of 503, in 3 industry groups.
  ...equities("industrials", "Capital Goods", [
    ["ALLE", "Allegion Public Limited Company", "NYSE"],
    ["AME", "Ametek, Inc.", "NYSE"],
    ["AOS", "A.O. Smith Corporation", "NYSE"],
    ["AXON", "Axon Enterprise, Inc.", "NASDAQ"],
    ["BA", "Boeing Company", "NYSE"],
    ["BLDR", "Builders FirstSource, Inc.", "NYSE"],
    ["CARR", "Carrier Global Corporation", "NYSE"],
    ["CAT", "Caterpillar Inc.", "NYSE"],
    ["CMI", "Cummins Inc.", "NYSE"],
    ["DD", "DuPont de Nemours, Inc.", "NYSE"],
    ["DE", "Deere & Company", "NYSE"],
    ["DOV", "Dover Corporation", "NYSE"],
    ["EME", "EMCOR Group, Inc.", "NYSE"],
    ["EMR", "Emerson Electric Co.", "NYSE"],
    ["ETN", "Eaton Corporation, plc", "NYSE"],
    ["FAST", "Fastenal Company", "NASDAQ"],
    ["FERG", "Ferguson Enterprises Inc.", "NYSE"],
    ["FIX", "Comfort Systems USA, Inc.", "NYSE"],
    ["FTV", "Fortive Corporation", "NYSE"],
    ["GD", "General Dynamics Corporation", "NYSE"],
    ["GE", "GE Aerospace", "NYSE"],
    ["GEV", "GE Vernova Inc.", "NYSE"],
    ["GNRC", "Generac Holdings Inc.", "NYSE"],
    ["GWW", "W.W. Grainger, Inc.", "NYSE"],
    ["HII", "Huntington Ingalls Industries, Inc.", "NYSE"],
    ["HON", "Honeywell International Inc.", "NASDAQ"],
    ["HONA", "Honeywell Aerospace Inc.", "NASDAQ"],
    ["HUBB", "Hubbell Incorporated", "NYSE"],
    ["HWM", "Howmet Aerospace Inc.", "NYSE"],
    ["IEX", "IDEX Corporation", "NYSE"],
    ["IR", "Ingersoll Rand Inc.", "NYSE"],
    ["ITW", "Illinois Tool Works Inc.", "NYSE"],
    ["J", "Jacobs Solutions Inc.", "NYSE"],
    ["JCI", "Johnson Controls International plc", "NYSE"],
    ["LHX", "L3Harris Technologies, Inc.", "NYSE"],
    ["LII", "Lennox International Inc.", "NYSE"],
    ["LMT", "Lockheed Martin Corp.", "NYSE"],
    ["MAS", "Masco Corporation", "NYSE"],
    ["MMM", "3M Company", "NYSE"],
    ["NDSN", "Nordson Corporation", "NASDAQ"],
    ["NOC", "Northrop Grumman Corp.", "NYSE"],
    ["OTIS", "Otis Worldwide Corporation", "NYSE"],
    ["PCAR", "PACCAR Inc.", "NASDAQ"],
    ["PH", "Parker-Hannifin Corporation", "NYSE"],
    ["PNR", "Pentair plc", "NYSE"],
    ["PWR", "Quanta Services, Inc.", "NYSE"],
    ["ROK", "Rockwell Automation, Inc.", "NYSE"],
    ["RTX", "RTX Corporation", "NYSE"],
    ["SNA", "Snap-on Incorporated", "NYSE"],
    ["SWK", "Stanley Black & Decker, Inc.", "NYSE"],
    ["TDG", "TransDigm Group Incorporated", "NYSE"],
    ["TT", "Trane Technologies plc", "NYSE"],
    ["TXT", "Textron, Inc.", "NYSE"],
    ["URI", "United Rentals, Inc.", "NYSE"],
    ["VRT", "Vertiv Holdings Co Class A", "NYSE"],
    ["WAB", "Wabtec Inc.", "NYSE"],
    ["XYL", "Xylem Inc", "NYSE"],
  ]),
  ...equities("industrials", "Transportation", [
    ["CHRW", "C.H. Robinson Worldwide, Inc.", "NASDAQ"],
    ["CSX", "CSX Corporation", "NASDAQ"],
    ["DAL", "Delta Air Lines, Inc.", "NYSE"],
    ["EXPD", "Expeditors International of Washington, Inc.", "NYSE"],
    ["FDX", "FedEx Corporation", "NYSE"],
    ["FDXF", "FedEx Freight Holding Company, Inc.", "NYSE"],
    ["JBHT", "J.B. Hunt Transport Services, Inc.", "NASDAQ"],
    ["LUV", "Southwest Airlines Co.", "NYSE"],
    ["NSC", "Norfolk Southern Corp.", "NYSE"],
    ["ODFL", "Old Dominion Freight Line, Inc.", "NASDAQ"],
    ["UAL", "United Airlines Holdings, Inc.", "NASDAQ"],
    ["UBER", "Uber Technologies, Inc.", "NYSE"],
    ["UNP", "Union Pacific Corp.", "NYSE"],
    ["UPS", "United Parcel Service, Inc. Class B", "NYSE"],
  ]),
  ...equities("industrials", "Commercial & Professional Services", [
    ["ADP", "Automatic Data Processing, Inc.", "NASDAQ"],
    ["BR", "Broadridge Financial Solutions Inc", "NYSE"],
    ["CPRT", "Copart, Inc.", "NASDAQ"],
    ["CTAS", "Cintas Corporation", "NASDAQ"],
    ["EFX", "Equifax, Incorporated", "NYSE"],
    ["LDOS", "Leidos Holdings, Inc.", "NYSE"],
    ["PAYX", "Paychex, Inc.", "NASDAQ"],
    ["ROL", "Rollins, Inc.", "NYSE"],
    ["RSG", "Republic Services Inc.", "NYSE"],
    ["VLTO", "Veralto Corporation", "NYSE"],
    ["VRSK", "Verisk Analytics, Inc.", "NASDAQ"],
    ["WM", "Waste Management, Inc.", "NYSE"],
  ]),

  // consumer_staples — 34 of 503, in 3 industry groups.
  ...equities("consumer_staples", "Food, Beverage & Tobacco", [
    ["ADM", "Archer Daniels Midland Company", "NYSE"],
    ["BF.B", "Brown-Forman Corporation Class B", "NYSE"],
    ["BG", "Bunge Global SA", "NYSE"],
    ["GIS", "General Mills, Inc.", "NYSE"],
    ["HRL", "Hormel Foods Corporation", "NYSE"],
    ["HSY", "The Hershey Company", "NYSE"],
    ["KDP", "Keurig Dr Pepper Inc.", "NASDAQ"],
    ["KHC", "The Kraft Heinz Company", "NASDAQ"],
    ["KO", "Coca-Cola Company", "NYSE"],
    ["MDLZ", "Mondelez International, Inc. Class A", "NASDAQ"],
    ["MKC", "McCormick & Company, Incorporated Non-VTG CS", "NYSE"],
    ["MNST", "Monster Beverage Corporation", "NASDAQ"],
    ["MO", "Altria Group, Inc.", "NYSE"],
    ["PEP", "PepsiCo, Inc.", "NASDAQ"],
    ["PM", "Philip Morris International Inc.", "NYSE"],
    ["SJM", "The J.M. Smucker Company", "NYSE"],
    ["STZ", "Constellation Brands, Inc.", "NYSE"],
    ["TAP", "Molson Coors Beverage Company Class B", "NYSE"],
    ["TSN", "Tyson Foods, Inc.", "NYSE"],
  ]),
  ...equities("consumer_staples", "Consumer Staples Distribution & Retail", [
    ["CASY", "Casey's General Stores, Inc.", "NASDAQ"],
    ["COST", "Costco Wholesale Corporation", "NASDAQ"],
    ["DG", "Dollar General Corp.", "NYSE"],
    ["DLTR", "Dollar Tree Inc.", "NASDAQ"],
    ["KR", "The Kroger Co.", "NYSE"],
    ["SYY", "Sysco Corporation", "NYSE"],
    ["TGT", "Target Corporation", "NYSE"],
    ["WMT", "Walmart Inc.", "NASDAQ"],
  ]),
  ...equities("consumer_staples", "Household & Personal Products", [
    ["CHD", "Church & Dwight Co., Inc.", "NYSE"],
    ["CL", "Colgate-Palmolive Company", "NYSE"],
    ["CLX", "Clorox Company", "NYSE"],
    ["EL", "The Estee Lauder Companies Inc. Class A", "NYSE"],
    ["KMB", "Kimberly-Clark Corporation", "NASDAQ"],
    ["KVUE", "Kenvue Inc.", "NYSE"],
    ["PG", "Procter & Gamble Company", "NYSE"],
  ]),

  // energy — 21 of 503, in 1 industry group.
  ...equities("energy", "Energy", [
    ["APA", "APA Corporation", "NASDAQ"],
    ["BKR", "Baker Hughes Company Class A", "NASDAQ"],
    ["COP", "ConocoPhillips", "NYSE"],
    ["CVX", "Chevron Corporation", "NYSE"],
    ["DVN", "Devon Energy Corporation", "NYSE"],
    ["EOG", "EOG Resources, Inc.", "NYSE"],
    ["EQT", "EQT Corporation", "NYSE"],
    ["EXE", "Expand Energy Corporation", "NASDAQ"],
    ["FANG", "Diamondback Energy, Inc.", "NASDAQ"],
    ["HAL", "Halliburton Company", "NYSE"],
    ["KMI", "Kinder Morgan, Inc.", "NYSE"],
    ["MPC", "Marathon Petroleum Corporation", "NYSE"],
    ["OKE", "Oneok, Inc.", "NYSE"],
    ["OXY", "Occidental Petroleum Corporation", "NYSE"],
    ["PSX", "Phillips 66", "NYSE"],
    ["SLB", "SLB Limited", "NYSE"],
    ["TPL", "Texas Pacific Land Corporation", "NYSE"],
    ["TRGP", "Targa Resources Corp.", "NYSE"],
    ["VLO", "Valero Energy Corporation", "NYSE"],
    ["WMB", "Williams Companies Inc.", "NYSE"],
    ["XOM", "ExxonMobil Holdings Corporation", "NYSE"],
  ]),

  // utilities — 31 of 503, in 1 industry group.
  ...equities("utilities", "Utilities", [
    ["AEE", "Ameren Corporation", "NYSE"],
    ["AEP", "American Electric Power Company, Inc.", "NASDAQ"],
    ["AES", "AES Corporation", "NYSE"],
    ["ATO", "Atmos Energy Corporation", "NYSE"],
    ["AWK", "American Water Works Company, Inc", "NYSE"],
    ["CEG", "Constellation Energy Corporation", "NASDAQ"],
    ["CMS", "CMS Energy Corporation", "NYSE"],
    ["CNP", "CenterPoint Energy, Inc.", "NYSE"],
    ["D", "Dominion Energy, Inc", "NYSE"],
    ["DTE", "DTE Energy Company", "NYSE"],
    ["DUK", "Duke Energy Corporation", "NYSE"],
    ["ED", "Consolidated Edison, Inc.", "NYSE"],
    ["EIX", "Edison International", "NYSE"],
    ["ES", "Eversource Energy", "NYSE"],
    ["ETR", "Entergy Corporation", "NYSE"],
    ["EVRG", "Evergy, Inc.", "NASDAQ"],
    ["EXC", "Exelon Corporation", "NASDAQ"],
    ["FE", "FirstEnergy Corp.", "NYSE"],
    ["LNT", "Alliant Energy Corporation", "NASDAQ"],
    ["NEE", "NextEra Energy, Inc.", "NYSE"],
    ["NI", "NiSource Inc.", "NYSE"],
    ["NRG", "NRG Energy, Inc.", "NYSE"],
    ["PCG", "PG&E Corporation", "NYSE"],
    ["PEG", "Public Service Enterprise Group Incorporated", "NYSE"],
    ["PNW", "Pinnacle West Capital Corporation", "NYSE"],
    ["PPL", "PPL Corporation", "NYSE"],
    ["SO", "The Southern Company", "NYSE"],
    ["SRE", "Sempra", "NYSE"],
    ["VST", "Vistra Corp.", "NYSE"],
    ["WEC", "WEC Energy Group, Inc.", "NYSE"],
    ["XEL", "Xcel Energy Inc.", "NASDAQ"],
  ]),

  // real_estate — 30 of 503, in 2 industry groups.
  ...equities("real_estate", "Equity REITs", [
    ["AMT", "American Tower Corporation", "NYSE"],
    ["ARE", "Alexandria Real Estate Equities, Inc.", "NYSE"],
    ["BXP", "BXP, Inc.", "NYSE"],
    ["CCI", "Crown Castle Inc.", "NYSE"],
    ["CPT", "Camden Property Trust", "NYSE"],
    ["DLR", "Digital Realty Trust, Inc.", "NYSE"],
    ["DOC", "Healthpeak Properties, Inc.", "NYSE"],
    ["EQIX", "Equinix, Inc.", "NASDAQ"],
    ["ESS", "Essex Property Trust, Inc", "NYSE"],
    ["EXR", "Extra Space Storage, Inc.", "NYSE"],
    ["FRT", "Federal Realty Investment Trust", "NYSE"],
    ["HST", "Host Hotels & Resorts, Inc.", "NASDAQ"],
    ["INVH", "Invitation Homes Inc.", "NYSE"],
    ["IRM", "Iron Mountain Inc.", "NYSE"],
    ["KIM", "Kimco Realty Corp.", "NYSE"],
    ["MAA", "Mid-America Apartment Communities, Inc.", "NYSE"],
    ["O", "Realty Income Corporation", "NYSE"],
    ["PLD", "Prologis, Inc.", "NYSE"],
    ["PSA", "Public Storage", "NYSE"],
    ["REG", "Regency Centers Corporation", "NASDAQ"],
    ["SBAC", "SBA Communications Corporation Class A", "NASDAQ"],
    ["SPG", "Simon Property Group, Inc.", "NYSE"],
    ["UDR", "UDR, Inc.", "NYSE"],
    ["VICI", "VICI Properties Inc.", "NYSE"],
    ["VMRK", "Vivmark Residential", "NYSE"],
    ["VTR", "Ventas, Inc.", "NYSE"],
    ["WELL", "Welltower Inc.", "NYSE"],
    ["WY", "Weyerhaeuser Company", "NYSE"],
  ]),
  ...equities("real_estate", "Real Estate Management & Development", [
    ["CBRE", "CBRE Group, Inc.", "NYSE"],
    ["CSGP", "CoStar Group, Inc.", "NASDAQ"],
  ]),

  // materials — 25 of 503, in 1 industry group.
  ...equities("materials", "Materials", [
    ["ALB", "Albemarle Corporation", "NYSE"],
    ["AMCR", "Amcor plc", "NYSE"],
    ["APD", "Air Products & Chemicals, Inc.", "NYSE"],
    ["AVY", "Avery Dennison Corp.", "NYSE"],
    ["BALL", "Ball Corporation", "NYSE"],
    ["CF", "CF Industries Holding, Inc.", "NYSE"],
    ["CRH", "CRH Public Limited Company", "NYSE"],
    ["CTVA", "Corteva, Inc.", "NYSE"],
    ["DOW", "Dow Inc.", "NYSE"],
    ["ECL", "Ecolab, Inc.", "NYSE"],
    ["FCX", "Freeport-McMoran Inc.", "NYSE"],
    ["IFF", "International Flavors & Fragrances Inc.", "NYSE"],
    ["IP", "International Paper Co.", "NYSE"],
    ["LIN", "Linde plc", "NASDAQ"],
    ["LYB", "LyondellBasell Industries N.V. Class A", "NYSE"],
    ["MLM", "Martin Marietta Materials", "NYSE"],
    ["MOS", "The Mosaic Company", "NYSE"],
    ["NEM", "Newmont Corporation", "NYSE"],
    ["NUE", "Nucor Corporation", "NYSE"],
    ["PKG", "Packaging Corp of America", "NYSE"],
    ["PPG", "PPG Industries, Inc.", "NYSE"],
    ["SHW", "The Sherwin-Williams Company", "NYSE"],
    ["STLD", "Steel Dynamics, Inc.", "NASDAQ"],
    ["SW", "Smurfit WestRock plc", "NYSE"],
    ["VMC", "Vulcan Materials Company(Holding Company)", "NYSE"],
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
  // **Moved, and the source string changed with it**, because Task 2.8.2 did
  // not re-check the old rows — it replaced the list. Every equity's symbol,
  // name and exchange below was read from Alpaca's asset catalogue on this date
  // (the name with its instrument-type tail removed and twelve all-capital
  // names cased for display, which is a rendering of the same claim rather than
  // a different one). `pnpm universe:check` re-reads the same source, so the
  // date is honestly the date this group was last checked against it. The
  // fifteen ETFs are hand-curated and are the reason the string is not simply
  // the vendor's name.
  profile: { source: "alpaca-assets + curated ETFs", checkedOn: "2026-09-08" },
  // **Moved for the first time since Task 2.3.4 wrote it**, and moving it is
  // the whole point of §11's rule: this group genuinely was re-checked, because
  // every equity's sector and industry group now comes from the published S&P
  // 500 GICS classification rather than from a person's memory. Task 2.7.8
  // deliberately did NOT move it, because Alpaca carries neither field and
  // moving it would have claimed a hundred verifications that did not happen.
  // This task did the verifications: 503 rows, and every sub-industry -> group
  // mapping checked against the constituent's own published sector, which is
  // 503 independent checks of the mapping table rather than a spot check.
  classification: {
    source: "s&p-500-gics + curated ETFs",
    checkedOn: "2026-09-08",
  },
};
