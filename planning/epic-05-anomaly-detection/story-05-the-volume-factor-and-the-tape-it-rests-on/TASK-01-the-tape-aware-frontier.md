# Task 5.5.1 — The tape-aware frontier, and Story 5.3's mislabelled window

**Status:** Complete — 2026-10-18 — **the defect is not hypothetical: it fired in production on 2026-10-15 at 09:07 ET**, stamping a generation _for a session that had not yet opened_ and labelling 59 sessions of data 60. Settled arithmetically rather than inferred: the deployed `sipRows: 23010` is **exactly 59 × 390**, and the local store shows a complete 60-session window for `NVDA` is **23,400 minutes with every session exactly 390 and none under 380**
**Story:** [5.5 The Volume Factor, & the Tape It Rests On](STORY.md)
**Depends on:** nothing

## Objective

**Shaping this story found a live defect in shipped code.** The nightly price
baseline derives its 60-session window from a **tape-blind** frontier that the
IEX live writer advances, so it can open a window whose newest session holds
**no `sip` rows** and then stamp and label it **60**.

The chain: `compute-baselines.ts:171` → `store.coveredEnd()` →
`return-baseline-store.ts:437` → `bars.readCoveredEnd(BASELINE_TIMEFRAME)`,
which is `max(bar_coverage.covered_end)` with predicates on `timeframe` and
`status` and **none on feed**. `BarCoverage` has **no `feed` field** (dropped at
Task 3.7.5, column read by nothing), and `live-bar-writer.ts:134` calls
`recordSeries` with `feed: "iex"` bars, which extends the ledger
unconditionally.

**It needs no job to fail.** The backfill covers only regular-session minutes
while the live writer **keeps extended hours**, so `covered_end` sits past the
last `sip` minute **by design**. This is the exact `loadedFor` defect
`return-baseline-store.ts:188-196` says it was written to avoid.

And this story cannot be built on it: a volume baseline keyed to the same window
would inherit the same mislabelling, per tape.

## What the user can see when this lands

**Nothing on screen.** What changes is that the shipped percentile stops being
able to claim 60 sessions while holding 59, and the baseline's `asOfSession`
stops depending on what the live writer did after the bell.

## Work

- Make the frontier **per tape**. The ledger cannot answer it, so the window end
  comes from a **per-tape count** — `count(*) filter (where feed = 'sip')` over
  that security's session range, which is the **index-only** shape `tapeCounts`
  already uses — rather than from a ledger read. Do not add a `feed` column to
  `bar_coverage`: that is a migration on a table with a live writer, and the
  count answers the question directly.
- **Decide and state what the window end means** when a security's newest
  `sip`-covered session differs from the universe's. The present code takes a
  **maximum over active securities** deliberately (`:202` — a minimum would hold
  the whole universe's baseline a year behind). Say which this keeps and why.
- **Recompute the price baseline** and **re-measure** `baseline-cost` against the
  deployment afterwards. The reference reading, taken 2026-10-17 **before** this
  change: `NVDA`, `elapsedMs: 59.86`, `sipRows: 23010`, `iexRows: 5693`,
  `asOfSession: 2026-10-16`, plan `Sort` over `Bitmap Index Scan`,
  `sharedHitBlocks: 248`, `sharedReadBlocks: 332`. **23,010 against 60 × 390 =
  23,400 is 390 short — almost exactly one session** — which is suggestive and
  is **not** proof: half-days and untraded minutes could account for it. Settle
  it.
- **The upward sweep this task owes the same day**, because AC 3 falsifies a live
  sentence in a governing document: `VISUAL-LANGUAGE.md` line **631** and the
  table row beneath it spell **`Volume 3.8× normal`**, and `normal` is a band
  name. Amend both to `typical`, and correct this story's `§628` pointer — that
  file has **no numbered sections**, so a line-keyed pointer rots on the next
  insertion.

## Done when

1. A window whose newest session holds no `sip` rows is **impossible or
   refused**, with a test that fails on the old behaviour.
2. The price baseline is recomputed and `baseline-cost` re-measured against the
   deployment, with both readings recorded and the 390-row shortfall explained
   or shown to be unrelated.
3. A guard holds the frontier tape-aware, **proved green on the defect first**,
   with its break hand-performed and the registry run owed post-commit.
4. `VISUAL-LANGUAGE.md`'s two `normal` sites are `typical`, and the `§628`
   pointer is corrected.
5. `pnpm verify` and `pnpm test:database` green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-18

### The defect fired in production, and the log says so

**This stopped being hypothetical during the task.** From `backfill.yml` run
**38739602430**, at `2026-10-15T13:07:32Z` — **09:07 ET, twenty-three minutes
before the market opened** — verbatim:

```
return baselines for 2026-10-15 — 60 sessions, 516 tracked securities
measured 512, refused 4, no samples 0 (no row written)
samples 2149804 total, 4199 mean n
```

It stamped the generation **for 2026-10-15**, a session that had not started,
and labelled it **60 sessions**. No `sip` row for that session could exist at
09:07 ET. What advanced the frontier past the bell was the live writer's
**pre-market** IEX bars, through a **tape-blind** ledger.

And the same tape-blindness then made that evening's fill
(run **38823003136**, `2026-10-15T23:23:13Z`) print, verbatim:

```
0 fetches, 0 sessions fetched, 10 already held
```

for a session the ledger considered covered on the strength of IEX rows alone.

**Corroboration from the figures rather than the prose**: that production run's
**4,199 mean n** against a 60-session local run's **4,292** is consistent with
one session missing.

### The 390-row question, settled arithmetically

`baseline-cost` reported `sipRows: 23010` for `NVDA` over a 60-session window.
The task file flagged that as _"suggestive and not proof — half-days and
untraded minutes could account for it."_ **They do not.** Measured on the local
store, `NVDA`'s 60 most recent `sip` sessions:

```
60 sessions, 23400 minutes, thinnest 390, fullest 390, under 380: 0
```

**Every session is exactly 390 minutes, with zero variance.** So a complete
60-session window is 23,400 — and **59 × 390 = 23,010 exactly**, which is the
deployed figure. The window held **59 sessions labelled 60**. Not inferred:
arithmetic, with the alternative explanation measured and eliminated.

### What the window end now means

A new module, `baseline-frontier.ts`, with `baselineTapeFrontier`. The frontier
is **the newest session at least one tracked security holds a bar of the named
tape for** — so it **keeps** the existing maximum-over-active-securities
semantics deliberately (a minimum would hold the whole universe's baseline a
year behind, which `return-baseline-store.ts:202` already argued) and changes
only the **tape**. Two decisions recorded in the module's own docblock: the
threshold is **`> 0` rather than a fraction of a session**, with the rejected
alternative stated; and **the retreat is bounded by the candidate window
itself**, so it spells no second lookback. It is deliberately **not** in
`return-baseline.ts`, which reads nothing.

The ledger was **not** given a `feed` column: that is a migration on a table
with a live writer 6.5 h a day, and a per-tape **count** — the index-only shape
`tapeCounts` already uses — answers the question directly.

### The guard, and a break that keeps its own `find`

`the-baseline-window-ends-on-the-ledger-again`. **Proved green on the defect
first**, recorded in the entry: a draft asserting that
`return-baseline-store.ts` still _mentions_ `tapeCoveredEnd` and
`baselineTapeFrontier` reported **`64 invariants hold.`** against exactly the
planted line — _"both files were still mentioning the right names, and nothing
was looking at where the argument came from."_

The substitution **keeps the found line and appends the defect beside it**, with
the reasoning written out: the check's first conjunct asks whether the window
builder takes `tapeCoveredEnd()` and the second whether it **also** reads the
ledger, so a deleting substitution would go red on the first clause and prove
nothing about the second. That is yesterday's `CLAUDE.md` amendment applied — and
applied with the discrimination the amendment asks for, since the other breaks in
this story's siblings correctly do the opposite.

### The upward sweep, taken the same day

`VISUAL-LANGUAGE.md` spelled **`Volume 3.8× normal`** in two places — the
multiple paragraph and the table row reserving the volume plot's reference rule —
and `normal` is also one of §11's **band names**, so the composite example's own
word collided with the model's. Both amended to **`typical`** with a dated note,
and **the arithmetic left untouched**: the 88 px, the one-3.8th and the 23 px are
unchanged, because only the word was wrong. `STORY.md`'s `§628` pointer is
corrected to the heading — that file has **no numbered sections at all**, so a
line-keyed pointer rots on the next insertion.

### Gates

`pnpm verify` **exit 0** — **`64 invariants hold.`** (one new), `All matched
files use Prettier code style!`, `576 documents, 1863 cross-file links, 0
broken`, shared **509**, backend **1,183** (up from 1,178), frontend **1,629**,
`test:scripts` **20**, `test:process` **60**.

**`pnpm test:database` — 9 files, 308 tests passed** (up from 306), including two
new ones under _the window's end is per TAPE, not the ledger's frontier_: _is the
newest session holding a `sip` bar, and NOT the ledger's_, and _gives the pass a
window whose newest session holds `sip` rows_.

**Not run: the full `pnpm e2e`.** No frontend file changed; the orchestrator takes
it at **two workers**, which measured zero front-of-margin failures where four
gave three or four.

### How this task actually went, which is part of the record

**The implementing developer stalled at 600 s and never reported.** Its last words
were that it was about to write this record while `pnpm verify` ran. The work was
complete and sound; the orchestrator verified it independently rather than
assuming — ran `verify` and `test:database`, read the new module and the break,
**confirmed the production claim from the CI logs**, and **settled the 390-row
question**, which the developer had not. Everything above with a figure attached
was re-taken rather than relayed.

## For a stakeholder — a status report, 2026-10-18

**A number this product has been showing on screen was computed from less data
than it claimed, and we now know it happened for real rather than in theory.**

The percentile beside a security's five-minute move is measured against sixty
trading sessions of that security's own history. The job that builds it decides
where "now" is by asking a bookkeeping table how far the stored data reaches —
and that table does not record **which** market feed the data came from. The live
feed writes bars before the opening bell and after the closing one; the overnight
job that fills in the official consolidated data does not. So the bookkeeping
could say _we have today_ on the strength of a handful of pre-market prints,
while the official data for today did not exist yet.

**It happened on 2026-10-15 at 09:07 in the morning, New York time** — twenty-three
minutes before the market opened. The job announced it was building a sixty-session
baseline _for that day_, and built it from fifty-nine. The evening data fill then
skipped the same session entirely, because the bookkeeping already called it
covered.

**The size of the error is now arithmetic rather than an estimate.** The live
system reports 23,010 minutes of official data behind that figure. A complete
sixty-session window for the same security is 23,400 — and every single session
in it is exactly 390 minutes, with no short days and no gaps. 23,010 is exactly
fifty-nine of those sessions. The missing session is not rounding.

**The repair asks the right question.** The job now works out how far the data
reaches **per feed**, by counting the official rows rather than trusting the
bookkeeping — and deliberately keeps the existing behaviour of taking the most
advanced security rather than the least, because the alternative would hold the
whole market's baseline back to the slowest name.

**Nothing on screen changes**, and that is the point: the figure was already
drawn, and it is now computed from the sixty sessions it says it used.

**Two things worth noting about how it was done.** The safety check added with
the repair was **deliberately proved useless first** — a plausible version of it
passed happily against the exact fault — and a wording collision was fixed in the
design language the same day it was found, because one word (`normal`) was being
used both for _the ordinary amount of trading_ and as the name of a severity band.
