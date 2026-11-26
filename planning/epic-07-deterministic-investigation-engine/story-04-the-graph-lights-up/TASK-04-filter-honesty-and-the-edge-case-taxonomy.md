# Task 7.4.4 — Filter honesty and the edge-case taxonomy

**Status:** Complete — 2026-11-26
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

## What was done — 2026-11-26

`TOPOLOGY.md` §11.2 is the maintained account and **wins** where this file
disagrees. What is here is the record of the decisions and the two Done-whens
that are questions rather than code.

### Done-when 1–3 — the filter interaction

**One pure function with two readers, which is the whole shape.**
`topologyHighlightCut(highlight, universe, drawn)` in `topology/highlight.ts`
answers three things about a command against the currently drawn set:
`peers` (what the command named — `symbols.length`, so the denominator is the
figure `topologyHighlightWords` already states rather than a second count of
one set), `hidden` (how many of them are **tracked but not drawn**), and
`drawsAnything` (whether any highlighted **equity** is drawn).
`renderer-canvas.ts` reads the third and skips the de-emphasis pass; `filter.ts`'
`topologyFilterWords` reads all three and says what happened. Neither computes
it, so the ink and the sentence cannot disagree.

**The `drawsAnything` conjunct is about equities and that is the substance.** A
Technology command names `XLK`, a landmark is drawn in every narrowed state,
and landmarks are outside this encoding entirely — so *the sector ETF is still
on screen* must not license dimming 21 Energy equities for a reader looking at
nothing the command named.

**It fires with no filter at all, which was not the case this was written
for, and is a real behaviour change beyond the brief.** `SPY`'s related set is
the eleven sector ETFs — every one a landmark — so before this task,
highlighting `SPY` dimmed all 501 equities with nothing marked anywhere. It
now draws nothing quieter and says nothing. Both halves honest: no ink to
describe, no filter to blame. Covered by
`topologyHighlightDrawsAnything`'s own test.

**The clause is a THIRD arm of `topologyFilterWords`, never a fourth writer of
the sentence** — the collision this region has lost a clause to three times.
Three absences, ADR 0029's rule as every other clause in that builder applies
it: no command, no hidden peer, and a command naming nothing this universe
tracks (a version skew, not a cut — counting it would put a figure beside
`Show all` that pressing `Show all` cannot change). The whole-set case is a
**different sentence** rather than a bigger figure, because the note is saying
why the picture did not change rather than counting.

**One boolean crossed the module boundary and it had to.**
`topologyHighlightWords(highlight, quietened)` — that builder's tail,
*Every other equity is drawn quieter.*, is a claim about ink and is false in
exactly the whole-set-hidden state. Leaving it standing would have put the
contradiction two sentences apart in one spoken string.

`Show all` is unchanged and no control was added to the `Sector`/`Band`
triggers. Nothing auto-widens or auto-clears the reader's filter.

### The `Clear` control (the keyboard affordance)

A `<button>` in the highlight note calling `clearHighlightForReader` —
**the same path `Escape` calls**, so the `App` holder is cleared rather than
only this region's ink. A `<button>` and not a `<Link>` because clearing
changes no address.

**`hidden` replaces the attribute-keyed `display: none` the note shipped
with, and the swap was forced by a check doing its job.** Story 6.4's
exhaustive control enumeration (`MarketTopology.test.tsx`) went red on the
first draft: no stylesheet is applied below `pnpm e2e`, so a control hidden
only by a CSS module is a real, focusable control at every test level and to
anything reading the accessibility tree before paint. `hidden` takes it out of
the tab order and the accessibility tree in the DOM itself;
`data-topology-highlight` survives as the published state specs read, and both
are written by one function. The stylesheet now declares **no `display`** on
`.highlightNote`, deliberately — an author `display` would beat the UA sheet's
`[hidden] { display: none }` and silently put the button back.

**A real defect found while building it**: the press removes the element
holding focus, and `Region`'s dropped-focus backstop does not fire (the
removal is this component's imperative write, not a `Region` render — Task
6.4.4's measured finding one element over). Focus returns to the canvas, where
`Escape` already leaves a reader. Asserted in a real browser.

### Done-when 4 — the security page states the absence

`InvestigationChecklist` gained one prop (`subjectUntracked`) and one sentence,
rendered only when **both** a run has been pressed and the universe has
answered without this symbol. `SecurityExplorer` derives it from
`view.state === "loaded" && found === undefined` — keyed on the resolved state
rather than on `found` alone, because claiming a security is untracked during
the 174–277 ms the universe request takes is Story 4.7's own mover-row defect.

### Done-when 7 — the large-highlight probe, and the honest verdict

**The workshop rather than the route**, because no address drives a highlight
and `pnpm probe` cannot press `Investigate` on one page and navigate to
another; `overview-investigation-highlight.spec.ts` drives the real route and
cannot see ink. The story uses the real recorded 518-security universe, so the
picture is the real graph at real scale: **73 peers, 74 drawn nodes, ~14%**.

**1440/1024: it reads** — the Technology cluster is visibly solid against ten
receded ones, nothing changed hue. **768: it still reads**, with less margin.
**390: it does not read at all** — ~3 px discs inside untouched amber rings,
labels already suppressed, and a person could not tell which cluster was
Technology. The note is the only thing that says anything there, and it is
correct (two wrapped lines, `notes` 372×42).

**And at every width it reads as a CLUSTER rather than as a peer set** — a
reader cannot find `NVDA`. That is Gate 1's own decision working (the subject
is an ordinary member of the set); it is recorded because the feature's name
invites the other reading. Both findings are in `docs/GAPS.md` with the
Product Owner as owner, and in `TOPOLOGY.md` §11.2 with the figures.

### Done-when 8 — the screen-reader premise is FALSE

**Confirmed against the shipped claim text rather than assumed, and it does
not hold.** `toCompareSecuritiesFinding` builds
`−3.10 pts against XLK over 5 min — 92nd of 3,180`: **one** ticker, the sector
**benchmark**, by Story 7.3's own deliberate decision. No peer is named.
`get_related_securities` reaches no result surface at all — it is not a
checklist step, produces no `Finding`, and its answer becomes a
`WORKSPACE_COMMAND` and nothing else. `Connected securities` is still a
placeholder. So the complete textual inventory of the peer set is `/`'s
structural sentence: a subject, a **count** and the kinds — no ticker.

Gate 1's no-announcement decision is left exactly as it is (reopening it is
not this task's call, and the task brief says so), and the gap is recorded as
`docs/GAPS.md`' **thirteenth** screen-reader entry with the Product Owner as
owner and a condition: the first story that touches `Connected securities`.
The cheap repair is on the security page, where the peers belong beside the
comparison that produced them — not a 61-ticker announcement on `/`.

### Done-when 5, 6 and the rest of the taxonomy

Verified rather than rebuilt, per this file's own Gate amendment: shipped in
7.4.1 and unchanged here.

### What was run

- `pnpm verify` — **green**, `102 invariants hold.`, 786 + 1,559 + 2,120 unit
  tests, 21 script tests, 63 process tests, no `Unhandled Errors` block.
- `pnpm e2e overview-investigation-highlight.spec.ts` — 6 passed, including
  the two new tests.
- `pnpm e2e overview-market-topology-filter.spec.ts overview-market-topology.spec.ts
  overview-market-topology-keyboard.spec.ts overview-market-topology-degraded.spec.ts
  security-investigate.spec.ts` — 34 passed.
- The whole `pnpm e2e` suite once at the end.
- `pnpm probe --story components-markettopology--highlighted-peers`,
  `--highlighted-peers-partly-hidden` and `--highlighted-peers-narrowed`.
- **Two mutations, to prove the new assertions are not vacuous**: forcing
  `hiddenPeerWords` to return `null` turned 3 `filter.test.ts` tests and 2
  `MarketTopology.test.tsx` tests red; forcing `quietened: true` turned 2
  `MarketTopology.test.tsx` tests red. Both restored.

No `pnpm invariants` entry was added, so no `pnpm break` is owed — the count
is unchanged at 102.
