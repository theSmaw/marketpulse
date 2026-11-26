# Task 7.4.4 — Filter honesty and the edge-case taxonomy

**Status:** In progress — 2026-11-26
**Story:** [7.4 The Graph Lights Up](STORY.md)
**Depends on:** 7.4.2 (complete, PR #713), 7.4.3 (complete, PR #715 — read
its amendment below: `WorkspaceHighlightCommand` now carries
`investigationId`, and the outward-clear channel this task's own filter
logic must not fight is `renderer-canvas.ts`'s `onClearHighlight` report-up
pattern, not a prop read directly off `App`)

## Objective

Every state this feature can be in must say something true. This task closes
the interaction between a highlight and the reader's own sector/band filter
(AC 4), and the taxonomy of honest absences and refusals the earlier tasks
deliberately deferred to here.

## What the user can see when this lands

Filter the graph to a sector that hides some of an investigation's
highlighted peers: the population note gains a third clause stating how many
are hidden, with a `Show all` link that clears both the sector and band cuts
(reusing the existing control, never a new one). Filter to a sector that
hides _all_ of the highlighted peers: no de-emphasis is drawn at all, and the
note says why. Investigate an untracked security, or one with no related
securities at all: a plain, honest sentence, never a drawn error and never a
blank, confident-looking highlight.

## Work

- **The filter interaction.** A highlighted peer the reader has filtered out
  draws nothing — the reader's own control is never overruled by an
  investigation. The population note (`topologyFilterWords`'s one builder,
  two renderings — never a second, independently-written string, which this
  region has lost to feed-cadence overwrites three times already per
  `TOPOLOGY.md`) gains a third clause: `"52 of 61 highlighted peers are
outside this filter."` — rendered only when its own data is present (ADR
  0029: zero hidden peers → no clause; no highlight → no clause). The
  clause's presence must survive a live band update overwriting
  `textContent` — the same collision class this region has met at §8.3, §9.1,
  and the width-blind correlation-sentence defect Story 6.8 found and fixed.
  **If the filter hides the entire highlighted set**, draw no de-emphasis at
  all (de-emphasising the whole visible market with nothing relevant on
  screen would be a false claim with a true cause) and state that plainly in
  the note.
  - Explicitly refused: auto-widening or auto-clearing the reader's filter so
    peers become visible, and a badge on the Sector/Band control triggers
    (already a header seven pixels short at 1024px with three controls; a
    fourth thing reporting a _different_ feature's state is two subjects in
    one speaker).
- **The edge-case taxonomy, each a named `Done when` below:**
  1. An untracked security (no graph node, no placement) — refused with its
     own named outcome, distinct from both "unknown symbol" and "no related
     securities" (built in 7.4.1; this task adds the UI-visible consequence:
     no command is ever sent for it, so nothing on `/` reacts at all, and the
     security page itself states why `Investigate`'s related-securities
     answer is absent for this one).
  2. A security with zero related securities under all three kinds (`QQQ`,
     `DIA`, `IWM` today) — a stated, named absence, never an empty highlight.
  3. Correlation coverage: distinguishing "not yet measured" (CI, every
     fresh store — zero correlation edges, no nightly generation has ever
     run) from "measured as none" (a real session ran; this security simply
     has no edge in the retained set). These are different facts and the
     first is the permanent, gated-machine state — the same
     `too-few-sessions` vs `no-same-tape-baseline` lesson Story 5.5 paid for.
  4. The highlight's population can be a large fraction of the graph (a
     Technology equity: sector ETF + ~45–80 equities + correlated — 10–18% of
     516 nodes). Look at this on the real route at all four widths via
     `pnpm probe` before calling it done; whether 80 highlighted nodes reads
     as "these are the peers" or as "the graph changed colour" is a question
     only a person looking at the screen answers.
- **Screen-reader decision, recorded rather than re-opened.** The highlight
  is announced to nobody — no new live region, no extension of the existing
  `role="status"` selection-announcement region (which has exactly one
  subject and was deliberately kept separate from the structural sentence
  for this reason). The fact lives in the structural sentence, read on
  demand via `aria-describedby`. This is only honest if the peer-comparison
  step's own result already names its peers in text on the security page —
  confirm this is true of Story 7.2's shipped result surface before relying
  on it; if it is not, record that as the real accessibility gap (cheaper to
  fix there than to invent an announcement here) rather than silently
  shipping a highlight with no accessible equivalent anywhere.
- **Keyboard affordance.** The `Clear` link in the note follows `Show all`'s
  precedent — a real, present tab stop exactly when the state exists, never
  a `disabled` control (an `aria-describedby` target on a natively `disabled`
  control is unreachable — this product has shipped that defect once
  already and `TextField` was rebuilt around `aria-disabled`+`readOnly` for
  exactly this reason).

## Done when

1. The third population-note clause appears only when a highlight has at
   least one filtered-out peer, survives a live band-update re-render, and
   disappears with the highlight or the filter.
2. Filtering out the whole highlighted set draws zero de-emphasis and states
   why, proven by a test.
3. `Show all` clears both cuts from one press, as it already does, with no
   separate control added for this feature.
4. An untracked-security investigation sends no command, and the security
   page states the absence.
5. A zero-peers investigation sends no command and the region's own note
   does not change (nothing to announce).
6. "Not yet measured" and "measured as none" are two distinct, testable
   states for the correlation relation, each reachable on a real store.
7. A Technology-equity highlight has been looked at on the real route at all
   four widths via `pnpm probe`, with the screenshots kept.
8. The screen-reader decision is confirmed against Story 7.2's actual result
   surface (not assumed), and `docs/GAPS.md` gains an entry only if that
   confirmation fails.
9. `pnpm verify` and the relevant e2e specs are green.

## Amended by this task's own Gate — 2026-11-26: what 7.4.1–7.4.3 already discharged, and what is genuinely left

The original Work/Done-when sections above were written at Gate 1, before
any of the first three tasks existed, and already correctly anticipated that
most of the edge-case taxonomy would be built in 7.4.1 rather than here —
re-confirmed now against the actual shipped code rather than assumed:

**Already shipped, verify rather than rebuild:**

- Done-when 4 (half): an untracked security sends no command —
  `related-securities.ts`'s `untrackedRefusal` reuse, confirmed in 7.4.1's
  own review. **Not yet shipped**: "the security page states the absence" —
  nothing on `/securities/:symbol` today says why `Investigate`'s
  related-securities answer is absent for an untracked subject. This is the
  one real piece of Done-when 4 this task still owes.
- Done-when 5: a zero-peers security (`QQQ`/`DIA`/`IWM`) sends no command —
  shipped in 7.4.1, confirmed by its own review's test-reading. Nothing left
  here.
- Done-when 6: "not yet measured" vs. "measured as none" for correlation —
  shipped in 7.4.1 as two distinct `RelatedSecuritiesAnswer` states. Nothing
  left here.

**Genuinely this task's own work, none of it built yet:**

- The filter interaction in full (third population-note clause, `Show all`,
  the whole-set-hidden case) — Done-when 1–3.
- Done-when 4's other half: the security-page sentence for an untracked
  subject.
- Done-when 7: the large-highlight probe at scale, now that a highlight can
  actually be drawn (it could not be, before 7.4.2).
- Done-when 8: the screen-reader decision confirmed against Story 7.2's real
  result surface.
- The keyboard-affordance `Clear` link in the note — **note this now has a
  real clearing mechanism to call**: 7.4.3 shipped `onClearHighlight`
  (renderer → `MarketTopology` → `MarketOverview` → `App`), which already
  clears on `Escape`/empty-canvas-click. This task's `Clear` link should
  invoke the **same** path (not a second one) — clicking it should behave
  exactly like the reader pressing Escape, including clearing the `App`
  holder so a later unrelated re-render doesn't resurrect the dismissed
  highlight (7.4.3's own review found and fixed exactly this class of bug
  once already; reuse its mechanism rather than inventing a parallel one).
- A second small item 7.4.3 left named but unresolved: its review flagged
  that the command's `investigationId` is minted from `decoded.event.
investigationId` while the withdrawal reads `started.id` — both are correct
  and documented, but this task's filter/clear logic should read whichever
  of the two is actually in scope at the point it needs an id, not introduce
  a third source.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
