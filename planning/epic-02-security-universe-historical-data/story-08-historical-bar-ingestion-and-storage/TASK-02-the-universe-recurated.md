# Task 2.8.2 — The universe, re-curated: the size, the taxonomy, and the rename map

**Status:** Complete (2026-09-08)
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
shown before Task 2.8.9.

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
- No bar has been stored yet, anywhere — that is Task 2.8.6's, and the whole point of this task
  is that it precedes it
- `pnpm verify` is exit 0 and `pnpm test:database` passes; three tests name `ABBV`, `AMGN` and
  `GILD` **by literal**, so removing any of those three from the universe takes the `database`
  job red — Task 2.4.6 found that the hard way, on the runner, in 46 s

## Notes

This is a product judgement rather than an engineering task, and the engineering half is one
file edit. What makes it a task rather than a paragraph is the ordering: it has to be finished
before Task 2.8.6 runs, because a security added afterwards has no history and a security
removed afterwards leaves rows filed against a row that says `untracked`.

The failure mode to avoid is doing half of it — coarsening the taxonomy without settling the
size, or growing the list without settling §5's metadata source — because both halves touch the
same file and a second editing pass after the backfill is exactly what the deadline exists to
prevent.

---

## What was actually decided, in one table

| Question         | Before                        | After                                               |
| ---------------- | ----------------------------- | --------------------------------------------------- |
| Size             | 101 (86 equities + 15 ETFs)   | **518** (503 equities + 15 ETFs)                    |
| Membership rule  | hand-allocated, 6–12 / sector | **the S&P 500, as published**                       |
| Sector source    | hand-curated                  | **the index's own GICS classification**             |
| `industry`       | 45 GICS sub-industries        | **25 GICS industry groups**                         |
| Singleton groups | 23 of 45 (51%)                | **0**                                               |
| Mean group depth | 1.91                          | **20.12**                                           |
| Rename map       | undecided                     | **still none — no instance; §16.7 states the cost** |
| Recycled tickers | a report line                 | **a blocking pre-backfill check** (clean: 0 flags)  |

Full record: [`UNIVERSE.md` §16](../story-03-security-domain-model-and-tracked-universe/UNIVERSE.md).
Sizing consequences: [`BARS.md` §4](BARS.md).

---

## The honest gap: the deployed load has not run

**Tasks 2.2.7 and 2.3.7's word for word, and for the same reason.** `pnpm universe` is a
step in `deploy.yml`, and `deploy.yml` only runs on `main` — so the 518-security load has
run against the **local** database and not the managed one, and `/securities` has been read
in a browser against the **local** pair and not the deployed one. The first merge after this
one is its first execution, and it will report `417 inserted, 101 updated, 0 unchanged`
against the deployed table exactly as it did locally.

What _is_ established rather than assumed:

- **All three required checks pass on the runner** — `verify` (2m1s), `e2e` (1m56s,
  including the axe gate at three viewports against 518 real rows) and `database` (51s).
- **`pnpm universe:check` is clean against the vendor's live catalogue**, 0 flags across
  all 518, which is the check this task promotes to blocking — and it is the check that
  actually protects the deployed table, because it reads the file rather than a database.
- **The local load is byte-identical in shape to what the deploy will produce**: 518 rows,
  all `active`, 0 untracked, 11 sectors, 25 industry groups, and both provenance columns
  carrying the new sources and dates. Fingerprint `a7a03020d1a90e5863136eaa30df0d3c`.
- **The page was read in a browser** at 518 rows: all twelve sector bands present, their
  counts summing to 518, the summary line reading `518 securities tracked · 11 sectors ·
15 ETFs`, and the fifteen ETF rows correctly rendering an em dash for industry.

## Status report — for a non-technical reader

### What this task was

MarketPulse watches a fixed list of companies. Everything the product does later —
spotting unusual movements, comparing a company against its peers, drawing the
relationship map, replaying a past trading day — is computed over that list. Until
today the list was **101 entries, chosen by hand**, and it was always meant to be
provisional.

This was the last moment it could be changed cheaply. The next task starts
downloading and storing years of minute-by-minute price history against each entry.
Once that has happened, changing the list means re-downloading everything. So the
list had to be finished first — which is the entire reason this task exists as a
task rather than as a paragraph in a bigger one.

### What changed

**The list is now the S&P 500 — 503 companies — plus 15 funds we measure everything
against. 518 in total, up from 101.**

We did not pick 503 companies by hand. We adopted a **published list**: the S&P 500
is the index most people mean when they say "the market", it is maintained by
somebody else, and anyone can check whether we got it right. That last point matters
more than it sounds. The old list was a set of judgement calls that only this
project could adjudicate; the new one is a fact you can look up.

**Every company is now filed under a sector and an industry group that came from a
published classification rather than from memory.** We also made those industry
groups deliberately **coarser** — 25 categories instead of 45.

### Why coarser is better, and it is the most important decision here

Grouping only helps if the groups have members in them. On the old list, **23 of the
45 industry categories contained exactly one company**. "How is this company doing
relative to its industry?" had no answer for a quarter of the list, because the
industry was that company on its own.

The product specification contains a worked example of what MarketPulse is supposed
to be able to say:

> "82% of semiconductor securities are currently negative."

That sentence was **arithmetically impossible** on the old list. With 8 semiconductor
companies, the only percentages you can produce are 0, 12.5, 25, 37.5, 50 and so on —
82% is not among them. You need at least 11 companies in a group before that number
can exist at all.

We now have **20 semiconductor companies**, and 20 of the 25 groups clear that bar. The
average group has 20 members, and **not a single group has only one**. A flagship
sentence in the specification went from unachievable to routine.

### The decision that unlocked the size

There was a genuine obstacle recorded months ago: at ~100 companies you can classify
them by hand, but at 500 nobody will, and buying a classification from a data vendor
means a licence, a new password to look after, and a new way for the nightly load to
fail.

We had also previously rejected the obvious free alternative — the eleven sector funds
publish exactly which companies they hold — for one specific reason: **those funds only
hold S&P 500 companies**, so any company we tracked outside the index would end up with
no sector at all.

**Choosing the S&P 500 as the universe makes that objection disappear rather than
working around it.** If the list _is_ the index, then coverage is complete by
definition. The size question and the classification question turned out to be the same
question, and one answer settles both. No new vendor, no new licence, no new password,
and the load process is unchanged.

### What we deliberately did **not** do

- **We did not add company registration numbers**, even though we had a verified source
  for all 503 in front of us. Nothing reads that field yet, and filling in data that
  has no reader is exactly the kind of quiet over-building this project has had to undo
  before.
- **We did not build a "renamed company" mechanism.** Companies occasionally change
  their ticker — Facebook became Meta. We investigated whether our data provider could
  tell us when that happens, and it measurably cannot. Rather than build machinery
  against a problem that has zero current instances, we wrote down precisely what it
  will cost when it happens and what the fix is.
- **We did not keep the generator that produced the file.** It ran once. Keeping it
  would create a question nobody could answer — _is the checked-in list still what the
  generator would produce?_ — so the file itself stays the single source of truth, and
  the procedure is written down so it is repeatable.

### One hazard we checked before loading anything

Stock tickers get **recycled**. `FB` today is not Facebook — it is an entirely unrelated
exchange-traded fund. If we had added a recycled ticker to the list, the loader would
have quietly attached the new company to the old company's record, and two different
businesses' price histories would have ended up filed under one entry. That is silent,
permanent corruption of exactly the data the next task is about to spend hours
downloading.

We ran the vendor check against all 518 before loading and it came back **completely
clean**. That check has been promoted from "a line in a report someone might read" to
"run this before you load, and treat any finding as a stop".

### What a stakeholder can see today

**The Security Explorer page now lists 518 real companies instead of 101**, grouped by
sector, each sector naming the fund it is benchmarked against, and each company showing
an industry group that now genuinely groups. The summary line above the table re-reads
itself with no code change — it counts what is there.

This is the only visible change in a run of nine tasks. Everything after it is
plumbing: creating the table that holds prices, downloading the history, checking it
for gaps. The next thing a stakeholder will see is a **price chart**, and it will be
drawn from real market history rather than from anything invented.

### One consequence worth flagging rather than fixing here

The Security Explorer page is now a **20,000-pixel scroll** with no search box. At 101
rows that page was browsable; at 518 it is a reference list you scroll rather than a
thing you use. That is a real step down in usability and it is **deliberately not fixed
in this task**: Story 2.11 owns search and selection and has an open decision about
whether matching happens in the browser or on the server, and putting a search box here
would settle that decision by accident rather than by argument. The counts, the sector
bands and the benchmark labels all still read correctly, and every row is reachable by
keyboard — which the accessibility gate re-checked at three window sizes.

### What this unlocks, and what it costs

Storing a year of minute-by-minute history for 518 companies is about **50 million rows
and 6 GB**, against 10 million and 1.2 GB before. The database has room for roughly
**four years** at that rate rather than twenty. That is a deliberate trade and it is
recorded: four years of headroom is far more than V1 needs, and the alternative was a
product whose relationship map ships at a fifth of the size its own performance targets
were written against.

The download itself barely changes — about **26 minutes** rather than 20 — because we
fetch many companies per request, so the cost scales with the amount of data rather than
with the number of companies. That was a design decision taken two tasks ago, and this is
the first time it has paid for itself.
