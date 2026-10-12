# The sitting — Epic 4, the protocol for one evening

**Written 2026-10-12 by [Task 4.9.1](story-09-the-rehearsal-the-sweep-and-the-epic-close/TASK-01-the-sittings-instrument-dry-run-before-the-bell.md).
For the session opening 21:30 Asia/Singapore / 09:30 ET.**

**This is the file to open at 21:25 with a phone in one hand.** It is ordered by
**what expires soonest and what is cheapest**, not by story number. Everything
mechanical is in one command; everything else is a person looking.

The rows it fills are in
[`LIVE-REHEARSAL.md`](../epic-03-live-market-data/LIVE-REHEARSAL.md) — **seven**
of them say `OPEN` tonight. It read `six` until 2026-10-12: Story **4.6** had no
row in that ledger at all, which Tasks 4.9.2 and 4.9.4 found independently on
the same day by going to **use** the list rather than by reading it. Its row is
step 6 below. **Note 5 of that file is the rule and it is not
negotiable here: an instrumented row does not satisfy the word _watched_.** The
instrument below takes everything a machine can take so that the evening is
spent looking.

---

## Step 0 — FREEZE MERGES, and this is not housekeeping

**Added 2026-10-12 by Task 4.9.9, after checking the deployed pair.** Every
merge to `main` runs `verify`, and `deploy.yml` keys on `workflow_run` of
`verify` completing — so **every merge replaces the deployed backend image.**
Three deploys fired on 2026-10-12 alone, and the deployed backend's uptime read
**553.5 s** because of the last one.

**What that does to this sitting, specifically:**

- **Every open socket is dropped** with `1001 going away`, so the browser
  reconnects in 500 ms — which is the shipped behaviour working, and which
  **breaks the continuity of the frame-composition log.** The one measurement
  here that cannot be retaken is a _per-frame symbol list over a continuous
  session_; a restart in the middle of it leaves two partial logs and no way to
  tell a vendor gap from a deploy.
- **It holes the store.** `live-bar-writer.ts` hangs off the live stream inside
  the image about to be replaced, for six and a half hours a day — so a deploy
  mid-session loses the minutes it was writing. That is an existing
  `docs/GAPS.md` entry, and tonight it would be self-inflicted.

**So: land everything before the bell, and merge nothing between 21:30 and the
close.** If something must go in mid-session, say so first — the right answer is
usually to wait, because the session is the thing that cannot be repeated and a
merge always can.

**Check the pair before you start** (read-only, about ten seconds):

```sh
E2E_DEPLOYED_BACKEND_ORIGIN=https://marketpulse-backend.blackgrass-e682fefb.eastus.azurecontainerapps.io \
E2E_DEPLOYED_BASE_URL=https://red-smoke-029583a0f.5.azurestaticapps.net \
  node scripts/check-deployed.mjs
```

A healthy pre-bell reading, taken 2026-10-12 at 16:40 +08 (04:40 ET):

```
  ✓ backend   /health  0.0.0, up 553.5s
  ✓ frontend  /        document and 2 assets served together
  ✓ store     /diagnostics/freshness  1m=current; 1d=current
  ✓ feed      /diagnostics/feed  market closed; provider=alpaca status=live observedAt=null
```

**`status=live` with `observedAt=null` is correct before the open** and is not a
fault: the provider is connected and nothing has been observed yet. **If
`observedAt` is still `null` fifteen minutes after the bell, that is the
sitting's first finding** rather than a reason to stop.

---

## Before the bell — two minutes, done once

```sh
# 1. The pair is not needed. Both arms drive the DEPLOYED product, read-only.
#    Nothing here writes to the deployment and nothing synthetic reaches it.
corepack enable && pnpm install && pnpm build   # only if the tree is cold

# 2. Prove the instrument still runs, with the market shut. ~2 minutes.
node scripts/sitting-frames.mjs all --minutes 1 --drain 15000
```

What a healthy pre-bell run says: `wrapper true` on every drain, exactly **one**
socket with `"ours": true`, `feedFrames` **1–2** in 75 s, and
`"bars": 0` — there are no bars because the market is shut, and that is the
rehearsal rather than the reading.

---

## 1. The external check — fifteen seconds, and take it FIRST

**Why first:** `LIVE-REHEARSAL.md`'s Story 4.5 row says in as many words that
this is the item to take first, and it is the **only genuinely external check
this epic has ever had available**. Every other row checks the product against
itself or against one number. Ten tickers and ten percentages is a **list**, and
a list is checkable against any public market screen.

1. Open `/` on the deployed site. Let `Movers` fill.
2. Photograph or screenshot the two lists — **five `GAINERS` and five
   `LOSERS`**, with their tickers and percentages.
3. Open any public market screen (a broker app, a finance site) on its own
   day-gainers / day-losers list.
4. **Write down how many of our ten appear on theirs, and whether any
   percentage disagrees by more than a rounding.** Expect disagreement on
   membership — our population is 503 curated names and ours is _the part of the
   market we heard from in the last five minutes_ on IEX — but a **percentage**
   that disagrees for a ticker on both lists is a real finding.
5. Read the region's own denominator sentence and record whether it reads as a
   **fact about our reach** or as an apology.

**This is the one check that can catch an aggregate being quietly wrong**, which
is the thing Story 4.9's own description says nothing mechanical can catch.

---

## 2. The two-tape source note — EXPIRES TONIGHT

**Why second:** it is the only item in this whole list that **expires that
night** rather than with the session. A served window's `sources` describe the
rows the _answer_ contains, the read prefers `sip` where a minute holds both
tapes, and the nightly backfill covers every regular-session minute — so the
two-feed note exists **between the bell and that night's backfill and nowhere
else**. It has never been photographed from a deployed store. Owner: Task
3.8.10.

1. Any time after **10:00 ET** (give the live writer half an hour of minutes):

   ```sh
   node scripts/sitting-frames.mjs source-note --symbol NVDA
   ```

   A `"TWO TAPES: sip then iex"` verdict is the state. A `"ONE tape"` verdict
   means the session has not written a live minute into the served window yet —
   wait ten minutes and re-read.

2. **The moment it says two tapes, open `/securities/NVDA` and photograph the
   source note at the foot of the region group.** That is the photograph: `All
US exchanges` over `IEX`, with the one-venue sentence. It is gone by
   tomorrow morning.

---

## 3. Start the frame-composition log and leave it running

**Why here:** it costs nothing while it runs, and it **expires with every
session that passes** — no address, fixture, replay or pinned clock can produce
a frame's symbol list. Nothing in this repository has ever recorded frame
**composition**; three stories were told to size per-frame work against it and
all three had to assume.

1. Start it and leave the terminal alone:

   ```sh
   node scripts/sitting-frames.mjs composition --minutes 20 --route /
   ```

2. It prints one line per drain. **The only line that needs watching is
   `wrapper true`** — `false` means Playwright's own `WebSocket` overwrote the
   instrument's and the arm reports nothing rather than zero.

3. When it finishes it prints, and writes to `.capture/sitting-4.9/`:
   - **`waveOrStagger`** — the sentence Task 4.2.2 handed this story. **WAVE**
     means `SPY`, `QQQ`, `DIA` and `IWM` arrive in **one** frame, so four
     arrival marks fire together as a synchronised wave. **STAGGER** means they
     arrive across several, so the marks fire apart and the stagger is one the
     data genuinely has, arriving free.
   - `sectorEtfsPerBarsFrame` — **the eleven sector benchmarks in one frame or
     eleven**, which is the question three stories had to assume.
   - `perMinute`, keyed on each bar's **own** minute and never on the send
     instant, because bars land in second `:00`.

4. **Then go to step 4 while it runs.** Polling a log is the one thing that is
   never the next piece of work.

---

## 4. The `feed`-frame re-count — 75 seconds, one command

**Why here:** it needs the market **open** and nothing else, and until it is
taken `docs/GAPS.md`'s _Nothing counts the frames the gateway sends_ entry
stays amended rather than closed.

```sh
node scripts/sitting-frames.mjs feed-rate --seconds 75 --symbol NVDA
```

- Task 4.1.6 measured **310 frames in 75 s** from a client subscribed to one
  symbol, median **332 a minute** in session, 119 bytes each.
- Task 4.7.7 repaired the send site. **The expectation is ~1.4 frames** (the
  55 s keepalive) plus one per genuine change of the published view.
- **Anything near 300 is the defect returned.** Say so loudly; it is ~15.4 MB a
  session per attached browser.
- **A pre-bell reading cannot tell the repair from the defect.** Task 4.1.6's
  pre-market median was **2 a minute**, which is what a repaired gateway reads
  too. The reading only counts **in session**.

---

## 5. The four regions, watched — Stories 4.2, 4.3, 4.4

Done at a desk, on `/`, with the composition log running. Each is a judgement
only a person can return, and the `What was wrong` column is the column that
earns the ledger.

**Story 4.2 — `Market proxies`.** The first row in the ledger for a **derived**
figure: a proxy's change is computed, so the arithmetic can be wrong while every
input is right and the screen looks entirely normal. Watch that the four figures
move, that the shared basis line names a session that makes sense beside them,
and that **the arrival mark fires on the proxy that arrived and not on its
neighbours**. Then write down **which of two things you saw** — four marks
together, or four marks apart. Step 3's `waveOrStagger` is the corroboration; a
rehearsal that cannot say which cannot answer anything.

**Story 4.3 — `Sector performance`.** The first row where a **rank moves**. Three
things only a person can return: whether the 240 ms of stillness before the
travel **separates the two events or merely delays one**; whether eleven discs
firing together (243 ms p50 spread, so effectively simultaneous) read as a
**pulse or a flash**; and whether `ORDER HELD` is noticed at all by somebody
whose pointer has just landed on the region.

**Story 4.4 — `Market breadth`.** The first row for a **reduction**, where every
input can be visible and the output still wrong — the 503 securities the counts
are over are on no frame the page can see. Watch: whether the four rows **move
at all** during an ordinary session; whether `advancing` and `declining` move in
**opposite** directions as the tape turns, which a transposed bucket would not;
and whether the headline caption is seen **changing** as the net crosses zero
(that is a recorded reversal trigger — the caption seen changing more than once
in one sitting).

**Story 4.5 — `Movers`, the part step 1 did not cover.** Whether a re-order in
**two lists at once** reads as facts arriving or as a page refreshing; whether a
**member being replaced** under the eye is noticed; and whether a newcomer at
rank 1 reads as _a new leader_ or as _the list glitched_.

---

## 6. Story 4.6's row — twenty-four destinations, three minutes

**`LIVE-REHEARSAL.md` has no row for Story 4.6 and it owes one.** The story
shipped the landing page's twenty-four destinations and is the only visible
Epic 4 story with no row at all — add one when writing the evening up.

1. Open a **mover** row's ticker by pointer. It must reach that security's page.
2. Open a **sector** row's ticker. It opens the sector's **benchmark ETF** —
   the only row whose destination is not the thing it is named after. Confirm
   that reads as intended rather than as a wrong link.
3. **Do it while the lists are re-ordering.** The destination is resolved at
   render from the row's own identity, so the activation race is meant to be
   unrepresentable. A row that opens the wrong security is the finding.
4. Try one with the keyboard: Tab to the region, arrow within it, Enter. Arrows
   **clamp and do not wrap** — a ranking is not a ring.
5. Drag across a **price** to select it. It must not navigate: only the ticker
   token is activatable.

---

## 7. Story 4.8's row — the cadence, and whether the screen stays smooth

**This is the first row in the ledger that watches an instrument rather than a
screen**, and step 3's log is most of it. What a person adds:

1. Does `/` **stay smooth** while a real 16.1-batch minute arrives? Locally it
   is 3.7–5.1 ms a batch with zero long tasks, at a **furnished** cadence on one
   laptop. The deployed machine and the real composition are unmeasured.
2. Cold-load `/securities` on the deployed site. Its breach is a **frame of
   62.8–77.4 ms on 10 of 10 local loads**. Is it noticeable to somebody who was
   not told to look for it?
3. Record the **batches a minute** the log actually saw, beside
   `LIVE-DATA.md` §10.2's 6.8 / 8.8 / 16.1.

---

## 8. The adversarial one — pull the feed

**Why near the end:** it destroys the evidence for steps 5 and 7, and it is the
**single most valuable item on Story 4.4's row**. It does not need the market to
move.

1. With `/` open and figures on screen, take the **laptop's** network away.
2. Start a stopwatch. For **165 seconds** the status bar still says `LIVE` —
   that is the monotonic watchdog and it is a known `docs/GAPS.md` entry.
3. **Watch whether a frozen count is noticed by somebody who was not told to
   look for it.** Nothing on the breadth region says how old a count is, by
   decision (Task 4.4.6), and the only surface that says the feed stopped is
   the sticky bar at the foot of the viewport.
4. Give the network back and watch what the reconnect does to the figures.

---

## 9. The phone — eight steps, and they are written elsewhere

**Last, and it is one sitting rather than two.** `LIVE-REHEARSAL.md`'s Story 4.7
row is the ONE row Story 4.7 ships owing (AC 5b), and `EPIC.md` says it is owed a
**person** before this epic ships a screen.

**Perform the eight steps exactly as written in
[Task 4.7.10](story-07-the-overviews-degraded-set-and-the-390-question/TASK-10-the-sitting-on-a-real-phone.md)
— _The protocol, in this order, because each step destroys the next one's
evidence_.** They are not restated here, deliberately: a second copy of eight
steps is a second home for them, and the one in Task 4.7.10 carries the figures
each step needs beside it.

Two conditions that file states and that are easy to lose: **a real phone at 390
on cellular rather than Wi-Fi**, and **the tab must be cold** for the 2,000 ms
floor to mean anything (a reload reuses DNS and TLS and is not the case).

---

## Writing it up

- **One row per story in `LIVE-REHEARSAL.md`**, dated, with the session window
  and the surface, and `What was wrong` filled **honestly** — including
  "nothing moved for four minutes", which is an ordinary observation on a feed
  with 65.1% median per-symbol minute coverage.
- **Say which rows are a person's and which are the instrument's.** Note 5 of
  that file is the precedent and the two kinds do not substitute for each other.
- **A row written with figures nobody wrote down is a row about an inference.**
  If the evening was watching rather than recording, say so — that is what note
  5 says, and it is the more honest row.
- The instrument's own output lives in `.capture/sitting-4.9/` as a JSONL log,
  a summary and at least one `bars` frame kept **whole**. `scripts/sitting-frames.mjs`
  is a throwaway and is deleted at the epic's close, so **quote the bytes you
  need into the task file** — a findings section that records a behaviour
  without the frame that carried it is complete until somebody needs the
  evidence rather than the conclusion.
