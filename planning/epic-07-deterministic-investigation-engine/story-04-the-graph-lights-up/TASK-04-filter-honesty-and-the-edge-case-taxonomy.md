# Task 7.4.4 — Filter honesty and the edge-case taxonomy

**Status:** Not started
**Story:** [7.4 The Graph Lights Up](STORY.md)
**Depends on:** 7.4.2, 7.4.3

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

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
