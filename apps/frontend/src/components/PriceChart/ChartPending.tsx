import styles from "./ChartPending.module.css";

// **A slow answer, drawn as a wait rather than as a stale picture**
// (2026-09-14).
//
// ## What it replaced, and why that was worse
//
// A window change left the previous window's chart on screen with a rail naming
// which window it belonged to, until the next answer arrived — ADR 0028 and
// `CHARTING.md` §6.2, which said in as many words: *no dim, no blur, no fade, no
// skeleton over a price.*
//
// That decision is reversed here, deliberately and with the argument for it
// intact, because what it produced on a running page is not what it describes.
// A window change costs 2–9 ms warm and 7–68 ms cold against a local pair, so
// the rail's whole visible life is under a tenth of a second: a sentence
// appearing and vanishing faster than anybody can read it, over a chart that did
// not visibly change. The reader gets a flicker and no information.
//
// **The reversal is narrower than it sounds.** `usePendingPanel` holds the old
// chart for the first 160 ms of every wait, so the ordinary case swaps one chart
// for the next with nothing in between — which is exactly what ADR 0028 wanted.
// What changed is the slow case, which used to be a stale picture wearing a
// label and is now a panel that says nothing except *not yet*.
//
// ## Why it is a block and not a skeleton
//
// A skeleton draws a fake line where the real one will be. On a product whose
// first invariant is that every number a user sees comes from deterministic
// code, **a drawn shape that is not data is the one thing a plot must not
// contain** — a reader glancing at a skeleton chart has been shown a price
// movement nobody computed. One block, the size of the plot, breathing.
//
// ## Reduced motion
//
// Answered at the token layer and nowhere here: `--motion-duration-pulse` is
// `0ms` under `prefers-reduced-motion: reduce`, and an animation of zero
// duration does not run. What is left is the same panel, the same size, holding
// still — which is not a degraded version of this, it is the same statement made
// without movement.
//
// `aria-hidden`, like every other mark on this plot. What a listener is handed
// is `chart-alternative.ts`'s `loading` sentence — *the frame is drawn and the
// series has not arrived yet* — which says this in words and is already there.

/** The plot-sized block a chart shows while a slow answer is in flight. */
export function ChartPending() {
  return <div aria-hidden="true" className={styles.pending} />;
}
