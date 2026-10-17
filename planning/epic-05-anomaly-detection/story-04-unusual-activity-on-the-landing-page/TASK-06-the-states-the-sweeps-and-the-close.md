# Task 5.4.6 — The states, the sweeps, and the close

**Status:** Complete — 2026-10-17 — the region is the kept grid's **eighth surface** across **seventeen** states, and adding it found that **six existing aggregates were lying**: since 5.4.2 made the section non-optional they had been modelling a pinned previous image while claiming to be CI's shape, a closed market or a healthy session. The break was **green on its own defect at HEAD** because the region was not a surface. The sideways sweep was **1 of 4 missing** — Epic 14 did not carry its own fired condition
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.5

## Objective

**A collection of completed tasks is not a completed story.** The region's
states have to be produced together — no single screen shows a collision — and
the falsifications this story found have to travel upward and sideways, which a
story close does not do on its own.

## What the user can see when this lands

**Nothing new.** The states are proved rather than asserted.

## Work

- **The states into the kept grid** (`overview-degraded-grid.spec.ts`, which
  fails in **both** directions): nothing observed — CI's permanent state, zero
  bars and no baseline generation, for ever; the market shut on the session
  basis; **nothing unusual at all**, which is a **full list of ordinary
  ordinals** and not an empty state, and is the state most likely to be mistaken
  for broken; fewer scored securities than the region reserves; a baseline never
  computed; the section absent on a rollback; a region error. **Partition by
  drawn string must equal partition by declared class** — a content class is
  **one aggregate**.
- **Note what deleting the `reserved` panel leaves live for Epic 6**: Task
  4.7.9 row 08 found a rollback omitting a section draws a region **exactly
  like one this product has not built yet**, differing only by the absence of an
  `EPIC n` badge. After this story two hatched panels remain; the fewer badged
  hatches there are, the more a badge-less hatch reads as house style.
- **Sweep upward.** Every figure this story falsified: AC 8's byte estimate and
  its "first reduction" premise, AC 9's three-triggers claim, the 680-versus-900
  framing, and `anomaly.ts`'s band boundaries remaining unbuilt. Correct the
  live sites, amend ADRs with dates rather than rewrites, leave the historical
  records standing.
- **Sweep sideways, by enumeration not by memory.** Grep this story's documents
  for every `Story N.M` and `Owner:` line, check each against that story's own
  file, and **record the count that were missing** — Story 5.3's close
  propagated its 11.78 s figure sideways into 5.5 correctly and missed it
  **upward** in `EPIC.md`, which Story 5.4's Phase 1 found and fixed. The known
  one: **the amber collision belongs to Story 5.6** and must be written into
  5.6's own `STORY.md` in words that story can act on.
- `docs/GAPS.md` for every claim left standing that nothing mechanical guards —
  and anything that can be made mechanical is made mechanical instead.
- `LIVE-REHEARSAL.md` row **5.4**, written before the sitting and saying so.
  **This is the fourth row this epic owes a person**, beside 5.1, 5.2, 5.3 and
  Epic 4's waived 390 row — and `pnpm invariants` refuses Epic 5's close until
  they are filled.
- `STORY.md` status; the subject document — **`MARKET-OVERVIEW.md` wins where a
  task file disagrees**, so the account of `/` is amended there; `CLAUDE.md`'s
  _Current state_, because this story changes what a user can see.

## Done when

1. Every state is produced through the shipped path and photographed, and **no
   two read identically at any width**.
2. The upward sweep names each falsified claim, the command that found it, and
   the sites corrected.
3. The sideways sweep is **enumerated**, with the count that were missing
   recorded, and 5.6's `STORY.md` carries the amber collision.
4. `LIVE-REHEARSAL.md` row 5.4 exists and states what no instrument can claim.
5. `pnpm verify`, `pnpm e2e` and `pnpm test:database` green, with the output
   quoted rather than the verdict line.

## Amended by Task 5.4.1 — 2026-10-15: the kept grid keys on TEXT, not geometry

**A premise this task would have inherited is false.** The expectation that a
layout change re-keys `overview-degraded-grid.spec.ts` is wrong: it keys on the
**text** of seven surfaces (`Market proxies`, `Sector performance`,
`Market breadth`, `Movers`, the source note, the feed cell, the service cell),
and **geometry is not in the key**. None of the three reserved regions is a
surface. Task 5.4.1 re-areaed the whole grid and the spec passed **4 of 4 with
no expectation changed in either direction**.

**What that means for this task, and it cuts both ways.** Adding the region's
states is **not** a re-key — it is a **new surface plus new declared classes**,
which is the half that genuinely changes the spec. But it also means the grid
**cannot see** a geometry regression at all, so _one height in every state_ is
`pnpm probe`'s claim and this spec's silence is not evidence for it.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-17

### The region is the grid's eighth surface, and adding it found SIX lying aggregates

`WireMarketOverviewInputs.unusual` is **not optional**, so every frame a gateway
has built since Task 5.4.2 carries the section. Which means `CI_SHAPE`,
`SESSION_BASIS`, `RICH`, `RICH_REJOINED`, `RESTARTED_REPLICA` and
`UNREADABLE_MOVERS` were each modelling **a pinned previous image** while
claiming to be CI's shape, a closed market, a healthy session or a replica that
had restarted. **That is why this was not a four-row addition.** All six now
carry the section at the value the producer would actually send.

### Nine drawn region states, seventeen grid rows, all produced through the socket

| state                                | rows           | drawn                                                                            |
| ------------------------------------ | -------------- | -------------------------------------------------------------------------------- |
| reservation, pre-floor               | 01             | head only — the held box is `visibility: hidden`                                 |
| reservation, after the floor         | 02             | `Nothing ranked yet.`                                                            |
| unranked, observed basis             | 03, 09         | heading + `Nothing ranked yet.` + `…none were heard from in the last 5 minutes.` |
| session ranking drawn                | 04, 10, 11, 12 | ten rows + `…466 had a measurable 5-minute move into the close on 2026-09-11…`   |
| ten ranked, observed                 | 05, 06, 07, 13 | `>99th … 96th` + the age clause                                                  |
| **nothing unusual at all**           | **14**         | ten ordinals, `62nd … 53rd` — AC 11's whole subject                              |
| **fewer scored than reserved**       | **15**         | three rows + seven held pads                                                     |
| **session basis, no stored ranking** | **16**         | `Nothing ranked while the market is shut.`                                       |
| section absent (rollback)            | 08, 17         | the `filledBy` sentence                                                          |

**No new FULL collision class was needed** — `one-aggregate-the-session-basis`
and `one-aggregate-the-empty-join` both still hold **with the eighth surface in
the key**, which is the first test of _a content class is ONE AGGREGATE_ against
a region added **after** that rule was written. One new **partial** collision
(04 vs 16), and `Unusual activity` joins the `same` side of the existing 05/06
pair.

**Nothing collided unexpectedly. One thing DIFFERED unexpectedly**: 04-vs-16 was
declared as differing on one surface and differs on **two**, because the source
note's `Baselines` term draws only where the frame carried a `generation` — so a
store with no nightly ranking has no third source either. Declared at the grain
it is true at.

### Three defects, all in the harness, and the first has the worst failure mode available

**1. `NOTE_TERMS` was missing `Baselines`.** `noteOf` requires **every** `dt` to
be a known term, so an unlisted term does not fail an assertion — it makes the
note **unfindable**, and the row prints `(nothing drawn)`, which is a legitimate
reading of that surface. First run with a generation on the frame: the note
reported **absent on 10 of 17 rows**. `overview-source-note.spec.ts` added the
term to **its** copy in Task 5.4.4 and wrote this exact hazard into its own
docblock — and **neither copy pointed at the other**. Both now do.

**2. `unusualSection` hard-coded `generation: { session: "2026-10-14" }`.**
Driven from a frame dated 2026-09-16 it drew _Ranked against 60 sessions of
stored bars, generated for **Oct 14**_ — a month after the session scored,
against ADR 0044's keying. Invisible until now because every existing caller
happened to use the default on both fields at once.

**3. The first `FEW_SCORED` frame was one no producer builds** — `eligible: 466`,
`scored: 3`, eleven counted refusals, so 452 securities unaccounted for.
`readUnusual` tolerates it deliberately, because the identity is an inequality.
Corrected to `eligible: 14`, which is both the producer's arithmetic and the
truer 09:35 picture.

### The break was GREEN on the exact defect at HEAD

`the-unusual-footer-age-reads-the-join-instead-of-the-market` — substituting
`observedAt` → `computedAt`. Performed by hand **twice** before registering:

- against the spec as it stood at `HEAD` (13 states, 7 surfaces): **`1 passed
(25.7s)`** — green on the exact defect, **because the region was not a
  surface**
- against the spec with the eighth surface: red, an assertion failure with other
  tests still collecting — `03-ci-shape-nothing-at-all and
09-restarted-replica-on-reconnect share the content class
one-aggregate-the-empty-join and no longer read identically at 1440`

Then through the harness: broken → red → **restored byte-identical**, checksum
`f56d88c3…44c7c` both times.

### Four stale figures corrected in files this task touched

The spec's own `112 PNGs` was **wrong before this task** — thirteen states × four
widths × two is **104** — now **136** with the arithmetic spelled beside it. And
`scripts/breaks.mjs` said the grid _"produces fourteen states … reads seven
surfaces"_ when it produced thirteen; now **seventeen and eight**.

### Three things the brief and the task file had wrong

1. **"The region reads `overview.breadth.basis`" is false since Task 5.4.5** —
   `nothingRankedIn` reads **`unusual.basis`** and `basisOf` reads the section's
   own generation, because shipping `WireUnusualActivity` as
   `WireObservedUnusual | WireSessionUnusual` gave the section a basis of its
   own. **The dependency the brief described no longer exists**; the claim it
   replaced is still true and is now asserted by the 04-vs-16 pair — the two
   bases must be distinguishable on the wire.
2. **"A region error" is not a state to add.** `readUnusual` refuses a malformed
   section at the decoder, so no byte this harness can send produces a thrown
   region. Owned by `Unusual.stories.tsx`' `Threw` and `Region.test.tsx`; the
   enumerated entry was extended rather than a row invented.
3. **"The market shut with no stored ranking … which is CI" is half right.** CI's
   permanent state is **two** states: the producer picks the arm from the shared
   pass's qualifier, so a gated run **in session** draws `Nothing ranked yet.`
   (row 03) and one **out of hours** draws `Nothing ranked while the market is
shut.` (row 16) — and **neither is CI exactly**, because row 16 carries stored
   closes CI does not have. That residue is the pre-existing enumerated entry
   _CI's shape with the market SHUT and no close anywhere_, now more load-bearing
   and still correctly not produced by hand.

### One row deliberately not produced

_An `unusual` section the decoder refuses._ It is producible in the strong sense,
and it is `17-rollback-no-unusual-section` **byte for byte** — which is
`readUnusual`'s documented contract. A row for it would be either an accidental
collapse by this grid's own rule or a content class holding two aggregates. It is
in `ENUMERATED_AND_NOT_PRODUCED`, with Task 5.4.5's `MNST`-before-`GOOGL`
incident written up as the reason it matters.

### The sweeps

**Upward.** `MARKET-OVERVIEW.md` — the maintained account of `/`, which **wins**
over a task file — now reads **five of seven** regions holding figures with
**two** reserved, carrying the magnitude defect, the re-area, the two bases and
the measured asymmetry. `CLAUDE.md`'s _Current state_ likewise, with the old
claim struck rather than deleted, and its Commands block carries `pnpm
test:scripts` and the corrected `verify` chain. ADRs **0040** (fired, two
predicted consequences did not happen), **0038** (grain trigger evaluated
**twice** and unfired) and **0044** (the shape reused, and the two-table
generalisation) each carry a dated amendment rather than a rewrite.

**Sideways, enumerated by grep rather than by memory — and 1 of 4 was
missing.** Epic 6 carried Task 5.4.1's box hand-off; Story 5.6 carried the band
chip and the amber collision; Story 5.5 needed nothing. **Epic 14 did not carry
its own fired condition** — the only `5.4` in that file was `15.4 MB` matching by
accident. Now written, with the price, the four caveats, and the note that
5.4.5's session arm does **not** re-fire it.

**`docs/GAPS.md`** gained three entries: the coverage bias AC 5 could not
disclose, the one-height claim resting on `pnpm probe` alone (the kept grid keys
on **text**, proved twice), and the ranking's correctness resting on **an arm
that has never executed** against data. A fourth, from the pipeline repair,
bounds the deployed series probe against a zero-bar deployment.

**`LIVE-REHEARSAL.md` row 5.4** is written before the sitting and says so — the
**fourth consecutive row this epic owes a person**, and the first on the landing
page — with six things only a person can answer.

**And one finding was RE-OWNED rather than discharged.** `MARKET-OVERVIEW.md`
recorded `Panel`'s `reserved` state doing two jobs as _routed, and it is Epic
5's_. Story 5.4 did not repair it and **made it sharper**: deleting this region's
hatch leaves **two** badged hatches where there were three, and after Epic 6 there
will be **one** — the fewer there are, the more a badge-less hatch reads as the
house style. The condition now belongs to **Epic 6**.

### Gates

`pnpm verify` **exit 0** — **`63 invariants hold.`**, `576 documents, 1863
cross-file links, 0 broken`, shared 509 / backend 1178 / frontend 1629 /
`test:scripts` 20 / `test:process` 60, and **no `Unhandled Errors` block**
anywhere in the output.

`pnpm e2e overview-degraded-grid.spec.ts` at four widths — **`4 passed (1.6m)`**,
**zero `UNSETTLED` rows across all 52**. `pnpm e2e overview-` over all 26 specs —
**`96 passed, 1 skipped (2.0m)`**, the skip being the pre-existing
store-conditional arm.

`DEGRADED_GRID_PHOTOS=1` — **136 PNGs** (17 × 4 × 2) plus four
`readings-*.json`, with `15-…-1440.png` and `14-…-390.png` **looked at**: the
short list's pads hold the box level with `Sector performance`.

Load read **before** each heavy job and never during — 6.27 → 4.25 → 3.53 →
3.91 → 8.44 → 2.44, never two at once.

**The full `pnpm e2e` DID run, and the orchestrator invalidated it — then
re-ran the affected spec alone.** Figures, honestly: **266 passed, 16 skipped,
4 failed (6.3 m)** at two workers. **All four failures were the four widths of
`overview-degraded-grid.spec.ts`, and all four were caused by the orchestrator**,
who ran `pnpm break the-unusual-footer-age-reads-the-join-instead-of-the-market`
**while the full suite was running**. That break **substitutes a defect into
`apps/frontend/src/market/unusual-activity.ts`** and restores it afterwards, so
the suite read a deliberately broken source file mid-run. That is the one thing
_The working loop_ forbids — _never start a second heavy job while one is
running_ — and it had been pointed out to an implementing developer earlier in
this same story, which makes it the second instance in Story 5.4 and the first
by the orchestrator.

**Re-run alone on a clean tree** (`git status` confirmed clean for that file),
at a load average of 10.86: **`4 passed (1.5 m)`**. So there is no regression,
and the four reds are an artefact of the method.

**Two things worth keeping from it.** First, the run is otherwise the **cleanest
full suite in this story — 266 passed with NO front-of-margin timeout
failures**, where four earlier runs at four workers produced three or four each.
That corroborates `docs/GAPS.md`'s recorded 0% rate at one worker: **two workers
is the fix for the timeout family on this machine.** Second, three earlier
attempts in this story were killed by **system memory** rather than by any test

— free pages down to **2,836 (≈44 MB)**, once at four workers and once
at two, with no orphaned browsers responsible. **CI runs the full suite as a
required check** and has passed it on every PR in this story (12m6s, 11m27s,
12m14s, 12m37s, 10m29s, 10m17s). `pnpm test:database` was not run: no data-layer
change.

## For a stakeholder — a status report, 2026-10-17

**Nothing new is on screen. What this step did is make the new region's states
provable rather than asserted** — and in doing so it found that **six of the
existing photographed states had been quietly wrong since three days ago**.

The landing page has a kept set of photographs: every combination of _what the
data is doing_ × _how wide the window is_, compared against a declaration of
which states are supposed to look identical, failing in **both** directions — if
two states that should differ look the same, and if two that should match drift
apart. When the new region was added as an eighth thing to photograph, six of
those states turned out to be describing a version of the page that no longer
exists. They now describe the real one.

**Three faults were found in the test harness itself**, and the first is the kind
worth paying attention to: the check that reads the page's "where did this data
come from" note required every term in it to be one it already knew — so adding a
new term did not make the check fail, it made the note **invisible**, and the
harness cheerfully recorded "nothing drawn" for ten of seventeen states. A test
that reports absence when it means _I do not recognise this_ is worse than one
that breaks.

**And the safety check added here was proved useless first, which is the point.**
Breaking the code it guards, against yesterday's version of the photographs, left
everything green — because the region was not being photographed at all. The same
break against today's version fails immediately. That is the only way to know a
check is doing anything.

**The written record was swept in both directions**, and the sideways sweep found
**one of four hand-offs missing**: the performance epic had never been told that
its own condition had fired, because the only match in its file was a coincidence
in a byte count. It now carries the measurement and its caveats.

**What is still owed is a person.** No test machine and nobody has ever seen a
single row of this region: the test environment has no price history and no
nightly job, so it shows the honest empty state for ever. That is the fourth row
this epic owes a sitting, and the first on the page a reader meets first.
