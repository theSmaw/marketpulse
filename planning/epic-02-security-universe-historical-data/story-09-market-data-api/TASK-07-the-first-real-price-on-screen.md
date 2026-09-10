# Task 2.9.7 — The first real price on screen

**Status:** Complete — 2026-09-09
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.6

## Objective

Put a real, stored price into the running application — the last close and its
change, on the `/securities` table that already exists — so that a story with a
backend deliverable is not five tasks with nothing to look at.

## What the user can see when this lands

**The first price MarketPulse has ever shown anybody.** The tracked-universe table
gains a last close and its change against the previous session, for 518 real
securities, out of the real store: NVDA with a number beside it rather than a
coverage window. Colour is not the encoding — `PriceChange` already exists,
carries an arrow glyph and a sign, and has **never rendered a real number** in the
application; this is where it stops being a Storybook exhibit.

**What the user still cannot do**: see a chart, choose a window, or search. Those
are Stories 2.11 to 2.13. And the number is **the last stored session's close, not
a live price** — labelled as of its session date, because a stale number presented
as current is precisely the dishonesty invariant 6 exists to prevent.

## Work

- **Serve it on the existing `/securities` response**, beside Task 2.8.9's
  `coverage` record, rather than as a new endpoint the frontend has to learn to
  fetch. That is deliberate on two counts: `useSecurities` already fetches this
  route on this page, so **no new client plumbing is needed and Story 2.10's state
  decision is not pre-empted**; and Task 2.6.7 already found that a fact the page
  needs has to ride on something the page actually requests.

- **Read it at the DAILY timeframe**, two rows per security — the last close and
  the one before it. `readLastBarDates` already establishes the argument and the
  measurement behind it: a `max(observed_at) group by security_id` over daily bars
  is ~345,000 rows and finishes in milliseconds, where the same query over minute
  bars is 48 million. A page that scans `market_bars` at minute resolution to draw
  a list is the thing `bar_coverage` exists to prevent, and §8.6's cross-sectional
  reading (**493 rows, 28.2 ms**, via a PostgreSQL 18 skip scan) is the control to
  re-take rather than cite.

- **The change is arithmetic both sides already have**, so compute the percentage
  where the claim is made — `PriceChange`'s own header draws that line: a band name
  is a decision the backend reports, the direction of a move is arithmetic. What
  the wire carries is prices and a session date.

- **Say what the number is, on the page.** A close from the last complete session,
  with its date, and the feed already named in the chrome. A security holding no
  daily bars shows the absence honestly rather than a zero or a blank — Task
  2.4.2's `""` finding is the shape of that mistake.

- **Extend the contract with the guard, not around it.** The field is added to the
  interface **and** the schema, at every nesting level the `satisfies` guard does
  not reach, and the raw-body assertion is what proves the nullable case survives.
  `routes/securities.ts` applies the guard **four** times today; a field added to
  a nested shape is covered only by that shape's own application.

  **And there is a trap in checking that you did it, found 2026-09-09 by Task
  2.9.3.** `packages/shared` is consumed as **built output**, so adding a field to
  a shared interface and running `pnpm --filter @marketpulse/backend typecheck`
  proves nothing until the shared package is rebuilt — it typechecks against the
  previous `.d.ts`, comes back green, and reads exactly like a guard that is not
  firing. `pnpm --filter @marketpulse/shared build` first, every time, or the
  verification is of the old contract.

- **Re-measure the payload rather than predicting it.** The current response is
  **150,660 bytes, 12,831 gzipped** at 518 securities with coverage (Task 2.8.10),
  and 515 records carrying the same two instants is why it compresses 11.7:1 —
  518 distinct prices will not. Quote what it becomes.

- **Visual quality is an acceptance criterion of this task, not of a later one.**
  Right-aligned `tabular-nums` in the column, the alignment Task 1.4.3's 14.3 px
  measurement was bought for; the sign and glyph carrying direction under
  `grayscale(1)`, where this palette's red and green are **1.05:1** apart; and the
  column earning its place in a table that is already dense rather than being
  wedged into it.

- **`BarCoverage` gained a `source` and this page must not render it — added
  2026-09-09 by Task 2.9.4.** That task put `provider` and `feed` on the ledger
  (`0007_bar_coverage_provenance.sql`), so the coverage record this page already
  reads now carries which feed each security's history came from. It is **not**
  on the `/securities` wire and must not be put there by this task: Task 2.6.7's
  rule is that **no second endpoint may answer "which feed"**, `/market-data`
  answers it for the deployment, and `SeriesProvenance` answers it per series. A
  per-security feed column on the universe table would be a third answer to one
  question, and the trigger for one — a deployment whose securities genuinely
  disagree about their feed — has not fired. The last close is a price, not a
  provenance record.

- **Know, and do NOT fix here: `/securities` can now answer 503 and this page
  renders it as _"unexpected response"_ — found 2026-09-09 by Task 2.9.6.** That
  task added `SERVICE_UNAVAILABLE` and gave `/securities` the 503 as well, so a
  database outage now arrives at the browser as a well-formed `ApiError` saying
  _this is temporary, retry_. `useSecurities` collapses `api-error` and
  `http-error` into one `answered-badly` state and `UniverseTable` renders that as
  **"unexpected response"** — which is now a false sentence for the commonest
  failure this page has. The backend is right and the frontend is one hop behind
  it.
  **It is Story 2.10's**, whose file records the decision this fires, and it is
  named here because this task is the next one to touch this page and would
  otherwise either trip over it or quietly widen its own scope to fix it. Do
  neither: the price column is this task, and a failure-taxonomy change is a
  contract decision with its own tests, its own copy and its own browser spec.

- **Do not build a sparkline, a chart, or a time-window control.** Story 2.12 owns
  the charting decision for the whole product and this task must not settle it by
  accident. If a row wants to be a link to a security's page, that is Story 2.11's.

## Done when

- `/securities` renders a last close and its change for the tracked universe, from
  real stored bars, with the session date visible
- The daily-timeframe read is measured and the minute table is demonstrably not
  scanned
- The absent case renders honestly and is asserted on the raw body
- Component tests cover present, absent and unchanged; the axe pass and keyboard
  behaviour of the existing table are unbroken
- `pnpm verify` and `pnpm e2e` pass

## Notes

This is the story's demonstration, and taking it here rather than in Story 2.12 is
the same delivery decision Task 2.8.9 took: a run of backend tasks with one
visible change is a run nobody outside the code can see. Whether the same number
belongs on Epic 4's overview is Epic 4's question, not this task's.

---

## What was built — 2026-09-09

### The wire

`SecurityLastClose` in `packages/shared/src/securities-response.ts`, and a
fourth key on the envelope: `lastCloses`. Four fields — `symbol`, `session`,
`close`, `previousClose` — and deliberately no change, no percentage and no
direction, which is `PriceChange`'s own line applied one layer down.

**`session` is a market DATE and not an instant, which is where this contract
departs from `SecurityCoverage` beside it.** That record sends instants and
argues the conversion belongs on whichever side displays it; a close is not an
observation at an instant but _the last print of a session_, and a session is a
date. So it follows the second of ADR 0017's two wire rules rather than the
first. The conversion still happens exactly once, in `marketDateAt`, called by
the route's mapper.

`previousClose` is nullable, and the predicate refuses `undefined` while
accepting `null` — the null carries "we hold one session", an absent key would
be a server that has never heard of the field.

### The read

`MarketBarsRepository.readLastCloses(timeframe)`, and it is a **lateral scan per
security** rather than the window function everybody writes first:

```sql
select securities.symbol, recent.observed_at, recent.close
from securities
cross join lateral (
  select observed_at, close from market_bars
  where security_id = securities.id and timeframe = $1
  order by observed_at desc limit 2
) as recent
order by securities.symbol, recent.observed_at desc
```

`cross join` and not `left join`, so a security with no daily bars contributes
no rows and is absent from the map. A left join would give it one row of nulls,
and a null close is a value somebody would eventually render.

### What was measured, against the real store

Local, 2026-09-09, against 47,682,213 minute bars and 345,559 daily ones —
`explain (analyze, buffers)` over the SQL Kysely actually compiles, not over a
hand-written approximation of it:

| Shape                                              |  Rows |           Time |
| -------------------------------------------------- | ----: | -------------: |
| The lateral scan, cold                             | 1,036 |    **21.4 ms** |
| The lateral scan, warm, whole round trip from Node | 1,036 | **4.8–8.2 ms** |
| `row_number() over (partition by …)`, cold         | 1,036 |       830.1 ms |
| the same, warm                                     | 1,036 |     182–279 ms |

**The minute table is demonstrably not scanned**, and that is a property of the
plan rather than a hope: the `Index Cond` is
`(security_id = securities.id) AND (timeframe = '1d')`, there are 518 index
searches returning two rows each, and the whole query touches **2,597 buffers**.
A `row_number()` over the same daily rows reads all 345,559 of them and sorts
them to return 1,036 — 30–40× worse warm, which is the shape this task had to
avoid rather than the shape it had to reach for.

`GET /securities` end to end, against the real pair: **13–20 ms warm**, 33 ms
cold, for 518 securities with coverage and closes.

### The payload, re-measured rather than predicted

| Response                                     |       Bytes |    gzip -9 |     Ratio |
| -------------------------------------------- | ----------: | ---------: | --------: |
| 101 securities (Task 2.4.2)                  |      17,299 |      2,591 |     6.7:1 |
| 518 securities with coverage (Task 2.8.10)   |     150,660 |     12,831 |    11.7:1 |
| **518 with coverage and closes (this task)** | **190,736** | **19,526** | **9.8:1** |

**This is the first key to make the compression ratio worse, and the brief
predicted exactly why.** 515 of 518 coverage records carry the same two
instants, which is what gzip is for; 518 distinct prices are 518 distinct
strings. The rule survives the exception rather than being overturned by it:
measure the compressed payload, not the array length, and expect a key of
genuinely per-row values to cost what it looks like. 19.5 kB is still far inside
`SecuritiesResponse`'s restated reversal trigger of ~100 kB compressed.

### On screen

Two columns, not one cell holding both. `230.36 ▲ +0.84%` in a single cell is
narrower on paper and destroys the mechanism: a right-aligned tabular column
aligns decimal points for free, and a cell whose content changes width to the
left of the figure has no column at all. The table went from five columns to
seven, with the width taken out of Name and Industry — both prose that wraps —
rather than added to the total.

**The session date is stated once, in the `Last close` heading.** 518 identical
dates under a heading that could carry one is furniture, which is the argument
that took the Sector column out of this table and put the timeframe into the
history heading. Measured: **518 of 518** securities last closed on 2026-09-04.
The moment they disagree the heading withdraws its claim and every cell carries
its own date — the same asymmetry `coverage.ts` and the summary line already
have, and it has a story of its own because the store cannot be put into that
state today.

**Colour is not the encoding, and the greyscale render was taken rather than
assumed.** Under `filter: grayscale(1)` in a real browser the two price hues are
indistinguishable — 1.05:1, as Task 1.4.4 measured — and the direction is still
completely legible from the arrow glyph and the sign. `PriceChange` has existed
since Story 1.4 and has never rendered a real number; this is where it stops
being a Storybook exhibit.

### Four findings worth carrying forward

**A `null` under a plain `"number"` schema serialises as `0`.** Produced, not
reasoned about: declaring `previousClose: { type: "number" }` and running the
route suite puts `"previousClose":0` on the wire — a plausible-looking price
that renders as a −100% move on a security whose only fault is that we hold one
session of it. This is `sector`'s `""` finding in numeric form and it is worse,
because an empty string is visibly wrong and a zero is not. The assertion is on
the **raw body**, because `response.json()` is exactly what would hide it.

**A `display: block` sibling inside a `<th>` runs the accessible name
together.** The heading's name came out `Last close2026-09-04` —
`e2e/README.md`'s `Backend servicehealthy` trap, arriving somewhere it would be
_heard_ rather than merely mis-asserted on. Found by a component test rather
than by review. The fix is an explicit `{" "}`, invisible at the end of the
first line and the whole difference to a listener.

**Widening the route's `Pick` was a manual edit, which is the `Pick` working.**
`createSecuritiesRoutes` takes `Pick<MarketBarsRepository, …>` rather than the
whole interface, so a route reaching for a new read announces itself in its own
signature instead of acquiring the capability silently.

**Adding a required key to a shared response type is a red frontend suite, not a
silent one.** Ten frontend tests went red the moment `lastCloses` became
required, because their stubbed bodies stopped satisfying
`isSecuritiesResponse`. That is the predicate doing its job and it is the
version-skew question answered: `deploy.yml` ships both halves from one commit
and deploys the **backend first**, so a frontend strict about this field never
meets a backend without it. The ordering was read rather than assumed.

### What was deliberately not done

- **No `feed` or `provider` on a close.** Task 2.6.7's rule: no second thing may
  answer _which feed_. `BarCoverage` gained a `source` at Task 2.9.4 and it is
  still not on this wire. The last close is a price, not a provenance record.
- **`/securities`' 503 still renders as "unexpected response".** Named in the
  brief as Story 2.10's and left there. The price column is this task; a
  failure-taxonomy change is a contract decision with its own tests, its own
  copy and its own browser spec.
- **No sparkline, no chart, no time-window control, no click-through.** Stories
  2.11 and 2.12 own those, and this task must not settle them by accident.

### Verification

- `pnpm verify` — green (1,063 tests across three packages, plus the process suite)
- `pnpm test:database` — green, 165 tests, including 8 new ones on `readLastCloses`
- `pnpm e2e` — green, 30 tests, including three axe runs at three viewports and
  the keyboard walk, both unbroken
- Two breaks were produced rather than assumed: dropping `"null"` from the
  schema (one red test, and the `0` on the wire quoted above), and reversing the
  read's `observed_at` ordering (two red database tests, which is every figure
  on the page having its sign inverted)

---

## For the stakeholders: what this actually delivered

**MarketPulse now shows a price. That has never been true before.**

Up to today the application could tell you _which_ companies it follows and _how
much_ history it has stored for each of them — 518 securities, about 48 million
minute-by-minute price records — but it could not tell you what a single one of
them was worth. Everything the team had built for the last several weeks was
plumbing: a database, a connection to the market-data vendor, a nightly job that
fetches yesterday's trading, and a carefully specified contract for how prices
travel from the server to the browser. All real work, none of it visible.

Open the Security Explorer screen now and every one of those 518 companies has a
closing price beside it, and how far that price moved from the day before.
NVIDIA at 230.36, up 0.84%. Apple at 319.97, down 2.51%. Real numbers, from real
market data, that the system fetched from the exchange tape and stored itself.

### Three decisions worth understanding

**We tell you which day the price is from, prominently, and we will not stop
doing that.** The column is headed "Last close — 2026-09-04", not "Price". This
matters more than it sounds. Our market data comes from a free plan that lets us
store completed trading sessions but not watch the market live, so the number on
screen is the last _finished_ session, which during trading hours is at least a
day old. A price that is a day old and does not say so is a lie by omission, and
in a financial product that is the single most damaging kind of mistake we could
make. So the date sits in the column heading where a reader meets it before they
meet a number, and it is read aloud to anyone using a screen reader. Live
prices are a real feature and they arrive in Epic 3; until then the product says
what it has.

**A price that goes up and a price that goes down do not differ only by
colour.** Roughly one man in twelve has some form of colour-vision deficiency,
and our red and green are — measured — _identical_ in greyscale. So the
direction is carried three ways over: an up or down triangle, a plus or minus
sign on the figure, and a spoken word for screen readers. Colour is the fourth
channel, not the first. We rendered the page in greyscale in a real browser to
confirm it still reads, rather than assuming it.

**We refused to invent a number anywhere it was missing.** A security we have
not yet downloaded daily prices for shows a dash and the words "no close yet",
not `0.00`. A security we hold exactly one day of shows its price and a dash
where the change would go, not "0.00%" — because "we cannot compare this" and
"this did not move" are different facts and only one of them is true. That
sounds fussy; it is the difference between a system a analyst can trust and one
they have to double-check.

### Why it was cheap, and why that was not an accident

The obvious way to find every company's latest price is to search 48 million
price records. Written the obvious way the query took **830 milliseconds** —
close to a second of the server doing nothing else, on every page load. Written
to use the index the team designed months ago, it takes **five**. Same answer,
150 times faster, and the page now loads in about 15 milliseconds end to end.

That is what the earlier "invisible" work bought. The database was designed so
that this question is cheap, and the task measured the result against the real
48-million-row store rather than a toy one — including running the slow version
on purpose, so the number in the record is a comparison rather than a claim.

### Where this leaves the product

The remaining work in this chapter is the price _chart_ (Story 2.12), a search
box (2.11), and the application's decision about how it holds live data (2.10).
Those are the pieces that turn a table of numbers into something an analyst
explores. But the hard part — getting real market data out of a vendor, into a
database, through a typed contract, and onto a screen without anybody being
misled about what they are looking at — is now done end to end, and there is a
screen you can point at that proves it.
