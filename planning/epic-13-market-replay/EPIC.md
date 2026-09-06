# Epic 13 — Market Replay

**Status:** Not started
**Sequence:** 13 of 15 — follows Epic 12 (Investigation Persistence & Branching)
**Spec references:** PRODUCT_SPEC.md §8.4 (Market Replay), §21 (replay), §22 (temporal consistency), §23 (what did the market know), §24 (replay architecture)

## Goal

Introduce historical replay and enforce temporal correctness.

## Outcome

Users can reconstruct a historical market session and investigate it using only information available at that time.

## Scope

- Replay mode
- Global replay clock
- Play/pause
- Replay speed
- Timeline scrubbing
- Historical market-event playback
- Historical anomaly reproduction
- Timestamp-aware analytical tools
- Timestamp-aware SEC queries
- Data-layer future-information prevention
- "Investigate at this moment"
- Agent replay context
- Replay-state visualization

## Exit criteria

The user can select a historical session, stop the clock at a particular time and ask:

> What appears to be happening right now?

MarketPulse cannot access observations or evidence originating after that timestamp.

**Milestone:** by the end of this epic MarketPulse has its signature capability.

---

## Where temporal isolation is enforced, and what already exists (added 2026-09-06, Task 2.4.6)

Invariant 4 says future-information leakage must be **structurally impossible** rather than
instructed. This section records where that is enforced, because the decision was taken two
epics before this one and the module it depends on already ships.

**The mechanism is a Kysely plugin, and it was measured rather than assumed.** Task 2.2.1
built one in a spike and reverted it. Kysely exposes the query AST to a plugin, so a call
site that asked for **no time filter at all** compiles to one carrying
`observed_at <= $replayClock`, and a raw `` sql`…` `` — which reaches the plugin as an
opaque `RawNode` it cannot rewrite — can be **refused**. Both were produced. So the seam is
_rewrite what it can, refuse what it cannot_. The full write-up is
[`DATA-LAYER.md`](../epic-02-security-universe-historical-data/story-02-database-schema-and-migrations/DATA-LAYER.md),
and it also records **PostgreSQL row-level security** as the fallback nobody chose — genuinely
structural, database-side, and the only mechanism that would survive the query layer being
replaced. **Read that paragraph before assuming the plugin is the only option.**

**The hole is not in the plugin.** `withPlugin` returns a **different object**, so the
plugged handle and the raw one are two values, and the guarantee is worth nothing if there
is an unplugged handle anybody can import. The arrangement that closes it: **a module builds
its own `Kysely` instance, does not export it, and exports functions returning domain
objects.**

### What already exists

`apps/backend/src/securities.ts` (Task 2.4.1) is that arrangement, shipped. Every module
that touches the database takes the same shape — `migrate.ts` and `load-universe.ts`
incidentally, `securities.ts` deliberately — and `database.ts` owns the pool and exports no
handle.

**The honest half, and the reason this section exists rather than a line in a task file: the
seam is ESTABLISHED and NOT YET EXERCISED BY ANYTHING.** `securities` has no `observed_at`
and is not a temporal table, so nothing the shipping code does would be filtered by the
plugin even once it exists. The arrangement was established against a case where breaking it
has **no symptom at all** — which is why it was cheap to get right there, and why a module
that gets it wrong will pass every check anybody can write until this epic arrives.

`market_bars` (Story 2.8) is the first table with an `observed_at`, and **Story 2.9's bar
query is the first place the seam does real work.**

### Two things to check first, before writing any of this epic

1. **Audit the export lists**, not the queries. `grep` for a module that exports a `Kysely`
   instance rather than functions. ADR 0015's gap 4 records that **nothing enforces this** —
   Story 2.4 _honoured_ the convention, which is not the same as it being enforced, and it
   is now load-bearing on modules that ship.
2. **`status` is this schema's one invisible predicate, and replay must NOT filter on it.**
   `UNIVERSE.md` §12.2 is explicit: a security untracked today **was** tracked on the date
   being replayed, so filtering it away is invariant 4's failure arriving through a column
   rather than through a timestamp. Story 2.4 shipped the rendering that keeps such rows
   visible; this epic must keep them in the data.
