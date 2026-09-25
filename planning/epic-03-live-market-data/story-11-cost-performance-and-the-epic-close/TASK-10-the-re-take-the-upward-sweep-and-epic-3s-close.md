# Task 3.11.10 — The re-take, the upward sweep, and Epic 3's close

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.2, 3.11.3, 3.11.4, 3.11.5, 3.11.6, 3.11.7, 3.11.8, 3.11.9

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
- Every `pnpm break` this epic added performed — Task 3.11.7 will have done the
  replay guards; this covers the rest
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
