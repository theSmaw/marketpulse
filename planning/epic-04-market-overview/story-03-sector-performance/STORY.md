# Story 4.3 — Sector Performance, & the Benchmark That Is Not an Average

**Status:** **In progress — 2026-09-27.** Decomposed into eight tasks; four decisions taken at Gate 1.
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.2
**Epic scope covered:** sector performance

## Description

**Eleven sector SPDRs, ranked by today's move — and the caveat that makes this
screen honest rather than merely correct.**

~~`UNIVERSE.md` §5, quoted in this epic's own `EPIC.md`: **the sector SPDRs hold
S&P 500 constituents only.**~~

> **Falsified 2026-09-27, and swept the same day.** The claim above is **not
> true and has not been since 2026-09-08.** `UNIVERSE.md` §5 carries a dated
> amendment: the universe **is** the S&P 500 (503 equities plus the eleven
> sector SPDRs and four index proxies), the classification comes from that
> index's own published GICS assignment, and _"the objection this section raises
> against ETF-derived sectors — that the SPDRs hold index constituents only — is
> **dissolved rather than worked around, because the universe IS the index**."_
> §16.3 records **127 of 127 sub-industries mapped, 0 sector mismatches**. There
> is no tracked equity outside the index to have a sector and not be a
> constituent.
>
> **The decision it was used to justify is unaffected** — a sector row is the
> ETF's own move — but its reason changes, and **the caveat that actually
> survives is WEIGHTING**: XLK is cap-weighted, and the technology names we
> track counted equal-weighted are a different number. That divergence is
> permanent and has nothing to do with membership. The second survivor is that
> **the fifteen ETFs' own classification is hand-curated** (§16.3 — neither
> source classifies a fund), which is the only live thread to
> `classification_retrieved_at`.
>
> **How it survived: §5 was cited without its amendment being read** — including
> by the 2026-09-27 reassessment, which quoted it as a live constraint. That is
> the citing-rather-than-measuring failure `CLAUDE.md` names, and the amendment
> had been sitting at the top of the cited section for nineteen days.

**The original framing, kept because the decision below rests on it:**

**The sector SPDRs hold S&P 500 constituents only.** A tracked equity outside the index has a sector,
has a benchmark, and **is not a constituent of that benchmark**. That is fine
for a relative-move comparison and wrong for anything treating the ETF as the
sector's complete membership — _"which a sector-performance panel is exactly
the shape to assume."_

**So this story has to decide what a sector row IS**, and the two candidates
are different products:

| The row is…                                          | Means                                                    | Honest label                         |
| ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| **the ETF's own move**                               | one security, complete, exact                            | _XLK, the sector's benchmark ETF_    |
| **an aggregate of our tracked names in that sector** | our universe, incomplete, subject to the IEX denominator | _the N names we track in Technology_ |

**They will disagree**, routinely and legitimately, and a screen showing one
while implying the other is precisely the class of defect this epic's `EPIC.md`
was written to prevent.

> **And a sector reclassification has no symptom at all** (`UNIVERSE.md` §12).
> A name moving Technology → Communication Services fails nothing and is
> counted in the wrong row indefinitely, correctly-looking. The mitigation is
> `classification_retrieved_at`, which Story 2.14 already puts on screen for a
> security — **this story decides whether an aggregate owes the same date**,
> and answers it in writing either way.

## What the user can see when this story lands

**Eleven sectors, ordered by how they are doing today**, each with its move,
its direction carried by more than hue, and — if the aggregate option is chosen
— **how many names that figure is computed over**, because a figure over 24 of
30 names is a different claim from one over 30.

**The strongest and weakest sectors are readable at a glance**, which is half
of §1's _what is happening_ and the first thing on this screen that tells a
reader something they could not have got from the security page.

**What they still cannot do:** breadth (4.4), the movers (4.5), or click a
sector through to anything (4.6).

## Why it sits here in the sequence

**Before breadth, because it is the smaller version of the same problem.**
Eleven rows, each an aggregate with a denominator, is where the denominator
decision gets tested against something a person can sanity-check by eye —
whereas a single breadth percentage over 518 names cannot be checked by anybody.

## Acceptance criteria

1. Eleven sectors render, ranked, at four widths, live during a session and
   from the store outside one
2. The **row's meaning is stated on screen**, and the alternative it is not is
   impossible to mistake for it
3. If the aggregate option is chosen, **the count the figure covers is
   visible**, and a sector with no fresh observations says so rather than
   reading as flat
4. The classification-date decision is recorded with its reversal trigger as a
   condition
5. Ranking is stable under live data in the way Story 4.5 decides — this story
   does not invent a second rule
6. Per-row work is sized against the universe from the first line (Epic 14's
   trigger, and this screen is the page it names)

## Design work

**A ranked list of eleven rows with a signed figure is a new component**, and
the canvas has nothing like it: `Universe navigation.dc.html` is a table that
never re-orders, which is the opposite promise.

Draw it with the movers in mind (4.5) — **one ranked-list component with two
uses is a design decision; two components that look similar is an accident.**

## Out of scope

Per-sector drill-down (Epic 6's topology and the Security Explorer), breadth
inside a sector (4.4 decides whether that exists at all), and anomaly scores
(Epic 5).

## Amended by Task 4.1.1 — 2026-09-25: two decisions this story inherits rather than takes

- **The aggregate arrives in a frame**, computed once in the backend (Story
  4.2's seam). This story consumes it rather than computing eleven sector
  figures in a browser.
- **Ranking re-orders and marks what moved** (Story 4.5's treatment). This
  story does not invent a second rule for its eleven rows — one ranked-list
  component, one behaviour.

## Handed to this story by Task 4.1.8 — 2026-09-25: where an aggregate is computed

**The hand-off enumeration found this story's file did not carry it.** The
decision was taken in Task 4.1.1 and this story is one of the four that acts on
it.

**An aggregate is computed on the BACKEND and arrives as a new frame on the
existing market-stream socket.** Not a second fetch, not a poll, and not a
computation in the browser over 518 securities.

**Three things follow, and they are what this story has to build against:**

- **There is no request to make.** The socket the chrome already holds is the
  transport; this story's surface subscribes and renders what arrives. A
  `useEffect` that fetches is the wrong shape and will look right in every test
  below `pnpm e2e`.
- **The frame is Story 4.2's to define and document**, including whether it
  owes an ADR of its own. This story reads it.
- **A browser that recomputes an aggregate over 518 rows on every tick is a
  main-thread task** on the page `PRODUCT_SPEC.md` §28 is least able to afford
  one. That is the measured reason the decision went the way it did, not a
  preference.

## Handed here by Story 4.2's close — 2026-09-26: the seam exists, and two decisions are yours

**The join is built and you are its second consumer.**
`apps/backend/src/market-overview.ts`'s `buildMarketOverview` takes a **symbol
list**, the current-state map, a `closesAsOf(session)` lookup and an `asOf`
instant, and returns a three-member union per symbol — `observed` (with the
change already computed), `stored`, `unknown`. It is **pure**: no clock, no
socket, no repository handle, which is what makes invariant 4 structural rather
than remembered. **Do not give it a handle.**

**Decision 1: do sectors share the `overview` frame, or get their own type?**
One screen at one cadence should carry one `computedAt`, which argues for one
frame with optional sections — but four regions widening one payload is a bag.
Either way it is a wire decision and **ADR 0038**
governs it.

**Decision 2: `one-producer-of-the-overview-aggregate` permits at most ONE call
site.** Wiring a second aggregate means either routing through the existing
builder or changing that invariant **and re-running its break**.

**And the defect its sibling guard was written against is the one you are most
likely to commit.** `one-home-for-the-live-change` exists because an author
reaching for `readLastCloses` holds `LastClose` — same shape as the wire's
`SecurityLastClose`, **no `session`**, different name — and therefore cannot
call `changeFromClose` without converting first. A hand-written
`sector-performance.ts` doing `((observed.bar.close - close.close) / close.close) * 100`
was written out and **passed green** until the guard was keyed on the _readers_
of the closes and on **the division itself**. Convert, then call
`changeFromClose` from `packages/shared`. A second implementation fails the
build.

## Reassessed 2026-09-27 — a decision taken, a decision moved here, and a task added

**A sector row is the sector ETF's own move, labelled as the benchmark.** The
owner decided this rather than an aggregate of the names we track. Eleven named
securities through `buildMarketOverview({ symbols: theElevenSectorETFs, … })`,
exact, complete, and **checkable by eye against any public quote** — so this
story has **no denominator at all** and is one more caller of the seam rather
than a new mechanism.

**That makes `EPIC.md`'s original reason for putting you before 4.4 false**, and
it has been replaced there rather than left standing: you do not rehearse 4.4's
denominator problem, because you do not have one. What you are is **the first
surface in this product ranked by a live value**, which is why you still come
first.

> ~~**And the sector ETFs hold S&P 500 constituents only** (`UNIVERSE.md` §5)~~
> — **false, see the falsification at the top of this file; the surviving
> caveat is weighting, not membership.** A
> tracked equity outside the index has a sector, has a benchmark, and is **not a
> constituent of it**. Labelling the row as the **benchmark** is what keeps that
> honest; anything implying the ETF is the sector's complete membership is the
> defect a sector panel is shaped to commit.

### You now own the ranked list and the re-order treatment — 4.5 does not

Your AC 5 deferred the rule to **Story 4.5, two stories later**, which left three
bad options: an untreated re-order (the defect Task 3.6.3 forbade in as many
words — _a row that moves while it is being read is a row that cannot be read_),
no ranking at all, or a rule invented and retracted.

**Decide it here, on eleven rows**, which is a smaller and safer set than a
top-N over 518. What is unsettled and is now yours: what the mark is, how long it
lasts, what happens when several rows move at once, what `prefers-reduced-motion`
leaves, and **what protects a row under a pointer or a focus ring**. The motion
vocabulary is settled and is not reopened — work in progress LOOPS, a state
PERSISTS, a fact arriving DECAYS — and `The mark multiplied by five hundred.dc.html`
records a synchrony risk as **accepted rather than disproved**, which is live
here at eleven.

**Also inherited from 4.2:** before any sitting, **read from the gateway whether
a small set's bars arrive in one `bars` frame or across several** of the ~16 a
minute. Four in one frame is a synchronised wave; four across several is a
stagger the data genuinely has. A rehearsal that cannot say which was watched
cannot answer anything.

### The frame-grain decision is yours, and it must be taken across all four payloads

ADR 0038 hands you the re-take of _one frame with optional sections vs one type
per region_ — **and your own payload cannot inform it.** From ADR 0038's verbatim
frame, 431 bytes for four figures, ≈108 bytes each:

| Region                   | Naive per-figure payload        | At up to ~16 frames/min      |
| ------------------------ | ------------------------------- | ---------------------------- |
| proxies (today)          | 431 B                           | **6.9 KiB/min**, measured    |
| **sectors, 11 figures**  | ~1.2 KB                         | ~19 KiB/min                  |
| **breadth, 518 figures** | **~56 KB**                      | **~875 KiB/min per browser** |
| movers, top-N            | small **if** ranked server-side | small                        |

**Sectors is the only region where the naive answer survives contact.** So the
rule to state is _each region ships the smallest thing that answers it_ —
breadth ships **counts**, movers ships **the top N** rather than the ranking's
input. A grain decided at eleven and discovered wrong at 518 is a wire change
across four decoder branches and `sameLiveFeedView`. And **every overview frame
is decoded on all five routes**, so a 56 KB frame would reach `/replay`.

### One task added: the index label in the proxy strip's third row

The canvas draws `S&P 500` / `Nasdaq 100` / `Dow 30` / `Russell 2000` in each
proxy cell's third row; the product has no such field, so the row is permanently
blank in the ordinary live state and a cell fills **20–48% of a 325 px track** at 1440. **Four curated labels beside the index-proxy set** — no migration and **no
wire field**, because a name is a static property of a symbol rather than a
reading, and `sentAt`'s third constraint is the precedent.

**Declare it as _the index this fund tracks_**, so it is visibly a different fact
from the fund's legal `name` (`Invesco QQQ Trust, Series 1`) rather than a second
home for the same one — which is the judgement the owner took on 2026-09-27 and
the thing this product otherwise refuses.

## Decomposed 2026-09-27 — eight tasks, and the title changed with the premise

**Renamed from _"The Benchmark That Is Not a Membership"_.** That premise was
falsified — see the strike-through above — and the caveat that survives is
**weighting**: XLK is cap-weighted, and the technology names we track counted
equal-weighted are a different number, permanently, and for reasons that have
nothing to do with membership. The directory name never carried the subtitle, so
no path or cross-reference remap was needed.

### The four decisions the owner took at Gate 1

1. **`.regions` becomes `min-height: 82vh` with `grid-template-rows: 19vh auto
auto`.** Measured: the sector region is **265 px**, leaving ~**180 px** of
   body for eleven rows — **16.4 px a row**, below this product's own dense
   leading — and `Region` passes `scrollable` unconditionally, so the default
   behaviour was a silent scroller hiding the weakest sector. Row 1 keeps a
   resolved box for Epic 6's canvas. **This reverses part of Task 4.1.3**, whose
   `height` was argued against `min-height` explicitly — but that argument is
   about the topology's WebGL box, and its closing clause (_"§9's proportions
   disappear the moment one region holds more than another"_) describes the
   correct behaviour rather than a fault. It also fixes `Movers`, which has the
   identical box and needs ten rows plus two headings.
2. **Outside a session a stored figure carries the last completed session's
   close-to-close move**, labelled as such. `WireStoredFigure` carries no change
   today, so AC 1's _"ranked … from the store outside one"_ was **unsatisfiable**
   — and the market is shut for roughly 80% of the week, which is when this
   region is the only surface answering `EPIC.md`'s exit criterion.
3. **The order is held while a pointer is over the list or focus is inside it**,
   labelled `ORDER HELD`, with the figures and the rank numbers **still
   updating**. This is narrower than the _freeze the ranking while hovered_
   option rejected at Task 4.1.1: nothing on screen becomes false, and the
   mismatch between printed ranks and vertical order **is** the pending
   re-order, readable with no motion and in greyscale.
4. **The title.**

### Taken from the record without a question, and recorded so they are not re-opened

- **The rank is printed as a number.** The keystone: it converts position from
  something encoded only by y-coordinate into a **stated fact** that survives
  `prefers-reduced-motion`, greyscale, a screenshot and a reader who looked
  away — and it is what makes this list structurally different from the 518-row
  table Task 3.6.3 froze, which prints no ordinal and where a move is therefore
  unrecoverable.
- **The ticker is on the row.** The owner's whole argument for the ETF row is
  that it is checkable by eye against a public quote, and `Technology +0.42%` is
  checkable against nothing. It is also the only defence against a
  **permutation** — eleven correct figures against eleven wrong labels, which
  satisfies every arithmetic guard, passes every state grid and is invisible in
  greyscale.
- **Two figures that read the same on screen never swap.** Eleven sector ETFs
  cluster tightly; two sectors 0.003% apart would trade places on every frame,
  ~16 times a minute, both reading `+0.41%` throughout. Keyed on display
  precision rather than a chosen threshold, and it buys a checkable invariant:
  **the displayed order never contradicts the displayed figures.**
- **`overview.sectors` is a new key.** Never appended to `figures` —
  `marketProxyStrip` folds over that whole array in **five** places, so eleven
  sector ETFs would join the proxy strip, move `newest`, and silently break
  `sharedBasis` and `sharedClosingSession`, with no compile error and no test
  failure. And never renamed, because `readOverview` requires `figures` and a
  stale tab would decode the frame as `unreadable`, re-rendering the application
  on every frame.
- **The label column is fixed at 144 px, never `max-content`** — otherwise a
  re-order moves all eleven bars' origins, invisibly to everything below a
  browser. `Communication Services` measures 143.75 px at 13 px in the text
  face.
- **No fourth mark.** A mark saying _this row moved_ is information a reader can
  only use by remembering where it was. The **movement** carries both positions;
  the **ordinal** is the persistent record; under reduced motion the row simply
  is in its new place with its new number, and nothing is lost.
- **The bar is adopted, and the reason is not "eleven instead of four".** Story
  4.2 refused it because four indices are not proportions of one shared
  quantity. Eleven sector ETFs all carry today's percent change on the same
  basis over the same interval, so **the ratio of two bars is the ratio of two
  moves** — a true statement. Central zero anchor, a printed stepped ladder
  (`±1 / ±2 / ±5 / ±10%`, smallest step containing all eleven, stepping outward
  only within a session), **no** frame-max normalisation, and **no bar at 390**,
  where 25 px each side of zero is a tick rather than a bar.
- **Bar off for movers** — a top-N over 518 has a far wider dynamic range and
  the top five are near the top of it by construction, so a bar over them
  carries almost no information. A real difference, not a taste.
- **No `classification_retrieved_at`.** No security's curated `sector` field
  enters the figure. Reversal trigger, as a condition: **the first sector figure
  on this screen computed over securities' `sector` field.**
- **No live region**, on **three** reasons rather than four: `/` has **zero**
  today (counted — all three `role="status"` regions are on the security
  routes), so `FRONTEND-STATE.md` §7's region-count reason does not apply here,
  and the strongest surviving reason is different — the rank is a printed number
  inside a real `<ol>`, so a listener gets _"list, 11 items, item 3 of 11"_ from
  the platform.
- **Never re-order with CSS `order` or `grid-row`.** That divorces the
  accessibility tree from the screen and hands a screen reader a **different
  ranking** — invisible to axe, to jsdom and to a screenshot. DOM order equals
  visual order is a correctness requirement here, not a preference.
- **A first order is not a re-order.** `arrivalKey`'s shipped rule with one word
  changed: a row is marked only if it had a previous rank **under the same
  basis**, so the first order a browser draws is drawn flat and the opening
  bell's wholesale basis change is a new list rather than eleven simultaneous
  re-orders.
- **Epic 14's trigger does NOT fire.** Its condition is _per-row markup at
  universe scale_ and eleven is not that. Recorded in writing because somebody
  will claim it fired.
