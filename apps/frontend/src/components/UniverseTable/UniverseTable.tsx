import { SECTOR_ETFS, SECTOR_LABELS, SECTORS } from "@marketpulse/shared";
import type { Sector, Security, SecurityKind } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import type {
  SecuritiesFailure,
  SecuritiesView,
} from "../../use-securities.js";
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
 * the deployed table is 101 rows, all active — which is exactly the trap: the
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
}: {
  readonly securities: readonly Security[];
  readonly groups: readonly UniverseGroup[];
}) {
  const { tracked, noLongerTracked, etfs } = summarise(securities);

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
    </p>
  );
}

/**
 * One fact, as a figure and the words that say what it counts.
 *
 * Deliberately a line of facts rather than a row of stat tiles. A big number
 * over a small caption is the shape every dashboard reaches for first, and on a
 * page whose actual subject is a *structure* it would put the least interesting
 * thing — that there are 101 of something — in the largest type on the screen.
 */
function Figure({
  value,
  label,
}: {
  readonly value: number;
  readonly label: string;
}) {
  return (
    <span className={styles.figure}>
      <span className={styles.figureValue}>{value}</span> {label}
    </span>
  );
}

function SecurityTableRow({ security }: { readonly security: Security }) {
  const untracked = security.status === "untracked";

  return (
    <tr className={cx(styles.row, untracked ? styles.untracked : undefined)}>
      {/*
       * A `<th scope="row">`, so a screen reader announces the symbol before
       * each cell in the row — "Semiconductors" is heard as NVDA's industry
       * rather than as a bare word.
       */}
      <th scope="row" className={cx(styles.cell, styles.symbol)}>
        {security.symbol}
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
    </tr>
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
}: {
  readonly securities: readonly Security[];
}) {
  const groups = groupUniverse(securities);

  return (
    <>
      <SummaryLine securities={securities} groups={groups} />

      {/*
       * The entrance, and it is the one place motion lands on this page.
       *
       * A table arriving is the moment §5.6 means by "it must feel alive": the
       * alternative is 101 rows appearing between two frames with no indication
       * that a request completed, which is what a screen that reads as dead
       * looks like. It plays **once, before anybody is reading**, which is the
       * line the motion tokens' own comment draws — nothing here animates a
       * value that is already on screen, because a number that moves while an
       * analyst reads it is worse than one that changes instantly.
       */}
      <div className={styles.entering}>
        <table className={styles.table}>
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
            </tr>
          </thead>

          {groups.map((group) => (
            <tbody key={group.key}>
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
                <th scope="rowgroup" colSpan={4} className={styles.group}>
                  {/* An inner flex box rather than a flex `<th>`: a table cell
                      given `display: flex` stops being a table cell, and a
                      `colspan` that no longer spans is the kind of breakage
                      that only shows up at one viewport width. */}
                  <span className={styles.groupBand}>
                    <span className={styles.groupName}>{group.name}</span>
                    <span className={styles.groupDetail}>
                      {group.benchmark === null
                        ? group.detail
                        : `Benchmark ${group.benchmark}`}
                    </span>
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
                    <span className={styles.groupCount}>
                      {group.securities.length}
                      <span className={styles.visuallyHidden}> securities</span>
                    </span>
                  </span>
                </th>
              </tr>
              {group.securities.map((security) => (
                <SecurityTableRow key={security.symbol} security={security} />
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}

/**
 * What is shown while the first request is in flight.
 *
 * **Skeleton rows rather than a line of text, and the reason is layout rather
 * than fashion.** A one-line "loading" message collapses the region to the
 * height of that line and then shoves the whole page down when 101 rows land.
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
 * The two failures, in one treatment.
 *
 * **There are two and not one, and they send a reader to different places** —
 * nothing arrived at all, against something arrived and was not this service.
 * A single "something went wrong" would send half of those readers to check a
 * service that is running perfectly. So there are two words and two sentences,
 * and they share a rendering so the page does not look like it has two
 * unrelated error states.
 *
 * **The treatment is `BackendIndicator`'s, deliberately.** A marker whose shape
 * carries the state, a lowercase letterspaced word beside it, achromatic apart
 * from the one amber a glance should land on. That is not a coincidence worth
 * economising on: the same two conditions are already being reported by the
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
}: {
  readonly failure: SecuritiesFailure;
  readonly requestId: string | null;
}) {
  const unreachable = failure === "unreachable";

  return (
    <div className={styles.state}>
      <span
        className={cx(
          styles.marker,
          unreachable ? styles.markerHollow : styles.markerAttention,
        )}
        aria-hidden="true"
      />
      <span className={styles.stateLabel}>
        {unreachable ? "no response" : "unexpected response"}
      </span>
      <p className={styles.stateHeadline}>
        {unreachable
          ? "The tracked universe is not available."
          : "The tracked universe could not be read."}
      </p>
      <p>
        {unreachable
          ? "Nothing answered at the service’s address. Check that the service is running and that this page is allowed to call it."
          : "Something answered at the service’s address and it was not this service. Check what is serving that address."}
      </p>
      {/*
       * The correlation id, and this page is the first thing in the product to
       * put an internal identifier in front of a user. `api-client.ts` owns the
       * rule and this task does not revisit it: the whole id and never a prefix
       * — it is a UUID v4 with no internal structure, so eight characters of it
       * match nothing in a log — labelled, and only ever beside a failure the
       * user is already being told about. `null` when nothing arrived to carry
       * one, which is most of the `unreachable` cases.
       *
       * It is set in `--font-mono` as of this task. A value somebody is being
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
 * written to be **heard, once, out of context**. `101 securities tracked · 11
 * sectors · 15 ETFs` is a good line to scan and a poor sentence to hear — and
 * measurably so, since those separators are CSS `::before` content, so the
 * element's own text runs together as `101 securities tracked11 sectors15 ETFs`.
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

      return `The tracked universe loaded. ${String(tracked)} securities in ${String(sectors)} sectors.`;
    }

    case "empty":
      return "The universe has not been loaded. This service holds no securities.";

    case "failed":
      return view.failure === "unreachable"
        ? "The tracked universe is not available. Nothing answered at the service’s address."
        : "The tracked universe could not be read. Something answered at the service’s address and it was not this service.";
  }
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
export function UniverseTable({ view }: { readonly view: SecuritiesView }) {
  return (
    <>
      <Announcement view={view} />
      <StateBody view={view} />
    </>
  );
}

function StateBody({ view }: { readonly view: SecuritiesView }) {
  switch (view.state) {
    case "loading":
      return <LoadingState />;

    case "loaded":
      return <UniverseRows securities={view.securities} />;

    case "empty":
      return <EmptyState />;

    case "failed":
      return <FailedState failure={view.failure} requestId={view.requestId} />;
  }
}
