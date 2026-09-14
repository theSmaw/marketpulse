# Task 2.14.1 — Settle what this product claims about its own data, and create the subject document

**Status:** Not started. Subject document: **`PROVENANCE.md`** in this directory
(this task creates it).
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** Story 2.13 (complete)

## Objective

Take this story's three open decisions — **how prominent the feed label is**,
**the exact wording when a series' sources disagree**, and **whether "data
through …" appears when the data is simply historical** — plus three more this
story cannot avoid and no later task should be left to take by accident, and
write them into **`PROVENANCE.md`** before a single string reaches a screen.

Tasks 2.9.1, 2.10.1, 2.11.1, 2.12.1 and 2.13.1 are the precedent. What is
different here is that every decision on this list is a **claim about the truth
of a number**, not a mechanism. A window chosen badly is a product that is
awkward; a provenance sentence chosen badly is a product that is **wrong about
its own data**, which is the one failure PRODUCT_SPEC.md §35 names explicitly
and invariant 6 exists to prevent.

## What the user can see when this lands

**Nothing.** No new label, no new sentence, no new state. The payoffs are Task
2.14.3 (the series' own provenance on screen), Task 2.14.4 (the curated file's
age) and Task 2.14.5 (recency). Say "nothing visible" plainly when reporting it
and name those three.

## What is already decided and must not be re-taken

Read these first. Five of them would otherwise be settled here differently, and
each is recorded with its argument somewhere else.

- **The premise this story was planned against is inverted, and the inversion is
  measured.** Stored historical bars are **SIP, the full consolidated tape**; the
  live stream is **IEX only**. `ALPACA.md` §2, re-measured rather than cited. The
  disclaimer this story's title implies is the opposite of the truth for
  everything this epic stores.
- **A feed gets a sentence when its label cannot stand alone, and not
  otherwise** — ADR 0019 §3. `IEX` gets one; `All US exchanges` does not. That
  rule is inherited. What is open is what a **series with two of them** says.
- **The words are not chosen in a component.** They live in
  `MARKET_FEED_DESCRIPTIONS`, beside the vocabulary they describe, and the
  `satisfies` on that record makes a feed added without words a compile error. A
  string literal in a renderer puts that guarantee back outside the compiler.
  Any wording this task settles lands **there**, not in JSX.
- **Provenance is a field on the data, not a caption on a component**
  (`market-provenance.ts`). A series names a **list** of sources. That shape is
  settled and this task spends it rather than revisiting it.
- **Colour is never the sole encoding**, and nothing in the provenance treatment
  is red or green. A single-venue feed is not a fault — §36 makes it a product
  state. The one amber in the existing treatment is `synthetic`, and it carries a
  square and a sentence beside it.

## Work

Settle each of the following in `PROVENANCE.md`, with the alternatives that were
weighed and a **reversal trigger that is a condition rather than a story
number**.

- **Open decision 1 — how prominent, and where.** Today there are two surfaces
  and they say different things: `FeedProvenance` in the chrome states what this
  **deployment** reads, once; `BarSeriesPanel` states what **this series** is
  made of, and — measured, `BarSeriesPanel.tsx` §74.1 — renders **nothing at all
  until the sources name two distinct feeds**, which no body this product can
  currently produce does. So the honest summary of today is: _the chrome makes a
  standing claim, and the numbers on the Security Explorer carry none of their
  own._ Decide whether that is right. The argument for per-series labelling is
  that **a screenshot of a chart travels**, and a screenshot carries no chrome.
  The argument against is noise on a panel that already holds a coverage
  sentence, four prices, two windows and a count.
- **Open decision 2 — the wording when sources disagree**, which is two claims
  rather than one. The chrome's standing claim is shipped and settled. What is
  open is the sentence a **series** says when stored SIP bars sit beside a live
  IEX tail, and the failure mode to design against is named: it **must not
  collapse into naming whichever feed is first in the list**. Note what you may
  and may not do here — `stitched.json` is a real recorded body naming two
  sources that name the **same** feed, so the two-feed case is **not
  producible** from any body a server has sent. Settle the wording; do not
  fabricate a body to demonstrate it (Task 2.14.3 owns how it is reached from a
  story without claiming a server sent it).
- **Open decision 3 — "data through …" when the data is simply historical.**
  §36's shape is _"Live feed disconnected — displaying data through 10:42:17"_,
  and that sentence earns its place because something **stopped**. Nothing has
  stopped here. Decide between: always state the end of coverage; state it only
  when the answer is short of what was asked; or state it only when it is behind
  by more than some threshold the store can actually be behind by. Whatever is
  chosen, `/diagnostics/freshness` already answers _how many sessions behind is
  the store_ and is the thing that knows.
- **Decision 4 — the adjusted/unadjusted disclosure.** `adjustment` is on every
  source of every series, on the wire, in every fixture, and is rendered
  **nowhere**. Decide what a reader is told, in what words, and whether it is
  per-series or per-source — and note the trap: on this plan every stored bar is
  the same adjustment, so a per-source disclosure is one fact repeated N times
  until the day it is not.
- **Decision 5 — what the metadata provenance says.** Sector and industry did
  not come from the market-data provider, and `GET /securities` already carries
  `provenance.profile` and `provenance.classification`, each a source and a
  retrieval timestamp, rendered nowhere. Decide the words, the placement, and
  **what a stale curated file looks like** — this is the column Story 2.3
  argued for and this story renders.
- **Decision 6 — whether the two empty answers go on the wire.**
  `routes/market-data.ts` distinguishes _nothing held for this security and
  timeframe_ from _nothing held in this window_ in a **debug log and nowhere
  else**; both are the same 200 body, deliberately. Decide whether that
  distinction becomes a field, and be explicit about what it costs: a new
  discriminant on a response shape six modules parse, a new state in a union, a
  new story, and a sentence that must stay true when Epic 3 stitches a live tail
  onto both. The alternative — one honest sentence covering both — is defensible
  and must be argued rather than defaulted to. Task 2.14.6 implements whatever
  is decided; it does not get to decide it.

Also record, without deciding anything: **the `synthetic` branch of
`BarSeriesPanel` has never executed against any recorded body**, all seven valid
fixtures being `sip`, and it is not honestly fake-able because a synthetic feed
implies `provider: "fixture"` too. Carry it forward as a known gap with its
cause, not as a to-do.

## Done when

- `PROVENANCE.md` exists in this directory, with the six decisions above, each
  with alternatives weighed and a reversal trigger that is a **condition**.
- Every wording decision names the **module** the words will live in, and none of
  them is a string in a component.
- The decisions that contradict this story's own scope prose (the IEX
  disclaimer) are called out, so Task 2.14.10's sweep has a list rather than a
  search.
- `pnpm links` passes; `pnpm verify` passes. Nothing else changed.

## Notes

The temptation here is to settle three decisions and start typing. Resist it:
the reason the last five stories each opened with a decision task is that every
one of them found an arithmetic or a constraint that would have been discovered
three tasks later as a re-write. The specific one waiting here is decision 6 —
putting a distinction on the wire is cheap on the day and permanent afterwards.
