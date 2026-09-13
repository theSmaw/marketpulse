import { useSearchParams } from "react-router";

import { DEFAULT_WINDOW_SESSIONS, SESSIONS_PARAM } from "../market/index.js";

// The one place this application reads a **window** out of the address (Task
// 2.13.6), and the sibling of `use-security-symbol.ts` in every respect.
//
// `FRONTEND-STATE.md` §3: **the path names the subject and the query names the
// view.** The symbol is a path segment read in exactly one place; the window is a
// query parameter and gets the same treatment, for the reason that file's header
// gives — a value read in five components is five places for the default and the
// decoding to disagree. `?sessions=…` is **the first occupant of this product's
// query string**, which `SEARCH-AND-SELECTION.md` §3 left deliberately empty so
// that this parameter would have no precedent to argue with.
//
// Reading is here and **building is in `paths.ts`** (`securityPath`), which is
// the split the task asked for: every address this application can navigate to
// is built in one file, and every address it can arrive at is decoded in one.
//
// ## Why the parser is here rather than in `market/time-window.ts`
//
// Task 2.13.3 built the vocabulary — the five windows, the timeframe mapping,
// `windowForSessions` — and deliberately built **no parser**, because parsing is
// where the only open question lived: what to do about a negative, zero or
// unparseable count. That is decided below, and it is a decision about a *URL*
// rather than about the vocabulary, which is why it lives beside the other URL
// reader and not beside the five windows.
//
// ## The decision: this client refuses nothing. It asks, and renders the answer
//
// `use-security-symbol.ts`'s precedent, applied to a number: it does not
// upper-case or repair a symbol that is merely unusual, because **the server's
// answer naming what was asked beats a client silently reporting on something
// else.** So:
//
// | In the address   | Asked for  | What a reader sees                            |
// | ---------------- | ---------- | --------------------------------------------- |
// | absent           | 5          | the default, and no parameter is ever written  |
// | `?sessions=7`    | 7          | a real answer; the control shows no selection   |
// | `?sessions=0`    | 0          | the server's *"a window of zero sessions…"*     |
// | `?sessions=-5`   | −5         | the server's refusal, naming `-5`               |
// | `?sessions=1000` | 1000       | the server's refusal, naming the calendar bound |
// | `?sessions=abc`  | `NaN`      | the server's refusal, naming `NaN`              |
//
// Two things about that table are decisions rather than arithmetic.
//
// **A value that is not a count is asked for anyway, as `NaN`.** The alternative
// — treating it as absent and showing the default — is the snapping §4(b)
// forbids wearing a different hat: it answers a question nobody asked and leaves
// an address in the bar that disagrees with the chart under it. What it costs is
// one recorded imprecision: the server's sentence names `NaN` rather than the
// `abc` the reader typed, because `BarSeriesRequest`'s named window carries a
// `number`. Carrying the raw text to the wire would fix the wording and widen a
// type every layer between here and `series-request.ts` reads; it is not worth
// that, and the sentence is still *about* the right thing.
//
// **An empty or whitespace value is "the address did not name one".**
// `?sessions=` is not somebody asking for something strange, it is a parameter
// with nothing in it, and `use-security-symbol.ts` already treats a
// whitespace-only path segment the same way for the same reason.

/** What the address says this page is looking at, and whether it said so. */
export interface SelectedWindow {
  /**
   * The session count to ask the server for. **Never `undefined`; sometimes
   * `NaN`** — see the header. A count and never a resolved pair of instants: the
   * browser's clock is the wrong clock (`bar-series-query.ts`).
   */
  readonly sessions: number;

  /**
   * Did the address name it, or is this the default?
   *
   * Not used to decide what to *ask* — the default is a real window either way —
   * but kept because it is the question a later surface will have: a sentence
   * about "the default window" is helpful on `/securities/NVDA` and wrong on
   * `/securities/NVDA?sessions=5`, which is the same asymmetry the symbol reader
   * carries `fromAddress` for.
   */
  readonly fromAddress: boolean;
}

/**
 * Read the window this page is looking at.
 *
 * **A number in the address is only read as a count when this application would
 * spell that number the same way.** `?sessions=0x10` is a well-formed hex
 * literal that `Number` reads as 16, and a client that asked for sixteen
 * sessions while the address said `0x10` would be reporting on something the
 * reader did not ask for — the precise failure this module refuses. So the test
 * is a round trip: `String(Number(raw)) === raw`, which admits `7`, `-5`, `0`
 * and `3.5` exactly as written and sends everything else as `NaN` for the server
 * to refuse by name.
 */
export function useTimeWindow(): SelectedWindow {
  const [params] = useSearchParams();
  const named = params.get(SESSIONS_PARAM)?.trim() ?? "";

  if (named === "") {
    return { sessions: DEFAULT_WINDOW_SESSIONS, fromAddress: false };
  }

  const count = Number(named);

  return {
    sessions: String(count) === named ? count : Number.NaN,
    fromAddress: true,
  };
}
