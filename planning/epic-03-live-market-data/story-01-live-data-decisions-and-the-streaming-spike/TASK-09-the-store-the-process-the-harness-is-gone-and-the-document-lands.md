# Task 3.1.9 — Decisions 7 and 8, the harness is gone, and the document becomes the epic's

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.8

## Objective

Take the last two decisions — **whether the frontend gains a store**, and **the
socket's relationship to the process** — then close the story: delete the
harness, prove no credential reached the repository, finish `LIVE-DATA.md`, put
it in `CLAUDE.md`'s _Where the record lives_ table, and hand the next ten stories
a file they cite instead of re-deciding.

## What the user can see when this lands

**Nothing**, and the story ends as it began: the application is a historical
explorer on the day this closes. **Story 3.3 is the payoff and it is two stories
away** — which is the shape Story 2.4 had to be inserted to produce and this
epic builds in from the start. Say that plainly when reporting the close.

## What is already decided and must not be re-taken

- **`FRONTEND-STATE.md` §1's three reversal triggers are conditions**: the first
  piece of state **two sibling surfaces both write**; the first
  `WorkspaceCommand` that must be applied to state no URL can carry; the first
  requirement for undo, redo or a replayable command log. And what is
  deliberately **not** a trigger: bundle size, a third hook, or a component tree
  deep enough to be annoying to prop-drill.
- **The bundle arithmetic is already measured** and must not be re-taken:
  RTK + react-redux **+8.43 kB gzipped**, react-query **+9.54 kB**, RTK Query
  **+25.27 kB**, a hand-rolled bounded `Map` cache **+0.13 kB**. Redux itself is
  the cheap half; what is expensive is a data-fetching layer bolted to it.
- **The shape that keeps the migration cheap is already in the tree** — state in
  a module as a plain discriminated union whose transition is a pure function, a
  reducer that has not been told it is one. A store arriving later is a
  re-wiring, and that is the whole reason this can be answered honestly rather
  than defensively.
- **`minReplicas: 1` is required** (ADR 0011), and Task 3.1.6's person already
  answered whether the socket is held open outside market hours. Decision 8
  executes that answer; it does not re-open it.
- **`deploy.yml` rolls the backend**, and Task 3.1.5 measured what a duplicate
  connection does on a one-connection plan. Whatever that measurement said is
  binding on decision 8.
- **One logging decision reverses here.** Task 1.12.6 declined `ignore:
"reqId,pid"` on pino-pretty after measuring 51 adjacent request pairs, and
  named its reversal trigger as **this epic's socket, or anything else that puts
  more than one request in the backend's log at a time**. The lever is worth
  156 → 101 columns.

## Work

**Decision 7 — whether the frontend gains a store.** Answer it with the
condition in hand. The question is not _will this epic be annoying without one_;
it is **does a trigger fire**. Walk the three explicitly against what
Stories 3.3–3.7 will actually do — a connection state read by the chrome, live
prices read by a table and a chart, a subscription the page declares — and say
for each whether two surfaces **write** it or merely read it. Two readers is
prop-drilling; two writers is a store. Record the answer either way, with the
walk, so that Story 3.6 does not re-take it when the prop-drilling starts to
chafe.

**Decision 8 — the socket's relationship to the process.** One replica, one
socket. Settle: where the socket's lifecycle sits relative to the process
lifecycle and the existing signal handling in `index.ts`; what happens on a
deploy given Task 3.1.5's duplicate-connection measurement, and whether an
overlap window needs handling or merely documenting; what a shutdown owes a
connected browser; and how the socket's state is observable to an operator —
naming the pino reversal above, which fires here.

**Then close.**

- **The harness is gone.** Deleted, and the tree byte-identical outside
  `planning/`. Check it rather than assert it.
- **No credential appears anywhere in the repository**, checked rather than
  assumed — grep the tree for the key's own bytes and for the shape of one, and
  record that the check ran and what it covered. Acceptance criterion 4 is
  satisfied by the check, not by the intention.
- **Finish `LIVE-DATA.md`.** All eight decisions present with alternatives, a
  measurement where one exists, and a reversal trigger that is a **condition**.
  Every figure dated and naming the instrument that produced it. A short opening
  section for someone who reads one section, in the shape of `ALPACA.md` §0. And
  a `What was NOT measured, and why` section in the shape of `ALPACA.md` §10 —
  stated rather than quietly omitted, including the n=1 caveat on every rate
  figure.
- **Add `LIVE-DATA.md` to `CLAUDE.md`'s _Where the record lives_ table**, with a
  one-line subject description, and check the surrounding rows are still true.
- **Sweep upward.** A measurement that falsifies a governing document is swept
  the same day. This story measures a vendor, and what it may invalidate is a
  premise elsewhere: check §7.1's feed table, `ALPACA.md` §10's statement about
  what was not measured, and every sibling `STORY.md` in this epic that cites a
  figure this story has now taken for real. Correct the live claims, give any
  ADR a **dated amendment** rather than a rewrite, and leave historical records
  standing.
- **Check the design canvas is reachable, and record the result.** EPIC.md warns
  that the `Component library for MarketPulse` canvas was **not reachable** from
  the session that planned this epic, and Story 3.4 owes a sync before it
  designs anything. Establishing reachability costs minutes here and is the
  difference between Story 3.4 designing forwards and Story 3.4 discovering a
  broken chain on the day. **This task decides nothing about design** — it
  answers one yes/no and writes it down.
- **`pnpm verify` passes**, which for a story that changes no application code
  means the `links` and `invariants` steps over the new document.

## Done when

- Decisions 7 and 8 are settled in `LIVE-DATA.md` with the trigger walk shown.
- The harness is deleted and the tree is byte-identical outside `planning/`.
- The credential check ran, and what it covered is recorded.
- `LIVE-DATA.md` carries all eight decisions, an opening summary, a
  not-measured section, and dated instrument-named figures throughout.
- `CLAUDE.md`'s table names it.
- The upward sweep ran, with a list of what was corrected and what was found
  already true.
- Canvas reachability is answered yes or no and recorded for Story 3.4.
- `pnpm verify` passes.

## Notes

The half of the close most likely to be skipped is the sweep, and the reason is
recorded in `CLAUDE.md`: **recording a correction and propagating it are two
obligations**, and the mechanism that defers the first routinely covers only the
product decision the measurement forced, not the document that was wrong. It has
happened here before — for a day, `ALPACA.md` and ADR 0019 both recorded that
§7.1's feed claim was false while §7.1 itself, `README.md`, two other ADRs and
invariant 6 went on asserting it.

---
