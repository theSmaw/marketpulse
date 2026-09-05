# Story 2.3 — Security Domain Model & the Tracked Universe

**Status:** In progress
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.2
**Epic scope covered:** Security domain model; initial ~100-security universe; ETF/sector metadata

## Description

Decide what a security **is** in this product, and decide which ~100 of them MarketPulse
tracks. The second half is a product decision rather than an engineering one, and it is
the one that quietly determines whether every later epic has anything interesting to show:
Epic 4's sector performance, Epic 5's relative-move calculation, Epic 6's topology
clustering and Epic 7's peer comparison all read this list.

§6 asks for 100–500 liquid US-listed equities plus SPY, QQQ, DIA, IWM and major sector
ETFs, starting at roughly 100, with an architecture that expands without redesign.

## Why it sits here in the sequence

It is the first table with rows, so it exercises Story 2.2's mechanism on something real
and small. Everything downstream needs a symbol list: Story 2.6 cannot request bars
without one, and Story 2.7 cannot size storage without knowing how many securities there
are.

## Scope

- The `Security` type in `packages/shared`, and the vocabulary it fixes: symbol, name,
  exchange, kind (**an equity, a sector ETF and an index ETF are three different things and
  Epic 4 treats them differently** — Task 2.3.1 widened `SECURITY_KINDS` from the two
  members this line originally named), sector, industry, status, and the identifiers that
  let Epic 9 map a security to a CIK later
- The `securities` table and its migration
- **The chosen universe, with the selection rule written down**, so the list can be
  regenerated rather than only edited: liquidity, market-cap spread, and — the criterion a
  naive "top 100 by market cap" list fails — **deliberate sector coverage**, because a
  list that is 40% mega-cap technology makes "relative to sector" and "market breadth"
  structurally uninteresting
- The ETF set, and the distinction between an **index proxy** (SPY, QQQ, DIA, IWM) and a
  **sector proxy** (the sector SPDRs), which Epic 4 and Epic 5 need to tell apart
- The sector taxonomy, and the mapping of each equity to a sector and to its sector ETF
- Where the universe lives: seed data in the repository, versioned and reviewable, versus
  fetched from a provider
- How the list changes: adding a symbol, removing one, and what happens to data already
  stored for a removed symbol
- Expansion to 500 without redesign — demonstrated by argument and by the absence of any
  hard-coded 100, not by actually loading 500

## Out of scope, and who owns it

- Anything about prices — Stories 2.6 and 2.7
- Correlation or graph relationships between securities — Epic 6 owns `relationships`
- CIK mapping and filings — Epic 9
- A user-editable watchlist — not in V1 scope (§37)

## Open decisions — settle with the user

**All four are owned by Task 2.3.1, which settles them and ships nothing**, in the shape
Tasks 1.10.1, 1.11.1, 2.1.1 and 2.2.1 took — because the vocabulary chosen here is read by
Epics 4, 5, 6, 7 and 9 and appears in URLs, chart axes and agent-facing text, and this
story's own Design surface note says renaming it later is expensive. That task also adds
four decisions this list does not name and that would otherwise be answered by accident:
**how an index proxy is distinguished from a sector proxy** (both are ETFs and Epic 4 needs
to tell them apart), **the `status` vocabulary** (`securities.status` ships with no check
constraint precisely because Task 2.2.4 refused to invent it), **the per-field provenance
shape** that acceptance criterion 6 asks for, and **what format the universe file takes** —
where the deciding measurement is that a `.ts` module is inside `tsc -b` and a data file is
read by Prettier for formatting and by nothing for meaning.

**All eight are settled, and the record is [`UNIVERSE.md`](UNIVERSE.md)** — Task 2.3.1
decided them and shipped nothing, finishing with the tree byte-identical. In one paragraph:
the taxonomy is the **eleven GICS-shaped sectors**, each mapped one-to-one onto a sector
SPDR, chosen against the ETFs rather than against familiarity; **`SECURITY_KINDS` widens to
three members** — `equity`, `sector_etf`, `index_etf` — so the proxy distinction is one
column with one source of truth; **`status` gets exactly two members**, `active` and
`untracked`, because those are the two this story can produce, with `delisted` deferred to
its producer in Story 2.6; sector and industry come from a **curated file in this
repository**, with its silent-staleness cost recorded as a gap of this repository's third
kind and a reversal trigger stated; provenance is a **source and a retrieval timestamp per
field group** rather than one column on the row; the universe is a **seed script and not a
migration**, per `apps/backend/migrations/README.md` §7; it lives in a **`.ts` module at
`apps/backend/src/universe.ts`**, on two measurements — a data file is invisible to `tsc`,
and it is also absent from `dist/` and therefore from the container image; and the
**selection rule is a floor of 6 and a ceiling of 12 equities per sector**, which puts the
largest sector at 14.1% of the equities — **14.0% as actually built, over 86 equities
rather than the ~85 that arithmetic assumed.** ~~Only **the actual symbols** remain open, and
they are Task 2.3.4's product conversation.~~ **Task 2.3.4 settled them; all eight decisions
and the list are now closed, and §9 of that document is the distribution.** The original wording is kept below rather than
deleted, because it records what was being weighed at the time.

1. ~~**Where sector and industry metadata comes from.**~~ **Settled — a curated file in
   this repository, with the staleness cost recorded rather than glossed.** This is the decision people assume
   is free and is not: **Alpaca's assets endpoint does not carry sector or industry**, so
   the options are a curated dataset checked into the repository, a third-party source
   with its own licence and key, or deriving sector membership from ETF holdings. The
   curated file is the honest V1 answer — ~100 rows, reviewable in a diff, no new
   dependency, no new credential — and its cost is that it goes stale silently. Whatever
   is chosen, **provenance for this metadata is displayed like any other** (invariant 6)
2. ~~**Which taxonomy.**~~ **Settled — the eleven GICS-shaped sectors, one per sector
   SPDR.** GICS names are the familiar ones and are proprietary; a plain
   eleven-sector approximation is free and is what the sector SPDRs already imply. Prefer
   the one that matches the ETFs, since Epic 5 compares a security against its sector ETF
3. ~~**The actual 100 — still open, and Task 2.3.4's.**~~ **Settled — 101 securities: 86
   equities, the 11 sector SPDRs and the 4 index proxies, in `apps/backend/src/universe.ts`,
   with the distribution read against the rule in `UNIVERSE.md` §9.** The _rule_ that
   produces it was settled first, deliberately: a floor of 6 and a ceiling of 12 equities per
   sector. The list met it without the rule moving — floor and ceiling hit **exactly**, the
   largest sector at **14.0%** of the equities, and all eight of the spec's hand-named
   symbols present.
   **The COUNT is provisional and the sizing is PARKED — see `UNIVERSE.md` §10 (2026-09-05).**
   The user asked whether ~100 is enough to group and correlate meaningfully, and the
   measured answer is that the _rule_ holds while the _industry_ taxonomy does not: 45
   industries across 86 equities, **51% of them singletons**, and §11's own worked example
   of "82% of semiconductor securities" is arithmetically unreachable below 11 constituents
   against our deepest group of 8. Re-sizing is parked on one measurement Story 2.6 owns —
   whether minute-bar subscriptions are exempt from Alpaca's free 30-channel cap, which two
   Alpaca pages disagree about — because if they are not, 101 is already over the cap. What
   is **not** parked is the taxonomy being too fine, which is fixable with no new data. The
   deadline is Story 2.7: nothing encodes the count, so re-sizing costs one file edit until
   bars exist. The original wording follows, because it records the shape being aimed at: this wants a product conversation, not a generated list. A
   defensible starting shape: the eleven sector SPDRs plus four index proxies, then ~85
   equities allocated across sectors so every sector has enough constituents for a breadth
   number to mean something, weighted toward names with liquid IEX activity and
   recognisable to a demo audience (§38's flagship demo uses NVDA)
4. ~~**Whether the universe is a migration or a seed script**, given Story 2.2's answer~~
   **Settled — a seed script, because "idempotent" here has to mean "picks up an edited
   list", which a migration structurally cannot do.**

## Acceptance criteria

1. `Security` is defined once, in `packages/shared`, and both apps compile against it
2. The universe loads into a clean database in one documented command, and re-running it
   is idempotent
3. Every equity has a sector, and every sector present has a corresponding sector ETF; a
   security with neither fails the load rather than arriving silently unclassified
4. The count, the sector distribution and the selection rule are recorded, and the sector
   distribution is inspected against the "not 40% technology" criterion rather than assumed
5. Adding and removing a symbol are both demonstrated, including what happens to a removed
   symbol's stored data
6. The metadata's source is recorded per-field in a way Story 2.13 can display
7. `pnpm verify` passes

## Tasks

Tackled in order. The story is complete when all eight are done.

2.3.1 decides and ships nothing. 2.3.2 to 2.3.6 are entirely local and come **before** the
deployed database is touched, for Task 1.11.2's reason and doubly so here, because the
managed server carries a `CanNotDelete` lock and "drop it and start again" is not an
available recovery. Inside that run the order is the **type** (2.3.2), then the **schema**
that backs it (2.3.3), then the **data** (2.3.4), then the **loader** (2.3.5), then every
way the list changes (2.3.6). 2.3.7 is the half that gets skipped and then hurts. 2.3.8
closes the story and records ADR 0016 — 0016 and not 0014, which is reserved for Story
2.1's own close, and ADRs are never renumbered.

| #     | Task                                                                                                                                                | Status      |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2.3.1 | [Choose the vocabulary, the taxonomy and where the metadata comes from, shipping nothing](TASK-01-choose-the-vocabulary-and-the-metadata-source.md) | Complete    |
| 2.3.2 | [`Security` in `packages/shared`, and the vocabularies it fixes](TASK-02-the-security-type.md)                                                      | Complete    |
| 2.3.3 | [The schema the vocabulary needs: the first migration written by a reader of the conventions](TASK-03-the-schema-the-vocabulary-needs.md)           | Complete    |
| 2.3.4 | [The universe itself: ~100 securities, and the rule that produced them](TASK-04-the-universe-itself.md)                                             | Complete    |
| 2.3.5 | [The loader: one documented command, idempotent, and it refuses a bad universe](TASK-05-the-loader.md)                                              | Complete    |
| 2.3.6 | [Change the universe: add one, remove one, and say what expansion costs](TASK-06-change-the-universe.md)                                            | Not started |
| 2.3.7 | [Load the deployed universe, and decide whether that happens on every deploy](TASK-07-load-the-deployed-universe.md)                                | Not started |
| 2.3.8 | [Verify from a clean clone, document, and record ADR 0016](TASK-08-verify-document-and-adr.md)                                                      | Not started |

**Four things about this split are decisions rather than consequences.**

**The type comes before the schema** (2.3.2 before 2.3.3), which inverts the order a
schema-first instinct suggests. `apps/backend/migrations/README.md` requires that a closed
set's source of truth be a TypeScript union and that the `check` constraint be the
database's backstop — `SECURITY_KINDS` is already in that arrangement — so writing the
constraint first would make the database the source of truth for a vocabulary five epics
read from `packages/shared`.

**The data comes before the loader** (2.3.4 before 2.3.5), so that the product decision and
the engineering that consumes it fail separately. The list is a product conversation and
the loader is not, and a list written to fit a loader's convenience is how "deliberate
sector coverage" quietly becomes whatever was easy to fetch.

**Changing the list comes before deploying it** (2.3.6 before 2.3.7), for the reason 2.2.6
came before 2.2.7: what a removal does to stored data is not answerable until a removal has
been produced, and the deployed database is the one place it cannot be produced cheaply.

**And there is deliberately no task for a provider-backed metadata fetch.** If Task 2.3.1
chooses the curated file — the honest V1 answer — then a fetcher is scaffolding ahead of
the iteration that needs it, and its absence is what makes the staleness cost visible
rather than hidden behind a mechanism nobody runs.

**`market_bars` is in none of these tasks**, per Story 2.2's out-of-scope note and this
story's: Story 2.7 owns it, and its shape is driven by measured ingestion.

### Amended after Tasks 2.3.2 and 2.3.3 — no task added, deleted or re-ordered

The eight-task split survived contact with the first two implementation tasks. Five task
files were amended and one sequencing hazard was found that is **not** this story's to fix.

- **2.3.4** gained the three mechanical consequences of the type 2.3.2 actually shipped,
  none of which was predictable from "make the file typecheck against `Security`": it is a
  discriminated union, so an index proxy carrying a sector fails to compile too; `symbol` is
  a branded `Ticker`, so `symbol: "AAPL"` does not satisfy it and the rows need a
  constructor; and nullable is not optional under `exactOptionalPropertyTypes`, so a row
  that omits `cik` does not compile. It also lost a bullet it could not honour — **the rows
  cannot carry provenance**, because `Security` deliberately does not embed it, so that
  became a single negative check about the file having one source.
- **2.3.5** gained the decision this pair surfaced and no task file named: **what
  `*_retrieved_at` means on a re-run.** The obvious implementation stamps `now()` every
  load, which makes the timestamp mean "when this program last ran", carries no information,
  and destroys the one mitigation `UNIVERSE.md` §5 offers against the curated file's silent
  staleness. It also gained the note that `0003` now backs the row-level half of criterion 3,
  which changes what its validation is _for_ — to fail first with a usable message, since a
  Postgres constraint error names one row by an identifier nobody wrote.
- **2.3.6** gained the note that `securities_status_check` makes the removal vocabulary
  enforced rather than agreed: an invented `removed` or `inactive` is refused, `delisted` is
  specifically refused, and a `DELETE` is refused by nothing — which is why the decision
  there is still a decision.
- **2.3.7** gained a **sequencing hazard**, and it is the one thing here worth raising
  outside this story. That file is written as though migrations already reach the deployed
  database; they do not. **Task 2.2.7 and 2.2.8 are Not started, `deploy.yml` has no
  migration step, and the managed database has never had a migration applied to it** — it
  holds no `securities` table. So 2.3.7 cannot run before 2.2.7, and absorbing 2.2.7 into it
  would be the wrong shape, because migrating a production database is Story 2.2's subject
  with its own rollout and failure-behaviour questions. **Settle with the user rather than
  deciding here.** The half 2.3.7 _can_ settle is now confirmed rather than conditional: the
  universe is a `.ts` module under `src/`, so the container image carries it where it does
  not carry `apps/backend/migrations/`, and the argument that killed a boot-time job for
  migrations genuinely does not transfer.
- **2.3.8** gained a **conflict** rather than another sweep item. `0002_securities.sql`'s
  four numbered decisions are now substantially false, and `migrations/README.md`'s own
  final convention is _never edit a migration that has been applied_ — a rule nothing can
  enforce, since there is no checksum and `migrate.ts` matches by name, which makes it
  exactly the rule that erodes by being harmless the first time. 2.3.3 left `0002`
  byte-identical; 2.3.8 must resolve that explicitly and say so in the ADR, because Story
  2.7's stale migration comment will be read against the precedent. It also gained the two
  new figure-dense files, and a re-count of the `equity | etf` sites showing the shape
  changed rather than shrank.

**Nothing needed adding.** The two candidates were considered and both belong elsewhere: a
task for the deployed migration is Story 2.2's 2.2.7, and the foreign-key naming rule that
survived this story untested is Story 2.7's `market_bars.security_id`, recorded in
`migrations/README.md` rather than turned into work here.

### Amended after Task 2.3.4 — no task added, deleted or re-ordered

The eight-task split has now survived contact with four implementation tasks. **Four task
files were amended and one blocked task was unblocked**, and the unblocking was not this
story's doing.

- **2.3.5** gained the one hole the list actually opened, and it is the sharpest thing here:
  **a duplicate symbol has no backstop anywhere.** The reflex is that `symbol` is `unique`,
  so the database refuses it — but this loader **upserts** on `symbol`, and an upsert is the
  one write shape a unique index cannot refuse. Two identical keys, the second silently
  wins, the load reports success, and the row count is one short with nothing saying so.
  Invisible to the compiler (two valid rows), to the database, and to the count. It also
  gained two consequences of the file's shape: **`toTicker` runs at module load**, so a
  malformed symbol is an import failure rather than an accumulated violation and the "report
  every violation" promise has a stated exception; and **the `sector_etf`-agrees-with-mapping
  check is now vacuous**, because 2.3.4 took the instruction to generate those rows from
  `SECTOR_ETFS`, so the check cannot fail against the shipped file however wrongly it is
  written — Task 2.2.5's blind-check problem in a new place, and it must be made to fail
  against a hand-built list.
- **2.3.6** gained a constraint nobody anticipated: **the distribution sits on both bounds at
  once.** Technology is at the ceiling of 12 and three sectors are at the floor of 6, so the
  add and the remove are not free choices — a removal from utilities breaks §7's floor in the
  same commit that demonstrates a removal. Pick from the sectors at 9. It also gained an
  obligation nothing can enforce: **`universe.ts` describes its own shape in comments** —
  each block's count and its relation to the bounds — and this task is the first thing that
  will make one of them false, with no instrument that would notice.
- **2.3.7** is **unblocked**, and that is the one change here this story did not cause.
  Its sequencing hazard had three premises and re-checking them found all three false: Story
  2.2's eight tasks read **Complete**, `deploy.yml` **has** a `Migrate the deployed database`
  step, and 2.2.7's commit is an **ancestor of `origin/main`**, so the managed database holds
  `securities`. The user no longer needs to settle anything before it starts. What replaces
  the hazard is a sharper ordering fact: **`0003` is still unmerged**, so the first deploy
  after this story applies `0003` and then loads the universe, in that order — and "a seed
  that runs before its own migration cannot work" stops being hypothetical.
- **2.3.8** gained a new sweep item and lost two wrong figures. **`pnpm test` is 264
  (55 + 106 + 103) and `pnpm test:database` is 39**, not the 257 and 37 that file recorded —
  measured per package rather than re-read, which is that task's own closing rule arriving
  before the task did. The new item is **`universe.ts`**, whose self-describing comments
  2.3.6 is expected to falsify. And `0003`'s three "will stop being true when Story 2.2
  finishes" claims are **already false**, so they join the `0002` conflict rather than
  waiting behind it.

**Nothing needed adding.** The two candidates were considered and both were declined. A
task for a duplicate-symbol or cross-row validator is 2.3.5's existing scope, not a ninth
task — it is one more accumulator entry in a program that already has one. And a task to
put a standing check on the universe's distribution was rejected for the reason 2.3.4 kept
the count out of the code: a check that asserts the shape of today's list is the
`EXPECTED_COUNT` problem wearing a different hat, and §7's rule is a product judgement a
person re-reads when the list changes, not an invariant a runner can hold.

## Design surface

Sector naming is user-visible from Epic 4 onward, and the equity/ETF distinction will need
a visual treatment as early as Story 2.10's search results. Naming decided here is
expensive to rename later because it appears in URLs, charts and agent-facing text.

## What this story hands forward

The symbol list every later story iterates, and the sector vocabulary Epics 4, 5 and 6
group by.
