# Task 6.8.3 — The degraded set, produced rather than furnished

**Status:** Complete — 2026-11-11
**Story:** [6.8 Filtering, & the Degraded Set](STORY.md)
**Depends on:** 6.8.1 (the degraded grid must know what a filtered state looks
like, even though filtering itself is orthogonal to degradation)

## Objective

CI's store has 516 securities, zero bars, no provider and no composite
generation — not an edge case this epic can defer, but the permanent state
every gated run is in, and the state a reviewer sees first. This task makes
that state, and the other ways the topology's own two requests and one
aggregate section can come back thin, honestly distinguishable from each
other and from a bug — through the real socket, decoder and store wherever
that is possible, with the one genuine exception named rather than built.

## What the user can see when this lands

Nothing new on a healthy store. On a thin one — no provider, no bars, a
quiet aggregate, an unreachable backend, a stale rollback missing its band
section, a failed correlation fetch — the topology says plainly what it does
and doesn't know, never reading as a region nobody built, and never silently
restating a fact the status bar or the source note already own.

## Work

- **A new sibling e2e spec** for the topology's own degraded states —
  deliberately not more rows in `overview-degraded-grid.spec.ts`, whose own
  documented flakiness-under-load history (now at seven sessions and no
  longer reliably cleared by `--workers=1` alone) and nine-surface key make a
  third axis the wrong place to add weight. Reuse its machinery (declared
  collision classes, asserted in both directions; a plant per channel per
  row) rather than its file.
- **AC5's rewritten states, each classified produced or named unproducible**:
  - the whole market (already covered, unfiltered);
  - one sector (Task 6.8.1, reused here as a cross-check rather than
    re-built);
  - a store with no bars — `pnpm store:bare` for a whole-run shape, or
    within one run: the relationships route aborted/empty plus no
    `anomalyBands` section;
  - no provider — `serveFeed(page, { feed: null })`;
  - the aggregate arrived carrying nothing — the existing `CI_SHAPE`/
    `RESTARTED_REPLICA` furnished shapes;
  - the backend unreachable — route-level refusal
    (`page.route(..., r => r.abort("connectionrefused"))`), never killing the
    real backend process, which would poison every later spec in the run;
  - an aggregate whose `anomalyBands` section is absent — produced, a real
    rollback frame;
  - a relationships response that failed or answered a shape the decoder
    refuses — produced, reusing the existing `failed` sentence;
  - the region removed from the bundle entirely — **named unproducible**, in
    this spec's own `ENUMERATED_AND_NOT_PRODUCED`, alongside "a region whose
    content threw." No byte this harness can send removes a shipped region
    from a bundle.
- **The declared collision class** (AC6): assert, in both directions, that a
  store with no bars, no provider, and the aggregate carrying nothing draw
  the identical picture and sentence inside this region — and that every
  other state stays distinct from all three and from each other. Name the
  real differentiators (the status bar's connection word, the source note's
  provider line) as living elsewhere, not as a gap.
- **Closes Task 4.7.11's routed hand-off**: confirm whether "a degraded
  region reads as one nobody has built" is now discharged (only
  `Current investigations` remains a badged hatch on `/`) or still live, and
  make the degraded topology's own failure state (white ground, sentence,
  `Try again` where retrying is worth offering, a correlation id) visibly
  distinct from `Panel`'s `reserved` hatch — never borrowing it.
- **Fixes the pre-existing defect found while shaping**: the correlation
  layer is suppressed below `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` at three of the
  four widths this product tests, but the accessible sentence is width-blind
  and states a pair count regardless. Make the sentence (or the suppression)
  width-aware, since this is exactly AC7's subject.
- **`pnpm probe`** at all four widths, with the Task 6.8.1/6.8.2 filter
  controls present, across the degraded states above — this spec is text and
  cannot see a layout; the probe is the only instrument for "one height in
  every state," per this repository's own standing rule.

## Done when

1. The new sibling spec exists, passes, and covers every AC5 state above as
   produced or explicitly unproducible.
2. The collision class for no-bars/no-provider/aggregate-carrying-nothing is
   asserted in both directions and documented as a deliberate, accepted
   exception to AC6 rather than a silent gap.
3. The degraded-vs-deferred hatch question is answered in writing, with
   evidence.
4. The width-blind correlation-sentence defect is fixed and covered.
5. `pnpm probe` results at all four widths are recorded, across the degraded
   states and with an active filter.

## What was done, and what was found

`TOPOLOGY.md` §10 is the maintained account and **wins** where this file
disagrees. What follows is what this task itself found.

### The shape, in six files

- **`e2e/specs/overview-market-topology-degraded.spec.ts`** — the new sibling
  spec: nine states × four widths, two surfaces (this region's text and its
  drawn treatment), a plant per channel per row, three declared collision
  classes asserted in both directions, four enumerated-and-not-produced
  entries, and the grid printed as the run's own output.
- **`e2e/support/pair.ts`** — `RELATIONSHIPS_ROUTE_PATTERN`, because two specs
  now intercept that route and a second copy of a route pattern is how one spec
  ends up matching nothing while reporting the state it meant to produce.
  `overview-market-topology.spec.ts`' two literals were repointed at it.
- **`topology/renderer.ts`** / **`renderer-canvas.ts`** —
  `onCorrelationLayer`, reported from inside `draw` **after** the zero-box
  guard and **only on a change**, plus a dated withdrawal of Task 6.5.4's own
  _the accessible sentence is deliberately NOT width-aware_.
- **`MarketTopology.tsx`** — `correlationLayerDrawn` state, the clause as one
  tail under three heads, and `isAre` for the band sentence's own counted
  nouns.
- **`MarketTopology.test.tsx`** — eight new tests, and `fakeMount` extracted
  from thirteen copies of `() => createFakeRenderer()` so a mocked renderer
  reports what a real one reports at mount.

### AC 5's nine states: eight produced, one named unproducible

Rows 01–09 in §10.1. **The region nobody has built** is the one named
unproducible — no byte this harness can send removes a shipped region from a
bundle — and what it was really guarding against is produced instead, as the
`treatment` surface on every row. Three more entries sit beside it: a region
whose content **threw** (not a state of any frame — the landing grid's own
entry, unchanged), `pnpm store:bare` as a **whole-run** shape (a second backend
and a second pair, which no spec in this suite starts; Task 6.8.2 took that one
by hand and recorded the frame verbatim), and **ADR 0028's 160 ms cover**,
unreachable by construction for a client-side filter.

### AC 6's exception, declared and asserted both ways

`one-region-three-thin-stores` — rows 03, 04 and 05 are one picture and one
sentence here, because this region reads the universe, the relationships and
`anomalyBands` and **never** the connection or the provider, each of which has
one home that `pnpm invariants` refuses a second of by name. Two further classes
earned their place rather than being assumed:
`a-withdrawn-band-section-changes-nothing-here` (rows 01 and 07 — Story 6.3's
AC 5 asserted from outside for the first time) and
`the-measurement-could-not-be-read-is-one-state` (rows 08 and 09, where 09 is
the only row that proves the decoder's refusal happens at all).

### The hatch question, answered with evidence (Done-when 3)

Discharged **for this region, by construction**, and the general finding is
**not** discharged and is sharper. §10.3 carries it, `MARKET-OVERVIEW.md`'s own
live claim has a dated amendment, and `docs/GAPS.md` has a new entry whose owner
is a condition — _the last badged hatch leaving this screen_.

### The width-blind clause, fixed (Done-when 4)

A shipped defect since Task 6.5.4: the clause claimed _are joined by a dashed
edge_ at all four widths while the renderer draws none below `0.38` effective
scale, which is **three of the four**. The renderer now reports and the sentence
has three heads over one identical account; `null` (nothing reported yet, or a
renderer that threw) is a third answer and is not defaulted. §10.5 carries the
reasoning, the withdrawal of the old comment, and the verbatim sentences at four
widths off a real canvas.

**Proved against the defect rather than only against the fix.** With the
pre-6.8.3 head restored — the width-blind string, unconditionally — **4 of the
new tests go red with assertion failures and the other 117 still collect and
pass**:

```
FAIL … > claims no edge at all where the renderer suppressed the layer, and keeps the whole account
FAIL … > claims neither where no frame has reported yet
FAIL … > survives a live band update, with the suppressed wording intact
FAIL … > follows the renderer across a zoom that crosses the threshold, without re-mounting
      Tests  4 failed | 117 passed (121)
```

### Two more defects, one fixed and one routed

**Fixed**: `1 are high and 1 are extreme` / `1 have not been scored yet` — the
house `count === 1` idiom missing from the one sentence on this surface a
listener hears. Found by producing a frame that scores one security per band;
reachable on the deployment a plausible count away from the 16 `extreme` the
measured store held. **Routed, with a condition**: the same class of defect in
`topologyFilterWords`' own clause (`one of the 501 … are high`), in
`docs/GAPS.md`, owned by _the first session where exactly one security is high
or extreme_ or by this story's own close sweep.

**Reported rather than changed**: in row 06 the region's header still offers
`Sector`, `Band` and `Reset view` over a graph that could not be drawn — 131 px
of chrome at 390 above one sentence and a `Try again`. That is `Reset view`'s
own recorded argument inherited by two controls; whether it reads as consistent
or as broken is Gate 2's, not a check's.

### Measured (Done-when 5)

**One height in every state at every width** — the table is in §10.4: **522 px**
in all ten states (the nine plus sector-and-band stacked) at 390, 768, 1024 and
1440, no region scrolling, no page error. The one thing that moves is the
**header at 1024 with both filters named**, 59 → 95 px as the meta wraps, with
the canvas absorbing it 461 → 425 — §8.4's and §9.5's measured behaviour arriving
at a second width. `pnpm probe` took the two reachable rows; the seven degraded
rows need route interception and were taken with a throwaway of the same shape,
whose output §10.4 records.

**The width-aware clause, off a real canvas on a populated store**: 1440 reads
`are joined by a dashed edge …`; 1024, 768 and 390 read `are not drawn at this
size, where the sector clusters are unlabelled too …`; the account —
`1,860 pairs, reaching 496 of the 501 equities, from 122,760 pairs measured over
60 trading sessions with the strongest 5 kept for each security.` — is
byte-identical at all four.

### What was run

```
pnpm e2e overview-market-topology-degraded.spec.ts --workers=1        12 passed (42.1s)
pnpm e2e overview-market-topology.spec.ts
    overview-market-topology-anomaly-bands.spec.ts
    overview-market-topology-live-mark.spec.ts --workers=1             8 passed (10.5s)
pnpm e2e overview-market-topology-filter.spec.ts
    overview-market-topology-keyboard.spec.ts
    overview-market-topology-hover.spec.ts
    overview-market-topology-burst-absorption.spec.ts --workers=1     30 passed (1.0m)
pnpm e2e overview-degraded-grid.spec.ts --workers=1                    4 passed (1.8m)
pnpm --filter @marketpulse/frontend test MarketTopology              121 passed
```

**No new `pnpm invariants` clause and therefore no new break** — judged rather
than skipped: what this task adds is a browser-level grid and one renderer
report, and the claims it makes are either asserted per row in the spec (the
collision classes, the treatment, the plants) or unassertable below a browser
(the suppression itself). The two existing invariants this change could have
tripped — `one-home-for-imperative-navigation` and
`the-topology-layout-is-built-from-the-whole-universe` — are untouched, and
`every-break-can-still-land` was watched for a rotted `find` across the three
edited source files.

### What no gated machine will see, and what no person has

§10.7. Rows 01, 02 and 07 furnish a band section CI cannot produce; the
width-aware clause's **drawn** arm is unreachable on CI permanently, so the arm
a gated run takes is `never-measured`, asserted as such rather than skipped.
And **nobody has looked at these nine pictures** — the spec reads strings, the
heights are a machine's, and whether six absence sentences in one region read as
careful or as broken is Story 6.9's sitting.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
