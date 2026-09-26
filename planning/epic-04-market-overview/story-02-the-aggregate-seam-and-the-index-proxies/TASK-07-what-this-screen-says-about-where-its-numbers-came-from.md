# Task 4.2.7 — What this screen says about where its numbers came from

**Status:** **Complete — 2026-09-26.** The landing page has one source note, at the foot of the region group, sized for four readers so 4.3–4.5 do not each grow one. **The premise this task was briefed on was half wrong**: `All US exchanges` was never unguarded — `one-home-for-the-feed-words` had walked all three trees since it was written and caught the planted defect on the first run. The repair with a consequence is **`No shares changed hands`**, where a five-path array was the whole fence.
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.6

## Objective

**Acceptance criterion 5 is currently guarded by a check that is structurally
unable to see the file criterion 5 is about.** Verified rather than suspected:
`the-consolidated-word-has-one-producer` in `scripts/check-invariants.mjs` is a
**seven-path hard-coded array**, not a directory walk, and so is its neighbour
for `No shares changed hands`. A new component spelling `All US exchanges` is
not in either list, and both checks stay green. That is this repository's named
recurring defect — a claim about a mechanism reads identically whether the
mechanism covers the new case or not.

**And the screen has no provenance surface at all.** The security page answers
this with one source note at the foot of the region group; the landing page has
nothing, and criterion 5 invites building one. Getting the grain wrong now means
four regions each growing their own note by 4.5 — which is exactly the footnote
pile `PROVENANCE.md` §1.3's one-note-per-screen rule exists to prevent, and
exactly the duplicate Task 3.10.9 found and deleted in `BarSeriesPanel`.

## What the user can see when this lands

**One line at the foot of the landing page** saying what the figures above it
came from — the feed behind the live ones in the product's own words, the tape
behind the stored ones, and when they were retrieved. It says less today than it
will after 4.4, because each clause renders only when its own data is present.

## Work

- **One source note for the screen**, at the foot of the region group, after the
  last region and before `AppFooter` — the position the Security Explorer
  already uses, last in reading order because it qualifies everything above it.
  **Not one per region, and not one inside the proxies.**
- **Sized for four readers now.** `PROVENANCE.md`'s clause rule (ADR 0029) means
  it **grows** as 4.3–4.5 land rather than being rewritten, so building it here
  is what stops three later stories each adding one.
- **What it owns:** the feed behind the live figures, in
  `MARKET_FEED_DESCRIPTIONS`' own words and subject to §1.3's suppression rule
  (**suppression requires a positive match** — it speaks unless the chrome is
  naming this exact feed correctly); the tape behind the stored closes, which is
  a **different** provenance and is the whole of invariant 6 on this screen; and
  the retrieval instant.
- **What it must not own: which of the two tapes a particular tile is showing.**
  `SPY` can be a live IEX observation while `DIA` is yesterday's consolidated
  close, in the same strip, at the same moment — the ordinary state of IEX. A
  screen-level note cannot state that and a region-level note only pushes it
  down a level. It belongs per figure, and 4.2.4 already put the discriminant on
  the wire for it.
- **The invariant repair, which the owner added to scope at Gate 1.** Replace
  both hard-coded file arrays with a directory walk (`sourceFilesUnder`) plus
  the shared files. **The existing breaks stay valid** and must be re-run — this
  is a repair rather than a third spelling of an existing rule, which is the
  answer to "can this be folded in rather than added".
- **A new invariant is not needed for criterion 5 once the repair lands**, and
  saying so in the task is part of the deliverable — the cheapest way to satisfy
  a criterion should not be a fourth check.
- **One guard that is worth adding**: this route renders at most one provenance
  note, in the shape of `one-caller-of-the-market-clock`.
  `one-home-for-the-feed-words` stops a second renderer spelling the labels but
  would not catch a second note assembled from shared vocabulary.
- **A dated amendment to `PROVENANCE.md` §1.3.** Its reversal trigger is _"the
  first screen that shows two securities' series at once"_, named against Epic 8. This screen shows four securities' **figures** at once — the trigger does
  not fire on its letter, but its substance (one note cannot speak for figures
  whose provenance differs) is live here first, two epics early.

## Done when

1. One source note exists on the landing route, and a second one fails a check
2. Both hard-coded invariant file lists are directory walks, and both of their
   existing breaks have been re-run red
3. A new component spelling `All US exchanges` fails `pnpm invariants` — proved
   with a break, because that is the case the old lists could not see
4. The note's clauses each render only when their own data is present, shown on
   a store with no live figures
5. `PROVENANCE.md` §1.3 carries the dated amendment

## Amended by Task 4.2.4 — 2026-09-26: the wire can name one tape and not the other, and this task is where that is resolved

**The frame carries `feeds: readonly MarketFeed[]`, and it describes the
OBSERVED figures only.** On the deployed gateway during a session it is
`["iex"]`; on any deployment with no provider it is `[]`. **It is never
`["sip"]`**, because a stored close's tape deliberately does not appear in it.

**So the wire can say _these figures are IEX_ and cannot say _and the
denominators are consolidated_** — which is the whole of invariant 6 on this
screen, and it is this task's to resolve rather than the frame's.

**Do not add a second field to the wire for it.** The resolution is already the
shape this task was written to: the screen's **one source note** states both
tapes — the feed behind the live figures in `MARKET_FEED_DESCRIPTIONS`' own
words, and the consolidated tape behind the stored closes — while each tile
says only **which of the two it is**, through the `observed` / `stored`
discriminant the frame already carries and the session date a stored figure
already renders. The note speaks for the screen; the discriminant speaks for
the figure; neither repeats the other.

**The trap this avoids is measured rather than theoretical.** A change
percentage on this screen has an **IEX numerator and a consolidated-SIP
denominator**. That is already true of the universe table and is not new — but
this is the first surface to compute it centrally, and a frame that named one
tape beside a figure derived from two would be the "displayed, never implied"
clause failing in the direction that looks most correct.

---

## What was done — 2026-09-26

### One note, for the screen

`OverviewSourceNote`, rendered once after `.regions` and before `AppFooter`.
Its text in every state, produced rather than imagined:

| state                                                  | note                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| no provider, four stored closes (**the running pair**) | `CLOSING PRICES  All US exchanges` · `COMPUTED  2026-09-26 02:46 EDT`                                             |
| session, chrome naming `IEX`                           | `CLOSING PRICES  All US exchanges  Every change above is measured from one of these.` · `COMPUTED …`              |
| session, chrome `NOT CONFIGURED`                       | `OBSERVED PRICES  IEX  Trades reported by the IEX exchange only — not the full US consolidated tape.` + both rows |
| session, chrome naming the **wrong** feed              | speaks — suppression requires a positive match                                                                    |
| session, chrome `checking`                             | feed clause suppressed; the other rows stand                                                                      |
| two observed tapes                                     | `OBSERVED PRICES  All US exchanges  IEX  Trades reported by…`                                                     |
| all figures `unknown` (**CI's state**)                 | nothing rendered                                                                                                  |
| no frame                                               | nothing rendered                                                                                                  |

**A connection claim was caught by a unit test before it shipped.** The term was
`Live prices` — and `LIVE PRICES` in the micro-label's capitals is a
**connection** claim on the screen whose status bar owns `LIVE` and
`DISCONNECTED`. It would have kept saying it while the cell below read
`DISCONNECTED`. It is `Observed prices`, which is the wire's own discriminant.

**The suppression rule got one home.** `feed-claim.ts`'s `chromeAlreadyNames`
now serves both notes; §1.3's rule had been about to acquire a second
implementation, which is the defect this repository has named four times.

### The premise was half wrong, and checking cost one grep

This task was briefed on the claim that acceptance criterion 5 was guarded by a
check structurally unable to see the file the criterion is about. **The
hard-coded array was real; the inference built on it was not.**
`one-home-for-the-feed-words` has used `sourceFilesUnder` since it was written
and carries `All US exchanges` as its first literal — verified on `main` — and
it is what caught the deliberately planted `const STORED_CLOSE_LABEL = "All US
exchanges"` on the first run, while `the-consolidated-word-has-one-producer`
**passed wrongly** exactly as predicted.

So the repair that bought something is the neighbour: **`No shares changed
hands`, where a five-path array was the whole fence** and could not see a file
created after the day it was written. Both arrays are now
`shippedSourceFiles()` — **7 paths → 1,061 files**, and 5 → the same 1,061.

**And after the repair, `the-consolidated-word-has-one-producer` is a strict
duplicate** of one of `one-home-for-the-feed-words`' literals — same corpus,
same home, different message. Retiring a check wants the whole story's guard
inventory in view, so it is **Task 4.2.9's call**, not this one's.

### The instant is minute-precise, and why

`COMPUTED 2026-09-26 02:46 EDT`. The gateway rebuilds the overview **up to
sixteen times a minute** over data that changes **once** a minute, so seconds
advertised churn that was not information and put a second ticking number on a
screen whose motion vocabulary marks arrivals deliberately and marks nothing
else. Two aggregates inside one minute now read the same, which is the honest
answer: nothing new had arrived.

**It is a parameter on `formatMarketInstant`, not a new formatter** — the
alternative was a fourth spelling of an instant in a fourth module, which this
story has already paid for once with a hand-built `from 2026-09-24 12:07`
carrying no zone. Seconds remain the default, with the reason recorded: a
_window_ has a second in it and a half-open bound reading `16:00` is
unreadable.

**`Computed` was kept and the rejection of the neighbour's verb is recorded in
the code**, so a later reader does not "fix" it: `SourceNote` renders
`Retrieved 8 September 2026` about bars that were **fetched**, and nothing is
fetched here — an aggregate is assembled from what the process already holds.

### What the note must not say, and does not

Which of the two tapes a **particular** tile is showing. `SPY` can be a live
IEX observation while `DIA` is yesterday's consolidated close, in one strip, at
one moment — the ordinary state of IEX. A screen-level note cannot state that
and a region-level note only pushes it down a level; the frame's per-figure
`observed`/`stored` discriminant carries it instead. **No second wire field was
added.**

`STORED_CLOSE_FEED = "sip"` is argued from the writers — daily bars have one
writer, the backfill; the live writer is minute-only — with its reversal
trigger as a condition: **the first writer of a `1d` bar that is not the
backfill**. Saying nothing would have cost invariant 6 its only statement on
this screen.

### Gates

`pnpm verify` **exit 0** — **35 invariants hold**, shared 345 / backend 973 /
frontend **1,225** / process 41, no `Unhandled Errors`. **Six breaks** red and
restored byte-identical. `pnpm probe /` — **`.regions` delta 0** at all four
widths. `pnpm e2e` not re-run for the precision edit, with the check stated:
`Computed` appears nowhere in `e2e/` except inside `getComputedStyle`, so no
spec asserts the string.

**A second browser flake was diagnosed rather than chased.**
`security-feed-degraded.spec.ts:141` captures `main`'s text **before** killing
the feed, so a pending sentence in flight at that instant is baked into the
baseline and cannot survive — a byte-identical-text assertion over a live page.
Handed to Task 4.2.8 as the same class as the gap-fill one.

## For a stakeholder — a status report, 2026-09-26

### What this was

**Telling the reader where the numbers came from.** The landing page now
carries one line at its foot naming the market feed behind the live figures,
the tape behind the stored ones, and when the summary was assembled. One line
for the whole screen — not one per section — because four sections are coming
and four separate footnotes is how a page becomes unreadable.

### What we found

**A sentence that would have contradicted the status bar.** The label was going
to read `LIVE PRICES`, which on this product means something specific about the
connection — and it would have gone on saying it while the status bar directly
below said the connection was **down**. A unit test caught it before it
shipped. It now says `Observed prices`, which describes the figures rather than
the connection.

### The correction worth recording

**The premise I gave this task was half wrong, and one check settled it.** I
had said the product's safeguard against mislabelling the market feed was blind
to new files. Part of that was true — one of two safeguards was — but the main
one had been scanning every file in the product all along, and it caught our
deliberately planted mistake immediately. The repair that genuinely mattered
was the _other_ one, guarding a different sentence, where there was no second
safeguard at all.

### One deliberate piece of restraint

The summary is rebuilt up to sixteen times a minute, over data that changes
once a minute. The timestamp originally showed seconds, so it visibly ticked —
movement that carried no information, on a screen where movement is supposed to
mean _something arrived_. It shows minutes now, and two rebuilds within the
same minute read the same, which is the truth.

### Where this leaves the work

**Two tasks left:** the browser tests and the states photographed, then the
decision record and the close.
