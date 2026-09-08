# Task 2.8.2 — The universe, re-curated: the size, the taxonomy, and the rename map

**Status:** Not started
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.1

## Objective

Settle open decision 5 with the user and apply it, **before** anything stores a bar. Two
questions and one hazard, and they are a single editing session on
`apps/backend/src/universe.ts`:

1. **The size**, unblocked since Task 2.7.1 measured that minute-bar subscriptions are exempt
   from the 30-channel cap.
2. **The industry taxonomy**, which was never blocked and needs no new data: 45 industries
   across 86 equities, **51% of them singletons**, so the field groups almost nothing.
3. **The rename map**, whose deadline is this story because after a backfill a rename orphans
   bars rather than costing a file edit.

**The deadline is real rather than rhetorical.** Nothing in the tree encodes the count today,
so a change costs one file edit — and only until bars are filed against `security_id`.

## What the user can see when this lands

**The first visible change in this story, and it lands early on purpose.** `/securities` is
Story 2.4's page and it renders the curated file: whatever this task decides is on screen the
moment it deploys.

If the size grows, the page grows and its band counts change. If the taxonomy is coarsened, the
`Industry` column — which Task 2.4.4 gave the space a repeated sector cell would have wasted —
stops being a column of near-unique labels and starts being one that groups. The summary line
(`N securities tracked · 11 sectors · M ETFs`) re-reads itself with no code change, because
Task 2.4.6 measured that it takes no count from anywhere but the data.

**That is worth showing to a stakeholder**, and it is the only thing in this story that can be
shown before Task 2.8.8.

## The size

`UNIVERSE.md` §10 parks 101 as provisional and writes both branches. **The trigger fired in
the bars-are-exempt direction**, so the blocker branch does not apply and this is a curation
question rather than a feed one.

What §10 already establishes and must not be re-argued:

- **Correlation quality is not a function of security count.** It is bounded by observations
  per pair, and going wider makes spurious edges _more_ numerous, not fewer.
- **Group depth is the real defect**, and §11's own worked example — "82% of semiconductor
  securities currently negative" — is **arithmetically unreachable** at our deepest industry of
  8 constituents. The smallest group that can produce 82% ± 0.5pp is 11.
- **§27 names 500 nodes as the _initial_ topology target**, so at 101 the live graph ships at a
  fifth of its specified size.
- **Money does not decide it.** Even 5,000 securities is ~$12.40/month of disk.
- **What decides it is curation**, and §10 says the metadata source (§5) must be settled
  _before_ a number is picked, not after.

So the order for this task is: **settle §5's metadata source, then pick the number.** The two
free options §10 names:

- **The eleven sector SPDRs publish their holdings**, so ETF membership _is_ the sector
  classification for every S&P 500 constituent — the option §5 named and set aside.
- **SEC EDGAR gives every filer a free SIC code**, from an API Epic 9 already commits to. A
  different taxonomy, mappable, no licence and no new vendor.

Both replace hand-curation with a fetch, which reopens §5's own argument that a curated file is
justified by being "~100 rows, reviewable in a diff" — an argument that does not survive 1,000
rows. **If the answer is to stay hand-curated, the size is capped by what a person will
review**, and that should be said in those words rather than implied by a number.

**One correction §10 owes and this task should apply**: its ~1,000–1,500 useful-universe
estimate was derived from **IEX's ~3.8% volume share**, and Task 2.7.1 measured that historical
bars come from **SIP** — 99.7% mean coverage against IEX's 82.8%. That quality ceiling does not
bind anything this story stores. It still binds Epic 3's live stream, which is IEX-only, so the
argument survives for live data and largely does not for historical.

## The taxonomy

Not parked, needs no new data, and the fix is mechanical: the current 45 labels are **finer
than GICS's own industry-group level (25 groups)** on a universe a fraction of the size GICS
classifies. Merging `Semiconductors` with `Semiconductor Equipment`, the three REIT labels, the
two oil-and-gas labels and so on takes 45 to roughly 20 and **doubles every group's depth with
no new data**.

Three options, and the middle one is the one to reject explicitly rather than drift into:

- **Coarsen** to a taxonomy where a group has members. The recommendation.
- **Keep it as a descriptive label** and accept that nothing groups by it — which is where it is
  today, and is fine only if no epic ever groups by it. Epics 4, 5 and 6 group by **sector**,
  which is sound at 11 members and 6–12 per group, so this is a decision about a second axis
  rather than about anything currently load-bearing. Say that out loud, because it is the
  argument for coarsening being cheap rather than urgent.
- **Drop it**, which costs a column on a page that already renders it and loses information a
  later epic may want.

**One factual correction to carry from Story 2.3's close**: the industrials block's claim that
three aerospace names are "the second-deepest industry group" is wrong — three is joint-fifth,
behind Semiconductors (8), Electric Utilities (5), Diversified Banks (4) and Pharmaceuticals
(4). Counted from the database rather than read.

## The rename map, and the recycled-ticker hazard

Both are Task 2.7.8's handover and both have this story as their deadline.

**A rename orphans the old bars.** The premise the alternatives rested on was falsified:
Alpaca's asset id does **not** survive a rename — six real renames, six different ids, `SQ` and
`ANTM` 404 outright and `FB` is today an active ProShares ETF. So a vendor identifier cannot
join a company across a symbol change, and the recommendation is a **rename map in the curated
file**, which is the only one of the three mechanisms that does not depend on an identifier
that turns out not to exist. **There is no rename in the list today**, so this ships as a
written decision with its trigger rather than as a mechanism against no instance — which is
`UNIVERSE.md`'s own standing rule.

**Tickers are recycled**, and this one is a live hazard rather than a future one: **229 tickers
in the current catalogue carry both an active and an inactive row.** The loader keys on
`symbol`, so a recycled ticker added to `universe.ts` flips a **different** company's row back
to `active` on its old id, and two companies' bars land on one row. **Zero of the 101 are
affected today**, and `pnpm universe:check` reports it — but only when a person runs it. So:
**run `pnpm universe:check` against the re-curated list before loading it**, and treat any
recycled-ticker line as blocking rather than informational, because a backfill assumes
`security_id` means one company forever and nothing enforces that.

## Provenance, which is where this task is easiest to get wrong

`UNIVERSE_PROVENANCE` has two dates for a reason, and Task 2.7.8 was the first time they
genuinely differed.

- **`classification.checkedOn` moves if and only if the sector/industry classification was
  actually re-checked against a source.** A coarsening pass _is_ that, so it moves.
- **`profile.checkedOn` moves only if symbols, names and exchanges were re-verified**, which
  `pnpm universe:check` does. If this task runs it, say so and move the date; if it does not,
  leave it, because moving it claims a hundred verifications that did not happen in the exact
  column §5 nominates as the mitigation for silent staleness.

And note the loader compares `*_retrieved_at` like any other column, so moving either date
reports `0 inserted, N updated` — every row rewritten. That is correct and it is not a finding.

## Work

- Settle both halves with the user, in one conversation, with §10 and §5 read first
- The edit to `apps/backend/src/universe.ts`, and the `UNIVERSE_PROVENANCE` dates that follow
  from what was actually re-checked
- `pnpm universe:check` run against the result, with any recycled-ticker or exchange finding
  resolved rather than noted
- `pnpm universe` locally, then deployed through the pipeline's own step, read back from the
  managed database
- `UNIVERSE.md` §10 amended: the trigger fired, the decision taken, the IEX-versus-SIP
  correction applied, and the "after Story 2.8 it costs a re-backfill" deadline marked as met
- The rename decision written into `UNIVERSE.md` with its trigger, and the recycled-ticker
  hazard restated as a **pre-backfill check** rather than a report
- `/securities` read in a browser against the deployed pair, and the band counts reconciled
  against `group by sector` on the deployed database — Task 2.4.6's method

## Done when

- The size and the taxonomy are settled with the user and applied, or **explicitly declined with
  the reason recorded in `UNIVERSE.md`** — which is acceptance criterion 8, and the declining
  branch is a legitimate outcome
- `pnpm universe:check` is clean, or its findings are resolved
- The deployed `/securities` page renders the re-curated universe and its counts reconcile
  against the database
- No bar has been stored yet, anywhere — that is Task 2.8.5's, and the whole point of this task
  is that it precedes it
- `pnpm verify` is exit 0 and `pnpm test:database` passes; three tests name `ABBV`, `AMGN` and
  `GILD` **by literal**, so removing any of those three from the universe takes the `database`
  job red — Task 2.4.6 found that the hard way, on the runner, in 46 s

## Notes

This is a product judgement rather than an engineering task, and the engineering half is one
file edit. What makes it a task rather than a paragraph is the ordering: it has to be finished
before Task 2.8.5 runs, because a security added afterwards has no history and a security
removed afterwards leaves rows filed against a row that says `untracked`.

The failure mode to avoid is doing half of it — coarsening the taxonomy without settling the
size, or growing the list without settling §5's metadata source — because both halves touch the
same file and a second editing pass after the backfill is exactly what the deadline exists to
prevent.
