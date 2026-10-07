# Task 4.3.8 — The spec, the state grid, the sweeps and the close

**Status:** **Complete — 2026-10-07. The spec is a PASS-THROUGH rather than a furnished fixture, because the sort is server-side — and that revealed that all four existing overview specs are completely blind to a producer that stops ranking. The state grid's producer walk found FIVE reachable states with no row, one of them a region that stays silent for ever. And `verify` failed on `main` from a known flake, so the flake was repaired rather than recorded a fifth time.**
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.7

## Objective

**What the suite can say about a ranked list, what it cannot, and the record.**

## What the user can see when this lands

**Nothing.** The story is finished and the next reader can find out why it is
built this way.

## Work

- **The browser spec**, extending `overview-proxy-live-update.spec.ts`'s harness.
  **Assert a permutation of a captured order, never a literal list** — asserting
  eleven literal positions re-implements the sort in the spec, so a wrong
  comparator is asserted rather than caught. And **serve every fixture in a
  deliberately wrong order**: a fixture already sorted makes an absent sort
  invisible, which is the likeliest actual failure. Delete the comparator, run
  the spec, watch it go red.
- **What CI cannot say, in the spec's header, in the established words**:
  everything about what the browser does with an arrival and nothing about
  whether one arrives. On CI all eleven sectors are `unknown` **for ever** — 518
  securities, zero bars, no provider — so the ranked state this story exists to
  produce occurs on **no gated machine**.
- **Stay out of the two characterised flakes' class**, which is _a byte-identical
  text assertion over a page that is still settling_: wait for a **positive**
  state before capturing a baseline; assert **scoped** to the eleven symbols'
  document order, never whole-`main`; assert a **transition**, not an absence
  across a window; assert no duration and no threshold; and **characterise before
  merging** — `--repeat-each=6` four times on one settled checkout, counting
  failures **per execution**, because at 12% a single run comes back clean 46% of
  the time and reads as proof.
- **The state grid**: every state × four widths, **in greyscale and under a
  deuteranopia matrix**, compared as strings. No two rows may read identically
  and no row's direction may be lost. `docs/GAPS.md` entry 13 is discharged for
  this region by **producing** every row rather than reasoning about it — and its
  second half, walking the **producers** for states with no row, is the half that
  had never been run before Story 4.2 ran it and found two missing from a grid
  four days old.
- **The `docs/GAPS.md` entries**, each with a `Re-measure:` line — the sector↔ETF
  pairings checked against nothing outside this repository; no gated machine
  seeing a ranked order; eleven more figures riding the closes cache's
  two-session window, which can now **re-order a ranking** rather than only skew
  a percentage; two sectors displaying an identical figure ordered by a value
  nobody can see; the region's geometry; and the frame-grain measurement's own
  result. **Amend existing entries rather than writing siblings** where one
  exists.
- **The sweeps.** Upward: any figure this story falsified, same day. Sideways:
  grep this story's documents for every `Story N.M` and `Owner:` line, check each
  against that story's own file, and **record the count that were missing** —
  Story 4.2's close found **six of six** absent.
- **Epic 14's trigger, evaluated in writing.** Its condition is _per-row markup at
  universe scale_; eleven is not that, so **it does not fire**. Record the verdict
  in Epic 14's own file, because somebody will claim it did.
- **`LIVE-REHEARSAL.md`.** Open this story's row when the work opens rather than
  at the close — the ledger's own history is that empty rows accumulate and are
  then filled by a headless browser. And **Story 4.2 has no row at all**: nothing
  in this product has ever watched a **derived** figure move against a real feed,
  and this story is the first where a **rank** moves, which is the first thing a
  person can be wrong about without any number being wrong.

## Done when

1. A browser spec asserts the order changing as a permutation of a captured
   order, and goes red with the comparator deleted
2. Its fixtures are served out of order, and the spec's header says what a green
   run does not certify
3. The grid exists at four widths in greyscale and under a deuteranopia matrix,
   with no two states reading identically
4. Every `docs/GAPS.md` entry has a `Re-measure:` naming a file or a command, and
   existing entries were amended rather than duplicated
5. The sideways sweep's miss count is recorded, and Epic 14's verdict is in Epic
   14's file

## Amended by Task 4.3.3 — 2026-09-27: two claims for `docs/GAPS.md`, and the second one is a hole in what a replay can prove

**1. The `bars` frame count for the eleven sector ETFs is unmeasured, and no
machine available to this story can measure it.** Task 4.3.3 needed to know
whether the eleven arrive in one frame or several. What it established:

- **Several, structurally.** One upstream Alpaca array → one `onObservations` →
  one `bars` frame, 1:1, no coalescing anywhere (`alpaca-stream.ts`,
  `index.ts`, `market-gateway.ts`), and the type says so —
  _"One upstream frame's worth. Batched because the vendor batches (§7.2)."_
  The vendor batches a minute into **8.8 frames at the open** (332 bars), **6.8 at
  midday** (284) and **16.1 at the close** (450) — `LIVE-DATA.md` §9.5/§10.2 — so
  roughly 7% of the universe per frame. The eleven therefore land in **somewhere
  between 1 and 11** frames.
- **Which of those is unrecorded**, because **nothing in this repository ever
  recorded frame COMPOSITION, only frame counts.** `.capture/coverage/`'s real
  2026-09-25 session has `"frames":{"bars":4113,"observations":130413}` — 31.7
  observations a frame — and cannot answer it, which is why it could not be
  reused.

**What a live sitting has to capture**, so nobody re-derives it: on the deployed
gateway, mid-session, log **every `bars` frame with its receive instant and its
symbol LIST** — not a count. Report the distinct frames carrying ≥1 of the eleven
per minute over **≥60 regular-session minutes**, the first-to-last **receive**
spread of the eleven per minute, and **per-symbol IEX presence for the eleven**.
Take it at the **open, midday and close**, because frames a minute runs 6.8 → 16.1
across them. `LIVE-REHEARSAL.md` is where the sitting is recorded.

**Why the design did not wait for it.** §7.4 (**n=445 minutes**, all 518 symbols)
bounds the intra-minute first-to-last spread at **p50 243 ms, p95 511 ms, p99 616,
max 770** — and the eleven are a **subset**, so their spread is bounded above by
it. Against a **900 ms** decay that means all eleven discs are lit together for
~650 ms **however many frames carried them**, so the frame count cannot change the
treatment. **The gap is a record to complete, not a decision to take.**

**2. Per-symbol IEX coverage for the eleven is unmeasured and the SIP answer does
not transfer.** On the stored consolidated tape there is effectively no quiet
group — **387 of 390 minutes carry all eleven** on 2026-09-11, every ETF 390/390
except `XLRE` at 387. But **the live path is IEX**: §7.6 measured **321 of 518
symbols p50 per minute, 65.1% median per-symbol against 82.8% stored**, and the
local store is **100% `sip`** (48,449,712 rows, zero `iex`) because the live writer
runs on the deployed backend. So a quiet sector is **plausible and unmeasured**,
which is why the trailing-quiet-group state is kept rather than drawn as rare.

**3. And the hole worth an entry of its own: a replay cannot answer a question
about frame grain, structurally.** `replay-bar-source.ts` groups stored rows by
instant and emits **one slice per minute across every symbol**, so a replay returns
_one frame, 0 ms spread_ **100% of the time, at any speed, whatever the market
did** — confirmed at 40 frames at 60× and 4 at 1×, eleven of eleven symbols and
0 ms in every one. And every observation in a replayed frame **shares one
`startsAt`**, the presented instant, so **minute identity is not recoverable from a
replayed frame** and a split minute cannot be expressed at all. The comment that
claimed otherwise was corrected on 2026-09-27; **the entry this owes is the general
form — what a replay certifies is the wiring and never the loop**, which is the
same lesson as the quiet-system rehearsal already in `CLAUDE.md` and has now cost a
second measurement.

## The SIDEWAYS sweep, performed early — 2026-09-27, during Task 4.3.6 rather than at the close

**Done early on purpose.** `CLAUDE.md`'s rule is that a hand-off sweeps sideways
and **a story close does not reach it** — a close sweeps the documents the story
_wrote_, and a constraint one story measures for another lives in a document the
**owning** story does not own. The last time this was left to a close it was got
wrong **in the same document that warned about it**.

**Enumerated by grepping this story's documents for every `Story N.M` and `Owner:`
line**, then checking each against that story's own file. The count, which is the
part worth recording:

| referenced    | times | what that story's `STORY.md` already carried                                            | verdict     |
| ------------- | ----- | --------------------------------------------------------------------------------------- | ----------- |
| **Story 4.5** | 13    | the phrase _"two uses"_, once. **No `RankedList`, no 461, no comparator, no re-order.** | **missing** |
| **Story 4.6** | 3     | one line about the region being `Panel scrollable`. Nothing on the keyboard rule.       | **missing** |
| **Story 4.4** | 1     | **nothing at all**                                                                      | **missing** |
| Story 4.2     | 6     | complete — this story was handed by 4.2's own close                                     | fine        |

**Three of three were missing**, and two of them were about a measurement made
_for_ them: `Movers` and `Market breadth` both rose to **461 px for free** when
4.3.5 filled the sector region, so neither story moves anything when it lands —
which neither story knew.

**Written in, in words those stories can act on**, never a link back:

- **Story 4.4** — the free 461 at 1440/1024, the 103/121 at 768/390 which **will**
  grow the page, the rule that replaced Task 4.1.4's, and the warning that rows 2
  and 3 are tied so a taller breadth region **takes the whole grid with it**.
- **Story 4.5** — `RankedList`'s existence and its `"none"` bar slot; **why the bar
  is refused for movers** (one quantity versus four, not eleven versus ten) with an
  explicit instruction to re-argue rather than inherit; the free 461; the comparator
  and its **absent-key rule**; that `PERCENT_DISPLAY_DECIMALS` is shared so rounding
  elsewhere makes the drawn order contradict the drawn figures; the re-order
  treatment and the 243 ms measurement behind it, with the note that **at 518 the
  synchrony is worse rather than better**; and what CI cannot show.
- **Story 4.6** — **closed 2026-09-27**, as soon as Task 4.3.6 had written the rule.
  Its `STORY.md` now carries the keyboard model for a list that **re-orders**: one
  tab stop for the region, rows by arrow keys, a roving `tabIndex` keyed on the
  **symbol never the index** — the clause with **no symptom until the list moves**,
  because an index-keyed stop moves focus to a different sector while the reader's
  hands are still — activation resolved against **identity never position**, and
  `aria-disabled` over `disabled`. It also carries what already exists so 4.6 does
  not rebuild it (the hold, `onReaderWithin`, the head slot's reserve) and the one
  question it inherits rather than an answer: whether `Region`'s unconditional
  `scrollable` should become conditional, which Task 4.3.1 explicitly declined to
  decide.

**Final count: three of three sibling stories were missing what this story measured
for them, and all three are now written in.** The two that mattered most were not
constraints this story chose to hand over — they were **consequences nobody had
noticed**: `Movers` and `Market breadth` both rose to their final height for free,
so neither story moves anything when it lands, and neither story knew.

**Amended 2026-10-07 by Task 4.3.8 — the figure handed sideways was then falsified
by Task 4.3.7, and the hand-offs were corrected the same day.** The number given to
Stories 4.4 and 4.5 was **461**; adding the quiet group's reserved heading took it
to **486**. Both files carry the corrected figure with a dated amendment, and the
`461` that remains in them is the before-and-after of that amendment rather than a
live claim. **This is the hand-off rule meeting the falsification rule**: a
constraint written into somebody else's file is a claim that can go stale in a
document this story does not own, and nothing sweeps it but the story that wrote it.

---

## What was done — 2026-10-07

### The spec is a pass-through, and the task file's instruction was unbuildable

**The task specified: extend `overview-proxy-live-update.spec.ts`'s harness, serve
every fixture in a deliberately wrong order, delete the comparator and watch it go
red. Those pull apart, and the reason is structural.**

`rankSectorFigures` runs **server-side only** — one call site in
`market-overview.ts`, held there by `one-producer-of-the-overview-aggregate` — and
**nothing in the browser ranks**. So a spec that **furnishes** the `sectors` array
writes the very thing under test: the browser draws whatever order the fixture
holds, and a furnished frame can never see the sort. Serving an unranked array over
the socket would also have broken this suite's own narrowness rule — _a stub that
can send any frame can manufacture states the server cannot_.

**Proved rather than argued.** With the ranking deleted from the producer and the
backend rebuilt:

```
pnpm e2e overview-sector-region.spec.ts overview-sector-order.spec.ts \
         overview-proxy-live-update.spec.ts --anyway
  14 passed (12.3s)
```

**All four existing overview specs are completely blind to a producer that stops
ranking.** That is the finding, and it is the reason the spec had to be a different
shape.

So `overview-sector-ranking.spec.ts` is a **pass-through** — `ws.connectToServer()`,
`server.onMessage` forwarding verbatim and recording — **the first spec in this
suite to assert anything about a frame this product's own server produced.** And
the "deliberately wrong order" is the one the shipped producer is already handed:
`SECTORS.map(s => SECTOR_ETFS[s])`, **derived in the spec rather than written out**,
because `one-pairing-of-a-sector-and-its-benchmark` forbids a second pairing table.

| test                                                                  | claim                                                                                                                                            | where it runs                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| _the eleven on screen are a permutation of the frame the server sent_ | drawn order ≡ captured frame order; length, `Set` size and sorted-equality as **three separate failures** — a `Set` alone cannot see a duplicate | everywhere, **including CI's all-`unknown` store**   |
| _the frame's own order is the comparator's_                           | non-increasing at displayed precision; keyless a prefix-complement, never `?? 0`; ordinals `1…n`; **and not the order it was handed**            | **skips** where the server ranked < 2 — CI, for ever |

**The ranking key is read off the wire's two fields written out in the spec**, and
the display precision is `2` written out — importing `sectorRankingKey` or
`PERCENT_DISPLAY_DECIMALS` would assert that the application agrees with itself.

**The red, with `rankSectorFigures(encode(sectors))` → `encode(sectors)`:**

```
  ✓  1 › the eleven on screen are a permutation of the frame the server sent (1.3s)
  ✘  2 › the frame's own order is the comparator's: strongest first, keyless last (1.7s)
    Error: expect(received).toEqual(expected)
    -   1.07,  -   0.99,  -   0.89,  -   0.86,
    +   -0.18,
  1 failed, 1 passed (3.8s)
```

**An assertion failure with the file's other test still passing** — and test 1
correctly staying green is the design: **a permutation claim is not an order
claim.** Restored byte-identical, `md5 5e707795857061675ceda77eaa2a2c78` either
side. Registered as `the-producer-forgets-to-rank-the-sectors` with `build: true`.

**One hazard the break exists to neutralise, and it cost a diagnosis.** `pnpm e2e`
drives the dev pair, which serves `dist/`. The backend watch loop rebuilt on the
break and **did not rebuild on the restore** — leaving byte-identical source beside
a broken `dist/`, which reads exactly like a flake. **Four characterisation runs
were red for that reason.** The rule: **when breaking backend source, verify
`dist/`, not the source.**

**Characterisation: 4 × `--repeat-each=6` = 48 executions, 0 failures.**

### The state grid — 18 states × 4 widths × 3 renderings = 216 photographs

In `.capture/sector-states/`, with `readings-{1440,1024,768,390}.json` carrying each
state's region text, every row's text, the arrival-disc count and the neighbouring
`Market proxies` text. **Every row produced through the shipped socket path** —
gateway connect sequence, shipped encoder, subscribe answered as the gateway answers
it. The instrument was a throwaway spec, run and **deleted**.

**Direction, mechanically: 532 rows checked across every state, width and rendering;
0 lost.** Every figure-bearing row carries all three hue-independent channels — the
glyph, the word, the sign — plus the printed ordinal and the bar's side of zero.

**Compared as strings, 72 readings: no two different states read alike**, except
three that are **one state by decision** (`sectorPerformance`'s own docblock: _three
ways to reach it and they are one state on screen_) and one pair that is a defect.

### The producer walk found FIVE reachable states with no row

This is `docs/GAPS.md` entry 13's second half — the half that had never been run in
this repository until Story 4.2 ran it. It found five:

1. **A fund this bundle does not know** — reachable because the deploy rolls the
   backend first, so a bundle predating a twelfth sector meets a gateway that sends
   one. Renders the ticker twice and **no invented name**, which is correct — and
   **twelve rows**, which exceeds the eleven-row geometry the specs pin.
2. **A frame with sectors and no readable rung**, and **3. an empty sector
   section** — both named in the component's own docblock, in no grid.
3. **The rung is a state dimension nobody enumerated.** Four rungs, each a distinct
   reading. And the mid ticks vanish in `860 < width ≤ 1180`, so **the ladder is
   non-monotonic in viewport width** — the region is narrower at 1024 (595 px) than
   at 768 (720 px).
4. **A bar past the top rung.** `+14.20%` and `+11.60%` draw **identical-length
   bars**, which is the saturation the owner took at 4.3.4 — decided, documented,
   and never photographed until now.

### A region that stays silent for ever — found, and repaired

**Produced rather than reasoned about**: a socket answered with the gateway's connect
snapshot and **no overview frame ever**.

```
=== 06-first-paint-no-frame-ever        (≈600 ms)
   region : "Sector performance"
   proxies: "Market proxies"
=== 06b-no-frame-ever-past-the-floor    (12 s)
   region : "Sector performance"
   proxies: "Market proxies\n\nNo prices yet."
```

**Byte-identical at all four widths: the state never resolves.** `MarketProxyStrip`
has a floor and says so; the sector region had none and rendered a titled, empty
~440 px box on a phone, **indefinitely**. Two regions, one screen, one state — one
explained itself and one did not.

**Repaired, with the owner's decision: the proxy strip's own floor, reused rather
than a second one invented.** `useWaited(true)` at `SAY_NOTHING_ARRIVED_AFTER_MS`,
then `No sector moves yet.` — **not the strip's words**, because `No prices yet.` is
true of four figures that are each a price, and these eleven are **moves**, a
percentage against a close. The sentence sits in the room the reservation already
holds (`position: absolute` over the hatched rows), so **nothing moves when it
appears** — confirmed by the 12 sector specs, including _the region is the same
height with eleven figures and with none_, all passing.

The reservation's original argument — _a sentence here would be a promise the next
frame breaks_ — is right for the few-hundred-millisecond case and **says nothing
about the never case**, which is the one a reader actually meets.

### `verify` failed on `main`, so the flake was repaired rather than recorded again

**PR #506's merge failed `verify` and `deploy` was SKIPPED** — the known
`security-feed-degraded.spec.ts:141` flake, on its **fourth** sighting, now gating
releases rather than making noise. The baseline contained **`A newer answer is on
its way.`**, a bar-series request **the spec never served and had no reason to
name** — which is exactly why the previous repair (wait for the snapshot's price)
was insufficient: **it fixed the one surface somebody thought of.**

**Repaired at the class**: `settledText()` waits for `main`'s text to **stop
changing** — read it, read it again, accept it only when two consecutive reads
agree. Criterion 3 is **not narrowed**: the assertion is still `after === before`
over the whole of `main`.

**And the repair is reasoned rather than proven, which is stated plainly.** 24/24 on
the target test, six full-file runs of 54. Then the helper was **deliberately
broken** — first read instead of two agreeing — and **it also passed 24/24**. So the
break did not go red, and **this machine cannot tell the repair from a quiet
afternoon**: all four sightings were under load. What that proves is that the
condition does not occur on an idle machine, **not** that the repair is sound. It
was shipped because waiting for _change to stop_ **strictly dominates** waiting for
_one string to appear_ — it cannot admit a baseline the old code would have
rejected. **The proving ground is CI under load.**

The second known flake was repaired too: `security-gap-fill.spec.ts`'s sampling
budget was **15 s** (`60 × 250 ms`) against a refill that must survive a drop, a
reconnect and a served answer on a loaded machine — and **all 14 recorded failures
were the final assertion**, meaning the line never grew _within the window_. Raised
to 30 s with the per-test timeout lifted clear. **A healthy run costs nothing**,
because the loop breaks on the first changed frame. **Not a retry**: `retries: 0`
is argued in the config and stands.

### Two corrections to this story's own record

**Task 4.3.7's account of which widths clip is the inverse of the truth.** It says
`2026-09-25 close` fits _"only at 390"_; photographed, it renders in full at 1440,
1024 and 768 and **is clipped at 390** — because `grid-column: 4 / -1` borrows the
**bar column**, and at 390 there is no bar column to borrow. The record describes
the state **before** the repair and reads as the state after it. Corrected in place;
**the clip itself was accepted by the owner** rather than repaired, because the date
survives and every alternative costs something this story deliberately bought.

**And a third flake was found, inside `pnpm verify` rather than the browser suite** —
`market-gateway.process.test.ts`, 1 failure in 2 loaded full runs, **6/6 green in
isolation**. Not attributed to anything: the change in flight touches `e2e/specs/`
and `scripts/breaks.mjs`, and **a diff that cannot reach the file that failed is the
cheapest version of running the code-free commit**.

### Gates

```
$ pnpm verify    exit 0,  Unhandled Errors: 0
39 components, 39 stories files.
479 documents, 1661 cross-file links, 39 anchor links, 0 broken.
38 invariants hold.
shared 385 · backend 990 · frontend 1282 · process 41
$ pnpm e2e       182 passed, 15 skipped, exit 0   (settled machine, load 3.6)
$ pnpm e2e overview-sector    12 passed
```

**A red run reported rather than hidden**: the first `pnpm e2e` had **5 failures at
load average 15.24 on 8 cores** — the two characterised flakes plus three more, a
different set each time, which is this suite's documented contention signature.
Re-run at load 3.6: **0 failed.** Counted per execution; nothing attributed.

## For a stakeholder — a status report, 2026-10-07

**Story 4.3 is finished.** The landing page ranks eleven sectors, the order moves as
the market does and holds still while you read it, and the region is honest about
what it does not know.

This last task was the record and the proof, and it found four things.

**The tests that were supposed to protect the ranking could not see it.** All four
existing specs passed with the ranking deleted from the server — because each one
_supplied_ the order it then checked, which means they were checking their own
fixture. The new spec reads what this product's own server actually sends, and is
the first in the suite to do so.

**A region could stay blank for ever and say nothing.** Photographing every state
the screen can reach — eighteen of them, at four widths, in greyscale and simulated
colour-blindness — found a case where no data ever arrives and the sector region
shows an empty titled box indefinitely, while the region directly above it explains
itself after two seconds. Repaired by reusing the explanation the other region
already had.

**A test failure blocked a deployment**, which is the thing that must not happen.
The cause was a known flaky test on its fourth appearance, and it was repaired at
the general cause rather than recorded again — though **the repair is reasoned, not
proven**: the fault only appears on a busy machine, and deliberately breaking the
fix again on an idle one changed nothing. That honesty is the point; CI under load
is what will settle it.

**And one earlier record in this story was wrong** — it claimed a sentence was being
cut off at three screen sizes and fixed, when in fact it is cut off at the fourth
and the fix cannot reach there. Corrected, and the remaining clip accepted
deliberately: the date survives, which is the part that matters.
