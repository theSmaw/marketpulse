import { useParams } from "react-router";

// The one place this application reads a symbol out of the address (Task
// 2.10.7).
//
// `FRONTEND-STATE.md` §3 decided that **the path names the subject and the
// query names the view**, so the symbol is a path segment and the URL is where
// it lives — not component state, not a store. That decision is what makes a
// link to a security shareable, survive a reload and survive the back button,
// which Epic 1 already proved works against the deployed host.
//
// **Reading it in one place is the point of the module**, and it is the half of
// the original instruction that survived the shape changing from
// `?symbol=NVDA` to `/securities/:symbol`. A symbol read in five components is
// five things to fix when Story 2.11 puts a search box above them, and five
// places for the default and the decoding to disagree.
//
// ## Why there is a default at all
//
// Until Story 2.11 ships search, `/securities` is how a person arrives, and
// there is no way to name a security from the interface. A page that answered
// *"choose a security"* with no means of choosing one would be a dead end
// wearing an empty state.
//
// So the bare route resolves to a symbol, and the panel says plainly that
// search arrives with Story 2.11 — Story 1.5's convention that an empty region
// names what fills it, applied to a region that is full of the wrong thing's
// data rather than empty. The alternative, redirecting `/securities` to
// `/securities/NVDA`, was rejected: it puts a symbol nobody asked for into the
// address bar and therefore into the history, so the back button leaves the
// page instead of undoing the redirect.

/**
 * The security this page is about when the address does not say.
 *
 * NVDA because it is PRODUCT_SPEC.md's own running example — §12's anomaly,
 * §20's investigation and §38's demo are all NVDA — so the default is the
 * product's own vocabulary rather than a developer's favourite ticker. It is
 * also, usefully, one of the most liquid names in the tracked universe, which
 * means the panel's default view has bars in it at almost any point in a
 * session.
 *
 * Exported so a test and a story can name it rather than repeat the literal,
 * and so the day Story 2.11 removes the concept there is one symbol to grep.
 */
export const DEFAULT_SYMBOL = "NVDA";

/** What the address says this page is about, and whether it said so. */
export interface SecuritySymbol {
  /** The symbol to fetch. Never empty. */
  readonly symbol: string;

  /**
   * Did the address name it, or is this the default?
   *
   * The panel needs this to decide whether to say that search arrives with
   * Story 2.11 — a sentence that is helpful on `/securities` and noise on
   * `/securities/AMD`, where the reader evidently found a way to name one.
   */
  readonly fromAddress: boolean;
}

/**
 * Read the symbol this page is about.
 *
 * The segment arrives from React Router already percent-decoded, so `BRK.B`
 * round-trips through {@link securityPath}'s `encodeURIComponent` without
 * anything here having to undo it. What this does own is the two degenerate
 * spellings a hand-typed URL can produce and a route match cannot rule out:
 * `/securities/` matches with an empty segment on some router versions, and a
 * segment of only whitespace is a URL somebody built by hand. Both are treated
 * as *the address did not name one* rather than as a symbol, because asking the
 * server about `""` produces a 400 about a malformed ticker where the honest
 * answer is that nothing was asked for.
 *
 * It deliberately does **not** upper-case, validate or otherwise repair a
 * symbol that is merely unusual. `/securities/nvda` is a real request for a
 * security spelled `nvda`, and the server answers it — with a 404 naming the
 * input if it does not track that spelling, which is a better answer than this
 * client silently changing what the user typed and reporting on something else.
 */
export function useSecuritySymbol(): SecuritySymbol {
  const { symbol } = useParams<"symbol">();
  const named = symbol?.trim() ?? "";

  return named === ""
    ? { symbol: DEFAULT_SYMBOL, fromAddress: false }
    : { symbol: named, fromAddress: true };
}
