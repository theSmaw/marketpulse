import type { WireMarketOverview } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import {
  OVERVIEW_NOTE_TERMS,
  hasOverviewClauses,
  toOverviewSourceNote,
  type FeedClause,
} from "./overview-source-note.js";
import styles from "./OverviewSourceNote.module.css";

// Where the numbers on the landing screen came from (Task 4.2.7).
//
// **One source note for the SCREEN**, at the foot of the region group — after
// the last region and before `AppFooter` — in the micro type, last in reading
// order because it qualifies everything above it. It is the position and the
// grain the Security Explorer already uses, and `PROVENANCE.md` §1.3's rule
// transfers verbatim: *the note states what the chrome cannot, and never
// repeats what the chrome can.*
//
// **Not one per region, and not one inside the proxies.** The rule exists
// because five correct additions made one at a time produce a footnote pile —
// and this is the screen where that would happen: 4.3, 4.4 and 4.5 each land a
// region with figures in it. Sizing the note for four readers now is what stops
// three later stories each growing one, and it is why the clauses **grow**
// rather than being rewritten (ADR 0029: each renders only when its own data is
// present).
//
// It is presentational — two props, no hook, no `fetch` — so every state is
// reachable from a story, including the two-tape one no local server can
// produce.
//
// ## Why it is a `<dl>` and not a paragraph
//
// `SourceNote`'s reason, and it is structural rather than stylistic: every line
// is a label and the thing it labels, and `dt`/`dd` says so without a landmark,
// an ARIA attribute or a heading. **No landmark**, deliberately: this screen
// declares seven named regions for the things a reader came for, and an eighth
// for the footnote would put it in landmark navigation beside the topology.
//
// ## Not a live region
//
// The strip above it already has none and the argument is the same one, a
// fortiori (`FRONTEND-STATE.md` §7): a retrieval instant moves when an
// aggregate is recomputed — up to sixteen times a minute — and announcing the
// page as changed for that is a live region reporting bookkeeping.

export interface OverviewSourceNoteProps {
  /**
   * The aggregate on screen, or `undefined` before the first frame.
   *
   * **The frame the strip is drawing**, never a newer request: a note
   * describing something other than the picture is provenance for figures
   * nobody can see, which is `SourceNote`'s `shown`/`view` distinction one
   * screen along.
   */
  readonly overview: WireMarketOverview | undefined;

  /**
   * What the chrome claims, so this can avoid claiming it a second time.
   *
   * The union taken whole rather than a `feed` prop — `FeedProvenance`'s
   * precedent and its reason: *no feed configured*, *not answered yet* and *a
   * feed* are three different facts about the deployment, and a component
   * handed `MarketFeed | null` would have to be trusted to remember which
   * absence it was looking at.
   */
  readonly feed: MarketFeedView;
}

export function OverviewSourceNote({
  overview,
  feed,
}: OverviewSourceNoteProps) {
  const note = toOverviewSourceNote(overview, feed);

  // Nothing to say, so nothing is drawn — not an empty box with a hairline
  // over it. It is the first-paint state and it should be brief.
  if (!hasOverviewClauses(note)) return null;

  const { observed, closes, computed } = note;

  return (
    <dl className={cx(styles.note)}>
      {observed !== null && (
        <>
          {/*
           * **`Observed prices` and not `Live prices`**, and the near-miss is
           * worth recording rather than fixing silently. This note sits a few
           * hundred pixels above a status bar whose whole vocabulary is `LIVE`
           * / `STALE` / `DISCONNECTED` — so a term reading `LIVE PRICES` in the
           * micro-label's capitals would state a **connection** on a screen
           * where exactly one surface is allowed to, and would go on stating it
           * while the cell below said `DISCONNECTED`. Two true halves, one
           * contradiction, which is Task 3.4.9's defect arriving by a new door.
           *
           * `observed` is the wire's own word for what this clause is about
           * (`WireObservedFigure`), and it is the discriminant each tile
           * already carries — so the note and the figures share one vocabulary.
           *
           * One `dt` over however many tapes, rather than `Source`/`Sources`:
           * the term names the **subject** here, not the count.
           */}
          <dt className={cx(styles.term)}>{OVERVIEW_NOTE_TERMS.observed}</dt>
          <dd className={cx(styles.definition)}>
            {observed.map((clause) => (
              <Clause key={clause.label} clause={clause} />
            ))}
          </dd>
        </>
      )}

      {closes !== null && (
        <>
          {/*
           * **A term of its own rather than a second line under the observed
           * tape**, because these are two subjects rather than two facts about
           * one. That is the whole of invariant 6 on this screen: a change
           * percentage above has an IEX numerator and a consolidated-SIP
           * denominator, and a single `Source` row could only name one of them.
           *
           * **What it does not say is which tape a particular tile is
           * showing.** `SPY` can be a live observation while `DIA` is
           * yesterday's close, in the same strip, at the same moment — the
           * ordinary state of IEX. The tiles carry that, through the
           * `observed` / `stored` discriminant and the session each stored
           * figure renders.
           */}
          <dt className={cx(styles.term)}>{OVERVIEW_NOTE_TERMS.closes}</dt>
          <dd className={cx(styles.definition)}>
            <Clause clause={closes} />
          </dd>
        </>
      )}

      {computed !== null && (
        <>
          {/*
           * Last, because it is the least surprising claim on the note and the
           * one furthest from the picture — `SourceNote`'s ordering rule.
           */}
          <dt className={cx(styles.term)}>{OVERVIEW_NOTE_TERMS.computed}</dt>
          <dd className={cx(styles.definition)}>
            <span className={cx(styles.line)}>
              <span className={cx(styles.retrieved)}>{computed}</span>
            </span>
          </dd>
        </>
      )}
    </dl>
  );
}

/**
 * A feed's label, and its sentence under it where the label cannot stand alone.
 *
 * **The sentence hangs under the line rather than continuing it**, which is
 * `SourceNote`'s arrangement and was a correction made by looking at the page:
 * set as one run, a label and a following sentence read as one clause and a
 * reader has to go back.
 */
function Clause({ clause }: { readonly clause: FeedClause }) {
  return (
    <>
      <span className={cx(styles.line)}>
        <span className={cx(styles.value)}>{clause.label}</span>
      </span>
      {clause.sentence !== undefined && (
        <span className={cx(styles.sentence)}>{clause.sentence}</span>
      )}
    </>
  );
}
