# Story 2.4 — Trading Calendar & Market Time Handling

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.3
**Epic scope covered:** **Addition to this epic's stated scope** — see the note in [`../EPIC.md`](../EPIC.md)

## Description

Establish, once, what "a trading day" and "market time" mean in this system.

This is an addition to the epic's scope list, made because three later stories each need
it and none of them is the right place to invent it: Story 2.7 cannot decide which minutes
should have bars without a session definition, Story 2.12's "last 5 days" is wrong if it
means five calendar days, and Epic 13's temporal isolation — invariant 4, the one the
whole replay capability rests on — is a comparison against a market clock rather than a
wall clock.

It is small. It is here because the alternative is three inconsistent copies of it.

## Why it sits here in the sequence

After the universe (which fixes the exchanges and therefore the sessions) and before
anything that fetches or renders a time series.

## Scope

- The timezone rule: **America/New_York is the market's timezone and UTC is storage's**,
  with one conversion boundary rather than conversions scattered through the code. The
  ET/EDT transition is the case that catches people, and it moves twice a year
- Regular session boundaries (09:30–16:00 ET), and whether pre- and post-market are in
  scope for V1
- Market holidays and **half days** — the early closes around Thanksgiving, Christmas and
  Independence Day, which are the ones a naive holiday list misses
- Where the calendar comes from: a provider endpoint, a checked-in table, or a computed
  rule set
- The functions the rest of the product uses: is this timestamp inside a session, what is
  the previous/next session, how many sessions between two dates, what are the session
  bounds for a given date
- Formatting conventions for a market timestamp on screen, and their relationship to
  Story 1.4's `tabular-nums` decision — a timestamp whose width changes is a column that
  jitters when prices update
- The seam Epic 13 needs: **every read of "now" in market terms goes through one place**,
  so replay can later substitute a clock rather than every call site being rewritten

## Out of scope, and who owns it

- The replay clock itself, its controls and its state — Epic 13
- Enforcing temporal isolation in queries — Epic 13, but this story is what makes it
  possible to express
- Any UI — Story 2.12 consumes this, and the header's reserved market-clock region stays
  reserved (Epic 3 fills it)

## Open decisions — settle with the user

1. **Calendar source.** A provider calendar endpoint is authoritative and adds a network
   dependency to something that must work offline in tests; a checked-in table is offline
   and goes stale at a known rate (one edit a year). Consider fetching it and caching it
   into the database, which is the shape Story 2.7 uses for bars
2. **Pre- and post-market.** Excluding them is simpler and is what most charts show;
   including them changes the volume baseline Epic 5 builds and changes what "the session"
   means in replay. Cheaper to decide now than to add
3. **Whether the abstract clock is built now or its seam merely reserved.** Building the
   substitution now is speculative; leaving no seam at all is the retrofit invariant 4
   warns against. The middle answer — one module that answers "what time is it, in market
   terms", with a single implementation today — is probably right

## Acceptance criteria

1. Session, holiday and half-day handling is correct across a set of named dates chosen to
   include a half day, a holiday, a weekend and **a DST transition**, each asserted rather
   than reasoned about
2. Nothing outside this module converts between UTC and market time
3. "The last N sessions" is expressible and returns sessions, not calendar days
4. Where the calendar came from is recorded, and staleness has a stated failure mode
5. `pnpm verify` passes; these are fast unit tests with no database and no network

## What this story hands forward

One definition of a trading session, and the seam Epic 13's clock later slots into.
