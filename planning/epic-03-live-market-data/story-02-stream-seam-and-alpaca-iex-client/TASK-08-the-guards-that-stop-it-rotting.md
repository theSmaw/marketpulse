# Task 3.2.8 — `GET /diagnostics/feed`, the store's refusal, and the checks a green `verify` cannot make

**Status:** **Complete — 2026-09-18.** `GET /diagnostics/feed`, `recordSeries`' replay refusal, `check-deployed.mjs`'s two conditions, and a scheduled probe. **Two new breaks, and the harness caught a third going stale.** See _What was found_.
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.7

## Objective

The runtime half of "what must not rot": a diagnostics route, a store that
refuses a replayed bar, and the deployed check that can fail after a merge.

## What the user can see when this lands

**Nothing on a screen.** `GET /diagnostics/feed` is the first thing in this story
an operator can actually observe — a route, not an interface — and it is what
Story 3.3 reads from.

## What is already decided and must not be re-taken

- **`verify` has no credentials by design**, so **a runtime claim needs a
  runtime check.** Pointing `verify` at a live store would fork the definition of
  "verified".
- **A deployed check runs after a merge, so it gates nothing** — its output is a
  **rollback decision**. That is not a weakness to apologise for; it is why the
  axe rule is asymmetric too.
- **`recordSeries` must throw on provenance naming `replay`, and it must be a
  RUNTIME guard** — because widening `PROVIDER_IDS` widened `schema.ts`'s insert
  types, so **the compiler stopped preventing the write at the same moment the
  database check started permitting the value.** 3.2.1 is what created that
  window; this closes it.
- **`check-deployed.mjs` fails when the market is open and the deployed feed is
  not a connected `iex`, and at ANY hour if the deployed feed is `replay` at
  all.**
- **Every check owes a break** — `scripts/breaks.mjs` is the registry, and a
  check that has never failed has never been tested.

## Work

- **`GET /diagnostics/feed`**, beside the shipped `/diagnostics/freshness`.
  Declare `500: apiErrorSchema` and use the `satisfies Record<keyof T, …>` idiom
  — **copy it for every new route**, because a field on the interface and not in
  the schema otherwise vanishes silently on the wire.
  - It reports the connection state, the feed identity and the instant of the
    last observation. **Note these are different questions** (§11.2): _our socket
    is fine and the market feed behind it is dead_ must be expressible.
  - **It must not leak the credential, the endpoint or a thrown message.** A 5xx
    never carries the thrown message, and a message written for a developer is
    internal detail too.
- **`recordSeries` refuses replay provenance**, with a `pnpm break` entry.
- **Extend `check-deployed.mjs`** with both conditions above, and **verify the
  deploy's provider read** described in ADR 0030 §7a — it **reads** the
  configured provider and refuses to roll on the wrong one, and it **never sets**
  it, because `deploy.yml` deliberately does not restate the app's environment.
- **The scheduled probe** that bounds how long a wrong state can last — §7's two
  detect-and-bound mechanisms are only meaningful together, since `deploy.yml`
  has no `schedule:` and **nothing looks at production between merges**.
- **Add every new claim to `docs/GAPS.md`** with a `Re-measure:` line, or make it
  mechanical. `CLAUDE.md`'s rule: an entry that can be made mechanical should be.

## Done when

- `GET /diagnostics/feed` exists, declares its error schema, and leaks nothing —
  proven by a test walking the route table
- `recordSeries` throws on replay provenance, with a passing `pnpm break`
- `check-deployed.mjs` fails on both conditions, and each is break-verified
- The scheduled probe exists and its cadence is written down with its reason
- Every new claim is either a `verify` step or a `GAPS.md` entry with a
  re-measure
- `pnpm verify` passes, still with no network and no database

## Notes

**The honest framing of this task, which the story insists on**: none of these is
a compiler. One prevents, two detect and bound, one raises the number of
independent mistakes needed from one to two. **The word "guaranteed" must not
appear in this story's record** — and a task that quietly writes it is the first
sign the layering has been misunderstood.

---

## What was found

### The window `0009` opened is closed, and the break is why that is not an opinion

Task 3.2.7 widened `PROVIDER_IDS`, which widened `schema.ts`'s insert types — so
**the compiler stopped preventing a replayed write at the same moment migration
`0009` made the database check start permitting the value.** Neither end refuses
it.

`recordSeries` now throws `ReplayedSeriesError` **before the transaction opens**,
beside `singleSourceOf` and for the same reason: no round trip is spent on a
series that must never be stored, and no partial state can exist.
`pnpm break replayed-series-refused-by-the-store` removes the one line it takes
and proves the database suite goes red.

**Three database tests assert the two ends are as described**, including one that
asserts the **constraint still permits `replay`** — because
`market-bars.database.test.ts` ties it to `PROVIDER_IDS` with **set equality**,
so a vocabulary the application knows and the database refuses fails a required
check and buys nothing. The guard is runtime because it has to be, and that is
now an assertion rather than a comment.

### `GET /diagnostics/feed` reports three questions, deliberately not collapsed

§11.2 requires _our socket is fine and the market feed behind it is dead_ to be
sayable, and one boolean cannot say it. So the route reports **what is
configured** (`provider`, `feed`), **what the connection is doing** (`status`)
and **when the newest observation was true in the market** (`observedAt` — not
when a frame arrived, because §6.7 measured `dailyBars` re-sending a
byte-identical aggregate every minute out of hours).

**It answers with no stream running, and that is the state it most needs to
survive.** ADR 0030 §7c fails _at any hour if the deployed feed is `replay`_ —
answerable from the **configured** provider alone, before a socket exists and
whether or not one ever does. A reading that needed a live stream would go silent
in exactly the state it exists to catch. Epic 3 has no stream in the process yet;
Story 3.3 starts one, and this shape does not change when it does.

**`marketOpen` is on the route so the check does not keep its own calendar.** One
fact, one home: the server has Story 2.5's exception table and
`check-deployed.mjs` does not.

**Two tests hold what it must never carry**: no credential, endpoint or vendor
hostname — _a diagnostic that drifts into describing our upstream is how one
eventually reports a key_ — and an exact six-field assertion, which fails whether
a field is added to the interface without the schema or to both without being
thought about.

### Verified against the real deployment, and it found a misdiagnosis

Run against production before merging, and three of four probes passed. The feed
probe returned **`404`** — correct, because the route is not deployed yet.

**But the failure message was wrong**: it said _"the deployed FEED is not telling
the truth about the market"_, which would send an operator to look at
`MARKET_DATA_PROVIDER` when the answer is that the endpoint does not exist. A
404 is now a distinct branch saying so, and naming the one deploy for which it is
expected. **A check whose message misdiagnoses is worse than a terse one**, and
this was only visible by running it against the real thing.

### Both deployed checks are detective, and the word "guaranteed" still does not appear

- **`check-deployed.mjs`** fails after a merge — unconditionally on `replay`,
  and on a feed that is not a connected `iex` while the market is open.
- **`.github/workflows/probe-deployed.yml`** runs the same script **daily at
  13:00 UTC**, because `deploy.yml` has no `schedule:` and **nothing in this
  repository looks at production between merges.** A hand-edited environment
  variable on a quiet Tuesday is otherwise invisible for days — and it creates a
  new revision with no workflow running at all, so §7b's provider read never
  sees it.

**The cadence is argued rather than picked.** Daily because the gap it closes is
_days_ and its own traffic is a cost; **09:00 ET — half an hour before the bell**
because the expensive wrong state is one that persists through a session, so the
useful time to notice is before it; and **not weekdays-only**, because the
session-gated half reads the server's calendar and restricting the cron would be
a second copy of the trading calendar in a place that cannot see the exception
table.

**Neither is preventive**, and `docs/GAPS.md` entry 9 says so: by the time either
goes red the wrong state has already served traffic. What they bound is its
**duration** — to a merge, and to a day.

### The harness caught a break going stale, and refused rather than passing

`pnpm break replay-refuses-during-a-session` failed with _"A break has to land
exactly where the entry says it does, or a green run proves nothing."_

**Task 3.2.7's own sweep had moved the line it targets** — the replay guard
gained a `try`/`catch` so it fails closed past the calendar's horizon — and the
entry still named the old one-liner. That is `CLAUDE.md`'s _"when you touch a
file an entry names, check the entry"_, and the interesting part is that it was
**enforced rather than remembered**: the harness refuses a substitution that does
not land, so the stale entry could not quietly pass.

### What was checked and found already true

- **`deploy.yml` reads the provider and never sets it** (§7b), because the update
  step deliberately does not restate the app's environment — _"a deploy step that
  restated them would be a second definition of the app's configuration"_.
  Confirmed unchanged; this task added nothing there.
- **The route follows the `satisfies Record<keyof T, …>` idiom** and declares
  `500: apiErrorSchema`, copied from `/diagnostics/freshness` rather than
  reinvented.
- **`["string", "null"]` and never bare `"string"`** on `observedAt` and `feed`,
  for the reason the freshness route already records: `fast-json-stringify` turns
  a `null` under `"string"` into `""`, and an empty instant reads as a formatting
  bug rather than as an absence.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. This was the eighth
building block, and it is the one that makes the previous one safe.

**What this task built: the alarms.**

The previous task added the ability to replay a real past trading day — valuable
for design work, and the single most dangerous thing in this piece of work,
because replayed prices look exactly like live ones. This task adds the
mechanisms that make sure they never reach a real user, and that we find out
quickly if they ever did.

**Three things landed.**

**1. The database now refuses to store a replayed price.** This closes a gap we
_deliberately left open and wrote down_ last time. Adding "replay" to our list of
data sources had a side effect: it quietly removed the automatic protection that
had been stopping a replayed price from being saved. We recorded exactly where
and when that happened, and this closes it — with a sabotage routine that proves
the protection works by removing it and confirming the tests go red.

Why it matters: a replayed price is a **real** price with its **timestamp
changed**, so storing one would put a genuine number into the permanent record at
a time it did not happen. Nothing downstream could ever detect that.

**2. The system can now be asked, from outside, what it is serving.** A new
endpoint reports which data source is configured, whether the connection is
healthy, and when the most recent price was actually true in the market. It
deliberately reports **three separate things** rather than one "is it working"
answer, because "our connection is fine but the market feed behind it has
stopped" is a real situation that a single yes/no cannot express.

It also carries **no passwords, no internal addresses, and not even our data
supplier's hostname** — there is a test for that. A diagnostic that drifts into
describing our suppliers is how one eventually reports something it shouldn't.

**3. Two automated checks now watch production.** One runs after every
deployment. The other runs **every day at 09:00 New York time — half an hour
before the market opens**, because until now _nothing looked at production
between deployments at all_, and a setting changed by hand on a quiet Tuesday
would have gone unnoticed for days. Both fail immediately if production is ever
replaying, at any hour.

**I want to be straight about what these do and do not do.** Neither prevents
anything. By the time either goes red, the wrong state has already been live.
What they do is **bound how long it lasts** — to one deployment, and to one day.
The only genuinely preventive mechanism is the one that refuses to deploy at all
with the wrong setting. We have written that distinction down rather than
describing all of this as "guaranteed", because it isn't, and a team that
believes it is will stop checking.

**Two things worth reporting from the doing.**

**I ran the new check against the live production site before merging** — and
found that its _error message was wrong_. It correctly detected a problem (the
new endpoint isn't deployed yet, which is expected) but reported it as "the feed
is not telling the truth about the market", which would have sent someone
investigating the wrong thing entirely. That is now a separate, accurate message.
A check whose failure misdiagnoses is worse than a blunt one, and this was only
visible by pointing it at the real thing.

**And one of our own safety routines had quietly gone stale — the tooling caught
it.** A sabotage-and-restore routine works by making a specific change to a
specific line. Yesterday's work had _moved_ that line, so the routine no longer
applied. Rather than passing silently — which would have left us believing a
protection was tested when it wasn't — the tool **refused to run**, saying the
change had to land exactly where it claimed. Fixed, and re-proven. That is the
difference between a rule people remember and one a machine enforces.

**How this unlocks progress.** The dangerous instrument from last time is now
fenced. **The next task closes the story** — documentation, an architecture
record, and the hand-offs — and then **the story after that puts the feed's state
on screen for the first time.**

**What a user can see today: nothing new.** The deployed site serves exactly what
it did yesterday, and now says so out loud when asked.
