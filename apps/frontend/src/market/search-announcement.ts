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
 */
export const SEARCH_ANNOUNCEMENT_DELAY_MS = 400;

/** The subject every sentence opens with. */
const SUBJECT = "Security search";

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
  { matches, total }: SecurityMatches,
): string | null {
  const trimmed = query.trim();
  if (trimmed === "") return null;

  const quoted = `"${trimmed}"`;
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
