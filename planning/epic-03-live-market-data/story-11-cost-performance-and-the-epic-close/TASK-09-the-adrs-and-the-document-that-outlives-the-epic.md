# Task 3.11.9 — The ADRs, and the document that outlives the epic

**Status:** Not started
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
