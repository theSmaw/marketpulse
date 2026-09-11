import type { SecurityMatches } from "./security-match.js";

// What the search's live region says, and how long it waits before saying it
// (Task 2.11.4).
//
// ## Why this is a module and not four template literals in a component
//
// The sentence is load-bearing rather than decorative, and three of its four
// properties are mechanical requirements that a component author reaching for
// `${count} results` would not reproduce by accident. They are
// `SEARCH-AND-SELECTION.md` §4's, restated here because this is where they are
// implemented:
//
// 1. **The subject comes first.** This is the third polite region on the
//    Security Explorer, and a screen reader queues regions in an order no
//    component controls (`FRONTEND-STATE.md` §7). A sentence that opens with a
//    number is a fact with no subject if it lands behind the panel's.
// 2. **The query is quoted, and that is what makes consecutive sentences
//    differ.** §7 measured that a live region whose text does not change
//    announces nothing at all. Search walks straight into it: type `nvi`,
//    delete back to `nv`, and a sentence carrying only a count is *identical*
//    in both directions, so one of the two edits is silent. The count can
//    return to where it was; the query cannot, because the query is the thing
//    the person just changed.
// 3. **The top match is named**, because a listener about to press Enter needs
//    to know what Enter will open — acceptance criterion 1, spoken.
//
// The fourth property is the capped form, which names no top match. That is
// deliberate and it is §4's own wording: when the list is a slice, what a
// listener needs is that it *is* a slice.
//
// ## Why the symbol rather than the company name
//
// `NVDA` is what the person typed towards and what the address will carry. A
// name is longer, and the four sentences in §4 name symbols.

/**
 * How long the sentence waits after the last keystroke, in milliseconds.
 *
 * **This is not a request debounce and there is no request to debounce.**
 * Matching is a synchronous scan over data the page already holds — measured at
 * 0.101 ms over the real 518 under the shipped rules — and the visible result
 * list updates on **every** keystroke. Debouncing *that* would make the list
 * lag behind a person's typing in exchange for nothing, and is the likely
 * defect here: an announcement debounce implemented one layer too low.
 *
 * Only the sentence waits. 400 ms is long enough that a touch-typist's
 * inter-key gap does not trip it and short enough not to feel like a delay
 * after the last character. It is a judgement rather than a derivation, which
 * `SEARCH-AND-SELECTION.md` §4 says out loud rather than dressing up; the
 * reversal trigger is a person reporting that it speaks over them or arrives
 * late.
 *
 * **That trigger fired at Task 2.11.9 and the answer was a second number, not
 * a different first one.** 400 is unchanged and is still right for every
 * cadence above its own threshold; what it cannot do is tell a pause from an
 * ending, so below that threshold it speaks once per keystroke. See
 * `SEARCH_ANNOUNCEMENT_MIN_GAP_MS` for the measurement and the repair.
 */
export const SEARCH_ANNOUNCEMENT_DELAY_MS = 400;

/**
 * The shortest gap allowed between two spoken sentences, in milliseconds.
 *
 * ## The defect this exists to answer, measured rather than reasoned about
 *
 * [Task 2.11.9](../../../../planning/epic-02-security-universe-historical-data/story-11-security-search-and-selection/TASK-09-keyboard-screen-reader-and-the-journey.md)
 * was told by `SEARCH-AND-SELECTION.md` §4 to go and find out whether 400 ms is
 * right in practice, and it is not — for exactly the listener it was written
 * for. Typing `nvidia` in Chromium on 2026-09-11, counting the distinct
 * sentences the region held:
 *
 * | Cadence                    | Typing took | Sentences spoken |
 * | -------------------------- | ----------- | ---------------- |
 * | fast typist, 90 ms/key     | 589 ms      | **1**            |
 * | average, 160 ms/key        | 994 ms      | **1**            |
 * | hunt-and-peck, 500 ms/key  | 3,052 ms    | **7**            |
 *
 * The debounce works perfectly above its own threshold and inverts below it: an
 * inter-key gap longer than 400 ms means **every keystroke looks like the last
 * one**, so a person typing one six-letter word heard the region speak seven
 * times, six of them while they were still typing. Two keys a second is not an
 * unusual rate for somebody navigating by ear.
 *
 * **No value of the delay fixes this**, which is why the repair is a second
 * number rather than a bigger first one. A debounce answers *have they
 * stopped?* and cannot tell a pause from an ending; raising it to clear the
 * slowest typist would make the fastest one wait for a sentence they have
 * already read.
 *
 * ## What this number is instead
 *
 * A floor on **how often the region may speak at all**, independent of what
 * tripped it. Combined with the delay above: a sentence lands 400 ms after the
 * last keystroke, or when the floor lifts, whichever is later — and what it
 * says is the state at that moment rather than the state that was pending when
 * the timer started. So the slow typist above hears the *current* answer about
 * twice while typing rather than six stale ones, and nothing changes for the
 * two cadences that were already right.
 *
 * 1,500 ms, and it is a judgement in the same way 400 is. It is roughly how
 * long a screen reader takes to read one of these sentences at a default rate,
 * which is the honest thing to pace a region by: speaking again before the
 * previous sentence has finished is what produces a queue rather than an
 * announcement. The reversal trigger is the same as the delay's and is now a
 * sharper instrument — a person reporting a backlog, or a cadence that still
 * produces one.
 */
export const SEARCH_ANNOUNCEMENT_MIN_GAP_MS = 1500;

/** The subject every sentence opens with. */
const SUBJECT = "Security search";

/**
 * What there is to match against, which the sentence has to know before it can
 * report a count (Task 2.11.6).
 *
 * Two members and not five. The states where the universe **could not be read**
 * are deliberately not here and say nothing at all: the field is not typeable
 * in any of them, so the region has nothing to announce, and the universe's own
 * live region has already said it. Two polite regions reporting one fact in the
 * same moment is how a listener learns to ignore both — which is
 * `FRONTEND-STATE.md` §7's rule that a region belongs to a subject, applied to
 * the case where the subject is somebody else's.
 */
export type SearchCorpus =
  /** The universe is here, and this is what the query matched in it. */
  | { readonly state: "ready"; readonly result: SecurityMatches }
  /** The request is still in flight. Anything typed is held, not answered. */
  | { readonly state: "loading" };

/**
 * The sentence for a query and what it matched, or `null` when there is
 * nothing to say.
 *
 * `null` is the resting state and it is a real answer rather than an empty
 * string: arriving at the Security Explorer with an empty field must say
 * **nothing**, because nothing has happened. §7's fourth mechanical clause is
 * that the region is silent on arrival, and a region rendered with `""` is
 * silent in exactly the same way — the distinction is kept in the type so a
 * caller cannot accidentally announce a sentence about no query.
 */
export function searchAnnouncement(
  query: string,
  corpus: SearchCorpus,
): string | null {
  const trimmed = query.trim();
  if (trimmed === "") return null;

  const quoted = `"${trimmed}"`;

  // The corpus before the count, because a corpus that has not arrived answers
  // every query with nothing and *"no matches"* would be a claim about the
  // market rather than a fact about the request. This branch is the whole
  // reason this function takes a state rather than a result.
  if (corpus.state === "loading") {
    return `${SUBJECT}: still loading securities. ${quoted} is kept.`;
  }

  const { matches, total } = corpus.result;
  if (total === 0) return `${SUBJECT}: no matches for ${quoted}.`;

  const top = matches[0];
  if (total === 1 && top !== undefined) {
    return `${SUBJECT}: 1 match for ${quoted}. ${top.security.symbol}.`;
  }

  // Capped: the slice is the news, so the sentence ends on it rather than on a
  // top match the listener cannot reach by pressing Enter once.
  if (matches.length < total) {
    return `${SUBJECT}: ${String(total)} matches for ${quoted}, showing the first ${String(matches.length)}.`;
  }

  return top === undefined
    ? `${SUBJECT}: ${String(total)} matches for ${quoted}.`
    : `${SUBJECT}: ${String(total)} matches for ${quoted}. ${top.security.symbol} first.`;
}
