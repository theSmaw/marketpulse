# Task 3.11.11 — The re-take, the upward sweep, and Epic 3's close

**Status:** **Complete — 2026-09-25. EPIC 3 IS CLOSED**, both halves of the exit criterion met, the second by a person on 2026-09-24. The fifth hand-off enumeration found **two** missing — and both are cases an ADR had written down in its own text and nobody had acted on. The bill's re-read holds the 32% step and found that **a same-day cost reading under-reports**. Six items ship open, each with an owner and a condition; none of them is a feature.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.2, 3.11.3, 3.11.4, 3.11.5, 3.11.6, 3.11.7, 3.11.8, 3.11.9, 3.11.10 — **renumbered from 3.11.10 on 2026-09-25, when the breaks pass was split out ahead of it; see the amendment at the foot**

## Objective

Criteria 1, 6, 7 and 8 — and **Epic 3's close**, which is the first epic close
this product has taken with a live third party in it.

## What the user can see when this lands

**Nothing new**, and an epic whose figures can be re-taken rather than cited.

## Criterion 1 — every criterion in Stories 3.1–3.10, re-taken

**With the instrument named and the reading quoted**, and with the split stated
between:

- the ones that **re-take from a clean clone** — a test name, a break, a command
- the ones that are **dated readings against a populated store and a live
  session**, which a later reader cannot reproduce and must be told so

Task 3.11.1 will have extracted the list into one table. This is where it is
filled.

## Criterion 6 — the upward sweep, which is the obligation most likely to be skipped

**Falsification travels upward**: a task measures a vendor or the tree, and what
it invalidates is a premise in an ADR, an invariant in `CLAUDE.md`, or
`PRODUCT_SPEC.md` — and **nothing sweeps upward**, because a story close sweeps
that story's own documents.

**This has already happened in this repository**: for a day, `ALPACA.md` and ADR
0019 both recorded that §7.1's feed claim was false while §7.1 itself,
`README.md`, two other ADRs and invariant 6 went on asserting it.

**Against the list AND against a grep** — the list is what somebody thought of,
the grep is what is there. Known candidates:

- **`PRODUCT_SPEC.md` §42's milestone**, whose _live price updates_ clause is
  this epic's and is marked as such
- **§7.1's asymmetry table** — a dated observation of a third party, re-measured
  first-hand by the spike
- **§6's universe sizing**, and **§28**, which this epic has amended three times
- **`CLAUDE.md`'s invariant 6**, whose parenthesis has become a statement about
  shipped code — and which this epic **breached twice in one week**, in the
  chrome (Task 3.10.6) and in the ledger (Task 3.10.8)
- **`CLAUDE.md`'s Current state**, and its _what they still cannot do_, which
  Story 3.10's close already emptied of this epic
- **`VISUAL-LANGUAGE.md`'s Motion section**, whose deferral is discharged, and
  its **released** live-row reservation
- **`PROVIDER.md` §12**, which sketched this epic's seam and can now record what
  shipped against what was predicted
- **`FeedIndicator`'s and `feed-status.ts`'s own comments**, which described a
  component that was not in the chrome and a type waiting for this epic

**Live claims amended with a date; historical records left standing; ADRs given
dated amendments rather than rewrites.**

## Criterion 7 — `docs/GAPS.md`, and the standing instruction

**An entry that can be made mechanical should be.** Two batches have already
left that list that way — the backfill's timeframe coverage became
`pnpm coverage:check`, and seven single-grep entries became `pnpm invariants`.
**A prose entry with a re-measure command is a check nobody runs.**

A live feed generates exactly the kind of claim that rots silently, and this
epic added several: the socket churn, the one cell at 390, the backend-side
dropout, the listening backlog at six entries.

## The hand-off enumeration, with its own recorded history

**Grep this story's documents for every `Story N.M`, `Epic N` and `Owner:`
line, check each recipient's own file, and record the count that were
missing — including if it is zero.**

The record across four closes reads **1, 6, 3, 6**. Story 3.10's close named the
conclusion: _nothing about writing a constraint down moves it to the file that
will be read_, and this enumeration is the only step that has ever caught it —
and it has caught something every single time it has run. **This is the fifth
run.**

## Epic 3's own close

`EPIC.md`'s exit criterion has two halves and the second is the hard one:

> The application can maintain a live connection for the tracked universe and
> update visible market values without page refreshes. **And every visible story
> has been watched working against the real IEX socket, during a real session,
> with a dated row in `LIVE-REHEARSAL.md`.**

Check both against what Stories 3.1–3.11 actually delivered, and record the
**second** half's verdict as the owner's call if Task 3.11.8's sitting did not
settle it.

## Work

- Criterion 1's table filled, with the clean-clone / dated-reading split stated
- The upward sweep, against the list and against a grep
- `docs/GAPS.md` updated, with anything mechanisable made mechanical
- Every `pnpm break` this epic added performed — **Task 3.11.10's, in full**;
  this task reads its findings rather than running them
- The hand-off enumeration and its count, recorded whatever it is
- `CLAUDE.md`'s _Current state_ and _Where the record lives_
- **Epic 3 closed**, both halves of the exit criterion verdicted
- What ships open, each with an **owner and a condition** rather than a story
  number

## Done when

1. Every criterion in Stories 3.1–3.11 has a verdict with an instrument named
2. The hand-off count is recorded, and the fifth data point is in the record
3. `pnpm verify`, `pnpm test:database`, `pnpm e2e` and `pnpm links` all green
4. Epic 3 is closed, or the single reason it is not is named with its owner

## Amended by Task 3.11.1 — 2026-09-25: one decision has no other home, and it lands here

**Decision 3 — no CI credential — was answered with two measured consequences
that this decision does not repair**, and no other task in this story owns
writing them down:

- **A spec asserting an ABSENCE passes for free on a runner with no credential.**
  `market-feed.spec.ts` held a list of words that must never render again for
  **four days** after Task 3.3.5 deliberately made them real, and did not go red
  — because those words happen not to appear on an unconfigured deployment.
- **No browser test in this epic has ever watched a real vendor frame reach a
  screen.** `market-connection.spec.ts` furnishes the states from inside the
  browser, which is the right answer for a page-level assertion and **is not
  the same claim**.

**Both go to `docs/GAPS.md` with the decision beside them**, because the reason
is the thing that dates: the binding constraint is the **single connection**,
not the quota — a CI credential would be a third claimant for a slot the
deployment and any developer already contend for, and it would take
**production's** socket down rather than merely failing a test. **That argument
stops applying the day this product leaves the free plan**, which is the
condition to record rather than a story number.

**And criterion 1's table is already built** — Task 3.11.1 extracted it, with
the clean-clone / live-session / quote-only split criterion 1 asks for. This
task fills it rather than assembling it.

## Amended by Task 3.11.2 — 2026-09-25: one corollary for the sweep, and one withdrawal to carry

**A rule earned the hard way belongs in `CLAUDE.md`'s _measure rather than
cite_ corollaries**, beside _a break that does not go red is not evidence the
check works_ and _a figure that has moved looks exactly like a figure that was
mis-recorded_:

> **Count by URL, never by event.** A browser page holds sockets that are not
> this product's — on a dev server, two of them are Vite's HMR connection — and
> a number with no URL beside it cannot tell them apart.

**Its cost is the argument for promoting it**: the wrong figure became a
`docs/GAPS.md` entry with an owner and a re-measure, a floor on a feature built
the same day, a paragraph in `CLAUDE.md`'s current state, a task in this
story's split, and a line in a commit message and a PR body — and **survived
four days because it was quoted rather than re-run.** The instrument had been
deleted, so every reader after the first had a conclusion and no evidence.
That is `ALPACA.md` §11's rule failing in the one way it exists to prevent.

**And the withdrawal is a sweep item in its own right.** Four sites carried the
false claim and each now carries a dated correction. The upward sweep should
**grep for the figure rather than trust that list** — `three market-stream
sockets`, `twelve seconds`, `four-second` — because this is exactly the shape
the sweep exists for: something measured, propagated, and then falsified.

## Amended by Task 3.11.3 — 2026-09-25: one GAPS entry closed with a residue, and one document to check

**`docs/GAPS.md`'s _the market stream's eight diagnostic events are emitted and
never logged_ is CLOSED**, and narrowed rather than erased: the residue is that
**a log is only read by somebody looking**, with an owner that is a condition —
_the first outage that begins and ends between two merges_, which is the case
neither the log nor the deployed check can see. The sweep should confirm that
residue reads correctly after everything else in this story has landed, because
two later tasks could change it: Task 3.11.6's slot reading and Task 3.11.7's
verdict on condition 3.

**And one document to check rather than assume.** `CLAUDE.md`'s current-state
section describes a product whose market feed reports nothing to an operator.
That stopped being true on 2026-09-25; whether it says so anywhere is this
task's to check with a grep rather than a memory.

## Amended by Task 3.11.4 — 2026-09-25: one grep for the sweep, and it needs a distinction rather than a substitution

**`9,750` appears across at least twelve files**, and this is exactly the shape
the upward sweep exists for: a figure measured, propagated, and then found to
describe something no screen can produce.

```text
CHARTING.md                18
SEARCH-AND-SELECTION.md     6
Task 2.12.9                 7
CLAUDE.md                   3
Story 2.12's STORY.md       3
Epic 14's EPIC.md           1   … and more
```

**Do not substitute.** The distinction the sweep has to draw is this
repository's standing one, and getting it wrong destroys the record:

- **Historical records** — Task 2.12.9's measurements at a hypothetical 9,750
  bars, ADR 0027's element-count argument, `CHARTING.md` §16's candidate table.
  These say _what we measured, and at what density_. **They stand.** The
  measurement was real even though the density is unreachable.
- **Live claims** — anything reading _the product can be asked for 9,750 bars_,
  or sizing a surface against it as the worst case a reader can reach. **These
  are wrong** and take a dated amendment pointing at `CHARTING.md` §19.

**The correct live figure is 8,190** — `MAX_MINUTE_SESSIONS = 21` × 390 — and
the 9,750 is the **server's** cap, which `time-window.ts` exists to keep
unreachable and demonstrably does.

> **And one judgement the sweep should make rather than inherit**: ADR 0027's
> argument is _one element per bar at the cap is 9,790 elements_. That is a
> hypothetical about a rejected design, not a claim about the product, so it is
> **not** falsified — but a reader meeting it after §19 will wonder, and an ADR
> gets a dated amendment rather than a rewrite.

## Amended by Task 3.11.5 — 2026-09-25: one re-read this task OWNS, and four figures for the grep

### The re-read, which is named as this task's in `docs/GAPS.md`

**The 32% step has n=2.** Container Apps ran at `$0.2056`/day for twelve days
and billed `$0.2832` and `$0.2589` on 09-23 and 09-24 — the two days after Task
3.8.3's live bar writer shipped. **Two days is a step, not a measurement**, and
this task is the next thing that runs.

```sh
az rest --method post --url "https://management.azure.com/subscriptions/$SUB\
/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
  --body '{"type":"ActualCost","timeframe":"Custom","timePeriod":{...},
           "dataset":{"granularity":"Daily", …}}'
```

**Take every reading in one pass** — the API answers and then returns `429`.

**If the 32% holds**, the cost of a live session is **a database write a
minute** rather than a held socket, and ADR 0011's arithmetic needs **redoing
from a different premise rather than amending again** — which is a judgement for
Task 3.11.9 and a figure for this one.

### Four figures for the upward sweep, and one is provably wrong

| Figure                      | Where                                                   | Status                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **$9.26/month**             | `LIVE-DATA.md` §9, Epic 3's `EPIC.md`, three task files | **superseded** by a reading of $13.32                                                                                                                                                             |
| **$19.04/month**            | Epic 2's `EPIC.md`, four task files                     | **historical** — ADR 0011's original, already amended once                                                                                                                                        |
| **22.5 GiB usable**         | five files across Epic 2                                | **check it**: Azure Monitor reports 13.62 GB at **41%**, which implies ~34 GB provisioned rather than 22.5 GiB usable. One of those two is about a different thing and the sweep should say which |
| **~2.6 years / ~1.5 years** | `CLAUDE.md`, `BARS.md`, Epics 13 and 14, Story 3.8      | **~2.1 years measured**, and the `~1.5` assumed two-tape growth that has **no signal yet**                                                                                                        |

**The distinction this repository always draws applies**: a task file recording
_what we estimated on the day_ is a historical record and stands; a document
saying _this product costs $9.26_ is a live claim and is now wrong.

> **And the trap this task should expect**, because Task 3.11.5 nearly fell into
> it: **September's own total is $9.25, within a cent of the estimate** — and
> only because Container Apps billed **$0.00/day for the first eleven days**. A
> sweep that confirms the estimate against the monthly total will record a
> prediction confirmed to the cent **and be wrong by 44%**. Use the run rate.

## Amended by Task 3.11.6 — 2026-09-25: one sweep candidate, one sideways hand-off, and one item that ships open

### A sweep candidate, with the grep already run

**`LIVE-DATA.md` §12.2's `≤ 5 s` row is falsified** (measured 45.8 s / 46.5 s),
and §12.2 has been amended in place. **The grep for the claim's other homes was
run on the day**: `docs/GAPS.md` (entry re-verdicted), `LIVE-DATA.md` §12.2 and
§15, and this story's own `STORY.md` table of predicted outcomes. **That table
is a historical record** — it is what was decided _before_ the data, and its
third row is the one that came true; it is left standing on purpose.

**What the sweep must still check is the ADRs**, because a deploy-window figure
is exactly the kind of number that gets quoted by a decision record. Task
3.11.9 is weighing ADR 0011's disposition and this belongs to the same
judgement.

### A sideways hand-off, to a story that has already closed

`STORY.md`'s own table says the outcome that landed _"is a finding for Story
3.10's reconnection policy as much as for this story."_ **Story 3.10 is
closed**, so nothing about its close will reach this.

**The finding**: a deploy costs ~46 s of feed, which is **shorter than both
liveness thresholds** — 60 s wall for `stale`, 165 s monotonic for
`disconnected`. So the most common feed interruption this product actually has
produces **no degraded word at all**, by design and by arithmetic. That is not
a defect and it needs no repair; it is a fact about what those thresholds mean
in practice, and the hand-off enumeration should confirm it reached a document
Story 3.10's reader opens rather than only this story's.

### And one item ships open, with an owner and a condition

**Whether the socket survives a full 56-hour market closure _now_** — §9.3's
_hold the socket always_ has exactly **one** confirming reading
(2026-09-25T03:13Z, market shut, `live`) against a weekend that had forty hours
`disconnected`. Task 3.11.6 deliberately did **not** start a weekend poll,
because Task 3.11.1 established nothing in this story waits on a clock.

**It is recorded in `LIVE-DATA.md` §15.4 with the instrument** — a poll anybody
can start on a Friday. **Owner and condition rather than a story number**: the
next person who wants the deployment to be trusted across a closure, or the
first Monday pre-market that opens with no feed.

## Amended by Task 3.11.7 — 2026-09-25: renumbered, one bullet removed, and two things added to the sweep

**This task was 3.11.10 and is now 3.11.11.** Task 3.11.7's sweep split the
breaks pass out ahead of it as the new **Task 3.11.10**, because the bullet
_"Every `pnpm break` this epic added performed"_ turned out to be **61 entries
and well over an hour** — an unattended hour at the end of an epic, inside the
task that also closes the epic. The bullet is gone from the Work list above;
**read 3.11.10's findings instead of running them.**

Every reference was remapped in the same change: this file's title, its
`Depends on`, Task 3.11.4's Epic 14 trigger, Task 3.11.9's n=2 caveat, and
`STORY.md`'s table.

### One item for criterion 6, the upward sweep

**`CLAUDE.md`'s _measure rather than cite_ corollaries have a candidate**, and
it is the same rule the sweep itself rests on:

> **A claim about a mechanism reads identically whether the mechanism is there
> or not.** A document that describes a guard — an ADR, a `docs/GAPS.md` entry,
> a subject document — owes something mechanical that fails when the guard goes.

**Its cost is the argument for promoting it, and this epic paid it twice.**
`LIVE-REHEARSAL.md` claimed a completion marking that did not exist
(2026-09-21); ADR 0030 §7b described a deploy step that had never been written,
and `docs/GAPS.md` entry 9 then quoted §7b as _the only preventive mechanism_
(2026-09-25, nine days standing). Both were found by somebody going to use the
mechanism, not by anything mechanical. **Task 3.11.9 is weighing whether this
is a `CLAUDE.md` corollary or an ADR — take its verdict rather than deciding it
twice.**

### One item for criterion 7, `docs/GAPS.md`

**Entry 9's corrected sentence is the kind that rots**, because it describes
three mechanisms in prose. Two of them now have checks that fail when they go —
`the-deploy-reads-the-provider` in `pnpm invariants`, and
`probe-deployed.yml`'s own existence. **Ask of every remaining entry that names
a mechanism: what fails if somebody deletes it?** That is the mechanisable
half of this list and it is exactly the standing instruction criterion 7
carries.

## Amended by Task 3.11.9 — 2026-09-25: two sweep items are DONE, and one is now a check rather than a reading

**The corollary this task was handed is decided and written.** Task 3.11.9's
verdict was `CLAUDE.md` rather than an ADR — it is a rule about how to write a
document, not a decision about this product — and the paragraph is in place
beside _a break that does not go red is not evidence the check works_:

> **A claim about a mechanism reads identically whether the mechanism is there
> or not.** When you write that something is guarded, write the check in the
> same change.

**So criterion 6 loses that item and keeps the sweep.** What it should still do
is the harder half: **grep for other mechanism claims** in the ADRs and in
`docs/GAPS.md` and check each against the tree. Two were found by accident this
week; nobody has looked on purpose.

**And `CLAUDE.md`'s _Current state_ has already been corrected in one place.**
Its _what they still cannot do_ paragraph claimed `LIVE-REHEARSAL.md` had
**four dated rows and not one watched by a human**, which Task 3.11.8 made
false the same day. It is struck and answered in place rather than deleted,
because it was true for nine stories. **The rest of that section is still this
task's**, and it is long.

**One addition to the record table**, also already made: `LIVE-REHEARSAL.md`
was in no table anywhere — the only file in this repository about somebody
**looking** rather than about a check passing, and a reader had to know it
existed. It now has a row.

## Amended by Task 3.11.9 — 2026-09-25: the bill's re-read now lands in a different document, and the sweep has an entry point

### The re-read this task owns: amend **ADR 0037**, not ADR 0011

**ADR 0011's cost subject is closed and handed on.** Task 3.11.9 wrote
[ADR 0037](../../../docs/adr/0037-what-this-deployments-shape-costs-in-money-and-in-feed.md) —
_what this deployment's shape costs, in money and in feed_ — and left 0011's
twenty-four decisions untouched, with one dated line at the foot of its cost
section saying where the subject went.

**So when the 32% step is re-read:**

- **it does not hold** → **ADR 0037's decision 1 is what gets amended.** Its own
  reversal trigger says so in as many words. Do **not** open ADR 0011 again;
  a fifth cost entry there is exactly what the handover was written to prevent.
- **it holds** → 0037 needs no amendment, and the note is that its n rose from 2. Record the reading in `HOSTING.md` either way, which is where the full
  bill lives.

**And there is a second figure with the same shape now.** ADR 0037's decision 2
says every deploy costs **~46 s** of live feed on the platform's schedule, with
the reversal trigger _a deploy measured taking materially more or less_. That is
a dated observation of a third party, not a contract — if the close reads the
stream log again and the figure has moved, it is 0037's to amend.

### The sweep has an entry point it did not have

**`LIVE-DATA.md` §0 now carries a map** of the six other documents this epic
touched, each with a one-line verdict, **plus all eight ADRs**. Criterion 6's
_against the list AND against a grep_ is unchanged — the grep is still the half
that finds what nobody thought of — but **the list no longer has to be
reassembled from memory**, which is how Task 3.11.9 found its own candidate list
had a hole in it (ADR 0032 missing from a table that claimed to name six).

**Two things for the sweep to carry, both already true in the tree:**

- **This epic produced EIGHT ADRs, not six** — 0030, 0031, 0032, 0033, 0034,
  0035, and now 0036 and 0037 — and amended 0011, 0026–0029. Anything in
  `EPIC.md` or this story's own narrative that counts them should count from the
  directory.
- **ADR 0030's mechanisms are `7a`, `7a-bis`, `7b`, `7c`, `7d`, `7e`, `7f`**,
  and `7d` is the **daily scheduled probe** while `7f` is the **in-session
  refusal**. Two task files have now misremembered this; the map names them
  from the ADR.

## Amended by Task 3.11.10 — 2026-09-25: one break is armed by THIS task's own close

**`the-close-outruns-the-rehearsal` cannot go red today, and the reason is that
its subject got finished.** The invariant it proves needs two conditions at
once — Story 3.11 marked **complete**, and a row in `LIVE-REHEARSAL.md` still
**empty** — and Task 3.11.8 filled the last three empty rows. A break is one
file, so no single substitution can restore both halves.

**So the run belongs to this task, after the status line changes**, and it is
two minutes:

1. Mark Story 3.11 complete, as this task does anyway.
2. **Repoint `the-close-outruns-the-rehearsal` at `LIVE-REHEARSAL.md`**,
   emptying one row's cells rather than editing `STORY.md`.
3. `pnpm break the-close-outruns-the-rehearsal`, and confirm the message names
   the rehearsal rows.

> **Why it is worth the two minutes rather than a note saying it is fine.**
> This is the check that exists because `LIVE-REHEARSAL.md` claimed a mechanism
> that did not exist. Leaving it in a state where it provably cannot fail — on
> the very commit that closes the epic it guards — would be the same defect
> wearing the check's own clothes.

**And `every-break-can-still-land` will not notice**, because the `find` text is
still there. That invariant asserts the cheap half by design.

---

## What was done — 2026-09-25

### The hand-off enumeration — the fifth run, and it found two

**The record across four closes reads 1, 6, 3, 6. This run: 2.**

Both are the same shape, and it is a shape with a twist worth recording:

| Missing                                                                                               | Owed by                                                                   | The twist                                                                            |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **ADR 0036's two-clock rule** — a duration is monotonic, an age is wall-clock, neither reads the wire | Epic 10, whose agent event stream has a measured four-minute idle ceiling | the ADR **says in its own Context** that Epic 10's `EPIC.md` does not know it exists |
| **ADR 0032's announcement rule** — a value that changes on its own announces nothing                  | Epic 5, whose anomaly scores change as the market moves                   | ADR 0032 **names Epic 5 by name**, in as many words                                  |

> **Both ADRs diagnosed the hand-off failure correctly and neither repaired
> it.** Writing _"neither epic's `EPIC.md` knows this decision exists"_ inside
> the document the other epic will not read is the failure describing itself.
> **`CLAUDE.md`'s rule is the repair and it is stronger than it looks**: the
> constraint goes **into the recipient's own file, in words that story can act
> on** — never a pointer back, because a pointer is what a reader follows when
> they already know to look.

Both are now written into Epic 10's and Epic 5's `EPIC.md` with the rule, the
defect it prevents, and the shipped shape to copy.

**The other three recipients were checked and were fine**: Epic 14 holds the
cold-load figures and its trigger, Epic 13 holds the replay guards and the
sizing, and Epic 4 holds the live-feed references. **The enumeration has now
caught something on all five runs it has ever had.**

### The bill, re-read — the step holds, and the instrument has a bias

ADR 0037's own reversal trigger asked for this.

|                         | 09-12 → 09-22       | 09-23         | 09-24         |
| ----------------------- | ------------------- | ------------- | ------------- |
| Container Apps, per day | `$0.2039`–`$0.2161` | **`$0.2832`** | **`$0.2772`** |

**~34% over the pre-writer baseline**, against ~32% four days ago. **So the
premise is definitively retired**: what moves this bill is a database write a
minute, not a held socket, and ADR 0037 needs no amendment — its n rose.

> **And the instrument has a bias nobody had noticed.** Task 3.11.5 read 09-24
> as **`$0.2589`**; settled, it is **`$0.2772`** — **7% higher**. A same-day
> cost reading under-reports because the day is still accruing. **A step
> measured on the day it happens is measured small**, and a small step is the
> one that gets called noise. That is in `HOSTING.md` beside the reading.

**Run rate `$13.53/month`**, from `$13.32`, against a $20 budget.

### Criterion 1 — verdicted rather than filled, and the split is the honest part

Task 3.11.1's table has fourteen rows in three classes. **Two classes are
discharged; one is not, and saying so is the criterion's own instruction.**

- **Clean-clone rows (3): verdicted.** Tape validation, and every criterion of
  3.1–3.11 with a test name, re-take from a fresh checkout — `pnpm verify`,
  `pnpm test:database`, `pnpm e2e`, and **every one of the 82 `pnpm break`
  entries, all performed** (Task 3.11.10: 74 red in this pass, five in 3.11.7,
  three findings, and the registry runs in **170 seconds**).
- **Quote-only rows (3): verdicted.** The cold load, `Expand all` and the
  store's row size stay quoted with their dates and their owners; Epic 14's
  trigger is evaluated and **did not fire**.
- **Live-session rows (8): NOT TAKEN, and owned.** §28's p95 against the
  deployed gateway, the burst at live density, the tick at 518 rows, the frame
  payload, and **the transition's own cost, which has never been taken at
  all**. The instrument for them is written and rehearsed
  (`scripts/session-sitting.mjs`, Task 3.11.8); what they need is a session.

> **This is the one place the close is short of its own criterion, and it is
> recorded rather than argued away.** The figures that exist are loopback
> figures taken on one machine, and they are labelled as such everywhere they
> appear — `PRODUCT_SPEC.md` §28's amendment says so in its own words. **A
> deployed re-take is a measurement, not a capability**, and the epic's exit
> criterion does not ask for it.

### The upward sweep

**Against the list and against a grep**, as criterion 6 requires — the list is
what somebody thought of, the grep is what is there.

| Swept                        | What changed                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRODUCT_SPEC.md` §42        | the milestone's **live price updates** clause is discharged, with what a reader can now see                                                        |
| Epic 3's `EPIC.md`           | **closed**, the cost paragraph amended with the bill, and `7d` corrected to **`7f`** in the exit criteria — the ADR's `7d` is the daily probe      |
| `CLAUDE.md` current state    | Epic 3 announced as complete, with the eight ADRs and the document that wins                                                                       |
| `CLAUDE.md`, Epics 13 and 14 | the **~2.6 → ~1.5 years** headroom is a projection; the measurement is **~2.1 years**, and the `~1.5` assumed a two-tape growth with no signal yet |
| `docs/GAPS.md`               | two entries added — see below                                                                                                                      |

**And three greps that found nothing to repair**, which is worth recording
because a sweep that only reports changes cannot be told from one that was not
run: `$9.26` survives only in historical records and in documents that already
carry their correction; the socket-churn figure exists only inside its own
withdrawal; `9,750` was swept by Task 3.11.4 on the day, which the distinction
it drew — historical measurement versus live claim — made cheap.

### `docs/GAPS.md`, and the standing instruction

**Two entries added, and both are residues that cannot be made mechanical:**

- **15 — that a browser test asserting an ABSENCE is asserting anything.** CI
  has no credential by a decision whose reason dates (the single connection,
  not the quota), and a spec held a list of words that must never render for
  **four days after they became real** without going red.
- **16 — that a document describing a guard is describing something that
  exists.** The rule is in `CLAUDE.md`; what this entry carries is the
  re-measure nobody has ever run on purpose: grep the ADRs and this file for
  `fails if`, `refuses`, `asserts`, `is enforced`, and check each against the
  tree.

**And the mechanisable half was taken rather than listed**: entry 9's two
preventive claims now have `the-deploy-reads-the-provider` in `pnpm invariants`
and `probe-deployed.yml`'s own existence behind them.

### The break that this close arms, run

**`the-close-outruns-the-rehearsal` was repointed and proved red.** Task
3.11.10 found it could not go red at all: the invariant needs Story 3.11
**complete** and a rehearsal row **empty**, and Task 3.11.8 had filled the last
empty row.

**Marking the story complete supplied the first condition permanently**, so the
substitution moved to the second — it blanks row 3.3 and pushes the real row
out of the regex's reach rather than deleting it. `pnpm invariants` caught the
old entry the moment the status line changed, which is exactly what
`every-break-can-still-land` is for, and the repointed break now reports:

```
✓ planning/epic-03-live-market-data/LIVE-REHEARSAL.md broken → red → restored
  matched: rehearsal rows
```

### Epic 3's close

**Both halves met.** The detailed verdicts, and the six items that ship open
with an owner and a condition each, are in `EPIC.md`'s own close section — the
file a later reader opens.

> **The second half is the one worth pausing on.** It stayed open for nine
> stories, and the reason is that it was the only criterion in this epic that
> **no instrument could satisfy by trying harder.** Task 3.11.1 ruled that an
> instrumented row does not satisfy the word `watched`, which made the epic
> blocked on a person; and on 2026-09-24 the owner watched the deployed product
> work and said nothing looked wrong.

### Gates

**All four, with their numbers rather than an assertion:**

| Gate                 | Result                                           |
| -------------------- | ------------------------------------------------ |
| `pnpm verify`        | **green**, including `pnpm invariants` at **27** |
| `pnpm test:database` | **green — 211 tests** against a real PostgreSQL  |
| `pnpm e2e`           | **green — 166 passed**, 15 skipped, 3.0 min      |
| `pnpm links`         | **green — 435 documents, 1,602 links, 0 broken** |

**And the registry**: all **82** `pnpm break` entries performed — 77 in Task
3.11.10, five in 3.11.7 — plus `the-close-outruns-the-rehearsal` repointed and
re-run here, which makes it 83 runs of 82 entries.

## For a stakeholder — a status report, 2026-09-25

### The live-market phase is complete

**MarketPulse is a live application.** Open the deployed site during a US
trading session and it moves: 518 companies with prices that update on their
own, a chart that extends minute by minute without a refresh, and an indicator
that tells you plainly when the data stops arriving rather than showing you a
stale number as if it were current.

**Eleven stories, and the last one was about proof rather than features.**

### The thing that kept this phase open

The completion criterion for this phase contained one word that turned out to
be expensive: **watched.**

Everything else could be demonstrated by a machine — and was, thoroughly. But
we decided earlier this week that a machine watching does not satisfy the word,
**because a machine only reports what it was told to look for**. The phase was
therefore blocked not on engineering but on a person looking at the product
during market hours, which in this timezone is late evening.

**That happened, and nothing looked wrong.** It is recorded as a person's
observation, with a note saying exactly what a person's row can claim and what
it cannot — it carries no figures, because the owner was watching rather than
taking notes, and a row with numbers nobody wrote down would be a row about an
inference.

### What we found in the last mile

**The bill re-read, and a bias in how we read bills.** Four days ago we found
our hosting cost stepped up 32% on the day we started writing market data to
the database. Re-read today: **the step held, and grew slightly** — because
**a cost read on the day it happens is under-reported**, since the day is still
being totted up. A small step is the one that gets dismissed as noise, so this
is now written down beside the reading.

**Two decisions that had been documented and never delivered.** Our record of
architectural decisions is unusually thorough, and twice this week a decision
document described a safeguard that had never actually been built. The rule
that came out of it — _when you write that something is guarded, write the
check in the same change_ — is now part of how we work, with automated checks
behind both instances.

**Two hand-offs that nobody had passed on.** Every phase close runs one step
that has caught something every single time: a check that constraints measured
for _other_ phases actually reached those phases' own files. It found two, and
both have a sting: **the decision documents themselves said, in writing, that
the receiving phase did not know they existed** — and nobody then told it. The
future work on anomaly scores and on AI investigations now carries the rules it
needs, in its own files.

### What we are deliberately shipping without

**Eight performance figures need a live trading session to take**, and we have
the instrument written and rehearsed for them. They are measurements of
something that already works, not missing capability — and saying so plainly is
better than taking them on a developer's laptop and labelling them as if they
came from the real thing.

Beyond that: one question that needs a real phone, and a listening pass with a
screen reader. Each has a named owner and a condition that triggers it, rather
than a date that will slip.

### Where the product goes next

**Phase 4 builds the Market Overview** — the landing screen, with the unusual
activity feed and the market topology that this product is visually built
around. It sits directly on what the last eleven stories delivered: without a
live feed there is nothing for an overview to overview.

**The product is now two of the five capabilities in its own pitch**: it shows
you what is happening, live. What it does not yet do is tell you what is
**unusual** — that is the next phase but one, and it is the first time this
product will say something a person could not have worked out by looking.
