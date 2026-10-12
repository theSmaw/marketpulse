# Task 4.9.1 — The sitting's instrument, dry-run before the bell

**Status:** **Complete — 2026-10-12** — the instrument's first draft grouped frames by the minute they were **sent** in, which Task 4.1.6 had already measured to be the one key guaranteed to split a burst in two, because bars land in second `:00`; it is keyed on each bar's own `startsAt` now
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** nothing — this is the first task and it is the one with a deadline

## Objective

**Three measurements this epic owes expire with every session that passes, and
tonight's open is 21:30 Asia/Singapore.** They cannot be produced by any
address, fixture, replay or pinned clock:

1. **Each `bars` frame's own symbol LIST**, logged off the deployed socket
   during a real session. Not a count — a list, per frame, so that _do the
   eleven sector ETFs arrive in one frame or eleven_ has an answer.
   `LIVE-DATA.md` §9.5/§10.2 records counts and **nothing in this repository
   has ever recorded frame composition**; three stories were told to size
   per-frame work against it and all three had to assume.
2. **The `feed`-frame re-count over 75 s on one symbol.** Task 4.7.7 repaired
   the rate at the gateway — a median of **332 frames a minute** before, with
   the expectation now **~1.4** (the 55 s keepalive) plus one per genuine change
   of the published view. **Anything near 300 is the defect returned.** Same
   instrument and window as the original count, so the two readings compare.
3. **The two-tape source note from a DEPLOYED store**, which exists only
   mid-session — after the nightly backfill the same window names one `sip`
   source. On `LIVE-REHEARSAL.md`'s one-sitting list as the item that **expires
   that night**, owned by Task 3.8.10.

**The owner takes the sitting; this task's whole job is that the sitting costs
minutes rather than an evening of debugging.** The instrument is built, proved
against a furnished socket today, and the protocol written as steps a person
follows with the market open.

## What the user can see when this lands

**Nothing.** This is an instrument, not a feature. Task 4.9.8 is the sitting
itself, and it is where the ledger stops saying `OPEN`.

## Work

- **One instrument, driven from the deployed addresses**, extending or
  replacing what `scripts/session-sitting.mjs` already does. Read that file
  first: it carried a defect through a rehearsal Task 3.11.8 recorded as clean.
- **Two instrument rules, both somebody's measured defect, and both
  non-negotiable:**
  - **Count by URL, never by event.** A browser page holds sockets that are not
    this product's — Task 3.11.2 withdrew a suppression, two documents and a
    task because an instrument counted every socket on a page and two of three
    were Vite's HMR connection.
  - **Drain a page-side buffer with `splice` in place, never by rebinding the
    global.** The page's wrapper holds the array it closed over, so every drain
    after the first returns nothing — and against a quiet system **one drain and
    all drains look identical**, which is exactly how it survived a rehearsal.
- **Prove the drain loop, not only the wiring.** A rehearsal against a quiet
  system certifies the wiring and **not** the loop. So the dry run must drive
  **more than one drain with frames arriving between them**, and the findings
  must say which half it proved. A furnished socket at the measured cadence is
  available in this repository and is how to do it.
- **The protocol, as numbered steps a person follows at 21:30**, covering all
  three measurements above plus the seven rehearsal rows Task 4.9.8 owes —
  Stories 4.2, 4.3, 4.4, 4.5, 4.8, Story 4.6's ninth row, and **Task 4.7.10's
  390 row on a real phone**, whose eight-step protocol is already written in
  `LIVE-REHEARSAL.md` and must be referenced rather than rewritten.
- **Order the protocol by what expires soonest and what is cheapest.** Story
  4.5's row carries the only genuinely **external** check this epic has ever
  had available — ten tickers and ten percentages against any public market
  screen, fifteen seconds — and `LIVE-REHEARSAL.md` says in as many words that
  it is the item to take first.
- **Say beside the proxy-strip step which of two things to watch for.** Task
  4.2.2 handed this story the question: four marks in **one** frame is a
  synchronised wave, four across several is a stagger the data genuinely has.
  The frame-composition log answers it, so the protocol must have the watcher
  note which they saw — a rehearsal that cannot say which cannot answer
  anything.
- **Never ship replayed or synthetic data to the deployed site, at any hour.**
  The instrument observes the deployed product; it does not feed it.

## Done when

1. The instrument runs against the deployed addresses and records, per frame,
   the frame's **symbol list** keyed by socket **URL**, with the buffer drained
   by `splice` in place.
2. A dry run against a **furnished socket at the measured cadence** has driven
   **at least three drains with frames arriving between them**, and the record
   quotes **at least one frame verbatim** — symbol list included — because the
   instrument will be deleted and a conclusion is not evidence.
3. The `feed`-frame counter reproduces Task 4.1.6's method and window (one
   socket, one symbol, 75 s) and reports a figure comparable with the 332.
4. The protocol is written as numbered steps, ordered by expiry and cost, with
   Story 4.5's external check first and Task 4.7.10's phone protocol referenced.
5. `pnpm verify` green — the instrument is a script, so `lint` and
   `format:check` are the gates it can break.
6. Nothing in it writes to the deployed product.

---

## What was done — 2026-10-12

### The instrument, and where it lives

**`scripts/sitting-frames.mjs`** — three arms, each independently runnable, all
three read-only against the deployed product:

```sh
node scripts/sitting-frames.mjs all                                  # all three
node scripts/sitting-frames.mjs composition --minutes 20 --route /   # measurement 1
node scripts/sitting-frames.mjs feed-rate --seconds 75 --symbol NVDA # measurement 2
node scripts/sitting-frames.mjs source-note --symbol NVDA            # measurement 3
node scripts/sitting-frames.mjs composition --furnished \            # the dry run
  --origin http://localhost:5173 --backend http://127.0.0.1:3000
```

**It extends rather than replaces.** The page-side socket wrapper and the
`splice` drain are `scripts/overview-instrument.mjs`'s `pageInstrument()` and
`__mpDrain()` — already proved channel-by-channel against planted effects by
`scripts/prove-instrument.mjs`. A third copy of a wrapper whose two rules are
both somebody's measured defect would have been the worse choice. `session-sitting.mjs`
is **untouched**: it is Story 3.11's instrument, its subject is a security page
and its arms are §28's repaint figures, so extending it would have put two
different stories' subjects in one file.

**One additive change to the shared module**: every `frame` row now carries the
socket **`url`** it arrived on, and the **`barMinutes`** the frame's bars
describe. The first is what makes _count by URL, never by event_ checkable from
the row that carries the count rather than only from a separate socket row; the
second is the repair in this task's status line.

**What each arm takes:**

| Arm           | What it records                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `composition` | per `bars` frame: the socket URL, `sentAt`, bytes, `n`, the **full symbol list**, the bar minutes, and the list split into proxies / sector benchmarks / equities |
| `composition` | per **bar minute**: how many frames carried a proxy and how many carried a sector benchmark — and the `waveOrStagger` verdict derived from it                     |
| `feed-rate`   | one Node socket, one symbol, 75 s: frames by type, the `feed` rate a minute, bytes each, and the first `feed` frame **verbatim**                                  |
| `source-note` | the served window's `provenance.sources` off the deployed store, with a verdict naming one tape or two                                                            |

**The population is read, not written down again.** The four proxies and eleven
sector benchmarks are classified from `GET /securities`' own `kind`, so a
delisting cannot make a literal list in an instrument quietly wrong.

**Nothing synthetic can reach the deployment.** `--furnished` calls
`assertFurnishedIsLocal()` as the **first statement in the arm**, before a
request is made or a browser is launched, and it refuses any non-loopback
origin by name. The frames it furnishes also label themselves `synthetic` on
the wire, so no row in any log can be mistaken for a reading. Verbatim:

```text
Error: --furnished refuses https://red-smoke-029583a0f.5.azurestaticapps.net:
the host is not loopback. Nothing synthetic reaches a deployed page at any hour
(ADR 0030 §7a). Run the dry run against a local pair and the real arm with no
--furnished.
```

### The dry run — four drains, frames between every pair of them

**Furnished at 16.1 `bars` frames a minute** (`LIVE-DATA.md` §10.2's close
figure — one frame every 3,727 ms), against the local dev pair, `/`, 61 s,
draining every 15 s. Playwright's `routeWebSocket` is registered **before** the
init script, which is the ordering that matters: register it after and
Playwright's own `WebSocket` overwrites the wrapper and the arm reports n = 0,
which is Task 4.5.8's first draft.

```text
[composition] / for 1 minute(s), draining every 15000 ms
  population: 518 securities — 4 index proxies, 11 sector benchmarks, 503 equities
  FURNISHED: one bars frame every 3727 ms (16.1 a minute, LIVE-DATA.md §10.2's
  close figure), labelled `synthetic` on the wire, against a loopback origin only
  drain 1 at 02:42:45 EDT: 40 rows, 7 frames, wrapper true
  drain 2 at 02:43:00 EDT: 16 rows, 4 frames, wrapper true
  drain 3 at 02:43:15 EDT: 16 rows, 4 frames, wrapper true
  drain 4 at 02:43:30 EDT: 16 rows, 4 frames, wrapper true
  STAGGER: at least one minute delivered the proxies across more than one frame,
  so the marks fire apart
```

**`"drainsWithFrames": 4`** of four, with `wrapperIntact: true` and
`visibility: "visible"` on every one. **That is the LOOP** — 7, then 4, then 4,
then 4, with 16 `bars` frames arriving between the first drain and the last.
The 2026-09-25 defect this rule comes from would have printed 7, then 0, 0, 0.

**The contrast arm proves the point rather than asserting it.** The same
instrument run against the **deployed** pair with the market shut:

```text
  drain 1 at 02:46:54 EDT: 32 rows, 6 frames, wrapper true
  drain 2 at 02:47:09 EDT: 4 rows, 1 frames, wrapper true
  drain 3 at 02:47:24 EDT: 4 rows, 1 frames, wrapper true
  drain 4 at 02:47:39 EDT: 0 rows, 0 frames, wrapper true
  nothing: no bars frame carried a sentAt, so no minute was formed
```

`"bars": 0`, four drains, the last one empty. **A quiet system certifies the
wiring and nothing else**, and this is what that looks like side by side with
the loop.

### The verbatim frame, symbol list included

The instrument keeps the first `bars` frame **whole** on disk
(`.capture/sitting-4.9/bars-frame-verbatim-2026-10-12-06-42-29.json`), because
the instrument will be deleted and a conclusion is not evidence:

```json
{
  "now": 4174.9,
  "wall": 1791787354376,
  "kind": "frame",
  "url": "ws://localhost:3000/market-stream",
  "type": "bars",
  "sentAt": "2026-10-12T06:42:34.375Z",
  "bytes": 764,
  "n": 6,
  "symbols": ["DIA", "IWM", "QQQ", "SPY", "XLB", "XLC"],
  "barMinutes": ["2026-10-12T06:41"]
}
```

And one wide frame, as the JSONL log line it is, so the shape of a real
518-symbol row is on the record:

```json
{
  "at": "2026-10-12T06:42:45.594Z",
  "arm": "composition",
  "now": 7911,
  "wall": 1791787358112,
  "kind": "frame",
  "url": "ws://localhost:3000/market-stream",
  "type": "bars",
  "sentAt": "2026-10-12T06:42:38.104Z",
  "bytes": 5749,
  "n": 49,
  "symbols": [
    "XLE",
    "XLF",
    "XLI",
    "XLK",
    "XLP",
    "XLRE",
    "XLU",
    "XLV",
    "XLY",
    "A",
    "AAPL",
    "ABBV",
    "ABNB",
    "ABT",
    "ACGL",
    "ACN",
    "ADBE",
    "ADI",
    "ADM",
    "ADP",
    "ADSK",
    "AEE",
    "AEP",
    "AES",
    "AFL",
    "AIG",
    "AIZ",
    "AJG",
    "AKAM",
    "ALB",
    "ALGN",
    "ALL",
    "ALLE",
    "AMAT",
    "AMCR",
    "AMD",
    "AME",
    "AMGN",
    "AMP",
    "AMT",
    "AMZN",
    "ANET",
    "AON",
    "AOS",
    "APA",
    "APD",
    "APH",
    "APO",
    "APP"
  ],
  "barMinutes": ["2026-10-12T06:41"]
}
```

**And the three socket rows, which are _count by URL_ doing its job on a dev
page**, verbatim:

```json
{"at":"2026-10-12T06:42:45.593Z","arm":"composition","now":200.4,"wall":1791787350401,"kind":"socket","url":"ws://localhost:5173/?token=ontphKdbcOw9","ours":false}
{"at":"2026-10-12T06:42:45.594Z","arm":"composition","now":437.1,"wall":1791787350638,"kind":"socket","url":"ws://localhost:3000/market-stream","ours":true}
{"at":"2026-10-12T06:42:45.594Z","arm":"composition","now":443,"wall":1791787350644,"kind":"socket","url":"ws://localhost:3000/market-stream","ours":true}
```

Three sockets, **one of them Vite's HMR connection** — the exact shape that cost
Task 3.11.2 a suppression, two documents and a task — and the two
`/market-stream` rows 6 ms apart are the `StrictMode` open/close pair Task
3.11.2 re-measured. The summary's `sockets` list is keyed on **URL**, so it
reports two entries for three events, which is the rule stated as an output.

### What the dry run proved, and what it could not

**Proved:**

1. **The drain loop**, not only the wiring: four drains, frames in all four,
   against a quiet-system control in which the fourth drain is empty.
2. **Count by URL**: a non-product socket present, recorded, and excluded.
3. **The wrapper survives `routeWebSocket`** — `wrapperIntact: true` on every
   drain, which only holds because the route is registered before the init
   script.
4. **The composition analysis is exercised and falsifiable.** The furnished
   rotation delivers the four proxies in one frame on one rotation and one
   proxy on another, so the `waveOrStagger` verdict **could** have read either
   way and read `STAGGER`. A verdict that can only read one way proves nothing.
5. **`framesSpanningTwoBarMinutes": 0`**, so the per-minute grouping is sound on
   this feed.
6. **All three arms run against the deployed pair**, read-only, and exit 0.

**Could not:**

1. **Nothing about the real feed's composition.** The furnished rotation is
   something this task invented; `STAGGER` is a fact about the generator and
   **not** about Alpaca. The real answer does not exist until the sitting.
2. **The `feed`-rate reading taken pre-bell cannot tell the repair from the
   defect.** Measured against the deployed gateway at 02:45 EDT with the market
   shut: **2 frames in 75.0 s = 1.6 a minute**, 120 bytes each. That matches
   Task 4.7.7's ~1.4 expectation — but Task 4.1.6's **pre-market** median was
   also **2 a minute**, so a closed-market window reads the same either side of
   the repair. **Only an in-session window discriminates**, and that is written
   into the protocol beside the step.
3. **The two-tape note is not reachable today.** The deployed store answers
   `NVDA`/`1m`/one session with **390 bars and one `sip` source**,
   `retrievedAt: 2026-10-10T00:39:48.541Z` — the backfill. The two-feed state is
   mid-session only and expires with tonight's backfill.
4. **Nothing was watched by a person.** `LIVE-REHEARSAL.md` note 5's rule
   stands: this is an instrument, and an instrumented row does not satisfy
   `watched`.

**The first `feed` frame off the deployed gateway, verbatim** — 120 bytes:

```json
{
  "type": "feed",
  "version": 1,
  "sentAt": "2026-10-12T06:45:27.734Z",
  "feed": { "status": "live", "feed": "iex", "marketOpen": false }
}
```

Task 4.1.6's pre-repair frame was **119** bytes and identical but for
`"marketOpen": true`, which is one character shorter. The byte figure carries
across.

**And one observation nobody asked for, recorded rather than chased.** On the
deployed `/` the page received **3 `snapshot` and 3 `overview` frames** on one
connection. Task 4.1.6 established that one connect plus one subscribe produces
**two** snapshots; three means the landing page sends a second readable
`subscribe`, and the gateway does not compare symbol sets. It is free and
harmless at this cadence and it is not this task's.

### The protocol

**It lives in [`planning/epic-04-market-overview/THE-SITTING.md`](../THE-SITTING.md)**,
not in this task file — the owner must be able to find it at 21:25 without
reading a task record. It is also pointed at from
[`LIVE-REHEARSAL.md`](../../epic-03-live-market-data/LIVE-REHEARSAL.md), directly
above the ledger whose six `OPEN` rows it fills, because that is the file
somebody opens when they think about a sitting.

Nine steps, **ordered by what expires soonest and what is cheapest**:

1. **Story 4.5's external check** — ten tickers and ten percentages against any
   public market screen, fifteen seconds. First because
   `LIVE-REHEARSAL.md` says in as many words that it is, and because it is the
   only genuinely **external** check this epic has ever had available: it is the
   one step that can catch an aggregate being quietly wrong.
2. **The two-tape source note** — the one item that **expires that night**
   rather than with the session. One command after 10:00 ET, then a photograph
   the moment the verdict says two tapes.
3. **Start the frame-composition log and leave it running** — expires with
   every session, costs nothing while it runs, and the step says to go to step 4
   rather than watch it.
4. **The `feed`-frame re-count** — 75 s, one command, with the ~1.4 expectation,
   the _anything near 300 is the defect returned_ line, and the warning that a
   pre-bell reading cannot discriminate.
5. **The four regions watched** — 4.2, 4.3, 4.4 and the half of 4.5 step 1 did
   not cover, each with the judgements only a person can return. **The proxy
   step says which of two things to note**: four marks in **one** frame is a
   synchronised wave, four across several is a stagger the data genuinely has —
   with step 3's `waveOrStagger` as the corroboration.
6. **Story 4.6's row** — the twenty-four destinations, by pointer and by
   keyboard, including the sector row that opens its **benchmark ETF**.
7. **Story 4.8's row** — the cadence, and whether the screen stays smooth.
8. **The adversarial one** — pull the laptop's network, and watch whether a
   **frozen count** is noticed by somebody not told to look. Near the end
   because it destroys steps 5 and 7's evidence.
9. **The phone** — Task 4.7.10's eight steps, **referenced and not rewritten**,
   with the two conditions that are easy to lose restated (cellular rather than
   Wi-Fi; the tab must be cold).

### Three things in the brief and the inputs that were wrong

1. **`LIVE-REHEARSAL.md` has no row for Story 4.6 at all.** The brief calls it
   "Story 4.6's ninth row"; the ledger has six Epic 4 rows — 4.2, 4.3, 4.4, 4.5,
   4.7, 4.8 — and Story 4.6 is the only visible Epic 4 story with no row. Its
   own close should have added one. The protocol covers it as step 6 and says
   the row must be **created** rather than filled; adding an empty row to
   somebody else's ledger was left to Task 4.9.8 rather than done quietly here.
2. **Grouping frames by the minute they were sent in is the one key that cannot
   work**, and the first draft of this instrument used it. Task 4.1.6 measured
   that bars land in second `:00` — 1,734 of 1,746 frames in the five minutes
   from 14:00 UTC — so `sentAt`'s minute splits a single burst across two
   minutes at the one instant it is guaranteed to straddle. Keyed on each bar's
   own `startsAt` now, which is this repository's standing rule for a window
   over bars and which the brief's inputs did not say.
3. **Two defects of this instrument's own, both found by the dry run rather
   than by reading it.** A furnished `setInterval` cleared only from
   `ws.onClose` outlived `browser.close()`, so the process never exited and had
   to be killed — `furnishedFramesSent` read **22** against **19** received,
   which is the leak counting itself. And the arm list was parsed as _every
   argument not starting with `--`_, which made `http://localhost:5173` an arm:
   the set was then non-empty, the defaults did not apply, and a run with only
   flags would have executed **no arm at all** while printing a header saying it
   had. Both repaired; the second is a refusal with an exit code now.

### Gates

Exactly what was run, and what it said.

**`pnpm verify` — EXIT 1, and the two files it fails on are not this task's.**
Verbatim:

```text
$ eslint . --max-warnings 0
$ prettier --check .
Checking formatting...
[warn] planning/epic-04-market-overview/story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md
[warn] planning/epic-04-market-overview/story-09-the-rehearsal-the-sweep-and-the-epic-close/TASK-07-the-suites-verdict.md
[warn] planning/epic-04-market-overview/THE-SITTING.md
[warn] Code style issues found in 3 files. Run Prettier with --write to fix.
```

`THE-SITTING.md` was this task's and was formatted; `STORY.md` and
`TASK-07-the-suites-verdict.md` are Story 4.9's own file and Task 4.9.7's, both
being written in parallel with this task, and **they were deliberately left
alone** — reformatting somebody's prose while they are editing it is how a
concurrent change gets lost. `prettier --check .` re-run afterwards names those
two and nothing else:

```text
Checking formatting...
[warn] planning/epic-04-market-overview/story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md
[warn] planning/epic-04-market-overview/story-09-the-rehearsal-the-sweep-and-the-epic-close/TASK-07-the-suites-verdict.md
[warn] Code style issues found in 2 files. Run Prettier with --write to fix.
```

**So every other step of the chain was run by name instead of taken on trust**,
and each one is green, verbatim:

```text
$ pnpm lint        → eslint . --max-warnings 0        (no output, exit 0)
$ pnpm stories     → 42 components, 42 stories files.
$ pnpm env:check   → 16 backend variables documented, frontend example clean.
$ pnpm links       → 528 documents, 1724 cross-file links, 39 anchor links, 0 broken.
$ pnpm invariants  → 54 invariants hold.
$ pnpm coverage:check → backfill coverage: this system stores 1m, 1d; the
                        scheduled run fills 1d, 1m.
$ pnpm test        → shared 22 files / 440 tests, backend 50 / 1045,
                     frontend 86 / 1413 — all passed
$ pnpm test:process → 2 files, 55 tests passed
```

**`Unhandled Errors`: none.** `pnpm test`'s output was grepped for the word and
the count is **0** — read rather than inferred from the exit code, because an
unhandled error is not a failed assertion and a run carrying one can still exit 0.

**`prettier --check`** on this task's own five files — the two scripts, this
task file, `THE-SITTING.md` and `LIVE-REHEARSAL.md` — `All matched files use
Prettier code style!`

**The dry run**, three executions, all exit 0: the furnished arm (above), the
local `feed-rate`/`source-note` pair, and all three arms against the deployed
pair.

**The `--furnished` refusal**, exercised against the deployed origin: exit 1
with the message quoted above, before any request was made.

**Not run, and why.** `pnpm e2e` — ~5 minutes, nothing in this change is in its
scope (no spec, no component, no layout), and it drives this 8-core machine from
3 to 28 load by itself, which would corrupt the dry run's own arms.
`pnpm test:database` — no data-layer file is touched. Load average read
**before** each heavy job and never during one: 3.91, 2.10, 1.95.

---

## For a stakeholder — a status report, 2026-10-12

**What this was for.** Three facts about MarketPulse can only be observed while
the US market is actually trading, and every day that passes without somebody
looking is a day they are not known. Tonight's session opens at 21:30
Singapore time. This task built the measuring tool and the checklist so that
the evening is spent **looking at the product** rather than debugging a script.

**What now exists.** One command that takes everything a machine can take:
which securities arrive together in each burst of prices, how chatty the server
is to each connected browser, and whether the stored price history can show
that it came from two different market feeds. It writes a log you can go back
to, and it is read-only — it watches the live site and cannot change anything
on it.

**What was proved before the bell.** The tool was driven against a simulated
price feed at the real rate — about sixteen bursts a minute — and it correctly
picked up every burst across four consecutive readings. That matters because
the predecessor tool had a flaw that made it stop collecting after the first
reading, and against a quiet market a broken tool and a quiet market look
identical. We now have the quiet-market version beside the busy one, so the
difference is on the record rather than assumed.

**What it already told us, with the market shut.** The live site is up and
answering. The server now sends a browser about **1.6 status messages a
minute**; before a repair made yesterday it was sending roughly **332**, which
worked out at about 15 MB per browser per trading day of messages carrying no
new information. The new figure matches what the repair predicted — but it has
to be re-taken while the market is open to count, because a shut market reads
the same either way. That is written into tonight's checklist.

**The checklist.** Nine steps in the order of what disappears soonest and what
costs least. It starts with the only check in this whole epic that compares our
numbers against the **outside world** — our ten biggest movers against any
public market screen, fifteen seconds — because every other check compares the
product against itself. It ends with a reading on a real phone on a mobile
network, including taking the network away mid-read to see whether a stale
number is noticed.

**What is still owed, plainly.** Nobody has yet watched this screen's numbers
move against the real market. Six entries in the project's rehearsal log still
say OPEN, and a tool reporting that something worked is explicitly not accepted
as a substitute for a person looking. Tonight is the sitting that closes them.
