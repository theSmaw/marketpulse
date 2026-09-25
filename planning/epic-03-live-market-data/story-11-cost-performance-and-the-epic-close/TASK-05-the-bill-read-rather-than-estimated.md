# Task 3.11.5 — The bill, read rather than estimated

**Status:** **Complete — 2026-09-25. The bill reads, and the premise ADR 0011 argued about is falsified.** Run rate **$13.32/month** against a $9.26 estimate — **44% over, and above the recorded $12 reversal trigger**. The **socket does not appear in the bill at all**: forty disconnected hours cost the same as connected ones. What moved it is **a database write a minute**, on the day Task 3.8.3 shipped. Storage measured at **~10.0 GB/year** against `BARS.md`'s predicted 8.84 GiB. Budget alerts moved to **60/80/100**, so the first is the trigger exactly.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1

## Objective

Criterion 3. **This story owns the only real cost measurement anybody will ever
take** — Epic 1 could read no bill at all, because both billing APIs refused the
subscription and then answered `[]` and `429`.

## What the user can see when this lands

**Nothing.** What the owner sees is whether this product costs what it was said
to cost.

## What is being measured against, and it is not the number ADR 0011 published

ADR 0011 put a live-feed replica at the **active** vCPU rate through every
session — **$19.04/month**. That halved on 2026-09-17:

> Measured against a real 7.77-hour capture, a **bars-only** subscription to all
> 518 symbols averages **550.6 B/s** against the Consumption plan's 1,000 B/s
> idle condition, and crosses it for **397 seconds a day**. The blended total is
> **$9.26** — five cents above a replica doing nothing.

**The error was a premise rather than a calculation**: minute bars arrive as a
**burst once a minute** — 243 ms of traffic, 59 seconds of silence — and a
per-second threshold barely notices that. ADR 0011 carries a dated amendment and
its tables are untouched.

**It is n=1** — one Wednesday in September — and it is arithmetic over a rate
card rather than a bill.

## The three halves, and the second is the one nobody has done

**1. The replica.** Read the actual bill. The reading is the point; the estimate
above is what it is checked against.

**2. Storage, which is arithmetic nobody has done.** A live session adds rows
every day. Since Story 3.8 it adds **both tapes** — `+69% rows a year`, and the
runway from `~2.6 years to ~1.5` on 22.5 GiB usable, which is **a ceiling rather
than a measurement** and was handed here by Story 3.8's close by name. And the
offset is already known: `market_bars_pkey` is **1,045 MB with zero scans**.

**3. The fan-out, which the envelope explicitly does not cost.** §9.5 measured
**38 kB/min per browser** at the whole universe. Whether Azure's 1,000 B/s
condition counts **egress**, and what concurrent browsers add, is **this
story's to measure and nobody else's.**

## The budget, and the trigger that is already primed

`marketpulse-monthly` is **$20**, alerts at 50/80/100%. At $9.26 the **50% alert
at $10 sits eight percent above the measured total** — so the single change most
likely to move this bill is one the thresholds can barely see. §9.6's reversal
trigger is **the first month whose actual bill exceeds $12**, which is above
§9.2's realistic worst case, so reaching it means an assumption is wrong.

**Task 3.11.1's decision 1 settles what the budget becomes.** This task
implements it and records the reading it was decided against.

## Work

- A real billing reading, or the recorded refusal with what was tried — this is
  a third party and _it refused_ is a finding rather than a failure
- The storage arithmetic, from the real store rather than from the ceiling
- The fan-out question answered: does the idle condition count egress
- The budget re-decided per decision 1, and changed in the portal if it changes
- `HOSTING.md` amended; ADR 0011 given a **dated amendment**, never a rewrite
- `docs/GAPS.md`: whatever of this cannot be checked mechanically, with a
  `Re-measure:` line

## Done when

1. A bill has been read, or the refusal is recorded with what was tried
2. Storage has a figure from the store rather than a ceiling
3. The budget is decided against a reading rather than an estimate

## Amended by Task 3.11.1 — 2026-09-25: decision 1 is settled, with a fallback

**The budget is not re-decided here on an argument. It is re-decided on the
reading this task takes** — and if there is no reading, there is a written
fallback rather than a shrug.

- **Until this task has a number**: `marketpulse-monthly` stays **$20** at
  **50/80/100%**, and §9.6's reversal trigger — **the first month whose actual
  bill exceeds $12** — stands.
- **If a bill can be read**: re-decide against it, and say what the reading was
  rather than only what the budget became.
- **If no bill can be read** — and Epic 1 failed at this twice, with both APIs
  refusing and then answering `[]` and `429` — **the fallback is 60/80/100%.**
  That puts the first alert at **$12**, which is the recorded reversal trigger
  exactly, and is the one change that improves the alerting without needing a
  number.

> **Rejected, and recorded so it is not re-proposed**: lowering to $15 now. The
> 50% alert would land at **$7.50**, below the $9.26 estimate, so it would fire
> every month — and an alert that always fires is an alert nobody reads.

**A refusal is a finding, not a failure.** If the billing API refuses again,
record _what was tried, with which credential, and what it answered_, because
that is the third dated observation of the same third party and the pattern is
the result.

## Amended by Task 3.11.3 — 2026-09-25: a fourth, small line item

**Log ingestion is billed, and this epic just added lines to it.** Task 3.11.3
wired eleven previously-silent events to the correlation-id logger.

**The steady-state volume is trivial and should be stated rather than assumed**:
`authenticated`, `subscribed` and `closed` fire **once per connection**, and a
connection lasts a day. What is **not** trivial is an incident —
`connection-limit` is one line every **3 seconds** for as long as a refusal
lasts, which over the 2026-09-19 outage would have been roughly **48,000
lines**.

**That is the correct behaviour and it is also a cost**, so it belongs in the
envelope as a conditional rather than a constant: the bill has a term that only
appears when something is wrong. Read whether the platform's log retention and
ingestion are inside the plan's included allowance or a line of their own.

---

## What was done — 2026-09-25

### Criterion 1 — a bill has been read, and the refusal is still half-true

**`az consumption usage list` answers and nulls every money field.** 181 records
for September, each with `pretaxCost: 'None'` and `usageStart: null` — it lists
resources, not costs. `az costmanagement` **does not exist** as a CLI command in
this version. What works is the REST call underneath it, and **it rate-limits**:
a second query seconds later returned `429 Too many requests`.

> **That is the third dated observation of this API refusing, and the pattern is
> now the result**: it answers, then it does not. **Take every reading in one
> pass.** Epic 1 met a flat refusal twice; this is a softer one and it is still
> a refusal.

### The reading, 1–24 September 2026

| Service                       | Month to date |         Run rate |
| ----------------------------- | ------------: | ---------------: |
| **Azure Container Apps**      |         $3.01 |  **$8.25/month** |
| **Container Registry**        |         $3.61 |  **$5.07/month** |
| Azure Database for PostgreSQL |     **$0.00** |            $0.00 |
| Azure Monitor, Log Analytics  |     **$0.00** |            $0.00 |
| **TOTAL**                     |     **$6.62** | **$13.32/month** |

**September's own total will be ~$9.25 — within a cent of the $9.26 estimate,
and for the wrong reason.** Container Apps billed **$0.0000 a day until
2026-09-11**, because the backend was not running. **Eleven free days is what
makes the month match.** A close that quoted the monthly total would have
recorded a prediction confirmed to the cent and been wrong by 44%.

### The finding — the socket is not in the bill, and the writer might be

**§9.2's whole premise is that a held socket pushes the replica off the
Consumption plan's idle vCPU rate.** ADR 0011 priced that at $19.04, its
2026-09-17 amendment at $9.26 with the threshold crossed for 397 seconds a day.

**Across the 2026-09-19 → 09-21 outage — about forty hours DISCONNECTED —
Container Apps billed `$0.2149` and `$0.2291` a day**, indistinguishable from
the connected days either side. **The bill cannot see the socket.**

**What it can see stepped on one day:**

```text
09-11 .. 09-22   $0.2056/day   (12 days)
09-23            $0.2832
09-24            $0.2589       +32%
```

**2026-09-23 is the day Task 3.8.3's live bar writer began writing every
complete minute bar to `market_bars`.** So the cost of a live session looks like
**a database write a minute** rather than a held socket — the figure nobody
costed, rather than the one two versions of an ADR argued about.

> **n=2, and it is a step rather than a drift**, which is the only reason it is
> worth stating. Recorded in `docs/GAPS.md` with a re-measure and an owner:
> **Story 3.11's close**, which is the next thing that runs.

### Criterion 2 — storage from the disk rather than the ceiling

`storage_used`, Azure Monitor, daily, 2026-09-04 → 09-24:

- **13.62 GB used, 41%** of the provisioned volume
- the series is dominated by **the backfill** — +3.3 GB on 09-08, +6.2 GB on
  09-09 — which is Story 2.8 loading 48 million bars
- **steady state 09-10 → 09-22: +27.3 MB/day = ~10.0 GB/year**

**`BARS.md` §8.4 predicted 8.84 GiB/year — 9.49 GB. The disk says ~10.0.** That
arithmetic is confirmed against a real volume for the first time.

**The two-tape claim has no signal yet.** Story 3.8's writer adds **+69%** of
rows and started on 09-23 — and 09-23 and 09-24 both show storage **falling**
(−438 MB, −148 MB). **At this timescale autovacuum dominates**, so the +69%
stays a ceiling. Runway is **~2.1 years** against `LIVE-SESSION.md`'s
`~2.6 → ~1.5`, whose lower bound assumed growth that has not appeared.

### The egress question, answered by an absence

§9.5 asked whether the idle condition counts egress and what concurrent browsers
add. **There is no bandwidth line in the bill at all** — five services are
billed and none of them is network. At this volume egress is not a billed item,
so the 38 kB/min per browser does not appear.

**It is an answer rather than an estimate, and it is bounded**: it says nothing
about a volume this subscription has never seen.

### Criterion 3 — the budget, decided against the reading

Decision 1 said _decide it after the reading_. The reading is in, so it was put
to the owner with the figures: **$20 stays, and the alerts move from 50/80/100
to 60/80/100.** Applied through the REST API and re-read back:

```text
actual_60  > 60%  = $12.00
actual_80  > 80%  = $16.00
actual_100 > 100% = $20.00
```

**The first alert is now §9.6's reversal trigger exactly** — *the first month
whose actual bill exceeds $12* — rather than a second number competing with it.
At a $13.32 run rate it fires next month, **which is correct**: a trigger exists
to fire when an assumption is wrong, and this one is wrong by 44%.

> **Rejected — raising to $25**, which accepts the new run rate as a baseline
> and retires the $12 trigger **without it ever having fired** — answering the
> question the trigger exists to ask. **Rejected — keeping 50/80/100**, whose
> $10 alert fires every month from now on.

### The largest line, recorded rather than pursued

**Container Registry is a flat $5.07/month — 38% of the bill, more than the
compute** — and ACR Basic charges it regardless of what is stored, so pruning
saves nothing. The named alternative is **GitHub Container Registry**: free for
public images, already OIDC-authenticated in CI, and moving would take the run
rate **under the $12 trigger on its own**.

**Deliberately not pursued** — the owner's decision. It touches `deploy.yml`,
the federated credential and the rollback path, none of which is an epic
close's subject. `docs/GAPS.md`, owner a condition: **the first month the bill
actually exceeds $12**, which the budget's new first alert now reports.

### Gates

Documents and one portal change, re-read back. `pnpm links` green.

## For a stakeholder — a status report, 2026-09-25

### What this was

**For four months every cost figure in this project has been arithmetic.** We
priced the hosting from a rate card because the billing system refused to tell
us anything — twice, in an earlier phase. This task asked again.

**It answered.**

### What it costs

**$13.32 a month at the current rate**, against an estimate of **$9.26**. That
is **44% over**, and past the point we wrote down in advance as _the number that
means one of our assumptions is wrong_.

The composition is the surprise:

- **The image registry — $5.07 a month — is the single largest item**, more than
  the servers. It is a flat fee that does not depend on how little we store.
- **The database costs nothing.**
- **Network traffic does not appear at all.**

### The finding worth the whole task

We have argued twice, in writing, about whether **holding a live connection to
the market** pushes us onto a more expensive billing rate. One version said it
would cost $19 a month; a revision said $9.

**The bill cannot see the connection.**

We know this precisely, because of the outage six days ago: for about **forty
hours the connection was dead**, and those days cost the same as the days either
side — to a fraction of a cent.

**What did move the bill was something nobody costed.** On the day we started
_writing prices to the database every minute_, the daily cost stepped up **32%**
and stayed there.

So the expense of running a live market feed is not listening. It is **writing
down what you hear**. That is two days of evidence, which is not enough to call
it proven, so it is written down as a claim to re-check rather than a
conclusion.

### The storage prediction was right

We estimated our database would grow by **8.84 GB a year**. Measured against the
actual disk over twelve steady days: **about 10 GB a year.** Close enough to
call the arithmetic sound — the first time any of it has been checked against
reality rather than a spreadsheet.

### What we changed, and what we deliberately did not

**The budget alert now fires at $12** — exactly the figure we wrote down months
ago as the one that would mean something was wrong. It will fire next month, and
that is the alarm working rather than failing.

**We did not move off the expensive registry**, even though doing so would take
the bill back under the trigger by itself. It would mean changing how we deploy,
how we authenticate and how we roll back — three things worth doing carefully
rather than in the last week of a phase. It is written down with the figure
attached.

### Where the product stands

**The last story of the live-market phase, five of ten tasks done.** What remains
is one sitting with the market open, the documents, and the close.
