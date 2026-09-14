# Task 2.14.2 — The provenance surface, and the states it shares a page with, on the canvas

**Status:** Complete — 2026-09-14
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1

> **Amended 2026-09-14 by Task 2.14.1.** Decision 1 is **taken** rather than left
> for two pictures to settle, and it introduces a surface this task did not know
> about: a new `SourceNote` at the foot of the Security Explorer, governed by _the
> note states what the chrome cannot, and never repeats what the chrome can_
> ([`PROVENANCE.md`](PROVENANCE.md) §1.3). The classification is a clause of that
> note and **not** of the universe table. Edited in place.

## Objective

Draw, on the design canvas, the surfaces Tasks 2.14.3–2.14.6 will build: a
series that says where its numbers came from, a security whose classification
names its own source and age, a recency line, and the two empty answers. Then
reconcile downward — canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components
(ADR 0026).

Task 2.13.2 is the precedent and its lesson is the reason this task exists
rather than being folded into the build: **the marks were specified before they
were drawn, and the tasks that followed were renderers.** The risk here is
specific and different. Provenance is _text added to a panel that is already
full_ — a coverage sentence, four prices, two window labels, a count, two plots.
Every one of these tasks adds a line to it. Drawn one at a time in a component,
five correct additions produce a panel that reads as a footnote pile.

## What the user can see when this lands

**Nothing in the running product.** The output is a canvas and a reconciled
document. The payoffs are 2.14.3, 2.14.4, 2.14.5 and 2.14.6. Say "nothing
visible" plainly.

## Work

- **Reach the canvas with `DesignSync`** and work in the existing
  `Component library for MarketPulse` canvas rather than starting one. ADR 0026
  is the chain and its **one standing exception** is the only licence to diverge:
  where a canvas value fails a measured accessibility floor, adopt the intent,
  not the value, and record the measurement beside the token. It has fired three
  times; expect it to fire here, because provenance is small type by nature and
  small grey type is exactly where the floor bites.
- **Draw the whole panel, not the addition.** One artboard showing the Security
  Explorer's Price and Volume regions complete, with everything this story adds
  in place at once. If the five additions cannot coexist legibly, that is a
  finding for 2.14.1's decisions to absorb now rather than a layout problem for
  2.14.5 to discover.
- ~~**Draw provenance at the two prominences decision 1 weighed**~~ — **decided,
  so draw the one.** §1.2 records why the screenshot argument was accepted in a
  narrower form than it is usually made (nothing short of a mark **inside the plot
  frame** survives a crop, and that mark is refused by ADR 0027's element budget
  and by §74's decluttering). What is drawn is the `SourceNote` as settled. The
  alternative is recorded in §1.3 rather than drawn.
- **Draw the note beside the masthead in the same artboard**, because §1.3's rule
  is a statement about **two** surfaces and is unreviewable from one. The test the
  canvas is for: put the masthead and the note on one screen and check that no
  fact appears twice. `Market feed: All US exchanges` in two places is not
  redundancy a reader forgives — it teaches them the small type is not worth
  reading, which is the harm ADR 0019 §3 turned on.
- **Draw the note's own empty state, which is nothing at all.** §0.1: a claim
  about data requires data, so the note does not render when a series has no bars
  — and that is the state CI, `store:bare` and every zero-bar page are in. An
  artboard that only ever shows the populated note has not drawn the commonest
  case in the test suite.
- **Draw the two-feed case**, which is the one nothing can currently produce and
  which Epic 3 makes real. This is the cheapest place in the project to find out
  that two labels plus a sentence plus a coverage line is three sentences under
  a chart.
- **Draw the classification clause** — the group's claim and the date — as part
  of the note, which is where §5 put it. **Not** the identity block and **not**
  the universe table: a per-row provenance in a 518-row table is a different
  proposition entirely, and §28's open breach (Task 2.14.8) is about exactly that
  table's markup. Draw it in the note; if the artboard argues for the table, that
  is a finding with a measurement attached and it goes to 2.14.8.
- **Draw the empty answers, both of them**, as `ChartVacancy` will render them.
  Placement is settled — it is on the plot, with `pnpm invariants` holding that
  it has one home — so what is drawn here is **wording and weight**, and whether
  the two answers look different or only read different. §6.3 has the two
  sentences; what is open is their weight, and it matters more than it looks,
  because on an empty page the vacancy sentence is the **whole** explanation on
  screen — the note has correctly rendered nothing.
- **Apply the four tests to the artboard** before reconciling: real funded
  product; designed rather than defaulted; a moment worth showing somebody;
  feels alive. Test 4 has now been answered _"not yet"_ **four** times and its
  count is this story's to carry (STORY.md §3 of the 2026-09-13 amendment). If it
  is deferred here, that is the **fifth**, and it is written down as such rather
  than noted in passing.
- **Reconcile downward.** Any new token goes into `tokens.css` with its
  rationale; `VISUAL-LANGUAGE.md` gains the provenance treatment as a named part
  of the language, because Epic 3 extends it and Epic 8 has its own kind of
  provenance to be consistent with.

## Done when

- The canvas holds the artboards above and `VISUAL-LANGUAGE.md` records the
  provenance treatment, with any exception measured and noted beside its token.
- **The masthead and the note were reviewed on one artboard and no fact appears
  twice.** This is §1.3's rule as an acceptance test, and it is read rather than
  asserted.
- Every string drawn traces to a module named in 2.14.1's decisions — a canvas
  that invents copy is a second vocabulary.
- The four tests are applied in writing, with test 4's count stated as a number.
- `pnpm verify` passes.

## Notes

Do not build anything here. The one thing this task may touch in the tree is
`tokens.css` and `VISUAL-LANGUAGE.md`; components are 2.14.3 onward. The
separation is what made 2.13.2 cheap and 2.13.4 fast.

---

## What was done

**Canvas:** `Provenance and the empty answers.dc.html`, a new file in the
`Component library for MarketPulse` project. ADR 0026's rule applied rather than
departed from: _a design that does not fit the main canvas is added as its own
file_, and the main canvas is still past `get_file`'s 256 KiB ceiling.

Nine sections. §01 the spine; §02 the whole Security Explorer at 1440 with
everything this story adds in place at once; §03 the masthead and the note on one
artboard; §04 the note's three shapes; §05 the coverage sentence's placement;
§06 the two empty answers; §07 the four tests; §08 the reconciliation; §09 what
is left open. Every string traces to a module named in 2.14.1's decisions.

### The finding the whole task exists for

Five additions to one panel do not pile up if **each surface on the screen owns
one subject and states nothing that belongs to another** — and the test for
which surface a clause belongs to is its **grain**: per deployment, per request,
per bar, per screen, per empty plot. There is exactly one surface per grain. That
is now the language's rule rather than this story's arrangement, because Epic 3
extends this surface and Epic 8 has a parallel kind of provenance.

### Three things drawing it changed

1. **§0.1's suppression rule is per clause, not per note.** A zero-bar page still
   has a resolved security, so the classification claim has data and the note
   draws it alone. As written the rule would have removed that claim from every
   page CI renders. Amended in `PROVENANCE.md` §0.1.
2. **The coverage sentence goes on the rail, and the rail gains a stated
   priority** — held window, then coverage, then nothing. Recorded in §3, with
   the reservation re-measure handed to 2.14.5.
3. **The two empty answers are four literals, not two.** The volume plot names
   its own subject, and a price plot and a volume plot telling different stories
   about one empty screen is worse than the extra literal. Recorded in §6.3, with
   the four `pnpm break` entries it costs.

A fourth, smaller: **the note sits above the tracked universe, not at the foot of
the page.** The table is not one of §8.3's seven contents and is not about this
security.

### Reconciled downward

- **`VISUAL-LANGUAGE.md` gains a `Provenance` section** — the five-surface spine
  and the grain test, the note's two shapes, the rail's priority, the two empty
  answers, the divergence, and Epic 3's reserved live row.
- **`tokens.css` gains nothing, deliberately.** Every value the surface needs
  already exists and already means this; a token here would be one designed
  against no consumer, which is why ADR 0026 declined `micro/10` and why it stays
  declined.
- **The standing exception fired a fourth time and was swept upward the same
  day.** The canvas's `#74777f` micro ink measures **4.26:1** on
  `--surface-page` — worse than the 4.48 ADR 0026 records for the same ink,
  because that was measured on white and this is the first micro surface in the
  product standing on the page ground. Ships as `--ink-secondary`, 8.87:1. The
  count was live and wrong in four places: `CLAUDE.md`, `VISUAL-LANGUAGE.md`
  twice, and ADR 0026 (a dated amendment, not a rewrite).

### The four tests, and test 4's number

1. **A real funded product** — yes; a chart with an account of itself is the
   difference between an instrument and a scaffold.
2. **Designed rather than defaulted** — yes, and the evidence is what is absent.
   A default provenance surface is an icon, a tooltip and grey badges.
3. **A moment worth showing somebody** — yes: the two-row ledger, `780 bars ·
All US exchanges` over `30 bars · IEX`.
4. **Does it feel alive** — **deferred. This is the fifth time, stated as a
   number.** Everything this story adds is static by construction and §5.3
   explicitly refused to make the one candidate relative. What this task does
   instead of deferring empty-handed is **reserve the position**: Epic 3's
   §36 sentence is a provenance claim that changes while somebody watches, and it
   has a drawn home in the ledger's first row.

**What the user can see: nothing.** No new label, no new sentence, no new state.
The payoffs are 2.14.3, 2.14.4, 2.14.5 and 2.14.6. **What a user still cannot
do:** watch a price move.

---

## For the stakeholder — what this actually was, in plain words

**Nothing on the screen changed today.** This was a drawing job, and the reason
it was worth a day is easier to state as the alternative.

MarketPulse is about to tell you five new things about the numbers it shows you:
which stock exchanges the prices came from, whether they have been restated for
stock splits, when we last fetched them, that the "Technology · Semiconductors"
label is our own filing rather than something the market said, and — when we only
managed to answer part of the period you asked for — exactly how far the answer
reaches. Every one of those is worth saying. Said one at a time, by five
different people on five different days, they would have arrived as five small
lines of grey text stacked under a chart: the sort of footnote pile that teaches
people the small print is not worth reading, which is precisely the opposite of
the point.

So before writing any of it, we drew the finished screen with all five on it at
once, and asked whether it still reads as one instrument. It does — but only
because of a rule the drawing forced us to find. **Every surface on the page
answers exactly one question, and never borrows another's.** The strip at the top
of the window says what feed this deployment reads and nothing else. The line
beside the price says what happened to the request you made. The row under the
chart says what one bar did. A single note at the foot says where the numbers came
from. Once that is written down, there is never an argument about where a new
sentence goes — you name what the sentence is _about_, and that names its home.

Three real problems fell out of the drawing, each of which would otherwise have
been found by a user or by a reviewer months later:

- The rule we had written would have **hidden the "we chose this sector
  ourselves" disclosure on exactly the pages with no price data** — which is
  every page in our automated test environment, and any newly added security. The
  disclosure is about our own research file, not about the prices, so it stays.
- The sentence saying **how far a short answer reaches** had two candidate
  homes, and the obvious one put it _underneath_ the picture it explains — the
  same mistake we caught and fixed last week, where people met an empty box first
  and its explanation second. It goes above the chart, beside the numbers it
  qualifies.
- Telling **"we hold nothing at all for this company"** apart from **"we hold
  plenty, just not for these dates"** turns out to need wording on _both_ charts,
  not one. They imply different next actions — in the first case changing the
  date range will not help — and half a screen saying one and half saying the
  other is worse than not distinguishing them at all.

We also re-measured a colour. The shared design system draws this kind of fine
print in a light grey that, on the background this particular note sits on, is
below the legibility threshold for small text — 4.26 against a required 4.5. The
design system's _intention_ was adopted, its value was not, and the measurement
is written down beside the decision so nobody "corrects" it back.

**Where this leaves the product.** Epic 2 has been about making one security's
history real: the data, the charts, the time windows. This story is about making
it _honest_ — which is not a compliance exercise, it is the foundation for
everything after it. The whole premise of MarketPulse is that an AI investigates
a market move and a human can check its evidence. Evidence you cannot trace is not
evidence. The surfaces drawn today are where every later claim — a live price in
Epic 3, an anomaly score in Epic 5, an SEC filing in Epic 9, an AI finding in Epic
10 — will have to say where it came from, and they now have a home, a vocabulary
and a rule that stops them multiplying into noise.

The next four tasks are the build. They are renderers now, which is exactly what
this task was for.
