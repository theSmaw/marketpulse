# Task 3.11.9 — The ADRs, and the document that outlives the epic

**Status:** **Complete — 2026-09-25. Four decisions judged in writing, two of them into new ADRs.** `LIVE-DATA.md` is closed as the maintained account and **states that it wins**; **ADR 0036** gives the two-clock liveness rule a home where Epic 10 will look for it; **ADR 0037** takes the cost subject off ADR 0011 rather than superseding twenty-four sound decisions to correct an annexe; the mechanism-claim corollary went to `CLAUDE.md` rather than to an ADR; and the motion vocabulary needed nothing, because **ADR 0032 already is it** — which the task's own table had dropped.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.4, 3.11.5, 3.11.6

## Objective

Criterion 5. **`LIVE-DATA.md` closed as the maintained account of how a live
observation reaches a screen**, and the decisions that outlive their tasks
written where a later reader looks first.

## What the user can see when this lands

**Nothing.** What a future reader gets is one document that wins rather than
eleven task files that disagree.

## The rule that makes this worth a task

> Where `LIVE-DATA.md` and any task file in this epic disagree, **it wins.**

That is the whole point of a subject document, and Epic 2 produced nine ADRs and
seven subject documents on the same principle. A task file is a **record of what
was true when it was written**; a subject document is a **claim about now**, and
the two need different maintenance.

## What has already been written, and must not be duplicated

**This epic has already produced six ADRs** — 0030 through 0035 — which is more
than the story's own list anticipated:

| ADR  | Subject                                                                    |
| ---- | -------------------------------------------------------------------------- |
| 0030 | replaying our own bars, and the mechanisms that stop the live feed rotting |
| 0031 | the stream seam and what a fixture-backed stream certifies                 |
| 0033 | a send instant on the wire, for measurement only                           |
| 0034 | the tape on the bar                                                        |
| 0035 | both tapes are kept, and what a record is                                  |

Plus **0026–0029** amended by this epic's work, and **ADR 0029 amended on
2026-09-24** with the rule for a claim that _stops_ being true.

**So the question is not _write the ADRs_ — it is _which decisions of this epic
still have no home_.** Candidates, each to be checked rather than assumed:

- **The motion vocabulary** and what a green suite certifies about it — nothing
  below a browser can see motion, and **nothing at all can see whether it
  helps**. `VISUAL-LANGUAGE.md` and the canvas carry it; an ADR may be the right
  home and may be redundant
- **The two thresholds on two clocks** — 165 s monotonic, 60 s wall — and
  `worseFeedStatus`, which are load-bearing and currently live in a module
- **One home for a changing claim**, which ADR 0029's amendment may already
  cover

## The seven subject documents this epic touched

`LIVE-DATA.md`, `STREAM-SEAM.md`, `TAPE.md`, `LIVE-SESSION.md`,
`LIVE-REHEARSAL.md`, `CHARTING.md` §18, `PROVENANCE.md` §13–§14. **Each needs a
verdict on whether it is finished**, and `LIVE-DATA.md` needs the explicit
statement that it is the maintained one.

## Work

- Each candidate decision checked for an existing home; an ADR written **only**
  where there is none
- `LIVE-DATA.md` closed: §0 rewritten as _if you read one section_, the
  precedence rule stated, and every figure in it dated
- The other six documents each given a one-line verdict in `LIVE-DATA.md`'s own
  map, so a reader finds them from one place
- `CLAUDE.md`'s _Where the record lives_ table checked against what exists
- **ADRs are never renumbered and their decisions are never rewritten** — a
  present-tense description that has become false gets a dated amendment beside
  it

## Done when

1. Every decision of this epic has exactly one home, named
2. `LIVE-DATA.md` states that it wins, and is true as of the day it says so
3. `CLAUDE.md` points at every subject document this epic produced

## Amended by Task 3.11.5 — 2026-09-25: ADR 0011 has been amended twice about the same premise, and that is a judgement for this task

**ADR 0011 now carries two dated amendments and they disagree with each other
about the thing the ADR is for.**

|            | Says                                                                                      | Basis                       |
| ---------- | ----------------------------------------------------------------------------------------- | --------------------------- |
| Original   | a live-feed replica costs **$19.04/month**, at the active vCPU rate through every session | a rate card                 |
| 2026-09-17 | **$9.26** — the burst shape means the threshold is crossed for only 397 s/day             | a 7.77-hour traffic capture |
| 2026-09-25 | **$13.32** run rate, and **the bill cannot see the socket at all**                        | the bill                    |

**All three reason about whether holding a socket changes the billing rate. The
third says the question was the wrong one** — what moved the bill is a
**database write a minute**, which none of them costed.

**The judgement this task owes**: an ADR whose **premise** is falsified — rather
than whose figure has moved — may be better **superseded by a new ADR** than
amended a third time. This repository's rule is that ADRs are never renumbered
and their decisions never rewritten, and a third amendment restating the premise
differently starts to read as a document arguing with itself.

**Against that**: the _decision_ ADR 0011 records — deploy both halves, what a
green deploy certifies — is untouched and correct. **Only the cost annexe is
wrong**, and a decision record is not primarily a cost model.

**Decide it in writing either way**, with the n=2 caveat from Task 3.11.11's
re-read in hand: if the 32% step holds, the premise is definitively wrong and a
new ADR has a subject; if it does not, the third amendment is a correction and
nothing more.

## Amended by Task 3.11.6 — 2026-09-25: `LIVE-DATA.md` now argues with itself in two places, and closing it means choosing

**§12.2 has been corrected in place** — Task 3.11.6 added a dated amendment
beside its `≤ 5 s` row saying the measured figure is **45.8 s / 46.5 s** and
that the bound is Container Apps' revision-overlap schedule rather than
`SHUTDOWN_TIMEOUT_MS`. **The reading itself lives in §15.** That is two homes
for one fact, which is the shape this task exists to resolve.

**This task's decision, stated so it is not rediscovered:** §12.2's table row
and its two amendments are the **record of a decision and how its justification
moved**, and are left standing; §15 is the **measurement**; and the closing pass
must make §0 say which one a reader consults for _what a deploy costs the feed_.
A third copy of the 46-second figure is the failure mode, not the fix.

### And one decision of this epic may have no home at all

**_The feed's every-deploy outage is bounded by the hosting platform rather
than by this product's code._** It is a fact about the deployment shape, it
outlives the task that measured it, and it belongs beside ADR 0011's deploy
decision rather than in a story document — which is the same file this task is
already weighing a supersession of, from Task 3.11.5's amendment above.

**Take both in one judgement.** ADR 0011 now has a falsified cost premise
(3.11.5) **and** a missing consequence of the rolling-deploy shape it chose
(3.11.6). If the verdict is a new ADR rather than a third amendment, these are
its two subjects and it has a coherent one: **what this deployment's shape
costs, in money and in feed.**

## Amended by Task 3.11.7 — 2026-09-25: ADR 0030 described a mechanism that did not exist, and the pattern is now a candidate decision

**ADR 0030 §7b said, in the present tense from 2026-09-16, that `deploy.yml`
reads the configured provider and refuses to roll on anything but `alpaca` —
and that it is the only PREVENTIVE guard among the five.** No such step existed.
Task 3.11.7 found it by trying to break it, built it, and gave §7b a **dated
amendment** rather than a rewrite.

**Two things for this task.**

**1. The amendment is in place and the section's body is deliberately
untouched.** `CLAUDE.md`'s rule is that a present-tense description which has
become false gets a dated amendment beside it. This one was never true rather
than having become false, which is the same repair and worth a sentence when
`LIVE-DATA.md`'s map gives ADR 0030 its verdict.

**2. The generalisable finding may have no home**, which is exactly what this
task exists to decide:

> **A claim about a mechanism reads identically whether the mechanism is there
> or not** — so a decision record describing a guard owes something mechanical
> that fails when the guard goes.

**This epic produced it twice.** First on 2026-09-21, when
`LIVE-REHEARSAL.md` claimed a completion marking in `EPIC.md` that does not
exist (the `the-close-outruns-the-rehearsal` break). Then on 2026-09-25 with
§7b. **Two instances is a pattern**, and the repair both times was the same
shape: an invariant asserting the mechanism's own text, plus a break.

**Where it belongs is this task's call.** It is a corollary of _measure rather
than cite_ and could go in `CLAUDE.md` beside _a break that does not go red is
not evidence the check works_ — which makes it **Task 3.11.11's** sweep rather
than an ADR. The alternative reading is that it is a decision about what a
decision record owes, which would make it an ADR of its own. **Decide it in
writing; do not let it be both or neither.**

> **And one small correction for the map.** ADR 0030's mechanisms run
> 7a, 7a-bis, 7b, 7c, 7d, 7e, 7f — and **7d is the daily scheduled probe**
> while **7f is the in-session refusal**. Task 3.11.7's own table called the
> in-session refusal 7d, written from memory of the ADR. A reader reaching for
> §7d and finding a cron is the cost; if `LIVE-DATA.md`'s map names these, name
> them from the ADR.

---

## What was done — 2026-09-25

### The question this task actually answers

Not _write the ADRs_. **Which decisions of this epic still have no home**, and —
for each — the argument for the home chosen, written down so it is not
re-litigated.

**Four judgements, four verdicts.**

### 1. The two thresholds on two clocks → a new ADR, 0036

**Verdict: it needed one, and the argument is §11.2's own sentence.**

The rule — **a duration is monotonic, an age is wall-clock, and neither reads a
stamp the wire supplied** — is fully stated in `LIVE-DATA.md` §11.2, with the
measurements behind 165 s and 60 s and the three defects that followed from
leaving it unsaid.

**But §11.2 is a section of _how a live observation reaches a screen_, and the
next two surfaces to ask _is the data still arriving?_ are not in this epic.**
`PRODUCT_SPEC.md` §31's investigation stream has a measured four-minute inbound
idle ceiling — a liveness threshold by another name — and §11's anomaly scores
are computed from observations whose age decides whether a score means
anything. Neither epic's `EPIC.md` knows this decision exists.

> **§11.2 already contains the sentence that settles it**, written after its
> second defect: _"A fact can be in a document and still not be where the reader
> who needs it will look."_ Two of the three defects it describes are exactly
> that failure, inside this repository, about this rule.

**ADR 0036** therefore states the rule, cites §11.2 as the full statement (the
shape ADR 0032 already uses for `FRONTEND-STATE.md` §7), and separates the
**durable half** — two kinds of quantity, two clocks — from the **dated
observations of a vendor**: 165 s and 60 s are derived from one Wednesday's
heartbeat and have no instrument watching them.

### 2. ADR 0011's falsified cost premise → a new ADR, 0037, which supersedes nothing

**Verdict: take the subject, not the document.**

The task handed this over as a binary — a third amendment, or a supersession —
and **both are wrong for the same reason**: they treat the cost annexe as if it
were the ADR.

- **A third amendment** would be the fourth entry in an argument whose premise
  has been retired. All three existing readings reason about whether a **held
  socket** crosses the idle vCPU threshold; the bill says the socket is not in
  it at all. A document arguing with itself about a question nobody is asking
  any more is worse than one that hands the subject on.
- **A supersession** would retire **twenty-four decisions** — Azure for both
  halves, `minReplicas: 1`, the digest-pinned rollout, what a green deploy
  certifies — to correct an annexe. Every one of them is untouched and correct.

**So ADR 0037 takes the cost subject and 0011 keeps its decisions**, with one
dated line at the foot of its cost section saying so. **And the subject had
already grown a second half** that 0011 never considered: Task 3.11.6's finding
that the every-deploy feed outage is the **platform's** revision-overlap
schedule rather than this product's shutdown path. Both halves are consequences
of the deployment shape 0011 chose, and 0037 is coherent because of it: **what
this deployment's shape costs, in money and in feed.**

> **It carries its own reversal triggers**, which is the part that keeps it
> honest at n=2: if Story 3.11's close re-reads the 32% step and it does not
> hold, **this ADR is what gets amended**, not 0011.

### 3. The mechanism-claim corollary → `CLAUDE.md`, not an ADR

**Verdict: it is a rule about how to write a document, not a decision about this
product.** ADRs record what this product does and why; this is a working
practice, and its natural neighbours are already there — _a break that does not
go red is not evidence the check works_, _a figure that has moved looks exactly
like a figure that was mis-recorded_.

> **A claim about a mechanism reads identically whether the mechanism is there
> or not.** When you write that something is guarded, write the check in the
> same change.

**Its cost is the argument for promoting it**, and the entry records both
instances: `LIVE-REHEARSAL.md`'s missing completion marking (2026-09-21) and
ADR 0030 §7b's deploy step that had never been written while `docs/GAPS.md`
quoted it as _the only preventive mechanism_ (2026-09-25, nine days standing).
**Both were found by somebody going to USE the mechanism, never by reading.**

The edit was taken here rather than deferred to Task 3.11.11, and that task is
amended to say so — **removing an item from the close rather than adding one**,
which is the direction this story has been trying to push all week.

### 4. The motion vocabulary → nothing needed, because ADR 0032 already is it

**Verdict: no ADR, and the candidate was a bookkeeping error rather than a
gap.** This task's own table lists _six ADRs, 0030 through 0035_ and then names
**five** — **0032 is missing from it**, and 0032 is
_a value that changes on its own announces nothing_: Story 3.4's decision, the
one the motion vocabulary hangs on, complete with the two future surfaces it was
written for.

> **The candidate list was assembled from a table with a hole in it.** Worth
> recording because it is this epic's own recurring shape in miniature: the
> table was written from memory of the directory rather than from the directory.

### `LIVE-DATA.md`, closed

**The precedence rule is stated once, at the head of §0**, in the document's own
words rather than only in this task file:

> Where this document and any task file in Epic 3 disagree, **this document
> wins.** A task file is a record of what was true when it was written and is
> never corrected; this is a claim about now.

**And the one thing a reader would otherwise have to infer** — Task 3.11.6's
amendment asked for it by name — is stated beside it: **§12.2 is the record of
decision 8 and how its justification moved; §15 is what was measured**; a reader
asking _what does a deploy cost the feed?_ wants §15. A third copy of the
46-second figure would be the failure mode, not the fix.

**Two live figures in §0 were false and are corrected in place**, struck rather
than deleted:

- _the replica costs **$9.26/month**, not the $19.04 ADR 0011 assumed_ — the
  bill has since been read: **$13.32/month run rate**, and more usefully **the
  bill cannot see the socket at all.**
- **A number was added**, because §0 is the section a later story reads and this
  one sizes a deploy: **every deploy during a session costs ~46 s of live
  feed**, which is shorter than either liveness threshold and therefore
  produces no degraded word on any screen.

**And the map**: the six other documents this epic touched, each with a one-line
verdict on whether it is finished, plus all eight ADRs — so a reader finds the
record from one place instead of by knowing it exists. `LIVE-REHEARSAL.md` is
marked **open by design**: it gains a row per story for as long as this product
has a live feed.

### `CLAUDE.md`

- **The corollary**, above.
- **A false claim struck**: _what they still cannot do_ said the ledger had four
  dated rows and **not one watched by a human**, which Task 3.11.8 made false
  the same day. Answered in place rather than deleted, because it was true for
  nine stories.
- **`LIVE-REHEARSAL.md` added to _Where the record lives_.** It was in no table
  anywhere — the only file in this repository about somebody **looking** rather
  than about a check passing, and a reader had to already know it existed. Every
  other Epic 3 document was already there and correct.

### Gates

Documents only. `pnpm links` green — **433 documents, 1,591 links, 0 broken**,
up 17 from the new ADRs and the map. `pnpm invariants` green at 27.

## For a stakeholder — a status report, 2026-09-25

### What this task was for

We are near the end of the phase that made MarketPulse a **live** market
application. Over eleven stories it produced a lot of knowledge: what the data
provider actually does, what our connection costs, how the product behaves when
the feed stops.

**That knowledge is spread across about sixty task files, each a diary entry
written on the day.** Diary entries are the right record of what happened, and
they are a terrible way to answer _what is true now_ — because two of them,
written three weeks apart, can disagree, and nothing tells a reader which one
won.

**This task's job was to make one document win**, and to find the decisions that
had no proper home before the phase closes and everyone moves on.

### Why this matters to the product rather than only to the engineers

`PRODUCT_SPEC.md` §39 asks for something unusual: the repository should make the
**engineering decisions as visible as the application**. This is a project meant
to be discussed, not just used — so a decision that exists only in somebody's
memory is a decision that cannot be shown to anybody.

More practically: the next three phases build **on top of** the live feed.
Anomaly scores that update as the market moves. An AI investigation stream that
pushes events into the screen for minutes at a time. Both will ask a question
this phase already answered — **"how do I know the data is still arriving?"** —
and both are being built by somebody who will not think to read a document
called _how a live observation reaches a screen_.

### The four decisions, in plain terms

**1. How we tell "the feed is broken" from "the market is quiet."** We use two
timers, deliberately measured by two different kinds of clock — one that cannot
be fooled by a laptop going to sleep, one that reads the calendar. Getting this
wrong has already cost us three real defects, each of which passed every test.
**It now has its own short decision document**, because the next two features
that need it are in phases whose authors have no reason to look where it was
written.

**2. What our hosting actually costs.** Our deployment decision record has been
amended twice about cost and was wrong both times — not by a little, and not in
the direction anybody expected. We finally read the **bill** this week instead
of computing from a price list, and the thing everyone argued about (the cost of
holding a market connection open) **does not appear on it at all**. Something
nobody costed does: writing a row to the database every minute.

> **We did not rewrite the old document, and that was deliberate.** Its
> twenty-four decisions — which cloud, how we roll out a new version, what a
> successful deploy actually proves — are all still correct. Retiring a sound
> document to fix one appendix would lose more than it fixed. **So the cost
> subject moved to a new document and the old one keeps its decisions**, with a
> line saying where the subject went.

That new document also holds a finding worth knowing: **every time we ship a
new version during market hours, we lose about 46 seconds of live prices** —
and that pause is short enough that nothing on screen even mentions it. The
data fills itself in when the connection returns.

**3. A working rule we had to learn twice this week.** A sentence saying
"this is protected" reads exactly the same whether the protection exists or
not. Twice in five days we found a documented safeguard that had never been
built — and both times it was found by somebody trying to **use** it, never by
reading. The rule is now written where we keep our working practices: **when
you write that something is guarded, write the check in the same change.**

**4. One candidate that turned out to need nothing**, because the decision
already existed and the list of decisions was missing it. A small thing, and the
same shape as everything else on this list: the list was written from memory
rather than from the shelf.

### Where the product stands

**Nine of eleven tasks in the final story of the live-market phase.** The
product itself does not change today — what changes is that a person joining
this project, or an interviewer opening the repository, now finds **one
document that wins** rather than sixty that disagree.

What remains is a mechanical pass over our self-tests, and the phase's close.
