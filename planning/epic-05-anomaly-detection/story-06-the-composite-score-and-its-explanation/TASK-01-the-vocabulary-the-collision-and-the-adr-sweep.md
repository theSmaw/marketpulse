# Task 5.6.1 — The vocabulary, the collision, and the ADR sweep

**Status:** **Complete — 2026-10-21** — `band` named **five** things, not four; the rename was **203** identifiers, not my 121; and **two break entries whose substitution deleted its own `find`** were found and repaired — `CLAUDE.md`'s own 2026-10-16 amendment, met twice in one session on neighbouring entries.
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** nothing

## Objective

**Three things must be true before a line of the composite is written, and all
three were found by Phase 1 rather than being in the story.**

1. **`band` names four things in shipped code** and the one that collides is the
   region the chip goes in: `ReturnBand` / `VolumeBand` use _band_ for a
   **horizontal row** of `Abnormal-move indicators`. A chip there produces
   literally `band.band`, or a local `const band = fiveMinuteReturnBand(...)`
   shadowing `AnomalyBadge`'s `band` prop in one file.
2. **`anomaly.ts`'s own reversal trigger has already fired, undetected.** It
   reads: _"the first surface that needs to say **high** about something other
   than an anomaly score on the same screen."_ `return-percentile.ts:244` ships
   `"the fattest-tailed bucket — pooled, this reads high"` — in the chip's own
   region, since 2026-10-14. It is latent only because no chip is drawn. **This
   story is the change that makes it render.**
3. **ADR 0045's test refuses a figure this product ships everywhere.** Its
   taxonomy is _ratio **within** one tape_ (permitted) against _level **across**
   tapes_ (refused). `changeFromClose` is a **ratio across tapes** — ADR 0038's
   decision 4: _"an IEX numerator and a consolidated-SIP denominator"_ — which is
   in neither category, and it ships on every proxy, sector and mover on `/`.

Skipping this task means a 121-site mechanical rename landing in the same diff as
a new region, which is a diff nobody can review.

## What the user can see when this lands

**Nothing — except one sentence changing.** The opening-bias clause stops saying
`this reads high`. Task 5.6.4 is the task that pays this off.

## Work

- **Rename, in its own commit.** `ReturnBand` → `ReturnIndicator`, `VolumeBand` →
  `VolumeIndicator`, `fiveMinuteReturnBand` → `fiveMinuteReturnIndicator`,
  `volumeRatioBand` → `volumeRatioIndicator`, CSS `.band`/`.secondBand` →
  `.indicator`/`.secondIndicator`, local `band` → `indicator`. **121 identifier
  occurrences across 7 files**, plus ~139 prose occurrences that are a
  read-and-reword rather than a substitution.
  - **`indicator` rather than `IndicatorRow`**, correcting the hand-off's own
    recommendation: `*Row` is a taken family (`SectorRow`, `SecurityRow`,
    `MoverRow`, `WireUnusualRow`) meaning _one entry of a ranked list_, and these
    rows carry no rank. The product already ships the right noun — the region is
    **`Abnormal-move indicators`**.
  - **`band` is then reserved product-wide for `AnomalyBand`** in TypeScript
    identifiers and on the wire. The two CSS-module senses (`BreadthLedger`'s
    magnitude bar, `UniverseTable`'s grouping strip) are module-scoped, are not
    reachable from the composite, and are left standing **with that noted**.
- **Two `pnpm break` registry entries rot on this rename** and nothing in
  `pnpm verify` says so until `every-break-can-still-land` goes red:
  `scripts/breaks.mjs:5007` (`find: "{band.percentile}</span>"`) and `:5390`
  (`find: "<span className={cx(styles.multiple)}>{band.multiple}</span>"`). Both
  key on the **local parameter name**. Edit both and **run both breaks** in the
  same change.
- **Repair the `high` collision**, and evaluate `anomaly.ts`'s trigger **in
  writing** — an unevaluated trigger and one that did not fire read identically.
  The clause's job is to say _the open over-represents this bucket_, which needs
  no intensity adjective: `· opening 30 minutes — the fattest-tailed bucket,
pooled` is 54 characters against the measured 58-character budget at 308 px.
  Keep the band word; reword the clause.
- **ADR 0045 gets a dated amendment**, decision untouched: restate the test as
  **extensive versus intensive** — _does the quantity scale with the tape's share
  of the market?_ Volume, share counts and trade counts do; a price does not.
  0045's own identity is the evidence (`0.0353982 × 0.776074 = 0.0274716`, _"the
  bias factors exactly into venue share × coverage"_), which factorises for an
  extensive quantity and is meaningless for an intensive one. Name price as the
  intensive case the current wording accidentally refuses.
  - **And carry the composite's conditional permission in the same amendment**:
    tape-invariance survives **only** because each factor is a percentile of its
    own same-tape history. An invented curve — a log cap, a sigmoid, a knee — is
    calibrated in one tape's units, so the mapped factor stops being scale-free.
    A knee at `3× typical` means a different thing at 3.54% venue share than at
    15.19%. **So the story's _no invented constant_ rule and 0045's invariance
    test are the same argument arriving from two directions.**
- **`PRODUCT_SPEC.md` §11 and the exit criterion**, dated amendments, never
  rewrites. §11's example `Extreme 5-minute price move` uses a **band name as an
  intensity adjective**, which AC 7 forbids in terms, and `Move substantially
exceeds related securities` carries an intensity adverb with no figure.
  `Underperforming semiconductor peers` is the **exit criterion's** wording, not
  §11's — and **Story 5.7's `STORY.md` already nominates `Move substantially
exceeds related securities` as "the one to keep", which AC 7 contradicts.**
  That contradiction is a sideways hand-off this task owes 5.7, in words 5.7 can
  act on.

## Done when

1. ~~`band` resolves to `AnomalyBand` alone in every TypeScript identifier and on
   the wire; the two CSS senses are noted as not reclaimable.~~ **Amended at
   completion, because the criterion was imprecise and the code was right.**
   `band` names **five** things, not four, and the fifth is a **magnitude bar**:
   `chart-tokens.stories.tsx` declares its own story-local `VolumeBand`, a
   volume specimen strip, unrelated to `volume-ratio.ts` and importing nothing
   from it. That is the same sense as `BreadthLedger`'s `.band` and
   `UniverseTable`'s `.groupBand`, it is correct English, and it is correct in
   this product. **Renaming a correct use of a word to satisfy a rule written
   imprecisely is worse than fixing the rule**, so the criterion becomes: `band`
   is reserved for `AnomalyBand` in every **wire-crossing** identifier and every
   **region-row** identifier, and the **magnitude-bar** sense survives in three
   module-scoped places with that recorded.
2. Both rotted break entries are edited and **both breaks run and go red**.
3. No shipped sentence uses a band word as an ordinary adjective;
   `anomaly.ts`'s trigger is evaluated in writing.
4. ADR 0045 carries the extensive/intensive amendment **and** the composite's
   conditional permission.
5. §11, the exit criterion and Story 5.7's `STORY.md` are swept.
6. `pnpm verify` green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-21

### The rename — and my own figures were wrong in both directions

|                                   | my Gate 1 estimate | measured |
| --------------------------------- | ------------------ | -------- |
| identifier occurrences            | 121                | **203**  |
| prose occurrences                 | ~139               | **105**  |
| total band-family tokens, 9 files | —                  | **308**  |
| renamed                           | —                  | **300**  |
| deliberately kept                 | —                  | **8**    |

**The identifier figure is 1.7× my estimate**, almost all of it in
`five-minute-return.test.ts`, which alone holds **115** — one `const band =
fiveMinuteReturnBand(...)` plus roughly eighty `expect(band.x)` reads. Prose was
_lower_ than I guessed. The lesson is this repository's own, arriving on me:
**quote a count with the command that produced it, and expect the next reader's
grep to disagree.** My 121 came from a `grep -rl` over a file list I had
assembled by hand, which is the weaker instrument.

**`band` names FIVE things in shipped code, not the four Gate 1 recorded.** The
fifth is `chart-tokens.stories.tsx`' own story-local `VolumeBand` — a volume
magnitude specimen strip, importing nothing from `market/`. The developer left
it, correctly, and flagged that my `Done when` 1 was therefore not literally
satisfied. **The criterion was amended rather than the code**: that sense is a
magnitude bar, the same as `BreadthLedger`'s, and it is right.

`ReturnBand` → `ReturnIndicator`, `VolumeBand` → `VolumeIndicator`,
`fiveMinuteReturnBand` → `fiveMinuteReturnIndicator`, `volumeRatioBand` →
`volumeRatioIndicator`, `.band`/`.secondBand` → `.indicator`/`.secondIndicator`,
and two **local components** in `AbnormalMove.tsx` my brief had not named
(`Band` → `Indicator`, `VolumeBand` → `VolumeIndicator`).

**`indicator` rather than the hand-off's `IndicatorRow`**, and the reason held
up: `*Row` is a taken family — `SectorRow`, `SecurityRow`, `MoverRow`,
`WireUnusualRow` — all meaning _one entry of a ranked list_, and these rows
carry no rank. The product already shipped the right noun in the region's own
title.

**The 8 kept are each an anomaly classification rather than a row**, every one
verified by reading its surrounding argument — including two that name this very
story (`AbnormalMove.tsx`'s live-region reversal trigger, _"Story 5.6's band word
is the candidate"_) and one reached only through prose (`market/index.ts:280`'s
_"a fraction per band"_, which is `BreadthLedger`'s magnitude bar).

**The mechanical pass produced two defects a substitution cannot avoid**, which
is the whole argument for the read-and-reword instruction: `a band` → `a
indicator` twice, and `"one metric figure a band"` — meaning _per band_ —
became `"one metric figure an indicator"`, which is nonsense. Both repaired by
hand, and ~20 comment paragraphs re-wrapped because Prettier does not reflow
comments.

**One leftover outside the brief's scope, fixed:** `check-invariants.mjs:7691`
and `:7747` described the renamed row as _"the band"_ **inside an invariant's
failure message** — the sentence a developer reads when that check fires.

### Two break entries whose substitution deleted its own `find` — the same defect, twice, on neighbouring entries

**This is `CLAUDE.md`'s own 2026-10-16 amendment arriving on the registry it was
written about**, and I wrote that amendment five days ago.

**`a-second-speller-for-the-ordinal` red TWICE on the first run**, from neither
the check nor the plant:

```
  ✗ every-break-can-still-land
    a-second-speller-for-the-ordinal: its `find` matches 0 times in
    apps/frontend/src/components/AbnormalMove/AbnormalMove.tsx, not once
  ✗ one-home-for-the-ordinal-suffix
    1 shipped file(s) besides apps/frontend/src/market/return-percentile.ts
    spell an ordinal suffix:
      apps/frontend/src/components/AbnormalMove/AbnormalMove.tsx
2 of 66 invariants failed.
```

**Pre-existing, not caused by the rename** — and its own sibling twelve hundred
lines away carries a comment saying _"The `find` text survives the substitution,
which is this registry's convention."_ The convention was written down and the
entry did not follow it. Repaired so the plant is a **second** speller beside the
correct one, which is also the truer defect: a reader adding the short form does
not delete the long one. After repair, **one** red, from the clause under test,
with 65 others still collected:

```
  ✗ one-home-for-the-ordinal-suffix
    1 shipped file(s) besides apps/frontend/src/market/return-percentile.ts spell an ordinal suffix:
      apps/frontend/src/components/AbnormalMove/AbnormalMove.tsx
1 of 66 invariants failed.
```

**`the-opening-bias-asked-the-wall-clock` has the identical defect** — it
replaced `const state = marketSessionStateAt(from);` wholesale — and the
developer correctly reported it as out of the scope I gave rather than fixing it
silently. **I repaired it**: the substitution now **appends** the clock read
beside the kept line, so the `find` survives its own break, and the plant is
truer for the same reason as above — a developer adding _"and is it the open
now?"_ writes a second reader rather than deleting the first. Its own comment now
records the repair and the date.

**`a-second-multiple-glyph`**, for completeness:

```
  ✗ one-home-for-the-multiple-glyph
    2 shipped files draw a ×, expected exactly 1:
      apps/frontend/src/components/AbnormalMove/AbnormalMove.tsx
      apps/frontend/src/market/volume-ratio.ts
1 of 66 invariants failed.
```

**And a trap worth keeping: Prettier reflows a `find` string.**
`{indicator.percentile}` pushed its span to 81 columns, so Prettier split it
across three lines and the registry's `find` had to become the three-line form.
**Editing the registry before formatting would have rotted the entry a second
time inside one change.**

### The `high` collision, and `anomaly.ts`'s trigger evaluated in writing

`return-percentile.ts` now reads:

```js
`${of} · opening ${String(OPENING_BIAS_MINUTES)} minutes — ` +
  "the fattest-tailed bucket, pooled";
```

**My character count was wrong too: the rendered clause is 56, not the 54 I
briefed** — measured with `node -e`, not counted by eye. Still inside the 58
budget at 308 px, but the margin is **2 characters, not 4**, and a later story
adding a word to this clause has almost nothing to spend.

**`anomaly.ts`'s reversal trigger — evaluated, and the verdict is that it FIRED
on 2026-10-14 and nobody noticed.** Its text: _"the first surface that needs to
say **high** about something other than an anomaly score on the same screen, at
which point the collision has moved rather than gone."_ Task 5.3.4 shipped that
surface. It was latent only because no chip is drawn, which is exactly the
condition that makes a fired trigger invisible — **the collision needs two
things on screen and the story that ships the second one is the one that
notices.** The repair keeps the band word and deletes the adjective, so the
trigger's own conclusion — _the collision has moved rather than gone_ — did not
have to be acted on.

**The band-word sweep found nothing else**: 52 rendered string and template
literals read individually across three trees, comments stripped. `high` survives
only in the **OHLC** sense (`Open X, high Y, low Z`, `The highest price on it
is…`, `5D High`) — a bar's field name, not an intensity claim, and none of it in
this region. `unusual` survives only as the region name and as the **dimension**
(`How unusual this security's behaviour is`), which is the wording `anomaly.ts`
argues _for_: `unusual` was retired as a band name precisely so the region could
keep it. `elevated` and `extreme` appear in no rendered string at all.

### The document sweep — five dated amendments, no rewrites

- **ADR 0045's test restated as EXTENSIVE versus INTENSIVE**, decision untouched.
  The gap: its taxonomy offers _ratio within_ and _level across_ and names _a
  percentage change_ as the first — but `changeFromClose` has an **`iex`
  numerator and a `sip` denominator** (ADR 0038 decision 4), so it is a **ratio
  ACROSS tapes**, in neither category, and the literal reading refuses every
  figure on `/` since Epic 4. **The ADR's own arithmetic is the evidence**:
  `0.0353982 × 0.776074 = 0.0274716` factorises only for an extensive quantity,
  so for a price the identity is not small but **meaningless**.
- **And the composite's permission is conditional**, recorded in the same
  amendment: the sum is tape-safe **only** because each factor is a percentile of
  its own same-tape history, which quotients the tape out. An invented curve is
  calibrated in one tape's units, so **a knee at `3× typical` means a different
  thing at 3.54% venue share than at 15.19%** — and the measured spread is
  exactly that wide. **The story's _no invented constant_ rule and 0045's
  invariance test are the same argument from two directions**, which makes
  _interpretable_ a correctness constraint rather than a taste. Corollary:
  the volume factor is scored as a **percentile**, never the multiple.
- **`PRODUCT_SPEC.md` §11** — **three of four** example lines differ from what
  ships, each because the shipped version states a **figure** where the example
  stated a **word**.
- **The exit criterion**, at `EPICS.md` and the epic's own file: the `Extreme`
  collision noted in place, following Story 5.5's precedent, **leaving the
  rewrite-as-a-shape to Story 5.7, which owns it.**
- **Story 5.7's keeper claim refined rather than contradicted.** 5.7 is **right**
  that `exceeds` is the measurement word and the keeper; AC 7 forbids the
  **adverb**. Recorded as a refinement of a correct judgement.
- **`docs/GAPS.md`'s opening-bias entry**, whose named owner was _"the first
  story that re-opens the bias clause, or Story 5.6 when it scores this
  factor"_ — **both halves fired at once.** The repair **deletes the verdict
  rather than measuring it**, so the risk the entry described is discharged (a
  stated fact with no verdict cannot be an understatement) while the measurement
  stays owed. **Not taken**, and why: a dev server and a `verify` were running,
  and starting a second heavy job on a shared store is the thing this repository
  made mechanical. Re-owned by a **condition**, because both stories it named
  have now passed and a story number would never fire again.

### Gates

| Gate                 | Result                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm verify`        | **exit 0**, `66 invariants hold.`, 515 + 1246 + 1651 + 60, `test:scripts` fail 0, formatting clean, **no `Unhandled Errors` block**. Load average **4.14** before the run and **4.59** before the final one — both read **before**, never during |
| `pnpm invariants`    | `66 invariants hold.` with the tree clean; `every-break-can-still-land` green                                                                                                                                                                    |
| `pnpm break` ×3      | each red **for the right reason**, output quoted above, tree restored byte-identical                                                                                                                                                             |
| `pnpm links`         | 582 documents, 1884 cross-file links, 0 broken                                                                                                                                                                                                   |
| `pnpm e2e`           | **not run, and deliberately**: no e2e spec references any renamed identifier or the reworded clause — verified by grep before the task started, so the browser suite has **zero blast radius** here                                              |
| `pnpm test:database` | not run — no data-layer change                                                                                                                                                                                                                   |

`market-gateway.process.test.ts` passed first time, 60/60.

## For a stakeholder — a status report, 2026-10-21

Housekeeping that had to happen before the composite score could be built, and it
turned up more than it was sent for.

**What it was.** One word — `band` — meant five different things in the code, and
one of those meanings was about to collide with the new score's own vocabulary in
the very same box on screen. The word is now reserved for the score's four named
levels, and the rows it used to name are called indicators, which is what the
product already called them on screen.

**The thing worth telling you.** A sentence has been shipping since 14 October
that says a figure _"reads high"_ — in the box where the new score's `high` label
is about to appear. The code carried a written warning that this exact collision
would happen, with a condition for spotting it, and **the condition had already
been met without anybody noticing**, because a collision needs two things on
screen and only one had shipped. The sentence now states the fact without the
verdict, which also quietly resolved a separate open item: we never measured how
much higher it reads, and now nothing on screen depends on the answer.

**Two safety nets were themselves broken.** This project deliberately keeps a set
of self-tests that break the code on purpose to prove its checks work. Two of
them were sabotaging themselves — they broke the code in a way that also removed
the thing they were looking for, so running them produced two failures from
neither the check nor the fault, which reads exactly like a thorough result. Both
are repaired. The irony is on the record: the rule describing this trap was
written into the project's own guidance five days ago.

**Three of my own figures were wrong and are corrected rather than quietly
fixed**: the rename was 203 places, not the 121 I estimated; the new sentence is
56 characters, not 54; and one of the five meanings of `band` turned out to be
correct English that I had written a rule against. The rule was changed, not the
code.

**Where it leaves the work.** The vocabulary is clear, the governing documents
agree with each other, and the next task can build the score's second factor
without tripping over any of it.
