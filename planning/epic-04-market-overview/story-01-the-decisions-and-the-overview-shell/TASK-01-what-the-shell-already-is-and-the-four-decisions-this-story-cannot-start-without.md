# Task 4.1.1 — What the shell already is, and the four decisions this story cannot start without

**Status:** **Complete — 2026-09-25. Three decisions answered, one booked, and the route's own record verdicted line by line.** The shell is further along than this story assumed and **one claim in the story was wrong**: the `filledBy` sentence on the breadth region names **Epic 4** rather than a later epic, so the screen has been promising this epic's work by name since Task 1.5.4. Two surfaces say the same thing — the `Placeholder` above the regions is a second home for what the regions already carry — and that is Task 4.1.3's to remove rather than 4.1.4's.
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** —

## Objective

**Read before building, and ask before deciding.** This story was written from
`PRODUCT_SPEC.md` §9 and Epic 4's `EPIC.md`; neither of them describes the
landing route as it exists in the tree **today**, and the tree is further along
than the story assumes.

## What the user can see when this lands

**Nothing** — and the two tasks after it are cheaper because of it.

## What is already there, to be confirmed rather than assumed

`apps/frontend/src/routes/MarketOverview.tsx` is not an empty placeholder. Task
1.5.4 put a **region structure** around it, and the file's own comments record
decisions this story would otherwise re-take:

- **A `Region` component with a `name` and a `filledBy` sentence**, which is
  already ADR 0029's defer rule in a component. **Three regions defer correctly
  today** — the topology to Epic 6, unusual activity to Epic 5, investigations
  to Epic 7 — and one names **this epic**.
- **Two of §8.1's contents deliberately have no region at all.** The file says
  why: _"where they belong is a question about their shape, and Epic 4 is the
  first thing that will know it. Adding two more empty boxes now would be
  guessing."_ The index/ETF summary and sector performance are **this story's to
  place**, and that sentence is the instruction.
- **Story 1.4's render check occupies the topology region**, and it is
  **load-bearing** rather than decorative: the `@marketpulse/shared` import in
  that file is the only thing proving the workspace dependency resolves through
  **the bundler** as well as through `tsc`, and Task 1.5.1 recorded ~100 kB of
  artefact that routing it out would quietly reclaim.

**Confirm each of these against the file rather than against this list**, which
is the same instruction Epic 3's closes kept earning.

## The four questions, to be put to the owner with their options priced

Each is written in `STORY.md` with its alternatives. This task's job is to put
them in front of the owner **with what is measured beside them**, and to record
the answers where the story that needs them will read them.

1. **The denominator** — what _current_ means. Task 4.1.6 measures the shape of
   the answer; this task establishes that the question is open and that four
   stories depend on it.
2. **Where an aggregate is computed** — backend `currentMarketState` or the
   browser's `LiveFeedView.observations`.
3. **The 390 fold** — owed a person before this epic ships a screen. Task 4.1.7
   takes it; this task books it.
4. **Whether this screen re-orders under live data.**

> **Two of the four are answerable today and two are not**, and saying which is
> the useful output. A decision recorded as _taken_ when it was in fact assumed
> is the shape Epic 3 produced twice.

## Work

- The route file read end to end, and every decision its comments record listed
  with a verdict: **still true**, **this story's to change**, or **false**
- `PRODUCT_SPEC.md` §8.1 and §9 compared against what the regions currently are
- The four questions put to the owner, with options and costs
- Answers written into `STORY.md`'s _Open decisions_ section **and** into the
  task that consumes each one — a pointer back is what a reader follows when
  they already know to look

## Done when

1. The route's existing decisions each have a verdict
2. The two unplaced §8.1 contents have a named owner task
3. Four questions have four answers, or a recorded reason a question cannot be
   answered yet and what would answer it

---

## What was done — 2026-09-25

### The route, read end to end, and every decision in it verdicted

`apps/frontend/src/routes/MarketOverview.tsx` is 246 lines, of which about 90
are comments recording decisions. Each one, with a verdict:

| What the file records                                                                                     | Verdict                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `Region` component with `name` + `filledBy` — ADR 0029's defer rule as a component                      | **Still true**, and it is the idiom 4.1.3 extends rather than replaces                                                                                                 |
| Four regions: topology → Epic 6, unusual activity → Epic 5, breadth → **Epic 4**, investigations → Epic 7 | **Still true**, and see the correction below                                                                                                                           |
| Two of §8.1's contents deliberately unplaced, because _"Epic 4 is the first thing that will know it"_     | **This story's to change** — 4.1.2 decides the shape, 4.1.3 builds them                                                                                                |
| Story 1.4's render check kept in the topology region                                                      | **This story's to change** — 4.1.4, with the trap intact                                                                                                               |
| The `@marketpulse/shared` import is the only proof the workspace resolves **through the bundler**         | **Still true, and confirmed**: `ANOMALY_BANDS`, `FEED_STATUSES`, `toTicker` and `AnomalyBand` are used **only** by the render check, so deleting it deletes the import |
| §9's shape — a dominant primary area, a narrower right column, a lower band                               | **Still true** as a sketch; 4.1.2 turns it into a grid with stated spans                                                                                               |
| `Region` is a named `<section>` so it is a `region` landmark                                              | **Still true**, and load-bearing: several unnamed ones is what axe reports as `landmark-unique`                                                                        |

### One correction to this story, and one finding the story did not anticipate

**The correction.** This task's own brief says three regions defer to later
epics _"and one names this epic"_. That is right, and the story above it reads
as though the shell defers everything to somebody else. **It does not**: the
breadth region has said _"Epic 4 fills this with advancing, declining and
unchanged counts once there is live market data behind them"_ since Task 1.5.4.
**The screen has been promising this epic's work, by name, for weeks** — which
raises the bar for Story 4.4 rather than lowering it.

**The finding.** There is a **fifth surface** above the four regions: a
`Placeholder` whose prose describes the whole screen — _"index and ETF
summaries, an unusual activity feed, market breadth, sector performance and the
topology. Epic 4 builds it on live data…"_ — which is **the same claim the four
`filledBy` sentences make, in one more place.**

> **One fact, one home** (ADR 0029). Today it is harmless, because the regions
> are all deferrals and the paragraph summarises four deferrals. **The moment
> 4.1.3 and 4.2 make regions real, it becomes a paragraph describing a screen
> that no longer matches it** — and this product has shipped exactly that twice:
> a chrome cell and a ledger both inheriting a word that had stopped being
> true.
>
> **So it is Task 4.1.3's to remove, not 4.1.4's**, and that is the one change
> this task makes to the split.

### The four decisions

**Three answered by the owner, one booked.** They are recorded in `STORY.md`
with the rejected options and, more importantly, **written into the file of the
story that consumes each one** — because a pointer back is what a reader
follows when they already know to look, and the enumeration this product runs
at every close has caught a missed hand-off on all five of its runs.

| #                      | Answer                                                                                         | Written into                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **1. The denominator** | a **stated freshness window** — _of the 518 we track, N were heard from in the last M minutes_ | Story 4.4, and Task 4.1.6, whose brief is now narrower         |
| **2. The seam**        | a **new frame on the existing socket**                                                         | Story 4.2, with ADR 0031 and ADR 0033 named as what governs it |
| **3. The 390 fold**    | **booked, not answered** — it needs a phone during a session                                   | Task 4.1.7, unchanged                                          |
| **4. Re-ordering**     | **re-rank, and mark what moved**                                                               | Story 4.5, which owns the treatment; Story 4.3 inherits it     |

**The two rejected options worth recording**, because the reasons date rather
than the choices:

- **The browser could compute everything with no new wire** — and
  `PRODUCT_SPEC.md` §5.1 says the LLM never calculates and every number comes
  from deterministic code, with §17's tools all backend tools. **Epic 5's
  anomaly scores cannot live in a browser**, so a seam built there would be
  rebuilt one epic later. Beside that, four aggregate regions would land in the
  same tick Task 3.6.5 measured at 37–40 ms for the table alone, on the page
  Epic 14's trigger names by condition.
- **The three-way breadth count** — up, down, and not heard from — is the more
  honest-looking option and needs `unchanged` and `unobserved` told apart on
  screen, where §9 already sketches three percentages including `unchanged`.
  **The window keeps the spec's shape and puts the honesty in a sentence**, and
  it is the option that degrades legibly when the feed thins at lunchtime,
  which is exactly what 4.1.6 is measuring for.

### What this task changed about the plan

- **Task 4.1.3 gains the `Placeholder` removal**, which nothing owned.
- **Task 4.1.6's question is narrower**: not _what shape_ but _what is M_, with
  the five windows to sample named.
- **Stories 4.2, 4.3, 4.4 and 4.5 each start from an answer** rather than from
  a decision they would have taken independently — which is the whole reason
  this task runs first.

### Gates

Documents only. `pnpm links` green — **452 documents, 1,638 links, 0 broken**.
`pnpm invariants` green at 27.

## For a stakeholder — a status report, 2026-09-25

### Where the product is

**The live-market phase closed yesterday.** MarketPulse shows a real market
moving: 518 companies with prices that update on their own, charts that extend
minute by minute, and an indicator that says plainly when the data stops
arriving.

**This week begins the landing page** — the screen §8.1 of our specification
calls the front door, and the one that answers _what is happening_ without
making somebody pick a company first.

### What this task was

**Reading before building, and asking before deciding.**

The plan for this screen was written from the specification. Before anybody
started work, this task opened the **actual code** — and found the screen is
further along than the plan assumed. A structure of named regions already
exists, three of them already say honestly which future phase fills them, and
**one of them has been promising this phase's work by name for weeks**.

> Two hours of reading removed a rebuild from the plan and found something
> nobody had listed: **the screen says the same thing in two places**. Today
> that is harmless — a summary paragraph above four honest placeholders. The
> moment the first region becomes real, that paragraph starts describing a
> screen that no longer exists, and this product has shipped exactly that
> mistake twice before.

### The decisions, in plain terms

**Where the market's summary numbers are worked out.** Four regions of this
screen — sectors, breadth, movers, indices — are all sums over the same data.
We chose to compute them **once, on the server, and send them down the
connection that already carries the prices**, rather than having every visitor's
browser do the arithmetic.

The cheaper option was the browser, and we turned it down for a reason that has
nothing to do with speed: **our own product rules say the AI never calculates**
— every number a user sees comes from code we can point at. The analytical
tools the AI will use in a later phase are server tools, so a calculation built
in the browser would have to be built again within one phase.

**What "right now" means when a third of the market is quiet.** Our market feed
is one exchange's view, and on a typical minute about **two-thirds** of the
companies we track have reported. So "42% of the market is falling" has a
hidden question in it: _out of how many?_

We chose to **say it out loud**: _of the 518 we track, N were heard from in the
last M minutes_. The number M is not being guessed — a later task measures how
many companies are heard from within one, two, five, fifteen and sixty minutes
**across a whole trading session**, because a window that looks fine at the
opening bell can embarrass us at lunchtime.

**What happens to a "biggest movers" list while you're reading it.** It will
re-order live, and **mark what moved**, rather than freezing or updating on a
slow timer. A list whose figures and positions disagree is worse than one that
moves honestly.

**And one question we deliberately did not answer**: on a phone, the only thing
that tells you the feed has stopped sits at the bottom of the screen. Whether a
person actually _notices_ it change is not answerable from a screenshot, so it
stays booked for somebody with a real phone during market hours.

### Why this unlocks the next five pieces of work

Each of the next five stories fills one region of this screen — and every one
of them needed these answers. Without them, five pieces of work would each
decide independently what _current_ means, and this screen would ship with four
different answers to one question.

**They now start from a decision rather than a discussion**, and each of them
puts something visible on the page: the shell, four index figures, eleven
sectors, breadth, and the movers.
