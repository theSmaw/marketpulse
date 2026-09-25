import { cx } from "../../cx.js";
import type { BarSeriesView } from "../../market/index.js";
import { formatCount } from "../BarSeriesPanel/series-facts.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import type { SecuritiesView } from "../../use-securities.js";
import {
  CLASSIFICATION_CLAIM,
  hasClauses,
  toSourceNote,
} from "./source-note.js";
import styles from "./SourceNote.module.css";

// Where the numbers on this screen came from (Task 2.14.3).
//
// **The Security Explorer's one source note**, at the foot of the region group,
// governed by `PROVENANCE.md` §1.3: *the note states what the chrome cannot,
// and never repeats what the chrome can.* That rule is what keeps it to two
// lines rather than five, and it is the acceptance test for this component —
// put the masthead and this on one screenshot and check that no fact appears
// twice.
//
// ## Why the page says anything at all, when the chrome already says something
//
// The chrome's `FeedProvenance` is a standing claim about a **deployment**:
// which feed this build of MarketPulse reads. It cannot change without a deploy
// and a reload, and it is true of every route. Three facts about a particular
// answer have no home in it and, until this component, no home anywhere a
// reader could see: what has been done to these prices, when they were fetched,
// and — from Epic 3 — which feeds *this series* is actually made of, which is
// the case invariant 6 exists for. `PRODUCT_SPEC.md` §35 lists *hide data
// provenance* among the things this product must not do, and three of four
// provenance facts being audible-only or absent is the letter of that.
//
// ## One note for the screen, not one per region
//
// The two plots are one series on one axis stopping at one coverage edge, and
// the identity block above them is one classification, so this is one fact set
// and it gets one surface. Three captions for it is the footnote pile Task
// 2.14.2 drew a canvas to catch — and it is exactly what five correct additions
// made one at a time produce.
//
// **At the foot, and not between the plots.** `VOLUME-AND-WINDOW.md` §75
// measured what accumulates in that gap and removed it; a provenance line
// reinstated there would be that change undone by a task that had not read it.
//
// ## Not a live region, and deliberately outside the panel's
//
// `BarSeriesPanel` owns this screen's series live region, and its own rule is
// that a region belongs to a **subject** whose sentences name it. A retrieval
// timestamp moves when a tail is fetched and means nothing to anybody looking
// at a price; announcing the page as changed because of it would be a live
// region reporting bookkeeping. It is also why `retrievedAt` stays out of
// `settleSignature` — the two decisions are the same decision made at two
// surfaces.
//
// It is presentational: four props, no hook, no `fetch`. Every state is
// reachable from a story, which matters because two of them cannot be produced
// by a running server at all.
//
// ## The fourth fact, added by Task 2.14.4, is not about the bars
//
// `GET /securities` has carried `provenance.classification` since Story 2.9 and
// nothing rendered a character of it, so a **sector** — curated by this project,
// not supplied by the market-data provider — has sat three centimetres above a
// price chart reading exactly like a market observation. The clause says
// otherwise and says when the file was last checked. Its data is the universe
// answer rather than the series, which is why it is the one clause that draws on
// a page holding no bars: the commonest page in the browser suite, and until
// this the only kind of page with no note on it at all.

export interface SourceNoteProps {
  /**
   * What is **drawn** — `BarSeriesScreen.shown`, never `view`.
   *
   * While a newer request is in flight the picture on screen is the previous
   * answer, and a note describing the request rather than the picture would be
   * provenance for bars nobody can see.
   */
  readonly shown: BarSeriesView;

  /**
   * What the chrome claims, so this can avoid claiming it a second time.
   *
   * The union taken whole rather than a `feed` prop, which is
   * `FeedProvenance`'s precedent and its reason: *no feed configured*, *not
   * answered yet* and *a feed* are three different facts about the deployment,
   * and a component handed `MarketFeed | null` would have to be trusted to
   * remember which absence it was looking at.
   */
  readonly feed: MarketFeedView;

  /**
   * The tracked universe, in whatever state it is in (Task 2.14.4).
   *
   * Taken whole rather than as a resolved security or a bare provenance pair,
   * which is `SecurityIdentity`'s precedent and `UniverseTable`'s argument: the
   * union exists so the impossible combinations cannot be constructed, and
   * handing a renderer the pieces gives back the boolean space it removed. It
   * is also what keeps this component free of a fetch — the page already makes
   * this request once for the identity block and the table, and this clause
   * adds none.
   */
  readonly securities: SecuritiesView;

  /**
   * The security this page is about, from the address.
   *
   * Needed even though the claim is per response: on an address the universe
   * does not hold there is no sector to disclose the origin of, and the clause
   * is silent. See `toClassification`.
   */
  readonly symbol: string;

  /**
   * Whether this page has watched a bar for this security **arrive** (Task
   * 3.10.8).
   *
   * Marks the stretch still being added to. See `withLiveRow` for why that is
   * the last row rather than a first one above the stretches, and why the §36
   * sentence is deliberately **not** repeated here.
   */
  readonly watchingLive?: boolean;
}

export function SourceNote({
  shown,
  feed,
  securities,
  symbol,
  watchingLive = false,
}: SourceNoteProps) {
  const note = toSourceNote(shown, feed, securities, symbol, watchingLive);

  // Bound here rather than read twice inside the JSX: the narrowing does not
  // survive into the `map` callback, and the callback needs the length to know
  // whether there is a split worth counting.
  const { feeds, prices, classification } = note;

  // **Nothing at all, rather than an empty note with a rule over it.** §0.1:
  // a claim about data requires data, and on a zero-bar page every clause this
  // task ships describes nothing. That is a real state and the commonest one in
  // the suite — CI's store is 518 securities and zero bars — so it is drawn in
  // the grid as a state rather than left as an early return nobody looks at.
  if (!hasClauses(note)) return null;

  return (
    <dl className={cx(styles.note)}>
      {feeds !== null && (
        <>
          {/*
           * Plural by the count rather than always, because a single stretch
           * that is worth naming — a stored series on a deployment configured
           * for another feed — is one source and saying *sources* of it is a
           * small lie in the one place on this screen that exists to avoid
           * them.
           */}
          <dt className={cx(styles.term)}>
            {feeds.length > 1 ? "Sources" : "Source"}
          </dt>
          <dd className={cx(styles.definition)}>
            {/*
             * **A ledger rather than prose**, and the counts are the reason
             * (`PROVENANCE.md` §2.2). Drawn as a sentence, the same facts are
             * three clauses under a chart and the counts — the part that makes
             * *whichever feed is first* visibly rather than invisibly wrong —
             * end up buried mid-clause. Down a column they are compared, which
             * is `MetricStrip`'s argument: a label between two figures is what
             * makes a terminal feel like a form.
             *
             * A list rather than rows of `div`s, because a listener is told how
             * many stretches there are before hearing the first one, which is
             * precisely the fact that stops a two-feed series being mistaken
             * for a single-venue one.
             */}
            <ul
              className={cx(
                styles.ledger,
                feeds.length > 1 ? styles.counted : undefined,
              )}
            >
              {feeds.map((stretch, index) => (
                <li
                  // The index is part of the key deliberately: two stretches
                  // can name the same feed — that is what a stitch of stored
                  // bars and a fetched tail on one plan looks like — so the
                  // feed alone is not unique and React would drop a row.
                  key={`${stretch.feed}-${String(index)}`}
                  className={cx(styles.stretch)}
                >
                  {/*
                   * **The count is drawn only where there is a split to
                   * measure**, which is what the count is for
                   * (`PROVENANCE.md` §2.2): it makes *whichever feed is first*
                   * visibly rather than invisibly wrong. One stretch has no
                   * split in it, and the panel above already says how many bars
                   * are held — so printing it here would be the note repeating
                   * a fact another surface owns, which is §1.3's rule broken in
                   * the direction it is hardest to notice.
                   */}
                  {feeds.length > 1 && (
                    <span className={cx(styles.count)}>
                      {formatCount(stretch.barCount)} bars
                    </span>
                  )}{" "}
                  {/*
                   * **The label and its marker are ONE grid item**, which is
                   * a correction made by looking at the page rather than at
                   * the markup (Task 3.10.8). The `li` is a `subgrid`, so
                   * every direct child is a cell: a marker added as a sibling
                   * of the label landed in the **count** column on the
                   * sentence's row, reading as a second ledger entry rather
                   * than as a note on this one.
                   */}
                  <span className={cx(styles.labelRow)}>
                    <span className={cx(styles.feedLabel)}>
                      {stretch.label}
                    </span>
                    {/*
                     * **The live row's marker** (Task 3.10.8), and a word rather
                     * than a dot alone: colour is never the sole encoding of
                     * anything in this product, and neither is shape. The disc
                     * is the arrival vocabulary **at rest** — a state persists —
                     * and `arriving` is what a listener gets, because the disc
                     * is `aria-hidden` and a marker nobody can read is not one.
                     *
                     * It says which stretch of THIS picture is still being added
                     * to, which the chrome cannot: the chrome knows whether data
                     * is arriving at all. Two rows reading `All US exchanges`
                     * then `IEX` are either a served two-tape window or a socket
                     * extending a stored one, and until this nothing told them
                     * apart.
                     */}
                    {stretch.live === true && (
                      <span className={cx(styles.live)}>
                        <span
                          className={cx(styles.liveDisc)}
                          aria-hidden="true"
                        />
                        arriving
                      </span>
                    )}
                  </span>
                  {stretch.sentence !== undefined && (
                    <>
                      {" "}
                      <span className={cx(styles.sentence)}>
                        {stretch.sentence}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </dd>
        </>
      )}

      {prices !== null && (
        <>
          <dt className={cx(styles.term)}>Prices</dt>
          <dd className={cx(styles.definition)}>
            {/*
             * **The sentence hangs under the line rather than continuing it**,
             * which is `FeedProvenance`'s arrangement in the chrome and was a
             * correction made by looking at the page rather than at the markup:
             * set as one run, `…Retrieved 8 September 2026 Prices as they
             * printed.` collides a date with the capital letter of the next
             * sentence, and a reader parses the two as one clause and then has
             * to go back.
             *
             * The separator is the middle dot this product already uses to join
             * two facts on one line — `SecurityIdentity`'s qualifier is the
             * precedent — and it is `aria-hidden`, because a listener gets the
             * boundary from the elements and does not need it read as a word.
             */}
            <span className={cx(styles.line)}>
              <span className={cx(styles.value)}>{prices.label}</span>
              <span className={cx(styles.separator)} aria-hidden="true">
                ·
              </span>
              <span className={cx(styles.retrieved)}>
                Retrieved {prices.retrieved}
              </span>
            </span>
            {prices.sentence !== undefined && (
              <span className={cx(styles.sentence)}>{prices.sentence}</span>
            )}
          </dd>
        </>
      )}

      {classification !== null && (
        <>
          {/*
           * **A term of its own rather than a second line under `Prices`**,
           * which is the arrangement the canvas settled and the reason is the
           * one the label column exists for: these are two subjects, not two
           * facts about one. `Prices` answers *where these numbers came from*;
           * this answers *where the words above the numbers came from*. A
           * reader scanning the label column finds the one they want without
           * reading either.
           *
           * It is the **last** term because it is the least surprising claim on
           * the note and the one furthest from the picture — and because on a
           * zero-bar page it is the only term, where being last costs nothing.
           */}
          <dt className={cx(styles.term)}>Classification</dt>
          <dd className={cx(styles.definition)}>
            {/*
             * The claim, then its date on the line under it — the opposite
             * order to the prices clause above, deliberately, and the reason is
             * that this clause has no label to pair a date with. `Unadjusted ·
             * Retrieved 8 September 2026` works because `Unadjusted` comes from
             * a closed vocabulary; this group's source is a free string that
             * may never reach a screen, so there is no word to hoist and a
             * whole sentence beside a date is the run 2.14.3 measured and
             * removed. What is consistent between the two is what matters:
             * each opens with its claim and qualifies it underneath.
             */}
            <span className={cx(styles.line)}>
              <span>
                {CLASSIFICATION_CLAIM.before}
                {/*
                 * The word a reader lands on, at the weight the adjustment's
                 * label carries on the line above — which is what makes the two
                 * clauses read as one note rather than as two paragraphs that
                 * happen to share a rule.
                 */}
                <span className={cx(styles.value)}>
                  {CLASSIFICATION_CLAIM.group}
                </span>
                {CLASSIFICATION_CLAIM.after}
              </span>
            </span>
            {/*
             * **No marker, including when the date is the one we do not have.**
             * This surface is entirely typographic and stays that way: what is
             * missing in that state is one date inside a claim still being
             * made, and a marker would rank a missing date above a stated one.
             * There is also no threshold and no amber on an old one — the date
             * is the disclosure, and a mark with no cadence behind it is a
             * claim nothing checks.
             */}
            <span className={cx(styles.retrieved)}>
              {classification.checked}
            </span>
          </dd>
        </>
      )}
    </dl>
  );
}
