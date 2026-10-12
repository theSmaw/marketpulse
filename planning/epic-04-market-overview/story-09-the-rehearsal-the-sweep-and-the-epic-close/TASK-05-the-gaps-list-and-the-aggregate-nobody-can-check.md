# Task 4.9.5 — `docs/GAPS.md`, and the aggregate nobody can check

**Status:** Complete — 2026-10-12 — **the gate that stops an epic closing unwatched could not see this epic, and parameterising it would NOT have been enough**: its unwatched test was _empty cells_, and Epic 4's seven rows are written-but-unwatched, so the obvious fix was proved green on all seven before being replaced. 54 → 55 invariants, 154 → 157 breaks, and seven `docs/GAPS.md` entries including the aggregate question AC 5 asked for
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** 4.9.3, 4.9.4 — both route candidates here

## Objective

Acceptance criterion 5, and **the one thing this epic owes that Epic 3 did
not.** Its headline numbers are **aggregates**, and an aggregate is checkable by
nothing: a breadth count that is quietly wrong looks exactly like one that is
right, on every screen, in every test. CI's store has zero bars, so **no gated
machine has ever seen a breadth figure at all** — not a wrong one — and the 503
(now 501) securities the counts are computed over are on **no frame the page
can see**.

**The close has to say what would catch that, and _a person looking_ is a
legitimate answer as long as it is written down as one** — with an owner and a
condition rather than an epic number.

## What the user can see when this lands

**Nothing.** A list that says what a green tick does not certify, with one
fewer prose entry in it than it could have had.

## Work

- **An entry that can be made mechanical should be.** A prose entry with a
  re-measure command is a check nobody runs; a `verify` step is one that cannot
  be skipped. Two batches have already left the list that way. Take every
  candidate from Tasks 4.9.3 and 4.9.4 and from this epic's own tasks, and
  make mechanical whatever can be — as a `pnpm invariants` entry.
- **Every check added owes a break, in the same change**, and the break must
  **write the defect somebody ELSE will write** — confirm the check passes
  **wrongly** first, keep the transcript of it passing, then fix, then confirm
  red, then delete. Four consecutive tasks in one story shipped a guard that was
  green on the exact defect it forbids, every one of them with a break that went
  red, because a break edits the file the check was written around. Prefer a
  clause the re-implementer **cannot avoid writing** — the division, not the
  type name.
- **Read the runner's output, not the verdict line.** An assertion failure with
  other tests still collecting is the only red that proves a check works; a
  break that has decayed into a parse error fails loudly and certifies nothing.
- **`scripts/breaks.mjs` is one file of ~4,300 lines of sibling object
  literals, and a squash-merge silently drops a closing brace between entries** —
  a `SyntaxError` rather than a wrong entry. It happened three times inside
  Story 4.7. `the-break-registry-stops-parsing` now guards it; run
  `node --check scripts/breaks.mjs` after any edit regardless.
- **The aggregate question**, written as an entry with an **owner** and a
  **condition**: what would catch a quietly-wrong breadth, sector or movers
  figure. State plainly which of the available answers it is — a person looking,
  an external comparison, a second independent computation, or nothing — and if
  it is a person, say which reading and at what cadence. Story 4.5's row already
  establishes that **ten tickers and ten percentages is the only genuinely
  external check this epic has**, which bears directly on this.
- **Carry forward the two routed product defects unchanged**, with their owners:
  ADR 0028's 160 ms cover drawn over both plots during a refill nobody asked
  for, and the `color-contrast` reading of **4.32:1** on the result surface's
  active option (`#0f7b50` on `#e7e8ef`, 13 px). Confirmed at Gate 1 as out of
  Epic 4's scope. **The residual `security-gap-fill` failures must not be
  counted in a flake rate** — a red there now means something.
- **Record the `changePercent` decision**: it stays unrounded on the wire, taken
  at Gate 1. A consumer that re-ranks needs more precision than the screen
  shows; `moveRankingKey` is keyed on the displayed figure today, so a browser
  is fine and an agent sorting on the raw value would not be. ~350 B a frame,
  9% of the aggregate. Record the alternative and a **reversal trigger** that is
  a condition.
- **Check the entries this epic's files name.** A prose re-measure rots
  silently, and when you touch a file an entry names, check the entry. Note the
  universe count moved to **516/501** on 2026-10-12, which `docs/GAPS.md`
  already carries a dated paragraph about.

## Done when

1. Every mechanisable candidate from 4.9.3 and 4.9.4 is either mechanical or
   has a stated reason why it cannot be.
2. Every check added has a break entry, the break was performed in both
   directions (passing wrongly first, then red), and the transcript of the
   wrong pass is quoted.
3. `node --check scripts/breaks.mjs` passes and the registry's entry count is
   stated.
4. The aggregate question is an entry with an **owner** and a **condition**,
   and names which kind of answer it is.
5. The two routed defects and the `changePercent` decision are recorded with
   owners and reversal triggers that are conditions.
6. `pnpm invariants` green with its own count printed, and `pnpm verify` green.

---

## What was done — 2026-10-12

**This is the mechanical half only.** Two invariants, three breaks, and the two
transcripts that matter. The `docs/GAPS.md` half of this task — the aggregate
question with its owner and condition, the two routed product defects, the
`changePercent` decision, and the entry audit — is not in this section and is
not done.

### The two checks

**`the-epic-close-cannot-outrun-the-rehearsal-ledger` — widened, and it had TWO
defects rather than one.**

It now asserts, for **every** epic that keeps rows in `LIVE-REHEARSAL.md`: that
the ledger still holds at least as many rows for that epic as it held when the
check last read the file; that the epic's close story has a `**Status:**` line
at all; and — only when that line matches `/\b(complete|closed)\b/i` — that no
row of that epic's is still **unwatched**. The epic is a table entry,
`REHEARSAL_LEDGER_EPICS`, carrying `{ epic, rowPattern, rowFloor,
closeStoryPath }`.

The original comment's argument is **extended, not replaced**. It keys on the
**epic close** rather than on each story, because `EPIC.md` marks visibility and
not completion, and because a per-story check would have gone red on Story 3.3
for a constraint nobody could clear (the deployed backend holds the free plan's
one Alpaca connection). That reasoning generalises, and the new comment says so
in as many words.

**The second defect is the one the sweep did not name, and the brief was right
about it.** The test for an unwatched row was _every cell from the Date column
onward empty or an em-dash_, because Epic 3's unwatched rows were literally
empty. Epic 4's seven are **written but unwatched** — `**OPEN**` in the Date
column and full prose in every other cell. Measured before anything was built:

```
epic 3 rows 7 OLD-predicate-unwatched 0
  dates: 2026-09-24 / 2026-09-22 / 2026-09-22 / 2026-09-22 / 2026-09-24 / 2026-09-24 / 2026-09-24
epic 4 rows 7 OLD-predicate-unwatched 0
  dates: **OPEN** / **OPEN** / **OPEN** / **OPEN** / **OPEN** / **OPEN** / **OPEN**
```

So **parameterising the epic alone would have left the check green on all seven
of Epic 4's rows.** The predicate moved into `unwatchedRehearsalRow`, keyed on
the clause a re-implementer cannot avoid writing: **a watched row carries the
date it was watched on.** `**OPEN**`, a blank, an em-dash, `TBD` and `pending`
are then all unwatched without the function knowing today's spelling for "not
yet". The empty-cells test is **kept beside it rather than replaced**, because a
row can carry a date and say nothing, and that is a different lie.

**Per-epic row floors, taken from the file as it stands on 2026-10-12:**

| Epic | Rows today           | Floor | Close story                                                    |
| ---- | -------------------- | ----- | -------------------------------------------------------------- |
| 3    | 7 (3.3–3.10, no 3.7) | **7** | `story-11-cost-performance-and-the-epic-close/STORY.md`        |
| 4    | 7 (4.2–4.8)          | **7** | `story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md` |

The floor is **per epic rather than global** on purpose, and the reason is the
vacuous-pass rule with one extra turn on it: a single global floor of 14 is
satisfied by Epic 3's seven rows plus any seven others, so Epic 4's rows could
vanish from the table with the anchor still met. Each epic's rows are counted
against its own figure.

**`every-story-states-one-dependency` — new, and it was RED on `main` before
#564.**

For every epic directory that has `story-NN-…` subdirectories, it asserts:
`EPIC.md` has **exactly one** table header carrying a `Depends on` column; that
table has exactly as many `N.M` rows as the epic has story directories; every
`STORY.md` has a `# Story N.M` heading and a `**Depends on:**` line; and for
each story the set of `N.M` identifiers **belonging to that epic** in its own
line **equals** the set in the table's row for it — with the row found by the
story's **heading**, never by its directory name.

Trailing prose after an em dash is cut before either side is read, so
`4.8 — **re-ordered 2026-09-27**, see below` compares as `4.8`. A second, weaker
conjunct compares the `Epic N` numbers **where both sides name one**.

Anchors: at least **4** epic directories hold stories, and at least **47**
stories are compared. Both are today's figures. `pnpm invariants` is green,
which is the whole of the expected state in the brief confirmed — **Epic 1
13/13, Epic 2 14/14, Epic 3 11/11, Epic 4 9/9, 47 of 47 agree.**

### The transcripts of each wrong version passing

**This is the most important evidence in the task.** Each wrong version is the
version the next author writes, run against a tree carrying the defect it is
supposed to forbid.

**Wrong version 1 — the epic parameterised, the old empty-cells-only
predicate.** `REHEARSAL_LEDGER_EPICS` shipped exactly as above, both arms
present; Epic 4's close story marked complete so the check is armed rather than
early-returning; `unwatchedRehearsalRow` reduced to the original test:

```js
function unwatchedRehearsalRow(row) {
  const account = row
    .split("|")
    .slice(2, -1)
    .map((cell) => cell.trim());
  if (account.every((cell) => cell === "" || cell === "—")) {
    return "every cell after the story number is empty or an em-dash";
  }
  return null;
}
```

```
=== grep: the epic IS parameterised, both arms present
269:    epic: "3",
277:    epic: "4",
3:**Status:** **Complete — 2026-10-12.** Epic 4 is closed.
=== RUN OF THE WRONG VERSION
55 invariants hold.
EXIT=0
```

Same tree, same marked-complete close, shipped predicate restored and nothing
else changed:

```
=== SAME TREE, SHIPPED PREDICATE, Epic 4 still marked complete
Invariants that no longer hold:

  ✗ the-epic-close-cannot-outrun-the-rehearsal-ledger
    No epic with rows in LIVE-REHEARSAL.md can be closed while one of its stories is still unwatched — neither an empty row nor a row written up as still OPEN.
    Epic 4's close story is marked complete and 7 rehearsal rows are still unwatched:
      4.2 — its date cell reads `**OPEN**` rather than a date
      4.3 — its date cell reads `**OPEN**` rather than a date
      4.4 — its date cell reads `**OPEN**` rather than a date
      4.5 — its date cell reads `**OPEN**` rather than a date
      4.6 — its date cell reads `**OPEN**` rather than a date
      4.7 — its date cell reads `**OPEN**` rather than a date
      4.8 — its date cell reads `**OPEN**` rather than a date
    A row written retrospectively at the epic close is a row about a memory — the file says so. Either the rehearsal was done and the row is owed, or it was not and the close is early.

1 of 55 invariants failed. Each one replaces an entry in docs/GAPS.md — read it there for why the claim matters.
EXIT=1
```

**Red for the right reason**: an assertion failure with the other 54 checks
still collecting, not a crash and not a parse error.

**Wrong version 2 — "the named story EXISTS".** The obvious clause, and the one
every reader reaches for. Planted defect: Story 4.8's own line changed to
`**Depends on:** 4.7` while `EPIC.md`'s table still says `**4.6**` — which is
#564's defect byte for byte.

```
=== WRONG VERSION 1 against the planted defect
60 stated dependencies checked, 0 name a story that does not exist.
every story states a dependency that exists.
EXIT=0

=== pnpm links against the same planted defect
$ node scripts/check-links.mjs
530 documents, 1726 cross-file links, 39 anchor links, 0 broken.

=== THE SHIPPED CHECK against the same planted defect
Invariants that no longer hold:

  ✗ every-story-states-one-dependency
    Every story's dependency is stated twice — once in its epic's table and once in its own STORY.md — and the two agree.
    1 of 47 stories state a dependency their epic's table disagrees with:
      Story 4.8: EPIC.md says `**4.6**`, its own STORY.md says `4.7 — **re-ordered 2026-09-27**, see below`
    Both statements name real stories whose files exist and whose links resolve, which is why `pnpm links` was green through ten days of this (Task 4.9.4). Repair the one that is wrong; do not delete either, because the second statement is the whole mechanism.

1 of 55 invariants failed. Each one replaces an entry in docs/GAPS.md — read it there for why the claim matters.
EXIT=1
```

`pnpm links` reporting `0 broken` **with the defect in place** is the measured
reason this went ten days unnoticed, rather than an argument that it would.

**Wrong version 3 — identity read from the DIRECTORY NAME.** Byte-identical to
the shipped check except for one line:

```js
const identity = `${epicNumber}.${String(Number(/^story-(\d+)-/.exec(s)[1]))}`;
```

Planted defect: `story-08-the-overview-at-universe-scale/STORY.md`'s heading
renumbered to `# Story 4.10 —`, which is the state a renumbering passes through
— the heading moves first and the directory later.

```
=== WRONG VERSION 2 (identity from the directory name) against that plant
47 stories compared, 0 disagree.
every story agrees with its epic's table.
EXIT=0

=== THE SHIPPED CHECK (identity from the heading) against the same plant
Invariants that no longer hold:

  ✗ every-story-states-one-dependency
    Every story's dependency is stated twice — once in its epic's table and once in its own STORY.md — and the two agree.
    epic-04-market-overview/EPIC.md's table has no row for Story 4.10, which planning/epic-04-market-overview/story-08-the-overview-at-universe-scale/STORY.md declares itself to be.

1 of 55 invariants failed. Each one replaces an entry in docs/GAPS.md — read it there for why the claim matters.
EXIT=1
```

All three wrong-version scripts were deleted after their transcripts were taken.
Both planted defects were restored from a copy taken before the plant and the
tree re-verified clean (`git status --short` shows only the two scripts and this
task file).

### The breaks

Three entries added to `scripts/breaks.mjs`, taking the registry from **154 to
157**. `node --check scripts/breaks.mjs` passes. The existing Epic 3 entry was
re-run as well, because the predicate underneath it changed.

```
$ pnpm break the-epic-4-close-outruns-the-rehearsal
✓ planning/epic-04-market-overview/story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md broken → red → restored byte-identical.
  matched: rehearsal rows are still

$ pnpm break a-story-disagrees-with-the-epic-table
✓ planning/epic-04-market-overview/story-08-the-overview-at-universe-scale/STORY.md broken → red → restored byte-identical.
  matched: state a dependency their epic's table disagrees with

$ pnpm break a-story-is-identified-by-its-directory
✓ planning/epic-04-market-overview/story-08-the-overview-at-universe-scale/STORY.md broken → red → restored byte-identical.
  matched: has no row for Story 4.10

$ pnpm break the-close-outruns-the-rehearsal
✓ planning/epic-03-live-market-data/LIVE-REHEARSAL.md broken → red → restored byte-identical.
  matched: rehearsal rows
```

**The trap the brief named, and how each break accounts for it.** The check
early-returns when a close status is not complete, so a break that only edits
the ledger goes green. Epic 3's existing entry works because Story 3.11 **is**
closed, so the close condition is permanent and the substitution supplies the
empty row. Epic 4 is the mirror: its rows are **already** unwatched, so the
substitution supplies the **close** — one line in one file, which is also
exactly the defect in product terms. Both entries carry a **repoint condition**
in a comment: Epic 4's stops being available the day Story 4.9's status says
complete, at which point the rows must carry dates and the entry moves to
blanking one, as Epic 3's did.

### Where I disagree with the brief

**One rule in the brief cannot be implemented as written, and the brief's own
expected state is what proves it.** It asks that values outside the `N.M`
pattern — `nothing`, `—`, `Epic N` — "compare as literals". Compared literally,
**four of the forty-seven stories are red today**, and all four are first
stories where both statements are defensible:

| Story | `EPIC.md` table      | Its own `STORY.md`                         |
| ----- | -------------------- | ------------------------------------------ |
| 1.1   | `—`                  | `nothing`                                  |
| 2.1   | `Epic 1 (1.6, 1.11)` | `Epic 1 (Stories 1.6, 1.11)`               |
| 3.1   | `Epic 2`             | `Epic 2 (2.6, 2.7, 2.9, 2.10)`             |
| 4.1   | `Epic 3`             | `nothing — this is the epic's first story` |

That contradicts the brief's own expected state of 13/13, 14/14, 11/11 and 9/9.
So the comparison is scoped to **identifiers belonging to the epic**, plus the
`Epic N` conjunct where both sides name one, and the hole that leaves is
**named in the check's own comment rather than hidden**: a disagreement about
which earlier **epic** a first story follows is invisible here unless both sides
name one, and 4.1 is the live instance. The defect the check exists for is
intra-epic ordering, which is what #564 repaired.

**Everything else in the brief was correct, including the claim it invited me to
falsify** — the empty-cells predicate is green on all seven of Epic 4's rows,
measured above before anything was built.

### What a reader can see

**Nothing.** Two gates that fail the build on two documentation defects, neither
of which has a pixel behind it.

### Gates

| Gate                              | Result                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                      | green                                                                                                                           |
| `pnpm verify`                     | **green, exit 0.** No `Unhandled Errors` block in the log                                                                       |
| `pnpm invariants`                 | **`55 invariants hold.`** — 54 before this change                                                                               |
| `pnpm format:check`               | `All matched files use Prettier code style!`                                                                                    |
| `pnpm links`                      | `530 documents, 1726 cross-file links, 39 anchor links, 0 broken.`                                                              |
| `pnpm test`                       | shared 440, backend 1045, frontend 1413 — all passed                                                                            |
| `pnpm test:process`               | 55 passed                                                                                                                       |
| `node --check scripts/breaks.mjs` | passes; **157** entries, from 154                                                                                               |
| `pnpm break` ×4                   | all four red-then-restored, quoted above                                                                                        |
| `pnpm e2e`, `pnpm test:database`  | **NOT run, deliberately.** Nothing in this change is in either one's scope — two `scripts/*.mjs` files, no runtime tree touched |

### What nothing here certifies

- **That an unwatched row is the only way an epic can close early.** The check
  reads a `**Status:**` line and a table; an epic closed without its close
  story's status being edited is invisible to it.
- **That the dependency a story states is the RIGHT one.** Two agreeing
  statements can both be wrong. What is mechanical is that they agree.
- **A first story's cross-epic dependency**, as above.

## For a stakeholder — a status report, 2026-10-12

**Two documentation defects that cost real time can no longer reach `main`.**

The first is the one that matters to anybody outside the codebase. This product
keeps a ledger of whether **a person has watched it working against the real
market** — not a test passing, a person looking — and a rule that an epic cannot
be declared finished while a story in that ledger is unwatched. There was a check
enforcing it. **It could not see Epic 4.** Epic 4 is closing this week with
**seven** stories nobody has watched against a live feed, and the check was
green on every one of them.

It had two faults, and the second is the instructive one. The obvious fault was
that it was written for Epic 3 and nothing told it Epic 4 existed. The
non-obvious one is that **fixing that alone would have changed nothing**:
the check looked for an _empty_ row, because Epic 3's unwatched rows were blank,
and Epic 4's seven are fully written up — they say in careful detail what each
sitting needs — with the word `OPEN` where the date goes. Seven detailed
paragraphs about work nobody has done read, to that check, exactly like seven
completed rehearsals. It now asks the question that cannot be dodged: **does the
row carry the date somebody watched on?**

The second defect is smaller and was real for ten days. Every story states which
story it follows, in two places — its epic's plan, and its own file. After a
re-ordering in September those two statements disagreed for three of Epic 4's
nine stories, so the plan and the stories described different execution orders.
Nothing was broken in a way any tool could see: every number named a real story,
every file was on disk, every link resolved, and the link checker reported
**1,726 links, 0 broken** right through it. It was found by hand last week and
repaired. The agreement between those two statements is now a build gate.

**What this does not buy.** It does not get anybody to watch Epic 4 working. Of
the seven open rows, the one the epic itself says is owed before it ships a
screen is a sitting on a real phone during a real session — and that is a person
with a phone, not a check. What the gate buys is that the close cannot now be
recorded as if it had happened.

**Cost and risk.** Two script files, no runtime code, nothing a user can see. The
full verification suite is green. Both new gates were proved by writing the
defect each forbids and watching the gate fail — and, more usefully, by first
writing the _plausible wrong version_ of each gate and watching it pass on the
same defect. Those three transcripts are in the task file; they are the evidence
that these checks are live rather than decorative, which this repository has had
to learn the hard way four times in one story.

---

## The documentation half — 2026-10-12 (the orchestrator's, written after the mechanical half)

**Seven entries added and two owner lines corrected.** The mechanical half is
above, with its three wrong-version transcripts.

### The entry acceptance criterion 5 actually asked for

**_An aggregate is checkable by nothing, and this is what would catch one that
is quietly wrong._** Written with an **owner** and a **condition**, because
Story 4.9's description is explicit that _a person looking_ is a legitimate
answer **as long as it is written down as one**.

The argument it records: the guards that exist are real and they guard
**provenance and structure**, not **value** — `one-producer-of-the-overview-aggregate`,
`breadth-is-counted-over-the-equities-alone`, `the-population-is-never-a-literal`,
`one-pairing-of-a-sector-and-its-benchmark` and
`one-comparator-for-the-order-of-a-move` are **all satisfied by an aggregate
whose arithmetic is wrong**. And no test can close it: CI's store has zero bars,
so **no gated machine has ever seen a breadth figure at all, not a wrong one.**

**Of the four aggregates exactly one is externally checkable in seconds** — the
movers, ten tickers and ten percentages against any public screen. Breadth's
five integers can be compared with nothing. So the answer is a person reading
the movers list beside a public screen, and the condition makes that the **first**
step of every sitting that fills a ranked-surface row, because fifteen seconds
is cheaper than any alternative.

### The other six, each with an owner and a condition

| Entry                                                                             | Why it is a gap                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One shipped spec is BINARY to `grep`**                                          | `overview-degraded-grid.spec.ts` holds a NUL byte, so `grep -r` reports it **absent** rather than empty. It produced a false _this guard does not exist_ conclusion inside Task 4.9.3, and Task 2.3.9's universe sweep has a hole exactly there. `pnpm invariants` is unaffected — it uses `readFileSync`                                                             |
| **`breaks.mjs` claims one entry per invariant and nothing checks that direction** | `every-break-can-still-land` checks breaks → files; **nothing checks invariants → breaks**, and the pairing lives only in prose. The **unreliability is the finding**: an orphaned break and an invariant that never had one are both invisible. Repair specified, owner is the next change that adds an invariant — one field rather than a retrofit over 75 entries |
| **`changePercent` crosses the wire unrounded**                                    | The owner's Gate 1 decision, with both arguments recorded so it is not re-litigated, and a condition-shaped reversal trigger                                                                                                                                                                                                                                          |
| **The two routed product defects**                                                | Recorded so that _routed_ does not decay into _forgotten_ — and with the sentence that matters: `security-gap-fill`'s residual **must not be counted in a flake rate**, because a red there now means something                                                                                                                                                       |
| **A replayed aggregate would compute over TODAY's universe**                      | **This entry exists because ADR 0038 said it did and it did not** — found by Task 4.9.4 going to use it. Writing it is the repair, and 4.9.3's ADR amendment now points here truthfully rather than falsely                                                                                                                                                           |
| **`every-story-states-one-dependency`'s residual hole**                           | A disagreement about which earlier **epic** a first story follows is invisible unless both sides name one. Story 4.1 is the live instance                                                                                                                                                                                                                             |

### Two owner lines corrected rather than left

`docs/GAPS.md` named **`Owner: Task 4.7.10's sitting`** in two entries — a
**complete** task whose sitting did not happen, since Story 4.7 ships owing
AC 5b. **Two entries pointed the person taking the sitting at a closed task.**
Both now name Task 4.9.8's sitting, with `THE-SITTING.md` as the protocol and
the eight phone steps still attributed to Task 4.7.10, which is where they are.
The third such line was already correct.

### What was NOT made mechanical, and why

The brief's rule is that anything mechanisable should be. Of the seven:

- **The aggregate question cannot be** — that is the entry's whole content.
- **The grep blindness could be** (no byte below `0x09` other than `\n` in any
  shipped tree, with the one file exempted) **and was not**, because the
  exemption would have to name the file the check exists to find, and a
  one-file allowlist is a check that passes by construction. The entry
  discharges the claim; the owner is the next tree-wide sweep.
- **The invariants → breaks correspondence could be and was not**, deliberately:
  it needs a `proves:` field on ~75 entries, and doing that as a side effect of
  a close is how a 157-entry registry acquires a field nobody maintains. The
  condition hands it to the next change that adds an invariant, where it is one
  field.

### Gates

| Gate                              | Result                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm verify`                     | green, exit 0, no `Unhandled Errors` block                                                     |
| `pnpm invariants`                 | **`55 invariants hold.`** (54 → 55)                                                            |
| `pnpm links`                      | `530 documents, 1726 cross-file links, 39 anchor links, 0 broken.`                             |
| `node --check scripts/breaks.mjs` | passes, **157 entries** (154 → 157)                                                            |
| `pnpm break` ×4                   | all four red then restored byte-identical — three new, plus Epic 3's pre-existing entry re-run |
| `pnpm e2e`, `pnpm test:database`  | not run — two `.mjs` scripts and Markdown, no runtime tree touched                             |

## For a stakeholder — a status report, 2026-10-12

Two jobs: make mechanical whatever can be, and answer one question the epic has
been carrying — **what would catch a headline number that is quietly wrong?**

**The first job found something serious.** We have exactly one automated check
whose purpose is to stop an epic being declared finished while nobody has
watched the product work against the real market. It was written against the
previous epic by name, so **this epic could have been closed with every check
green and not one row of that ledger filled.** Worse, the obvious fix would not
have worked: the check looked for **blank** rows, and this epic's rows are
written-out-but-unwatched. That wrong version was built deliberately, proved
green against all seven rows, and the transcript kept — which is how we know the
real fix works rather than hoping it does.

**The second job has an honest answer and it is a person.** The landing page's
four headline figures are computed, not reported, and every safeguard we have
checks _where they came from_ rather than _whether they are right_ — all of them
pass an aggregate whose arithmetic is wrong. Our test database holds no price
history, so no automated run has ever seen one of these figures at all, correct
or otherwise.

**Of the four, exactly one can be checked against the outside world in
seconds**: the biggest-movers list, ten names and ten percentages, comparable
with any public market screen. So that comparison is now the **first** step of
every sitting, written down with the reason, rather than left as an assumption
about what a watcher will happen to do.

---

## Amended on the way in — 2026-10-12: the new break rotted the same day, and `every-break-can-still-land` caught it

**Worth recording because it is the cheapest possible instance of a documented
class, and it happened inside the task that added the entry.**

`the-epic-4-close-outruns-the-rehearsal` was keyed on
`find: "**Status:** Not started"`. **It stopped matching within hours** —
Task 4.9.1's own Gate 1 edit moved Story 4.9's status line to
`In progress — 2026-10-12`, so by the time this branch merged `origin/main` the
`find` matched **0 times**. The run:

```
  ✗ every-break-can-still-land
    1 break entries can no longer land:
      the-epic-4-close-outruns-the-rehearsal: its `find` matches 0 times in
      planning/epic-04-market-overview/story-09-…/STORY.md, not once
```

**And the second rot was already guaranteed**: Task 4.9.9 sets that same line to
`Complete`, which is the value the break exists to supply.

**The rule the repair is worth more than the repair.** A break whose subject is
**the close status** cannot be keyed on the close status — the value it needs to
be absent is the value the story is going to acquire. It is now keyed on the
**heading**, which is stable, and injects the status **above** the real one,
because the check reads `/^\*\*Status:\*\*(.*)$/m` and takes the **first**
match. Re-run after the repoint: red, then restored byte-identical.

**Two things this confirms rather than claims.** `every-break-can-still-land`
earns its place — it caught the half of the rot that is mechanical, on the same
day, in a 157-entry registry that is deliberately outside `pnpm verify`. And it
only ever checks that half: it asserts the `find` text is present, **not** that
the substitution still expresses the defect, which is why the break was re-run
by name rather than assumed.
