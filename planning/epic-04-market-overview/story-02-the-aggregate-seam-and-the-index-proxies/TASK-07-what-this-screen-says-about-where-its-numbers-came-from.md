# Task 4.2.7 — What this screen says about where its numbers came from

**Status:** **In progress — 2026-09-26.**
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
