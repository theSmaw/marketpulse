# Story 4.1 — The Decisions This Screen Cannot Be Built Without, & the Overview Shell

**Status:** **Split into eight tasks — 2026-09-25.** The order puts a **visible change third** and keeps the two expensive unknowns — the denominator curve and the phone — off the critical path of the screen itself, because neither blocks drawing it and both block the four stories after it.

| #     | Task                                                                                                                                                                             | Visible?                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 4.1.1 | [What the shell already is, and the four decisions this story cannot start without](TASK-01-what-the-shell-already-is-and-the-four-decisions-this-story-cannot-start-without.md) | no — and it removes work          |
| 4.1.2 | [The canvas: the overview's grid, and the two regions nobody has placed](TASK-02-the-canvas-the-overview-grid-and-the-two-regions-nobody-has-placed.md)                          | a picture, before the build       |
| 4.1.3 | [The two regions that were waiting for a shape](TASK-03-the-two-regions-that-were-waiting-for-a-shape.md)                                                                        | **yes**                           |
| 4.1.4 | [The render check retired, and the bundler proof kept](TASK-04-the-render-check-retired-and-the-bundler-proof-kept.md)                                                           | **yes — the screen gets quieter** |
| 4.1.5 | [One home, and what this screen must not add](TASK-05-one-home-and-what-this-screen-must-not-add.md)                                                                             | nothing new, nothing duplicated   |
| 4.1.6 | [The measurement the denominator decision cannot be taken without](TASK-06-the-measurement-the-denominator-decision-cannot-be-taken-without.md)                                  | no                                |
| 4.1.7 | [The 390 question, asked with a phone in hand](TASK-07-the-390-question-asked-with-a-phone-in-hand.md)                                                                           | no, or a repair                   |
| 4.1.8 | [The decisions recorded, the sweep, and the close](TASK-08-the-decisions-recorded-the-sweep-and-the-close.md)                                                                    | no                                |

> **The split's own finding, from writing it: the shell is further along than this story assumed.** Task 1.5.4 already built a `Region` component with a `filledBy` sentence — ADR 0029's defer rule in a component — and **three regions already defer correctly**. What is actually owed is **two regions Task 1.5.4 deliberately did not place**, naming this epic as the thing that would know their shape, and **retiring Story 1.4's render check without dropping the bundler proof it carries**.
> **Epic:** [Epic 4 — Market Overview](../EPIC.md)
> **Depends on:** Epic 3
> **Epic scope covered:** the landing route itself; the regions §9 names; live market status indicators (inherited rather than rebuilt)

## Description

**Four of this epic's numbers are aggregates, and an aggregate is the one kind
of number that can be wrong while looking right.** Epic 4's `EPIC.md` already
carries three measured warnings from Epic 2 and Epic 3 — the IEX denominator,
the sector ETFs' membership, and classification drift — and every one of them
is a **decision this screen has to take and state**, not an implementation
detail to be discovered by whoever writes the first `filter`.

So this story does what Story 3.1 did for the live feed: **it takes the
decisions in writing, before anything computes anything**, and it leaves a
screen behind rather than only a document.

**The screen it leaves is the shell.** `PRODUCT_SPEC.md` §9 sketches a landing
page of six regions, of which **this epic fills four** and two belong to later
epics — the topology is Epic 6's and the unusual-activity feed is Epic 5's.
Today `/` is a placeholder naming Epic 4 by name; after this story it is the
**real** screen with its regions drawn, its clock and feed cell in place, and
every region that has no data yet saying so in the product's own established
words rather than with a spinner that never resolves.

> **This is ADR 0029's fourth rule applied to a whole screen for the first
> time.** A surface that owns nothing defers, points once and stops, and never
> says nothing. Four regions will be honest placeholders on the day this lands,
> and the difference between _this region is empty_ and _this region belongs to
> a later epic_ is a sentence a reader can act on.

## What the user can see when this story lands

**A landing page that is a page.** Open `/` and there is a screen with the
market's own shape on it: a region for the index proxies, one for sectors, one
for breadth, one for the movers, and two more that name the epics that fill
them. The market clock and the feed cell — both already shipped — sit where
they always have.

**Nothing on it moves yet**, and every region says honestly what it is waiting
for. That is the point: the shell is the thing five later stories fill, and a
reader who opens it on the day it lands should be able to tell what this screen
is going to be.

**What they still cannot do:** read a single live aggregate (4.2–4.5), click
anything through to a security (4.6), or see what the screen does when the feed
stops (4.7).

## Why it sits here in the sequence

**Because the denominator decision is upstream of four stories and cheap only
now.** Stories 4.2 through 4.5 each compute an aggregate over the same map; if
they take the decision independently, this screen ships with four different
answers to _what counts as current_ and nothing reconciling them. Epic 3
produced that exact defect twice — two surfaces answering one question and
saying which for neither — and repaired it both times with **one home**.

**And because the shell is what makes the next five stories incremental.**
Each of them fills a region of a screen that already exists, which is the
difference between five visible increments and one big-bang landing page.

## Open decisions — each to be settled with the owner, in writing, before 4.2

### 1. The denominator: what does _current_ mean?

`EPIC.md`'s own words: **the denominator is a decision this epic has to take
and state on screen.** On a median minute roughly **332 of 518** securities
have a fresh IEX bar (65.1% median per-symbol coverage; `ERIE` is 2.1%, and an
ordinary gap of **187 minutes** has been measured). Candidates, none obviously
right:

| Option                                                               | Reads as                             | Cost                                           |
| -------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| **Everything in the map**                                            | _breadth over whatever was observed_ | the denominator changes every minute, silently |
| **Everything observed within N minutes**                             | a stated freshness window            | N is a new number this product has to defend   |
| **The whole universe, with the unobserved counted as a third state** | honest and harder to draw            | three-way breadth rather than two              |
| **The stored session, not the live map**                             | complete and late                    | contradicts _what is happening right now_      |

**Whatever is chosen, the screen says it** — a breadth figure with no visible
denominator is the shape of number this epic exists to avoid.

### 2. Where an aggregate is computed — the backend or the browser

The browser already holds `LiveFeedView.observations` and could compute
everything client-side with no new route. The backend already holds
`currentMarketState` and could serve one small answer. **This is a seam
decision**, and it decides whether Epic 5's anomaly scores have somewhere to
live. Story 4.2 builds whichever is chosen; it must not be discovered.

### 3. The 390 fold, which `EPIC.md` says is owed a person BEFORE this epic ships a screen

`docs/GAPS.md` records that at 390 the distinction between _the feed stopped_
and _the market is shut_ is below the fold, and that no check can see it.
**This screen is where it matters most** — its whole subject is _right now_.
Story 4.7 owns the repair; **this story owns asking the question**, because a
shell designed without the answer is a shell that may have to move.

### 4. Whether this screen re-orders under live data

The universe table deliberately never does (Task 3.6.3), and its reversal
trigger is _the first sort control whose key is a live value_. **Sector
performance and the movers are ranked by live values by definition.** So this
epic ships a surface the table's rule was written against, and the two must be
told apart on screen — Story 4.5 owns the shape, **this story owns the rule**.

## Acceptance criteria

1. `/` renders the overview's regions at 1440, 1024, 768 and 390, and no region
   is a spinner that never resolves
2. Every region this epic does not fill names the epic that does, in one
   sentence, without pointing at a control that does not exist
3. The market clock and the feed cell are the **existing** ones — no second
   clock, no second connection word (`CLAUDE.md`'s one-home rule)
4. The four decisions above are recorded with their alternatives and a reversal
   trigger written as a **condition**
5. A browser spec asserts the shell's regions are present and named, and does
   **not** assert a figure — CI's store has 518 securities and zero bars
6. `pnpm probe` output at four widths, read rather than filed

## Design work

**The canvas has no Market Overview artefact and this story creates the
first.** `727b5b14-fe78-47c1-9d9c-fb84b6ce5280`, reached with
`get_project`/`list_files` — **never `list_projects`**, which filters to
design-system projects and returns this one as absent.

What exists to reuse rather than reinvent: the panel and region treatment from
`Price region.dc.html`, the empty-answer vocabulary from
`Provenance and the empty answers.dc.html`, the chrome from
`Live in the chrome.dc.html`, and the motion rules from
`The motion vocabulary.dc.html` — **work in progress LOOPS, a state PERSISTS, a
fact arriving DECAYS**.

What is genuinely new and should be drawn here rather than improvised later:
**the overview's grid at four widths**, and **the region-that-belongs-to-a-later-epic**
state, which this product has shipped on the security page and never drawn.

## Out of scope

The topology (Epic 6), unusual activity and anomaly scores (Epic 5), current
investigations (Epic 7+), and every aggregate — each has its own story.
