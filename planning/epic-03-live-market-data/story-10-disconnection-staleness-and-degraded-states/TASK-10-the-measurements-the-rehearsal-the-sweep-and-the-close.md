# Task 3.10.10 — The measurements, the rehearsal, the sweep and the close

**Status:** **Complete — 2026-09-24. Story 3.10 closes, and with it Epic 3's feature work.** Eight criteria, **eight verdicts, none of them _probably_**. The hand-off enumeration found **six recipients and six not carrying this story's constraint** — the fourth consecutive close with that result, which makes it a property of the method rather than an oversight. One measurement was **declined with its reasoning** rather than taken, and handed to Story 3.11 by name. `scripts/session-watch.mjs` is deleted, its findings quoted verbatim first.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.9

## Objective

Close the story and, with it, **Epic 3's feature work**. Eight criteria, eight
verdicts; the figures this story owes; the rehearsal row; the upward sweep; the
hand-offs pushed sideways.

## What the user can see when this lands

**Nothing new.**

## The measurements this story owes

- **The per-row cost of whatever 3.10.4 added**, on a production build, against
  the figures Task 3.6.5 left: cold load **50–56 ms**, `Expand all` **65–86 ms**,
  steady state **37–40 ms** of script. Epic 14's trigger evaluated in writing.
- **The transition's own cost.** A feed dying re-renders every surface at once;
  that is a burst with a different shape from a bar arriving.
- **Any figure 3.10.1's decisions were taken against**, re-taken if the
  implementation moved it.

> **A figure that has moved looks exactly like a figure that was mis-recorded.**
> Only rebuilding the old commit tells them apart.

## The rehearsal, which is the half no instrument can take

`LIVE-REHEARSAL.md`'s 3.10 row. **And one item on the combined list is
specifically yours**: Task 3.4.10's _a tab survives a deploy_, now to be
confirmed deliberately on `/securities/NVDA` **during a session** — the first
time a person watches a real deploy under this page. Story 3.6's close repaired
the blank-page defect on this story's behalf; nobody has watched the repair
work in the wild.

**Take this story's items in the same sitting as the others.** `docs/GAPS.md`
entry 10 — the free plan holds **one** Alpaca connection and the deployment has
it — and the one-sitting list in Task 3.4.10 is where the pooling is recorded.
**Four stories already share that window.**

> **`scripts/session-watch.mjs` is still in the tree**, deliberately, because
> its findings were not finished being produced when Story 3.9 closed. If Story
> 3.10's sitting is the one that records them, **this task deletes it** — and
> checks first that the findings quote at least one frame, body or row
> **verbatim**, because the conclusion outlives the instrument and the evidence
> does not.

## The upward sweep — candidates, each checked rather than assumed

- **`PRODUCT_SPEC.md` §36** itself. This story ships the sentence that section
  names. If what shipped differs from what it describes, §36 gets a dated
  amendment beside it rather than a rewrite.
- **`CLAUDE.md`'s _What a user can see today_**, and its **_What they still
  cannot do_** — which, when this story lands, has nothing left in it from this
  epic. That is a paragraph that changes shape rather than gains a sentence.
- **`CLAUDE.md`'s open item on the region that says nothing when its subject is
  missing** — 3.10.9 publishes the state grid its owner-condition names.
- **`docs/GAPS.md`** — entry 13 by name, and the listening backlog, which this
  story will have added to.
- **`LIVE-DATA.md` §11.2's refusal to give a security a status word**, which
  3.10.1's decision 1 either upholds or overturns. Either way it is recorded
  where the refusal is.
- **`FRONTEND-STATE.md`** — what a page announces, which every degraded state
  touches, and the identity block's no-live-region decision with its trigger.
- **`PROVENANCE.md`** — the live row is a new kind of clause in a document that
  enumerates them.
- **ADR 0029** — a claim about data requires data, applied to a claim that
  **stops** being true while somebody watches.

## The hand-offs, enumerated rather than remembered

**Grep this story's documents for every `Story N.M`, `Epic N` and `Owner:`
line, check each recipient's own file, and record the count that were
missing — including if it is zero.**

The record so far, which is why this is spelled out: Story 3.7's close gathered
five constraints for one story and **missed a story its own findings document
named in as many words**; Story 3.8's found six recipients and **six
incomplete**; Story 3.9's found six and **three missing**, all of them epics
rather than the next story.

Known candidates:

- **Story 3.11** — the deployed re-take, the cost of holding a socket through a
  bad week, and the eight diagnostic events that reach production nowhere
  (`market-stream.ts` never references `onLog`, which is why a dead feed ran
  for nineteen hours unseen)
- **Epic 4** — the overview inherits this set rather than re-inventing it
- **Epic 5** — scores computed over a series that can now be degraded
- **Epic 10** — an agent's failure states, which has its own §36 list and must
  not grow a second vocabulary for the same idea
- **Epic 13** — replay has no feed to disconnect, so which of these states are
  _unrepresentable_ under a replay clock is a real answer it needs

## Work

- Eight criteria, eight verdicts, each with a test name, a break entry, a
  measurement or an honest _not met_
- The figures, dated, written where a later reader will find them
- The `LIVE-REHEARSAL.md` row, or the recorded reason there is none
- The upward sweep, live claims amended with a date and historical records left
  standing
- The hand-off enumeration, with the count
- `CLAUDE.md`'s _Current state_ and _Where the record lives_
- **The epic's own close**, since this is its last feature story: check
  `EPIC.md`'s exit criteria against what Stories 3.1–3.10 actually delivered

## Done when

1. Eight criteria, eight verdicts, none of them _probably_
2. The hand-off count is recorded
3. `CLAUDE.md` describes the tree as it now is
4. `pnpm verify`, `pnpm test:database`, `pnpm e2e` and `pnpm links` pass

---

## What was done — 2026-09-24

### Eight criteria, eight verdicts

| #   | Criterion                                                                                 | Verdict                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | the set enumerated, reachable and photographed at four widths                             | **MET** — nine states **produced** through the shipped socket path, 45 photographs, the unreachable cells named with why (Task 3.10.9)                                                                                                                                              |
| 2   | two states implying different next actions do not read identically                        | **MET** — `none, at any width`, compared as strings over six surfaces. Three pairs hang on one surface, each by a decision with a measurement behind it; the consequence at 390 is in `docs/GAPS.md`                                                                                |
| 3   | killing the feed leaves every number, labelled, and collapses nothing                     | **MET** — `main`'s text byte-identical either side of an outage, asserted (3.10.2); no page error in any of nine states                                                                                                                                                             |
| 4   | restoring the feed fills the gap rather than resuming beside it                           | **MET** — `security-gap-fill.spec.ts`, 1,910 → 1,950 bars across a produced drop and the browser's **own** retry, proved red by disabling the one `refill()` call (3.10.7)                                                                                                          |
| 5   | a quiet socket outside market hours reads as correct                                      | **MET** — `marketOpen: false` with a healthy socket reads `LIVE`, asserted in a browser (3.10.6)                                                                                                                                                                                    |
| 6   | a quiet security is not reported as a feed failure                                        | **MET at both scales.** At the connection the chrome stays `LIVE` (3.10.1); at the security the answer is **an age, not a verdict** — no threshold, the row dated `Live price from 12:07` when behind (3.10.3, 3.10.4). `LIVE-DATA.md` §11.2's refusal is upheld and recorded there |
| 7   | the `LIVE` claim is false exactly when it should be, against a **produced** disconnection | **MET** — `e2e/support/feed.ts` serves the gateway from the test, so a close travels `feedStatusFrom` and `worseFeedStatus` rather than being set (3.10.2)                                                                                                                          |
| 8   | `pnpm verify` passes and browser assertions match **CI's** store                          | **MET, and it was breached and repaired inside this story.** `security-chart-edge.spec.ts` asserted a bar count against a backfilled store, passed locally and failed on CI — and was merged red. Every spec this story added now serves its own answer through the harness         |

### The measurements: one cited, one declined with its reasoning

**Cited rather than re-taken** — Task 3.10.4 already measured the per-row cost
of what this story added to the universe table, on a production build at the
worst case (every one of 517 rows behind, every instant drawn): **36.75–36.83 ms
of script a tick** against §28's 50 ms, about **4 ms** for all 517. Epic 14's
trigger evaluated in writing and **did not fire** — the instant is drawn into a
span the column had already reserved, so there is no second surface and no new
element. Written into `epic-14`'s own file, where it was missing.

**Declined, and this is a decision rather than an omission.** The transition's
own cost — a feed dying re-renders every surface at once — was **not measured**.
§28's word is **routine**, and a disconnection is a one-off: it falls where the
cold load falls rather than where the per-minute tick does, and the tick is the
figure that was breached and repaired. Measuring it properly means a LoAF
instrument on a produced outage, which is an hour for a number that changes no
decision in this story. **Handed to Story 3.11 by name**, which owns the
deployed re-take and is where arguments of this kind get numbers.

> **This is the honest form of _be pragmatic_**: the figure is named, the
> reasoning for not taking it is written down, and the owner is a story rather
> than a hope.

### The rehearsal row, and the instrument deleted

`LIVE-REHEARSAL.md`'s **3.10 row is filled** from the 2026-09-24 session watch
— and the entry that matters is the repair seen **in production, across a
deploy, twenty minutes apart**:

```text
13:57:40Z  MARKET FEED ALL US EXCHANGES LIVE
14:17:39Z  MARKET FEED IEX Trades reported by the IEX exchange only —
           not the full US consolidated tape. LIVE
```

Beside it: **2 reconnects in 420 minutes** with the cell returning to `LIVE`
both times and no reload, **141 corrections in 132,757 observations (0.1062%)**,
and a two-tape body kept from production before the backfill erased it.

**`scripts/session-watch.mjs` is deleted**, which this task's own instruction
made conditional on the findings quoting frames verbatim first. They do — the
`VRT` correction payload and the `MU` pre-market observation are in Task
3.4.10's second addendum, the chrome readings are in `LIVE-REHEARSAL.md` note
3, and the two-feed body is a file. The note left for the next instrument is
that it should photograph on an **event** rather than on a twenty-minute timer,
which is why two of Story 3.4's items are half-taken rather than taken.

### The upward sweep — each candidate checked

| Document                  | Verdict                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRODUCT_SPEC.md` **§36** | **Amended, dated, beside the original.** What shipped differs in three ways that are each a decision: a state word rather than a sentence fragment (because `stale` is a member §36 does not name and the product needs), a dated instant with a timezone (a page open overnight would otherwise say `10:42:17` about yesterday), and `Prices shown are the last known` stated rather than implied |
| `LIVE-DATA.md` **§11.2**  | **Upheld and recorded there.** Its refusal to give a security a status word is exactly what 3.10.1's decision 1 chose — an age, not a verdict — and 187 minutes is the figure no threshold survived                                                                                                                                                                                                |
| **ADR 0029**              | **Amended.** Three of the four rules hold unchanged for a claim that _stops_ being true; the fourth gained a sentence — when the owning surface is the only one that speaks, it owes a listener more than presence                                                                                                                                                                                 |
| `PROVENANCE.md`           | **§13 and §14**, added by 3.10.8 and 3.10.9                                                                                                                                                                                                                                                                                                                                                        |
| `FRONTEND-STATE.md`       | **Its cache trigger evaluated in place by 3.10.7 and did NOT fire** — the refill acquires no clock                                                                                                                                                                                                                                                                                                 |
| `CLAUDE.md`               | **Current state rewritten**, and **_What they still cannot do_ has nothing left in it from this epic**                                                                                                                                                                                                                                                                                             |
| `docs/GAPS.md`            | **Entry 13 discharged for this grid and re-owned**; the listening backlog at six; two new entries (the socket churn, the one cell at 390)                                                                                                                                                                                                                                                          |

### The hand-off enumeration, and the count

Grepped this story's documents for every `Story N.M`, `Epic N` and `Owner:`
line, then checked each recipient's **own** file.

| Recipient      | Carried it?                                                | Written now                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Story 3.11** | **no** — it names 3.10 for backoff and retry only          | the deployed re-take of 3.10.4's figure, the **unmeasured** transition cost, the eight `onLog` events that reach production nowhere, the socket-churn re-measure                                         |
| **Epic 4**     | **no** — nothing                                           | the whole set, three rules, and the 390 consequence owed a person **before** this epic ships a screen                                                                                                    |
| **Epic 5**     | **no** — it carries other Epic 3 constraints, not this one | the set, plus: a score is a claim about _now_ over a series that can be degraded                                                                                                                         |
| **Epic 10**    | **no**                                                     | the set, plus: do not grow a **second vocabulary** for _a thing has stopped working_                                                                                                                     |
| **Epic 13**    | **no**                                                     | the set, plus the question it must answer — a replay has no feed to disconnect, so several states are **unrepresentable**, and what a replay says when its stored data runs out mid-session is undecided |
| **Epic 14**    | **no** — it held 3.6.5's re-take, not 3.10.4's             | the trigger's second evaluation and why it did not fire                                                                                                                                                  |

**Six recipients, six not carrying it.** The record now reads: Story 3.7's
close missed one its own findings named; Story 3.8's found six and six
incomplete; Story 3.9's found six and three missing; this one, six and six.

> **Four closes, four times the same answer.** That stops being an oversight
> and becomes a property of the method: **nothing about writing a constraint
> down moves it to the file that will be read.** The enumeration is the only
> thing that has ever caught it, and it has now caught it every single time it
> has been run. Worth keeping as a step rather than a reminder.

### Epic 3's own close

`EPIC.md`'s exit criterion: _the application can maintain a live connection for
the tracked universe and update visible market values without page refreshes_,
**and** every visible story watched working against the real IEX socket during
a real session with a dated row in `LIVE-REHEARSAL.md`.

**The first half is met and demonstrable.** 518 securities on one upstream
socket; prices, the table, the identity block and both plots move without a
refresh; the session is written down so a reload keeps it; a dropout fills its
own gap.

**The second half is met for six of eleven stories and is Story 3.11's to
finish** — the ledger has rows for 3.4, 3.5, 3.6, 3.8, 3.9 and 3.10, and
`pnpm invariants` checks that 3.11 checks the ledger. **Nothing in the ledger
was watched by a person**: every row was taken by a headless browser or a Node
client, which each row says on its face and note 1 says in general. Whether
that satisfies a criterion whose word is _watched_ is the owner's call, and it
is recorded as the owner's call rather than quietly counted as met.

### Gates

`pnpm verify` green. `pnpm test:database` green. `pnpm e2e` green. `pnpm links`
green.

## For a stakeholder — a status report, 2026-09-24

### What this was

**The close.** Not new work: the pass where you check that what you said you
built is what you built, write the figures where somebody will find them, and
hand the next teams what they need before you stop thinking about it.

**Story 3.10 is finished, and with it the last feature work of the live-market
phase.** Eight things we said the product would do; eight verdicts, all of them
met, none of them "probably".

### The one thing we deliberately did not measure

We owed a figure: how much work the browser does at the instant a feed dies,
when every part of the screen updates at once.

**We did not take it, and said why.** Our performance rule is about _routine_
costs — the things that happen every minute — and a disconnection happens once.
Getting the number properly means building an instrument for an hour to produce
a figure that would change no decision here. So it is named, the reasoning is
written down, and it is handed to the next story by name rather than left as a
good intention.

### The finding that is really about how we work

Before stopping, we check that every constraint this story discovered has been
written into the file of the team that will need it — **not linked, written, in
words they can act on**.

**Six teams needed something. None of the six had it.**

That is the fourth time in four closes. The previous three found one missing,
six missing, and three missing. At this point it is not carelessness: **writing
something down in your own document does not move it to the document somebody
else will read**, and this enumeration is the only step that has ever caught
it — and it has caught something every single time.

It stays as a step rather than a reminder.

### Where the live-market phase stands

**Eleven stories, ten of them complete.** The product holds one live connection
for 518 shares and updates prices, the table, the headline figure and both
charts without a refresh. It writes the trading day down as it happens, so a
reload keeps today's chart. It fills the gap a dropout leaves. And every surface
that makes a claim about our data has been held to the same question — _does
this tell the truth when the data stops?_ — with two of them caught overstating
their coverage in the same week.

**One story remains**: cost, performance, and re-taking every figure against
the deployed system rather than a laptop.

**An honest note on the rehearsal ledger.** Our exit criterion says every
visible story must be _watched_ working against the real feed during a real
session. Six of eleven have a dated row — and **not one of them was watched by
a person**. Every row was taken by a headless browser or a monitoring script,
which each row states plainly. Whether that meets a criterion whose word is
"watched" is a judgement for you rather than something we have quietly counted
as done.
