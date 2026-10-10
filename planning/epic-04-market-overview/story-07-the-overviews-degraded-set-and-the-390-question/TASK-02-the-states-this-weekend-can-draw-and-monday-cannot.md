# Task 4.7.2 — The states this weekend can draw, and Monday cannot

**Status:** **Complete — 2026-10-10. Seven states, four widths, greyscale at every width — 56 photographs, two identical runs. The row that expires was taken first, at 11:12 EDT on a Saturday with the masthead reading `CLOSED · Weekend`, and what tells it apart from a stopped feed mid-session is the masthead and nothing else: three states' five content surfaces are BYTE-IDENTICAL at every width and separate only on the two footer cells. Two of the brief's own descriptions of the terminal no-frame state are wrong — the four regions each say a sentence rather than falling silent, and the footer reads `STALE` rather than `LIVE` — and the 928-byte CI aggregate holds FOUR `unknown` figures, not 518.**
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.1

## Objective

**One axis of this story's grid is producible today and unproducible from
Monday morning**, because the masthead reads the real wall clock — which is
Task 3.10.9's own recorded fifth instrument limitation.

## What the user can see when this lands

**Nothing.** It is the row the previous grid could not take.

## Work

### Why today

**`market shut × feed stopped`** needs the masthead to say the market is shut,
and the masthead reads the wall clock rather than a frame. 2026-10-10 is a
Saturday and `market-calendar.ts` has no October exception, so the next regular
session is **Monday 2026-10-12 09:30 ET**. **Three of Task 3.10.9's nine states
were told apart by the chrome alone, and two of those three would have been
told apart by two surfaces on a genuinely shut market — which that instrument
could not produce.**

### The states to take, and all of them are free

- `overview` absent **before** the 2,000 ms floor — every cold load.
- `overview` absent **after** the floor, terminal — **the screen's worst state,
  and it is in no grid.** Four regions silent, the strip saying `No prices
yet.`, the footer reading `LIVE` for 165 s.
- **518 `unknown`, `measured: 0`, `eligible: 0`, two empty lists, `observedAt`
  absent** — 928 bytes, **free on every gated run**, and the one state nobody
  has photographed because **its new source-note clause is an absence** and
  absences are what photographs are worst at.
- Closes present, nothing observed — a populated store with no provider,
  2,042 bytes.
- The session basis — 3,142 bytes.
- `market shut × feed stopped`, **the row that expires**.
- The backend unreachable, where the status bar **grows four wrapped lines to
  six at 390**.

### At four widths and in greyscale, and greyscale at every width

Story 4.2's grid greyscales **1440 only**. **The 390 column is where the
degraded sentences are longest**, and the price palette differs by **1.04:1** in
greyscale — four greyscale simulations once passed against a chart that was
wrong.

### Read the page, not the document

`/` re-renders **13.6–32.2 times a minute** in every degraded state, so a state
photographed twice may differ only in which render was caught. Settle the text
before reading it, and **exclude the masthead**: its clock mutates every second,
which is why `overview-instrument.mjs` refuses `document.body` as a target.

## Done when

1. Every state above produced through the harness, at 1440 / 1024 / 768 / 390,
   **greyscale at every width**
2. `market shut × feed stopped` taken **before Monday's open**, with the date
   and the masthead's own words in the record
3. The terminal no-frame state and the `observedAt`-absent state both
   photographed, with the absence stated rather than shown as a gap
4. Each row's text read from a settled page with the masthead excluded, and the
   per-surface strings recorded

---

## Handed here by Task 4.7.1 — 2026-10-10: the harness, the verbs, and one trap that produces a plausible wrong screen

Written here rather than linked, because a pointer is what a reader follows
when they already know to look.

**1. `serveFeed` can now hold an outage and serve the aggregate.** Four
additions, all in `e2e/support/feed.ts`:

| Verb or option                 | What it does                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `overview: WireMarketOverview` | sent **beside the snapshot** on every connect — `sendSnapshot`'s own sequence |
| `sendOverview(overview)`       | a later broadcast, as the gateway does once per applied batch                 |
| `overviewOnReconnect: …`       | a different, **poorer** aggregate for every connection after `drop()`         |
| `reconnect: "refused"`         | every connection after `drop()` is closed, so `disconnected` is **held**      |

`reconnect` defaults to `"served"`, which is the behaviour every existing spec
was written against.

**2. The trap, because it produced a screen that reads exactly like a
finding.** The first draft keyed both reconnect behaviours on `connections > 1`.
**A cold page opens more than one socket before anything is dropped** — React's
`StrictMode` double-invokes the effect in development, so a dev page opens one
socket plus an open/close pair about 25 ms apart. The **surviving** socket was
therefore connection 2 and got the reconnect behaviour: the refusal killed the
only socket the page kept, and the poorer aggregate was served on the **first**
paint. What appeared was `No prices yet.` and four `None stored` cells — a
state this product really has, drawn for a reason that was entirely the
instrument's. Both now key on **`drop()` having been called**, which is also
the honest model: a real outage is _the far end is gone from now on_.

**So do not count connections to decide anything about a state**, and
`connections()` is published precisely so a photograph can record how many
sockets its own page opened rather than assume one.

**3. The first produced connection state on `/` exists**, in
`e2e/specs/overview-held-outage.spec.ts` — three tests, 11.7 s, green. Its
`feed.drop()` + `reconnect: "refused"` arm is the drive your
`feed stopped × market shut` row needs; the masthead is still the wall clock's
and nothing here changes that.

**4. A `/\blive\b/iu` negative assertion on the footer cannot hold in a
dropped state.** The shipped sentence _is_ `The live feed is not connected.`,
so the word is present in exactly the state it was meant to forbid. Compare the
cell's whole text either side of the retry instead — that is what the held-
outage spec does, and it is a stronger claim.

---

## What was done — 2026-10-10

**Seven states, four widths, greyscale at every width — 56 photographs** at
`.capture/overview-degraded/`, with `readings.json` carrying **seven** surfaces
per state per width (the four regions, the source note, and **both** footer
cells). Every state produced through Task 4.7.1's harness and the shipped
encoder. The producer was a throwaway spec, `e2e/specs/degraded-grid-producer
.spec.ts`, run twice and deleted; the photographs and `readings.json` are the
artefacts. `.capture/` is gitignored, which is why every row below is quoted
here rather than linked.

### The row that expires, taken first — `market shut × feed stopped`

**2026-10-10, 11:12 EDT, a Saturday.** The masthead's own words, read off the
page at all four widths:

```text
MarketPulse MARKET SITUATIONAL AWARENESS Market Overview Investigation
Workspace Security Explorer Market Replay Market time, US Eastern
11:12:37 ET CLOSED · Weekend
```

At **390** the descriptor is gone and the words are:

```text
MarketPulse Market Overview Investigation Workspace Security Explorer
Market Replay Market time, US Eastern 11:12:38 ET CLOSED · Weekend
```

So the two words that make this row unproducible from Monday are
**`CLOSED · Weekend`**, in the masthead, beside a wall clock nothing in this
suite can move. The feed half was produced by `feed.drop()` with
`reconnect: "refused"`, held across all four widths and proved held: the footer
was read before the retry and again after it and is **byte-identical**, with
`refusals 1, connections 3` on the harness's own counters.

**The feed cell in that state, verbatim and identical at all four widths:**

```text
MARKET FEED IEX Trades reported by the IEX exchange only — not the full US
consolidated tape. Market feed disconnected. The live feed is not connected.
No live prices have arrived yet. DISCONNECTED The live feed is not connected.
No live prices have arrived yet.
```

**What tells it apart from a stopped feed mid-session is the masthead and
nothing else.** Every surface this story owns — the four regions, the source
note, both footer cells — is identical in the two cases, because the aggregate
is the same aggregate and `marketOpen` reaches the chrome's feed cell in no
word of it. `MarketSessionStatus` (the masthead) and `FeedStatus` (the status
bar) are two facts at opposite corners of the viewport, and on this screen the
whole distinction between _the market is shut_ and _the feed has stopped_ is
carried by them jointly. At 390, where the masthead's session word is in the
top-right corner and the feed word is in the sticky bar at the foot, a reader
must read **both corners** to tell them apart. That is Story 4.7's 390 question
in its sharpest shipped form, measured rather than argued, and it is handed to
Task 4.7.10's sitting below.

### The grid, by state — 1440 unless a width is named

Quoted from `readings.json`. `(absent)` means the surface drew nothing at all.

**`01-no-aggregate-before-the-floor`** — the socket answered, no `overview`
frame, read inside `SAY_NOTHING_ARRIVED_AFTER_MS` (2,000 ms). Produced at each
width by its own load, and the read is only pre-floor because the assertion
`not.toContain("No prices yet.")` held at all four:

```text
Market proxies     : Market proxies
Sector performance : Sector performance
Market breadth     : Market breadth
Movers             : Movers
source note        : (absent)
feed cell          : MARKET FEED IEX Trades reported by the IEX exchange only
                     — not the full US consolidated tape. STALE Connected, and
                     no live prices have arrived yet.
service cell       : BACKEND SERVICE HEALTHY
```

**`02-no-aggregate-after-the-floor`** — the same drive, after the floor. **The
brief's description of this state is wrong in two ways and both are the
product being better than the brief**:

```text
Market proxies     : Market proxies No prices yet.
Sector performance : Sector performance No sector moves yet.
Market breadth     : Market breadth No count yet.
Movers             : Movers No moves to rank yet.
source note        : (absent)
feed cell          : MARKET FEED IEX … STALE Connected, and no live prices
                     have arrived yet.
service cell       : BACKEND SERVICE HEALTHY
```

The four regions are **not silent** — each says its own sentence, in its own
vocabulary — and the footer does **not** read `LIVE`: it reads **`STALE`**,
from the first paint, because `feedStatusFrom` returns `stale` on an **absent**
last observation rather than after 60 s of wall clock. The `LIVE for 165 s`
this story owns is the state where observations **arrived and then stopped**,
which is a different row. (`.capture/proxy-states/readings.json` agrees — its
rows 01 and 02 carry the same `STALE` — so the error is the brief's, not a
change.)

**`03-ci-shape-nothing-at-all`** — four `unknown` proxy figures, eleven
`unknown` sectors, `measured: 0`, `eligible: 0`, two empty lists, **`observedAt`
absent**:

```text
Market proxies     : Market proxies SPY None stored QQQ None stored DIA None
                     stored IWM None stored No prices stored for these four yet.
Sector performance : Sector performance NOT RANKED — Technology XLK None stored
                     — Industrials XLI None stored … — Utilities XLU None stored
                     Each row is the sector’s benchmark ETF — capitalisation-
                     weighted, not the average of its members
Market breadth     : Market breadth OF THE 503 WE TRACK Not heard from 503 Of
                     the 503 companies we track, none were heard from in the
                     last 5 minutes.
Movers             : Movers GAINERS LOSERS Of the 503 companies we track, none
                     were heard from in the last 5 minutes. There is nothing to
                     rank.
source note        : (absent)
feed cell          : MARKET FEED IEX … STALE Connected, and no live prices have
                     arrived yet.
service cell       : BACKEND SERVICE HEALTHY
```

**The absence is stated rather than shown as a gap**: `readings.json` records
`"source note": null` for all four widths, which is the honest reading of _the
note drew nothing_. In the photograph the same fact is **six hundred pixels of
nothing** between the last region and the foot of the page, and there is no
way to tell that from a note that failed to render — which is exactly why the
string is the record and the picture is the illustration. Two further voids
worth naming, both shipped and both by decision: `Market breadth` draws ~250 px
of empty ledger above its two-line footer, and `Movers` draws `GAINERS` and
`LOSERS` over ten invisible held pads.

**`04-closes-present-nothing-observed`** — the recorded shape of
`.capture/movers-snapshot/overview-frame.json`, figure for figure, served with
`feed: null`:

```text
Market proxies     : Market proxies SPY 764.29 QQQ 714.88 DIA 525.79 IWM 288.89
                     2026-09-11 · closing prices
Market breadth     : Market breadth NET ADVANCING ▲ up +169 Advancing 335
                     Declining 166 Unchanged 2 0 503 OF THE 503 WE TRACK No
                     prior close 0 Close to close on 2026-09-11. Of the 503
                     companies we track, 503 had a close-to-close move on
                     2026-09-11.
source note        : CLOSING PRICES All US exchanges
feed cell          : MARKET FEED NOT CONFIGURED No market-data provider is
                     configured.
service cell       : BACKEND SERVICE HEALTHY
```

**`05-session-basis-observed`** — four observed proxies over a session-basis
breadth and movers:

```text
Market proxies     : Market proxies SPY 774.03 ▲ up +0.42% QQQ 601.88 ▲ up
                     +0.61% DIA 525.79 ▼ down −0.18% IWM 288.89 ▲ up +0.07%
                     Sep 16 · 14:01 EDT · change from 2026-09-15's close
source note        : CLOSING PRICES All US exchanges Every change above is
                     measured from one of these. OBSERVED THROUGH Sep 16 ·
                     14:01 EDT
feed cell          : MARKET FEED IEX Trades reported by the IEX exchange only —
                     not the full US consolidated tape. LIVE
```

This is the row that carries Task 4.8.12's new clause, photographed:
`OBSERVED THROUGH Sep 16 · 14:01 EDT`, and no `COMPUTED` anywhere on the
screen.

**`07-backend-unreachable-feed-stopped`** — `/health` refused from before the
first paint, then the feed dropped and the retry refused:

```text
feed cell    : MARKET FEED IEX Trades reported by the IEX exchange only — not
               the full US consolidated tape. Market feed disconnected. The
               live feed is not connected. No live prices have arrived yet.
               DISCONNECTED The live feed is not connected. No live prices have
               arrived yet.
service cell : BACKEND SERVICE UNREACHABLE No response from the service. No
               successful check yet.
```

Three `/health` requests were aborted, counted at the route. Every region kept
its figures and `expectNothingFailedToRender` held in all seven states.

### What differs across widths, which is three things and no more

The five content surfaces are **identical at 1440, 1024, 768 and 390** in every
state except for:

1. **The sector ladder's tick labels** — `−2% −1 0 +1 +2%` at 1440 and 768,
   `−2% 0 +2%` at 1024, and **no ladder at all** at 390 (`· bars to ±2%` goes
   with it).
2. **The movers' price column**, dropped at 390 by design — `1 HPE Hewlett
Packard Enterprise Company ▲ up +12.44%` against `… 62.09 ▲ up +12.44%`.
3. **The masthead's descriptor**, absent at 390.

Nothing else moves. No sentence in any degraded state is longer at 390 than at
1440 — the degraded prose is in the footer, and the footer's response to width
is **height** rather than different words.

### The footer's own ladder at 390, measured

The one quantity on this screen that **does** change with the state, measured
as the sticky bar's own box in each produced state (two runs, identical):

| state                          | 1440 | 1024 | 768 | 390     |
| ------------------------------ | ---- | ---- | --- | ------- |
| `NOT CONFIGURED` + `HEALTHY`   | 33   | 33   | 53  | **73**  |
| `LIVE` + `HEALTHY`             | 33   | 33   | 53  | **109** |
| `STALE` + `HEALTHY`            | 35   | 55   | 75  | **131** |
| `DISCONNECTED` + `HEALTHY`     | 35   | 75   | 75  | **149** |
| `DISCONNECTED` + `UNREACHABLE` | 55   | 75   | 75  | **169** |

**At 390 the bar grows 109 → 149 px when the feed stops, and 109 → 169 px when
the backend goes too** — +40 px and +60 px of a 780 px viewport, 5.1% and 7.7%.
That is the measured version of Task 4.1.7's _four wrapped lines to six_, and
it is **a height rather than a line count**: nothing in this instrument counts
wrapped lines, and `innerText` is identical however the sentence wraps. The
growth is also **not monotonic in severity at 1440** — `DISCONNECTED` is 35 px
there, two pixels over healthy — so the size signal the 390 argument rests on
exists at 390 and 1024 and essentially does not exist at 1440.

### Whether any two states read identically — yes, a triple, at every width

Compared as strings over the five content surfaces, **three states are
byte-identical at all four widths**:

- `04-closes-present-nothing-observed`
- `06-market-shut-feed-stopped`
- `07-backend-unreachable-feed-stopped`

Over all **seven** surfaces no two states collide, because the two footer cells
separate them. This is ADR 0029's one-home rule working rather than a gap —
Task 4.2.8 documented the same shape as a **pair** told apart by the chrome
alone — and what is new is that this triple contains **two connection states**
rather than two data states. The consequence for Task 4.7.9, which owns the
comparison: **a collision-class assertion over `main` alone will go red on this
triple, correctly**, and the claim it should encode is _no two states collide
across the chrome **and** the content_, not _no two states' content differs_.

No other pair collides, at any width, in colour or in greyscale.

### The gates, and what the production proves

- Two complete runs of the producer, **28 rows each, byte-identical across all
  seven surfaces and all five footer heights** — so the 13.6–32.2 renders a
  minute this screen performs against a real gateway do not reach a settled
  harness-driven page, and a row photographed twice is the same row. The
  settle rule was two reads 300 ms apart agreeing; every row except the six
  deliberate pre-floor ones settled on the first comparison.
- **The plant, per channel, per state**: `connections()` (counted by URL),
  `overviews()`, `refusals()`, and a figure or sentence asserted on screen
  before any photograph was taken. The two held-outage states additionally
  assert the footer is byte-identical either side of the refused retry, which
  is what distinguishes _the retry was refused_ from _the page stopped
  retrying_.
- Greyscale at every width: `▲`/`▼` plus the signed percentage carry every
  direction on the strip, the sector ladder and both mover lists. Nothing in
  any state depends on hue.

### Found, owned by somebody else

1. **`STORY.md` and this brief both describe CI's 928-byte aggregate as "518
   `unknown` figures", and the frame has four.** Measured here: the CI-shaped
   aggregate built from the shipped types — four `unknown` proxy figures,
   eleven `unknown` sectors, `measured: 0`, `eligible: 0`, `observedAt` absent
   — is **841 bytes**, against 928 recorded off the real gateway. 518 unknown
   figures would be roughly **21 KB**. The 518 (and the 503) are the
   **population the breadth and movers sections count over**, carried as
   `tracked`, and `overview-frame-sections.spec.ts` asserts `figures` holds
   exactly four. The arithmetic is the proof the sentence cannot be read
   loosely. Owner: Task 4.7.11's sweep, with Story 4.8's own close as the
   origin.
2. **The no-aggregate state reads `STALE`, not `LIVE`** — above. Any decision
   about a browser-side threshold that reasons from _the footer says `LIVE`
   while nothing has arrived_ is reasoning about a state this screen does not
   have. Owner: Task 4.7.7, which owns the threshold's derivation.
3. **A full-page screenshot draws the sticky footer across the middle of the
   page.** Every photograph here shows the status bar overlapping content at
   roughly one viewport height down. It is an artefact of `fullPage` against
   `position: sticky` and **not** a defect; it is written down because it reads
   exactly like one, and Task 4.7.9's grid will produce it again.

### Handed sideways

The constraint Task 4.7.9 needs is written into its own file rather than
linked.

## Done when — verdict

1. **Every state produced through the harness at 1440 / 1024 / 768 / 390,
   greyscale at every width** — seven states, 56 photographs at
   `.capture/overview-degraded/`, each with its plant proved per channel.
2. **`market shut × feed stopped` taken before Monday's open**, 2026-10-10 at
   11:12 EDT, with the masthead's own words — `Market time, US Eastern
11:12:37 ET CLOSED · Weekend` — and the 390 spelling beside it.
3. **The terminal no-frame state and the `observedAt`-absent state both
   photographed, with the absence STATED**: `readings.json` records
   `"source note": null` rather than leaving the picture to say it, and the
   record names the three voids a photograph of that state contains.
4. **Each row read from a settled page with the masthead excluded from the
   comparison**, per-surface strings recorded for seven surfaces — and the
   settling proved rather than asserted, by two complete runs agreeing
   byte for byte on all 28 rows.
