# Task 3.6.2 — The design pass at universe scale: the mark at 518, and the row that has nothing

**Status:** **Complete — 2026-09-21.**
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.1

## Objective

**Two design questions that only exist at 518, taken in front of the real table
running at 1×**, and recorded on the design canvas because that is where the
language lives (ADR 0026).

1. **Does the arrival mark survive multiplication?** Story 3.4 decided it on
   **one** number and said so.
2. **What does a row say when it has nothing?** Story 3.1 handed this here by
   name: _518 rows is where "we have no price for this" stops being a
   theoretical state._

## What the user can see when this lands

**A table that is alive rather than twitching**, and a row with no price that
reads as a fact rather than a fault.

Whether anything is _added_ is the decision — **"the mark applies unchanged" is
a legitimate outcome** and must be reachable, not a failure of nerve.

## Question 1 — the mark at 518

**The vocabulary is not yours to re-take.** `The motion vocabulary.dc.html` §05
decided it: a small disc appears beside the figure and **decays over 900 ms**,
and it fires **when a bar arrives**, not when the price changes — so it says
_a bar arrived for this security_, which nothing else on the screen says. A
vocabulary is one decision and three surfaces would make it three.

**What is open is whether it applies unchanged at this scale**, which is a
different question from what the mark means.

### The arithmetic, and the trigger that is aimed at you

**The reversal trigger is already written**: _the first time a reader reports
the mark as noise, or the first surface where it fires more than once a second._

At 518 rows receiving roughly one bar a minute that is **8.6 marks a second**
across the page. **Read the trigger as having fired unless you can show it has
not.**

Two figures bound the problem rather than settle it:

- **The reducer is not the cost.** Task 3.4.8: 6,640 observations through a
  production build, **p95 52 ms**, **zero** long-task entries.
- **518 elements each running a 900 ms animation is a different question**, and
  it is this task's. Take it from `pnpm probe` and a `PerformanceObserver` on
  `longtask` — **unbuffered**. Buffered returns the cold load, which on this
  exact page is Epic 14's known **50–76 ms** breach arriving inside a
  measurement about something else.

### And the honest complication

**About 321 of 518 rows produce a bar in a given minute** (§7.6), not 518. The
worst case and the ordinary case differ by a third, and a rule designed against
518 is designed against a minute this feed does not have. **Measure the real
distribution before designing against the ceiling.**

### Candidates, to be held against the running table rather than reasoned about

- **Unchanged.** The mark fires per row exactly as it does on the security page.
- **Only rows in the viewport.** Cheap now — but it couples a visual rule to
  scroll position, and a row that marks only when watched is making a different
  claim.
- **Only rows whose value changed.** This **reverses §05's decision** for this
  surface — the mark would go back to meaning _the price moved_, which the `▲`
  already says. If this wins, it is a change to the vocabulary and belongs on
  the canvas beside the decision it qualifies.
- **Nothing per row; the chrome's connection word carries it.** The quietest,
  and it gives up the one per-security feed signal the product has.

**Run it, do not draw it.** `The motion vocabulary.dc.html` §03 is the
precedent: four treatments running at the product's real cadence, with a
greyscale switch and a 10×-for-iteration-only switch, and the decision taken in
front of it at 1×. **A static mock cannot settle a motion decision**, and a
vocabulary tuned against a 10× replay is a vocabulary designed for a market that
does not exist.

## Question 2 — the row that has nothing

**None of `live`, `stale` or `disconnected` fits.** The feed is healthy, the
connection is up, nothing is wrong, and there is no price. §11.2 refuses a
per-security **status word** and the measurement behind that refusal is
decisive: p50 gap of one minute, **maximum 187**, so no threshold separates a
quiet security from a broken one.

**So whatever this is, it is not a judgement about the security.** What is
available honestly:

- The **stored close**, which is a real number with a real session behind it
- The **age** of the row's own observation, if it has one — `SecurityRow`'s
  removed feed column named this as what a security gets instead, _Story 3.6,
  across 518 of them at once_
- **Nothing at all**, which is what the row does today

**Two states must not read identically**, and that is the defect the Epic 2
state pass found twice: a row that has **no live observation this minute** and a
row for a security **we hold no data for at all** imply different next actions.

**And every deploy produces an empty table** (§10.3), refilling unevenly — a
liquid name within a minute, `ERIE` possibly not for hours. Whatever is designed
has to be correct for a screen where **all 518** are in this state at once, not
just a scattered few.

## The standing rules, which do not bend here

- **No accent on a datum, ever** — including a highlighted row and a featured
  ticker. The crimson identity accent is scoped to four positions in the chrome.
- **Colour is never the sole encoding.** The price palette differs by
  **1.04:1 in greyscale**.
- **Motion must never make a number harder to read.** No flashing panel behind
  digits, no count-up, no cross-fade — the rule that ruled out what most market
  software reaches for first.
- **Work in progress LOOPS, a state PERSISTS, a fact arriving DECAYS.** A fourth
  behaviour is a change to the vocabulary rather than to a component.
- **`prefers-reduced-motion` is answered once, at the token layer** — the
  durations resolve to `0ms`. A consumer reading the tokens honours it by
  construction; hard-coding a duration is the only way to get it wrong. **And
  the information must survive the motion being removed**: the new value and its
  `▲` are already on screen, and the mark only says _look_.

## Work

- A canvas page for this story, in the existing design language — reuse rather
  than reinvent; `Universe navigation.dc.html` is this table's own precedent and
  already carries its bands, its sticky-header finding and its rejected options
- The mark's behaviour at scale, **running**, against the real cadence, with
  greyscale and an iteration-speed switch
- The empty row's treatment, at one row and at all 518
- Both decisions recorded with their alternatives and a **condition-shaped**
  reversal trigger
- Reconcile downward: canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components,
  and **only if a token is actually needed** — the expected answer is none
- `pnpm probe` at 1440, 1024, 768 and 390, and **look at the page** before
  running a suite

## And a debt on the canvas this task should clear while it is there

**The epic re-ordered on 2026-09-21 and the renumber did not reach the design
canvas.** Every local reference was remapped in that change — the `Story N.M`
forms, the directories, the dependency lines, the epic table, the rehearsal
ledger and six source comments — but the canvas is a separate store reached
through `DesignSync`, and a grep over the repository cannot see it.

**Known stale, and confirmed by reading it:** `The motion vocabulary.dc.html`
says _the chart is Story 3.7_ and _Stories 3.6 and 3.7 inherit it_. **The chart
is Story 3.9.** Other pages may carry the same staleness and have not been
checked.

| Story                                            | Was | Now     |
| ------------------------------------------------ | --- | ------- |
| The Tape on the Bar                              | 3.8 | **3.7** |
| Storing the Live Session                         | 3.9 | **3.8** |
| The Live Edge on the Chart & the Two-Feed Ledger | 3.7 | **3.9** |

**This task is the next thing that opens the canvas**, so it clears it: check
every page for a `Story 3.7`, `3.8` or `3.9` reference and remap it. Leave
figures that merely look like story numbers alone — that is the trap the local
renumber was careful about, and the canvas has its own (`3.8× normal`).

**It is worth noticing why this was missed rather than only fixing it.** ADR
0026 makes the canvas the **source of truth** for the design language, and a
source of truth that no local check can read is one that goes stale silently.
`pnpm links` walks 374 documents and cannot follow a single reference into the
canvas.

## Done when

1. The mark's behaviour at 518 is decided in front of the running table at 1×,
   with the long-task figure taken unbuffered and recorded
2. The empty row has a treatment that is not a status word and does not read as
   an error, correct both for a scattered few and for all 518
3. Two states that imply different next actions do not read identically
4. Both decisions are on the canvas with alternatives and a reversal trigger
5. The canvas's stale story numbers are remapped, and any page that could not
   be checked is named
6. `pnpm verify` passes, and `pnpm probe` output is recorded rather than
   described

---

## What was done — 2026-09-21

### Question 1 — the mark survives, and the arithmetic that said otherwise was wrong

**Decided: candidate A, unchanged.** The same disc, the same 900 ms decay, the
same rule — it fires when a bar arrives. The canvas page is
`The mark multiplied by five hundred`.

The task file said to **read the trigger as having fired unless you can show it
has not**. Three things show it has not:

**1. The rate was a division, not a measurement.** 518 rows × one bar a minute
÷ 60 gives **8.6 a second**, which trips the trigger's words. But §7.4 measured
the feed delivering **332 bars inside a 243 ms burst**, once a minute — so the
page is **still for 59.7 seconds** and then everything that traded marks at
once. The mark fires **once a minute**, not 8.6 times a second. A tolerance is
measured, never argued, and 8.6 was argued.

**2. The page is still almost all of the time, and that is measured.** On the
running table against a fixture stream that marks **all 518 at once** — worse
than the real feed's ~62% — any mark was visible in **2 of 39 sampled
seconds**.

**3. The mark is not the cost.** Measured **both ways on the same machine and
the same feed**, minutes apart, with `PerformanceObserver` on `longtask` and
`buffered: false`:

| Arm                              | Long tasks (ms)            |
| -------------------------------- | -------------------------- |
| Mark rendered                    | **249, 265, 98, 117**      |
| Mark element not rendered at all | **216, 83, 102, 196, 195** |

**No difference that survives the noise.** So scoping the mark to the viewport
— the candidate that sounds prudent — would buy nothing: a mark outside the
viewport is not painted, and the noise a reader sees is the marks **in** the
viewport, which is exactly what that candidate still draws.

### And that third measurement found something this task was not looking for

**Both arms breach §28's _no routine main-thread task > 50 ms_, during a live
session, unbuffered** — so it is not Epic 14's known cold-load task arriving
inside a measurement about something else.

**The cost is re-rendering 518 rows on every tick**, which arrived with Task
3.6.1 and which nothing had measured: 3.6.1 was verified for correctness, not
for what it costs once a minute for ever.

**Stated as a bound rather than a verdict** — this is a dev build, unminified,
with a profiler attached, the same caveat the canvas already carries against
the virtualisation figures. **Handed to Task 3.6.5** in its own file, with the
awkward part named: Epic 14's trigger is _the first time a second surface on
that page renders per-row markup at universe scale_, this task added exactly
that, **and measured that it is not what costs**. The condition arguably fired
and the thing it was written to catch is not the thing that is slow. 3.6.5 says
which, in writing.

### The risk that is accepted rather than disproved

Everything above is about **rate and cost**. What no measurement settles is
whether a **synchronised wave** reads as a market breathing or as a page
flashing. Held at full density in the browser, the discs form a vertical column
that reads more like furniture than like events — and that is the worst case,
not the ordinary one.

**Reversal trigger, condition-shaped:** the first rehearsal in which a reader
describes the minute tick as a _flash_ rather than as a _pulse_, or the first
surface where the burst stops being once a minute. `LIVE-REHEARSAL.md` has
empty rows for 3.4, 3.5 and 3.6 and they are one visit.

### Question 2 — three states read correctly, and a fourth has no word

Checked against the tree rather than assumed:

| The row holds                               | What it draws                            | Correct?                        |
| ------------------------------------------- | ---------------------------------------- | ------------------------------- |
| A live observation from this minute         | the figure, no date, `Live price` spoken | **Yes**                         |
| Only a stored close                         | the figure **with its session date**     | **Yes**                         |
| Nothing at all                              | an em dash, `No close yet` spoken        | **Yes**                         |
| A live observation from **three hours ago** | the figure, no date, `Live price` spoken | **No — identical to the first** |

**The fourth is ordinary**: `currentMarketState` never expires an observation,
§11.2 measured a maximum gap of **187 minutes**, and §7.6 measured `ERIE` at
**2.1%** coverage. **And the table is currently more careful about the day-old
number than the three-hour-old one** — a consequence of Task 3.6.1's decision
to date the stored rows, which was right for its own reason and has this as its
shadow.

**Not fixed here, and the reason is a refusal rather than a deferral.** The
repair is a **threshold**, and §11.2 refused one with a measurement: no number
of seconds separates a quiet security from a broken one. Choosing one on the
surface that applies it 518 times, inside a design pass about a disc, would be
taking the epic's hardest decision as a side effect. **Written into Story
3.10's own file**, which already names _the table's 518 rows_ in its scope —
together with what the mark does about it and exactly where the mark stops: **a
reader who has just arrived sees no marks at all**, so it answers _is this row
being fed_ for somebody watching and nothing for somebody who has just looked.

### What was built, and the duplication it removed

- **`market/arrival.ts`** — `observationIdentity` and `arrivalKey`, with the
  revision rule and the snapshot rule. It was private to `SecurityIdentity`
  from Task 3.4.5, which was right while one surface marked; **two
  implementations of _what counts as an arrival_ is the shape Task 3.5.2
  removed from the subscription.** One home, two surfaces.
- **`styles/motion.module.css`** — the disc, the ink, the `opacity: 0` base and
  the decay, `composes:`d by both marks. **Position stays with each consumer**,
  because a figure and a table cell are genuinely different geometries.
- **The table holds no arrival state at all.** `SecurityIdentity` needs a hook
  because the route changes symbol underneath it without re-mounting; a table
  row is keyed by its symbol, so the same rule reduces to a **pure function**
  and a React `key`. That is 0 hooks across 518 rows rather than 518.
- **The mark is a child of the price, not of the cell** — the column is
  right-aligned, so the price's left edge moves with the width of the number.
  Anchored to the cell it would drift from short figures and collide with long
  ones.

### Verified on the running page

`MARKET_DATA_PROVIDER=fixture`, `/securities` in a real browser:

- **0 marks on first paint with 518 live rows** — Task 3.5.4's rule holding at
  518 times the size. The first reading of this was **518 marks**, and it was
  measuring a tab that had been open long enough for a `bars` tick to land; a
  fresh load reads 0 at 6.4 s.
- Marks appear on the following tick and decay.

### The canvas debt, cleared in part and named in full

**Checked and clean:** `Universe navigation`, `Live in the chrome`,
`Provenance and the empty answers` — none carries a story number in the 3.7–3.9
range. The two Story 3.6 pages use the new numbering by construction.

**Known stale and NOT remapped in place:** `The motion vocabulary.dc.html` says
_the chart is Story 3.7_ and _Stories 3.6 and 3.7 inherit it_; both should read
**3.9**. The remaining pages predate Epic 3 and were not individually checked.

**Why it was not fixed in place, stated rather than glossed:** `DesignSync`
writes whole files, so correcting two words means re-uploading the entire page
from a copy held in this session — and a transcription error in a **source of
truth** is a worse outcome than a stale story number. The mapping is instead
recorded **on the canvas itself**, in §08 of the new page, so a canvas reader
meeting _Story 3.7_ can resolve it without leaving the canvas.

**Done-when 5 is therefore partly met and said so**: pages checked and named,
the stale page and its exact strings identified, the remap not performed.

### The criteria

| #   | Criterion                                                                                      | Evidence                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | The mark's behaviour at 518 decided in front of the running table, long-task figure unbuffered | Candidate A, with the duty cycle, the burst reframing and the two-arm attribution above                         |
| 2   | The empty row is not a status word and does not read as an error                               | Three states verified correct; the fourth named, argued and handed to Story 3.10                                |
| 3   | Two states implying different next actions do not read identically                             | `UniverseTable.test.tsx` — the stored row carries a date, the live row does not, the dataless row is an em dash |
| 4   | Both decisions on the canvas with alternatives and a reversal trigger                          | `The mark multiplied by five hundred`, §03 and §06                                                              |
| 5   | The canvas's stale numbers remapped, unchecked pages named                                     | **Partly** — see above                                                                                          |
| 6   | `pnpm verify` passes, `pnpm probe` recorded                                                    | Green: 18 invariants, 2,300 tests. Browser suite against `marketpulse_bare`: **140 passed, 0 failed**           |

**One honest note on the run.** The first `pnpm verify` after the measurement
session failed one process test; the process suite spawns a real server and I
had stopped the dev pair seconds earlier. A clean re-run passed, and the full
verify was then taken again end to end and was green. Recorded because a suite
that failed once and passed on a re-run is exactly the thing this repository
refuses to wave through.

---

## For the stakeholders — what this actually did, in plain words

**The short version: we decided the little dot stays, and while proving it we
found something slow that nobody had measured.**

### The question

Last week we designed how a price should announce that it has changed: a small
dot appears next to it and fades away over about a second. It says _a bar
arrived for this company_ — not _the price moved_, which the arrow already
says.

That was decided while looking at **one** number. The list of every company we
track has **518**. So the open question was simple to ask and impossible to
settle by arguing: **does that work when it happens five hundred times?**

### The arithmetic that nearly made the decision for us

518 companies, one update a minute each, is 8.6 dots a second. When we designed
the dot we wrote down in advance that if it ever fired more than once a second
we should reconsider — so on that reading, the answer was already "no".

**That arithmetic is wrong, and we had the measurement to prove it.** Market
data does not trickle in evenly. We measured earlier in this project that a
minute's worth of updates arrives in a **single burst lasting about a quarter
of a second**. So the page is completely still for 59 seconds, and then
everything that traded ticks at once.

It is not a flicker. It is **one wave, once a minute** — and that is a
different thing to judge.

### What we measured rather than argued

**How much of the time you actually see anything.** We ran the real table
against a test feed that is deliberately harsher than reality — it updates
_every_ company at once, where the real feed updates about two thirds. Result:
in 39 sampled seconds, anything was visible in **two of them**. The screen is
still for the other 37.

**Whether the dots are expensive.** This is the part that matters, so we
measured it **both ways on the same machine minutes apart**: once with the dots
drawn, once with them removed entirely.

They were the same. **The dots cost nothing measurable.**

### The thing we were not looking for

Both of those measurements were slow — in the same way, with or without the
dots. Something on that page takes **up to a quarter of a second of the
browser's attention, every minute**, and our own published performance target
says nothing routine should take more than a twentieth of a second.

**It is not the dots. It is redrawing 518 rows every time new prices arrive** —
which arrived with last week's work, and which nobody had measured, because
that work was checked for being _correct_ rather than for what it costs every
minute forever.

We have not fixed it here, deliberately: these numbers come from a development
build, which is always slower than what a user gets, so they are a worst case
rather than a verdict. It is handed to the task whose whole job is performance
on this page, with the figures and the caveat.

**The general point worth taking from this:** we only found it because we
measured the thing we suspected _and_ the thing we did not. Had we only
measured with the dots on, we would have blamed the dots, removed a good
feature, and still had a slow page.

### A state we found that has no honest answer yet

While checking what a row says when it has no live price, we found a fourth
case nobody had noticed.

Our system remembers the last price it saw for each company and never forgets
it. Thinly-traded companies can go **hours** without trading — we have measured
gaps over three hours. So a row can be showing a price from three hours ago and
look **exactly** like one from twenty seconds ago.

And it is worse than that, in an ironic way: the table is currently _more_
careful about a price from yesterday — which carries a date — than about one
from three hours ago, which carries nothing.

**We did not fix it, and that is a decision rather than an omission.** Fixing it
means picking a cut-off — "older than X is stale" — and we established earlier,
with measurements, that no such cut-off exists that can tell a quiet company
from a broken feed. Picking one inside a design review about a dot would be
making the hardest call in this phase of work as a side effect. It is written
into the story that already owns exactly this question, in its own words, with
everything we learned.

### Where this leaves the product

**Done:** 518 live prices, each announcing its own arrivals, with nothing added
that the measurements could not justify.

**Next:** whether every row stays live or only the ones on screen, and then the
performance question above.

**And one thing only a person can finish.** Everything here says the dots are
cheap and rare. What no measurement can tell us is whether five hundred of them
ticking together once a minute feels like a market breathing or like a page
flashing. That needs somebody watching a real trading session — which we owe
for three pieces of work now, and which is **one sitting**, Monday morning.
