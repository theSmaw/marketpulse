# Task 3.10.8 — The live row in the provenance ledger

**Status:** Not started
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
