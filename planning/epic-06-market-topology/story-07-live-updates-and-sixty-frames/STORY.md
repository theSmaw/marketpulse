# Story 6.7 — Live Updates, & the Graph That Stays at 60 FPS

**Status:** **Gate 1 approved 2026-11-10 — decomposed into four tasks.**
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.6
**Epic scope covered:** Live visual updates

## Description

**This is the story where the graph becomes alive**, which `PRODUCT_SPEC.md` §5.6
makes a product requirement rather than polish: _"It must feel alive. This is a
market application; a screen that updates by silently swapping text is
technically correct and feels dead."_

**It is also where §28's one unmet target gets measured.** _500 nodes / 5,000
edges: 60 FPS during normal interaction on a representative laptop_ has been in
the specification since the beginning and no figure has ever been taken, because
nothing rendered.

**Two measured facts make this harder than it sounds.** `/` commits **2 renders
per applied batch** at the feed's measured **6.8–16.1 batches a minute** —
**13.6–32.2 renders a minute** — and every overview frame is a new object
reference, so the host component re-renders whether or not any graph datum
changed. And the feed delivers bars **as one burst a minute** rather than
smoothly, which is the shape Story 3.6 found for the universe table: 518 rows
changing at once, then 59 seconds of nothing.

**The motion vocabulary is already decided and this story inherits it rather
than inventing one**: _work in progress LOOPS, a state PERSISTS, a fact arriving
DECAYS_ — and the arrival mark fires when **a bar arrives**, not when a price
changes, because it says _a bar arrived for this security_ rather than _this
price moved_. `an-arrival-mark-is-keyed-on-the-arrival` now fails the build on
a mark keyed on anything else, over every shipped source file in three trees.

## What the user can see when this story lands

**The graph moves on its own.** Nodes change as their securities do, a bar
arriving is marked, and the picture stays smooth while it happens.

## Acceptance criteria

**Rewritten at Gate 1, 2026-11-10, after six parallel shaping reports found
AC1 unsatisfiable with real data, AC3/AC7 missing their own population, AC4
held by an invariant that is structurally blind to a canvas call site, and
AC5's "what survives" never named.** Kept struck below each rewrite, per
this repository's own rule that a sentence recording what was asked for is
not the same sentence as one recording what the data permits.

1. ~~60 FPS at 500 nodes and 5,000 edges during pan and zoom, measured on a
   production build… §28's target, taken for the first time.~~ — **The real
   shipped graph is 516 nodes and ~2,372 edges (512 membership + up to
   1,860 correlation), not 5,000 — the synthetic mode that reaches 5,000 is
   Epic 14's by name and stays out of scope here (confirmed, not
   re-litigated).** Rewritten: **60 FPS at the shipped graph's real size,
   during pan, zoom, AND a live update firing concurrently**, measured as a
   three-part conjunction — the loop ran (frame count advanced), the loop
   kept up (rAF-gap p50 ≤ 16.7 ms, p95 near quantum, 0 gaps over 50 ms), and
   nothing blocked (0 `longtask`, 0 `long-animation-frame` over 50 ms) — on
   a **production build, `--headed` against a real GPU** (the authoritative
   figure; a headless/SwiftShader figure is recorded too, as the regression
   floor this repository's own gates can retake, per Task 6.6.1's own
   finding that extra draw-call cost is real under software rendering and
   near-zero on real hardware). Load read before each run. **A route-level
   interaction harness is required infrastructure for this criterion** —
   `pnpm probe`'s own pan/zoom path has never been wired to `/` (Storybook
   only), a gap TOPOLOGY.md §4 has named twice (Stories 6.3, 6.6) without
   closing it.
2. **No routine main-thread task over 50 ms, on three channels, each proved
   by a plant on the page that produced the figure** — unchanged, and
   precision added: the plant must land on a frame the **live-update
   mechanism** scheduled, with the pointer still, not on a wheel-provoked
   frame, or the arm proves the wrong path.
3. ~~A burst is absorbed… the graph must not stutter once a minute.~~ —
   **"Stutter" was not falsifiable; rewritten with the population and the
   pass criterion named.** Over at least 3 consecutive bursts, no frame
   during or within 1 s of a burst exceeds the 50 ms ceiling (AC2's own
   ceiling, not a new one), and the worst rAF gap during a burst is reported
   against the same figure taken in the 59 quiet seconds between. Both the
   real subscribed population (516, since Open Decision 0 below) and a
   furnished arm are reported, each labelled. Measured via the shipped
   `e2e/support/feed.ts` harness (`serveFeed`/`send`), which already
   furnishes exactly this shape for ten other specs — no new instrument
   needed.
4. **The arrival mark keeps its shipped meaning** — unchanged in intent,
   precision added: `an-arrival-mark-is-keyed-on-the-arrival`
   (`scripts/check-invariants.mjs`) is **structurally blind to a canvas
   renderer verb** (it matches an `arrival:`/`arrival={` prop or a
   `useArrival(` call, neither of which a `TopologyRenderer` method has).
   This task widens that check (not a second, parallel one) to also see the
   renderer's own arrival-marking call site, with a `pnpm break` that plants
   the defect the next author would actually write (keying the mark on the
   score) and confirms the check passes **wrongly** first.
5. ~~Reduced motion is honoured… a browser asserts.~~ — **"What survives"
   was never named; rewritten to name it.** Under `prefers-reduced-motion`
   the decay does not run, and **the observation instant the mark would
   have announced survives as text already on screen** (the plate's own new
   staleness line, Task 6.7.3) — never a persisting visual residue, and
   never literally nothing where a default reader was told something.
   Mechanically: the renderer reads `--motion-duration-decay` as a string
   through the token layer (added to `TOKEN_NAMES`), never a second,
   parallel `matchMedia` read — the one-home rule for a design decision
   already encoded as a token. Asserted in a browser via `page.emulateMedia`
   and a before/after sample of the renderer's own `framesDrawn()`.
6. **The graph does not re-layout under live data** — unchanged in intent.
   Already true by construction today (`the-topology-layout-reads-no-edge`,
   Story 6.6; `securities`' own array identity gates the mount effect) —
   what this story adds is proof that its OWN new mechanism doesn't
   introduce a renderer-side nudge the model-level check cannot see: a
   producer-side test (the renderer is never handed a second layout) plus a
   new invariant, a mechanical sibling of `the-topology-layout-reads-no-edge`,
   refusing any read of an arrival key or an observation instant inside the
   renderer's own placement/draw-position code.
7. ~~A node that stops being heard from is honest about it… a third of the
   graph has not been heard from recently.~~ — **The premise used the wrong
   window.** 65.1% is **per-minute** coverage; every other freshness claim
   on this product is measured over the **5-minute** observation window
   (ADR 0040/0043), and the aggregate already ships the real figure
   (`breadth.measured` against 501) — nobody had taken it before this
   story. Rewritten: **a reader can learn, for the node they select, when
   that security was last heard from — as an instant, in the plate, with no
   threshold, no status word and no connection word** — and the region's
   own accessible sentence states its own population the way `Market
breadth`'s and `Movers`' sentences already do, so a third of the graph
   drawing `unscored` is never silently mistaken for a third of the graph
   being broken.

## Open decisions — for the Product Owner

**All settled at Gate 1, 2026-11-10.**

0. **New at Gate 1 — does `/`'s subscription widen to the full tracked
   universe?** Not in the story's own original text; found during shaping,
   because every other decision below depends on it. **SETTLED: yes, widen
   to the full tracked universe (`trackedTickers()`)**, against the
   unanimous recommendation of five independent shaping reports (keep the
   narrow ~25-30-symbol subscription) — taken explicitly with the real,
   unmeasured cost named rather than assumed: Task 6.7.1 owes the real
   figure (the existing 3.7–5.1 ms/batch browser-cost reading was taken at
   ~30 observations and is **unmeasured at 516**). The resubscribe-rate
   consequence is expected to **improve** — a fixed, universe-wide
   subscription no longer needs to change when movers/unusual rankings
   shift, which today costs 12–24 resubscribes a session.
1. ~~What moves when a node updates?~~ — **SETTLED: one graph-level
   decaying mark per burst**, fired by the aggregate's own observation
   instant advancing, not a per-node mark. Taken against the option the
   widened subscription (Decision 0) would have made newly affordable for
   **all** 516 nodes, on the strength of the burst-synchrony finding: ~340
   nodes marking in the same instant once a minute reads as the graph
   flashing rather than as individual events (five independent reports),
   and `--motion-duration-decay`'s own design-token docblock already names
   the reversal condition this would trip — _the first surface where it
   fires more than once a second_. The band ring recolouring (shipped,
   Story 6.3) remains the per-node motion.
2. ~~Does the graph show staleness per node, or not at all?~~ — **SETTLED:
   yes, but only as text in the readout plate, for the node a reader has
   selected — never as node ink.** A per-node visual treatment was refused
   on the strength of this product's own standing rule (an age, not a
   verdict, already refused once in writing with a measured 187-minute
   ordinary gap behind the refusal — `LIVE-DATA.md` §11.2) and the risk of
   a second, hard-to-distinguish hollow state beside the shipped `unscored`
   treatment. The widened subscription (Decision 0) is what makes this
   reach **every** node once selected, rather than only the ~25-30 a
   narrower subscription would have covered.

## Handed here by Task 6.6.2 — settled at this story's own Gate 1, 2026-11-10: §10's `Intensity` node encoding

**SETTLED: the full per-equity encoding is refused in writing; the signed
direction is taken instead, in the plate.** The composite anomaly score is
a magnitude (`Math.abs`), so a node at `extreme` has drawn identically for
a crash and a spike since Story 5.6 shipped it — a real, live gap this
story closes cheaply rather than by inventing a new node-level channel: no
hue, size or annulus space is spent (all already claimed by the band ring,
edge strength and shape), and the widened subscription means the sign is
derivable for any selected node rather than needing a narrower, separate
wire addition for only the ~165 nodes in `high`/`extreme`. §10's fifth
node encoding is now closed by a named story, the same one-line-record
discipline Story 6.6 used for `shape/icon`.

## Out of scope

Filtering and the degraded set (6.8), the synthetic 5,000-node mode — that is
Epic 14's, and §27 says so.

## Handed here by Story 6.4's close — 2026-11-06: the reversal condition for whether a selection leaves the topology region, named in advance and aimed at this story

**Story 6.4's Gate 1 decided a selected node is local to the topology
region only — it does not filter `Unusual activity`, `Movers`, or anything
else on `/`, and ADR 0023's reversal trigger (_the first piece of state two
features must agree about that neither owns_) was left deliberately
unfired.** That decision carries its own stated condition for revisiting
it, written into Story 6.4's own `STORY.md` rather than only argued in
passing: **the first story in which two regions on this screen must agree
about which security the reader is looking at.**

**This story is the most likely one to fire it, by its own subject.** Live
updates change what a node looks like while a reader may be looking at one
in particular — if this story's own per-node staleness/arrival treatment
(Open Decision 2 above) ever needs to know _which node the reader currently
cares about_ to do something sensible with it (dimming everything else
while one node updates, say, or pausing a decaying mark on the selected
node specifically), that is exactly the shape of two regions needing to
agree about one security that neither owns. **Read Story 6.4's own
selection mechanism before assuming a new one is needed**: the selection
itself lives in the RENDERER (`let selected`, `renderer-canvas.ts`) —
deliberately not in React state, because the renderer needs it anyway to
draw the selection's own ground disc — and is reported out through
`TopologyRendererOptions.onSelect`. `MarketTopology.tsx` holds only a
**derived** value in `useState<Ticker | null>` (`openable`, the answer to
"is this symbol currently the one real anchor should point at," built by
`topologyOpenableSymbol` from the renderer's report), never the selection
itself. If this story needs the selection from outside `MarketTopology`,
the question is whether to lift the RENDERER's own fact up (to
`MarketOverview.tsx`, or further) rather than to invent a second selection
mechanism alongside it — a second home for the same fact is exactly how
two selections come to disagree, which is the whole reason Story 6.4 kept
the renderer as the one owner in the first place. If this story's own
live-update treatment does NOT need to know the selection, say so
explicitly and leave the condition unfired for the next story — the
trigger is a condition, not a deadline, and firing it without a real need
is the thing Story 6.4's own Gate 1 declined to do.

**Evaluated at this story's own Gate 1, 2026-11-10, and the condition
stays unfired, by all six independent shaping reports' own reading.**
Nothing this story settled on needs the selection from outside
`MarketTopology`: the graph-level arrival mark (Open Decision 1) is keyed
on the aggregate's own observation instant, selection-blind; the plate's
new staleness and direction lines (Open Decision 2, the Intensity
hand-off) are drawn by the renderer, the same owner that already holds
the selection — a read of a fact the renderer already has, not a second
home for it. The one mechanism worth naming explicitly rather than
passing over: if the plate's new facts are sourced for the selected
symbol specifically, the renderer's own selection reaches
`MarketOverview.tsx` through the existing `onSelect` report (the same
path `openable` already uses) — a **lift** of the renderer's own fact to
its caller, not a second selection mechanism, so the trigger's own test
(_two regions that must agree about one security that NEITHER owns_)
still does not apply. Recorded here so the next reader finds this
evaluated rather than silently skipped a third time.

## Handed here by Task 6.6.2 — 2026-11-09: §10's `Intensity` node encoding, undecided and handed to this story by name

**Settled at this story's own Gate 1, 2026-11-10 — see the dated section
above, "Handed here by Task 6.6.2 — settled..."** The original hand-off
below is left standing as the record of what was asked and why, per this
repository's own rule that a live document corrects rather than erases.

**`PRODUCT_SPEC.md` §10 lists five possible node encodings — size,
intensity, shape/icon, border, cluster — and Story 6.6 closed four of
them (size refused, shape/icon confirmed taken by Story 6.2, border is
Story 6.3's anomaly band, cluster is Story 6.2's).** `Intensity — current
price movement` is the fifth, and none of Story 6.6's seven acceptance
criteria covered it; the omission was found during that story's own Gate
1 shaping and escalated to the Product Owner, who settled it: **this
story, not Story 6.6, owns the decision.**

**Why it was not taken in Story 6.6.** It would have collided directly
with Story 6.3's own anomaly-band ring — both are a node-level treatment
answering "how unusual/how much has this moved," and shipping a second
one beside it on the same 16-unit footprint, in the same story that was
also drawing edge strength, would have been a fifth encoding on a screen
whose own epic ordering says five shipped together makes none of them
legible (`EPIC.md`'s "6.6 is late on purpose" reasoning).

**Why this story is the right owner.** Its whole subject is live
movement — "the graph moves on its own" — so a price-intensity treatment
is a natural extension of whatever motion vocabulary this story already
builds (the decay-on-arrival rule, the band-colour-change-on-update
path), rather than a new concept layered on top of a story about static
encodings.

**What already exists and should be checked before taking this on.**
`Movers` and `Unusual activity` already answer "which securities moved,
and by how much" elsewhere on `/` — a reader does not currently lack
that information, only a spatial/graph-native version of it. Whether that
makes a node-level intensity treatment genuinely additive, or merely a
third home for one fact, is this story's own question to answer — not
assumed either way here.

**What this story does NOT inherit as settled**: whether `Intensity`
ships at all. The options, as Task 6.6.2 framed them, remain open: take
it here (with its own channel, distinct from the band ramp — hue is
spent, so likely a motion/decay treatment rather than a static one,
which fits this story's subject particularly well); refuse it in
writing, permanently, on the grounds that `Movers`/`Unusual activity`
already cover the need; or some other resolution this story's own
shaping finds. Whichever way it goes, §10's fifth encoding should be
closed with a one-line record the way Story 6.6 closed `shape/icon`,
so a future reader does not find it looking perpetually open.
