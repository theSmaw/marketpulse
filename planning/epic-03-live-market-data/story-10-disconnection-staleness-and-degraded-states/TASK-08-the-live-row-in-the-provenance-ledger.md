# Task 3.10.8 — The live row in the provenance ledger

**Status:** **Complete — 2026-09-24, and the reservation is RELEASED rather than spent.** `VISUAL-LANGUAGE.md` held room for §36's sentence as a first row above the stretches; by the time this task reached it, that sentence had a home — Task 3.10.2 found it already shipping in the chrome and 3.10.6 gave the same cell the live tape and an announcement. A second copy is ADR 0029's fourth rule broken. **What the ledger gained instead is the one fact it alone owns** — which stretch of this picture is still being added to — and on the way the task found that **the live tail was being counted under the STORED tape's name**: invariant 6 in the ledger, the same defect 3.10.6 repaired in the chrome, on a shape the canvas has drawn since Task 2.14.4 and nothing could produce.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.6

## Objective

Spend the room `VISUAL-LANGUAGE.md` has been holding by name.

> The §36 sentence is **a provenance claim that changes while somebody is
> watching**, and it belongs **as a first row above the stretches, carrying a
> marker of its own.**

Reserved on the reasoning that **three retrofits cost more than three
sentences**. This is the story that spends it.

## What the user can see when this lands

**The source note gains a first line that is about _now_.** Below it, the
stretches it already lists are about the past — and the difference between those
two kinds of claim becomes visible rather than implied.

## Why this is its own task and comes after the cell

Because the source note and the chrome's cell are the product's **two**
provenance surfaces and ADR 0029's fourth rule governs them: _the surface that
owns the data owns the account of it, and everything else points once and stops,
never saying nothing._

3.10.6 decides what the **chrome** says. This task decides what the **note**
says, and the two must not both explain the same thing — which is the
two-surfaces defect this repository has produced three times in one afternoon
on one screen.

## What the note already holds, and must keep

One source note at the foot of the region group — not one per region — stating
the adjustment, when the bars were retrieved, that sector and industry are
**curated**, and the series' own feed when the chrome cannot. Since Story 3.9 it
also carries the **two-feed** case from a recorded body: `sip` ×60 then `iex`
×30, each stretch in contribution order with its bar count.

**Every clause renders only when its own data is present** (ADR 0029). A live
row about a feed that has never delivered anything is the _fully-formed
provenance record about zero bars_ that rule exists to forbid.

## The marker, which is a motion decision rather than a drawing one

`VISUAL-LANGUAGE.md`'s Motion section holds the rule this has to obey:

> **work in progress LOOPS, a state PERSISTS, a fact arriving DECAYS.**

A live row is a **state**, so it persists. It is not work in progress and it is
not an arrival — the arrival mark already exists and belongs to the figure it
marks. **A fourth motion behaviour would cost the set the legibility that is its
whole value**, which is the reason Story 3.4 gave for the arrival mark simply
stopping rather than acquiring a _stopped_ variant.

And the standing rule: **none of these three states is an error.** Only `stale`
takes a colour; `live` and `disconnected` are the same grey, told apart by
**silhouette**. Colour is never the sole encoding of anything.

## Work

- The live row, above the stretches, with its marker
- Its wording in each connection state, and the state where it does not render
- The division of labour with the chrome written down: what the cell says, what
  the note says, and the one that defers
- Looked at, at four viewports, in each state — the note is the densest text on
  the page and the narrowest column it sits in is 308 px
- Greyscale-checked, because the state words differ by hue in the palette

## Done when

1. The row renders per state, and not at all when it has no data
2. Nothing on the page explains the same fact twice
3. The marker obeys the motion vocabulary rather than extending it

---

## What was done — 2026-09-24

### The reservation, released

`VISUAL-LANGUAGE.md` reserved a first row above the stretches for §36's
sentence — _Live feed disconnected — displaying data through 10:42:17_ — on
the reasoning that three retrofits cost more than three sentences.

**By the time Epic 3 arrived, the sentence had a home.** Task 3.10.2 found it
already shipping in the chrome's feed cell; Task 3.10.6 gave that cell the live
tape, the one-venue sentence and an announcement on a degradation. ADR 0029's
fourth rule — _the surface that owns the data owns the account of it, and
everything else points once and stops_ — makes drawing it here the
two-surfaces defect this repository has produced three times on one screen,
and this task's own criterion 2 forbids it in as many words.

> **The reservation's premise still held.** Reserving cost three sentences;
> finding that the sentence had moved cost one task reading the tree before
> drawing anything. That is the reservation working, not failing.

### What the note gained instead, and the ambiguity it removes

**Since Story 3.8 two ledgers can be identical and mean different things.** A
window whose last session is today is served with two tapes, so
`All US exchanges` over `IEX` arises from:

| The rows                                  | What happened                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| 60 bars `All US exchanges`, 30 bars `IEX` | the **server** answered with two stretches — history, nothing moving       |
| the same two rows                         | a **socket** has been extending a stored SIP window while somebody watches |

**Nothing on the screen told them apart, and the chrome cannot**: it knows
whether data is arriving, not which stretch of this picture it is arriving
into. That is a fact about the **series**, which is the note's subject.

So the last stretch — contribution order being the ledger's rule — carries a
disc **and the word `arriving`**:

```text
SOURCES   60 bars  All US exchanges
          30 bars  IEX  • arriving
                   Trades reported by the IEX exchange only — not the full
                   US consolidated tape.
```

**Three rules it obeys rather than extends:**

- **A state, so it persists.** No animation. _Work in progress LOOPS, a state
  PERSISTS, a fact arriving DECAYS_ — and the decaying version of this disc
  exists already and belongs to the figure it marks. A fourth behaviour would
  cost the vocabulary the legibility that is its whole value.
- **The word carries it, not the disc.** A 4×4 px dot is invisible in
  greyscale, to a low-vision reader and to a listener; `arriving` survives all
  three, and the disc is `aria-hidden`.
- **Never a first row.** A mark above the stretches would claim the past is
  still happening.

And it keys on **a bar having arrived for this security**, not on the feed
being live: a page open on a thin name legitimately has nothing for hours with
a healthy socket, and a row claiming to grow while nothing grows is the
cry-wolf every decision in this story has steered around.

### The defect found on the way, and it is invariant 6 again

**The canvas has drawn _stored SIP bars with a live IEX tail_ since Task
2.14.4, and the code could not produce it.** `withLiveBars` counted every
arriving bar against the **last** stretch and inherited its feed — so IEX bars
off the socket were listed as `All US exchanges`, in the one surface on the
page whose entire purpose is not to make that claim.

That is `CLAUDE.md`'s invariant 6 — _Epic 3's live feed must not inherit Epic
2's word_ — **in the ledger rather than in the chrome**, two tasks after
3.10.6 repaired it one surface along.

> **The argument behind it was about the wrong noun.** The comment reasoned
> that the stream and the history share a **vendor**, so _the tape does not
> change at the join and a second stretch would be a seam with no market event
> behind it_. True about the vendor, and irrelevant: the free Alpaca plan is
> asymmetric — stored bars are consolidated **SIP**, the live stream is
> **IEX** — so a vendor that does not change says nothing about a tape that
> does.
>
> Its reversal trigger could never fire, for the same reason: it read _the
> first deployment that configures a different **vendor** for the stream than
> for history_. The replacement is the condition `AppFooter/venue.ts` already
> records — the first deployment whose stored and live tapes are the **same** —
> because it is the same fact.

**It still extends where the tape really is the same**, which since Story 3.8
is the commoner case: a mid-session window already carries an `iex` stretch,
and a second would be a boundary with no market event behind it — exactly what
the original comment feared, now asked as a question about data rather than
assumed.

### Produced, not reasoned about

`pnpm probe --story market-sourcenote--two-feeds-arriving` at 1440 and 390, and
the first draft was wrong in a way no test could see: **the marker landed in
the count column, on the sentence's row**, reading as a second ledger entry.
The `li` is a `subgrid`, so every direct child is a cell — the label and its
marker have to be one item. At 390 the note's column is **305 px** and the
marker now sits beside the label.

### Gates

`pnpm verify` green — **2,445 tests, 26 invariants**. Full `pnpm e2e`
**165 passed, 0 failed** — at `--workers=1`, because the machine was carrying
Docker Desktop's VM at 80% CPU all morning and the parallel runs failed a
**different set each time** (9, then 7), which is `docs/GAPS.md`'s recorded
contention signature rather than a finding. The four specs this change can
reach were run three times over at full load and are green. Two new breaks,
both red on demand: `the-ledger-inherits-epic-2s-word-too` (the tail inherits the stored
tape's word) and `the-live-row-loses-its-word` (the marker becomes a dot
alone). Canvas published to `Provenance and the empty answers` §12; the release
is recorded in `VISUAL-LANGUAGE.md` and the division of labour in
`PROVENANCE.md` §13.

## For a stakeholder — a status report, 2026-09-24

### What this was meant to be

Two years ago we wrote down that when the live feed drops, the note under the
charts saying **where these numbers came from** should gain a line at the top
saying so. We left space for it deliberately, on the reasoning that leaving
space is cheap and retrofitting is not.

**We did not build it, and the reason is the better outcome.** Since that note
was written, the _status bar_ learned to say exactly that sentence — and two
weeks ago it learned to say it out loud to screen-reader users. Putting the
same sentence in two places is how a product ends up with two versions of one
fact that drift apart, which we have now done three times on this single
screen and caught each time.

So the space was **released** rather than spent. Leaving it still paid for
itself: it cost three sentences, and it made somebody check.

### What we built instead

There is one thing the note can say that nothing else on the page can, and it
turned out to matter.

Since last week our own server records prices as they arrive, so the chart's
data can legitimately come from **two sources** — the full market tape for
earlier in the day, and the single exchange our live feed uses for the most
recent minutes. The note lists both.

**But two identical-looking lists can mean two different things**: either the
server handed us both when the page loaded (history — nothing is moving), or
our live connection is _still adding to the second one right now_. A reader had
no way to tell.

The second one now says so:

> 60 bars · All US exchanges
> 30 bars · IEX **• arriving**

A dot **and the word**, because a dot alone disappears for anyone reading in
greyscale, with low vision, or by ear. And it does not blink, pulse or animate:
it is a _state_, and our rule is that states sit still while things in progress
move. The dot vanishes when the feed stops — the rows and their counts stay,
because those bars are still on the chart.

It also only appears when a price for **this** share has actually arrived. A
quiet share can go hours without one on a perfectly healthy feed, and a label
claiming to be growing while nothing grows is the crying-wolf problem we have
been avoiding at every surface in this phase.

### And we found something serious while doing it

**The chart's own note was mislabelling where its newest prices came from.**
Prices arriving over the live connection — from a single exchange — were being
added to the tally for _the full US market tape_.

This is the **same** honesty problem we fixed in the status bar two days ago,
in a different place, and it is the one our own product rules single out by
name. The note exists specifically to avoid overstating our coverage, and it
was overstating it.

The design for the correct version had been drawn **two years ago**. Nobody
had noticed the code could not actually produce it.

The reason it slipped through is worth knowing, because it is a good mistake:
the original code reasoned _the live prices and the stored prices come from the
same supplier, so the source does not change_. Both halves of that are true —
and the conclusion is wrong, because our supplier gives us the full market tape
for history and a single exchange for live. Same supplier, different data.

### Where the product stands

**Epic 3's final story, eight of ten tasks done.** Every surface that makes a
claim about our data has now been held to the same question, and two of them
were found overstating it in the same week.

**What is next:** every degraded state produced and photographed together —
the pass that has historically found the defects no single state shows.
