# Task 2.3.9 — The two tickers the vendor has never heard of

**Status:** **Complete — 2026-10-12** — the brief's premise that `UNIVERSE.md` §9 is where the count lives is false (§9 is a protected historical record of the 101-security list), so the distribution was re-printed into a new §17; and the one breakage nobody predicted was a _database_ test, because `recordAttempts` silently skips a symbol the database does not hold.
**Story:** [2.3 Security domain model and tracked universe](STORY.md)
**Depends on:** 2.3.8, and on Task 2.8.13, which is what produced the reading

## Objective

`pnpm universe:check` was run against the vendor on 2026-10-12 — the first
whole-list re-check since the file was written on 2026-09-08 — and it found
three disagreements:

```
✓ 518 securities checked against the vendor
○ 2 tracked and unknown to the vendor entirely: PSKY, WBD
○ 1 whose listing venue disagrees with the file: KHC  file says NASDAQ, vendor says NYSE
Nothing was written.
```

`PSKY` and `WBD` are the two securities Task 2.8.13 spent a whole task on from
the other end: the deployed freshness gate had been shouting about them for four
days in the wrong words, reading _the market had nothing for this symbol_ as
_we are behind on this symbol_. That task made the gate explainable and
deliberately left the **curation** alone, because a gate that cannot be
satisfied and a list that is wrong are two defects and only one of them was its.
This is the other one.

The product owner's decision, taken 2026-10-12: **mark them `untracked` and
keep the rows**, and **fix `KHC` in the same change**.

## What the user can see when this lands

On `/securities`, **two fewer rows on a fresh store and two rows that stop
counting on the deployed one**, and `KHC` stating `NYSE` where it said `NASDAQ`.

On `/`, three drawn sentences change their denominator: the breadth region's
heading `Of the 503 we track` becomes `Of the 501 we track`, the movers'
denominator sentence moves with it, and `Market proxies` is untouched. Neither
figure is a literal anywhere — `measured-set.ts` already refuses one — so they
move because the **wire** says so, which is the arrangement working.

## Work

- **`apps/backend/src/universe.ts`** — delete the `PSKY` and `WBD` rows from the
  `communication_services` / `Media & Entertainment` block, and change `KHC`'s
  exchange to `NYSE`. **Deleting the row is how `untracked` is expressed** —
  there is no per-row `status` and there must not be one: `untrackAbsent` in
  `load-universe.ts` is the mechanism Task 2.3.6 built for exactly this, and
  §15.8 records that a `status` written by anything but the loader is silently
  reverted by the next deploy's `pnpm universe`.
- **Fix every count comment in that file**, per §12.8 step 3 — the header's
  `518 securities` and `All 503 equities`, and the `Media & Entertainment`
  block's own count line. Nothing mechanical catches a stale one.
- **Move `UNIVERSE_PROVENANCE.profile.checkedOn` to `2026-10-12`, and leave
  `classification.checkedOn` at `2026-09-08`.** §12.9 forbids moving the date
  for an add or a remove and _requires_ it when the list has actually been
  re-checked — this is the second case. The asset catalogue the check read
  carries `symbol`, `name`, `exchange` and the vendor's own status, which is the
  **`profile`** field group exactly; sector and industry were not re-checked by
  anything, so claiming they were would be the lie §5 nominates this column as
  the mitigation against. Expect the loader to report every row updated and say
  so in the record, because §12.9 predicts somebody reading that as a bug.
- **The mechanical blast radius**, which is `status` being an invisible
  predicate (§12.2) and is the part to be careful about. CI's store is built by
  `pnpm universe` into an **empty** database, so the two symbols are never
  inserted there at all and CI's `/securities` serves **516**; the deployed
  store already holds them, so it serves **518 rows of which 516 are active**.
  The two stores therefore disagree, both correctly. Find and fix every place
  that will now be wrong or will go red, at least:
  - `e2e/specs/universe-navigation.spec.ts` asserts `0 of 518 rows shown` and
    `518 securities tracked`.
  - `e2e/specs/market-reconnect.spec.ts` asserts `resent` has length 518.
  - `UNIVERSE.md` §9's distribution table and its count, which is where the
    count is recorded and nowhere else.
- **Sweep the documents, separating live claims from historical records.** The
  repository's own rule: amend a live claim, leave a dated measurement standing.
  `README.md`'s present-tense `518`s, `PRODUCT_SPEC.md` §6's sizing sentence and
  the §9/§9b amendments that state the population, and `CLAUDE.md`'s _Current
  state_. **Do not** rewrite a measured figure — `190,736 bytes for the 518
securities`, `340 of 518 holding a bar`, `50–76 ms on the 518-row table` are
  observations with dates on them and they stay.
- **Do not re-record `apps/frontend/src/fixtures/securities.ts`.** It is a
  recorded body and recorded bodies are evidence; its 518 rows are what the
  server said on the day it was recorded. Leave `bands.test.ts`'s `TOTAL = 518`
  with it, since it counts that fixture rather than the universe.

## Done when

1. `apps/backend/src/universe.ts` holds 516 securities — 501 equities and the
   fifteen proxies — with `KHC` on `NYSE`, every count comment in it correct,
   and `profile.checkedOn` reading `2026-10-12` while `classification.checkedOn`
   reads `2026-09-08`.
2. `pnpm build && pnpm universe` against a store holding the old list reports
   `PSKY` and `WBD` under `now marked untracked`, and a re-run reports them
   under `already untracked, unchanged` and writes nothing.
3. `pnpm verify` is green, and `pnpm test:database` is green.
4. `pnpm e2e` is green on the two specs named above against a store built the
   way CI builds one (`pnpm store:bare`).
5. `UNIVERSE.md` §9 records 516/501 with the distribution re-printed from the
   file rather than edited by hand, and §12.9's prediction about the loader's
   `N updated` is quoted against what the loader actually said.
6. Every surviving `518` and `503` in the tree has been looked at once and is
   either a corrected live claim or a dated measurement left standing, with the
   two counts stated in the record.

---

## What was done — 2026-10-12

### The list

`apps/backend/src/universe.ts` now holds **516 securities — 501 equities, the
eleven sector SPDRs and the four index proxies**, counted off the compiled
module rather than asserted.

- The `PSKY` and `WBD` rows were **deleted** from the
  `communication_services` / `Media & Entertainment` block. Deleting the row is
  how `untracked` is expressed; no per-row `status` was invented and
  `toSecurity`'s hard-coded `status: "active"` is untouched.
- `KHC`'s exchange moved `NASDAQ` → `NYSE`.
- `UNIVERSE_PROVENANCE.profile.checkedOn` moved to `2026-10-12` with a comment
  saying which group was re-checked and why the other was not.
  `classification.checkedOn` stays at `2026-09-08`.
- Every count comment in the file was corrected: the header's
  `518 securities` → `516` and `All 503 equities'` → `501`, the eleven sector
  block comments `N of 503` → `N of 501`, `communication_services` itself
  `24 of 503` → `22 of 501`, and `trackedTickers`' two doc-comment figures
  (`the 503 equities` and `Nothing here spells 503`) → `501`. Three `503`s were
  **left standing** in that file as dated records of Task 2.8.2's own
  reasoning: _at 503 it is ~2,500 lines_, _a validated CIK for all 503 in front
  of it_, and _503 rows … 503 independent checks of the mapping table_.

### The two loader runs, verbatim

First run, against a store holding the old list:

```text
$ node scripts/load-universe.mjs

  ✓ 516 securities in the universe
      0 inserted
      516 updated
      0 unchanged

  ○ 2 in the database and not in the file, now marked untracked:
      PSKY, WBD

    The rows are kept and so is everything stored against them. `status` is not a
    soft delete: a reader that shows a human a security shows the status, and a
    reader that computes over the tracked market filters on it. See
    `UNIVERSE.md` §12 for which readers do which.
```

Second run, immediately after:

```text
$ node scripts/load-universe.mjs

  ✓ 516 securities in the universe
      0 inserted
      0 updated
      516 unchanged

  ○ 2 already untracked, unchanged: PSKY, WBD
```

**§12.9's prediction held and is quoted against what the loader said.** The
section predicts that moving `checkedOn` by one day reports every row updated
and that somebody will read it as a bug. It did: **`516 updated`** on the first
run, `0` on the second. That is `profile_retrieved_at` moving on every row, not
516 edits. §12.9 also says to take a re-check commit _separately_ from an
add-or-remove commit, and that was deliberately **not** done — one vendor check
produced the removals, the venue correction and the date, and splitting them
would file one finding under two dates.

### The counts, and the asymmetry between the two stores

**516 securities, 501 equities.** And the two stores now disagree, both
correctly:

| Store                                                        |    Rows | `active` | `/securities` draws                              |
| ------------------------------------------------------------ | ------: | -------: | ------------------------------------------------ |
| Built into an **empty** database — CI, and `pnpm store:bare` | **516** |      516 | 516 rows, no `no longer tracked` clause          |
| Already held the two — the deployed store, and a developer's | **518** |      516 | 518 rows, two marked, plus `2 no longer tracked` |

`securities tracked` is the **active** count and reads 516 on both.
`N of M rows shown` has `securities.length` as its denominator and differs.
Confirmed by producing both: `pnpm store:bare` (after dropping the stale
`marketpulse_bare`, which otherwise re-used the old 518 rows and reported the
deployed shape) prints `marketpulse_bare: 516 securities, 0 bars.`, and
`GET /securities` against the developer's own store returns 518 rows of which
516 are `active`, the two exceptions being `PSKY` and `WBD`.

### The mechanical breakage

Three sites, one of which the task file did not predict.

1. `e2e/specs/universe-navigation.spec.ts` — `0 of 518 rows shown` → `516`,
   `518 securities tracked` → `516`, and the test name. A comment now says
   which of the two figures is the row count and which the active count, and
   that this suite runs against the empty-database shape.
2. `e2e/specs/market-reconnect.spec.ts` — `expect(resent).toHaveLength(518)` →
   `516`, with the same note.
3. **Not predicted: `apps/backend/src/bar-attempts.database.test.ts` went red.**
   `a security that has stopped printing > finds WBD and PSKY` asserted
   `[] ` against `['PSKY','WBD']`. The cause is `recordAttempts` skipping a
   symbol the database does not hold — deliberate, so a note cannot abort a
   run's logging — and that suite seeds itself with `loadUniverse()`, which no
   longer produces the two. **The repair reproduces the deployed shape rather
   than renaming the fixture**: the block's own `beforeAll` inserts the two as
   `untracked` rows, which is what the deployed store holds and what §12.1
   requires. The test is stronger for it: `pnpm bars:check` reads the
   **unfiltered** ledger (`listCoverage`, not `listTrackedCoverage`), so an
   untracked security that has stopped printing is still a finding, and the
   reading is now taken over an untracked row.

**One live drawn sentence was found by looking at the page rather than by a
grep or a suite.** `pnpm probe /` showed the reserved `Market topology` region
reading _"The securities graph, in WebGL — 518 nodes clustered by sector…"_.
It is a literal in `MarketOverview.tsx` with no test over it, and nothing
mechanical would ever have caught it. Corrected to 516.

### The document sweep

**Amended — live, present-tense claims (7 files, 14 sites):**

- `README.md` ×4: `pnpm universe # loads the 518 …` → 516, `/securities`'s route
  table row `518 real securities` → 516, the `pnpm universe` section's opening
  sentence → 516 (and the list re-described as _the S&P 500 less the two names
  the vendor no longer lists_), and that section's illustrative loader
  transcript `518 … 517 unchanged` → `516 … 515`.
- `planning/PRODUCT_SPEC.md` ×2: §6 gained a **new dated amendment** stating
  516 / 501, the two removals, the venue correction, the two-store asymmetry,
  and that the figures in the dated amendments below it are records; and §33's
  first-slice amendment `the universe is 518 rather than 100` → 516.
- `apps/backend/src/universe.ts` ×4 and `MarketOverview.tsx` ×1, above.
- `scripts/build-bare-store.mjs` ×3: the two prose statements of _518
  securities and zero bars_ and the `MINIMUM_SECURITIES` comment's _the exact
  518_. The constant itself is a floor of 100 and did not move.
- `e2e/README.md` ×1: the spec table's `the 518-row table`.
- `UNIVERSE.md`: §9's banner, §12.8 steps 2 and 3 (which pointed at §9's table
  as _the current distribution_ — it is the 101-security list), §16.4 gained a
  dated note, and **§17 is new**.
- The two e2e specs, above.

**Left standing — dated measurements and historical records.** `518` or `503`
appears **1,953 times across 276 Markdown files** (`grep -rnE "\b(518|503)\b"
--include="*.md"`, 2026-10-12 — and recording that count is itself the thing
that invalidates it). Essentially all of them are task files and story closes,
which are records of what was true on their own date. The ones worth naming
because a reader will meet them:

- `docs/GAPS.md`, **79 occurrences**, untouched. Every one sits inside a dated
  measurement or a dated amendment, including roughly a dozen repetitions of
  _CI's store has 518 securities and zero bars_ which are now 516. **Left for
  the owner to decide** rather than edited: the phrase is duplicated for
  legibility across entries whose subject is a figure, and correcting the
  number inside a measured paragraph is the destructive direction.
- `CLAUDE.md`, **19 occurrences, untouched and NOT edited by this task.** The
  harness forbids an agent changing `CLAUDE.md` on an agent's instruction. The
  sites needing a live correction are listed in the report handed back with
  this task: lines 52, 63, 98, 100, 135, 281, 367, 783, 859 and 1071. The
  remainder (111, 116, 232, 246, 371, 382, 640, 660, 675) are dated
  measurements and should stay.
- `apps/frontend/src/fixtures/securities.ts` and `bands.test.ts`'s
  `TOTAL = 518` — **deliberately not re-recorded**, per the task file. A
  recorded body is evidence of what the server said on the day it was recorded.
- Storybook sample args (`Panel`, `TextField`, `PageHeader`, `MetricStrip`,
  `Badge`) carrying `518` and the overview stories carrying `tracked: 503`.
  The latter are synthetic wire frames that are internally consistent and have
  no dependency on the universe; the former are illustrative copy. Left, and
  listed.
- Every `tracked: 503` in `e2e/specs/overview-*.spec.ts` — injected frames the
  spec writes itself, self-consistent, unaffected.
- HTTP `503`s throughout, which are a status code.

### §9 and the distribution — one correction to this task file's own premise

**The task file says `UNIVERSE.md` §9's distribution table is _where the count
is recorded and nowhere else_. That is false.** §9 opens with a banner saying
it is a historical record of the **101-security** list, left standing, and that
§16.4 carries the current distribution; §16.4 is Task 2.8.2's before/after and
is itself a dated record. Editing §9's table would have destroyed a record the
document explicitly protects.

So the distribution was re-printed **from the compiled file with a throwaway
script** (not kept, for §9's own stated reason) into a **new §17**, §9's banner
was amended to point at it, and §16.4 gained a dated note. §17.2 says in the
section itself that the table was printed rather than edited.

The re-printed figures: industrials 83 (16.6%), financials 76, technology 73,
health care 59, consumer discretionary 47, consumer staples 34, utilities 31,
real estate 30, materials 25, communication services **22** (down from 24),
energy 21. Twenty-five industry labels, mean 20.04, deepest 57, shallowest 2,
20 of 25 labels at ≥ 11 members, 476 of 501 equities inside one, and
`Semiconductors & Semiconductor Equipment` unchanged at **20**. §7 rule 3's
intent holds at 16.6% and rule 2's at 21.

### Gates

| Gate                                   | Result                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| `pnpm build`                           | exit 0                                                           |
| `pnpm verify`                          | **exit 0**, `54 invariants hold.`, no `Unhandled Errors` block   |
| `pnpm test:database`                   | **6 files, 215 tests passed** — red first, see above, then green |
| `pnpm universe` ×2                     | quoted verbatim above                                            |
| `pnpm store:bare`                      | `marketpulse_bare: 516 securities, 0 bars.`                      |
| `pnpm e2e universe-navigation.spec.ts` | **9 passed (10.2s)**                                             |
| `pnpm e2e market-reconnect.spec.ts`    | **4 passed (5.5s)**                                              |
| `pnpm invariants`                      | inside `verify`; `54 invariants hold.`                           |
| `pnpm break`                           | **not run — no check was added or changed**                      |
| `pnpm probe /`                         | run, at 1440; it is what found the `518 nodes` sentence          |

`pnpm verify`'s test tail:

```text
packages/shared test:  Test Files  22 passed (22)
packages/shared test:       Tests  440 passed (440)
apps/backend test:  Test Files  50 passed (50)
apps/backend test:       Tests  1045 passed (1045)
apps/frontend test:  Test Files  86 passed (86)
apps/frontend test:       Tests  1413 passed (1413)
apps/backend test:process:  Test Files  2 passed (2)
apps/backend test:process:       Tests  55 passed (55)
```

The two browser specs were run against a pair driven at `marketpulse_bare`,
rebuilt from an empty database so it is CI's shape and not the developer's.
**The rest of the browser suite was not run** — it is five minutes and drives
this eight-core machine from 3 to 28 load — and nothing else in it asserts a
universe count: every other `518` or `503` in `e2e/specs/` is either a frame
the spec injects itself or a comment.

### A note for whoever runs the deploy

Nothing here changes the deployed store's row count. `deploy.yml` runs
`pnpm universe`, which will mark the two rows `untracked`; the rows and their
bars stay. `/securities` will draw 518 rows with two marked and a
`2 no longer tracked` clause, and every figure computed over _the market we
track now_ — breadth's denominator, the movers' population, the freshness
gate — will read 501 / 516.

---

## For a stakeholder — a status report, 2026-10-12

**What was wrong.** MarketPulse tracks a curated list of US securities. For the
first time since that list was written on 8 September, we checked every name on
it against our market-data vendor. Three disagreed. Two of them — Paramount
Skydance (`PSKY`) and Warner Bros. Discovery (`WBD`) — the vendor has never
heard of at all, and had stopped sending us any data for on 5 October. One,
Kraft Heinz (`KHC`), we had listed on the wrong exchange.

**What we did.** We stopped tracking the two the vendor cannot give us data
for, and corrected Kraft Heinz's exchange. The tracked list is now **516
securities, 501 of them companies** (the rest are the sixteen index and sector
funds we use as benchmarks).

**Nothing was thrown away.** Both securities keep their rows and every price
bar we ever stored against them. They are marked _no longer tracked_ rather
than deleted, which is a deliberate design decision: a security we stopped
following is still part of the history we can replay, and deleting it would
quietly change the past. Anyone opening the Security Explorer will still see
them, labelled.

**What changes on screen.** Two fewer rows in the securities table on a fresh
installation. On the landing page, three sentences change their denominator —
_"Of the 503 we track…"_ becomes _"Of the 501 we track…"_ on the market breadth
and movers panels. Neither number is typed anywhere; they move because the
underlying data moved, which is the arrangement working as designed.

**A side effect worth knowing about.** Our deployed health check had been
reporting the system as four days behind on data since 5 October. It was not:
the vendor simply had nothing to send for these two names. A companion piece of
work last week taught the check to say so; this work removes the cause. The
check should now be clean.

**Confidence.** Every automated gate is green — the full verification suite,
the database suite, and the two browser tests affected. The two loader runs
that apply the change were executed and their output recorded. One defect was
found by a person opening the page rather than by any test: a panel describing
a future feature still said _"518 nodes"_. It now says 516.
