import { cx } from "../../cx.js";
import type { BarSeriesView } from "../../market/index.js";
import { formatCount } from "../BarSeriesPanel/series-facts.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import { hasClauses, toSourceNote } from "./source-note.js";
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
// It is presentational: two props, no hook, no `fetch`. Every state is
// reachable from a story, which matters because two of them cannot be produced
// by a running server at all.

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
}

export function SourceNote({ shown, feed }: SourceNoteProps) {
  const note = toSourceNote(shown, feed);

  // Bound here rather than read twice inside the JSX: the narrowing does not
  // survive into the `map` callback, and the callback needs the length to know
  // whether there is a split worth counting.
  const { feeds, prices } = note;

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
                  <span className={cx(styles.feedLabel)}>{stretch.label}</span>
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
    </dl>
  );
}
