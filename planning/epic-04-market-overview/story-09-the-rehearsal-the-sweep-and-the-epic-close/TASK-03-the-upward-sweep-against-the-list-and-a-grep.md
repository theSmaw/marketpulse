# Task 4.9.3 — The upward sweep, against the list and a grep

**Status:** Complete — 2026-10-12 — **the grep is blind to one shipped file and reports it as ABSENT rather than empty**: `overview-degraded-grid.spec.ts` holds a literal NUL byte, so `grep -r` skips it silently, which produced a false _this guard does not exist_ conclusion inside this task's own run. Six of the brief's candidates were already discharged by their owning task; the residue was 8 live sites, 2 ADR amendments, and the most operative site of all was an **agent instruction file**
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** nothing

## Objective

Acceptance criterion 3. **Falsification travels upward and nothing sweeps that
way on its own**: a task measures a vendor or the tree, and what it invalidates
is a premise in an ADR, an invariant in `CLAUDE.md`, or `PRODUCT_SPEC.md`. A
story close sweeps that story's own documents and stops there.

**Against the list AND against a grep, and the difference is the finding.** The
list is what somebody thought of; the grep is what is there. This repository
has already paid for the gap in both directions — for a day `ALPACA.md` and
ADR 0019 recorded that `PRODUCT_SPEC.md` §7.1's feed claim was false while §7.1
itself, `README.md`, two other ADRs and invariant 6 went on asserting it.

## What the user can see when this lands

**Nothing.** Governing documents that do not contradict what this epic measured.

## Work

- **The list half**: every measurement Epic 4's tasks published that contradicts
  a premise stated above it. The known candidates, which are a starting point
  and not the set — each must be checked rather than assumed:
  - `marketDateAt` at **1.288 ms** over 518 instants against the **3.366** the
    0.118 → 3.497 ms attribution rests on, and the per-batch join re-taken at
    **1.521 ms p50** and then at **zero** with nobody attached. Every product
    derived from 3.72 ms is pre-repair.
  - The `feed` frame's rate: a median of **332 a minute** repaired to a
    **55 s** keepalive, and `KEEPALIVE_INTERVAL_MS` now written as
    `DISCONNECTED_AFTER_MS / 3`.
  - **The 390 fold question was wrong and was replaced** — the status bar is
    sticky and grows from four wrapped lines to six.
  - Epic 14's trigger evaluated a **fifth** time without firing, and its own
    first sentence corrected on the **unit** rather than the number.
  - `longtask` reporting **nothing at all** where
    `long-animation-frame` reports 62.8–77.4 ms — an instrument three documents
    named as the re-measure.
  - The universe moving to **516/501** on 2026-10-12 (Task 2.3.9).
- **The grep half**: take the epic's published figures and grep the tree for
  each. Record, per figure, how many live sites were found and how many were
  already correct. **A figure that counts a phrase in this repository is
  invalidated by recording it** (Task 4.8.8 proved that twice), so quote each
  count with its date and the command that produced it.
- **Amend live claims by date; leave historical records standing.** Story files
  record what was true when written and correcting those destroys the record.
  An ADR gets a **dated amendment beside** its decision, never a rewrite, and
  ADRs are never renumbered.
- **An applied migration is immutable** — exclude every one of them, comments
  included; the checksum hashes the whole file and the next deploy would refuse.
- Where a document describes a **guard**, check the guard exists. A claim about
  a mechanism reads identically whether the mechanism is there or not, and this
  repository has produced that defect twice in one week — both times found by
  somebody going to **use** the mechanism, never by reading.

## Done when

1. The list half is enumerated, each item checked rather than assumed, with the
   sites it falsifies named.
2. The grep half is run, with the command and the date beside every count.
3. Every live site is amended; every historical record is left standing and the
   count of each is stated.
4. Any ADR this epic falsified carries a **dated amendment** rather than an
   edited decision.
5. Any document describing a guard has had the guard checked, and anything
   mechanisable is routed to Task 4.9.5.
6. `pnpm links` and `pnpm verify` green.

---

## What was done — 2026-10-12

### The finding that changes how half two must be read: this repository has a grep-shaped blind spot, and it fired inside this task

`e2e/specs/overview-degraded-grid.spec.ts` **contains a literal NUL byte** at
byte offset 18,431, deliberately, as a key separator:

```ts
const keyOf = (reading: Reading, surfaces: readonly Surface[]): string =>
  surfaces
    .map((surface) => `${surface}\x00${reading[surface] ?? "\x01nothing"}`)
    .join("\x02");
```

`file` reports it as `data`. **GNU/BSD `grep` and ripgrep treat it as binary and
silently skip it** — `grep -c "import"` on a file containing eight `import`
lines prints **nothing at all** and exits 1. **Not zero. Absent.**

Three consequences, all load-bearing:

- **It produced a false conclusion inside this task.** The first pass concluded
  that `the-session-word-has-one-home-and-it-is-the-masthead` and
  `one-aggregate-the-empty-join` — the collision classes Task 4.7.9 records as
  shipped — **did not exist**, i.e. a guard described in prose with no
  mechanism. They exist, at six sites. The grep could not see them. This is
  `CLAUDE.md`'s _a claim about a mechanism reads identically whether the
  mechanism is there or not_ arriving from the **opposite** direction: the
  mechanism is there and the instrument says it is not.
- **Task 2.3.9's universe sweep has a hole exactly there.** That file carries
  `tracked: 503` ×7, `eligible: 503`, `measured: 503`, and two
  `518 securities and zero bars` comments including
  `/** CI's permanent state: 518 securities, zero bars, and four unknowns. */`.
  A `grep -rn` sweep cannot find any of them.
- **`git grep` DOES read it.** Every count in half two was taken with
  `git grep`, which is why they are trustworthy and why a `grep -rn` re-count
  will disagree.

`pnpm invariants` is **unaffected** — `check-invariants.mjs` reads corpora with
`readFileSync(path, "utf8")` and shells out to no grep (verified). The exposure
is confined to humans, agents and any future shell-based audit. **Routed to Task
4.9.5** as a `docs/GAPS.md` entry.

### Half one — the list

**Six of the brief's seven candidates were already discharged by their own
owning task.** Stating that is the point of checking rather than assuming:

| Candidate                                                            | Verdict                                                                                                                                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `feed` frame's 332/min → 55 s keepalive, written as the division | **Fully swept** — ADR 0033 and ADR 0036 both carry dated 2026-10-11 amendments beside their decisions, plus `CLAUDE.md`, `docs/GAPS.md` ×3, Epic 14, `market-gateway.ts`, a break and a process test |
| The 390 fold question replaced (sticky, four lines → six)            | **Fully swept, nine sites** — and in all four epic files the claim and its amendment are **adjacent lines**                                                                                          |
| Epic 14's trigger, fifth evaluation, second condition                | **Swept** — the **unit** was the residue                                                                                                                                                             |
| 3.72 → 1.521 → zero, and its derived products                        | **Swept in nine places**, including dated amendments inside shipped source (`market-gateway.ts`, `market-overview.ts`)                                                                               |
| 3.366 → 1.288 ms                                                     | **Swept**, five sites, one of which rescales _and_ says "re-take them rather than scaling them"                                                                                                      |
| Nothing was routed here by name                                      | `grep -rn "4\.9\.3" planning/ docs/` outside story-09 → **0 hits**. **A close with no inbound pointers is the case the sideways-sweep rule exists for**, and the list had to be built from nothing   |

**The residue: eight live sites, all corrected here.**

| #   | Measurement                                                       | Falsified site                                                                                             | Edit                                                                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `marketDateAt` and the join, both repaired                        | `epic-14/EPIC.md:307` — `≈ 56 ms of script a minute, and the count is 1.2% of it`                          | Dated amendment. **Wrong twice**: the magnitude fell _and_ the join no longer runs at all with nobody attached. Task 4.8.10's §2 named three pre-repair figures and **not these two**                                                                                                   |
| 2   | same                                                              | `epic-05/EPIC.md:381` — `1.2% of the join it sits on, **so a per-sector fan-out of eleven calls is free**` | A **forward-looking conclusion** resting on a pre-repair denominator. Now ~3% of the re-measured 1.521 ms                                                                                                                                                                               |
| 3   | The breach's **unit** corrected                                   | `planning/EPICS.md:532` — `a main-thread task of 50–76 ms`                                                 | **The one governing document where the unit correction did not land.** `CLAUDE.md`, `PRODUCT_SPEC.md` §28 and `docs/GAPS.md` all carry it, which is exactly why this one read as correct                                                                                                |
| 4   | `longtask` reports nothing where LoAF reports 62.8–77.4 ms        | `SEARCH-AND-SELECTION.md:1454` — a `Re-measure rather than cite` recipe naming `longtask`                  | §10's fourth dating, **200 lines below in the same file**, already says the instrument reports nothing. A prose re-measure rotting with the rot recorded elsewhere in the same document                                                                                                 |
| 5   | The universe is 516 / 501                                         | **`.claude/agents/tester.md:41`**                                                                          | **The highest-value site in the table, and the list would never have produced it.** It is an **agent instruction**, not a record: an agent told CI holds 518 writes a browser assertion against 518, and `CLAUDE.md` names that exact round trip as having cost six minutes once        |
| 6   | same                                                              | `epic-14/EPIC.md` ×3, `epic-05/EPIC.md:563` — `518 securities and zero bars`, `928 bytes for ever`         | 2.3.9 swept `CLAUDE.md`, `PRODUCT_SPEC.md`, `GAPS.md`, `README.md` and `e2e/README.md` and reached **neither** forward-looking epic file. The hand-off-sideways failure in textbook form; both now carry 2.3.9's banner                                                                 |
| 7   | Eight tasks complete, the region ships                            | `story-03-sector-performance/STORY.md:3` — `**Status:** In progress — 2026-09-27 … 4.3.1 complete`         | **A `Status:` line is the one line in a story file that is not a historical record.** False for five days. Corrected, and it carries the gap it cannot close: 4.3 has **no Gate 2 record and no per-criterion verdict**, so Task 4.9.2 derived its six verdicts from task records       |
| 8   | `one-classifier-for-the-direction-of-a-move` is the shipped guard | **`BreadthLedger.tsx:140`** — `the defect \`one-direction-one-home\` exists to forbid`                     | **In shipped source.** No invariant or break has that name — it is Task 4.4.2's _title_. The real id is cited correctly in five other files, so the single wrong one reads as deliberate rather than as a typo. A reader greps the name, finds nothing, concludes the guard was removed |

### Half two — the grep

Every count by **`git grep` over `origin/main`, 2026-10-12** — `git grep`
rather than `grep -r` **on purpose**, per the finding above. **Recording these
counts invalidates them**, and this report proves that a third time: `pnpm links`
printed `516 documents, 1708 cross-file links` for Task 4.8.13 and prints
`529 documents, 1724 cross-file links` today.

| Figure                              | hits / files        | Live sites needing an edit                                                                                                                                                                                                                                                       |
| ----------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `518 securities and zero bars`      | **73 / 56**         | **4** (items 5, 6). Already correct: **0** — 2.3.9 corrected three files and covered the rest with two banners rather than editing them, which is correct for dated blockquotes                                                                                                  |
| `3.497`                             | 31 / 14             | 1 (item 1)                                                                                                                                                                                                                                                                       |
| `0.041 ms`                          | 10 / 8              | 1 (item 2)                                                                                                                                                                                                                                                                       |
| `1.2%`                              | 11 / 9              | **2** (items 1, 2); `CLAUDE.md` explicitly marked left-standing                                                                                                                                                                                                                  |
| `56 ms of script`                   | 3 / 3               | 1 (item 1)                                                                                                                                                                                                                                                                       |
| `3.72`                              | 56 / 21             | **0 — all amended**, including two shipped source files                                                                                                                                                                                                                          |
| `1.521`                             | 42 / 16             | 0 — post-repair by construction                                                                                                                                                                                                                                                  |
| `3.366` / `1.288`                   | 13 / 9 each         | **0 — 9 of 9 carry the pair together**                                                                                                                                                                                                                                           |
| `50–76`                             | 62 / 29             | **1** (item 3)                                                                                                                                                                                                                                                                   |
| `62.8` / `77.4`                     | 33 / 19             | 0 — all post-4.8.6 and consistent                                                                                                                                                                                                                                                |
| `332 frames a minute`               | governing: 11 sites | 0 — every one now sits beside the keepalive repair                                                                                                                                                                                                                               |
| `KEEPALIVE_INTERVAL_MS`             | 28 / 12             | 0 — the division, with `55_000` only in a comment                                                                                                                                                                                                                                |
| `928 B`                             | 22 narrowed         | **3** (ADR 0038, Epic 5, Epic 14) — each stale on its **input** (516 unknowns) while unchanged as a **reading**                                                                                                                                                                  |
| `466`                               | 8 / 8 `466 px`      | **0 of 8 — all already correct.** But **`466` is ambiguous in this repository and a bare grep cannot disambiguate it**: `CLAUDE.md:143` means a pixel height and `:154` an eligible count eleven lines later. Any future sweep must grep `466 px` and `eligible: 466` separately |
| `503 equities` as a shipped literal | —                   | **Guarded** by `the-population-is-never-a-literal`; the denominator is read off the frame. **No shipped-code edit was needed for 503 → 501**                                                                                                                                     |

**The difference between the halves, stated plainly.** The list produced 8
edits. **The grep produced 2 the list could not have produced** —
`.claude/agents/tester.md` (nobody thinks of an agent instruction file as a
governing document, and it is the most operative one in the tree) and
`planning/EPICS.md`'s uncorrected unit (three documents carry the correction,
which is precisely why the fourth reads as correct). And **the grep produced one
it could not see at all**, which is the NUL-byte file.

### The two ADR amendments

Both **beside** the decision, neither decision rewritten, no renumbering.

- **ADR 0038** — thirteen `518`/`503` sites and the `928 B` reading, untouched
  by 2.3.9. The decision is unaffected; its **population** moved. The amendment
  also records that this ADR's claim that the point-in-time universe consequence
  _"is recorded in `docs/GAPS.md`"_ **is false** — found by Task 4.9.4 going to
  use it — and names where the constraint now lives.
- **ADR 0016** — **the ADR whose subject moved, and nothing had touched it.**
  Its amendment records the first whole-list vendor re-check since 2026-09-08
  and the mechanism finding worth keeping: `untracked` is expressed by
  **deleting the row**, and the hard-coded `status: "active"` needed no change,
  because a `status` written by anything but the loader is silently reverted by
  the next deploy's `pnpm universe`.

**No other ADR needs one.** 0033 and 0036 were amended 2026-10-11 by Task 4.7.7;
0029 carries both the 390 correction and the unit correction; 0027, 0028, 0012
and 0039 are untouched by anything Epic 4 measured.

### Guards described in prose — three are not what their prose says

Checked by going to **use** each one. **Most exist** — `one-comparator-for-the-order-of-a-move`,
`one-home-for-imperative-navigation`, `the-overview-frame-is-not-a-heartbeat`,
`the-overview-note-dates-an-observation` (two conjuncts, as claimed),
`market-date-reads-the-parts-once`, `expectEveryRegionIsATabStop`,
`the-population-is-never-a-literal`, `the-ranking-states-its-own-denominator`,
`one-pairing-of-a-sector-and-its-benchmark`, `the-join-runs-with-nobody-attached`
(a process test with a `vi.fn()`, correctly, because the wire cannot see it),
and both degraded-grid collision classes. Three are not:

**A. `the-epic-close-cannot-outrun-the-rehearsal-ledger` CANNOT SEE EPIC 4 — and
Epic 4 is closing this week.** It filters ledger rows with `/^\|\s*3\.\d+\s*\|/`
and gates on the `**Status:**` line of Epic 3's close story. **Both literals are
hard-coded to Epic 3.** `LIVE-REHEARSAL.md` now carries **seven** Epic 4 rows
and every one reads `OPEN`. **Epic 4 can close with `pnpm invariants` green and
every row empty** — precisely the condition this check exists to make
impossible, in a file whose own rules claim _"`pnpm invariants` asserts every
story marked complete in `EPIC.md` has a row here."_ **This is the only
mechanical gate standing between an epic close and an unwatched product, and two
string literals scope it to one epic.** Routed to Task 4.9.5, to be fixed
**before** Task 4.9.9 runs — the difference between a gate and a record. One
trap in writing it: the check **returns early** when the close status does not
match `/\b(complete|closed)\b/i`, so a break that only edits the ledger goes
green.

**B. `scripts/breaks.mjs`'s own header claim is unguarded in the direction that
matters.** Its line 3 states _"One entry per invariant in
`check-invariants.mjs`"_ and `CLAUDE.md` states _"Every one is break-verified by
a `pnpm break` entry."_ `every-break-can-still-land` checks **breaks → files**;
**nothing checks invariants → breaks.** 54 invariant ids, 154 break entries, 75
of them targeting `pnpm invariants`, and the pairing is carried only in each
break's `proves:` prose — break names deliberately describe the **defect**
rather than the invariant, so no mechanical link exists. Matching `expect`
strings against invariant source leaves 22 ids unattributable, **and that
unreliability is the finding**: the pairing cannot be audited, so a deleted
invariant's orphaned break and an invariant that never had one are **both
invisible**. Routed to Task 4.9.5 with a shape — a `proves: "<invariant-id>"`
field and one invariant asserting the correspondence in **both** directions.

**C. `one-direction-one-home`** — item 8 above. Not mechanisable; a one-word fix,
taken here.

### Two things flagged rather than guessed

- **`CLAUDE.md`'s `~41%` is published by subtraction, three lines before its own
  _re-measure rather than subtract_ rule.** The arithmetic is self-consistent
  (3.497 − 3.366 + 1.288 ≈ 40.6%) and it is a **different quantity** from Epic
  14's _about a third_ (1.288 / 3.366 ≈ 38%, the attributed **term** rather than
  the **batch**) — and neither said which. **Annotated** rather than deleted,
  which is the conservative direction and preserves the figure; **whether it
  comes out entirely is the owner's call** and was put to them on 2026-10-12.
- **Story 4.4's own open figure is now doubly owed.** Its status line records
  _"Task 4.1.6's coverage band was measured over 518 and is unusable as a figure
  over 503 — the re-measure is owed."_ The population has since moved to
  **501**, so the owed re-measure is against a **third** number. It is recorded
  nowhere outside that status line; routed to Epic 4's ships-open inventory in
  Task 4.9.9.

### Gates

| Gate              | Result                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| `pnpm links`      | **`529 documents, 1724 cross-file links, 39 anchor links, 0 broken.`** |
| `pnpm invariants` | **`54 invariants hold.`**                                              |
| `pnpm verify`     | recorded below                                                         |

## For a stakeholder — a status report, 2026-10-12

When a task measures something, what it disproves is often a statement in a
_higher_ document — an architectural record, the product specification, the
repository's own standing guidance. Nothing carries a correction upward on its
own, so this pass does it deliberately, twice over: once against a list of what
we thought had moved, and once by searching the whole repository for each figure.

**The two halves found different things, which is the reason for doing both.**
The list found eight stale statements. The search found two the list could never
have produced — including, as the single most useful item, **an instruction file
that tells future automated agents the wrong size for our test database**. An
agent told the wrong number writes a test against the wrong number, and this
repository has already paid for that round trip once.

**And the search found something about our own tools.** One test file contains a
zero byte, used deliberately as a separator. The standard search tools treat
such a file as binary and skip it **silently** — reporting it as _absent_ rather
than as _containing nothing_. It caused a wrong conclusion inside this very pass
(two safety checks were reported missing when they are present), and it means an
earlier sweep this morning missed that file entirely. The build-time checks are
unaffected, because they read files directly rather than shelling out.

**The most serious finding is a gate that cannot see the epic it is about to
gate.** We have one automated check whose job is to stop an epic being declared
finished while nobody has watched the product work against the real market. It
is written against the previous epic by name, in two places. **This epic could
therefore be closed with the check green and not one row of that ledger
filled** — which is exactly what the check exists to prevent. It is being fixed
before the close runs, rather than after.
