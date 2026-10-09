# Story 4.9 — The Rehearsal, the Sweep, & Epic 4's Close

**Status:** Not started
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.7 — **corrected 2026-10-07**, see the amendment at the foot
**Epic scope covered:** the close

## Description

**The close, and this epic inherits a shape that has been run once end to
end.** Epic 3's close is the template and its record says what each step is
worth:

- **The rehearsal ledger.** `LIVE-REHEARSAL.md` has one row per story that
  changes something a stranger can see, taken **during a session, against the
  real feed, by a person**. Epic 3 learned that an instrumented row does not
  satisfy the word _watched_ — and that the epic stayed open for nine stories
  because of it. **This epic's visible stories each owe a row, and the sitting
  is bookable rather than a judgement.**
- **The upward sweep.** Falsification travels upward and nothing sweeps that
  way on its own: a task measures something and what it invalidates is a
  premise in an ADR, an invariant in `CLAUDE.md`, or `PRODUCT_SPEC.md`.
  **Against the list and against a grep** — the list is what somebody thought
  of, the grep is what is there.
- **The hand-off enumeration.** Grep this epic's documents for every
  `Story N.M`, `Epic N` and `Owner:` line, check each against the recipient's
  **own** file, and record the count that were missing. The record across five
  runs reads **1, 6, 3, 6, 2**, and it has caught something every single time.
- **`docs/GAPS.md`.** An entry that can be made mechanical should be. A live
  aggregate generates exactly the kind of claim that rots silently.

**And one thing this epic owes that Epic 3 did not**: its headline numbers are
**aggregates**, and an aggregate is checkable by nothing. A breadth percentage
that is quietly wrong looks exactly like one that is right, on every screen, in
every test. **The close has to say what would catch that**, and _a person
looking_ is a legitimate answer as long as it is written down as one.

## What the user can see when this story lands

**Nothing new**, and a landing page whose figures can be re-taken rather than
cited.

## Acceptance criteria

1. Every criterion in Stories 4.1–4.8 has a verdict with an instrument named,
   split between **re-takes from a clean clone** and **dated readings** a later
   reader cannot reproduce
2. **A person has watched this screen during a live session**, with a dated row
   per visible story, and the `What was wrong` column filled honestly
3. The upward sweep run against the list **and** a grep, with live claims
   amended by date and historical records left standing
4. The hand-off enumeration run and its count recorded — the sixth data point —
   **including if it is zero**
5. `docs/GAPS.md` updated, with anything mechanisable made mechanical, and the
   aggregate question above given an owner and a condition
6. `pnpm verify`, `pnpm test:database`, `pnpm e2e` and `pnpm links` green, with
   their numbers rather than an assertion
7. **Epic 4 closed**, its exit criterion verdicted, and what ships open carrying
   an **owner and a condition** rather than an epic number

## Design work

The canvas artefacts this epic produced are given a verdict on whether they are
finished, and `VISUAL-LANGUAGE.md` is reconciled with anything the canvas
gained — the chain is **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` →
components**, and it only stays true if a close walks it.

## Out of scope

Epic 5's anomaly work, which fills the region this epic leaves named.

## Handed here by Task 4.2.2 — 2026-09-26: the rehearsal row for the proxy strip must say WHICH of two things was watched

**The proxy strip's arrival mark fires on up to four cells at once, and
whether that reads as _four facts arriving_ or as _the page refreshing_ depends
on a fact nobody has measured.**

Task 4.2.1 established that the gateway sends **up to ~16 `bars` frames a
minute**, not one — the story's own premise, corrected. Each security still
produces one bar a minute, but **whether `SPY`, `QQQ`, `DIA` and `IWM` arrive
in ONE of those frames or spread across several decides the question**: four
marks in one frame is a synchronised wave, and four across several frames is a
stagger the data genuinely has, arriving free.

**So read it from the gateway BEFORE the sitting and write the answer beside
the row.** A rehearsal that cannot say which of the two the watcher saw cannot
answer anything — and this is the shape of defect this epic has already paid
for once, where an instrument counted every socket on a page and two of three
were Vite's.

**The inherited reversal trigger is live here.** `The mark multiplied by five
hundred.dc.html` shipped 518 simultaneous marks with the synchrony risk
recorded as **accepted rather than disproved** — _"whether a synchronised wave
reads as a market breathing or as a page flashing … a judgement only a person
watching a real session can return"_ — under a two-clause trigger: _the first
rehearsal in which a reader describes the minute tick as a **flash** rather
than as a **pulse**_, **or the first surface where the burst stops being once
a minute**. The second clause is the one to watch, because this strip is four
subjects rather than 518, and the defence that carried the table — twelve
discs scattered in a viewport reading as texture — needs a density four cells
on one horizontal line do not have.

## Corrected 2026-10-07 after Story 4.3 — this story depended on 4.8, and 4.7 runs AFTER 4.8

**The close could have run before the epic's last feature story.** On 2026-09-27
Stories 4.7 and 4.8 were re-ordered: **4.7 now depends on 4.8**, because 4.7 needs
a phone during a real session and 4.8 needs neither. The identifiers were
deliberately **not** renumbered — `CLAUDE.md` forbids a renumber without remapping
every reference in the same change, and four sibling files plus `docs/GAPS.md` name
`Story 4.7` for the degraded set.

**What that re-order missed is this file.** It left `Depends on: 4.8` here, so the
dependency graph said the close was unblocked the moment 4.8 finished — **with 4.7
still to ship.** The real order is:

> 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → **4.8 → 4.7** → 4.9

Corrected to **4.7**. This is exactly the trap this repository warns about in as
many words — _a sequence whose numbers do not reflect its order is a trap for every
future reader_ — and it was found by reading the chain rather than by anything
mechanical, because **nothing checks a dependency line against the story it names.**

**One consequence for your own criterion 1**, which reads _every criterion in
Stories 4.1–4.8 has a verdict_: that range is written in **numbers** and the
**order** now differs from them. It should say _4.1 through 4.8 inclusive, which
ends with 4.7_ or simply _every other story in this epic_. Left as a note rather
than edited, because the criterion is correct as a set and only misleads about
sequence.

### And two items this story inherits from Story 4.3's close

**1. `LIVE-REHEARSAL.md` has two OPEN rows and you own closing them.** Story 4.2's
and Story 4.3's, both opened on 2026-09-27 rather than at a close, because that
ledger's own history is empty rows accumulating and then being filled by a headless
browser. **Neither can be filled by an instrument**:

- **4.2 is the first row in the ledger for a DERIVED figure.** Every row above it
  watches a number that arrived; a proxy's change is **computed**. The failure mode
  is new with it — the arithmetic can be wrong while every input is right, and the
  screen looks entirely normal.
- **4.3 is the first where a RANK moves**, which is the first thing a person can be
  wrong about **while every number is right**. Three questions only a person at a
  live session can answer are written into that row.

**2. Three characterised flakes now compound across a merge** — ~12% on
`security-gap-fill`, a load-dependent 30 s ceiling on `securities-route:855`, and
one inside `pnpm verify` itself (`market-gateway.process.test.ts`). **A clean full
run is not the common case.** Two were repaired on 2026-10-07 and **the repair of
the first is reasoned rather than proven** — breaking it deliberately on an idle
machine changed nothing, because every sighting was under load. **This is not Epic
4 scope and should not become it**; what this close owes is a verdict on whether
the epic's own suites are trustworthy, and a named owner outside this epic if they
are not.

## Handed here by Story 4.5 — 2026-10-08: the suites verdict has evidence now, and the rehearsal has an eighth row

**The prescribed sideways grep did not find you either** — Story 4.5's
documents name you nowhere. Found by the second pass over this epic's own
story list.

### 1. Your verdict — _are this epic's own suites trustworthy_ — has data

`EPIC.md` hands you that question with a named owner outside this epic if the
answer is no. Story 4.5 produced the sharpest evidence yet, and it points at
the **machine** rather than at the suites:

| run                                         | result                                     |
| ------------------------------------------- | ------------------------------------------ |
| whole suite, 1                              | `201 passed, 15 skipped, 3 failed`         |
| whole suite, 2 (after a clean pair restart) | `199 passed, 15 skipped, 5 failed`         |
| whole suite, 3                              | `195 passed, 15 skipped, 7 failed`         |
| the three failing specs alone               | **killed by the OS for memory**            |
| **CI, same commit**                         | **`verify`, `e2e`, `database` all passed** |

**Every failure in all three runs was `Test timeout of 30000ms exceeded` with
zero assertion failures**, on the CPU-heaviest tests — axe on
`securities-route` and `security-explorer-shell`, the accessibility-tree walk
in `security-holiday-week` — with a **different failing set each time**, where
a regression is deterministic. Machine: load **23 / 33 on 8 cores**, ~37 MB
free, consumers a `Virtualization.framework` VM at 46.8% CPU, Docker Desktop
at 44.8%, Teams VDI at 27.1%, WebStorm at 21.5%.

**The distinction to carry into your verdict**: _the suite is flaky_ and _the
machine cannot execute the suite_ look identical from a terminal, and only one
of them is anybody's defect. On this evidence it is the second — but note the
third run failed **more** than the first, so the two are not cleanly separable
without a settled machine.

**What is owed and was not taken, by name**: the `--repeat-each=6` × 4
characterisation counting per execution, and the **code-free control commit**.
Both need a machine this epic has not had, and **no story in this epic should
claim a flake rate measured on it.**

### 2. The rehearsal ledger's eighth row is open

Story 4.5's row is written and unwatched. **What makes it different from every
row above it**: a ranked list of ten tickers is something a person can check
against **any public market screen in fifteen seconds** — which is the only
genuinely **external** check this epic has ever had available. Breadth's five
integers could be compared with nothing; a proxy's price could be compared
with a quote but is one number. **Ten names and ten percentages is a list.**

And what only a sitting can return, because a replay structurally cannot:
`replay-bar-source.ts` emits one slice per minute across every symbol, so a
replay returns **one frame, 0 ms spread, 100% of the time at any speed** —
**the split minute the re-order treatment is designed against is absent from
the data structure.** The live path was measured as a **stagger**: ten names
land in ~6 of the 8.8 upstream messages a minute. So AC 2's re-check _is_ that
row and nothing else.

**The lever if it reads wrong is the disc, not the motion** — a ranked list's
aliveness is its order.

### 3. Three epic-level claims this story leaves standing

- **No machine and no person has ever seen a movers list on the `observed`
  basis.** CI's store has zero bars, so every gated run draws the empty state.
- **The day's biggest mover may be a name we never heard from**, and nothing
  on screen or off it can say whether it was — median 466 of 518 inside five
  minutes, worst hour 446, **298 at 13:00**.
- **The ranking is over a one-venue tape.** The live stream is IEX only, so
  _the biggest movers_ is strictly _the biggest movers among the names one
  venue told us about in the last five minutes_.

### Assigned to you at Story 4.5's Gate 2 — 2026-10-08

**The owner's decision, so it is yours rather than owed in the abstract**: the
`--repeat-each=6` × 4 flake characterisation and the **code-free control
commit** both belong with your _are this epic's own suites trustworthy_
verdict, rather than retried piecemeal in a feature story.

**The reason is in the evidence, not in scheduling.** On 2026-10-08 the
machine sat at load **23–33 on 8 cores** with ~37 MB free, **killed two
processes for memory**, and failed three whole-suite runs 3 / 5 / 7 purely on
30 s timeouts while **CI passed all three required checks on the same
commit**. A rate measured there is a rate for a saturated machine — and it
would be quoted, which is worse than having no rate.

**So the first thing your verdict needs is a settled machine**, and the second
is the distinction this story could not resolve from a terminal: _the suite is
flaky_ and _the machine cannot execute the suite_ look identical, and only one
of them is anybody's defect.

## Handed here by Story 4.6 — 2026-10-09: no gated machine has ever clicked a mover, and the epic's exit criterion has a clause no gate can reach

**The rehearsal gains a ninth row, and this one is not about watching — it is
about a reader's hands.** Story 4.6 made `/` a place you leave from: twenty-four
destinations, by pointer and by keyboard. What a gate can prove and what it
cannot are now cleanly separated, and the residue is yours.

**What no gated machine has ever done:** clicked a mover. CI's store has 518
securities and **zero bars**, so the overview frame carries `eligible: 0` and
both mover lists are empty for ever. Every gated journey assertion runs against
a **furnished** overview frame driven through the shipped encoder, which proves
the wiring and **not** that a real ranked row on a real store opens the right
page.

**The clause that no gate can reach at all** is the epic's own AC — _land on
`/`, reach a mover, open it, **read a figure**_. The last clause needs bars at
both ends: a mover to exist on the origin, and a figure to exist on the
destination. A deployed run reaches the first; nothing gated reaches either.
So the row this story owes is **a person, mid-session, on the deployed site,
opening a mover from the landing page and reading its price** — and note 5's
rules beneath the ledger apply: a headless watch cannot claim it.

**Two smaller ones for the same sitting:**

- **The sector region renders no `<ol>` at all when nothing is ranked**, so
  every list-keyboard assertion in that region is **vacuous on the gate**. Only
  a store with bars exercises them.
- **The pointer's moment of entry is unguarded.** Nothing checks what happens
  between a reader's cursor arriving over a row and the hold taking the pin,
  and the rates are measured: membership changes **0.21–0.44 times a minute**.

**And the ninth screen-reader entry, which is the inverse of the other eight.**
The existing eight are all **unprompted** updates — a region changing under a
listener who did not ask. This one is a change the reader **explicitly asked
for**: whether a client-side route change with an **unchanged `document.title`**
is announced at all. It is the one case where announcing is unambiguously
right, and it is unanswerable from a DOM, a timing or an agent.
