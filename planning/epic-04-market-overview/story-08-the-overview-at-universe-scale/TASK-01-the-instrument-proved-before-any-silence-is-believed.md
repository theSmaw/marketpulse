# Task 4.8.1 — The instrument, proved before any silence is believed

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** —

## Objective

**Every figure in this story comes out of one harness, and a harness nobody has
proved reports the same thing when it works and when it is broken.**

`long-animation-frame` only produces an entry **above 50 ms**, so **zero
observed and the observer is broken are the same output.** That cost a task
once already. This task builds the instrument, proves each of its channels
against a planted effect, and refuses to run on a machine that cannot execute
it.

## What the user can see when this lands

**Nothing.** It pays off in every task after it: 4.8.2 through 4.8.6 and 4.8.9
all run through this harness.

## Work

### The pair, which is not the gated suite

**`pnpm e2e` drives the origin `CORS_ORIGIN` names, which is the DEV server** —
`playwright.config.ts` and `scripts/pair-addresses.mjs` both argue this at
length. So **AC 1 cannot be met through the gated suite.** The established
recipe is Task 3.6.4/3.6.5's and is quoted here rather than re-derived:
`vite build` → `vite preview` on `:4173`, backend `dist/index.js`, `CORS_ORIGIN`
repointed at the preview, instruments installed from `addInitScript` **before**
navigation.

### Four channels, each proved by a planted effect

1. **A long-animation-frame / longtask observer**, with the self-test
   `scripts/session-sitting.mjs` already carries: a deliberate **120 ms** block
   inside a `requestAnimationFrame`, the resulting entry tagged
   `selfTest: true` and **excluded from every acceptance figure**, and `proved`
   printed whether or not anything else is. Copy that shape; do not re-invent
   it.
2. **A continuous rAF-gap recorder**, installed before navigation. This is
   Epic 14's own prescribed method, and it is what distinguishes _one task over
   the line_ from _the page spent 80 ms not painting_.
3. **A script clock per burst.**
4. **A commit counter** on React's DevTools hook — production React still calls
   it on every commit. **Prove it** by planting a state change and asserting
   the count moves.

### A DOM check that the thing under test actually changed

Task 4.5.8's first draft **was silently overwritten by Playwright's own
`WebSocket` and reported n = 0.** Every arm asserts a positive: a count of
distinct drawn values, or a text that moved. **An arm that cannot prove its
subject changed reports nothing, not zero.**

### `document.visibilityState === "visible"`, asserted on every page

Epic 14's own warning: a CDP-driven tab reports `hidden`, pauses `rAF`, and
makes every figure small, plausible and meaningless.

### A calibrator, and a load ceiling that REFUSES

Story 4.5's hand-off records three whole-suite runs failing **3, then 5, then
7**, every failure a 30 s timeout with zero assertion failures, at load
**23–33 on 8 cores**, while CI passed. Its verdict: _the machine could not
execute it — and those two look identical from a terminal._

So: **read `loadavg` at the top and exit non-zero above a stated ceiling** — a
figure that was never allowed to be taken cannot be quoted — **take the
heavy-job lock** (`scripts/heavy-job.mjs` exists; `pnpm e2e` takes it and a
hand-rolled script does not), and **sample a fixed-cost calibrator beside every
measurement**, discarding any window where it drifts outside a stated band and
**printing the discard count**. Nothing in this repository has detected
contention mid-run before; this is the repair for the sentence above.

### And one instrument defect to fix rather than work around

`scripts/session-sitting.mjs`'s repaint stamp is
`document.querySelector("table") ?? document.body`. **There is no `<table>` on
`/`** — `BreadthLedger` says so in as many words — so on `/` it observes
`document.body`, **where the masthead clock mutates text every second.** Every
`painted` figure taken on `/` with it would be a race between the frame and the
clock tick. And `pendingFrame` is set only for `frame.type === "bars"` with a
non-empty symbol list, so **an `overview` frame never produces a `painted` row
at all.**

## Done when

1. The harness drives a **production build** pair and says so in its own output
2. All four channels are proved by a planted effect, with the transcripts kept
3. The calibrator discards under load and prints the count; the load ceiling
   refuses rather than warns
4. `session-sitting.mjs`'s two defects are repaired, and its `/` reading is
   taken against an element the clock does not touch
5. Every arm asserts its subject changed, and reports **nothing** rather than
   zero when it cannot
