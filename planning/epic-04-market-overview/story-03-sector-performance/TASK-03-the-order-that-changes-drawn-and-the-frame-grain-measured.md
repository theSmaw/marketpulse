# Task 4.3.3 — The order that changes, drawn — and the frame grain measured first

**Status:** **Complete — 2026-09-27. The answer is a WAVE and the frame count is not what decides it — §7.4's 243 ms p50 spread bounds the eleven from above, so all eleven discs are lit together for ~650 ms however many frames carried them. The two events are separated in TIME: 240 ms of stillness, then 240 ms of travel, the same token twice. A replay CANNOT answer a grain question, structurally.**
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.2

## Objective

**The re-order treatment moved here from Story 4.5 so it is decided on eleven
rows rather than a top-N over 518** — and it cannot be judged until one cheap
measurement is taken.

**The measurement is the prior question: do the eleven sector ETFs' bars arrive
in ONE `bars` frame, or across several of the ~16 a minute?** Four figures in one
frame is a **synchronised wave**; four across several is a **stagger the data
gives you free**. These are the eleven most liquid sector funds in the market, so
per-symbol coverage is near total and they will very likely land together — which
is the bad case. **A rehearsal that cannot say which of the two the watcher saw
answers nothing.**

And the risk this re-opens is one the canvas **accepted rather than disproved**.
`The mark multiplied by five hundred.dc.html` defends 518 simultaneous marks on
**rate**, and offers one perceptual reading — discs at full density read as
_"a vertical column that reads more like furniture than like events"_. **Neither
comfort reaches here**: the rate argument is about cost, and the texture argument
needs density that eleven rows do not have. Eleven discs in a vertical column
plus a whole-list re-order inside the same 240 ms is the gesture a page makes when
it reloads.

## What the user can see when this lands

**Nothing on the running product**, and one number written down that decides how
the next two tasks behave.

## Work

- **Measure the frame grain from the gateway, before drawing the treatment.**
  Print the evidence: **count by URL, never by event** — a browser page holds
  sockets that are not this product's, and a number with no URL beside it cannot
  tell them apart, which cost this repository a suppression, two documents and a
  task. And note the instrument trap from the same record: both browser-side
  instruments in `scripts/` drained their page buffer by **rebinding a global**
  while the page's wrapper kept pushing into the array it had closed over, so
  every drain after the first returned nothing and reported a silent socket on a
  healthy connection. Drain with `splice` in place. **Say which half the reading
  proves** — a measurement against a quiet system certifies the wiring and not
  the loop.
- **`The order that changes.dc.html`** — two events, one marked and one animated,
  and why a fourth mark was refused; the FLIP, one settle for the whole list, no
  stagger; the ordinal as the persistent record; reduced motion and what
  survives; the pointer/focus hold with `ORDER HELD`; several at once with the
  synchrony risk restated at eleven **against the measurement above**; and a live
  instrument — eleven rows, one minute, **1× by default** with 10×
  iteration-only and greyscale switches, the shape `Market proxies.dc.html` §05
  established.
- **The reversal trigger, as a condition**: _the first sitting in which a person
  reports the sector region as flashing or refreshing rather than as facts
  arriving._ And the lever named — **the disc goes, not the motion**, because a
  ranked list's aliveness is its order, where the strip needed the disc because
  four barely-changing figures need a _look_.

## Constraints handed to this task

- **Two events, and they are genuinely two.** A figure changing fires the shipped
  arrival disc, unchanged, on the shipped rule — _it fires when a bar arrives, not
  when the price changes_. A position changing is carried by **the movement**.
- **No fourth mark.** A mark saying _this row moved_ is information a reader can
  only use by remembering where it was, which is the thing they cannot do. The
  travel carries both positions; the printed ordinal is the record.
- **A row can mark without moving, and move without marking.** The second is the
  correctness argument: its neighbour's bar arrived and overtook it, and **this
  row received nothing** — so marking it with the arrival disc would claim data
  that did not arrive.
- **`--motion-duration-settle` (240 ms), not a new limb.** The token's own job is
  _"content arriving — long enough to be seen as an arrival and short enough that
  nobody waits for it"_, and a row that arrived somewhere new is content
  arriving. The vocabulary's three limbs describe what a **mark** does.
- **Transform only, and DOM order equals visual order.** Animating `top`, `order`
  or `grid-row` is per-frame layout on the page §28 can least afford it — and
  re-ordering with CSS while the DOM stays put hands a screen reader a
  **different ranking** from the one drawn, invisible to axe, to jsdom and to a
  screenshot.
- **Rows keyed by `symbol`, never by index**, or React rewrites nodes rather than
  moving them and destroys hover, focus and any in-flight decay.
- **Clear the transform without relying on `transitionend`.** Under reduced
  motion the token is `0 ms` and a zero-duration transition may not fire one,
  leaving a row stuck under a transform — the identical class of defect to the
  missing `opacity: 0` base, failing in the same direction: a reader who asked
  for less motion gets a permanently displaced row.
- **The hold is `stateMark`'s third consumer** — _a state PERSISTS_ — and the
  first time that limb has been used for something a reader caused.

## Done when

1. The frame grain is measured, with a frame quoted verbatim and its URL beside
   it, and the instrument deleted
2. The drawing says whether eleven marks plus a re-order is a wave or a stagger,
   **on the measurement rather than on reasoning**
3. Its instrument runs at 1× by default and honours `prefers-reduced-motion`
4. The reversal trigger is written as a condition, and names the disc as the
   lever
5. Reduced motion's surviving channel is drawn, not asserted

## Amended by Task 4.3.1 — 2026-09-27: your row height is load-bearing outside this task, and one number is currently a placeholder standing in for it

**A throwaway instrument set the sector region's filled height, and your design
replaces it.** Task 4.3.1 needed to know whether eleven rows fit, so it rendered
eleven `<li>` at 13 px/18 px with `padding-block: var(--space-4)` — **26 px a
row** — and measured the region at **383 px**, of which 298 is list. That 383 is
now quoted in three places: this story's `STORY.md`, Task 4.3.5's movement table,
and the dated amendment on `Market overview.dc.html` §03.

**None of them is pinned to it, deliberately.** No reserved floor was written from
that number, precisely so that your row design is not built backwards from a
measurement instrument. But **state your row's own height explicitly in your
record**, because if it is not 26 px then every figure in 4.3.5's table moves, and
the retirement of Task 4.1.4's reserved-equals-filled rule was argued against a
+237 px recomposition at 1440 that would then be a different size.

**The grid will not fight you.** Since 4.3.1 the two lower rows are
`minmax(min-content, 1fr)` against a `min-height` rather than shares of a fixed
height, so a taller row makes the grid grow rather than making the panel scroll —
and the region has **298 px of body at 26 px a row with room above it**, not a
ceiling you have to design under.

## Amended by Task 4.3.2 — 2026-09-27: the amendment above is DISCHARGED — the row is 26 px, and the number that moved is the region's, not the row's

**The 4.3.1 amendment above asked you to state your row's height because 383 px
stood on a placeholder. Task 4.3.2 drew the row and answered it, so you inherit a
settled number rather than an open question.**

- **The row is 26 px** — `--space-4` + `--line-height-dense` (18) + `--space-4`,
  exactly the placeholder's figure. Eleven rows with ten 1 px separators is
  **296 px of list** against the 298 that was measured; the 2 px is the
  placeholder's own separator accounting. **Nothing in 4.3.5's movement table
  moves because of the row.**
- **The region is 433 px, not 383** — and the row is not why. 383 was
  `2 + 51 + 32 + 298`: the frame, the header, the padding and the list with
  **nothing underneath**. What it could not include is AC 2's **printed ladder**
  (24 px) and the **benchmark claim line** (28 px), neither of which is optional.
  Drawn: **433 at 1440, 1024 and 768; 425 at 390**, where there is no bar and
  therefore no ladder.
- **The owner was asked whether that reopened the retirement of Task 4.1.4's rule
  and it did not.** Recorded and carried; the correction is at its three live
  sites and `STORY.md` carries the argument.

**So your remaining obligation from that amendment is nil.** If your treatment
changes a row's height — a transform does not, which is one of your own
constraints — say so; otherwise the geometry above is the one 4.3.5 measures
against.

**And one thing 4.3.2 drew that is yours to honour rather than re-decide.** State
7 of the seven is **`ORDER HELD`**, and the drawing's own reading of it is the
sentence your treatment has to make true: _figures and printed ranks update, the
order does not, and **the disagreement between them IS the pending re-order**._
That is why no fourth mark is needed for _this row moved_ — the ordinal is already
the record, and under the hold it is the thing visibly out of step with the list.

---

## What was done — 2026-09-27

**Two halves: a measurement that answered a better question than it was asked, and
a drawing taken on it.** One canvas page added, one amended, one shipped source
comment corrected. No component, no CSS module, no test.

### The measurement — and the task's own framing was wrong

**This task file asked whether the eleven sector ETFs arrive in ONE `bars` frame
or across several of the ~16 a minute, and presented that as the prior question
the treatment turns on. It is not the question.** Frame count and perceptual grain
are different measurements, they come apart here, and the deciding one had already
been taken nineteen days earlier.

**What the shipped code makes structurally true** (read, not measured): the
downstream frame grain **is** the upstream Alpaca array grain, 1:1, with no
coalescing anywhere — `alpaca-stream.ts:254–262` (one WebSocket message → one
`onObservations`), `index.ts:807` (→ one `publishObservations`),
`market-gateway.ts:488–520` (→ one `bars` frame per client). The type says so:
_"One upstream frame's worth. Batched because the vendor batches (§7.2)."_

**So the vendor's grain is the answer, and it is several.** `LIVE-DATA.md`
§9.5/§10.2, verbatim:

> Alpaca already batches: at the open **332 bars arrive in 8.8 frames per
> minute**, at midday 284 in 6.8, at the close 450 in 16.1 (§9.5, §10.2).

Roughly **7% of the universe per frame**, never one frame a minute. The eleven
therefore land in **somewhere between 1 and 11** distinct frames — and **which is
unrecorded, because nothing in this repository ever recorded frame COMPOSITION,
only frame counts.**

**And it does not matter, which is the finding.** `LIVE-DATA.md` §7.4, figure 7,
**n=445 minutes**, all 518 symbols:

| measure                          | p50        | p95        | p99    | max      |
| -------------------------------- | ---------- | ---------- | ------ | -------- |
| **spread within one bar-minute** | **243 ms** | **511 ms** | 616 ms | 770 ms   |
| first bar, after `t + 60s`       | 285 ms     | 370 ms     | 529 ms | 1,229 ms |
| last bar, after `t + 60s`        | 536 ms     | 794 ms     | 986 ms | 1,649 ms |

The eleven are a **subset** of the 518, so their own first-to-last spread is
**bounded above by that row**. Against the arrival mark's **900 ms** decay, a
243 ms span means **all eleven discs are lit simultaneously for ~650 ms
regardless of how many frames carried them.** The feed hands the design several
frames and **no usable stagger**.

### The replay cannot answer it, and that is structural

Run against the shipped replay path on its own Fastify on **port 3100** (the
developer's pair on 3000 untouched), driving `createReplayStream` +
`createStoredReplaySource` + `createCurrentMarketState` + `registerMarketGateway`.
`pnpm ready` first: `✓ backend up 169.5s, ✓ frontend, ✓ database`.
`GET /diagnostics/freshness` returned `1m` newest `2026-09-11`,
`sessionsBehind: 10` — so production's `defaultReplayStart` (7 days back) would
have found **zero bars**, and the instrument passed
`replayFrom = 2026-09-11T13:30:00Z` explicitly.

**One socket, printed by URL** — trap 1 of three:
`OPENING SOCKET 1 of 1: ws://127.0.0.1:3100/market-stream`. Node-side, so there is
no page buffer and no global to rebind (trap 2).

```
Run A — 60×, 40 s
frames received: 85 total, 40 of type "bars"
onObservations batches published upstream: 40
sector symbols per `bars` frame — the GRAIN:
  11 of 11 symbols : 40 frames
intra-minute spread between first and last of the eleven: 0 ms in every one of 40 frames

Run B — the control at 1×, 200 s
frames received: 14 total, 4 of type "bars"
  11 of 11 symbols : 4 frames
intra-minute spread …: 0 ms in every one of 4 frames
gap BETWEEN consecutive bars frames: min 59829 ms, median 59985 ms, max 60028 ms
```

**VERBATIM, the first `bars` frame, from `ws://127.0.0.1:3100/market-stream`** —
the instrument is deleted and the conclusion is not the evidence:

```json
{
  "type": "bars",
  "version": 1,
  "sentAt": "2026-09-27T02:26:42.405Z",
  "observations": {
    "XLK": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 187.55,
      "high": 187.55,
      "low": 186.92,
      "close": 187.26,
      "volume": 164091
    },
    "XLV": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 166.83,
      "high": 167.06,
      "low": 166.39,
      "close": 166.39,
      "volume": 185847
    },
    "XLF": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 57.44,
      "high": 57.615,
      "low": 57.42,
      "close": 57.425,
      "volume": 1316306
    },
    "XLY": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 112.87,
      "high": 112.995,
      "low": 112.775,
      "close": 112.92,
      "volume": 68327
    },
    "XLC": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 112.3,
      "high": 112.45,
      "low": 112.3,
      "close": 112.37,
      "volume": 23898
    },
    "XLI": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 172.45,
      "high": 172.71,
      "low": 172.4,
      "close": 172.64,
      "volume": 76339
    },
    "XLP": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 83.51,
      "high": 83.635,
      "low": 83.505,
      "close": 83.635,
      "volume": 142096
    },
    "XLE": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 64.9,
      "high": 65.18,
      "low": 64.84,
      "close": 65.08,
      "volume": 931621
    },
    "XLU": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 42.89,
      "high": 42.96,
      "low": 42.85,
      "close": 42.88,
      "volume": 249523
    },
    "XLRE": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 43.4,
      "high": 43.41,
      "low": 43.35,
      "close": 43.38,
      "volume": 181556
    },
    "XLB": {
      "startsAt": "2026-09-27T02:26:42.404Z",
      "open": 51.19,
      "high": 51.21,
      "low": 51.1,
      "close": 51.13,
      "volume": 158661
    }
  }
}
```

**Which half it proves: the wiring, never the loop.** The replay's grain is an
artefact **by construction** — `replay-bar-source.ts` groups stored rows
`byInstant` and emits **one slice per minute across every symbol**, and
`replay-stream.ts:216–244` emits one `onObservations` per slice. So a replay
answers _one frame, 0 ms spread_ **100% of the time, at any speed, whatever the
market did** — proved at both 60× and 1×. And note the sharper limitation: **every
observation in a replayed frame shares one `startsAt`** (the presented instant),
so **minute identity is not recoverable from a replayed frame and a split minute
cannot be expressed at all.**

**A falsified comment corrected in the same change.** `replay-bar-source.ts` said
the per-minute slice was _"the shape the live feed arrives in (§7.2: the vendor
batches a minute's bars together)"_. The vendor does batch — into 8.8 frames, not
one. The comment read as measured while being **coarser than the measurement**,
and it sat at the single most likely place for the next reader to reach exactly
the wrong conclusion about frame grain. Struck and replaced with a dated
correction carrying both consequences.

### The quiet group, and why it stays

Against the local store, regular session 2026-09-11, `timeframe='1m'`, the eleven
read from `SECTOR_ETFS` rather than typed — `XLK, XLV, XLF, XLY, XLC, XLI, XLP,
XLE, XLU, XLRE, XLB`:

```
present | minutes
     11 |     387
     10 |       3
```

Every ETF 390/390 except **`XLRE` at 387/390**. So on the consolidated tape there
is effectively **no** quiet group — 99.2% of minutes carry all eleven.

**But that is SIP and the live path is IEX.** §7.6 measured live IEX coverage at
**321 of 518 symbols p50 per minute, 65.1% median per-symbol against 82.8%
stored**. Per-symbol IEX coverage **for these eleven is recorded nowhere and could
not be taken**: the local store is **100% `sip`** —
`select feed, count(*) … → sip|48449712`, zero `iex` rows — because the live
writer runs on the deployed backend. **A quiet sector is plausible and
unmeasured**, which is a reason to keep the trailing-quiet-group state rather than
to draw it as rare.

### The drawing — `The order that changes.dc.html`, nine sections

| §   | What it settles                                                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | **Two events, genuinely two** — four combinations as live rows, including **C: moved and NOT marked**, with the code trap that the mark's trigger must stay `arrivalKey`, because firing it off a changed rank produces a disc in C and nothing below `pnpm e2e` separates them                      |
| 02  | **Why a fourth mark was refused** — three reasons, the third new: a _moved_ mark lands disproportionately on **case C rows, which received nothing**, so it would decorate the stalest figures on screen. Plus a five-channel survival table in which **only the printed ordinal survives all five** |
| 03  | **The FLIP** — measure, commit, invert, release; every offset a multiple of **27 px** (26 + 1 separator) so the inverse is integer; transform only; `order`/`grid-row` refused as an accessibility-tree divorce; keyed by `symbol`; the stagger refused twice                                        |
| 04  | **The wave, measured** — the objection split into a true half and a derived half                                                                                                                                                                                                                     |
| 05  | **The instrument** — eleven real rows, **1× default**, a 60 s cycle holding two bar minutes at t=0 and t=30 s with the second reversing the first, and four pure-CSS switches                                                                                                                        |
| 06  | **Reduced motion, drawn as failures** rather than asserted                                                                                                                                                                                                                                           |
| 07  | **The hold**, and a finding: the ordinary treatment **is** the hold with one step put back                                                                                                                                                                                                           |
| 08  | **The reversal trigger**, with the lever and the anti-lever                                                                                                                                                                                                                                          |
| 09  | **Nine claims owed a measurement**, with owners                                                                                                                                                                                                                                                      |

### The wave decision, and the owner took it

**The discs are a wave and cannot be staggered; the movement is not a wave; so the
two events are separated in TIME rather than in space.**

**`--motion-duration-settle` of stillness, then `--motion-duration-settle` of
travel — the same existing token twice. No new token, no new number, no new
limb.** Accepted by the owner on 2026-09-27 against drawing them coincident and
against anything louder.

- **Cost, stated**: the order is **240 ms behind the figure that caused it** —
  below a reader's threshold for _lag_ and above it for _separate_. **The printed
  ordinal commits with the FIGURE, not with the travel**, so nothing on screen is
  stale during the pause.
- **It degrades correctly**: both halves resolve to `0 ms` **together** under
  `prefers-reduced-motion`. A hard-coded delay would leave an empty pause — which
  is why this is one token used twice rather than a delay plus a duration.
- **Rejected: a stagger.** It would encode an order the data does not have, and it
  lengthens the gesture from 240 ms to **640**.

**Half two of the argument is DERIVED, not measured, and the owner chose to ship
on it.** The figure is **cumulative from the previous close**, so a minute's
increment is small against the gap between ranks: one bar minute produces a few
adjacent swaps and a row travelling two or three places, never eleven
re-arranging. Three already-decided rules close its holes — display-precision swap
suppression (which bites hardest exactly where half two is weakest, the first
minutes of a session), _a first order is not a re-order_ (the bell draws a new
list flat), and one commit per re-order rather than per frame. **The treatment is
safe even if half two is wrong**, because it is designed for the worst case where
all eleven move. §09 owes the number it rests on: **the adjacent-rank gap
distribution per minute**, to be taken in the same sitting as the frame count.

### Reduced motion loses the event, and that is accepted

A reader with the preference set learns **the complete order exactly**; what they
do not learn is **that it moved**. The only repair is §02's fourth mark, which
would then exist _only_ for that reader — a treatment nobody reviews, on the rows
where least data arrived. **Accepted by the owner**, as the same trade the product
already took for the arrival disc.

**Both reduced-motion traps are drawn as failures rather than asserted** —
done-when 5. A zero-duration animation applies **no keyframes at all** (three
permanent dots), and a zero-duration transition **may not fire `transitionend`**
(rank 3 stuck **81 px** down, sitting on rank 6's line, **with every printed
ordinal correct** — which is precisely what makes it survive review).

### The hold, and the finding inside it

`ORDER HELD` is `stateMark`'s **third consumer** — _a state PERSISTS_ — and the
first use of that limb for something **a reader caused**. The ordinals read
`1 2 4 6 5 3 7 8 9 10 11`, which is the disagreement Task 4.3.2's state 7 says
_is_ the pending re-order.

**The finding: the ordinary treatment is the hold with step 4 put back, not a
second mode.** One path, one commit; the hold **gates the movement, not the
ranking**. The head slot reserves the wider badge, and the release is the largest
movement the component can make **and the safest, because the reader caused it**.

### The reversal trigger, and its anti-lever

> **The first sitting in which a person reports the sector region as flashing or
> refreshing rather than as facts arriving.**

**The lever is the disc, not the motion.** The strip cannot lose its disc — four
barely-changing figures need a _look_ — but a ranked list can, **because its
aliveness is its order**. And the **anti-lever is named: never slow the motion
down.**

### One amendment to yesterday's drawing, and it is a token violation

`The ranked list.dc.html`'s `.held` badge drew `ORDER HELD` as `#9a6400` ink inside
a `#9a6400` border. **That value is in no stylesheet in this repository** — it is
the canvas page's own `--mp-amber` drawing palette, legitimate as a `.warn` border
on a canvas page and **not** a product ink. And **none of the three ambers that do
exist can replace it**: this repository's own measurements are `--palette-amber`
(`#e2b544`) at **1.73:1** on the page ground (`FeedProvenance.module.css`) and
**1.92:1** at 12 px (`BarSeriesPanel.module.css`), and `--palette-amber-deep` is
not a text ink either.

Amended in place, dated: `--ink-primary` at `--font-weight-strong` inside a
`--rule-strong` hairline with `stateMark`'s still disc in front. **The intent is
adopted and the value is not** — the standing exception's own shape, and the
settled rule that _standing out is a job for weight and hierarchy, never for ink
outside the contrast floor_.

### Tokens — nine, zero invented

`--motion-duration-settle` (240 ms), `--motion-duration-decay` (900 ms),
`--motion-ease-standard` (`cubic-bezier(0.2,0,0,1)`), `--ink-primary`,
`--rule-strong`, `--font-weight-strong`, `--space-4`, `--line-height-dense`, and —
**cited only to rule out** — `--palette-amber` and `--palette-amber-deep`. The one
new _number_ is the **27 px row pitch**, which is 26 + 1 and is arithmetic over
the predecessor's stated row. **Row height unchanged at 26 px**: a transform does
not change it, so Task 4.3.5's geometry (433 px, 425 at 390) is untouched.

### Gates

- **`pnpm verify` — exit 0.** See the commit for the counts.
- **Instrument deleted**, confirmed by `git status --short`. Two raw frame logs
  kept at `.capture/frame-grain/`, which is gitignored (`.gitignore:35`), so the
  tree is unaffected.
- **No check added, so no break is owed.** The treatment is drawn and unbuilt;
  Task 4.3.6 implements it and owes the checks.

## For a stakeholder — a status report, 2026-09-27

**Nothing reached the running product.** This task decided how the sector list
will behave when a sector overtakes another, and it opened with a measurement
because the decision could not be argued.

The question it was sent to answer — do the eleven sector funds' prices arrive
together or spread out — turned out to be **the wrong question**. They do arrive
spread across several batches, which sounds like the good answer. But the gap
between the first and last price of a minute is **a quarter of a second**,
measured over 445 minutes of a real session, and the little marker that appears
beside a changed price lasts nearly a second. So **all eleven markers are lit at
once whatever the batching does**. The answer was already in the record, taken
nineteen days ago for a different purpose.

That matters because eleven markers flashing _and_ the whole list re-arranging in
the same quarter-second is the gesture a page makes when it **reloads** — which
would make a live market look like a refresh. The decision: **separate the two in
time.** The list holds still for a quarter of a second, then moves. Both halves
use a duration the product already has, and both switch off together for a reader
who has asked for less motion.

Three things worth knowing. **A replay cannot answer a question like this**, and
that is structural rather than a matter of effort — it replays a whole minute as
one batch, so it always says "they arrived together" no matter what the market
did. A comment in the code claimed the replay's shape matched the live feed's; it
did not, and it was the most likely place for the next person to go wrong. **The
number the list's movement rests on is derived rather than measured**, which is
recorded as such, with the measurement owed at the story's close — the treatment
is safe either way, because it was designed for the worst case. And
**yesterday's drawing used a colour that does not exist in this product**, in a
place where none of the colours that do exist would pass the contrast floor; it
now uses weight instead of ink, which is the rule this product already settled.
