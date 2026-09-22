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

ADR 0030 makes that failure unreachable by accident in two places. **The
deployed site never replays, at any hour** (7a) — production has real users and
must only ever tell the absolute truth about the real market, so the live socket
is the only thing production has ever shown. And **a replay refuses to run while
the market is open** (7d), which catches a developer building against a
recording while believing they are live.

This ledger is the third line, and it is the only one that is about a person:
it is the record that somebody **looked at the surface** rather than at a green
check.

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
- **Story 3.11 cannot close with a missing row**, and since **2026-09-21** that
  is checkable rather than promised:
  `pnpm invariants` — `the-epic-close-cannot-outrun-the-rehearsal-ledger` —
  fails if Story 3.11's `STORY.md` says complete while any row here is still
  empty. **It was promised and not checked for three days**, and the sentence
  that promised it named `EPIC.md`'s completion marking, which does not exist:
  that table marks _visibility_. Found by Story 3.5's close grepping for the
  mechanism rather than reading the sentence, which is the only way this class
  is found. Break: `pnpm break the-close-outruns-the-rehearsal`.
- **A replay-only observation is not a rehearsal** and must not be recorded as
  one. If the surface was watched against the replay, say so in a note beneath
  the table rather than in a row.

## The ledger

| Story | Date | Session window watched | Surface | What was seen | What was wrong |
| ----- | ---- | ---------------------- | ------- | ------------- | -------------- |
| 3.3   | —    | —                      | —       | —             | —              |
| 3.4   | —    | —                      | —       | —             | —              |
| 3.5   | —    | —                      | —       | —             | —              |
| 3.6   | —    | —                      | —       | —             | —              |
| 3.8   | —    | —                      | —       | —             | —              |
| 3.9   | —    | —                      | —       | —             | —              |
| 3.10  | —    | —                      | —       | —             | —              |

**Seven rows, and the list is the stories that change something a stranger can
see.** 3.1, 3.2, 3.7 and 3.11 are not here: the first two produce no surface,
3.7 is backend-only by its own scope, and 3.11 is the close that checks this
file rather than a story that fills it.

**Re-numbered 2026-09-21 with the epic's re-order.** The two rows that moved are
the same two stories: the store (**was 3.9, now 3.8**) and the live chart edge
(**was 3.7, now 3.9**). Nothing was added or removed here by the re-order — a
ledger keyed on numbers that have moved is exactly the trap `CLAUDE.md` names,
so the mapping is written down rather than left to be inferred from the order.

**3.5 was on that exempt list until 2026-09-21 and should not have been.** Its
own scope says _nothing new visible_ and its `EPIC.md` row says `No`, both of
which are true about **capability** — and two of its nine tasks nonetheless
changed what a reader sees, because both were **repairs** rather than features.
Task 3.5.4 deleted the three-line flash on every page load of a security, and
Task 3.5.5 stopped every backend deploy stranding every open tab on
`DISCONNECTED`. A story exempted on the strength of its scope line is exempted
on the strength of what it _meant_ to change, and a repair is exactly the thing
that changes a surface without appearing in a scope.

**The row is empty and the rehearsal is owed rather than waived.** The market is
shut — it next opens **Monday 2026-09-22 09:30 ET** — and three of 3.5.4's and
3.5.5's five rehearsal items can be taken against the **deployed** site rather
than a local session, which is where Task 3.4.10's blocked list already sits.

**3.6's row is empty on 2026-09-22 and the rehearsal is owed to tonight's
session, not waived.** The table was watched for over an hour against the
**fixture** feed on a production build (Tasks 3.6.4 and 3.6.5: 518 rows
changing once a minute, marks firing as one burst, no long task in the steady
state) and photographed at four widths — **which is not a rehearsal and is not
in a row.** The replay could not run on the measuring machine's store. The
deployed feed read `live` on `iex` at 08:31 UTC that day, so the venue is the
deployed site during the session that opens 09:30 ET; the one judgement only
that sitting can return is Task 3.6.2's _pulse or flash_, and Story 3.4's
list is the same sitting.

## What a full ledger does not certify

That the live feed works **now**. Every row is a dated observation of a third
party, and a feed that worked on the day a story shipped can stop working the
next morning. What answers _now_ is `GET /diagnostics/feed` and
`check-deployed.mjs` failing on it after a merge — the runtime half, which has no
schedule to miss, and which also fails if production is ever found replaying.
