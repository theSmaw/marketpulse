# Task 7.3.3 — Second press, the live region, and the browsable list

**Status:** Complete — 2026-11-24. A second press now carries the prior
run's claims forward, dimmed, through `resetForNewRun`'s own `stale` flag;
the terminal live region is a confidence-count summary (`4 findings
supported, 2 unknown`) rather than the last-completed step's sentence; the
checklist is a `<ul>`/`<li>`. A real edge case — an `inapplicable` re-run
after a stale carry-forward — was found and fixed in the reducer rather
than left for a browser to discover. `docs/GAPS.md` gains a twelfth
screen-reader entry; none of this task's two repairs has been confirmed by
an actual listener.
**Story:** [7.3 Findings, Evidence, & Confidence](STORY.md)
**Depends on:** 7.3.1

## Objective

Two behavioural gaps that only become real defects once a completed row
carries an actual claim rather than a blank: a second press of
`Investigate` would blank six real findings, and a listener using a
screen reader currently hears only the last of six claims, ever. Fix
both.

## What the user can see when this lands

Pressing `Investigate` a second time after a run has completed keeps the
previous six claims on screen, dimmed, until each row's own re-run
replaces it — rather than blanking the whole checklist back to six empty
rows. Nothing else changes visually. For a screen-reader user: the run's
completion is announced as a count (`4 findings supported, 2 unknown`)
rather than only the last step's sentence, and the six rows are now
reachable as a list, each carrying its own description, claim and
confidence together.

## Work

- **Second-press persistence** (AC 11): `optimisticChecklist` currently
  resets every row to the seeded placeholder on a new press. Change it
  so a row with an existing `claim`/`confidence` keeps them, visually
  dimmed (`--ink-secondary` or equivalent), until that row's own next
  `STEP_COMPLETED`/`FINDING_CREATED` pair replaces them. Queued/running
  states render exactly as they do today otherwise.
- **The live-region summary** (AC 12, part 1): `liveRegionText` in
  `use-investigation.ts` currently speaks only the last-completed step's
  sentence on terminal. Add a summary form — a count of findings by
  confidence level — spoken on the terminal event, replacing (not
  alongside) the last-step sentence. The running-step announcement
  (pre-terminal) is unchanged.
- **The browsable list** (AC 12, part 2): restructure the checklist's
  markup from a `<div>` of `<div>`s to a `<ul>` of `<li>`s, one per
  step, so a browse-mode screen reader announces "list, 6 items" and
  each item carries its description, claim and confidence as one unit.
  No visual change from this alone — it is a semantic restructuring.
- **`docs/GAPS.md`**: add the entry recording that both changes above are
  reasoning from structure, not confirmed by a real screen-reader pass —
  this story does not discharge the existing, dated "no real
  screen-reader pass has ever been taken" entry; it adds to what that
  pass will need to confirm.

## Done when

1. A second press after a terminal run leaves the prior run's six claims
   visible (dimmed) until each row's own re-completion; `security-
investigate.spec.ts` gains an assertion for this.
2. The terminal live-region text is a confidence-count summary, asserted
   in a component test; the running-step announcement is unchanged,
   asserted by the existing tests still passing.
3. The checklist's DOM is a `<ul>`/`<li>` structure; a component test
   asserts the list role and item count.
4. `docs/GAPS.md` carries the new entry.
5. `pnpm verify` and `pnpm e2e security-investigate.spec.ts` are green.

---

## What was done — 2026-11-24

**Second-press persistence** (`investigation-checklist-state.ts`): a new
`stale: boolean` field on `ChecklistStepView` and a new `resetForNewRun`
function, mirroring `bar-series-view.ts`'s own `stale` idiom exactly — a
carried-forward answer, marked old, cleared by the first new fact that
actually replaces it. `use-investigation.ts`'s `start()` now calls
`resetForNewRun(record.checklist)` rather than `optimisticChecklist(symbol)`
whenever the press is a second-or-later one for the SAME symbol (a fresh
symbol still gets the plain blank six, correctly — there is nothing of its
own to carry forward). `STEP_STARTED`'s reducer case was changed from a
from-scratch object literal to a spread of the existing step, which is the
one change that lets a stale claim survive through the row's own
queued→running states exactly as AC 11 asks ("queued/running states render
exactly as they do today otherwise") — the previous code unconditionally
reset `claim`/`confidence` to `undefined` on every `STEP_STARTED`, which
would have blanked a carried-forward claim the instant the new run's first
step began.

**A real edge case found and fixed, not merely anticipated**: a row that
survives `resetForNewRun` with a stale claim, then completes this run as
`inapplicable` (no `FINDING_CREATED` ever arrives), would otherwise keep
showing the PREVIOUS run's claim as if it were current — the row visibly
"completing" with nothing new having confirmed anything. `STEP_COMPLETED`'s
reducer case now checks whether `stale` is STILL `true` at that point
(`FINDING_CREATED` always precedes `STEP_COMPLETED` and clears the flag
itself, so a row still `stale` here never got this run's own finding) and
drops `claim`/`confidence` in that one case — the same honest-absence shape
a first-press `inapplicable` step already draws. Covered by a dedicated
test (`investigation-checklist-state.test.ts`, "an INAPPLICABLE re-run
drops the stale claim rather than leaving it looking current").

**The live-region summary** (`use-investigation.ts`): `completionAnnouncement`
(the old last-completed-step sentence) is deleted; `confidenceCountSummary`
replaces it in `liveRegionText`'s terminal branch, counting steps by
`confidence` and building `N findings LEVEL, M LEVEL, ...` in
`CONFIDENCE_LEVELS` order — `CONFIRMED` (no producer in this epic) is
silently absent rather than printed at zero. A zero-finding run (every step
`inapplicable`) speaks `Investigation complete — no findings produced`
rather than silence or a thrown error. The pre-terminal running-step
announcement (`startedAnnouncement`) is untouched, and the three existing
tests that exercised it still pass unmodified.

**The browsable list** (`InvestigationChecklist.tsx`/`.module.css`): the
checklist's outer element is now a `<ul>`, each row (including the
dropped-connection row) a `<li>`; `.checklist` resets `list-style`/
`margin`/`padding` so nothing changes visually. No other markup moved.

**The confidence mark's and the claim's stale treatment**
(`ConfidenceMark.tsx`/`.module.css`, `InvestigationChecklist.tsx`/`.module.css`):
a new optional `stale?: boolean` prop on `ConfidenceMark` (default `false`,
every existing call site unaffected) dims the mark's ink to `--ink-disabled`
through one CSS declaration — the rule's border is `currentColor` and
`.word` sets no colour of its own, so one override dims the stroke and the
word together via ordinary inheritance. `--ink-disabled` rather than
`--ink-secondary` is a deliberate departure from this product's own
repeated, measured rejection of that token for PRIMARY content
(`TextField.module.css` and four more): a stale claim is the opposite
case — a fact already superseded by the row's own next event — which is
the same disabled-adjacent category `Button.module.css`'s own disabled
label already spends the token on. The `.claim` paragraph gets the
identical treatment via `.claimStale`.

### Gates

`pnpm build`, `pnpm lint`, `pnpm format:check` (several test/story files
needed `--write`, then clean), `pnpm stories` (50/50), `pnpm env:check`,
`pnpm links` (0 broken), `pnpm invariants` (97 hold, unchanged — this task
added no new invariant), `pnpm typecheck`, `pnpm test` (775 + 1518 + 2039 =
4,332 passed — 12 more than Task 7.3.2's 4,320), `pnpm test:scripts` (21
passed), `pnpm test:process` (63 passed), `pnpm coverage:check` — all
green.

**Not run, said plainly rather than silently skipped**: `pnpm test:database`,
`pnpm e2e` (including the new AC 11 assertion in
`security-investigate.spec.ts`) — no Docker on this development machine for
the whole of this session. CI's own `e2e`/`database` jobs do not depend on
this machine's Docker and will run both on the PR.

## For a stakeholder — a status report, 2026-11-24

Two real gaps in the investigation checklist are closed. First: pressing
`Investigate` a second time used to wipe the six real answers already on
screen back to six blank rows the instant it was pressed — now the previous
answers stay visible, shown dimmed, until each one is genuinely replaced by
the new run's own result. Second: a screen-reader user used to hear only
the LAST of six findings when a run finished — now they hear a count
("4 findings supported, 2 unknown"), and the checklist itself is structured
so a screen reader can browse all six rows as a list rather than as an
undifferentiated block of text.

A real bug was found and fixed while building the first repair: a step that
had an old answer carried forward and then turned out, on the new run, to
have nothing to report, was at risk of keeping the OLD answer showing as if
it were current. That is now handled correctly.

What is not yet done: neither change has been heard by a real screen
reader, which this product has never had the chance to do for any of its
regions — that remains an owed, named gap rather than a claim of success.
The automated browser test for the second-press behaviour could not be run
locally on this machine (no database available) and will run on this
change's own pull request in CI instead.
