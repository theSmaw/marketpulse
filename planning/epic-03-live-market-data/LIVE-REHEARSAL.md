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

| Story | Date       | Session window watched                                                                                                                                                                   | Surface                                                                                                | What was seen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | What was wrong                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.3   | —          | —                                                                                                                                                                                        | —                                                                                                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3.4   | 2026-09-22 | 09:44–10:38 ET, deployed site (six readings on `/securities`, three on `/securities/NVDA`; the instrument's own one-minute waits stretched to 13–16 minutes in the second half — note 2) | The identity block on `/securities/NVDA`, and the same block on `/securities` (which defaults to NVDA) | `LATEST PRICE` moved and its instant advanced with every reading: `228.05 ▲ +0.29%` at 09:44 → `227.44 ▲ +0.03%` at 09:45 → `227.41 ▲ +0.01%` at 09:47 → `227.31 ▼ −0.03%` at 10:03 → `227.38 — unchanged 0.00%` at 10:08 → `228.16 ▲ up +0.34%` at 10:21 → `228.26 ▲ up +0.39%` at 10:38, each with `change from 2026-09-21's close`. Up, down and unchanged all carried a glyph or a word beside the hue. One arrival mark was caught on the block (the last reading); the others were missed by a stalled reader rather than absent. No error in the page.                                                                                                                               | On the surface, nothing. In the chrome beneath it, the venue word read `ALL US EXCHANGES` beside `LIVE` while every live bar was IEX (note 3). Still owed and not seen: the extended-hours qualifier (the market was open), a real correction, a genuinely quiet minute; the block's marks were not countable by this instrument.                                                                                                                                                                                 |
| 3.5   | 2026-09-22 | 09:44–10:55 ET, deployed site                                                                                                                                                            | First paint of `/securities` and `/securities/NVDA`; the socket's own reconnects                       | `/securities` painted `Live price` on **510** rows in its first reading, three frames in — the snapshot, not an empty map. `/securities/NVDA` first painted `LATEST PRICE 227.38 … 10:08 EDT` with a live instant and no three-line flash. The page's socket reconnected on its own **three times** in one fifteen-minute sitting (three `snapshot` frames) and every time the cell returned to `LIVE` and the table to 518 live prices without a reload. Between 09:48 and 10:03 ET the cell read `STALE — Connected, but no new data has arrived. Showing data through Sep 22 · 09:47 EDT.` and was `LIVE` again at 10:03 with 518 live.                                                  | The `STALE` stretch was this browser's and not the feed's: the backend's uptime was unbroken since 13:07 UTC, no deploy ran in the window, its log holds nothing but requests, and the instrument's own timestamps show it stalled 13:48–14:02 UTC (note 2). So the words were true of what the page knew, and the recovery was Task 3.5.5's reconnect working under a real stall. After a reconnect the arrival marks reset — a snapshot is not an arrival, by design, and it was seen. The venue word (note 3). |
| 3.6   | 2026-09-22 | 09:44–10:55 ET, deployed site                                                                                                                                                            | The tracked-universe table on `/securities`, 518 rows                                                  | Live prices on 510 rows at first paint and 518 within twenty minutes. `NVDA 228.05 → 227.44 → 227.41 → 227.31 → 227.27 → 227.37`, `AAPL 341.42 → 339.37`, `SPY 774.63 → 774.03`, the change column moving with them and the row order never changing. Bars frames arrived once or twice a minute, on the minute, each a burst (`n = 21`; `33` and `11`; `27` and `13`; `60` and `59`; `26` and `1`). **Photographed mid-burst at 10:41:00 ET, 250 ms after a frame landed: discs beside a scatter of figures — 67 rows — and every other row still; photographed again at 10:41:02 on the page's own clock with none left.** A pulse, not a flash: Task 3.6.2's accepted risk did not fire. | Nothing in the table. The venue word in the chrome (note 3). The photograph is one burst at 1440 wide; the four-width probe with the market open was not taken.                                                                                                                                                                                                                                                                                                                                                   |
| 3.8   | —          | —                                                                                                                                                                                        | —                                                                                                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3.9   | —          | —                                                                                                                                                                                        | —                                                                                                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3.10  | —          | —                                                                                                                                                                                        | —                                                                                                      | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

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

~~**3.6's row is empty on 2026-09-22 and the rehearsal is owed to tonight's
session, not waived.**~~ **Filled that night — the rows for 3.4, 3.5 and 3.6
above are one sitting, 2026-09-22 09:44–10:55 ET, and the four notes below
say how it was watched and what it cannot claim.** The paragraph stands as
the record of why the row was empty that morning: the table was watched for
over an hour against the **fixture** feed on a production build (Tasks 3.6.4
and 3.6.5: 518 rows changing once a minute, marks firing as one burst, no long
task in the steady state) and photographed at four widths — **which is not a
rehearsal and is not in a row.** The replay could not run on the measuring
machine's store. The deployed feed read `live` on `iex` at 08:31 UTC that
day, so the venue was the deployed site during the session that opened 09:30
ET; the one judgement only that sitting could return was Task 3.6.2's _pulse
or flash_, and Story 3.4's list was the same sitting.

### Notes on the 2026-09-22 sitting

**1. Who watched, and through what.** The three rows were watched by
**Claude, through a headless Chromium on the user's machine**, started at the
scheduled time after the user said _"I will leave my computer open later,
please start it when it is the right time"_. **The user did not watch.** The
instrument (`rehearsal-3-6.mjs`, a throwaway in the session scratchpad, deleted
with the session) read the DOM through the same roles and names the browser
suite uses, tapped every WebSocket frame, and took screenshots; the readings
quoted in the rows are its log lines verbatim, and the two photographs the 3.6
row rests on are `rehearsal-table-burst-250ms.png` (10:41:00 ET on the page's
clock, discs beside TJX, TSCO, TSLA, WSM, XLC, APP, CMCSA, DIS, FOX, GOOG and
fainter ones beside SBUX, WYNN, ORLY) and `rehearsal-table-burst-decayed.png`
(10:41:02, none). Whether a headless watch satisfies _a person looked_ is the
owner's call, and the three story statuses say so rather than saying
_closed_. The deployed feed read `live` on `iex` before (`observedAt`
13:44:00Z, checked 13:45:34Z) and after (`observedAt` 14:37:00Z, checked
14:38:55Z), and the backend's `/health` gave an uptime of 5,503 s at 14:38:55Z
— started 13:07 UTC, after the day's last deploy (13:05–13:09 UTC) and before
the sitting.

**2. The instrument was starved, and that is written on its own clock.** The
user's machine carried a load average of 20–50 through the sitting (a Docker
VM, WebStorm, Chrome). The instrument's one-minute waits took 60 s for the
first two readings and then **13–16 minutes** each; on `/securities/NVDA` the
page counted 3, then 5, then 394 frames across three "minutes". A headless page
that is not scheduled does not read its socket, so **its socket dropped and
reconnected** — three `snapshot` frames in one fifteen-minute page, with the
arrival marks resetting each time as a snapshot is not an arrival. The
`STALE` reading in 3.5's row is the page telling the truth about its own stall,
and the backend's log for 13:40–14:10 UTC holds request lines and nothing
else: no drop, no upstream reconnect, no status change. Two consequences for
the rows: nothing timed by the instrument (a mark's decay, a frame's latency) is
a number, which is why the 3.6 verdict rests on the **page's own clock** in
two photographs rather than on the instrument's timestamps; and the stretches
between readings were not watched at all, so _no quiet minute was seen_ means
none in the six minutes that were actually observed.

**3. The venue word is Epic 2's, beside Epic 3's `LIVE`, on every page.** The
market-feed cell read `MARKET FEED ● ALL US EXCHANGES ● LIVE` throughout. The
venue comes from `GET /market-data`, which answers `{"feed":"sip"}` — the
historical provider's tape — and the connection word from the socket's own
`feed` frames, which said `{"status":"live","feed":"iex"}` throughout. That is
invariant 6's own sentence — _Epic 3's live feed must not inherit Epic 2's
word_ — read off the deployed chrome during a session: the numbers arriving
were IEX and the chrome said all US exchanges beside them. `market-feed-grid.test.ts`
asserts that a connection word has a feed word beside it, not that it is the
right one. **It is 3.3's surface and 3.3's row stays empty** (rule 1 — a row is
added by the story it names, not retrospectively); the finding is handed to
Story 3.10, which owns what the cell says during a session, with Story 3.9
named beside it because the source note's two-feed sentence is the other half
of the same answer.

**4. What this sitting did not return, in one place.** The extended-hours
qualifier (needs the market shut); a real correction (needs an instrument that
keeps instants, this one kept counts); a quiet minute (none in the observed
minutes); `pnpm probe` at four widths with the market open (the deployed page
was photographed at 1440 only); the vendor glance — every bars frame seen was
stamped on 2026-09-22 during the session, which answers the narrow question
for this sitting and not in general. Task 3.4.10 carries each with its
verdict.

## What a full ledger does not certify

That the live feed works **now**. Every row is a dated observation of a third
party, and a feed that worked on the day a story shipped can stop working the
next morning. What answers _now_ is `GET /diagnostics/feed` and
`check-deployed.mjs` failing on it after a merge — the runtime half, which has no
schedule to miss, and which also fails if production is ever found replaying.
