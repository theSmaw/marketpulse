# Task 3.4.6 — The two marks this story acquired after it was written

**Status:** Not started
**Amended:** 2026-09-21 after Task 3.4.4 — **§2's premise is stale**: there is no "price moved" animation, so a correction firing the mark is true rather than a lie, and the remaining question is narrower. A third decision was added: two marks now share one figure.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.5

## Objective

Two vocabulary items this story did not originally owe, both handed here by
Task 3.1.4 out of `LIVE-DATA.md` §7.11 — **an extended-hours mark**, and a
treatment for _this corrected_ that is not the treatment for _this moved_.

## What the user can see when this lands

**A price that says when it came from outside the regular session**, and a
correction that does not pretend to be a tick.

## What is already decided and must not be re-taken

### 1. Extended-hours bars are RENDERED and MARKED, not filtered

§7.11. **Nothing on the frame distinguishes them** (§7.7) — the vendor sends a
pre-market bar and a regular-session bar identically — so **the mark is entirely
ours to invent**, and it is derived from the bar's own instant against Story
2.5's calendar rather than from anything the wire says.

**Stories 3.6, 3.7 and 3.9 consume this mark**, so it is a vocabulary item
rather than a detail of one screen.

### 2. A correction is NOT a price movement

The product subscribes `updatedBars` (§7.11), so **a displayed number can be
replaced about thirty seconds later by a corrected one for the same minute**
(§7.8). Fourteen revisions were measured and **three of them changed the close
price by a few cents**.

**Under a "price moved" animation that reads as a real tick that never
happened.** A reader watching the identity block would see the market move; it
did not. That is the product telling a lie in its own motion vocabulary, which
is the thing this story exists to get right.

So `this corrected` needs a treatment that is **distinguishable from `this
moved`** — or a decided absence of one, argued.

> **AMENDED 2026-09-21 — Task 3.4.4 dissolved the premise above rather than
> solving it, and reading the paragraph as written will produce the wrong work.**

**There is no "price moved" animation.** The chosen treatment fires when a bar
**arrives**, not when the price **changes**, and it claims only _a bar arrived
for this security_. **A correction is a bar arrival.** So the mark firing on one
is **true**, and the lie this section was written to prevent cannot be told by
the mark.

**Do not invent a second motion treatment to distinguish a correction from a
tick.** Doing so would reintroduce _the mark means the price moved_ through the
back door, one task after the vocabulary decided it does not — and would put a
fourth behaviour into a set whose whole value is that it has three.

**What survives, and it is a narrower question:** when a revision changes the
close, **the figure itself changes** — three of fourteen did — and the
percentage changes with it. A reader sees a number move that the market did not
move. **That is still worth deciding**, and it is now a question about the
**number and its qualifier** rather than about the mark. The qualifier already
carries the bar's own instant; a correction replaces a minute **already shown**,
so the instant does **not** advance, which may be the whole of the available
signal and may be enough. **A decided, argued absence is now the more likely
correct answer than it was when this was written.**

### 3. Two marks on one figure, and they must not collide

The arrival mark occupies the **left margin of the digits** (Task 3.4.4
measured 26 px of room there at 390, and used 17 of it). **The extended-hours
mark is a second mark on the same figure** and this task is the first to put two
there at once — so where it goes is a decision, not a leftover, and _what the
pair reads as together_ is the thing to look at rather than each alone.

**And the naming needs care in the document**: this story now has _the arrival
mark_, _the extended-hours mark_, and the chrome already has _the provenance
marker_ and _the connection marker_. Four marks is where a product acquires two
words for one thing.

## Work

- **Derive the session mark** from the observation's instant through
  `packages/shared`'s calendar. It is **not** a field on the wire and must not
  become one by accident.
- **Tell a revision from a movement** in the browser. The protocol carries the
  bar's own minute; a second observation for a minute already seen is a
  correction and a first observation for a new minute is a tick. **Decide where
  that distinction is made** — the reducer is the obvious home and the renderer
  is the wrong one.
- **Give each its treatment, or argue the absence.** A correction that looks
  like nothing is a defensible answer; a correction that looks like a tick is
  not. **Since 2026-09-21 the absence is the stronger starting position**, for
  the reason in §2's amendment: the mark makes no movement claim, so there is no
  lie to repair, and a fourth behaviour would cost the vocabulary its legibility.
- **Place the extended-hours mark against the arrival mark**, at all four
  widths, and look at the pair rather than at each.
- **Check both in greyscale**, for the rule that has already caught a real
  defect here.

## Done when

- An extended-hours observation is marked, derived from the calendar rather than
  the wire
- A correction is **told apart from a movement** in state, not in a renderer
- A correction does not render as a price movement — asserted. **Note this is
  already true of the mark** and the assertion is about the figure and its
  qualifier
- **The two marks were looked at together**, at four widths, and neither
  displaces the other
- Both treatments are in `VISUAL-LANGUAGE.md` and the canvas, because three
  later stories consume them
- `pnpm verify` passes
