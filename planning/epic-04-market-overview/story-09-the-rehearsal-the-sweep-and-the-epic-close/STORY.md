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

> **DISCHARGED 2026-10-10 by Task 4.8.9 — both of them, on a settled machine,
> and you do not owe either any more.** Read
> [`TASK-09`](../story-08-the-overview-at-universe-scale/TASK-09-the-three-flakes-characterised-on-a-settled-machine.md)
> for the arms; what you need in order to act is here.
>
> **1. The code-free control commit is TAKEN.** It is `dee73de` on
> `story-4-8-task-9`, one planning Markdown file, and
> `git diff --stat HEAD~1 HEAD -- . ':(exclude)planning' ':(exclude)docs'` is
> **empty** — a byte-identical runtime tree, which is the whole of its value.
> The arm either side of it was `security-gap-fill` at `--repeat-each=24
--workers=4`: **8 / 24 and 4 / 24 on the parent, 4 / 24 on the control.**
> The control's draw sits inside the parent's spread, which is exactly what the
> control exists to show and is the second time this repository has shown it
> (Task 4.2.6 was the first, and was wrong before it did). **You do not need to
> take another one. You do need to quote this one** the next time a figure on
> this branch is read as a regression.
>
> **2. The characterisation is taken at n ≥ 24 per subject, five subjects, on
> one checkout.** The rates, with their conditions, are in `docs/GAPS.md`
> against each flake's own entry — amended rather than appended, so a reader who
> greps for the flake finds the measurement and not the hypothesis.
>
> **3. The verdict this story asked for, in the words it asked for them.** _The
> suite is flaky_ and _the machine cannot execute the suite_ are **both** true
> and they are separable, which is what a settled machine bought:
>
> - **`security-gap-fill` is a FLAKE and its predicate is wrong about its own
>   subject** — 4.2% at one worker against 25% at four, and all 13 failures an
>   assertion that is structurally incapable of seeing the panel it is believed
>   to watch for. Repairable, cheap, and not this task's to repair.
> - **`market-gateway.process.test.ts` is a MACHINE finding with a confirmed
>   mechanism** — 0 / 48 quiet, 19 / 24 under a stated CPU plant.
> - **`securities-route` is a MARGIN and a wider one than published** — 0 / 48,
>   median 8.0 s quiet and 13.5 s at four workers against 30 s.
> - **`index.process.test.ts`'s shutdown ordering is UNREPRODUCED at n = 96**,
>   and the arm that would reach it is `pnpm verify` ×24, which is 72 minutes
>   nobody has spent.
>
> **4. One thing you should not repeat, and it bears on your own readings.**
> **The browser suite is its own plant.** A full `pnpm e2e` run begun at a load
> average of **5.3** left the machine at **31.0** — so the 34.28 Task 4.8.12
> recorded _during_ its runs is largely the suite, and a load average read while
> a suite is executing cannot be attributed to anything else on the machine.
> **Read the load before the run, never during it.**

> **5. Two of those four verdicts moved on 2026-10-10, by Task 4.8.13, and the
> movement changes what your suite verdict should say.** Read
> [`TASK-13`](../story-08-the-overview-at-universe-scale/TASK-13-the-suites-own-two-repairs.md);
> what you need in order to write the verdict is here.
>
> **`security-gap-fill` is no longer a 25% flake, and what is left is not a
> flake at all.** Its predicate was repaired to count ADR 0028's cover by the
> module class it owns rather than by text on a sibling. Pooled over 144
> executions at four workers: **5.6% (Wilson 95% CI 2.8–10.6%)** against
> **25.0% (CI 13.6–39.6%)** before — **non-overlapping** — and **0 / 24** at one
> worker. **Do not write _this spec is flaky_ in the verdict without the next
> sentence**: every one of the residual failures is `sample 0: ChartPending over
Price` **and** `over Volume`, which is a **real cover drawn over both plots
> during a refill nobody asked for**. That is the defect the test exists to
> catch; the old predicate read **zero** against a deliberately covered page.
> It is a **product** defect, it is routed to the developer in `docs/GAPS.md`,
> and **it must not be counted in a flake rate** — a red there now means
> something.
>
> **The `securities-route` MARGIN FAMILY is smaller.** Nine axe passes that ran
> over all 518 rows are served a 27-row sample; one full-universe pass is kept,
> on the test that installs no route. Scoped, nine passes went **68.0 s →
> 13.5 s** and the two files **1.2 m → 35.3 s**.
>
> **Your `pnpm e2e` ×3 arm is TAKEN, 2026-10-10, and you do not owe it** —
> scoped figures are not comparable with the 15–49 s taken inside a full run,
> which is Task 4.8.9's own finding, so it had to be whole-suite. Three runs,
> load read **before** each, against 4.8.9's three of the same morning which
> were **0 of 3 clean** at 4.8 / 5.4 / 6.2 m with 1 / 1 / 3 failures:
>
> | run | load before       | load after | result                        |
> | --- | ----------------- | ---------- | ----------------------------- |
> | 1   | **5.32** (r 0.66) | 28.71      | `232 passed (3.1m)`           |
> | 2   | **5.98** (r 0.75) | 27.39      | `1 failed, 231 passed (3.0m)` |
> | 3   | **5.99** (r 0.75) | 25.21      | `232 passed (3.2m)`           |
>
> **2 of 3 clean, 3.0–3.2 m against 4.8–6.2 m, and not one timeout in the
> three** — where the earlier three produced five, four of them axe over 518
> rows. **Nothing from the ceiling family appeared at all.** The one failure is
> a different shape and is now its own `docs/GAPS.md` entry, owned by you:
> `overview-nothing-to-open:545` read an **empty ranked list**, 12 / 12 on an
> immediate scoped re-run, and it is in one of the two specs this repository
> names as immune to the empty-ranked-list trap because it furnishes its own
> frame — the immunity is from CI's store and not from a race.
>
> **What is left of this for you is the `pnpm verify` ×24 arm and nothing
> else.** And `n = 3` separates nothing: do not quote _2 of 3 clean_ as a rate.
>
> **And the second half of that family's repair is still not taken**: the
> suite's own per-test ceiling. The family is smaller, not gone, and
> Playwright still reports durations longer than the 30 s it enforces, so a
> duration still cannot be read as a percentage of the ceiling.

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

> **Both are DONE, 2026-10-10, by Task 4.8.9** — the characterisation at
> n ≥ 24 per subject and the control commit `dee73de`. See the discharge note
> under _What is owed and was not taken_ above; it carries the verdict per
> subject and the one reading you should not repeat. **What is left of this
> assignment for you is the `pnpm verify` ×24 arm**, which nothing cheaper
> reached and which is the only outstanding flake arm in the epic.

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

## Handed here by Task 4.8.4 — 2026-10-09: two candidates for the frame, in words you can act on

**Both came out of measuring the browser leg on `/` at the feed's real cadence,
and neither is a repair this story has to take — they are decisions somebody has
to take, and Story 4.8 already owns the frame-composition condition.**

**1. `changePercent` crosses the wire unrounded, and it is 9% of the
aggregate.** `changePercent` in `packages/shared/src/live-change.ts` is
`((close − previous) / previous) × 100` and **nothing rounds it**, so a real
figure carries a 16-digit float — `1.6244720133889459` verbatim off this
product's own encoder — where the screen draws `1.62` at
`PERCENT_DISPLAY_DECIMALS`. Measured: **~13 bytes a figure, ~350 bytes a frame**
on a 25-figure aggregate whose ceiling is 4,078 B. Rounding it on the wire would
take that off **every** aggregate and off every figure on every other frame.

**It is a wire change and a product decision rather than an optimisation.** A
consumer that re-ranks needs more precision than the screen shows — `moveRanking
Key` is keyed on the **displayed** figure today, so a browser would be fine, but
an agent or a later tool that sorts on the raw value would not. Ask it, do not
assume it.

**2. The route subscribes to 25 symbols and draws nothing from the `bars`
frames it buys.** Measured on both cadences: an arm sending only `bars` frames
to those 25 symbols, with prices that moved every batch, left `<main>`'s text
**identical byte for byte**. Every figure on this screen comes from the
aggregate; the subscription exists so the **arrival mark** can fire. Its price,
measured for the first time: **0.9–1.2 ms a batch in the browser** and
**~3,000 B a frame**, plus the gateway's per-client scope and encode.

**That is not a defect and it must not be read as one** — the mark is a shipped
design decision with a canvas section behind it (`The motion vocabulary.dc.html`
§05) and _a fact arriving DECAYS_ is the rule it implements. What is new is that
nobody had priced it. If the rehearsal finds the mark is not worth watching at
390, the subscription is what it costs.

## Handed here by Task 4.8.10 — 2026-10-10, at Story 4.8's close: the frame composition is YOURS with a named condition, and three things nobody has seen

Story 4.8 is complete. Four of its hand-offs already sit above, written by
Tasks 4.8.4, 4.8.9 and 4.8.13. This section carries what the close itself owes
you, in words you can act on rather than as a pointer.

### 1. The frame composition, moved here by the owner's Gate 1 decision — and it EXPIRES

**The measurement: each `bars` frame's own symbol list, logged off the deployed
socket during a real session.** Not a count — a **list**, per frame, so that
the question _do the eleven sector ETFs arrive in one frame or eleven_ has an
answer.

**Nothing in this repository can produce it.** A replay emits one slice per
minute across every symbol (`replay-bar-source.ts` says so in as many words, and
`createFixtureStream`'s `tickEveryMs = 60_000` is one batch a minute), so both
offline feeds have a grain the live feed does not have. `LIVE-DATA.md`
§9.5/§10.2 records **counts** — 332 bars in 8.8 frames at the open, 284 in 6.8
at midday, 450 in 16.1 at the close — and **nothing in this repository has ever
recorded frame COMPOSITION.** Three stories were told to size per-frame work
against it and all three had to assume.

**The named condition, which is why it is here rather than deferred again:** it
is taken **during the first session a person sits through with the deployed
product open**, which is this story's rehearsal and is already scheduled. It
costs minutes once a page's own socket wrapper is logging frames by URL. **It
expires with every session that passes** — there is no fixture, no address and
no clock that can produce it later, and a story that defers it once has
deferred it for ever.

**Two instrument rules it inherits, both somebody's measured defect.** Count by
**URL**, never by event, because a browser page holds sockets that are not this
product's. And drain a page-side buffer with `splice` in place, never by
rebinding the global, because the page's wrapper holds the array it closed over
and every drain after the first then returns nothing.

### 2. The suite verdict: what moved, and the one arm left

Everything you need for _are this epic's own suites trustworthy_ is above, in
the discharge notes from Tasks 4.8.9 and 4.8.13. Four things to carry into the
verdict's wording:

- **The code-free control is TAKEN** (`dee73de`) and so is the flake
  characterisation at n ≥ 24 per subject, 456 executions. **`pnpm verify` ×24
  is the only outstanding arm in the epic.**
- **`security-gap-fill` is 5.6%, not 25% and not 12%**, and the residual is a
  **product defect** rather than a flake — do not fold it into a rate.
- **The browser suite is its own plant**: read the load before a run, never
  during it, and do not turn a reported Playwright duration into a percentage
  of the 30 s ceiling, because it reports durations longer than the one it
  enforces.
- **`n = 3` separates nothing.** `2 of 3 clean` is not a rate.

### 3. Three things no gated machine and no person has ever seen, which is your rehearsal's list

Story 4.8 measured this screen and **not one of its figures was taken against a
real feed, on a deployed machine, or by a person.** Every arm was a furnished
socket or `provider=none`, on one laptop, local. Specifically:

1. **The per-tick cost at the real cadence.** 3.7–5.1 ms a batch on `/` was
   driven at 6.8/min and 16.1/min by a furnished socket, because no offline
   feed in this repository produces either. What a real minute costs — with
   real frame composition, real symbol counts per frame and the vendor's own
   jitter — is unmeasured.
2. **The deployed cold load.** `/` at 447 nodes and a 24.7 ms p50 worst frame,
   and `/securities` in breach on 10 of 10 loads, are both local figures
   against a 48.8-million-bar store. The deployed tier is a different machine
   and a different store, and `CHARTING.md` §19 has already seen the cold-load
   region appear there once.
3. **A proxy figure moving, a breadth figure at all, and a mover.** CI's store
   has zero bars, so on every gated run the aggregate is `928 B` of `unknown`
   for ever: `measured: 0`, `eligible: 0`, two empty lists. This is the same
   list Stories 4.2, 4.4 and 4.5 each left standing, and it is now four stories
   deep.

### 4. What the close leaves you mechanically, and the two defects it routed rather than fixed

- **`pnpm invariants` is at 52 entries** after this story (verified by running
  it, 2026-10-10 — Story 4.8 added one **browser** check rather than an
  invariant), of which four are on the aggregate seam. If your close enumerates what each green check
  certifies, three sentences are not obvious from the names:
  `the-aggregate-has-three-producer-paths` counts **paths** and **cannot see**
  that the third is now conditioned on a browser being attached;
  `the-send-instant-is-not-a-clock` guards **two of the wire's three
  instants** and `observedAt` is outside it **on purpose**, because it is a
  fact about the market and is the field a staleness rule over the aggregate
  would legitimately be built on; and
  `the-overview-note-dates-an-observation` holds the drawn instant in two
  conjuncts, the second of which exists because a one-conjunct draft reported
  `52 invariants hold.` with the defect in the file.
- **Two product defects are routed in `docs/GAPS.md` and owned by a condition
  rather than by this story**: ADR 0028's 160 ms cover drawn over both plots
  during a refill nobody asked for, and a `color-contrast` reading of
  **4.32:1** on the result surface's active option (`#0f7b50` on `#e7e8ef`,
  13 px), reachable on `main` today by typing a different letter and present on
  the full 518-row universe as well as the trimmed sample. **Neither is Epic
  4's and neither is §28's.** The second is `VISUAL-LANGUAGE.md`'s
  standing-exception procedure and UX/Design's.
- **One candidate recorded and not taken, which is a product decision rather
  than an optimisation**: `changePercent` crosses the wire unrounded, ~350 B a
  frame and 9% of the aggregate — see Task 4.8.4's hand-off above. A consumer
  that re-ranks needs the precision, so **ask, do not assume**.
