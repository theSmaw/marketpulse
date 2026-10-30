# Task 5.7.8 — The close: four gates on the final tree, and Epic 5 verdicted

**Status:** **In progress — 2026-10-29. Split in two, because one half cannot wait for the chair and the other must not run before it.**

- **The sweep — before the sitting.** Epic 5 has **no subject document and no row in `CLAUDE.md`'s _Where the record lives_ table**, found while starting this task: its account is spread over six `STORY.md` files and forty task files with no _start here_, where Epic 4 has `MARKET-OVERVIEW.md` which _wins where a task file disagrees_. That is Phase 3's sweep and it is written now.
- **The gates and the close — after the sitting.** AC 7 wants four suites **once on the final tree**, and a merge between the bell and the end of the sitting restarts the backend, empties the trailing window and destroys the evidence for rows 5.2, 5.4 and 5.6 at once.
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

## What was done — the sweep half, 2026-10-29

### `ANOMALY.md` — the subject document Epic 5 never wrote

396 lines, in the epic's own directory, with a row in `CLAUDE.md`'s _Where the
record lives_ table that did not exist. Its status line carries the house rule:
**where a task file disagrees with it, it wins; where it disagrees with an ADR
about a decision, the ADR wins.**

**It was found by starting this task, not by planning it** — and the finding is
sharper than the omission. Epic 2 produced **seven** subject documents and Epic 3
**seven**. Epic 4 produced **none**, and its own close wrote
`MARKET-OVERVIEW.md`, which **opens by recording exactly that about itself** and
says that until then the answer to _how does this screen work_ was _read
eighty-one task files_.

**Epic 5 then did the same thing.** Six figures across two screens, five derived
tables, four new ADRs — and the answer to _how does this work_ was **read six
stories and forty task files**, with **no Epic 5 row in that table at all**. So
this is not the pattern working. **It is the pattern failing twice and being
caught twice at the same point**, by the close rather than by the stories, and
the document says so in its own second paragraph rather than presenting itself
as routine.

**What it is organised around is the thing most likely to make a reader wrong.**
§0 is not a summary — it is **three stores and a table of what each can show**,
because almost every claim in this epic is a claim about a store and this epic
has already shipped two false sentences from exactly that (both of Story 5.5's,
in **opposite** directions). §5 is **what no machine and no person has ever
seen**, placed before the traps and flagged in the table row as the section to
read before trusting anything above it.

**And §5 carries the correction that was false for a day in the other
direction**: a score **has** been drawn on a real route — `score 35 · band
elevated · max 35`, 625 B, 2026-10-23 — which `CLAUDE.md` denied until Task
5.7.4.

### Gates for this half

```
pnpm build         exit 0
pnpm lint          exit 0
pnpm format:check  All matched files use Prettier code style!
pnpm links         602 documents, 1942 cross-file links, 39 anchor links, 0 broken.
pnpm invariants    78 invariants hold.
```

Load read **before** the run: `4.94 4.98 3.83`. The 22 new cross-file links in
`ANOMALY.md` and the six in the table row all resolve — **and they were staged
before `pnpm links` ran**, because Task 5.7.6 established that
`check-links.mjs` uses `git ls-files` and is therefore **blind to an untracked
document**. An unstaged `ANOMALY.md` would have reported `0 broken` over a file
whose every link was unchecked.

One warning prints by design and will until somebody clears it:
`⚠ Epic 4's rehearsal row 4.7 is WAIVED 2026-10-13`.

## Still owed — the gates and the close, after the sitting

1. `pnpm verify`, `pnpm test:database` and `pnpm e2e` **once on the final tree**,
   with `uptime` read before each and the numbers quoted. `pnpm links` is already
   `verify`'s seventh step, so AC 7 names it redundantly — to be said rather than
   silently dropped.
2. `LIVE-REHEARSAL.md` rows 5.1–5.6 dated or waived, and row 4.7's disposition.
3. Story 5.7's `**Status:**` and `EPIC.md`'s — **and nothing may write
   `complete` or `closed` into Story 5.7's status line until the rows are
   filled**, because `the-epic-close-cannot-outrun-the-rehearsal-ledger` is
   case-insensitive on **either** word and will refuse the build. Even a sentence
   like _"cannot be closed until…"_ fires it.
4. `CLAUDE.md`'s _Current state_ for what the epic shipped, and Gate 2's report.

## For a stakeholder — a status report on the sweep half, 2026-10-29

Epic 5 shipped a 0–100 score, four factor surfaces, five database tables and four
architectural decisions, and left no single document explaining any of it. Anyone
needing to understand or safely change how this product decides something is
unusual had to read six story files and forty task files, and the index of
project documentation had no entry for it at all.

That document now exists. It is deliberately organised around the thing most
likely to mislead a reader rather than around the features: **which database you
are looking at decides what the product can show you**, and this epic has already
published two confidently wrong sentences because somebody measured on a
developer's machine and described the live product. The first section is that
distinction, and a whole section near the end lists plainly what no machine and
no person has ever actually seen working — because most of what is proved here is
proved against data the tests supply themselves.

The uncomfortable part is the pattern. The previous epic also finished without
such a document, also wrote one at its close, and that document opens by saying
so. Two epics in a row have now been caught at the same point by the same check.
