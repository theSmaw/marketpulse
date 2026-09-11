import { SECTOR_ETFS, SECTOR_LABELS, SECTORS } from "@marketpulse/shared";
import type {
  MarketDate,
  Sector,
  Security,
  SecurityCoverage,
  SecurityKind,
  SecurityLastClose,
} from "@marketpulse/shared";

import { useId, useState } from "react";
import { Link } from "react-router";

import {
  allCollapsed,
  bandButtonId,
  bandRowsId,
  collapseAll,
  expandAll,
  rowsShown,
  toggleBand,
} from "./bands.js";
import { Button } from "../Button/Button.js";
import { cx } from "../../cx.js";
import { Icon } from "../Icon/Icon.js";
import { securityPath } from "../../routes/paths.js";
import type {
  SecuritiesFailure,
  SecuritiesView,
} from "../../use-securities.js";
import { PriceChange } from "../PriceChange/PriceChange.js";
import {
  coverageStartDate,
  formatBarCount,
  formatDepth,
  summariseCoverage,
} from "./coverage.js";
import {
  changePercent,
  commonSession,
  directionOf,
  formatChangePercent,
  formatPrice,
} from "./last-close.js";
import styles from "./UniverseTable.module.css";

// The tracked universe, in all four of the states it can be in (Task 2.4.4).
//
// ## Why this is a component and no longer part of the route
//
// Task 1.5.3's test is *does it have states worth reviewing side by side?* Task
// 2.4.3 answered "yes, but the states are the next task's subject" and left the
// table in `src/routes/`, saying it would move the day somebody designed them.
// That day is this task: **designing four states without a grid to see them
// next to each other is the exact thing the workshop exists to prevent**, and
// two of them — an empty universe and a service that answered with the wrong
// thing — cannot be reached in a browser without breaking something first.
//
// `Region` is the precedent for both the move and its timing: it sat beside the
// route it served until it acquired a failed state.
//
// **What moved and what did not.** The hook stays in `src/`, and
// `SecurityExplorer` stays a route module holding the page's frame. What is
// workshop material is this: the table and its states, rendered from a prop,
// with no `fetch` anywhere in it. That is also what makes every state below
// reviewable with no backend running, which is the property `BackendIndicator`
// has and the reason it could be designed before it was wired to anything.
//
// ## It takes the view, not four props, and that is the opposite of
// `BackendIndicator` on purpose
//
// That component takes four fields rather than `useBackendHealth()`'s result,
// because a prop named after a hook's return type is how a presentational
// component acquires a dependency on a network loop. The reasoning does not
// transfer, and the difference is worth stating rather than quietly diverging.
//
// `SecuritiesView` is not a hook's internals — it is *what this page knows*,
// and its whole reason for being a discriminated union is that the impossible
// combinations cannot be built. Splitting it into `securities`, `isLoading`,
// `failure` and `requestId` would hand this component back the eight-way
// boolean space the union was created to remove, and put the re-derivation of
// "which of the four am I looking at" inside the renderer. The import is
// `import type`, so it is erased and creates no runtime edge; what this
// component still cannot do is fetch anything.

/**
 * What kind of thing a row is, in words a user reads rather than the wire's
 * vocabulary. Moved here from the route with the table.
 *
 * `Record<SecurityKind, string>` rather than a `switch`, so a fourth kind added
 * to `SECURITY_KINDS` is a compile error here rather than a row rendering the
 * raw enum member.
 */
const KIND_LABELS: Record<SecurityKind, string> = {
  equity: "Company",
  sector_etf: "Sector ETF",
  index_etf: "Index ETF",
};

/**
 * What fills a cell whose value is structurally absent rather than missing.
 *
 * Two columns use it and they are the same case: an ETF has no `industry`, and
 * an index ETF has no `sector` either. Neither is a value we failed to load —
 * an index proxy tracks the whole market, so "which industry is SPY in" has no
 * answer rather than an unknown one. That distinction is why `Security` is a
 * discriminated union rather than one interface with nullable fields (Task
 * 2.3.1), and a blank cell would put the two meanings back together.
 *
 * **The em dash is kept, and the reason it is now enough is the grouping.**
 * Task 2.4.3 shipped it and flagged the glyph as this task's to judge, on the
 * argument that a bare dash is indistinguishable from data we do not have. What
 * changed is the context around it: every row now sits under a group heading
 * that names its sector — or, for the index proxies, says in words that they
 * are not part of one — and the Kind column names the row as an ETF. The cell
 * no longer has to carry the explanation on its own, so spelling it out in the
 * cell would be the third copy of a fact already stated twice above it.
 */
const NOT_APPLICABLE = "—";

/**
 * A rendered group of rows: one sector, or the market proxies.
 *
 * `benchmark` is the sector's ETF ticker and is a **claim about the
 * relationship** rather than a repeat of the row beneath it — `SECTOR_ETFS` is
 * the table that says XLK is what Technology is measured against, and this page
 * is the first thing in the product to render it. `detail` is what stands in
 * that place for the proxies, which have no benchmark because they are one.
 */
interface UniverseGroup {
  readonly key: string;
  readonly name: string;
  readonly benchmark: string | null;
  readonly detail: string | null;
  readonly securities: readonly Security[];
}

const MARKET_PROXIES: Pick<UniverseGroup, "key" | "name" | "detail"> = {
  key: "market-proxies",
  name: "Market proxies",
  detail: "Whole-market ETFs, which belong to no sector",
};

/**
 * Group the universe by sector, in the order the domain declares.
 *
 * **Grouped rather than sorted, and the reversal trigger is stated.** The API
 * already returns rows ordered by symbol (Task 2.4.1 put the `order by` in the
 * query, because Postgres guarantees no order without one), so this is the page
 * adding structure rather than correcting an unordered response. The trade is
 * the obvious one: grouping makes *coverage* legible and makes finding one
 * known symbol harder, and sorting alphabetically does the reverse.
 *
 * Grouping wins because it answers the question this page is actually for.
 * "What does MarketPulse cover?" is a question only this screen answers; "where
 * is NVDA?" is a question **Story 2.11's search** answers far better than any
 * ordering can, and the same story brings click-through. So the alphabetical
 * run is optimising for the job that is about to get a proper tool, at the cost
 * of the job that will never have another one.
 *
 * The reversal trigger is size rather than search: at Story 2.3's stated
 * ceiling of 500 securities a single sector group is longer than a screen, at
 * which point groups need to become something you can jump between or collapse
 * — and that is a control, which this task is deliberately not adding.
 *
 * **Fired and answered, 2026-09-11 by Task 2.11.8.** The sentence above is kept
 * as the record of what was predicted; what is true now is that it happened.
 * Measured at 518 securities: **eleven of the twelve bands are longer than one
 * screen** and the page is 20,402px — so the grouping stayed and acquired both
 * halves of what the trigger asked for, a rail that jumps between bands and a
 * collapse on each. See `BandRail` for the design and the task file for the
 * measurements. The trade this comment describes is therefore no longer a trade:
 * grouping still answers "what does MarketPulse cover?", and "where is NVDA?"
 * now has search *and* a way around the table.
 *
 * **The order is `SECTORS`, not the group sizes.** Ordering by depth would put
 * the deepest sector first, which reads well exactly once and then reshuffles
 * the page the day a single security is added — a reader who knows Financials
 * is third loses that the moment the universe changes. `SECTORS` is declared
 * vocabulary and is stable.
 *
 * A sector with no rows is omitted rather than shown empty. It cannot happen in
 * a correctly loaded universe — `SECTOR_ETFS` is total over `Sector`, so every
 * sector has at least its own benchmark — so a heading with nothing under it
 * would be reporting a broken load in a way nobody could act on.
 */
export function groupUniverse(
  securities: readonly Security[],
): readonly UniverseGroup[] {
  const bySector = new Map<Sector, Security[]>();
  const proxies: Security[] = [];

  for (const security of securities) {
    // `sector === null` narrows to the index-ETF member of the union, which is
    // the whole reason that union exists — there is no "unclassified equity"
    // this branch could be silently catching.
    if (security.sector === null) {
      proxies.push(security);
      continue;
    }

    const group = bySector.get(security.sector);
    if (group === undefined) bySector.set(security.sector, [security]);
    else group.push(security);
  }

  const groups = SECTORS.flatMap<UniverseGroup>((sector) => {
    const rows = bySector.get(sector);
    if (rows === undefined) return [];

    return [
      {
        key: sector,
        name: SECTOR_LABELS[sector],
        benchmark: SECTOR_ETFS[sector],
        detail: null,
        // The sector's own ETF first, then the companies. `sort` is stable in
        // every runtime this ships to, so the equities keep the symbol order
        // the query gave them.
        securities: [...rows].sort(
          (a, b) => kindRank(a.kind) - kindRank(b.kind),
        ),
      },
    ];
  });

  return proxies.length === 0
    ? groups
    : [...groups, { ...MARKET_PROXIES, benchmark: null, securities: proxies }];
}

/** The benchmark leads its own sector; everything else keeps its place. */
function kindRank(kind: SecurityKind): number {
  return kind === "sector_etf" ? 0 : 1;
}

/**
 * The counts the summary line reports.
 *
 * **`tracked` and `held` are two different numbers and the line has to say
 * which one it means.** Since Task 2.3.6 a security removed from the curated
 * file is marked `untracked` and kept, so `securities.length` is *rows we hold*
 * and the count of active rows is *securities we track*. They are equal today —
 * the deployed table is 518 rows, all active — which is exactly the trap: the
 * wrong one passes every check this story can run and is silently wrong the
 * first time somebody edits the universe file.
 *
 * So the label is `securities tracked`, the figure behind it is the active
 * count, and the difference gets its own clause when there is one.
 */
export function summarise(securities: readonly Security[]) {
  const tracked = securities.filter(
    (security) => security.status === "active",
  ).length;

  return {
    tracked,
    noLongerTracked: securities.length - tracked,
    etfs: securities.filter((security) => security.kind !== "equity").length,
  };
}

function SummaryLine({
  securities,
  groups,
  coverage,
  shown,
}: {
  readonly securities: readonly Security[];
  readonly groups: readonly UniverseGroup[];
  readonly coverage: ReadonlyMap<string, SecurityCoverage>;
  /**
   * How many rows are on screen right now — see the `rows shown` clause below.
   *
   * It is passed in rather than derived here because this component is handed
   * the *universe*, and how much of it is visible is a property of a control
   * that lives one level up. Deriving it from `groups` would mean this
   * component reading the collapse set, which is the thing it must not need to
   * know in order to state a fact about the universe.
   */
  readonly shown: number;
}) {
  const { tracked, noLongerTracked, etfs } = summarise(securities);
  const held = summariseCoverage(coverage);

  // Sectors are counted off the rendered groups rather than off `SECTORS`, so
  // the figure is a statement about what is on this screen rather than about
  // the vocabulary. The proxies group is not a sector and is excluded by the
  // one thing that distinguishes it: it has no benchmark.
  const sectors = groups.filter((group) => group.benchmark !== null).length;

  return (
    <p className={styles.summary}>
      <Figure value={tracked} label="securities tracked" />
      <Figure value={sectors} label={sectors === 1 ? "sector" : "sectors"} />
      <Figure value={etfs} label="ETFs" />
      {noLongerTracked > 0 && (
        <Figure value={noLongerTracked} label="no longer tracked" />
      )}

      {/*
       * What we hold, as a scale claim — **the first sentence in this product
       * that is about the market rather than about our own configuration.**
       *
       * Three facts and no more: how many securities have any history, how much
       * of it there is, and how far forward it reaches. The total is here and
       * nowhere else, because a bar count is a statement about the *store* and
       * a per-row one would invite arithmetic; `coverage.ts` carries the whole
       * argument, including the percentage that must never appear.
       *
       * When the store holds nothing the clauses collapse to one sentence
       * rather than reading `0 with history · 0 bars`. That is not decoration:
       * a fresh clone with a migrated database and no backfill is a real and
       * correct state, and three zeroes read as a fault where one sentence
       * reads as a fact.
       */}
      {held.securities === 0 ? (
        <span className={styles.figure}>No market history stored yet</span>
      ) : (
        <>
          {/*
           * **Words when every row is covered, a figure when they are not.**
           * With the store at full depth this clause would otherwise repeat the
           * count beside it — `518 securities tracked · 518 with history` — and
           * two identical figures a centimetre apart read as a mistake rather
           * than as the good news they are. What a reader wants from a complete
           * store is *no gaps*, which is a shorter and stronger claim than a
           * number they have to compare by eye.
           *
           * The figure comes back the moment it means something, which is the
           * same asymmetry the `no longer tracked` clause above already has.
           */}
          {held.securities === securities.length ? (
            <span className={styles.figure}>all with history</span>
          ) : (
            <Figure value={held.securities} label="with history" />
          )}
          <Figure value={formatBarCount(held.bars)} label="minute bars" />
          {held.through !== null && (
            <span className={styles.figure}>
              through <span className={styles.figureValue}>{held.through}</span>
            </span>
          )}
        </>
      )}

      {/*
       * **The one clause on this line that is about the screen rather than
       * about the universe** (Task 2.11.8).
       *
       * Every figure above it is a claim about what MarketPulse holds, and
       * collapsing a band unholds nothing — `518 securities tracked` stays 518
       * with every band shut, because it is still true. What a collapse does
       * change is *which rows are on screen*, and this task's own instruction
       * is that a control which changes that owes this line an amendment in the
       * same commit. So the amendment says exactly that and nothing else, in
       * its own words, last.
       *
       * **It appears only when it is not the whole number**, which is the same
       * asymmetry the `no longer tracked` clause and the `all with history`
       * clause above already have. A line reading `518 of 518 rows shown` at
       * rest is two identical figures a centimetre apart, and two identical
       * figures read as a mistake rather than as the good news they are.
       *
       * It is deliberately **not** in the live region. `aria-expanded` on the
       * band's own button is what tells a listener the band shut, spoken at the
       * moment they pressed it and about the thing they pressed; a `role=status`
       * re-reading the whole summary on top of that is two announcements of one
       * action. See `Announcement` for why that region reports the *fetch* and
       * nothing else.
       */}
      {shown !== securities.length && (
        <span className={styles.figure}>
          <span className={styles.figureValue}>{shown}</span> of{" "}
          <span className={styles.figureValue}>{securities.length}</span> rows
          shown
        </span>
      )}
    </p>
  );
}

/**
 * One fact, as a figure and the words that say what it counts.
 *
 * Deliberately a line of facts rather than a row of stat tiles. A big number
 * over a small caption is the shape every dashboard reaches for first, and on a
 * page whose actual subject is a *structure* it would put the least interesting
 * thing — that there are 518 of something — in the largest type on the screen.
 */
function Figure({
  value,
  label,
}: {
  /**
   * `string` as well as `number` since Task 2.8.9, because `47.7M` is a figure
   * in every sense this component means the word — a magnitude somebody reads —
   * and the alternative is nine digits nobody can compare by eye.
   */
  readonly value: number | string;
  readonly label: string;
}) {
  return (
    <span className={styles.figure}>
      <span className={styles.figureValue}>{value}</span> {label}
    </span>
  );
}

function SecurityTableRow({
  security,
  coverage,
  lastClose,
  session,
}: {
  readonly security: Security;
  readonly coverage: SecurityCoverage | undefined;
  readonly lastClose: SecurityLastClose | undefined;
  /**
   * The session every close on this page shares, or `null` when they disagree.
   * A row whose own session differs from it says so; see {@link LastCloseCell}.
   */
  readonly session: MarketDate | null;
}) {
  const untracked = security.status === "untracked";

  return (
    <tr className={cx(styles.row, untracked ? styles.untracked : undefined)}>
      {/*
       * A `<th scope="row">`, so a screen reader announces the symbol before
       * each cell in the row — "Semiconductors" is heard as NVDA's industry
       * rather than as a bare word.
       *
       * **And, since Task 2.11.5, the row's way in.** The target is the symbol
       * cell rather than the whole row, and the argument is in
       * `UniverseTable.module.css` beside `.symbolLink`: the row is a bigger
       * target and fights selection of the four columns an analyst copies, and
       * a `<tr onClick>` is not a link in any sense a keyboard or a screen
       * reader can use. It is a real `<a>` — reachable by Tab, activated by
       * Enter, announced as a link, and offering the address on a
       * middle-click — and it is a React Router `Link`, so opening a second
       * security keeps the parsed-series cache this page's panel reads from.
       *
       * The destination is built with `securityPath()` and nowhere else; see
       * `routes/paths.ts` for why a pattern is not a template. An **untracked**
       * security is a link like any other, which is `UNIVERSE.md` §12.2's rule
       * arriving at navigation: a security we stopped tracking is shown,
       * marked, and still openable — its stored bars did not stop existing.
       */}
      <th scope="row" className={cx(styles.cell, styles.symbolCell)}>
        <Link
          to={securityPath(security.symbol)}
          className={cx(styles.symbolLink, styles.symbol)}
        >
          <span className={cx(styles.symbolText)}>{security.symbol}</span>
          {/* Decoration, and `Icon` is already `aria-hidden`. The link's
              accessible name stays the bare symbol, which is what a screen
              reader user is navigating by. */}
          <span className={cx(styles.symbolChevron)}>
            <Icon name="chevronRight" />
          </span>
        </Link>
      </th>
      <td className={styles.cell}>
        {security.name}
        {untracked && (
          /*
           * **"We stopped tracking this" is information, not a failure**, which
           * is `UNIVERSE.md` §3's rule and the reason this looks nothing like
           * the failure states below it. No red, no error vocabulary, no
           * `role="alert"`: a hairline chip with no fill, and the row's ink
           * receding to secondary. The row keeps its place in its sector.
           *
           * Encoded three ways and none of them is hue — the chip's presence,
           * its words, and the ink. That matters here more than usual: this
           * palette's two price directions are 1.05:1 apart in greyscale, which
           * is the measurement that made "colour is never the sole encoding"
           * a rule rather than a preference.
           */
          <span className={styles.chip}>No longer tracked</span>
        )}
      </td>
      <td className={cx(styles.cell, styles.industry)}>
        {security.industry ?? NOT_APPLICABLE}
      </td>
      <td className={cx(styles.cell, styles.kind)}>
        {KIND_LABELS[security.kind]}
      </td>
      <LastCloseCell lastClose={lastClose} session={session} />
      <ChangeCell lastClose={lastClose} />
      <HistoryCell coverage={coverage} />
    </tr>
  );
}

/**
 * The last price this security closed at — **the first real price MarketPulse
 * has ever shown anybody** (Task 2.9.7).
 *
 * ## What it is, and why saying so is the hard part
 *
 * It is the close of the last session we hold a daily bar for. It is **not** a
 * live price and it is not necessarily the last session that traded: the store
 * holds complete sessions only and the nightly catch-up runs before the open,
 * so during a live session this number is at least a day behind the market.
 *
 * A stale number presented as current is precisely what invariant 6 exists to
 * prevent, so the session date is on the wire and on the page. It is stated
 * **once, in the column heading**, because 518 identical dates under a heading
 * that could carry one is furniture — the same argument that took the sector
 * out of this table and put the timeframe into the history heading. Measured on
 * the local store at full depth: **518 of 518** securities last closed on the
 * same session.
 *
 * The moment that stops being true the heading stops claiming it and **each row
 * carries its own date**, which is what {@link commonSession} returning `null`
 * means and what the `session` prop threads down. That asymmetry is
 * `coverage.ts`'s and the summary line's already: a shared claim is made only
 * while it is true of everything, and is then withdrawn rather than
 * approximated.
 *
 * ## The empty case
 *
 * A security we hold no daily bars for gets the em dash and a spoken sentence,
 * not a zero. §36's rule and `HistoryCell`'s treatment: it is not a failure,
 * it is a security nobody has backfilled at the daily timeframe. A `0.00` here
 * would be a price, and an invented one.
 */
function LastCloseCell({
  lastClose,
  session,
}: {
  readonly lastClose: SecurityLastClose | undefined;
  readonly session: MarketDate | null;
}) {
  if (lastClose === undefined) {
    return (
      <td className={cx(styles.cell, styles.numeric)}>
        <span aria-hidden="true">{NOT_APPLICABLE}</span>
        {/*
         * The em dash reads as nothing to a screen reader, which is right for
         * a structurally inapplicable field and wrong here: "we hold no close
         * for this" is a fact. `HistoryCell` makes the same trade one column
         * along.
         */}
        <span className={styles.visuallyHidden}>No close yet</span>
      </td>
    );
  }

  return (
    <td className={cx(styles.cell, styles.numeric)}>
      <span className={styles.price}>{formatPrice(lastClose.close)}</span>
      {lastClose.session !== session && (
        /*
         * The exception, and it only renders when the heading's claim does not
         * cover this row. A second line rather than a second column: three of
         * 518 rows growing a line is a legible exception, where a column of 515
         * blanks is a column of blanks.
         */
        <span className={styles.session}>{lastClose.session}</span>
      )}
    </td>
  );
}

/**
 * How far the last close moved from the session before it.
 *
 * **A percentage rather than an absolute change**, because this is a
 * cross-sectional column: a $2 move means one thing on a $3 security and
 * another on a $700 one, and the whole value of a column is that a reader can
 * compare down it. The absolute figure belongs on a security's own page, which
 * is Story 2.11's.
 *
 * ## `PriceChange` renders it, and this is the first real number it has held
 *
 * That component has existed since Task 1.4.4 and has never rendered anything
 * but a Storybook figure. It exists because Task 1.4.4 measured this palette's
 * positive green and negative red at **1.05:1 under `grayscale(1)`** — no
 * difference at all — so hue cannot be the signal. What carries direction here
 * is the arrow glyph, the sign on the figure and a spoken word; the colour is
 * the fourth channel, not the first.
 *
 * The direction is computed from the **rounded** percentage rather than the raw
 * one (`directionOf`), so a +0.001% move cannot render as an up arrow beside a
 * figure reading `0.00%`.
 *
 * ## Two absences, told apart
 *
 * No close at all is the em dash — the same absence the column beside it shows,
 * and it must not read as a security that did not move. One stored session and
 * no comparison is the *other* absence: there is a price, and there is nothing
 * to measure it against. Both render quietly and both say which they are to a
 * screen reader, because they send a reader to different conclusions.
 */
function ChangeCell({
  lastClose,
}: {
  readonly lastClose: SecurityLastClose | undefined;
}) {
  const percent = lastClose === undefined ? null : changePercent(lastClose);

  if (percent === null) {
    return (
      <td className={cx(styles.cell, styles.numeric)}>
        <span aria-hidden="true">{NOT_APPLICABLE}</span>
        <span className={styles.visuallyHidden}>
          {lastClose === undefined
            ? "No close yet"
            : "No previous session to compare against"}
        </span>
      </td>
    );
  }

  return (
    <td className={cx(styles.cell, styles.numeric)}>
      <PriceChange
        change={formatChangePercent(percent)}
        direction={directionOf(percent)}
      />
    </td>
  );
}

/**
 * How much history we hold for one security — two facts, and no more.
 *
 * **The depth and where it starts.** Everything else the ledger knows is
 * diagnostic: the bar count is a scale claim that belongs in the summary line,
 * `updated_at` is not even sent, and *why* a history is short is an operator's
 * question with an operator's command. `coverage.ts` carries the arguments.
 *
 * ## Why the design target is the exception, and why it needs no encoding
 *
 * Measured against the local store at full depth: **515 of 518 securities start
 * on the same day**, and the entire information content of this column is the
 * three that do not. A coverage bar — the obvious idea — would draw 515
 * identical full bars to communicate three exceptions, and would read as a
 * progress indicator for something that is not in progress.
 *
 * So the default row is quiet and **the alignment does the work**. The dates
 * are `YYYY-MM-DD`, fixed-width and tabular, right-aligned in a column: 515
 * identical strings and three different ones is not a subtle difference to a
 * reader scanning down, and it costs no ink, no chip and no second vocabulary.
 * That is the same argument Task 1.4.3 made when it measured a 14.3px spread
 * riding on `tabular-nums` — this is what those figures were bought for.
 *
 * Anything louder would also have to be wrong: the two causes of a short
 * history look identical from the ledger, and standing out is a job for weight
 * and hierarchy rather than for `--palette-amber`, which measures **1.73:1** on
 * this ground and is worse than the `--ink-disabled` that Task 1.12.4 was
 * caught by.
 *
 * ## The empty case
 *
 * A security we hold nothing for gets the em dash and a hidden sentence, not a
 * zero and not `0 bars`. §36's rule: it is not a failure, it is a security
 * nobody has backfilled — the same treatment `checking` gets in the chrome
 * rather than an alarm. It is the sentence a first-time viewer is most likely
 * to meet if anything went wrong, so it says what it knows and stops.
 */
function HistoryCell({
  coverage,
}: {
  readonly coverage: SecurityCoverage | undefined;
}) {
  if (coverage === undefined) {
    return (
      <td className={cx(styles.cell, styles.history)}>
        <span aria-hidden="true">{NOT_APPLICABLE}</span>
        {/*
         * The em dash reads as nothing to a screen reader, which is right for
         * the two structurally-absent columns above and wrong here: "we hold no
         * bars for this" is a fact rather than an inapplicable field. So the
         * glyph is hidden and the sentence is what is announced.
         */}
        <span className={styles.visuallyHidden}>No history yet</span>
      </td>
    );
  }

  return (
    <td className={cx(styles.cell, styles.history)}>
      <span className={styles.depth}>{formatDepth(coverage)}</span>{" "}
      <span className={styles.from}>from {coverageStartDate(coverage)}</span>
    </td>
  );
}

/**
 * The table.
 *
 * **Four columns, and the sector is no longer one of them.** Task 2.4.3 shipped
 * symbol / name / sector / kind; grouping by sector makes a sector cell the
 * same word repeated down every row of a group, directly under a heading that
 * already says it — which is the definition of furniture. The freed column
 * carries `industry`, which the wire has always sent and nothing had ever
 * rendered, and which is the finest-grained description of a security this
 * product holds. So the page shows strictly more than it did, with less
 * repetition. Story acceptance criterion 2's four fields are all still on
 * screen; the sector is now stated once per group instead of once per row.
 *
 * **Every security the API returns is rendered, `untracked` ones included.**
 * `status` is this schema's one invisible predicate and `UNIVERSE.md` §12.2
 * puts this reader on the *do not filter* side: a symbol removed from the
 * curated file is marked and kept, because Story 2.8's bars hang off it and
 * Epic 13 replays a date on which it was tracked.
 *
 * One `<tbody>` per group with a `scope="rowgroup"` heading row, which is the
 * semantic HTML for exactly this and costs nothing over a styled `<div>`.
 *
 * **It costs one axe `incomplete`, and the cause was measured rather than
 * guessed at.** The page is **0 violations / 31 passes / 1 incomplete**, and
 * the incomplete is `th-has-data-cells` on the table itself. Removing the
 * eleven band rows from the live DOM and re-running the rule takes it to
 * **0 incomplete / 1 pass**, and putting them back restores it — so the bands
 * are exactly what axe cannot resolve, which is what a rule looking for a
 * header's data cells does with a header that spans every column of a group of
 * rows. It is inconclusive rather than failing, which is the same footing as
 * the `color-contrast` inconclusive the landing route has carried since Story
 * 1.5, and `e2e/support/axe.ts` already attaches incompletes as annotations
 * that cannot fail a gate. Whether a screen reader actually announces the band
 * usefully is Task 2.4.5's, and it is the question worth asking rather than
 * this number.
 */
function UniverseRows({
  securities,
  coverage,
  lastCloses,
  initiallyCollapsed,
}: {
  readonly securities: readonly Security[];
  readonly coverage: ReadonlyMap<string, SecurityCoverage>;
  readonly lastCloses: ReadonlyMap<string, SecurityLastClose>;
  readonly initiallyCollapsed: readonly string[];
}) {
  const groups = groupUniverse(securities);

  // Computed once for the whole table rather than per row: it is a fact about
  // the response, and the heading and every cell have to agree about it.
  const session = commonSession(lastCloses);

  /*
   * Which bands are shut (Task 2.11.8).
   *
   * ## It lives here, and that is the reversal trigger **not** firing
   *
   * `FRONTEND-STATE.md`'s trigger for adding a store is *the first piece of
   * state two features must agree about that neither owns*. This is not that:
   * the collapse set is read by this table and by nothing else, and search —
   * the one other feature on this screen — has no opinion about it, because
   * search is a surface over the page rather than a filter on it. State one
   * feature owns is a `useState` and nothing more, and saying so is worth more
   * than the alternative of quietly putting it in a module because it would be
   * convenient there later.
   *
   * ## It survives a navigation, and that is the default rather than a mechanism
   *
   * `/securities` and `/securities/:symbol` are two `<Route>`s rendering the
   * same module, so opening a security re-renders this component instead of
   * re-mounting it and the set simply stays (measured in Chromium, Task
   * 2.11.5). That is the right answer here and is worth stating as a decision:
   * a collapse is an arrangement of the page a reader made on purpose, and
   * throwing it away because they looked at a security would be a page undoing
   * their work. It is emphatically **not** the right answer for everything a
   * control like this could hold — a scroll position or a "current band" would
   * be wrong to keep — which is why the only thing kept is the set.
   *
   * ## Seeded, so the workshop can review the shut state
   *
   * There is no other way to put a component into a state and look at it beside
   * the others; `AllBandsCollapsed` in the stories is the consumer, and the
   * route passes nothing. The seed is read once, which is what `useState`'s
   * initialiser means — changing the prop later does not reopen a band the
   * reader has shut.
   */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(initiallyCollapsed),
  );

  /*
   * One opaque prefix per rendered table, so the band ids are unique on a page
   * that holds more than one. The workshop's permutation grid renders eleven of
   * these tables, and eleven `id="band-technology"`s is a `duplicate-id`
   * violation on a tree that gates on axe.
   *
   * Nothing asserts on this value — `e2e/README.md` names a `useId()` result as
   * a thing a test must not assert on — which is why every instrument for this
   * control reaches it by role and accessible name instead.
   */
  const ids = useId();

  const shown = rowsShown(groups, collapsed);
  const everythingShut = allCollapsed(groups, collapsed);

  return (
    <>
      <SummaryLine
        securities={securities}
        groups={groups}
        coverage={coverage}
        shown={shown}
      />

      <BandRail
        groups={groups}
        ids={ids}
        everythingShut={everythingShut}
        onToggleAll={() => {
          setCollapsed(everythingShut ? expandAll() : collapseAll(groups));
        }}
      />

      {/*
       * The entrance, and it is the one place motion lands on this page.
       *
       * A table arriving is the moment §5.6 means by "it must feel alive": the
       * alternative is 518 rows appearing between two frames with no indication
       * that a request completed, which is what a screen that reads as dead
       * looks like. It plays **once, before anybody is reading**, which is the
       * line the motion tokens' own comment draws — nothing here animates a
       * value that is already on screen, because a number that moves while an
       * analyst reads it is worse than one that changes instantly.
       */}
      <div className={styles.entering}>
        <table className={styles.table}>
          {/*
           * **The table's own name** (Task 2.11.9).
           *
           * Measured with Chromium's accessibility tree: this table computed
           * an accessible name of `""`. Inside a named `region` that is
           * invisible to a reader browsing the page, but a screen reader's
           * table list — VoiceOver's rotor, NVDA's elements list — is a list
           * of tables and nothing else, and an unnamed one appears there as
           * *table, 519 rows, 7 columns*. On a page whose whole content is one
           * table, that is the one navigation aid that could take a listener
           * straight to it and does not.
           *
           * Visually hidden rather than drawn: the `Panel` above already
           * renders the heading a reader sees, and a second copy of it above
           * the column headings is a line that says nothing new. The two
           * therefore carry the same words on purpose — a caption that
           * paraphrased the region would be a second name for one thing.
           */}
          <caption className={styles.visuallyHidden}>Tracked universe</caption>
          {/*
           * The column proportions, declared once rather than repeated on a
           * heading and a cell. Without them the table's slack all collects in
           * front of the last column, which is the "stretched to fit" look a
           * default `width: 100%` table has.
           */}
          <colgroup>
            <col className={styles.colSymbol} />
            <col className={styles.colName} />
            <col className={styles.colIndustry} />
            <col className={styles.colKind} />
            <col className={styles.colClose} />
            <col className={styles.colChange} />
            <col className={styles.colHistory} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={styles.heading}>
                Symbol
              </th>
              <th scope="col" className={styles.heading}>
                Name
              </th>
              <th scope="col" className={cx(styles.heading, styles.industry)}>
                Industry
              </th>
              <th scope="col" className={cx(styles.heading, styles.kind)}>
                Kind
              </th>
              {/*
               * **The session date is in the heading and not in every cell**,
               * for the same reason the timeframe is one column along: 518
               * identical dates under a heading that could carry one is
               * furniture. It renders only while every close on the page shares
               * a session; when they disagree the claim is withdrawn and each
               * cell carries its own. See `LastCloseCell`.
               */}
              <th
                scope="col"
                className={cx(styles.heading, styles.numeric)}
                // The date is inside the heading rather than beside it, so a
                // screen reader announcing a cell's column header says which
                // session the price belongs to. Splitting it into a sibling
                // element outside the `<th>` would leave the announcement as a
                // bare "Last close".
              >
                Last close
                {session !== null && (
                  <>
                    {/*
                     * An explicit space, and it is load-bearing rather than
                     * formatting. The date is a `display: block` sibling, so
                     * without it the heading's *accessible name* is
                     * `Last close2026-09-04` — `e2e/README.md`'s
                     * `Backend servicehealthy` trap, arriving somewhere it
                     * would be heard rather than merely mis-asserted on. The
                     * space is invisible at the end of the first line and is
                     * the whole difference to a listener.
                     */}{" "}
                    <span className={styles.headingDetail}>{session}</span>
                  </>
                )}
              </th>
              <th scope="col" className={cx(styles.heading, styles.numeric)}>
                Change
              </th>
              {/*
               * **The timeframe is in the heading and not in every cell**,
               * which is the same argument that removed the Sector column: a
               * word repeated down 518 rows directly under a heading that
               * already says it is furniture. So a cell reads `1y from
               * 2025-09-08` and the column says what a year of what.
               */}
              <th scope="col" className={cx(styles.heading, styles.history)}>
                Minute-bar history
              </th>
            </tr>
          </thead>

          {groups.map((group) => {
            const shut = collapsed.has(group.key);

            return (
              /*
               * `id` on the `<tbody>` rather than on a wrapper around the rows,
               * because there is nowhere else to put it: the rows a band
               * controls and the heading that controls them are the same row
               * group, and a table may not have an element between a `<tbody>`
               * and its `<tr>`s. So `aria-controls` names a region that
               * contains its own trigger, which is a superset of the truth
               * rather than a wrong answer, and it always resolves — the
               * `<tbody>` survives the collapse holding just its heading.
               */
              <tbody key={group.key} id={bandRowsId(ids, group.key)}>
                <tr>
                  {/*
                   * `rowgroup`, not `colgroup`: this heading labels the rows
                   * beneath it inside its own `<tbody>`, which is what a
                   * rowgroup is. `colgroup` would claim it heads a span of
                   * *columns*, which is the reading axe reported as
                   * inconclusive on the first run of the accessibility check
                   * — it could not find data cells for a column header that
                   * heads no columns.
                   */}
                  <th scope="rowgroup" colSpan={7} className={styles.group}>
                    {/*
                     * The band's own layout, and since Task 2.11.8 it is a
                     * `<button>` rather than a `<span>` — an inner element
                     * rather than the `<th>` itself, because a table cell given
                     * `display: flex` stops being a table cell and a `colspan`
                     * that no longer spans is the kind of breakage that only
                     * shows up at one viewport width.
                     *
                     * **A bare `<button>` and not a `Button`, and that is not a
                     * fourth hand-styled copy of one.** `Button` is a bounded
                     * control with a height, a padding and three variants; this
                     * is a full-bleed row of a table that became pressable.
                     * What changed here is that the band's existing layout got
                     * a `type="button"` and a disclosure state — nothing about
                     * it was drawn twice.
                     */}
                    <button
                      type="button"
                      id={bandButtonId(ids, group.key)}
                      className={styles.groupBand}
                      aria-expanded={!shut}
                      aria-controls={bandRowsId(ids, group.key)}
                      onClick={() => {
                        setCollapsed(toggleBand(collapsed, group.key));
                      }}
                    >
                      {/*
                       * The existing `chevronRight`, rotated a quarter turn
                       * when the band is open. The icon set closed at six and
                       * the rule is that the next addition needs its own
                       * argument in its own task; a disclosure that rotates is
                       * the idiom anyway, and one drawing in two positions
                       * cannot drift the way two drawings can.
                       */}
                      <span
                        className={cx(
                          styles.groupChevron,
                          shut ? undefined : styles.groupChevronOpen,
                        )}
                      >
                        <Icon name="chevronRight" />
                      </span>
                      <span className={styles.groupName}>{group.name}</span>{" "}
                      <span className={styles.groupDetail}>
                        {group.benchmark === null
                          ? group.detail
                          : `Benchmark ${group.benchmark}`}
                      </span>{" "}
                      {/*
                       * The count, and the unit is present for a listener and
                       * absent for a reader. Measured: the band's accessible
                       * name reads `Technology Benchmark XLK 13`, so a bare
                       * figure arrives at the end of a heard sentence with
                       * nothing saying what it counts. On screen the column of
                       * figures says it by alignment, which is the whole reason
                       * the number is right-aligned and tabular — so this is the
                       * third channel `PriceChange` established rather than a
                       * second copy of anything.
                       */}
                      {/*
                       * **The spaces are load-bearing rather than formatting**,
                       * and the reason is `e2e/README.md`'s `Backend
                       * servicehealthy` trap arriving in a place where it would
                       * be *heard*. These parts are flex children with no
                       * literal whitespace between them, and an accessible name
                       * is a concatenation: measured in jsdom before these
                       * `{" "}`s existed, this band announced itself as
                       * `TechnologyBenchmark XLK2securities`. The space is
                       * invisible on screen and is the whole difference to a
                       * listener.
                       */}
                      <span className={styles.groupCount}>
                        {group.securities.length}{" "}
                        <span className={styles.visuallyHidden}>
                          securities
                        </span>
                      </span>
                    </button>
                  </th>
                </tr>
                {/*
                 * A shut band renders no rows at all rather than hiding them.
                 *
                 * The alternative — keeping 518 rows in the DOM under `hidden`
                 * — buys nothing a reader or a listener can tell apart, and
                 * costs the one thing collapse is actually good for on a page
                 * this size: a hidden row is still a row the browser built,
                 * laid out and has to keep. The measurement behind that is in
                 * the task's notes.
                 */}
                {!shut &&
                  group.securities.map((security) => (
                    <SecurityTableRow
                      key={security.symbol}
                      security={security}
                      coverage={coverage.get(security.symbol)}
                      lastClose={lastCloses.get(security.symbol)}
                      session={session}
                    />
                  ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </>
  );
}

/**
 * The band rail — **the answer to the reversal trigger Story 2.4 wrote**
 * (Task 2.11.8).
 *
 * ## What it is for, measured rather than asserted
 *
 * Grouping by sector was the right call and it has a cost that only shows up at
 * scale. Measured in Chromium at 1710×981 against the real store on
 * 2026-09-11: the page is **20,309px tall — 20.7 screens** — eleven of the
 * twelve bands are longer than one screen and six are longer than two, and the
 * longest (Industrials, 84 rows) runs for **3.0 screens** on its own. Scrolling
 * is not a way of getting around that; it is the absence of one.
 *
 * So the rail is a row of the table's own structure, stated once, above it: the
 * twelve bands with their counts, each one a jump. Between them and the
 * collapse control beside them, the 518-row table becomes a thing with a
 * contents page.
 *
 * ## Links, and their default prevented
 *
 * They are real `<a href="#…">`s — announced as links, offering the address on
 * a middle-click, activated by Enter with no handler of our own — and the
 * navigation is prevented so that twelve jumps are not twelve entries in the
 * back stack. That is `SEARCH-AND-SELECTION.md` §3's argument arriving
 * somewhere it was not written for: *the back button must not walk keystrokes*
 * is the same objection as *the back button must not walk jumps*, and a
 * fragment naming a sector band is no more a shareable state than a half-typed
 * query is.
 *
 * ## The jump moves focus, and lands on a control
 *
 * A jump that only scrolls is a jump a keyboard user cannot take — the page
 * moves and their focus does not, so the next Tab returns them to where they
 * were. The target is the band's **disclosure button**, which is already
 * focusable and is the most useful thing to be standing on when you arrive:
 * the next thing a reader can do is shut the band they just reached, and Tab
 * from there walks its rows.
 *
 * ## The full sector name, not `TECH`
 *
 * The design deliverable abbreviated all eleven. Declined: `SECTOR_LABELS`
 * exists precisely so nobody derives a display string by transform — "Health
 * Care" and "Healthcare" are the same slug and different words — and an
 * abbreviation is a second vocabulary for eleven things this product already
 * names once. Twelve full labels wrap to two lines at every width this is
 * reviewed at, and that is the cheaper cost.
 */
function BandRail({
  groups,
  ids,
  everythingShut,
  onToggleAll,
}: {
  readonly groups: readonly UniverseGroup[];
  readonly ids: string;
  readonly everythingShut: boolean;
  readonly onToggleAll: () => void;
}) {
  const labelId = `${ids}-rail-label`;

  return (
    // Named by the element a reader can see rather than by an `aria-label`,
    // which is `Button`'s `iconOnly` argument applied to a landmark: a second
    // name nobody reviewing the screen can see is a name that drifts from the
    // visible one with no way to notice.
    <nav className={styles.rail} aria-labelledby={labelId}>
      <div className={styles.railHead}>
        <span className={styles.railLabel} id={labelId}>
          Jump to a sector
        </span>
        {/*
         * **The real skip link, and it is one keystroke rather than a jump.**
         *
         * Task 2.11.5 worried that 518 tab stops wanted a way past them, and
         * Task 2.11.7 measured that there is nothing after the table to skip
         * to. What a keyboard user actually wants on this page is for the table
         * to be *short*, which is what this does: twelve bands and no rows.
         *
         * Not disabled in either direction and never absent — it is the same
         * control saying which way it goes, for `FailedState`'s reason. A
         * control that disappears at one end of its own range is a control a
         * reader has to hunt for.
         */}
        <Button
          variant="secondary"
          size="small"
          onClick={onToggleAll}
          // **The state, because the label alone is inaudible** (Task 2.11.9).
          //
          // Walked in Chromium: pressing this removed **518 rows** from the
          // page and announced *nothing*. Task 2.11.8's reason for leaving the
          // summary line out of the live region is that `aria-expanded` is
          // spoken at the moment the listener presses the control and about
          // the thing they pressed — which is a complete argument for a band's
          // own disclosure and does not reach this control, because this
          // control had no `aria-expanded` to speak. The name flipping from
          // `Collapse all` to `Expand all` is not a substitute: it is read on
          // arrival at a control, and a name that changes under a listener who
          // is already on it is not reliably re-read by anything.
          //
          // So it gets the same mechanism the twelve bands have rather than a
          // live region of its own, which also keeps `FRONTEND-STATE.md` §7's
          // count of regions on this page where it is. It carries no
          // `aria-controls`: there are twelve targets and no element that
          // contains all of them, and an id list naming twelve `<tbody>`s is
          // a promise about "move to controlled element" that nothing here can
          // keep.
          aria-expanded={!everythingShut}
        >
          {everythingShut ? "Expand all" : "Collapse all"}
        </Button>
      </div>
      <ul className={styles.railList}>
        {groups.map((group) => (
          <li key={group.key}>
            <a
              className={cx(
                styles.railLink,
                // The market proxies are not a sector — they are the four
                // whole-market ETFs, which belong to none — so the band recedes
                // rather than sitting among eleven peers. It is still in the
                // rail, because a control that cannot reach a band is a filter
                // wearing a different hat.
                group.benchmark === null ? styles.railLinkAside : undefined,
              )}
              href={`#${bandButtonId(ids, group.key)}`}
              onClick={(event) => {
                event.preventDefault();
                jumpToBand(bandButtonId(ids, group.key));
              }}
            >
              {group.name}{" "}
              <span className={styles.railCount}>
                {group.securities.length}{" "}
                {/*
                 * The same split the band count makes: the unit is heard and
                 * not seen, because on screen the figure sits beside a name in
                 * a row of figures and says what it counts by being there. The
                 * space before it is load-bearing for the same reason it is on
                 * the band — see there.
                 */}
                <span className={styles.visuallyHidden}>securities</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Take a reader to a band: scroll it into view, clear the chrome, then put
 * focus on its control.
 *
 * ## The middle step is the one this task was warned about, and it was real
 *
 * TASK-08's own brief says *an element scrolled to by focus can land underneath
 * a sticky band, which is invisible to every automated check and obvious to
 * anyone using Tab*. Measured in Chromium before this line existed: a jump to
 * Industrials put the band's top at viewport y=**0**, and the application's
 * masthead is `position: sticky` and **133px tall** at 1710px — so the band and
 * its first four rows were behind it, on a page that had just scrolled 11,933px
 * to reach them. Focus was on an element nobody could see.
 *
 * ## Why the chrome is measured rather than tokenised
 *
 * `--app-header-height` is 56px and is the **masthead** only; the sticky header
 * also carries the status strip, which wraps to two rows at 768px and three at
 * 390px. So the number this needs exists at three different values and is
 * decided by a media query in another component's stylesheet — a token would be
 * a second copy of it, checked by nothing, wrong at two viewports the first time
 * the strip's contents change.
 *
 * Reading the element is a DOM reach and is the honest version of the same
 * fact. It also degrades exactly right: in the workshop there is no `<header>`
 * and no chrome to clear, so the offset is zero and the band goes to the top.
 *
 * ## The order, and `preventScroll`
 *
 * Focusing an element scrolls it into view **its own way** — the minimum
 * movement that makes it visible, which lands a band at the *bottom* edge with
 * its rows off screen below. Scrolling deliberately and then refusing the
 * second scroll is what puts the band where a reader can read down it.
 *
 * A `null` target is a band that is not on the page, which cannot happen from
 * the rail — the links are built from the rendered groups — and is not worth an
 * error path nothing can reach.
 */
function jumpToBand(id: string): void {
  const target = document.getElementById(id);
  if (target === null) return;

  // **One scroll, to a position computed once**, rather than `scrollIntoView`
  // followed by a correction. Two scrolls were tried and are measurably not
  // equivalent: `scrollIntoView({ block: "start" })` does not reliably leave
  // the element's top at exactly zero — in Playwright's Chromium at 1440×900 it
  // landed 2px short, so the correction subtracted the chrome from the wrong
  // origin and put the band a pixel behind it. Adding the element's current
  // offset to the page's own scroll is arithmetic with no engine behaviour in
  // it.
  //
  // The page is the scroller and that was measured rather than assumed: the
  // `Panel` around this table declares `overflow: auto`, but it grows with its
  // content — `scrollHeight` and `clientHeight` both read 18,764px — so it is a
  // scrollport that never scrolls. Which is also why a sticky band header does
  // nothing here; see the task's record.
  const top = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: top - stickyChromeHeight() });
  target.focus({ preventScroll: true });
}

/**
 * How much of the top of the viewport the application's own chrome is sitting
 * over.
 *
 * `<header>` rather than a class name, because the thing being asked about is
 * the page's banner landmark and there is exactly one — and because a class
 * name from another component's CSS Module is not reachable from here anyway.
 *
 * The `position` check is not defensive padding: it is the whole question. A
 * header that is not sticky occludes nothing, and subtracting its height would
 * scroll the band *past* the top of the viewport.
 *
 * **Why this measures rather than reading `--sticky-chrome-height`, which
 * `AppHeader` publishes from the same element** — recorded 2026-09-11 at Story
 * 2.11's close, because two readers of one fact with no link between them is the
 * shape this repository normally refuses. The custom property exists for
 * `base.css`'s `scroll-padding-top`, which is the browser's own
 * scroll-into-view and reaches every ordinary tab stop. It cannot serve this
 * call: `window.scrollTo` ignores `scroll-padding` entirely, so a programmatic
 * jump has to do the subtraction itself whatever the property says. Reading it
 * anyway would trade a `getBoundingClientRect()` for a `getComputedStyle()` on
 * the root plus a `parseFloat` of a string this component does not own, and
 * would go silently wrong in exactly the case the `position` check exists for —
 * a story or a test where no `AppHeader` is mounted and the property is simply
 * absent. The fact still has **one source**: the element. See
 * `useStickyChromeHeight`, which reached this from the other side.
 */
function stickyChromeHeight(): number {
  const header = document.querySelector("header");
  if (header === null) return 0;

  const { position } = getComputedStyle(header);
  if (position !== "sticky" && position !== "fixed") return 0;

  // Rounded **up**, and it is a one-pixel decision with a measurement behind
  // it. The header's height is fractional at some zoom levels and browsers snap
  // a scroll offset to whole device pixels, so the exact value leaves the band
  // a pixel behind the chrome — measured at 131 against a 132px header, which
  // went red in `universe-navigation.spec.ts` and is invisible to a reader. A
  // pixel of air below the chrome is the harmless direction to be wrong in.
  return Math.ceil(header.getBoundingClientRect().height);
}

/**
 * What is shown while the first request is in flight.
 *
 * **Skeleton rows rather than a line of text, and the reason is layout rather
 * than fashion.** A one-line "loading" message collapses the region to the
 * height of that line and then shoves the whole page down when 518 rows land.
 * Something table-shaped holds the space, so the arrival is an arrival rather
 * than a jolt.
 *
 * The bars are `aria-hidden` and the sentence above them is the accessible
 * answer: a screen reader gets one honest statement instead of a description of
 * seven grey rectangles.
 *
 * **`aria-live="polite"` used to be on this sentence and Task 2.4.5 took it
 * off**, having reproduced what it actually did. See `Announcement` below: the
 * announcing element was the one being removed, so the page said it had started
 * and never said it had finished.
 */
function LoadingState() {
  return (
    <div>
      <p className={styles.state}>Loading the tracked universe…</p>
      <div className={styles.skeleton} aria-hidden="true">
        {SKELETON_ROWS.map((row) => (
          <span className={styles.skeletonRow} key={row} />
        ))}
      </div>
    </div>
  );
}

/**
 * How many bars stand in for the table. Seven is enough to read as "rows" and
 * few enough that it does not claim to know how many are coming.
 *
 * The widths and the stagger are in the stylesheet rather than here, as
 * `:nth-child` rules: they are texture rather than data, and putting them in
 * the component would be the one place in this file with a literal length in
 * it. Ragged on purpose — identical bars read as a loading *graphic*, and an
 * uneven right edge reads as a column of names that has not arrived.
 */
const SKELETON_ROWS = [1, 2, 3, 4, 5, 6, 7];

/**
 * A migrated-but-unseeded database, which is the state nobody plans for and
 * every developer meets on their first run.
 *
 * **It names the command**, because an empty screen is an invitation to act and
 * "no data" is not one. This is the honest read of a real production state too:
 * a deploy whose migration step ran and whose `pnpm universe` step did not
 * leaves exactly this, and the same sentence is the fix in both places.
 */
function EmptyState() {
  return (
    <div className={styles.state}>
      <p className={styles.stateHeadline}>The universe has not been loaded.</p>
      <p>
        This service is running and its database holds no securities. Run{" "}
        <code className={styles.command}>pnpm universe</code> against it to load
        the tracked universe.
      </p>
    </div>
  );
}

/**
 * The failures, in one treatment.
 *
 * **There are three renderings and two of them are the same failure**, which is
 * the shape Task 2.10.2 arrived at rather than the one it started with.
 *
 * - *no response* — nothing arrived at all. Check that the service is running
 *   and that this page is allowed to call it.
 * - *temporarily unavailable* — the service answered and said it could not
 *   reach what it needs. Nothing here is broken and waiting is the whole fix.
 * - *unexpected response* — something answered and it was not this service.
 *   Check what is serving that address.
 *
 * A single "something went wrong" would send two thirds of those readers
 * somewhere useless. So there are three words and three sentences, and they
 * share one rendering so the page does not look like it has three unrelated
 * error states — the rule Task 2.4.3 wrote for two, applied to a third without
 * inventing a second vocabulary for it.
 *
 * **The third is not a third state.** `retryable` is a flag on the failed state
 * (`use-securities.ts` carries the reasoning, `FRONTEND-STATE.md` §4 the
 * decision), derived from the error's `code` in `packages/shared`. What it
 * changes here is exactly the two things that differ: the sentence about
 * whether waiting will help, and whether there is a control.
 *
 * **The raw `code` is nowhere on this screen and must not arrive here.** It is
 * an internal discriminator; `requestId` remains the only internal identifier
 * this product shows.
 *
 * **The treatment is `BackendIndicator`'s, deliberately.** A marker whose shape
 * carries the state, a lowercase letterspaced word beside it, achromatic apart
 * from the one amber a glance should land on. That is not a coincidence worth
 * economising on: the same conditions are already being reported by the
 * indicator in the chrome at the moment this region fails, and a second visual
 * vocabulary for the same facts would read as two unrelated things going wrong.
 *
 * **Nothing here is `--status-error` red.** PRODUCT_SPEC.md §36 makes a lost
 * connection a product state rather than a failure of the application, and the
 * red in this palette is for something that actually broke. `ErrorFallback` —
 * which does carry a red rule — is what a render failure looks like, and this
 * is emphatically not one: the hook stores a value rather than throwing, so no
 * boundary is involved and the rest of the page is untouched.
 */
function FailedState({
  failure,
  requestId,
  retryable,
  retrying,
  onRetry,
}: {
  readonly failure: SecuritiesFailure;
  readonly requestId: string | null;
  readonly retryable: boolean;
  readonly retrying: boolean;
  readonly onRetry: () => void;
}) {
  const copy = failedCopy(failure, retryable);

  return (
    <div className={styles.state}>
      <span className={cx(styles.marker, copy.marker)} aria-hidden="true" />
      <span className={styles.stateLabel}>{copy.label}</span>
      <p className={styles.stateHeadline}>{copy.headline}</p>
      <p>{copy.cause}</p>
      {/*
       * Whether waiting will help, always said, in both directions.
       *
       * The second half is the one that is easy to leave out and is the reason
       * this is not conditional: a failure that offers no button and says
       * nothing about why leaves a reader waiting for a page that will never
       * come good. Saying "this will not fix itself" is the honest half of the
       * same sentence, and it is what makes the button's absence read as a
       * decision rather than as something missing.
       */}
      <p>{copy.prospect}</p>
      {retryable && (
        /*
         * **The first control in this product that re-asks a question.**
         *
         * A `Button` since the 2026 refresh — it was a hand-styled `<button>`
         * in this file's own stylesheet, one of three such copies — and a
         * button rather than a link because it changes what is on this page
         * instead of going anywhere.
         *
         * It is deliberately **not** disabled while the retry is in flight. A
         * disabled button loses focus in every browser, which would take a
         * keyboard user to the top of the document at the moment they acted;
         * and the hook is safe to press again anyway — a second press
         * supersedes the first and the superseded answer never lands. So the
         * word changes and the control stays where the user left it.
         */
        <p className={styles.actions}>
          <Button variant="secondary" icon="refresh" onClick={onRetry}>
            {retrying ? "Trying again…" : "Try again"}
          </Button>
        </p>
      )}
      {/*
       * The correlation id, and this page is the first thing in the product to
       * put an internal identifier in front of a user. `api-client.ts` owns the
       * rule and this task does not revisit it: the whole id and never a prefix
       * — it is a UUID v4 with no internal structure, so eight characters of it
       * match nothing in a log — labelled, and only ever beside a failure the
       * user is already being told about. `null` when nothing arrived to carry
       * one, which is most of the `unreachable` cases.
       *
       * It is set in `--font-data` as of Task 2.4.4. A value somebody is being
       * asked to read back is the one string on this page a proportional face
       * genuinely damages, and the token's comment carries the argument.
       */}
      {requestId !== null && (
        <p className={styles.reference}>
          Reference <span className={styles.command}>{requestId}</span>
        </p>
      )}
    </div>
  );
}

/**
 * The words for one failure, in one place, so the component above renders them
 * rather than deciding them.
 *
 * `prospect` is the sentence Task 2.10.2 exists for. Before it, the commonest
 * failure this page has — a service that is up and cannot reach its database —
 * rendered as *unexpected response*, which told a reader that nothing would
 * help at the exact moment when waiting was the entire answer.
 */
function failedCopy(
  failure: SecuritiesFailure,
  retryable: boolean,
): {
  readonly label: string;
  readonly marker: string | undefined;
  readonly headline: string;
  readonly cause: string;
  readonly prospect: string;
} {
  if (failure === "unreachable") {
    return {
      label: "no response",
      // Hollow: nothing answered. `BackendIndicator`'s silhouette for the same
      // condition, which is the imitation this treatment is built on.
      marker: styles.markerHollow,
      headline: "The tracked universe is not available.",
      cause:
        "Nothing answered at the service’s address. Check that the service is running and that this page is allowed to call it.",
      prospect:
        "A service that is starting up looks exactly like this, so trying again may work.",
    };
  }

  if (retryable) {
    return {
      label: "temporarily unavailable",
      // Dashed: the silhouette this language already uses for *not yet* rather
      // than for a state — and deliberately not the amber square, which marks
      // the one condition on this page that needs somebody to go and look at
      // something. This one needs nobody.
      marker: styles.markerPending,
      headline: "The tracked universe is temporarily unavailable.",
      cause:
        "The service answered, and it could not reach the data it needs. Nothing on this page is broken and there is nothing here to fix.",
      prospect: "This is usually brief. Trying again in a moment should work.",
    };
  }

  return {
    label: "unexpected response",
    // A filled amber square: something answered and it was the wrong thing.
    marker: styles.markerAttention,
    headline: "The tracked universe could not be read.",
    cause:
      "Something answered at the service’s address and it was not this service. Check what is serving that address.",
    prospect:
      "Trying again now would produce the same answer, so this page is not offering to.",
  };
}

/**
 * One sentence, written to be heard, saying which of the four states this is
 * (Task 2.4.5).
 *
 * ## The defect this replaces, reproduced rather than reasoned about
 *
 * Task 2.4.3 put `aria-live="polite"` on the *loading* paragraph, which is the
 * reflex answer and is wrong in a way that is invisible to a sighted reviewer.
 * Measured in a browser across the real transition: before the response the DOM
 * holds `<p aria-live="polite">Loading the tracked universe…</p>`, and after it
 * there is **no live region in the document at all** — because the announcing
 * element is the one being removed. So a screen-reader user was told the page
 * had started and never told it had finished, which is exactly the "page that
 * appears to do nothing" the announcement existed to prevent.
 *
 * A live region has to be **present before the content it announces changes**.
 * That is the whole reason this element renders in every state and never
 * unmounts.
 *
 * ## Why it is hidden rather than being each state's own lead line
 *
 * The nicer-looking design is to hoist each state's first sentence up here, so
 * the announcement *is* the visible line and nothing is written twice. It was
 * tried and it does not survive the failed state: there, a marker and a status
 * word come **before** the headline, so the element could not hold a constant
 * position across all four states — and a live region that moves in the tree is
 * a live region React unmounts and recreates, which is the defect being fixed.
 *
 * What is left is not really duplication either, and `PriceChange` is the
 * precedent: visible text is written to be **scanned** and an announcement is
 * written to be **heard, once, out of context**. `518 securities tracked · 11
 * sectors · 15 ETFs` is a good line to scan and a poor sentence to hear — and
 * measurably so, since those separators are CSS `::before` content, so the
 * element's own text runs together as `518 securities tracked11 sectors15 ETFs`.
 * That is `e2e/README.md`'s `Backend servicehealthy` trap arriving in a place
 * where it would have been *heard* rather than merely mis-asserted on.
 *
 * ## `role="status"` and deliberately never `role="alert"`
 *
 * `status` implies `aria-live="polite"` and `aria-atomic="true"` — polite so it
 * waits for a pause rather than interrupting, atomic so the whole sentence is
 * read rather than the words that changed.
 *
 * `alert` is the tempting upgrade for the two failed states and is refused
 * twice over. PRODUCT_SPEC.md §36 makes an unreachable service a product state
 * rather than a failure of the application, and assertive delivery says the
 * opposite. And `role="alert"` is what `ErrorFallback` carries, which is the
 * one thing `expectNothingFailedToRender` looks for across every route in the
 * browser suite: putting one here would mean a page reporting a backend it
 * cannot reach was indistinguishable, to that assertion, from a page that
 * failed to render.
 */
function Announcement({ view }: { readonly view: SecuritiesView }) {
  return (
    <p className={styles.visuallyHidden} role="status">
      {announce(view)}
    </p>
  );
}

/**
 * What each state sounds like.
 *
 * The loaded sentence carries the two figures that answer the question this
 * screen exists for — how much is covered, and across how much of the market —
 * and deliberately not the third (`ETFs`), which is a detail somebody reads
 * rather than hears. It is `securities in N sectors` rather than the summary
 * line's own clauses because a heard sentence wants a preposition where a
 * scanned line wants a separator.
 *
 * **The three settled sentences do repeat text that is also on screen, and that
 * is accepted rather than worked around.** The alternative is deliberately
 * different wording for one fact, which is two vocabularies for the same state
 * — exactly what the failure states' shared marker language exists to avoid.
 * A live region duplicating visible text is the ordinary shape of one: the
 * announcement and the browse are two different interactions, and only one of
 * them happens at the moment the page changes.
 */
function announce(view: SecuritiesView): string {
  switch (view.state) {
    case "loading":
      // **Deliberately nothing, and this is the one place the duplication was
      // worth removing.** A live region only has to be *present* before the
      // content it announces changes; content that is already there when the
      // region is created is not an announcement, because there was no change.
      // So a loading sentence here would never be heard as one — it would only
      // be a second copy of the visible line for anyone browsing the page.
      //
      // The asymmetry has a reason rather than being an oversight: `loading` is
      // the state this page starts in and can never return to, because
      // `useSecurities` fetches once. There is no transition *into* it to
      // announce.
      return "";

    case "loaded": {
      const { tracked } = summarise(view.securities);
      const sectors = groupUniverse(view.securities).filter(
        (group) => group.benchmark !== null,
      ).length;

      // The third sentence is the one this task adds, and it is deliberately
      // **not** the summary line's third figure. A listener can act on "is
      // there anything to look at"; `47.7M bars` is a scale claim somebody
      // reads, and a magnitude spoken as "forty-seven point seven M" is worse
      // than not saying it. So the count of securities with history is heard
      // and the total is seen.
      return `The tracked universe loaded. ${String(tracked)} securities in ${String(sectors)} sectors. ${describeHistory(view.coverage.size, view.securities.length)} ${describeCloses(view.lastCloses)}`;
    }

    case "empty":
      return "The universe has not been loaded. This service holds no securities.";

    case "failed": {
      // **A retry in flight is announced, and that is what makes the button
      // audible.** Pressing it changes nothing else a listener can hear: the
      // word, the headline and the reference are all still true. Without this
      // sentence the control would be one whose entire feedback is visual.
      //
      // It also does a second job that is easy to miss. A retry that fails the
      // same way returns this region to a sentence it has already spoken — and
      // a live region whose text does not change announces nothing. Passing
      // through this sentence and back out of it is what makes the second
      // failure heard at all.
      if (view.retrying) return "Trying the tracked universe again.";

      const copy = failedCopy(view.failure, view.retryable);
      return `${copy.headline} ${copy.cause} ${copy.prospect}`;
    }
  }
}

/**
 * What the live region says about the prices on the page.
 *
 * **The session date and nothing else.** The column heading carries it for a
 * reader; a listener meeting a table of prices needs the same fact and cannot
 * get it from a column header until they land on a cell. It is the one sentence
 * here that keeps a stale number from being heard as a live one, which is why
 * it is in the announcement rather than left to the heading alone.
 *
 * When the closes disagree about their session there is no single date to
 * speak, so this says how many rows carry a price and stops — each cell states
 * its own session, and a listener reaching one is told.
 */
function describeCloses(
  closes: ReadonlyMap<string, SecurityLastClose>,
): string {
  if (closes.size === 0) return "No closing prices are stored yet.";

  const session = commonSession(closes);
  if (session === null) {
    return `Closing prices are stored for ${String(closes.size)} of them, from more than one session.`;
  }

  return `Closing prices are from the ${session} session.`;
}

/**
 * What the live region says about how much history we hold.
 *
 * Three sentences rather than one with a conditional clause, because "none of
 * them" and "all of them" are genuinely different things to be told and the
 * middle case is the only one where a ratio helps.
 */
function describeHistory(withHistory: number, rows: number): string {
  if (withHistory === 0) return "No market history is stored yet.";
  if (withHistory === rows) return "Market history is stored for all of them.";
  return `Market history is stored for ${String(withHistory)} of them.`;
}

/**
 * Render the state, rather than infer it.
 *
 * A `switch` over the discriminated union: `tsc` refuses this function if a
 * member is added and not handled, and there is no combination of flags here
 * that could contradict itself.
 *
 * The announcement is a sibling of it rather than part of it, which is the one
 * thing here not to tidy away: it has to survive every transition the `switch`
 * makes, and folding it into a branch is how it stops doing that.
 */
export function UniverseTable({
  view,
  onRetry,
  initiallyCollapsed = NOTHING_COLLAPSED,
}: UniverseTableProps) {
  return (
    <>
      <Announcement view={view} />
      <StateBody
        view={view}
        onRetry={onRetry}
        initiallyCollapsed={initiallyCollapsed}
      />
    </>
  );
}

/**
 * The default: every band open.
 *
 * A module constant rather than a `[]` in the parameter list, because a fresh
 * literal on every render is a new object identity — harmless here, since the
 * seed is read once, and exactly the kind of thing that stops being harmless
 * the day somebody makes it a dependency.
 */
const NOTHING_COLLAPSED: readonly string[] = [];

export interface UniverseTableProps {
  /**
   * The state, **whole**, rather than spread back into props.
   *
   * The opposite of `BackendIndicator`'s four separate props, and both are
   * right: a union exists so the impossible combinations cannot be built, and
   * handing a renderer the pieces gives back the boolean space it removed.
   */
  readonly view: SecuritiesView;

  /**
   * Ask for the universe again.
   *
   * **Required, for `ErrorFallback`'s reason**: offering recovery is the half
   * of a failure state that is easy to forget, and an optional callback is a
   * failure state that silently loses its way out. It is only ever *rendered*
   * on a failure this client believes is worth retrying — which is why this is
   * a callback rather than a state the table owns. A component that fetched
   * would be a component that could not be reviewed in the workshop.
   */
  readonly onRetry: () => void;

  /**
   * Which sector bands start shut. Defaults to none.
   *
   * **The route passes nothing, and the workshop is why this exists**: a
   * collapse is component state, and there is no other way to put this table
   * into its shut arrangement and review it beside the open one. That is the
   * same argument `BarSeriesPanel`'s `defaulted` makes, and it is worth being
   * explicit that the prop is honest rather than a test seam — a second screen
   * showing the universe as a contents page would pass every band here on its
   * first render.
   *
   * Read **once**. A band a reader has opened does not shut again because this
   * prop still names it.
   */
  readonly initiallyCollapsed?: readonly string[];
}

function StateBody({
  view,
  onRetry,
  initiallyCollapsed = NOTHING_COLLAPSED,
}: UniverseTableProps) {
  switch (view.state) {
    case "loading":
      return <LoadingState />;

    case "loaded":
      return (
        <UniverseRows
          securities={view.securities}
          coverage={view.coverage}
          lastCloses={view.lastCloses}
          initiallyCollapsed={initiallyCollapsed}
        />
      );

    case "empty":
      return <EmptyState />;

    case "failed":
      return (
        <FailedState
          failure={view.failure}
          requestId={view.requestId}
          retryable={view.retryable}
          retrying={view.retrying}
          onRetry={onRetry}
        />
      );
  }
}
