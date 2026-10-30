/**
 * **A universe of the real shape, for the topology's own tests** (Task 6.1.1).
 *
 * ## Why this exists rather than the recorded universe
 *
 * The task that commissioned these tests asks for them *over the recorded
 * universe fixture*, and **there is no such fixture reachable from this
 * package.** The curated universe is `apps/backend/src/universe.ts`, which
 * depends on this package and therefore cannot be depended on by it; the
 * recorded `GET /securities` body is
 * `apps/frontend/src/fixtures/securities/full.json`, inside another workspace
 * package, and it is **dated** — 518 rows, 503 of them equities, every one
 * `active`, recorded before the 2026-10-12 curation that untracked two symbols.
 * Asserting `501` against it would be red on arrival.
 *
 * So this is a universe of the real **shape**, generated from this package's
 * own vocabulary — `SECTORS`, `SECTOR_ETFS` — with the eleven per-sector equity
 * counts recorded below. A shipped `.ts` file rather than a JSON body, which is
 * `apps/backend/src/fixture-corpus.ts`' precedent, and it is deliberately
 * **not** exported from `index.ts`: nothing outside this package's own tests
 * has any business constructing a universe.
 *
 * **What it therefore cannot certify, stated rather than hidden:** that the
 * real curated universe satisfies these counts. That is a property of a file in
 * `apps/backend`, and the assertion belongs beside it — see
 * {@link TOPOLOGY_FIXTURE_SECTOR_COUNTS} for the command that produced these
 * figures and for the hand-off.
 */

import { SECTOR_ETFS, SECTORS } from "./security.js";
import type {
  EquitySecurity,
  IndexEtfSecurity,
  Sector,
  Security,
  SectorEtfSecurity,
  SecurityStatus,
} from "./security.js";
import { toTicker } from "./ticker.js";

/**
 * How many equities each sector holds in the curated universe, **as measured on
 * 2026-10-30**, summing to 501.
 *
 * Taken rather than argued, with:
 *
 * ```
 * node -e "const {UNIVERSE}=require('./apps/backend/dist/universe.js');
 *   const c={}; for (const s of UNIVERSE)
 *     if (s.kind==='equity' && s.status==='active') c[s.sector]=(c[s.sector]||0)+1;
 *   console.log(c)"
 * ```
 *
 * The spread is what makes them worth recording rather than flattening to
 * `501 / 11`: Industrials holds **83** and Energy **21**, a 4.0× range, and the
 * derived cluster radius and the proportional wedge allocation are both
 * functions of it. A uniform fixture would exercise neither.
 *
 * **Hand-off, in words rather than as a link.** Nothing in this package can
 * check that the real universe still matches these eleven numbers, because the
 * real universe is in `apps/backend` and this package is upstream of it. The
 * assertion that wants writing is in `apps/backend`, beside `universe.ts`: the
 * graph built from `UNIVERSE` has 501 equity nodes, 11 sector-ETF nodes and 4
 * market-proxy nodes, and 512 edges. Until it exists, a curation change moves
 * the real graph and leaves every test here green — which is this repository's
 * own *a claim about a mechanism reads identically whether the mechanism is
 * there or not*, and the reason it is written here as a sentence somebody can
 * act on.
 */
export const TOPOLOGY_FIXTURE_SECTOR_COUNTS: Record<Sector, number> = {
  technology: 73,
  health_care: 59,
  financials: 76,
  consumer_discretionary: 47,
  communication_services: 22,
  industrials: 83,
  consumer_staples: 34,
  energy: 21,
  utilities: 31,
  real_estate: 30,
  materials: 25,
};

/** The four market proxies, in the curated file's own order. */
export const TOPOLOGY_FIXTURE_PROXIES = ["SPY", "QQQ", "DIA", "IWM"] as const;

/**
 * A symbol for the `ordinal`-th equity of a sector, unique across the universe
 * and never colliding with a real ETF ticker.
 *
 * Five letters, two of them a base-26 pair from the ordinal, so the sort order
 * these tests rely on is a genuine lexicographic sort over distinct strings
 * rather than an arrival order wearing a sort's clothes.
 */
function fixtureEquitySymbol(sector: Sector, ordinal: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const index = SECTORS.indexOf(sector);
  const high = letters[Math.floor(ordinal / 26) % 26] ?? "A";
  const low = letters[ordinal % 26] ?? "A";

  return `Q${letters[index] ?? "Z"}${high}${low}`;
}

/**
 * A universe of the real shape: 501 equities distributed per
 * {@link TOPOLOGY_FIXTURE_SECTOR_COUNTS}, the eleven sector SPDRs from
 * `SECTOR_ETFS`, and the four market proxies.
 *
 * `extra` appends rows — used by the tests that need an `untracked` security to
 * prove the `status` filter, which the curated file holds none of today.
 */
export function topologyFixtureUniverse(
  extra: readonly Security[] = [],
): readonly Security[] {
  const equities: EquitySecurity[] = SECTORS.flatMap((sector) =>
    Array.from(
      { length: TOPOLOGY_FIXTURE_SECTOR_COUNTS[sector] },
      (_unused, ordinal): EquitySecurity => ({
        symbol: toTicker(fixtureEquitySymbol(sector, ordinal)),
        name: `Fixture ${sector} ${String(ordinal)} Inc.`,
        exchange: "NYSE",
        kind: "equity",
        sector,
        industry: null,
        status: "active",
        cik: null,
      }),
    ),
  );

  const sectorEtfs: SectorEtfSecurity[] = SECTORS.map((sector) => ({
    symbol: SECTOR_ETFS[sector],
    name: `Fixture ${sector} Select Sector SPDR Fund`,
    exchange: "ARCA",
    kind: "sector_etf",
    sector,
    industry: null,
    status: "active",
    cik: null,
  }));

  const proxies: IndexEtfSecurity[] = TOPOLOGY_FIXTURE_PROXIES.map(
    (symbol) => ({
      symbol: toTicker(symbol),
      name: `Fixture ${symbol} Trust`,
      exchange: "ARCA",
      kind: "index_etf",
      sector: null,
      industry: null,
      status: "active",
      cik: null,
    }),
  );

  return [...equities, ...sectorEtfs, ...proxies, ...extra];
}

/** One equity, for the tests that need a row of a particular `status`. */
export function topologyFixtureEquity(
  symbol: string,
  sector: Sector,
  status: SecurityStatus,
): EquitySecurity {
  return {
    symbol: toTicker(symbol),
    name: `Fixture ${symbol} Inc.`,
    exchange: "NYSE",
    kind: "equity",
    sector,
    industry: null,
    status,
    cik: null,
  };
}
