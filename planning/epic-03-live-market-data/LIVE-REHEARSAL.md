# The live-session rehearsal ledger

**What this is.** One row per story in this epic that a person has watched
working **against the real Alpaca IEX socket, during a real market session**.

**Why it exists.** From 2026-09-16 this epic can be built against a _replay_ of
our own stored bars at any hour of the day
([ADR 0030](../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md)),
because the developer is in Asia/Singapore and the US session is 21:30–04:00
local. That is a real convenience and it carries one real risk, stated by the
person who would pay for it:

> _"We might build the app against the dummy feed and forget to have it working
> properly against the real live feed."_

ADR 0030's decision 7 makes that failure unreachable by accident — **a replay
refuses to run while the market is open**, so the live socket is the only thing
that can serve during a session, every trading day, watched or not. This ledger
is the second line: it is the record that somebody **looked**.

## The rules

- **A row is added by the story it names, not retrospectively by the epic
  close.** A row written from memory three weeks later is a row about a memory.
- **A rehearsal is minutes, not an evening.** Open the surface the story built,
  during a session, against `MARKET_DATA_PROVIDER=alpaca`, and write down what
  you saw — including "nothing moved for four minutes", which is an ordinary
  observation on a feed with 82.8% median minute coverage and is worth recording
  as such.
- **`What was wrong` is the column that earns this file.** A rehearsal with
  nothing in that column for six stories running is a rehearsal nobody did.
- **Story 3.11 cannot close with a missing row**, and that is checkable rather
  than promised: `pnpm invariants` asserts every story marked complete in
  `EPIC.md` has a row here.
- **A replay-only observation is not a rehearsal** and must not be recorded as
  one. If the surface was watched against the replay, say so in a note beneath
  the table rather than in a row.

## The ledger

| Story | Date | Session window watched | Surface | What was seen | What was wrong |
| ----- | ---- | ---------------------- | ------- | ------------- | -------------- |
| 3.3   | —    | —                      | —       | —             | —              |
| 3.4   | —    | —                      | —       | —             | —              |
| 3.6   | —    | —                      | —       | —             | —              |
| 3.7   | —    | —                      | —       | —             | —              |
| 3.9   | —    | —                      | —       | —             | —              |
| 3.10  | —    | —                      | —       | —             | —              |

**Six rows, and the list is the six stories that change something a stranger can
see.** 3.1, 3.2, 3.5, 3.8 and 3.11 are not here: the first two produce no
surface, 3.5 and 3.8 are backend-only by their own scope, and 3.11 is the close
that checks this file rather than a story that fills it.

## What a full ledger does not certify

That the live feed works **now**. Every row is a dated observation of a third
party, and a feed that worked on the day a story shipped can stop working the
next morning. What answers _now_ is `GET /diagnostics/feed` and
`check-deployed.mjs` failing on it after a merge — the runtime half, which has no
schedule to miss.
