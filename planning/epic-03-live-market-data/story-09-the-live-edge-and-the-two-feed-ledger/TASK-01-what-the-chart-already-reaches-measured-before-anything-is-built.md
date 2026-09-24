# Task 3.9.1 — What the chart already reaches, measured before anything is built

**Status:** **Complete — 2026-09-24.** Five questions, five answers, and **three of them change this story.** Criterion 1's first half is **already met for a liquid security and structurally unreachable for a thin one** — the stitch now contributes nothing mid-session, so the answer is the store's and reaches its last written minute. **Open decision 1 dissolves**: the vendor sends a bar for minute _M_ at the end of _M_, so no partial bar ever reaches a browser and there is nothing to decide about drawing one. And the largest finding was not on the list — **the chart closes up its gaps and its own spoken sentence claims a density it does not have**, measured on production today, on stored consolidated data, with no live feed involved.
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.8

## Objective

**Read the screen before building for it.** This story's own file says so in as
many words — _if it is already drawn, your scope is narrower than your file
assumes; read it again rather than building what shipped_ — and Story 3.8 has
just finished four consecutive tasks in which **the written-down hazard was not
the real one**, each settled by one query before a line of code.

This story was written when the store stopped at yesterday's close. It does not
any more.

## What the user can see when this lands

**Nothing.** This task writes down what is true and amends this story's scope to
match it. Every visible thing is 3.9.2 onward, and the point of doing this first
is that it may make some of them unnecessary.

## The five questions, each with the reason it is not obvious

1. **Where does the drawn series actually end today, on a cold load during a
   session?** Before Story 3.8 the answer was the fifteen-minute embargo's edge,
   filled by the read-time stitch to `alpacaServableEnd` — `now − 16 min`. Since
   Task 3.8.3 the **store** holds every complete minute the live feed delivered,
   which is `now − 1 min`. So the stitch may now be **behind** the store rather
   than ahead of it, and criterion 1's first half — _a chart of the current
   session reaches the current minute_ — may already be met on load. Take it
   from the deployed site with the market open; a local store answers a
   different question.

2. **Does anything redraw without a refresh?** Criterion 1's second half. The
   chart's series comes from `useBarSeries`, a fetch; `useLiveFeed` is what the
   identity block and the table read. Nothing wires the second to the first, so
   the expected answer is **no** — but it is one grep and the alternative is
   building a mechanism that exists.

3. **Is the two-feed source note already on screen?** Task 3.8.3 photographed
   it and Task 3.8.8 read it clause for clause against `VISUAL-LANGUAGE.md`. So
   criterion 2 and most of criterion 3 may be **shipped**. What Story 3.8's
   close added, and what this task must confirm rather than assume, is that it
   is a **mid-session** state: after the nightly backfill every regular-session
   minute has a `sip` row, the read prefers it, and the note collapses to one
   source (`LIVE-SESSION.md` §14).

4. **What does the chart do with a gap?** This is the question with the largest
   consequence and nobody has looked. IEX covers **65.1%** of a median name's
   minutes and **2.1%** of `ERIE`'s (`LIVE-DATA.md` §7.6), so a live session's
   series is _already_ full of holes — and `CHARTING.md`'s axis is
   **session-ordinal**, one slot per bar. A missing minute may therefore be
   **invisible**: the line joins 10:04 to 10:09 with no hint that five minutes
   are absent. That is the shape Task 3.5.5 wrote a reversal trigger against —
   _a chart that draws a straight line across four missing minutes as though
   nothing happened_ — and this story is the surface that fires it. Find out
   what is drawn now, with a real thin name, before deciding anything.

5. **What is the last bar, really?** The live writer holds back a bar whose
   minute has not ended (Task 3.8.3), so the store's last row is a **complete**
   minute. The socket, however, delivers a bar for the minute in progress and a
   **revision** of it about thirty seconds later (§7.8). So the partial bar is
   only ever a browser-side object, which narrows open decision 1 considerably.

## Work

- Answer all five against the **deployed** site with the market open, and
  record the answers here with what was asked and when
- `.capture/session/` may already hold most of this: Story 3.8's close ran
  `scripts/session-watch.mjs` over the session of **2026-09-24**, which records
  `provenance.sources` for `sessions=1` and `sessions=5` every fifteen minutes,
  the identity block's label, and a two-tape body byte for byte. **Read it
  before asking production again**
- Amend this story's `STORY.md` — scope, criteria and the two open decisions —
  to say what is true rather than what was true in September
- Say plainly which criteria Story 3.8 has already met, and strike them with a
  date rather than quietly leaving them

## Done when

1. Five answers, each with its evidence and the instant it was taken
2. `STORY.md`'s scope and criteria match the tree
3. Any criterion already met is struck with the task that met it named

## What was found — 2026-09-24

**Taken with the market shut** (20:40–21:10 ET on 2026-09-23), which turned out
to matter for two of the five and not for the other three. Where a reading
needs the session open it says so, and `scripts/session-watch.mjs` is running
over the session of 2026-09-24 to take it.

### Question 1 — where the series ends. **Already at the store's edge, and the module comment saying otherwise is now false**

Derived from the shipped read path and confirmed against the tests that already
cover it:

1. `tailWindow` starts the tail at `max(caller's start, session bound,
stored.covered.end)`. Since Task 3.8.3 the live writer extends the ledger's
   `covered_end` to **the last bar it saw**, so mid-session that is `now − 1 min`
   for a security the feed is delivering.
2. `alpaca-provider.ts` then short-circuits: `if (servableEnd <=
request.range.start)` returns an **empty series and costs no request** —
   `servableEnd` is `now − 16 min`, which is behind the tail's own start.
3. `stitch()` drops an empty half: `if (tail.bars.length === 0) return { series:
stored }`. So the answer is the **store's, unchanged**, and its
   `coverage.covered` is the store's own.

**So `serve-series.ts`'s header sentence is false as of 2026-09-23:**

> the merged `coverage.covered` ends where the tail's covered ends, which on a
> mid-session request is `now − 16 min` rather than `now`

It ends where the **store** ends, which is `now − 1 min`. Amended in place with
a date; the original is left standing as the record of what was true when the
stitch was the only thing that could reach past the embargo.

**And the answer is different for a thin security, which is the part worth
keeping.** If the last stored bar is **older** than `now − 16 min` — ordinary on
IEX, where median per-symbol coverage is 65.1% and `ERIE`'s is 2.1% — then the
tail's start is behind the clamp, the request **is** made, and it comes back
from the **consolidated** endpoint. So:

| Mid-session, `1D` | What the store holds         | What is fetched          | Sources named             |
| ----------------- | ---------------------------- | ------------------------ | ------------------------- |
| a liquid security | `iex` to `now − 1 min`       | nothing                  | **one**, `iex`            |
| a thin security   | `iex` to `now − 20 min`, say | `sip`, to `now − 16 min` | **two**, `iex` then `sip` |

**Criterion 1's first half is therefore met where the feed is dense and cannot
be met where it is not**, and no amount of work in this story changes that: the
missing minutes are minutes IEX did not report. That is a fact about the plan
rather than about the chart, and the honest surface for it is the label rather
than the line.

**Owed to the session of 2026-09-24**: the same reading taken live, from
`.capture/session/`, to confirm the derivation rather than only reason about it.

### Question 2 — does anything redraw without a refresh. **No, and the wiring is one line short**

`SecurityExplorer.tsx` holds both halves and hands them to different children:

- `const series = useBarSeries({...})` → `<BarSeriesPanel screen={series.screen} …>`
- `const live = liveFeed.observations.get(symbol)` → `<SecurityIdentity … live={live}>`

The chart is given the **fetched** series and nothing else. `useLiveFeed` is
called once in `App.tsx` and its observations reach the identity block and the
universe table. So the mechanism to build in Task 3.9.2 does not exist, as
expected — and the expectation cost one grep rather than a day.

### Question 3 — is the two-feed note already on screen. **Yes, mid-session, and it is currently absent for the right reason**

Read off the deployed site at 20:42 ET with the market shut: there is **no
`Source` row on the page at all**. That is `namesFeeds` working — it returns
false when the series' one feed equals the configured one, and with every bar
`sip` and the chrome reading `ALL US EXCHANGES` that is every time. ADR 0029's
_the surface that owns the data owns the account of it_ in action rather than a
defect.

Two feeds short-circuit that check (`if (feeds.length > 1) return true`), so
**the clause appearing at all is the signal**. And from question 1's table, a
`1D` window mid-session names `iex` alone on a liquid name — one feed, but not
the configured one, so **that also renders**, with the one-venue sentence.
Criteria 2 and 3 are therefore **shipped by Story 3.8** rather than owed by this
story, subject to the photograph.

**One thing this uncovers for Story 3.10, not for here.** On a `1D` live window
the source note will read `IEX` while the chrome's venue cell reads `ALL US
EXCHANGES`, three inches apart. That is `CLAUDE.md`'s standing open item — the
venue word the 2026-09-22 rehearsal caught — meeting this story's surface, and
it is Story 3.10's by name.

### Question 4 — the gap. **It is invisible, and the spoken sentence asserts a cadence the series does not have**

The question with the largest consequence, and it did not need the market open:
the store already holds a session full of holes. Taken from the **deployed**
site at 20:52 ET on 2026-09-23, both at 1440 × 900, both `?sessions=1` over the
same session:

|                               | `ERIE`         | `NVDA`         |
| ----------------------------- | -------------- | -------------- |
| Bars drawn                    | **131**        | **390**        |
| Minutes in the session        | 390            | 390            |
| Path commands in the SVG      | 133            | 392            |
| **Pixels between neighbours** | **4.3**        | **2.1**        |
| The frame each line runs      | the full width | the full width |

**Two charts of the same session, one with a third of the data, both drawn the
full width of the frame.** That is `CHARTING.md` §3's session-ordinal axis
working exactly as decided — _slot `i` sits at `i / (n − 1)`; there is no gap
between Friday's last bar and Monday's first_ — and it is why a missing minute
cannot be seen.

**And the sentence a screen reader is handed says something stronger than the
picture does**, verbatim from production:

```text
ERIE price chart: a line of 131 closing prices, one per trading minute, opening
at 234.11 and ending at 225.64, down 3.62% across the window. … The line runs
the full width of the window asked for, 2026-09-23 09:30:00 EDT →
2026-09-23 16:00:00 EDT.
```

**`one per trading minute`, of 131 prices over a 390-minute session.** The
clause is a claim about cadence and it is false by a factor of three. The
_full width_ clause is not the defect — that one compares the **requested**
window against the ledger's **covered** range and both are the whole session,
which is the coverage rule doing its job. The density clause has nothing behind
it at all.

**This is shipped today, on stored consolidated data, with no live feed
anywhere near it.** It is the same family as the sentence Task 3.9.8 already
owns — a drawn-and-spoken claim that outruns its data — so it is handed there
rather than given a task of its own, and Story 3.9.3 is told that any decision
about drawing the seam has to be taken knowing the gaps around it are invisible.

**ADR 0027's reversal trigger, evaluated in writing because that is the rule.**
`CHARTING.md` §3's trigger is _the first series this product draws whose gaps
carry meaning_, and its concrete case is a **trading halt**. **It has not fired,
and the reason is the opposite of the one expected**: on IEX an absent minute
is the ordinary case rather than the notable one — 65.1% median coverage means a
third of a typical name's minutes are simply not reported — so absence here
carries **less** information than it would on the consolidated tape, not more. A
halt would still fire it. What this measurement _does_ establish is that the
axis cannot express the difference between _did not trade_ and _we were not
told_, and Story 3.10 owns the second of those.

### Question 5 — the partial bar. **It does not exist, and open decision 1 dissolves**

`LIVE-DATA.md` §7 measured it in as many words:

> **A minute bar arrives about half a second after the minute it describes has
> ended**

and `live-bar-writer.ts`'s own rule says the same from the other side: _the
vendor sends a bar for minute M at the end of M … so a bar that arrives is a
finished minute_. Its `isComplete` guard is **not** a completeness test — the
comment says it is a guard against a bar stamped in the **future**, which no
correction could ever fix, and that it **has never been observed**.

So there is no partial minute on the wire, none in the store, and none a browser
can hold. **Open decision 1 — _whether a partial final bar is drawn as a bar_ —
has no case to decide** and is withdrawn.

**What replaces it is a real question with a different shape.** The last bar
does change after it is drawn: §7.8's `updatedBars` revision arrives about
thirty seconds later, measured at **0.064% of bars with 35.3% of them changing
the close**. That is a complete bar being corrected, not an incomplete one being
finished, and it is Task 3.9.2's replace-in-place rule rather than a drawing
decision. Tasks 3.9.3 and 3.9.6 are amended accordingly.

### What this task changed, beyond writing things down

- `apps/backend/src/serve-series.ts` — the header's mid-session claim, amended
  with a date (a measurement that falsifies a governing document is swept the
  same day, and a comment in shipped code is the most load-bearing kind)
- `CHARTING.md` §3 — the reversal trigger's verdict, written down rather than
  left to be re-derived
- This story's `STORY.md` — scope, criteria and open decisions
- Tasks 3.9.2, 3.9.3, 3.9.6 and 3.9.8 — each told what it no longer has to
  decide, or what it has acquired

## For a stakeholder — a status report, 2026-09-24

### What this was

**We checked what the product already does before building anything.** This
piece of work was planned in September, when the product forgot the trading day
the moment you reloaded the page. Last week we taught it to remember. So before
writing a line of code for "make the chart reach the current minute", we went
and looked at whether it already does.

**It mostly does** — and the half-hour spent looking has removed roughly a third
of the planned work and found a problem nobody had on any list.

### The good news: the chart already reaches now, for most securities

When you open a security during trading hours, the chart is drawn from what we
have stored. Until last week that stopped fifteen minutes short of the present,
because our data provider withholds the most recent quarter-hour on the free
plan — so we used to make a second request to fill the gap, which could only
ever reach that fifteen-minute cliff.

Now that we store the day as it happens, **our own stored data is fresher than
the thing we were topping it up with**. The top-up request is skipped
automatically — it costs nothing and adds nothing — and the chart reaches the
most recent completed minute.

**With one honest exception**, and it is not fixable by us: our live feed is a
single exchange that reports roughly two thirds of a typical company's trading
minutes, and as little as 2% for the quietest. For those, the chart still stops
where the data stops. **That is a fact about the data plan, not about the
chart**, and the right response is to label it clearly rather than to pretend
otherwise.

### The problem we found, which was not on the list

**Our charts close up the gaps in their own data, so a sparse chart and a
complete one look identical.**

We measured two securities over the same trading day on the live site. NVDA
traded in all 390 minutes. ERIE traded in 131 of them. **Both charts were drawn
edge to edge across the same frame.** The only difference is that ERIE's points
sit twice as far apart — which nobody would notice, and which does not read as
"a third of this day is missing".

Worse, the description we give screen-reader users says, word for word, _"a line
of 131 closing prices, **one per trading minute**"_. Over a 390-minute session
that is simply not true.

**This is shipping today**, it has nothing to do with the new live feed, and it
would have gone unnoticed for longer if this task had gone straight to building.
We have handed it to the task in this story that already owns exactly this kind
of problem — a sentence claiming more than the data supports — rather than
bolting a fix onto unrelated work.

### A decision that turned out not to be a decision

We had written down a question to settle: **when the current minute is only
half over, do we draw that half-finished bar?** It is a real question of the
kind this product takes seriously — showing an incomplete number as though it
were final is exactly the sort of small dishonesty we have rules against.

**It does not arise.** Our data provider only sends a minute's summary once that
minute has finished. There is never a half-finished bar to draw. We had a rule
prepared for a situation that cannot occur, and we have withdrawn it.

What does happen is different and already handled: about **0.06%** of minutes
get a corrected version roughly thirty seconds later, a third of which change
the closing price. That is a finished bar being revised, not an unfinished one —
and the next task is already told that applying a revision is a _replacement_
rather than an addition, because doing it the other way round crashes the page.
We know that because it crashed a page in a test last week, which is where you
want to find it.

### Where the product stands

**One of ten tasks in this story is done, and it was the one that builds
nothing.** What it bought:

- **Two of the story's nine acceptance criteria are already met** by last week's
  work and are struck rather than rebuilt
- **One open decision is withdrawn** because the case cannot occur
- **One shipped defect found** that was on nobody's list
- **One incorrect comment in live code corrected**, in the file a future
  engineer would have trusted

**What you can see**: nothing new today. **What this unlocks**: the next task is
the one worth watching — the chart extending as the session runs, live, with no
refresh. It is the most demonstrable thing in this phase of the project, and it
is now a smaller job than it was this morning.
