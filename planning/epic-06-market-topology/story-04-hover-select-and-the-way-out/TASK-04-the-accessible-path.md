# Task 6.4.4 — The accessible path

**Status:** Complete — 2026-11-06. A genuine accessibility defect was found
and fixed before merge (a keyboard reader could be silently dropped to
`<body>` by an ordinary pointer movement); a review then found and fixed a
second, narrower asymmetry in that same fix, a bare canvas-read race in two
new assertions, and a false "numbering drifted" claim this task's own
shaping had introduced into `CLAUDE.md` and its own file.
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.4.3

## Objective

Everything built so far draws correctly and is keyboard-operable — but
nothing yet tells a screen-reader user that a selection changed. AC5 needs
a real answer, not just "the structural sentence is still there": a reader
who cannot see the graph must be able to reach and activate any of the 516
securities, with the same way out a sighted keyboard user gets from Task
6.4.3.

**This is the live-region reversal trigger firing a second time, named by
Story 6.3's own close.** `MarketTopology`'s accessible sentence is written
once per draw and never announced — Task 6.3.4 restated that decision
rather than reversing it, three days before this story began. A
hover/selection change is a second, independent firing of the same
condition (_the first change to this region a reader must be told about
without having asked_), and the answer settled while shaping this story is
the same shape anticipated in advance: **a second element**, never a write
into the paragraph `applyAnomalyBands` already mutates imperatively — two
writers on one node is the collision that paragraph's own safety argument
depends on not happening.

## What the user can see when this lands

Nothing new visually — this task is almost entirely about what a screen
reader announces. Selecting a node (by click or keyboard) is spoken as one
sentence carrying the same four facts the visual readout shows. Hovering
(pointer-only, no keyboard equivalent) announces nothing — a pointer user
is not a listener, and announcing at pointer-move cadence would be
unusable. Clearing a selection is spoken too, since clearing is something
the reader did.

## Work

- **A second, persistent, visually-hidden `role="status"` paragraph**,
  sibling to the existing structural sentence, empty on mount, never the
  canvas's `aria-labelledby` target. Written **only** on a selection
  change (not on hover) — the same four facts Task 6.4.1's readout shows,
  as one sentence.
- Confirm by test that this paragraph and the one `applyAnomalyBands`
  writes to never collide — a live band update landing while a node is
  selected must leave both sentences correct.
- **`Region`'s existing dropped-focus backstop** (focuses its own
  `<section>` when the last-focused element is removed while
  `document.activeElement` is the body) needs no new code here, but
  confirm by test that it still fires correctly now that the canvas and
  the one anchor are both focusable things inside the region.
- Confirm `axe` stays clean on `/` with this region in every state this
  story adds — and record explicitly (per this repository's own rule)
  that an axe pass is not accessibility coverage, only a floor.
- Add the remaining AC7 browser spec: pointer and keyboard **interleaved**
  in one spec (hover node X by pointer, then Tab+arrow to node Y, then
  Enter) — asserting the final navigation goes to Y, not X, which is the
  one state-collision case nothing below a browser can see.
- **Sideways sweep, due at this task rather than left to the close**:
  `CLAUDE.md`'s own running count of this gap ("ONE item, SIX entries") is
  **stale** — found while shaping this task, before any code was written.
  `docs/GAPS.md` already holds a **ninth** entry (Task 4.6.7, 2026-10-09) and
  a **tenth** (Task 5.2.4, 2026-10-14). ~~and the file's own numbering has
  already drifted once before that (two different headings both independently
  call themselves "a seventh entry" — one at Task 4.2.8, 2026-09-26, one on
  the breadth region, 2026-10-07 — neither aware of the other)~~ — **this
  parenthetical was itself wrong, caught on this task's own review rather
  than carried forward: only ONE heading calls itself a seventh entry (Task
  4.2.8's). The breadth region's own entry (2026-10-07) explicitly
  DISCLAIMS being one** — `docs/GAPS.md`'s own text there reads "it is
  **not** a seventh entry... it is about an order, not about an
  announcement." No drift occurred at that point; the count is a clean
  sequence through the tenth. **Do not
  write "a seventh entry" into `docs/GAPS.md`.** Grep the file for
  `entry for the standing screen-reader item` immediately before writing
  (not days before — the count moves), use the real next ordinal that search
  turns up, and correct `CLAUDE.md`'s own stale "SIX entries" line in the
  same change, per this repository's own rule that a measurement
  contradicting a governing document is swept the same day it is found —
  this is Task 6.4.4's finding to carry, not 6.4.5's close to discover a
  second time. The substantive content is unchanged: whether an unprompted
  polite announcement queues behind or replaces a sentence already in
  progress is unanswerable from a DOM, a timing, or an agent, and the entry
  is owned by a person with a real screen reader before Epic 11, same as
  every entry before it.

## Done when

1. A selection change is announced via a dedicated, persistent `role="status"`
   paragraph, distinct from the existing structural sentence, with no
   write-collision between the two.
2. Hovering announces nothing; selecting and clearing a selection both do.
3. `axe` is clean on every state this story adds, with that explicitly
   recorded as a floor rather than as coverage.
4. A browser spec drives interleaved pointer and keyboard input and
   asserts the correct final destination.
5. `docs/GAPS.md` carries the next screen-reader-listening entry, correctly
   numbered against a fresh grep at write time, and `CLAUDE.md`'s own stale
   "SIX entries" line is corrected in the same change.

## What was done

**Status: complete — 2026-11-06.**

### The announcement region

A second, persistent, visually-hidden `<p role="status">` in
`MarketTopology.tsx`, sibling to the structural sentence and **never** the
canvas's `aria-labelledby` or `aria-describedby` target. Written imperatively by
`writeTopologyAnnouncement`, from `onSelect` and from nowhere else, and its
sentence is built by `topologyAnnouncement` out of `topologyReadoutLines`' four
fields and nothing else — one vocabulary, so the spoken account and the drawn
plate cannot drift. `Selected NVDA, NVIDIA Corporation, Technology, extreme.`;
the sector clause is **dropped** rather than padded for the four market proxies
(`cluster === null`); `Selection cleared.` on the way out.

**Three negatives are the whole risk and each is proved by a plant** (the
transcripts are in this task's own run, each red with the rest of the file
still collecting):

| Plant                                                                | Red at                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| the `source !== "band"` guard widened to cover only the device flag  | `says nothing on a band re-report` — `extreme` → `high` |
| the cleanup calling `topologyAnnouncement(null)` instead of emptying | `empties rather than announcing when a fresh universe…` |
| the announcement written into `sentence.current`                     | **7** tests, every one of them about the announcement   |

**`"band"` is the guard that matters.** `renderer-canvas.ts:1395` re-reports the
already-selected node after every `setBands`, so without it a live feed speaks
at a listener 6.8–16.1 times a minute.

### Clearing SPEAKS, which is a deliberate departure from the brief

The implementing brief said "empty string when the selection clears"; the task
file's own Done-when 2 says "selecting **and clearing a selection** both do",
and its _What the user can see_ says clearing is spoken "since clearing is
something the reader did". The task file wins — an empty live region announces
nothing, so the brief's two clauses contradict each other. Silent on **mount**
(no React-declared children), speaking on an actual clear.

### A real defect found, and repaired: a keyboard reader dropped to `<body>`

The Work item asked only to _confirm by test_ that `Region`'s dropped-focus
backstop still fires now that the canvas and the one anchor are both focusable.
**It does not fire**, and `renderer-canvas.ts`' `Escape` handler carried a
comment asserting that it does — CLAUDE.md's own named trap, _a claim about a
mechanism reads identically whether the mechanism is there or not_, three days
old.

`Region`'s recovery is a `useLayoutEffect` **on `Region`**, and it reads
`was.isConnected`. Every state it was written against is driven from outside
(the route re-renders `Region` with different children; the `ErrorBoundary` sets
`Region`'s own state), so removal and a `Region` render are one commit. The
anchor's removal is driven by `openable` — `MarketTopology`'s own state — so
that subtree re-renders **alone**, `Region` never renders, the effect never runs
again.

**And the reachable gesture is not `Escape`.** That path was already covered, by
the renderer focusing the canvas _before_ clearing. What was not is
`topologyOpenableSymbol` answering `null` because **the pointer crossed a
different node** while a keyboard reader held the anchor: a plain mouse movement
over a 998 px canvas. Produced in Chromium with the repair removed:

```
- "tag": "CANVAS",
+ "tag": "BODY",
```

Repaired at the level that knows which element it removed: `TopologyRenderer`
gained `focus()` (the same `canvas.focus()` the `Escape` handler already makes,
exposed — the renderer owns the focusable element), and `MarketTopology`'s
`[openable]` effect recovers onto it under `Region`'s own two conditions one
level down — `anchorHeldFocus` (the focus that was lost was ours) and
`activeElement === document.body` (nobody has taken it since). **The canvas
rather than the section**, because that is where `Escape` already puts a reader,
it is inside the region rather than one level further out than anybody asked to
go, and the next arrow key carries straight on.

Four component tests and one browser test hold it, including the two negatives
that stop it becoming a focus grab (a pointer-only reader, and a reader who had
already tabbed away) and the assertion that `Region` does **not** reach this —
asserted rather than described, so that a future change making `Region` catch it
goes red and prompts the reconsideration.

`Region.tsx`' docblock carries the bound as a fourth condition with the rule for
the next region: **if your content comes and goes from your own state and any of
it is focusable, `Region` does not cover you.** `renderer-canvas.ts`' false
sentence is struck with a dated correction beside it.

### `axe`, and what it is not

`expectNoAxeViolations` over four states — idle, hovering by real pointer, a node
selected by pointer, a node selected by keyboard with focus on the anchor and the
live region non-empty. Clean in all four. **Recorded explicitly as a floor and
never coverage**, in the spec's own header: none of the four questions
`docs/GAPS.md`' eleventh entry asks is in axe's reach.

### The eleventh entry, numbered from a fresh grep

`grep -c "entry for the standing screen-reader item" docs/GAPS.md` → **4**
(`seventh`, `eighth`, `NINTH`, `TENTH`), run immediately before writing. The new
entry is therefore **ELEVENTH**. It is the first in that list about a region that
**does** speak, and its new question is the cadence: an announcement per
auto-repeat of a held arrow key, across a cluster of up to 83 members, which is
entry one's _queues or replaces_ at its extreme. `CLAUDE.md`'s own line gained
one dated clause taking its count from TEN to ELEVEN.

### What nobody has seen

**No person with a screen reader has heard any of this**, which is the entry's
whole point. And the band words `high`/`extreme` are **structurally unreachable**
on CI and on an ordinary laptop (no bars, no provider, no composite generation),
so the only band clause any machine has ever announced is `Not scored yet`.

## Review, and four things it found before this could merge

A second developer instance reviewed the diff. Verdict: the implementation was
sound and the reported defect genuine — **independently reproduced**, with the
literal before/after: `document.activeElement.tagName` reads `BODY` with the
recovery code removed, `CANVAS` with it restored, held for the full poll rather
than a timing artefact. Four findings, all addressed in this same change rather
than carried forward:

**1. A false claim this task's own shaping had introduced, required to fix
before merge.** The Work section (written at Gate 1, before any code existed)
asserted `docs/GAPS.md`'s numbering had "already drifted once before" — two
headings both calling themselves a seventh entry. **Only one does.** The
second — the breadth region's own entry — explicitly **disclaims** being one,
in its own text: _"it is **not** a seventh entry there — it is about an order,
not about an announcement."_ No drift occurred; the sequence through the
tenth is clean. Corrected in both `CLAUDE.md` and this file, as a struck-and-
corrected passage rather than a silent rewrite, since the surrounding
instruction (grep first, use the real ordinal) was followed correctly and
produced the right answer (ELEVENTH) despite the wrong premise beside it.

**2. A narrower asymmetry in the focus-recovery fix itself, found on review
and routed to `docs/GAPS.md` rather than repaired here.** The guard deciding
whether to restore focus to the anchor (`openable !== null &&
keyboardSelection.current`) asks only _was the last selection made by a key_,
never _is focus still somewhere that cares_ — so a reader who has since
`Tab`bed to an unrelated control outside the region, then rests an ordinary
pointer near the graph (no key pressed), can have focus pulled back onto the
topology's anchor. Reproduced in jsdom with a throwaway probe (deleted after
confirming it). Not fixed in this change: the condition is Task 6.4.3's own
code, the reachable sequence has not yet been shown to occur against a real
reader, and a late, unreviewed change to a focus-management effect is a
worse risk than a documented gap with an owner and a re-measure. A new
`docs/GAPS.md` entry carries the full account; a short pointer comment sits
beside the guard in `MarketTopology.tsx`.

**3. Two bare canvas-adjacent reads that should have polled, per this story's
own twice-paid-for lesson.** `overview-market-topology-hover.spec.ts` had two
`expect(await focused(page))` reads sitting immediately after a `pressFor`
poll — safe in practice (25/25 executions passed in the review's own run,
because React's commit lands well before the round trip returns) but the
exact shape Task 6.4.2 and Task 6.4.3 each found a real race in. Converted to
`await expect.poll(() => focused(page))`, matching the pattern a third read
two lines away already used.

**4. Confirmed correct, no change needed**: the announcement channel's three
distinct elements (structural sentence, key hints, announcement), the
`"band"`-source exclusion traced to its actual conditional rather than
trusted from a comment, the two genuinely different clear-paths (`"Selection
cleared."` on a real clear, silent emptying on an unrelated universe reload),
the collision test against a live band update, the `axe` states, and the
AC7 interleaved spec — all real, grounded, and non-trivial.

### Gates re-run after the four fixes

`pnpm typecheck`, `pnpm lint`, `pnpm format --check` all clean.
`pnpm --filter @marketpulse/frontend test` — **100 files, 1818 tests
passed**. `pnpm invariants` — **81 hold**. `pnpm e2e
overview-market-topology-hover.spec.ts overview-market-topology-keyboard.spec.ts
overview-market-topology.spec.ts overview-market-topology-anomaly-bands.spec.ts
--workers=1` — **23 passed (27.4s)**, including the fixed canvas-read tests.
`pnpm verify` — **exit 0**, `81 invariants hold.`, 667 + 1344 + 1818 + 60
tests, no `Unhandled Errors` block.
