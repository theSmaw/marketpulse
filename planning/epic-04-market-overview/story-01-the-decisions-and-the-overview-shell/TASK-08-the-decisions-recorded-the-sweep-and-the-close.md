# Task 4.1.8 — The decisions recorded, the sweep, and the close

**Status:** **Complete — 2026-09-25. Story 4.1 is closed, with four items shipping open under an owner and a condition.** The hand-off enumeration found **six** missing — its sixth run, and it has caught something every time — of which the worst is that Story 4.5 had not been told the denominator, and a _ranking_ computed on 466 of 518 can be flatly wrong rather than merely low. The `below the fold` sentence had been copied into **nine** documents with **two** errors in it; eight sites are amended and the `docs/GAPS.md` entry five documents had promised for a day **was written rather than deleted**, which made four `EPIC.md` files and an ADR true retroactively. The overview frame **does** owe an ADR (ADR 0031 does not cover frame types) and it is Story 4.2's to write.
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.5, 4.1.6, 4.1.7

## Objective

**Four decisions, four consumers, and the thing this repository keeps learning:
recording a decision and propagating it are two obligations.**

## What the user can see when this lands

**Nothing**, and four later stories start from answers rather than from a
re-derivation.

## Work

### The decisions, written where they are consumed

Each of the four goes into **the story that acts on it**, in words that story
can use — never a link back, because a pointer is what a reader follows when
they already know to look, and the whole failure is that they do not.

| Decision                              | Consumer                           |
| ------------------------------------- | ---------------------------------- |
| The denominator, and the words for it | 4.4 primarily; 4.3 and 4.5 inherit |
| Where an aggregate is computed        | 4.2 builds it; 4.3–4.5 use it      |
| The 390 answer                        | 4.7, and any repair                |
| Whether this screen re-orders         | 4.5 owns the shape                 |

**And the hand-off enumeration applies here too**: grep this story's documents
for every `Story N.M` and `Owner:` line and check each against the recipient's
own file. The epic-level record across five runs reads **1, 6, 3, 6, 2**, and
it has caught something every time it has run.

### The sweep

- **`PRODUCT_SPEC.md` §9's sketch** against what was built, with a dated
  amendment where the screen differs and why — a spec sketch is a live claim
- **Task 1.5.4's comments** in the route file: the two unplaced contents are
  placed, and the render-check paragraph is false once 4.1.4 lands. Comments
  are code and rot the same way
- **`CLAUDE.md`'s _What a user can see today_**, which still describes a
  landing route that is a placeholder naming Epic 4
- **Epic 6's and Epic 5's `EPIC.md`**, which inherit the regions this story
  leaves named — and whose own files should say so rather than learning it from
  a comment in a route

### The close

- Story 4.1's acceptance criteria verdicted with an instrument named
- What ships open carrying an **owner and a condition** rather than a story
  number
- `pnpm verify`, `pnpm e2e` and `pnpm links` green, with their numbers

## Done when

1. Every decision is in its consumer's file, in usable words
2. The hand-off count is recorded, including if it is zero
3. The sweep is run against the list **and** a grep
4. Story 4.1 is closed, or the single reason it is not is named with its owner

## Amended by Task 4.1.1 — 2026-09-25: three decisions are already written, and one of them may owe an ADR

**The recording half of this task is mostly done.** Task 4.1.1 wrote the three
answers into `STORY.md` **and** into each consuming file — Stories 4.2, 4.3,
4.4 and 4.5, and Task 4.1.6 — rather than leaving them for the close. **What
remains is to verify that, not to do it**: grep each consumer for the
constraint in its own words, and record any that are missing, which is the
enumeration this product runs at every close and which has caught something on
all five of its runs.

### The judgement this task now owes

**Decision 2 adds a new FRAME TYPE to the market-stream wire**, and this
repository has a precedent for the smaller version of that: ADR 0033 added a
**field** — `sentAt` — and carries four constraints about how it may be used.
A frame type is bigger.

**So: does the overview frame owe an ADR of its own?**

- **For**: the wire is a contract three epics already read, ADR 0031 says what
  a transport without a schema layer owes, and _which frames exist_ is exactly
  the kind of decision a later reader looks for in `docs/adr/` rather than in a
  story file.
- **Against**: ADR 0031 may already cover it, and this product's rule is that
  an ADR is written **only where a decision has no home** — Task 3.11.9's
  verdict on four candidates was that two already had one.

**Decide it in writing either way**, and if the answer is yes, it is Story
4.2's to write rather than this task's — this task decides, 4.2 builds and
documents.

## Amended by Task 4.1.2 — 2026-09-25: one hand-off nothing owns, and it is to an epic two away

**The canvas's interim layout has a reversal trigger — _the first commit that
renders a graph node on this route_ — and the epic that will trip it does not
know it exists.**

When Epic 6 draws its first node, **the overview's layout changes**: the
reserved band becomes the primary area, and sectors and movers drop to a lower
band. That is not Epic 6's design work to invent; it is drawn already, in
`Market overview.dc.html` §02.

**So this task writes it into Epic 6's own `EPIC.md`, in words that epic can
act on** — never a pointer back. The enumeration this product runs at every
close has caught a missed hand-off on all five of its runs, and **the two it
caught most recently were both cases where an ADR said in its own text that the
receiving epic did not know**, and nobody then told it.

**What Epic 6 needs to be told, specifically:**

- The landing route runs an **interim layout** until its first node renders.
- **The end state is already drawn** — it does not need designing, only
  building, and the regions keep their names, their order and their landmarks
  across the change.
- **The reserved band does not grow in the meantime.** If it has, something has
  gone wrong that predates Epic 6.

## Amended by Task 4.1.3 — 2026-09-25: two live claims are now false, and one new component state needs its home checked

**The sweep has concrete subjects rather than a category.**

### Two sentences this story made false

- **Epic 4's own `EPIC.md`**: _"And the landing route is currently a placeholder
  naming this epic."_ It is not. It is seven named regions, three of them added
  by Task 4.1.3, five drawn in the reserved state and one still holding Story
  1.4's render check until Task 4.1.4. **The paragraph is this epic's own and it
  is the first thing a reader of this epic meets.**
- **`Region.stories.tsx`'s `Empty` story** said _"what three of the four
  landing-route regions look like today"_ — corrected in the same change, and
  noted here because **a story's prose is a live claim about the product** in
  exactly the way a task file's is not.

**Check `CLAUDE.md`'s _What a user can see today_ with a grep rather than a
memory.** Its seven-regions paragraph is about the **security page** (§8.3) and
is still true; whether anything there describes the landing route is a question
for the grep, not for this sentence.

### One component state, and where it is written down

`Panel.reserved` and `Region.awaiting` are new, and `VISUAL-LANGUAGE.md` gained
_The landing screen_ for them in Task 4.1.2. **The close checks the chain ran in
the right direction and stops** — canvas → `VISUAL-LANGUAGE.md` → `tokens.css`
→ components — **and that nothing in it needs an ADR.** The working assumption
is that it does not: this is a component state in a documented language, not a
decision about what the product does, and Task 3.11.9's verdict on four
candidates was that two of them already had a home.

## Amended by Task 4.1.4 — 2026-09-25: removing the render check orphaned two components, and nothing can see it

**`SecurityRow` has no shipped renderer at all**, and `AnomalyBadge`'s only
shipped renderer is `SecurityRow`. Both were Story 1.4's; the render check was
their last consumer, and Task 4.1.4 removed it.

**Nothing in `pnpm verify` can notice.** `pnpm stories` asserts every component
under `src/components/` **has** a stories file — the opposite direction — so a
component nothing renders keeps its stories, keeps its tests, keeps its place in
the coverage denominator, and looks exactly like a component in use.

### This is a disposition rather than a deletion, and the reason is in the components

- **`AnomalyBadge` is Epic 5's**, early. It renders §11's 0–100 band with its
  explanation, which is the section's own requirement — _every score should have
  an explanation_ — and it was built with four named bands rather than a
  gradient because **a band can be labelled and a gradient cannot**. Deleting it
  would throw away a decision Epic 5 would have to re-take.
- **`SecurityRow` is less clear.** It is the ancestor of `UniverseTable`'s rows
  and the place the anomaly band met a price, which is a shape Epic 5 needs and
  may or may not want in this component.

**So the close records them, with an owner and a condition** — never a story
number — and the candidates are: keep, with a written statement that they are
knowingly unrendered; or delete, with the record saying where the decisions went.
**What is not acceptable is leaving them unremarked**, because dead code that
looks alive is how a later author discovers a component by reading it and
believes it is in use.

### And ask whether it can be made mechanical

`docs/GAPS.md`'s standing instruction is that an entry which can be made
mechanical should be. **A check that every component under `src/components/` is
rendered by something shipped is a grep**, and this repository has turned seven
prose entries into `pnpm invariants` checks already.

**Weigh it honestly rather than assuming**: the check has a false-positive shape
— a component rendered only through a barrel, or only by another component that
is itself orphaned, needs the walk to be transitive — and a check that cries
wolf is worse than a list. **If it is written, it owes a break.**

## Amended by Task 4.1.5 — 2026-09-25: one namespace worth grepping, and the shape of this story's close

### A naming class the sweep can check cheaply

**Task 4.1.5 found a comment naming the wrong guard**: Task 4.1.4's invariant
said `feed-words-in-a-renderer` keeps the feed sentence unique. That is the
**break**; the invariant is `one-home-for-the-feed-words`.

**These are two namespaces that look like one.** `scripts/breaks.mjs` names
_defects_ (`a-second-clock-on-the-landing-page`), and
`scripts/check-invariants.mjs` names _claims_
(`one-caller-of-the-market-clock`) — and both are lowercase kebab-case
identifiers in backticks, written in prose, by the same author on the same day.

**The sweep can check it with a grep rather than a reading**: every
kebab-case identifier in a backtick in `scripts/`, `docs/` and `planning/`
should be either a break name or an invariant id, and the ones that are neither
are either typos or checks that do not exist. **The second kind is the one this
epic keeps finding.**

> **Do not build a checker for this without weighing it.** The false-positive
> shape is obvious — every kebab-case phrase in prose is a candidate — and a
> check that cries wolf is worse than a list. A one-off grep at the close may be
> the right answer, recorded with its result.

### What this story's close depends on, and when it can happen

**Two of this story's tasks need the market open** — 4.1.6's coverage curve and
4.1.7's phone — and this task depends on both. The US session is 21:30–04:00
local.

**That is a booking rather than a block**, and the distinction is Epic 3's:
Task 3.11.1 established that **nothing in a close should wait on a clock**, and
the repair was to make sure everything that could be done without one was. The
same applies here — the instrument, the wording, the sweep and the decisions
are all doable in daylight, and what genuinely needs the bell is **one poll and
one look.**

## Amended by Task 4.1.6 — 2026-09-25: two things to confirm rather than assume

**Task 4.1.6 is half done**, and the close is what notices if the other half
did not happen.

- **The curve was read, and read from a log without holes.** The instrument
  runs nine hours on a laptop; Epic 3's weekend watch contained stretches that
  were the machine asleep rather than the market quiet, and **a curve computed
  over a holed log looks exactly like a curve computed over a quiet market.**
  Task 4.1.6 carries the three checks; the close confirms they were run.
- **The instrument was deleted.** `ALPACA.md` §11 — _run it, record the
  findings, delete it_ — and the rule that makes deletion safe is that the
  findings quote at least one frame verbatim. **They do.** The close checks the
  script is gone rather than assuming, because an instrument left in `scripts/`
  is one a later reader takes for a supported tool.

**And `M` must be in Story 4.4's file rather than only in Task 4.1.6's**, in the
sentence that story will render. A number recorded only in the task that
measured it is a number the story that needs it will re-derive.

## Amended by Task 4.1.7 — 2026-09-25: one paragraph was copied into nine places, it carries TWO false claims, and one of them is a mechanism that does not exist

**Task 4.1.7 falsified a sentence and corrected it in one of the nine places it
lives.** That is not a criticism of 4.1.7 — it amended the file its brief named,
correctly, with a dated amendment beside the original rather than a rewrite. It
is this repository's own documented failure mode arriving on schedule: **a
sentence duplicated for legibility must be counted with a grep before it is
corrected**, and nobody ran the grep.

### The paragraph

```text
**And one unrepaired consequence, recorded in `docs/GAPS.md`**: because the
connection has one home and that home is sticky at the **foot** of the
viewport, at 390 the distinction between _the feed stopped_ and _the market is
shut_ is below the fold. No check can see it.
```

**Both halves of it are wrong.**

1. **_Below the fold_ is false.** Measured twice — Task 3.11.8 and Task 4.1.7 —
   the status bar is **sticky**, on screen at 390 at any scroll, and it **grows
   from four wrapped lines to six** when the feed drops. What is actually wrong
   is the timing: **165 seconds of `LIVE`** before anything changes.
2. **_recorded in `docs/GAPS.md`_ is false, and this is the worse half.**
   Task 4.1.7 went looking for the entry to re-verdict it and **there is no
   such entry** — `docs/GAPS.md`'s `390` matches are the navigation, the price
   strip, the window control and the chart's empty sentence, none of them this.
   Four `EPIC.md` files and an ADR point at a record that has never existed.

> **That is the third instance in eight days of _a claim about a mechanism
> reads identically whether the mechanism is there or not_.** The other two are
> in `CLAUDE.md` already: `LIVE-REHEARSAL.md`'s completion marking, and ADR
> 0030 §7b. **All three were found by somebody going to USE the mechanism**,
> never by reading — and this one was found by a task whose brief simply said
> to re-verdict the entry.

### The nine sites, enumerated rather than described

**Live claims — amend:**

| #   | Site                                                      | State                                                                                |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | `planning/epic-04-market-overview/EPIC.md:262`            | **fold half amended by 4.1.7**; the `GAPS.md` half is still false                    |
| 2   | `planning/epic-05-anomaly-detection/EPIC.md:288`          | untouched                                                                            |
| 3   | `planning/epic-10-ai-assisted-investigations/EPIC.md:121` | untouched                                                                            |
| 4   | `planning/epic-13-market-replay/EPIC.md:287`              | untouched                                                                            |
| 5   | `docs/adr/0029-…:416`                                     | untouched — **a dated amendment, never a rewrite**                                   |
| 6   | `CLAUDE.md:301`                                           | untouched                                                                            |
| 7   | `planning/epic-04-…/story-01/STORY.md:145`                | untouched — **this story's own file**                                                |
| 8   | `planning/epic-03-…/LIVE-REHEARSAL.md` (the 3.10.9 item)  | untouched — and 4.1.7's protocol says the row belongs here                           |
| 9   | `scripts/session-sitting.mjs:104` and `:419`              | **comments are code and rot the same way** (4.1.8 already says so of the route file) |

**Historical records — leave standing**: Task 3.10.9's, Task 3.4.10's and Task
3.11.8's own files. 3.11.8 already corrects it in place at its line 256, which
is what a task record is for.

**Not this subject, do not touch**: `e2e/specs/security-price-chart.spec.ts:985`
and `ChartVacancy.tsx:26` both say _below the fold_ about a chart region. **A
blind substitution would corrupt two correct sentences**, which is the same
hazard the renumbering rule warns about.

### The decision this hands the sweep

**The `docs/GAPS.md` half needs a choice, not a correction**: either write the
entry those five documents promise, or delete the promise from all five. **Write
it.** The claim is real, it is unguarded, no check can see it, and it now has a
**number** — 165 s — which is exactly what a `Re-measure:` line needs. A
promise deleted leaves five documents that used to point somewhere and now point
nowhere; an entry written makes four of them true retroactively.

### And a note on this task's own dependency

**`Depends on: 4.1.5, 4.1.6, 4.1.7` is satisfied.** 4.1.7 is _measured_, with
its person-half owed under an owner and a condition — and this task already owns
_what ships open carrying an owner and a condition rather than a story number_.
**The close does not wait for a phone.** Epic 3's Task 3.11.1 settled that
nothing in a close waits on a clock, and this is the same shape: the machine's
half is done, the person's half is stated as exactly what it is, and the ledger
says which kind the row is.

### The sweep's own count

**Add this to the hand-off enumeration.** The epic-level record across five runs
reads **1, 6, 3, 6, 2**; this is a sixth run in everything but name, and its
count before it starts is **eight sites owed and one discharged**. Record what
the grep actually finds, because the table above was written from one grep on
one day and the tree moves.

> **The rule this earns, if it is not already written down:** a dated amendment
> beside a claim is the correct repair for **the copy you are looking at**, and
> it does nothing for the other eight. **Amending and propagating are two
> obligations**, which is `CLAUDE.md`'s _recording a correction and propagating
> it are two obligations_ with the word changed — and the reason it keeps
> happening is that the first one feels like finishing.

---

## What was done — 2026-09-25

### The hand-off enumeration: SIX missing, and the first one can make a ranking wrong

**The count across six runs now reads 1, 6, 3, 6, 2, 6.** It has caught
something every time it has run, and this run is tied for the worst.

| #   | Decision or constraint             | Owed to    | Was it there? |
| --- | ---------------------------------- | ---------- | ------------- |
| 1   | The denominator                    | **4.5**    | **no**        |
| 2   | Where an aggregate is computed     | **4.3**    | **no**        |
| 3   | Where an aggregate is computed     | **4.4**    | **no**        |
| 4   | Where an aggregate is computed     | **4.5**    | **no**        |
| 5   | The interim layout's reversal      | **Epic 6** | **no**        |
| 6   | The reserved region + 2 components | **Epic 5** | **no**        |

Present and correct: the denominator in 4.3 and 4.4, the 390 answer in 4.7, the
re-ranking decision in 4.5 and 4.3.

**The one worth arguing about is #1.** Story 4.5 ranks the day's movers, and a
ranking is the worst possible place to lose part of the denominator: breadth
computed over 466 of 518 **understates a count**, but a top-ten computed over
466 of 518 can show **ten names that are not the ten biggest movers**, with
nothing on screen saying so. That is `EPIC.md`'s _an aggregate is the one kind
of number that can be wrong while looking right_ in its sharpest form, and 4.5's
file did not carry it. Written in now, with the decision it forces named:
**what is a mover with no recent price** — excluded and counted, or included on
its last stored close with the staleness shown. Both defensible; silently
dropping it is not.

### The `below the fold` propagation: nine sites, one had been corrected

**Task 4.1.7 amended the file its brief named and nobody ran the grep.** Eight
live sites remained. All eight are now amended — a dated amendment beside the
original, never a rewrite:

`planning/epic-05-anomaly-detection/EPIC.md`,
`planning/epic-10-ai-assisted-investigations/EPIC.md`,
`planning/epic-13-market-replay/EPIC.md`, `docs/adr/0029`, `CLAUDE.md`,
this story's own `STORY.md`, `LIVE-REHEARSAL.md`'s 3.10.9 item, and **two
comments in `scripts/session-sitting.mjs`** — comments are code and rot the
same way.

**Two sites were deliberately left alone**: `security-price-chart.spec.ts:985`
and `ChartVacancy.tsx:26` say _below the fold_ about a **chart region**. A
blind substitution would have corrupted two correct sentences, which is the
renumbering rule's hazard arriving on a different subject.

### The `docs/GAPS.md` entry: written, not deleted

**Five documents promised an entry that had never existed.** The choice recorded
in the amendment was to write it rather than delete the promise, and that is
what was done — _The word `LIVE` survives a dead connection for 165 seconds, and
no test in this repository waits for a clock_.

**Writing it made four `EPIC.md` files and an ADR true retroactively**, which is
why it was the better half of the choice. It carries the 165 s reading verbatim,
the reason the number was derived for a different socket, a `Re-measure:` that
needs five seconds of sampling and 165 seconds of waiting, and the instruction
**not to tune it from there** — including that it must be re-derived together
with the feed-frame defect, because repairing that changes a browser's routine
inbound rate from ~332 frames a minute to one every two minutes.

### `PRODUCT_SPEC.md` §9's sketch: amended with three differences

The sketch is a **live claim** and the screen differs from it in three ways, all
now recorded beside it: two regions in Epic 4's scope that the sketch does not
draw (`Market summary`, `Sector performance`); `LIVE` and `10:42:16 ET` being
the **application's** masthead rather than this route's — the thing a reader
building from the sketch reaches for, and which `one-caller-of-the-market-clock`
now refuses by name; and the topology not yet being the centre of gravity,
under an explicitly interim layout with a condition to revert on.

### Two sweep items that were wrong in the brief

- **`CLAUDE.md` never described the landing route.** This task's own list said
  it _"still describes a landing route that is a placeholder naming Epic 4"_ —
  it does not; `landing route` appears nowhere in the file. **The real work was
  the opposite of an amendment**: the section had no paragraph for a screen that
  now exists, and one was added.
- **The route file's comments were already correct.** Task 4.1.4 rewrote them
  when it removed the render check. Nothing owed.

> **Both are the same shape as the `docs/GAPS.md` entry that did not exist: a
> task brief asserting the state of a document it had not read.** Three in one
> story. The cheap defence is the one that worked here — **check the document
> before acting on a sentence that describes it**, including a sentence in your
> own task file.

### The namespace grep: one real catch out of thirteen candidates

**84 breaks and 29 invariants are registered.** Every kebab-case identifier in
backticks across `docs/`, `planning/` and `CLAUDE.md` that looks like a check
name was compared against both registries.

**Eleven of the thirteen hits were ESLint rule names** — `no-restricted-syntax`,
`no-floating-promises` and friends — which is the false-positive shape the
amendment predicted, and the reason **no checker was built for this**. A one-off
grep at the close was the right answer, and this is it, recorded with its result.

**The one real catch is a rotted re-measure**: `TAPE.md` §7 told a reader to run
`pnpm break a-second-tape-overwrites-the-first`, a break that was **retired** and
replaced by `the-second-tape-is-folded-into-the-first`. `TAPE.md` is a subject
document, so that was a live instruction pointing at nothing —
**corrected**. The same name at `TAPE.md:300` is inside a dated _What was
measured_ paragraph and was **left standing**, because that is a record of what
was run on the day and correcting it would destroy the record.

### The ADR question, decided: YES, and it is Story 4.2's to write

**The overview frame owes an ADR.** Checked rather than assumed: ADR 0031's own
_What this ADR does not decide_ lists reconnection, fan-out and Epic 10's field
map — **frame types are not among them**, so _which frames exist on this wire_
has no home in `docs/adr/` at all. Today it lives in a union type and in story
files.

**The precedent settles the weight.** ADR 0033 was written for a **field**,
`sentAt`, and carries four constraints. A frame type is bigger, and the wire is
a contract three epics already read.

**Story 4.2 writes it** — this task decides, 4.2 builds and documents. What it
must carry, at minimum: that an aggregate is computed on the backend and
arrives as a frame rather than through a second fetch; what the frame's cadence
is and what bounds it; and that it is **one frame for the screen**, not one per
region, which is ADR 0033's _never one per security_ with the noun changed —
and a lesson this product has now paid for, since the gateway's `feed` frame is
currently one per vendor item.

### The orphaned components: kept, with an owner and a condition

**`SecurityRow` is rendered by nothing shipped and `AnomalyBadge`'s only shipped
renderer is `SecurityRow`.** Task 4.1.4 removed their last consumer.

**Disposition: keep, knowingly, and hand them to Epic 5 by name** — written into
that epic's `EPIC.md` rather than left here. `AnomalyBadge` renders §11's 0–100
band with its explanation, in **four named bands rather than a gradient**
because a band can be labelled and a gradient cannot; deleting it would throw
away a decision Epic 5 would have to re-take.

**The mechanical check was weighed and NOT built.** A grep for _every component
under `src/components/` is rendered by something shipped_ has a false-positive
shape that needs a **transitive** walk — a component rendered only by another
orphan looks used — and `pnpm stories` asserts the opposite direction, so the
two would read as a contradiction. **The condition that would change the
answer: a second pair of components going unrendered.** One pair is a list; two
pairs is a check.

### The close

**Story 4.1's acceptance criteria are met**, with the instruments named:

| Criterion                            | Verdict  | Instrument                                           |
| ------------------------------------ | -------- | ---------------------------------------------------- |
| Four decisions taken in writing      | met      | 4.1.1, and the enumeration above                     |
| The shell drawn, every region honest | met      | 4.1.3, `pnpm probe` at four widths                   |
| Story 1.4's render check retired     | met      | 4.1.4, `the-workspace-package-reaches-the-bundle`    |
| No second clock or connection word   | met      | 4.1.5, `one-caller-of-the-market-clock` (proved red) |
| The denominator measured             | met      | 4.1.6, 390 of 390 session minutes                    |
| The 390 question asked               | **part** | 4.1.7 — machine's half done, person's half owed      |

**What ships open, with an owner and a condition rather than a story number:**

1. **The 390 sitting** — five minutes on a phone, `/securities`, the protocol in
   Task 4.1.7. **Owner: the owner, the next session they are awake for with a
   phone to hand.** The machine's half is complete and the close did not wait
   for it, which is Task 3.11.1's rule.
2. **The feed-frame defect** — unrepaired on purpose. **Owner: Story 4.7**, with
   the figures, the repair and the client cost in its file, and a `docs/GAPS.md`
   entry.
3. **`SecurityRow` and `AnomalyBadge`** — knowingly unrendered. **Owner: Epic
   5**, told in its own `EPIC.md`. **Condition for a mechanical check: a second
   pair.**
4. **The overview frame's ADR** — decided yes. **Owner: Story 4.2.**

### Gates

`pnpm verify` green, **29 invariants**. `pnpm links` green — 452 documents, 1,638
cross-file links, 0 broken. `pnpm format:check` green.

**`pnpm e2e` was not re-run locally, deliberately.** This task changed **no
application code** — the only non-Markdown edit is two comments in
`scripts/session-sitting.mjs`, which is a throwaway instrument outside every
build. The browser suite ran on this branch in CI, which is the evidence, and a
five-minute local run against an unchanged frontend would measure the runner.

## For a stakeholder — a status report, 2026-09-25

### What this was

**The tidying-up job at the end of a piece of work, which is where this project
keeps finding its real problems.**

The landing page is built. This task's job was to make sure the decisions taken
while building it actually reached the four pieces of work that need them, and
that nothing we wrote down along the way had quietly become untrue.

### What it found

**Six decisions had not reached the work that needs them** — our sixth such
check, and it has found something every single time. The most serious: the piece
of work that will show _the day's biggest movers_ had not been told that our
market feed only hears from about 466 of the 518 companies at any moment.

> **That one matters more than it sounds.** For a count — "42% advancing" — a
> gap makes the number slightly low. **For a ranked list it can make the answer
> simply wrong**: the actual biggest mover might be one of the companies we
> hadn't heard from, and a "top ten" would show ten names with total confidence
> and no hint that it had been computed on partial information.

**And one sentence had been copied into nine documents with two errors in it.**
It claimed a status indicator was hidden at the bottom of a phone screen (it is
not — we measured it twice), and it claimed the problem was _recorded_ in our
register of known gaps. **It was not. That entry had never existed**, and five
documents had been pointing at it for a day.

> **That is the third time in eight days we have found a safeguard that was a
> sentence rather than a mechanism**, and all three were found by somebody going
> to _use_ the thing rather than by reading. We have now written the missing
> entry — which makes those five documents honest — and corrected all nine
> copies of the wrong sentence.

### The thing we deliberately did not do

**We did not fix the feed problem found overnight**, where our server sends a
browser about 250 pointless status messages a minute. It is real and it costs a
phone roughly 12 MB over a trading day. But it is live behaviour in a part of
the product we declared finished, and changing it is a decision with a
measurement behind it — not something to slip in at the end of a tidying task.
It is booked, priced, and handed to the piece of work that owns it.

### Where this leaves the product

**The landing page's foundations are finished.** The screen exists, every region
on it is honest about what it is waiting for, and the four decisions that would
have been argued about four separate times are settled once.

**What comes next is the part a stakeholder can watch**: the index summary, then
the eleven sectors, then the breadth of the market, then the day's biggest
movers. Each one turns a placeholder into a live figure, on a screen that is
already drawn.

**One thing is still owed by a person, and it is five minutes**: opening the site
on a real phone during a trading session and telling us how long it takes to
notice when the prices stop. Everything a machine could measure about that
question is done; that part genuinely needs a human being.
