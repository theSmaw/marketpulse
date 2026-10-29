# Task 5.7.8 — The close: four gates on the final tree, and Epic 5 verdicted

**Status:** Not started
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** 5.7.2, 5.7.3, 5.7.4, 5.7.5, 5.7.6, 5.7.7

## Objective

A collection of completed tasks is not automatically a completed story, and a
number taken on an intermediate tree is not a reading of the thing being closed.

## What the user can see when this lands

**Nothing** — and an epic whose figures can be re-taken rather than cited.

## Work

- **The four gates, once, on the final tree, in this order**, with `uptime` read
  **before** each run and never during, because a full suite leaves the machine
  at ~25–31 and is its own plant:

  ```
  uptime && pnpm verify          # quote the printed "N invariants hold." — 74 ids today
  uptime && pnpm test:database
  uptime && pnpm e2e
  ```

  **`pnpm links` is already `pnpm verify`'s seventh step**, so AC 7 names it
  redundantly — say that rather than reporting a number that gates nothing new.
  **Read the output, not the verdict line**: Vitest prints `Unhandled Errors` and
  still exits 0, a non-matching `-t` reports skips and exits 0, and a pipeline
  exits with the status of its last command. Use
  `set -o pipefail && … > /tmp/x.log 2>&1; echo "EXIT: $?"`.
  **If `pnpm e2e` goes red once**, the pooled flake rate is 5.6% per execution at
  four workers and **0% at one**, so a single red run is more likely a draw than
  a regression; the recorded floor for separating them is n = 24 on one checkout.

- **Verdict the rewritten exit criterion** (Task 5.7.3's shape), clause by
  clause, with the store named for each.
- **Everything shipping open carries an owner and a condition rather than an
  epic number.** `Anomaly history`'s re-worded condition; the band floors (whose
  trigger fires in the same commit as the volume arm's, because every quantile
  behind 32/63/73 was measured on a two-factor max-75 scale); `FACTOR_WEIGHTS`
  40/35/25, argued and never measured; the cohort rule, correct and invisible at
  485 of 485 single-cohort rows; the five-token amber collision; `Panel`'s
  `reserved` doing two jobs; the rail's unasserted adjacency.
- **`CLAUDE.md`'s _Current state_ and _Where the record lives_**, including the
  five-of-seven region correction and the subject-document row if Epic 5 gains
  one.
- **`EPIC.md`'s status**, and **Story 5.7's own `**Status:**`** — which is the
  line `the-epic-close-cannot-outrun-the-rehearsal-ledger` keys on, and it is
  case-insensitive on either `complete` **or** `closed`, so even "cannot be
  closed until…" fires it.
- **Report at Gate 2**: what a user can now see, each criterion with its
  evidence, figures rather than adjectives, what shipped open and who owns it,
  what the tasks changed about the plan, the PR links — and **plainly what was
  not verified and why**.

## Done when

1. All four gates run once on the final tree with their numbers and load averages
   quoted verbatim.
2. The exit criterion is verdicted clause by clause.
3. Nothing open carries an epic number as its owner.
4. `CLAUDE.md`, `EPIC.md` and `STORY.md` agree about what Epic 5 shipped.

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
