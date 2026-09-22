# Task 3.7.1 — The shape of the column, measured against the real table before a line of SQL

**Status:** Not started
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.1 (shipped)

## Objective

Decide **what the store will say about a bar's tape and where it will say it**,
and decide it with figures taken against the real table rather than with an
argument. Write the decision down as an ADR before the migration exists,
because `0004_market_bars.sql` recorded a decision **against** a per-bar feed
column with a named reversal trigger, and this story is that trigger firing.

## What the user can see when this lands

**Nothing.** A decision and a document. The story that pays it off is
[3.8](../story-08-storing-the-live-session/STORY.md) — a cold load during a
session serving today's bars — and through it
[3.9](../story-09-the-live-edge-and-the-two-feed-ledger/STORY.md)'s two-feed
sentence on the source note, which is the first time a user reads anything this
story made possible.

What the user still cannot do: anything they could not do before.

## Why this is a task rather than the first line of the migration

**Three shapes are on the table and the story refuses to pick one by taste.**
`PROVIDER.md` §2.3 rejected per-bar provenance as _never wrong and not
affordable_, and `0007_bar_coverage_provenance.sql` chose the ledger grain
because the cheaper alternative was **measured false**. The same standard
applies here: the choice is a measurement.

The candidates, and what each has to answer:

1. **A per-bar `feed` column on `market_bars`**, `not null`, defaulting to
   `sip` — the tape everything stored today came from. On PostgreSQL 18 (the
   local and deployed version, `HOSTING.md`) a column added with a **constant
   default is a catalogue write, not a rewrite**: no row is touched and the
   default is materialised only on read. What is _not_ free is a `check`
   constraint over the vocabulary, which validates every existing row unless
   it is added `NOT VALID` — and a full scan of the real table is the figure
   this task has to take.
2. **A nullable per-bar column meaning _see the ledger_.** Free to add, free to
   backfill by never backfilling, and it makes **every reader carry the rule**:
   a `null` that means `sip` today is a `null` that means _whatever the ledger
   said_ for ever, and the story's open decision 1 is exactly this trade.
3. **A second ledger grain** — `bar_coverage` rows keyed on a window rather
   than on a `(security, timeframe)` pair, one row per contiguous stretch from
   one tape. No bar changes; the read path walks windows. It costs a
   uniqueness rule the ledger currently relies on and a write path that splits
   windows.

**Two constraints the story file does not mention, and both are load-bearing:**

- **`deploy.yml` wraps `pnpm migrate` in `timeout 120`.** A migration that
  scans 45–48 million rows on the deployed **Burstable B1ms** instance is a
  migration that may not finish, and Kysely's single transaction rolls the
  whole run back. Whatever shape is chosen must be **metadata-only at deploy
  time**, with any scan deferred to a step that has no deadline.
- **`market_bars` is 195 bytes a row across 48,027,772 rows** (`BARS.md` §8.3
  — 109 heap, the rest index) on a disk with ~22.5 GiB usable and ~2.6 years
  of headroom. A per-bar column costs its bytes only on rows written **after**
  it exists, and the rate is one year of minute bars a year; say what the
  column does to §8.4's headroom table.

## Work

- **Take the figures on the local store** — 45.3 million estimated rows,
  9.1 GB, PostgreSQL 18 — with `\timing` on: `add column ... not null
default 'sip'` (expect milliseconds; confirm), `add constraint ... check
(...) not valid` (expect milliseconds; confirm), `validate constraint`
  (expect a full scan; measure), and the same on `marketpulse_bare` for the
  empty-store shape CI applies it to. Record each verbatim.
- **Extrapolate honestly** from a laptop to a B1ms: state the ratio you assume
  and why, then say whether the scan fits inside 120 s and whether it matters,
  given `NOT VALID` enforces new rows either way.
- **Cost the read path for each candidate**: the two-tape query the story's
  criterion 2 needs — sources in contribution order with bar counts — is a
  `group by feed` over a window under candidate 1 and a window walk under 3.
  Write both queries and `explain analyze` them against a real window.
- **Settle open decision 1 with the user**: backfill, or a default that is a
  statement about the past. Candidate 1's fast default _is_ a backfill for
  free; say so if that is what decides it.
- **Write ADR 0034** — _The tape on the bar_ — recording the reversal of
  `0004`'s decision, its trigger firing, the three candidates with their
  figures, the one chosen, and a reversal trigger of its own as a condition.
  Index it in `docs/adr/README.md`.
- **Open `TAPE.md`** in this directory as the story's subject document: what
  the store claims about a bar's tape, in whose words, and what a green
  `pnpm test:database` does and does not certify about it. Every later task
  in this story writes into it.

## Done when

1. The three candidates carry figures taken against the real table, quoted
   verbatim, and the deploy's 120 s ceiling is answered for the chosen shape
2. Open decision 1 is settled with the user and recorded with its alternative
3. ADR 0034 is written and indexed; `TAPE.md` exists
4. `pnpm links` resolves every reference added
