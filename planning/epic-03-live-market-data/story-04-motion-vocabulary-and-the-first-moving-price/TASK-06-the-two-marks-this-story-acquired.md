# Task 3.4.6 — The two marks this story acquired after it was written

**Status:** **Complete — 2026-09-21.** Both marks shipped. The extended-hours word is **derived from the bar's own instant** and is in the shipped vocabulary with an invariant behind it; **a revision now fires the arrival mark**, which it did not, and the break restores the tree exactly as Task 3.4.5 shipped it. A correction gets **no treatment of its own**, argued rather than omitted. The pair was looked at, at four widths and in greyscale.
**Amended:** 2026-09-21 after Task 3.4.4 — **§2's premise is stale**: there is no "price moved" animation, so a correction firing the mark would be true rather than a lie, and the remaining question is narrower. A third decision was added: two marks now share one figure.
**Amended again:** 2026-09-21 after Task 3.4.5 shipped the mark — **a revision does not fire it**, because the mark keys on the instant and a correction carries the minute it corrects. Nobody decided that; this task is where it becomes a decision.
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
would be **true**, and the lie this section was written to prevent cannot be
told by the mark. (**It turns out not to fire at all** — see the second
amendment below, which is the live question.)

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

> **AMENDED AGAIN 2026-09-21, after Task 3.4.5 shipped the mark: a revision does
> not fire it, and nobody decided that.**

The mark keys on the observation's **instant**, and a revision replaces a minute
**already seen** — §7.3: `t` marks the interval's start, so a corrected 14:01
bar carries `14:01:00Z` exactly as the first one did. `useArrival` therefore
returns nothing and **no mark is drawn**.

**That is a behaviour, not a decision**, and this task is where it becomes one:

- **If it is right**, say why. The candidate argument: the mark means _a bar
  arrived for this security_, one already did for that minute, and marking it
  twice would claim two arrivals where the feed reports one observation and one
  correction of it.
- **If it is wrong**, the repair is small and it belongs here rather than in
  3.4.5: three of fourteen revisions changed a close, so a reader can see **the
  figure move with no mark at all** — the exact inverse of the decision's
  intent, and a state the vocabulary currently has no word for.

**And the detection lives in one place or it lives in two.** `useArrival` in
`SecurityIdentity.tsx` already performs the comparison this task needs — _is
this instant the one I last saw?_ — with the opposite outcome. A second copy of
it somewhere else is how the two answers drift apart.

**One constraint on how**: `WireObservation` carries **no `supersedes` field**.
The backend's `LiveObservation` has one and it is dropped at the wire, so the
browser can only infer a correction from an instant colliding with one it
already holds. **Widening the wire is a protocol change** rather than a renderer
change, and if this task wants it, it says so out loud rather than adding a
field in passing.

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

---

## What was found

### The extended-hours mark is a WORD, and the argument is this product's own

`07:42 EDT · pre-market · change from 2026-09-04's close`

**It is derived, which is §7.7's measurement rather than a preference.**
_Nothing on the frame distinguishes an extended-hours bar_ — the vendor sends a
07:42 pre-market bar and a 10:42 regular-session bar identically — so the mark
is **entirely ours**, taken from the bar's own instant against Story 2.5's
calendar and never from a field on the wire. §7.11 settles that such bars are
**rendered and marked** rather than filtered: a price is a price, and hiding one
because of the hour would be removing a true fact.

**A word rather than a glyph**, for three reasons that are constraints rather
than taste:

- **`PRODUCT_SPEC.md` §7.1's own argument, generalised.** _Three letters teach a
  non-specialist nothing_, and the fix there was a sentence rather than an
  acronym. A shape needs a legend; a reader either knows what _pre-market_ means
  or can look it up, and neither is true of a dot.
- **The left margin of the digits is already spent** on the arrival mark. A
  second glyph in one position is two marks competing at 390, which is where
  this chrome has a recorded clipping defect.
- **Colour is never the sole encoding of anything**, and a word survives
  greyscale by construction rather than by a check.

**It sits beside the instant because it IS the instant interpreted.** §10.3's
rule is that every entry carries its own instant and no reader may render a
price without reading it, so the line reads _when · what kind of when · what the
change is measured from_. Asserted as an order rather than as three independent
clauses, because a listener is handed the concatenation.

**Nothing renders for a regular-session price.** Silence means the ordinary
case — the same call the chrome makes for `LIVE` carrying no timestamp — and the
exceptional case is the one that speaks.

### Two states, not four, and the two left out cannot occur on the feed

`weekend` and `holiday` are **deliberately unmarked**. IEX trades on neither, so
a live observation cannot carry such an instant; the only thing that produces
one is ADR 0030's replay, which re-stamps recorded bars onto the **wall clock** —
and the chrome already says `REPLAYING` for exactly that case.

Marking them would be true and useless, and would put two more words in front of
a reader to describe a situation another surface has already named.

**It also has a practical consequence this task met immediately**: out of hours,
the replay cannot produce either mark on the running page, because every
re-stamped bar lands on a weekend. That is why the three states live in the
**workshop** as a story set, which is where they are comparable anyway.

### A revision was not firing the arrival mark, and now it is

**The behaviour Task 3.4.5 shipped without deciding it**, handed here by that
task's own sweep.

The mark keyed on the observation's **instant**, which is right for a new minute
and wrong for a correction: a revised bar carries **the minute it corrects**
(§7.3 — `t` marks the interval's start), so the instant did not move and **no
mark was drawn at all**.

§7.8 measured **14 revisions in one session and three of them changed the
close** — so a reader could watch the **figure move with nothing marking it**,
which is the exact inverse of what the mark was decided to mean.

**The identity is now the observation's content rather than its minute.** A
revision that changed something is a different observation and fires the mark;
one that changed nothing is not, and does not — correct rather than a
limitation, because nothing was corrected. `volume` is in the identity as well
as `close` deliberately: a revision that adjusted only the volume still
corrected the bar, and a reader told _a bar arrived_ has been told the truth.

```text
pnpm break a-revision-is-a-bar-arriving-too
  ✓ broken → red → restored byte-identical.
    matched: fires the mark when a corrected bar replaces the SAME minute
```

**That break restores the tree exactly as Task 3.4.5 shipped it**, which is the
strongest kind: the check is proved against the defect it was written for rather
than a synthetic one.

### And a correction gets NO treatment of its own — decided, not omitted

The task's original §2 asked for one. Task 3.4.4 dissolved the premise and this
task settles the remainder, and the argument is that **all three facts are
already on the screen**:

| What the reader sees                         | What it says                                   |
| -------------------------------------------- | ---------------------------------------------- |
| the mark fires                               | **something arrived**                          |
| the figure may change                        | **the number is different**                    |
| **the qualifier's instant does not advance** | **for the minute you were already looking at** |

That third line is the correction, stated in a line that already exists. A
fourth behaviour to say it again would cost the vocabulary the legibility that
is its whole value — and would reintroduce _the mark means the price moved_
through the back door, one task after it was decided not to.

**Which is also why the distinction is NOT materialised in state**, and that
changes one of this task's own acceptance criteria. _Told apart in state, not in
a renderer_ was written when a correction was going to need its own treatment.
Nothing renders them differently, so a stored `supersedes` flag would be **a
field with no reader** — the exact shape Story 3.2, Task 3.4.3 and Task 3.4.5
each spent time finding. The distinction is **observable** rather than stored,
and the observable is the instant.

**One constraint recorded for whoever needs the flag later:**
`WireObservation` carries **no `supersedes` field**. The backend's
`LiveObservation` has one and it is dropped at the wire, so a browser can only
infer a correction from an instant colliding with one it already holds.
Widening the wire is a **protocol change** rather than a renderer change.

### The two marks on one figure do not compete, and that was checked

**They are in different registers**, which is what makes the pair legible:

- **a glyph beside the figure is an EVENT** — a bar arrived, and it decays
- **a word in the qualifier is a FACT about the instant** — and it persists for
  as long as the price does

Different lines, different lifetimes, different grammar. Measured with both
present at 1440, 1024, 768 and 390: **neither displaces the other**, the mark
clears the block's left edge by 169–226 px and is never off-screen.

**The one cost, measured rather than assumed:** at **390** the word takes the
qualifier to a second line — the identity block is **88 px** against **72 px**
for a regular-session price. Nothing else moves, and the answer is the chrome's
own from `Live in the chrome` §04: **let it wrap**. A surface growing when it
has something extra to say costs nothing to reverse and adds no rule.

**Greyscale**: the mark is `--ink-primary` and the word is text, so neither has
a hue to lose, and `PriceChange`'s `▼` still carries direction. Checked on the
running page rather than argued.

### Naming, because four marks is where a product acquires two words for one thing

This story now has **the arrival mark** and **the extended-hours mark**, and the
chrome has **the provenance marker** and **the connection marker**. They are
kept apart by what they are _about_ rather than by shape: two are about **an
observation** and two are about **the deployment**. `VISUAL-LANGUAGE.md` uses
those four names and no others.

## For a stakeholder — a status report, 2026-09-21

**Where the product is.** A user can explore 518 US companies and their
historical charts, the chrome says honestly whether live data is arriving, a
price moves on its own, and a dot tells them a fresh price just landed. This
task added the last two things the story picked up after it was written.

**The first: a price now says when it came from outside normal trading hours.**

The US market runs 09:30 to 16:00 New York time, but prices also trade before
the bell and after it — and those prices behave differently. They are thinner,
they move more, and a reader who does not know a number came from 07:42 will
read it as if it came from the middle of the day.

**Our data provider does not tell us which is which.** We measured that during
the research phase: a pre-market price and a mid-afternoon price arrive looking
**identical**. So we work it out ourselves, from the timestamp the price already
carries, against the trading calendar we built in an earlier phase.

**And we say it in a word, not a symbol.** The line under the price now reads
**"07:42 EDT · pre-market · change from 2026-09-04's close"**. We could have put
another dot or a coloured bar there. We did not, for a reason this product has
already written down about something else: _three letters teach a non-specialist
nothing_. A symbol needs a key; a word either means something to you or can be
looked up. It also means the fact survives for a colour-blind reader and for
anybody reading a black-and-white printout, without us having to check.

**A regular-session price says nothing at all** — silence means "the ordinary
case", which is the same choice we made in the status bar. The exception speaks;
the rule stays quiet.

**The second: our data provider sometimes corrects a price it already sent.**

About thirty seconds after a price arrives, a corrected version can replace it.
We measured fourteen of these in a single session, and **three of them changed
the price**. So a number on the screen can change without the market having
moved.

**Our new dot was silently missing every one of them.** It was set to fire when
the _minute_ changed — and a correction is for a minute we have already seen, so
the dot stayed dark while the number moved underneath it. That is precisely
backwards: the whole point of the dot is that a change to the number is never
unannounced. It now fires on corrections too, and we deliberately broke the code
back to the old behaviour to confirm the new test catches it.

**We chose NOT to give corrections their own special appearance**, and that is a
decision rather than something we skipped. Everything a reader needs is already
visible: the dot says _something arrived_, the number says _it is different_,
and the small print — **which does not change its time stamp** — says _this is
about the minute you were already looking at_. Inventing a fourth kind of
movement to repeat that would make the whole vocabulary harder to read, and the
value of having only three is exactly that they are easy to tell apart.

**What we checked by looking.** Both marks now sit on the same block, so we put
them side by side at four screen sizes and in greyscale. They do not collide,
and they do not compete — one is a dot beside the number that appears and fades,
the other is a word in the small print that stays. One cost, measured: on a
phone, an extended-hours price makes the block **one line taller**. We let it
grow rather than shortening the sentence, which is the same answer we gave when
the status bar had something extra to say.

**What a user can see today:** a price that moves, a dot that says it just
arrived — including when it was corrected — and, when it applies, a plain word
saying the price came from before the bell or after it.

**What is left in this story:** what a screen reader hears, the measurements we
owe, and one chrome contradiction on the replay. Then the story closes with a
rehearsal against the real market.
