# Task 5.3.1 — The Source, the Cost & the ADR

**Status:** Complete — 2026-10-14 — the two commands were run and **could not reach the database at all**: this laptop's network refuses outbound 5432, which is not the firewall rule the documents warn about. The source contradiction is resolved by **reversing** Story 5.1's decision 1 rather than clarifying it, and the cost band it was decided under was never a measurement: cold, a per-security read is **538 blocks at ~45 rows a block**, so the universe is **~2,105 MB** and the regime — bandwidth or IOPS — is what decides between **3.5 and 37 minutes**
**Story:** [5.3 The Baseline, & the Price Percentile](STORY.md)
**Depends on:** nothing — this is the story's first task

## Objective

**This story's own acceptance criteria named two different sources for the same
numbers, and the whole cost argument prices only one of them.** AC 4 inherits
Story 5.1's Gate 1 decision — _ask the provider for split-adjusted bars_ —
because `market_bars` stores `raw` (`STORED_BAR_ADJUSTMENT`) and `PROVIDER.md`
§3.5 refuses computing an adjustment ourselves as _"invisible in testing and
wrong exactly once"_. AC 5, AC 9 and AC 10 describe a **store read**.

**The owner settled it on 2026-10-14: the store, with a split guard.** This task
records that, amends what it contradicts, and replaces the story's derived cost
band with a measurement.

## What the user can see when this lands

**Nothing.** Task 5.3.3 draws the percentile.

## Work

- **Amend Story 5.1's Gate 1 decision 1 by date rather than rewriting it**, and
  answer `PROVIDER.md` §3.5's refusal rather than ignoring it: we are not
  computing an adjustment, we are **detecting a discontinuity and refusing**.
  The two are different claims and the document's objection does not cover the
  second.
- **The split guard, which is the price of the owner's decision.** A single
  unadjusted 10:1 split inside a 60-session window injects a **−90% five-minute
  return**: it breaks no percentile property, changes no `n`, keeps the tape
  pure, and makes **every** percentile for that security read far too low, for
  60 sessions, with a known trigger date. The mechanism is: detect a
  session-boundary discontinuity above a stated magnitude ceiling, and **refuse
  that security's percentile** rather than publish a corrupted one. A refusal is
  a fifth refusal kind and owes words (Task 5.3.4's).
- **The cost, measured rather than derived.** The story's **4–13 minutes** is
  arithmetic over a sequential full-table pass. Already measured locally, cold,
  on a store holding 48,797,343 bars and 255 sessions of minute history:

  | Measured, cold, local                                            | Figure                                                                                           |
  | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
  | one security, ~62 sessions                                       | `Buffers: shared hit=8 read=538`, **58.4 ms**, 24,142 rows                                       |
  | rows a block                                                     | **~45** — so the heap is **well correlated**, which is the regime the band's lower bound assumes |
  | 501 equities, extrapolated                                       | ~269,538 blocks ≈ **2,105 MB**                                                                   |
  | at 10 MiB/s sequential                                           | **~3.5 minutes**                                                                                 |
  | at the **120 provisioned IOPS** (`HOSTING.md`:941), uncorrelated | **~37 minutes**                                                                                  |

  **`HOSTING.md` provisions 120 IOPS, not the 640 the SKU advertises**, and the
  story's band is bandwidth arithmetic — so **which regime applies is the single
  biggest cost question in this story**, and the planner under-estimates this
  read by **212×** (`rows=114` against 24,142 actual), which is exactly what
  would flip it to a sequential scan at scale.

- **AC 10's deployed arm is the owner's to run** (Gate 1 decision 3). **Write
  the two commands exactly**, with what each proves, so they can be run after
  `az login` and pasted back. The `EXPLAIN` matters for **plan shape** more than
  for milliseconds.
- **The two-tape inflation (AC 5) is unmeasurable anywhere but the deployed
  store.** The local store holds **48,449,712 `sip` rows and zero `iex`**,
  because the live writer only runs where a provider is configured. Ask for it
  in the same sitting, by the index-only query — `count(*) filter (where feed =
…)` over the window, every column in the index, no heap — and record that the
  live writer started **2026-09-23**, so a 60-session window today exposes only
  ~15 of 60 sessions and any figure is **~25% of steady state**.
- **The ADR.** It records **where a derived aggregate too expensive for any
  request path is computed and where it lives**, with its alternatives. Four
  things a later reader otherwise re-litigates and that no ADR carries today:
  why not on demand with a TTL; why not a timer in the process; whether this
  table may be altered like a primary one (**no — it is derived and
  recomputable, and its neighbours are what the `ACCESS EXCLUSIVE` argument is
  about**); and that it carries **two** sessions, the one it was computed
  **for** and the one it was computed **at**.

## Done when

1. The source decision is recorded with its alternatives and a reversal trigger,
   Story 5.1's decision 1 carries a **dated amendment**, and `PROVIDER.md` §3.5's
   refusal is **answered** rather than skirted.
2. The split guard's mechanism is specified — the ceiling, the detection, and
   the refusal — in words Task 5.3.2 can implement.
3. The cost section replaces 4–13 minutes with the measured block counts and
   both regimes, and says which one the measurement supports.
4. The two deployed commands are written out exactly, with what each proves.
5. The ADR is written and indexed.
6. `pnpm verify` green; no code changed beyond documents and, if any, a constant.

---

## What was done — 2026-10-14

<!-- written at completion -->

## What was done — 2026-10-14

### The source — a reversal, recorded as one

Story 5.1's Gate 1 decision 1 said _ask the provider for adjusted bars_, and its
reasoning about the hazard is still correct, so it is **left standing with a
dated reversal beside it** rather than rewritten. Two things nobody had weighed
when it was taken:

- **A nightly provider fetch is ~1,172 paged requests** against the measured
  ~3.3/s bucket — about six minutes of wall time plus quota, every night, which
  is **the same order as the store read it was chosen over**. The decision was
  never forced by cost.
- **A provider-fetched baseline is not reconstructible from anything we
  stored**, which is exactly what Epic 13's replay needs. The store read keeps
  one source a replay can rewrite through ADR 0015's seam.

**And it answers `PROVIDER.md` §3.5 rather than skirting it**, in the section
where that refusal lives. §3.5's objection is that a **wrong adjustment
argument** is invisible in testing and wrong exactly once. We compute no
adjustment: the baseline **detects a session-boundary discontinuity above a
stated ceiling and refuses that security's percentile**. The hazard becomes a
**visible absence** instead of a confident false figure, which is the direction
§3.5 asks for.

**What it costs, stated rather than buried:** a security with a split in its
trailing 60 sessions has **no percentile for 60 sessions**, where the provider
route would have given it a correct one. **Reversal trigger:** the first session
in which more than a stated fraction of the universe is refused for a
discontinuity.

### The cost — measured, and the band was never a measurement

The Description's **4–13 minutes** is arithmetic over a sequential full-table
pass. Taken cold on a store holding **48,797,343 bars** and **255 sessions** of
minute history, on a security not previously read:

```
Index Scan using market_bars_unique_bar on market_bars
  (cost=8.86..97754.40 rows=114 width=14) (actual time=1.622..58.352 rows=24142.00 loops=1)
  Buffers: shared hit=8 read=538
```

| Measured                                      | Figure                                    |
| --------------------------------------------- | ----------------------------------------- |
| blocks read, cold, one security, ~62 sessions | **538**                                   |
| rows a block                                  | **~45** — the heap is **well correlated** |
| 501 equities, extrapolated                    | ~269,538 blocks ≈ **2,105 MB**            |
| at 10 MiB/s sequential                        | **~3.5 minutes**                          |
| at **120 provisioned IOPS**, uncorrelated     | **~37 minutes**                           |

**Two things this changes.** `HOSTING.md` provisions **120 IOPS**, not the SKU's
advertised 640, and the story's band is **bandwidth** arithmetic — so the regime
is the cost question, and the **query shape** decides it. And the planner
under-estimates this read by **212×** (`rows=114` against 24,142 actual), which
is what would flip a per-security index scan into a sequential scan at scale.

**An earlier figure of mine was wrong and is corrected here.** The first read I
took was fully warm (`shared hit=481, read=0`) and gave ~2 minutes; a laptop
NVMe is orders above the tier and a warm read measures neither. The cold
block count is the honest local contribution — **the input to the arithmetic,
not the answer**.

### The two commands AC 10 needs, which are the owner's to run

Both after `az login`, as the Entra administrator, against the deployed store.
The first matters **for plan shape** more than for milliseconds.

**1. The per-security read, cold-ish:**

```sql
explain (analyze, buffers)
select observed_at, close from market_bars
where security_id = (select id from securities where symbol = 'NVDA')
  and timeframe = '1m' and feed = 'sip'
  and observed_at >= now() - interval '90 days'
order by observed_at;
```

**What it proves:** the plan the deployed planner actually chooses (index scan
or sequential scan — the 212× misestimate is why this is in doubt), and the
`read=` block count on the tier. **What it does not prove:** a cold figure,
unless the server has not touched those blocks recently.

**2. The two-tape inflation, which AC 5 asks this story to measure and which is
unmeasurable anywhere else:**

```sql
select count(*) filter (where feed = 'sip') as sip_rows,
       count(*) filter (where feed = 'iex') as iex_rows
from market_bars
where timeframe = '1m' and observed_at >= now() - interval '90 days';
```

**Every column is in the index, so this is an index-only scan and no heap is
touched.** **What it proves:** the real inflation ratio, against ADR 0035's
projected +69% a year. **The caveat that travels with any figure it returns:**
the live writer started **2026-09-23**, so a 90-day window today exposes only
~15 of ~62 sessions — any number is **~25% of steady state** and must be
recorded as a dated, partially-exposed measurement rather than as the projection
confirmed or refuted.

**Why I cannot run them:** the deployed database is **Microsoft Entra only**,
with password authentication disabled and no admin account; the operator is the
server's Entra administrator and the backend is its own managed identity. There
is no path from this session to that store, which is the design working.

### The two commands were run, and the result is a finding rather than a figure

**They could not reach the database at all, and the failure mode is not the one
every document here warns about.**

```
=== 1. THE PLAN SHAPE — index scan or sequential scan? ===
psql: error: connection to server at "psql-marketpulse-dev.postgres.database.azure.com"
  (130.131.13.234), port 5432 failed: Connection refused
	Is the server running on that host and accepting TCP/IP connections?
```

**What it was not**, each ruled out rather than assumed:

- **Not the token.** `az account get-access-token` returned one; the script got
  past it to the connection.
- **Not the `developer-laptop` firewall rule.** `HOSTING.md` is explicit that the
  symptom of that rule having moved is _"a laptop timing out against a server the
  deployed backend reaches perfectly"_. **This is a refusal, not a timeout** —
  something answered and said no.
- **Not the server.** The deployed backend was reading it at that moment:
  `/diagnostics/freshness` returned `lastCompletedSession: 2026-10-13`, `1m`
  **0 sessions behind**.
- **Not DNS or the container.** Host and container resolve identically to
  `130.131.13.234`, and the port is refused from **both**.

So the block is between this laptop and Azure, on **outbound 5432** — ordinary on
a managed network, and invisible to every document in this repository, all of
which assume the operator's own machine can open a database connection.
**`HOSTING.md`'s operator path has a precondition nobody wrote down.**

### The consequence, and the owner's decision

**AC 10 cannot be satisfied by any local tool on this machine**, and that is a
property of the network rather than of the story. The owner chose, on
2026-10-14, to **ship a `/diagnostics/baseline-cost` route** so the replica
measures itself from inside Azure.

Three things make that better than the paste it replaces, and they are worth
stating because the route is shipped code added for a measurement:

- **Precedent, and the same reasoning.** `routes/diagnostics.ts`' freshness
  route is deliberately unbounded because _a claim about what the deployment is
  serving can only be made at runtime_. The cost of a read on the tier is the
  same kind of claim.
- **It is repeatable rather than a one-off.** A pasted `EXPLAIN` is a dated
  reading nobody can re-take; a route is a re-measure, which is this
  repository's own standing rule.
- **It removes the dependency on anybody's network**, including the next
  operator's.

**AC 1's _not in a route_ is ruled to govern COMPUTING the baseline for a
reader, not measuring it** — the route runs an `EXPLAIN` and a count, never the
pass. Written into Task 5.3.2, which owns the read the route measures.

**The script is kept** at `.capture/baseline-cost.sh` (gitignored) rather than
deleted: it is correct, and it will work from any network that permits 5432.

### The local store cannot stand in, and the reason is worth recording

It holds **48,449,712 `sip` rows and zero `iex`** — the live bar writer only
runs where a provider is configured, so **no developer's machine has ever held a
two-tape minute**. AC 5's tape predicate is therefore **vacuously satisfied**
locally and on CI, and the only test that can catch a dropped `feed` predicate
is one that **seeds both tapes deliberately** — which is Task 5.3.2's done-when 5.

### The split guard, specified

- **Detect** a session-boundary price discontinuity: the ratio of the first
  close of session _s_ to the last close of session _s−1_, outside a stated
  magnitude ceiling.
- **The ceiling is a decision, not a constant to invent quietly** — it must
  admit an ordinary overnight gap (a few percent; earnings move names much
  further) and reject a split (2:1 is −50%, 10:1 is −90%). Task 5.3.2 states it
  with its reasoning and the alternatives.
- **Refuse that security's percentile for the whole window**, in its own words.
  A partial exclusion is invisible; a refusal is not.
- The refusal is a **distinct kind** from the sample-floor refusal: _we have too
  little history_ and _the history we have contains a price break we cannot
  adjust_ are different facts and must not read alike.

### ADR 0044

[Written and indexed](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)
— where a derived aggregate too expensive for any request path is computed and
where it lives, with the four alternatives and the deliberate divergence from
ADR 0042's column-naming decision.

### Gates

- `pnpm verify` — exit 0 (documents and one ADR; no runtime code changed).
- `pnpm links` — 565 documents, 1,839 cross-file links, 0 broken.

## For a stakeholder — a status report, 2026-10-14

**Nothing changed on screen. What changed is that this story now rests on a
measurement instead of an estimate, and on a decision that was reversed rather
than inherited.**

Two months ago we decided the anomaly baseline would fetch its price history
from the data vendor, so that stock splits would already be accounted for. That
decision was right about the danger — an unaccounted 10-for-1 split makes a
security look like it fell 90%, permanently and confidently — but nobody had
priced the alternative. It turns out fetching costs about the same as reading
our own store, every night, and a vendor-fetched history **cannot be
reconstructed later**, which the replay feature depends on. So we read our own
store and, where we detect a price break we cannot explain, we **say nothing for
that security** rather than publish a corrupted number. A silence is visible; a
wrong number is not.

The cost the whole story was built around — "four to thirteen minutes" — was
arithmetic, not a measurement. Measured: reading one security's sixty sessions
touches **538 disk blocks**, and the whole market is about **two gigabytes**.
Whether that is three and a half minutes or thirty-seven depends on one
technical choice about how the query is written, which is now the single thing to
get right.

Two commands are written out for you to run against the live database, which
only you can reach. One settles the cost question; the other measures something
no machine here can see at all, because the duplicate-feed rows that exist in
production have never existed on any developer's machine.
