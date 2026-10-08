# Task 4.5.6 — The denominator, the two grammars, and the one-sided market

**Status:** **Complete — 2026-10-08.**
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** 4.5.5

## Objective

**The ranking's honesty.** A top ten computed over the ~466 names heard from may
show ten securities that are **not** the ten biggest movers, and **a ranked list
looks exactly as confident whether its input was complete or not.** This is
`EPIC.md`'s _an aggregate is the one kind of number that can be wrong while
looking right_ in its sharpest form.

## What the user can see when this lands

**A sentence under the two lists saying what they were ranked over**, and an
honest answer in every state where a list is short, empty or about a market that
is shut.

## Work

### The denominator, restated here — the owner's Gate 1 decision

Breadth states _"Of the 503 companies we track, 451 were heard from in the last
5 minutes."_ 200–300 px away. **This region states it too**, because a ranking's
whole honesty rests on it and a reader must not cross the page to learn whether
the top five is the top five.

**Both clauses read the same `measured` / `tracked` on the same frame**, so they
cannot disagree — and that single producer **owes a check**. The window figure is
**read, never spelled**: `5` comes off the frame as `windowMinutes`, because a
rollback can put a gateway and a bundle two values apart.

**No feed word.** A sentence reaching for `live`, `stale` or `disconnected`
trips `one-home-for-the-feed-words` and **would deserve to**. No venue, no
instant — `computedAt` is the source note's, once for the screen.

**Drawn and spoken built from one value**, `BreadthClaim`'s idiom, even if they
come out identical — so they cannot diverge later. **Check it reaches a
listener with `Accessibility.getFullAXTree`, not the DOM**: Story 4.4 found N
reached no listener at all because its only printed home was an `aria-hidden`
ladder, and **this region has no ladder at all**, so there is no printed
endpoint anywhere.

### Two grammars, keyed on the basis the wire sent

_Heard from in the last 5 minutes_ is **false about a closed market** —
breadth's own recorded reason for having two grammars. Keyed on `basis`, never
on a clock this module reads, so neither can render the other's: `windowMinutes`
does not exist on the session member and `session` does not exist on the
observed one, which is a **compile error rather than a wrong sentence**.

### The one-sided market, which is the state nothing has ever drawn

Each list holds only rows whose `directionOf` matches it (Gate 1). So on a
strong trend day **one list is full and the other is short or empty** — and that
is honest, where the alternative draws five gains under a heading saying
`LOSERS`.

**An empty list must say something.** `docs/GAPS.md`: _a region whose content is
legitimately conditional looks identical to one whose content silently
disappeared._ The sentence claims **the heard-from set, not the market** — the
`No shares changed hands anywhere in the window.` lesson, which is the only
shipped sentence that ever over-claimed about the market. Candidate:
`Nothing we heard from declined.`

**And it must agree visibly with breadth**: an empty `GAINERS` beside breadth's
`Advancing 0` is the two regions agreeing, and five rows under `GAINERS` beside
`Advancing 0` is the contradiction to design against.

### The copy defect already on screen

`MarketOverview.tsx:462` ships:

> `"The largest moves among the securities we track, up and down, ranked while the session runs."`

**`securities we track` is 518**, including `SPY` and the eleven SPDRs. The set
is **503 companies**. Yesterday's `the-population-is-never-a-literal` does not
catch it — that clause fires on a **digit** beside `we track`, and this sentence
has none. Fix the word, and **consider whether the invariant should also refuse
the wrong noun** — if it can be keyed on something the re-implementer cannot
avoid writing, it should be; if not, say so rather than claiming a guard that
is a sentence.

### Boundaries

Not the hold (4.5.7). Not the grid or the sweeps (4.5.8).

## Done when

1. The footer sentence renders in both grammars, from one builder, with the
   window read off the frame and no feed word anywhere
2. It reaches a listener, verified from the **accessibility tree**
3. Both this region's and breadth's figures demonstrably come from one producer,
   with a check
4. An empty or short list says something that claims the heard-from set rather
   than the market, and agrees visibly with breadth's count
5. The `securities we track` copy defect is repaired, and the invariant question
   is answered either with a clause or with a recorded reason it cannot be one
6. `pnpm verify` green

## Handed here by Task 4.5.3 — 2026-10-08: your sentence is the ONLY thing that will explain the empty state

**Produced and photographed**: with both lists empty — **CI's permanent state,
for ever, and most of a weekend** — the region draws its name, the head slot
reading `TOP 5 EACH WAY`, the two headings `GAINERS` and `LOSERS`, a rule, and
**nothing else at all**. 466 px of labelled, empty box. That is `docs/GAPS.md`
entry 13 exactly, and your done-when 4 is the only thing in this story that
closes it.

Two specifics the picture adds to that criterion:

- **The sentence has to be honest at zero**, because zero is the state a gated
  machine and a weekend both reach: `of the 503 we track, 0 were heard from`
  with the window is a true, complete explanation; a sentence that only renders
  when something was ranked leaves this box silent.
- **Decide what the head slot says there.** `Top 5 each way` states the
  **bound** and is not false with nothing in the lists, but in that state it is
  the only text on the screen besides two empty headings, and it reads as a
  claim about a selection that selected nothing. The precedent for suppressing
  it is one region up: `SectorPerformanceMeta` speaks **only in the mixed
  state**, on the argument that a claim nobody needs is noise and a claim the
  rows contradict is two true halves and one contradiction. `MoversMeta` takes
  no props today; giving it the view is a one-line change and is deliberately
  left to you, because it is the same judgement as the sentence and should be
  taken once.

**The sentence this task writes has no home yet**: `Movers.tsx` renders an
empty `<p className={styles.claim} />` holding **44 px** (12 margin + two
16 px micro lines), which is in the region's measured budget. Fill that
element; do not add a second one.

## Handed here by Task 4.5.5 — 2026-10-08: the region is on screen, and your sentence now owes a **basis** clause as well as a denominator

Three constraints, written here rather than linked, because a pointer is what a
reader follows when they already know to look.

### 1. Every row draws a PRICE now, and nothing on the screen says what session it is from

The price cell is filled (`SectorRow.price`, read from `price` on an `observed`
figure and `close` on a `stored` one). **Out of hours every mover row is a
stored close**, which is roughly 80% of the week — and the row carries no
session, no instant and no noun, deliberately:

- the basis is **uniform over the whole section by construction** (the producer
  takes one `MoveQualifier` for both lists), so it is one claim about the region
  rather than ten claims about rows;
- the price track is **80 px** and `2026-10-07 close` measures **82**, which is
  the measurement `.quiet .figure` was widened for after an honest sentence
  ellipsised into `2026-09-25 cl…`;
- the **change** beside it already works this way, and so does `Sector
performance` 200 px up, which has drawn session-basis moves with no per-row
  session since Story 4.3.

So the one home for _what these figures are measured from_ is **your footer**.
Your two grammars already key on `basis`, which is the same discriminator — the
clause you write for the `session` member is what makes the price honest, not
only the denominator. The reversal trigger recorded beside the field is a
condition: **the first frame whose movers rows do not share one basis**, at
which point the clause has to move onto a row that cannot hold it and the
geometry is owed a re-take.

### 2. The empty state is now REACHABLE ON EVERY GATED RUN, not just photographable

`marketMovers` deliberately does **not** collapse an empty section to
`undefined` (unlike `sectorPerformance`, which treats `sectors: []` as the
absence). So on CI — 518 securities, zero bars — the landing page draws your
466 px of labelled, empty box **on every run of `pnpm e2e`**, and the
`filledBy` sentence is gone there because the section is present. Task 4.5.3's
hand-off above is therefore no longer a photograph of a state: it is what the
browser suite looks at.

### 3. The `securities we track` copy defect is still on screen and is still yours

It was left **verbatim** by 4.5.5, with a comment in `MarketOverview.tsx`
saying so. Note what changed about _when_ a reader sees it: the sentence now
renders **only** in the rollback state — a frame present with no movers section
— because the first-paint state draws `MoversReservation` and every ordinary
frame draws the lists. It is rarer, not gone.

---

## What was done — 2026-10-08

### The sentence, in both grammars

One builder, `describeMeasuredSet` in the **new** `apps/frontend/src/market/measured-set.ts`,
read by **both** regions. The lead clause is byte-identical in breadth's footer
and in this one, because it is the same call; the movers footer adds a second
sentence saying that the lists are a selection from it.

- `observed` — _"Of the 503 companies we track, 466 were heard from in the last
  5 minutes. Both lists are ranked over those."_
- `session` — _"Of the 503 companies we track, 501 had a close-to-close move on
  2026-10-06. Both lists are ranked over those."_
- at `eligible === 0`, the tail becomes _"There is nothing to rank."_ and the
  count becomes `none` — which is the state a gated machine and most of a
  weekend reach.

**Every figure is read.** `tracked`, `eligible` and `windowMinutes`/`session`
all come off the frame's **movers** section, never breadth's. No feed word, no
venue, no instant — asserted in a unit test and again in the browser.

**The full stop is a decision, not a style.** The clause was drawn first as one
sentence joined by an em dash, and `Movers.test.tsx` went red: an em dash is
this region's **absence glyph** (an unranked row draws one) and the existing
test asserts there is none anywhere in the region. A clause joined by one would
have been the glyph's second drawer twelve pixels under a list that reserves
it, and the repair would have been to weaken somebody else's assertion.

### Why the figures are the MOVERS section's and not breadth's

The brief left this to be decided and said why. The decision is the movers
section's own `eligible` / `tracked`, and the reason is availability rather
than arithmetic: the two are the same number **by construction** (one
eligibility pass over one array, consumed twice, which
`breadth-is-counted-over-the-equities-alone` permits exactly one of), but
`encodeBreadth` drops the **whole** breadth section on one non-finite count —
which is precisely what `WireMoverLists.eligible` was added to survive. Reading
breadth's would be invisible in every state anybody photographs and would leave
the ranked list with no denominator in the one state the field exists for.

`measured-set.ts` is a third file rather than an export of `market-breadth.ts`
for the same reason: a movers module importing from a module named for breadth
is one refactor away from reading its figures.

### The pair, and what it renders today

`MoversClaim { drawn, spoken }`, built in one function. **They are equal in
every state this region has**, because it draws no ladder and prints no
denominator — there is nothing for the drawn half to defer to. `Movers.tsx`
takes `BreadthLedger`'s equality branch and renders **one element** when they
match; the inequality branch and `.spoken` (composing `visuallyHidden`) exist
so the two cannot diverge the day a printed figure in this region states the
denominator, and both branches are covered by a component test. Reversal
trigger recorded as a condition.

### The one-sided market

`None of the names we measured rose.` / `None of the names we measured declined.`,
laid **over** the room the five held rows already hold (a `position: relative`
wrapper per list, the sentence absolutely positioned inside it) so a market
going one-sided costs the region no height — which at 768 and 390 would have
stepped the whole lower page.

**The brief's candidate was `Nothing we heard from declined.` and it is not
what shipped.** _Heard from_ is the live grammar's phrase and is false about a
closed market, which is breadth's own recorded reason for having two grammars —
so the candidate carries the exact falsehood the two grammars exist to avoid,
in the state the market is in for 80% of the week. _We measured_ is true on
both bases (`MeasuredMove`, `eligibleMoves`, `WireBreadthCounts.measured` are
this product's own words for it), so the sentence needs no third grammar and
the basis stays in the footer where it has one home.

**It is suppressed when `eligible === 0`**, which is `BreadthClaim`'s rule at
N = 0: the footer then carries the whole truth and two more sentences would be
the same fact three times in one 466 px box.

**It cannot contradict breadth**: the lists are a selection from the same array
breadth's buckets are a tally of, so a row under `GAINERS` **is** a security in
`Advancing`.

### The head slot

`MoversMeta` now takes the view and **falls silent when nothing was selected**
— `SectorPerformanceMeta`'s precedent, which speaks only in the mixed state. A
bound stated over two empty lists reads as a claim about a selection that
selected nothing. A **short** list keeps it, because the bound is exactly what
says a short list is short because the market was one-sided rather than because
it was truncated. The slot's room is reserved by `.slot`, so nothing moves
either way and Task 4.5.7's badge still arrives into held room.

### The copy defect, and the invariant question answered

`MarketOverview.tsx`'s `filledBy` now reads _"The largest moves among the
**companies** we track…"_.

**The invariant cannot be widened, and that is recorded rather than claimed.**
`the-population-is-never-a-literal` fires on a **digit** inside a literal
containing `we track`, and this sentence has none — the defect is a wrong noun
with no figure anywhere near it. Two widenings were considered:

- **refuse `securities we track` by name.** It is keyed on today's incidental
  wording: green the day somebody writes _names we track_ or _tickers we
  track_, red the day the product legitimately says `securities we track` about
  the 518 — which it may, since `/securities` is a real surface about exactly
  that set. It forbids a string rather than a defect.
- **require the noun to be `companies`.** Same objection with the sign
  reversed, and it would make a true sentence about the universe unwritable.

There is no clause here the re-implementer cannot avoid writing: the population
is named in prose, the two nouns are both real sets in this product, and which
one is right depends on which set the **sentence** is about — which no grep can
read. So the guard is a comment in `MarketOverview.tsx` beside the sentence,
and this paragraph. **A claim about a mechanism reads identically whether the
mechanism is there or not**, so it is stated as an absence.

### The check, and the transcript of it passing wrongly

`the-ranking-states-its-own-denominator`, five clauses:

1. `movers.ts` names `eligible`, `tracked` and `describeMeasuredSet`;
2. `measured-set.ts` names `windowMinutes` and `session` — so the window and
   the session are read in the one builder rather than spelled at a call site;
3. neither movers file names `breadth`, by import or by field;
4. every rendering of the clause in `Movers.tsx` is rooted at `view.claim`;
5. the footer element carries no `aria-hidden`.

Each is _exactly one, or report it_.

**Clause 4 is there because the first draft passed wrongly on the defect the
next story writes.** Transcript, verbatim — the check as first written, against
`Movers.tsx` taking a `claim: MoversClaim` prop and `MarketOverview.tsx`
handing it `breadth.claim`:

```
=== first draft of the check, against the defect the next story writes ===
46 invariants hold.
```

With clause 4 added, the same tree reports one failure, naming every rendering.

**Two breaks registered** — `the-rankings-denominator-is-silenced` (the footer
swept into `aria-hidden` beside siblings that legitimately carry one) and
`the-ranking-reads-the-breadth-denominator` (`count: breadth.measured`). Both
**went red** on the clause they prove. Note that `pnpm break` itself **refuses
a dirty target** and this change is uncommitted, so the two were performed by
hand with the registry's own `find` / `replace` text and the registered
command; the harness run is owed on the commit.

### The accessibility-tree evidence

`Accessibility.getFullAXTree` over a CDP session against the deployed-shaped
local page, verbatim:

```
=== AX nodes mentioning 'we track' ===
heading      ignored=false  "OF THE 503 WE TRACK"
StaticText   ignored=false  "Of the 503 companies we track, 503 had a close-to-close move on 2026-09-11."
StaticText   ignored=false  "Of the 503 companies we track, 503 had a close-to-close move on 2026-09-11. Both lists are ranked over those."
```

The third is this region's, `ignored=false`, inside `region "Movers"`. It is
now asserted permanently by
`e2e/specs/overview-movers-denominator.spec.ts`'s second test, which reads the
same tree rather than the DOM — `toContainText` passes over an `aria-hidden`
subtree, so the DOM is correct in both the working and the broken version.

### Geometry — measured, not argued

`pnpm probe / --within Movers --all` at 1440, 1024, 768 and 390: `.claim` is
**32 px at every width**, which is the two-line reserve exactly, and
`Region.content` is **369 px** at every width — unchanged from before the
sentence existed. The per-list sentence is absolutely positioned, so it adds
nothing. Photographed at 390 in the empty state and at 1440 in the one-sided
state.

## What was found that the brief had wrong

1. **4.5.5's hand-off is false where it says the basis is uniform over the
   section.** The `MoveQualifier` is uniform; the **rows** are not. On the
   `session` basis `eligibleMoves` reads a close off the `live` member too (by
   design) and `figureOf` maps a `live` entry to an **`observed`** figure — so
   an evening frame mixes rows drawing the last trade with rows drawing the
   session's close, and their per-row `basis` strings differ. The clause this
   task was handed — _say what session the prices are from_ — would therefore
   have been **false for most of the evening**. The sentence that shipped names
   the set and the question instead, which is true of every row on either
   basis. The correction is written into `SectorRow.price`'s docblock and into
   `TASK-05`'s own file, with the trigger re-raised and narrowed: _the first
   surface that needs a reader to know which of the two a row's price is._
2. **The brief's candidate empty-list sentence is basis-dependent** and would
   be false out of hours — see above.
3. **The brief asks for both clauses to "read the same frame fields".** They
   read the **same words** from one builder and **different fields** of one
   frame, deliberately, and the reason is the breadth section's droppability.
   The thing a check can assert is the one producer, and it does.
4. **An em dash was unavailable** for joining the clause — the region reserves
   that glyph for a refused rank.

### The breaks, run through the harness on a clean tree — 2026-10-08

Owed by this task's own caveat: `pnpm break` refuses a dirty target, so the
two new entries were performed by hand during the work and through the
registry's own harness immediately after the commit. Both red, both restored
byte-identical:

```
$ node scripts/break-verify.mjs the-rankings-denominator-is-silenced
✓ apps/frontend/src/components/Movers/Movers.tsx broken → red → restored byte-identical.
  matched: hides the region's only denominator

$ node scripts/break-verify.mjs the-ranking-reads-the-breadth-denominator
✓ apps/frontend/src/market/movers.ts broken → red → restored byte-identical.
  matched: reaches the breadth section
```

**The caveat generalises and is worth the line.** Every task in this story has
hit it: the break harness refuses a dirty target, and the file a new check is
written around is always dirty while the check is being written. The honest
sequence is **commit, then break, then amend** — which is what happened here,
and the by-hand run during the work is what made it safe to commit at all.
