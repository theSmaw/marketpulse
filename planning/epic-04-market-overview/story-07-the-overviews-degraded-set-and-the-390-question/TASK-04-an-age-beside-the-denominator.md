# Task 4.7.4 — An age beside the denominator

**Status:** Complete — 2026-10-11
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.3

## Objective

**`Market breadth` and `Movers` are the two things on this screen most
confidently wrong when stale, and they carry no instant in any state.**

## What the user can see when this lands

**Each of the two regions says when the window it measured over ended** —
beside the denominator it already states. An age, **not a verdict**.

## Work

### Why these two and not the others

| surface                            | covers                                  | where it sits                       |
| ---------------------------------- | --------------------------------------- | ----------------------------------- |
| the proxy strip's shared qualifier | **the newest of four**                  | under the four figures, top of page |
| `Observed through hh:mm`           | **the newest of 518**                   | the last element before the footer  |
| `Market breadth`'s footer          | states the **window**, never an instant | middle of the page                  |
| `Movers`' footer                   | states the **window**, never an instant | middle of the page                  |

At 390 the page is **2,565 px** and the breadth-first order puts those two
regions near the top, so **the one screen-level instant that would qualify them
is roughly 2,500 px below them, behind three reserved panels.** At 1440 it is
at least on the same screen.

### The rule it follows rather than invents

An instant beside a denominator is **an age, not a verdict** — the same
decision the strip's third row and the universe table's `Live price from 12:07`
already took. **It does not reverse Story 3.10's one-home rule**, and the
owner has held that rule: `/` gets ages and **never** a connection word.

### Where the fact comes from, and the trap in it

`observedAt` is already on the frame (Task 4.8.12) — a bar's own `startsAt`
folded over **the join's whole answer**, so it is the universe-wide instant
rather than a sample of what this route subscribed to. Two mechanics travel
with it: a bar's instant is **the start of the interval it describes**, so
anything comparing it to now must add the interval exactly as `feedStatusFrom`
does, or it re-creates Task 3.3.4's defect one surface over; and **it is absent
when the aggregate holds no observation**, which is CI's permanent state — so
by ADR 0029's defer rule the clause **renders only when its own data is
present.** Say nothing rather than say now.

### One fact, one home

`measured-set.ts` already builds the sentence both footers read, in two
grammars keyed on the basis the wire sent. **The instant joins that builder**,
not each footer — one string, two renderings, and a second copy fails the
build.

### Explicitly NOT in scope

No threshold, no status word, no connection word, and **no per-region
verdict**. A threshold here would be a second staleness verdict on `/`, which
`a-second-staleness-sentence` and `one-home-for-the-strip-staleness-sentence`
already refuse by name.

## Done when

1. Both footers state the instant their window ended, from the one builder
2. The clause renders **nothing** when the aggregate holds no observation —
   asserted in CI's own state
3. The instant is the interval's **end**, not its start, wherever it is
   compared to anything
4. No new word enters the vocabulary, and the existing one-home invariants
   still hold **for their own reasons**
5. `pnpm verify` and `pnpm e2e` green, and the two states photographed

---

## Handed here by Task 4.7.3 — 2026-10-10: the instant you are about to draw an age from can now be ARBITRARILY OLD on a fresh join, and that is on purpose

Written here rather than linked.

**1. The gateway serves a joining or subscribing browser its LAST BROADCAST
aggregate**, not a recomputed one (`lastBroadcastOverview` in
`market-gateway.ts`, ADR 0038's second dated amendment on decision 1). So the
first aggregate a reloaded tab receives carries the `computedAt` and the
breadth window of **the last applied batch**, which during an outage may be
twenty minutes ago.

**2. That is what your age is for, and it makes your region's claim stronger
rather than weaker.** Before this, the figure a reader was shown on a reload
was recomputed — breadth and movers emptied to `none were heard from`, and
`computedAt` advanced to the minute the tab was opened with no market data
behind it. Task 4.8.12 already removed `computedAt` from the drawn note for
that reason. Now the instant is honest and **stale**, which is exactly the
state an age is readable in.

**3. The one consequence for your arithmetic: the age is `now − the window's
end`, and nothing in the frame moves while the feed is dead.** So the age
**grows without bound** on a page nobody reloads and is **identical** on two
tabs opened an hour apart. Both are correct. What must not happen is an age
computed from a clock the frame did not carry — the window's own end is on the
wire and `now` is the browser's; do not reach for `sentAt` (ADR 0033 holds it
out of anything but an instrument) and do not reach for the connect instant.

**4. A cold start is the one arm where the instant is still fresh.** A process
that has never broadcast computes on connect, which is every out-of-hours visit
and every `MARKET_DATA_PROVIDER=none` deployment — including **CI**, where the
store has zero bars and `measured` is 0 for ever. So the age you can assert on
a gated machine is an age over an **honest-nothing** aggregate, not over
figures.

---

## What was done — 2026-10-11

### What each footer says, verbatim, in every state

One trailing sentence, built once and read by both regions. `Sep 16 · 14:02 EDT`
below is `formatBarInstant` over a served `observedAt` of `2026-09-16T18:01:00Z`
— **14:01 plus the interval**.

| state                                      | `Market breadth` (drawn)                                                                                                                           | `Movers` (drawn = spoken)                                                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| observed basis, counted, instant present   | `Heard from means at least one observation in the last 5 minutes. Nothing newer than Sep 16 · 14:02 EDT has reached us.`                           | `Of the 503 companies we track, 451 were heard from in the last 5 minutes. Both lists are ranked over those. Nothing newer than Sep 16 · 14:02 EDT has reached us.` |
| observed basis, `measured: 0`, present     | `Of the 503 companies we track, none were heard from in the last 5 minutes. Nothing newer than Oct 7 · 14:02 EDT has reached us.` (drawn = spoken) | `Of the 503 companies we track, none were heard from in the last 5 minutes. There is nothing to rank. Nothing newer than …`                                         |
| session basis, instant present             | `Close to close on 2026-10-06. Nothing newer than Oct 6 · 16:01 EDT has reached us.`                                                               | `Of the 503 companies we track, 501 had a close-to-close move on 2026-10-06. Both lists are ranked over those. Nothing newer than …`                                |
| **no observation in the aggregate**        | `Heard from means at least one observation in the last 5 minutes.`                                                                                 | `Of the 503 companies we track, 451 were heard from in the last 5 minutes. Both lists are ranked over those.`                                                       |
| **CI's own state** (`measured: 0`, absent) | `Of the 503 companies we track, none were heard from in the last 5 minutes.`                                                                       | `Of the 503 companies we track, none were heard from in the last 5 minutes. There is nothing to rank.`                                                              |

The last two rows are **byte-identical to what both regions shipped before this
change** — not an empty sentence, not a trailing space, not a literal
`undefined`. Breadth's spoken half carries the clause too, on the same string.

### Where the instant comes from, and why it is the interval's end

`WireMarketOverview.observedAt` — a bar's own `startsAt`, folded on the server
over the join's whole answer, so it is stamped by the market rather than by
this process and **stops moving when the market stops reaching us**. Not
`computedAt` and not `sentAt`: both are readings of the server's clock, and
Task 4.8.12 already removed the first from a drawn sentence for exactly that
reason. Not a browser clock either.

**`startsAt` is the START of the minute a bar describes** (`LIVE-DATA.md` §7.3,
measured with a control: one stamped `14:01:00Z` arrives at `14:02:00.5Z`), so
the newest observation an aggregate can hold covers the minute that **ends** a
minute later. _Nothing newer than 14:01 has reached us_ is false about a feed
that has just delivered the 14:01 bar — the 14:01–14:02 minute has reached us
whole. Adding `OBSERVATION_INTERVAL_MS` is the same correction Task 3.3.4 made
to `feedStatusFrom`, where the omission made `live` structurally unreachable
during a session; the constant is **read from `packages/shared`** rather than
spelled, because a second timeframe on this feed is its reversal trigger.

### Three decisions the brief left to the implementation

**It is a SENTENCE rather than a clause spliced into the two grammars.** The
grammars are keyed on the basis the wire sent and neither can render the
other's; this fact is keyed on **neither** — it is about what has reached this
process, which is the same question on a live market and a shut one. A clause
inside each grammar would be the same sentence written twice with four
punctuation decisions. As a trailing sentence it composes with both, and with
breadth's drawn/spoken pair, without either grammar knowing it exists — and it
leaves `overview-movers-denominator.spec.ts`' `toContain(expectedClause(…))`
holding unchanged, because the clause it reconstructs is still contiguous.

**It renders on BOTH bases.** The session grammar was argued for suppression —
a count of close-to-close moves is dated by the session it already names — and
refused: the sentence does not claim to date the count, it states what has
reached us, which is true and useful on both bases, and a basis gate would be a
third behaviour the brief did not ask for and a second place for a basis
decision to drift. The only silence is ADR 0029's.

**The claim reserves THREE lines rather than two, which is a 16 px layout
change in every state.** Measured at 1440, 1024, 768 and 390 in both states:
the sentence fits the existing second line at 1440, 1024 and 768, and takes a
**third at 390**, where the grid is one column and this panel is 308 px wide.
With the two-line reserve the claim was 32 px everywhere **except**
390-with-an-observation, where it was 48 — a region whose height told a reader
whether a bar had ever arrived, stepping the whole lower page at the one width
where the grid rows are untied, which is the hazard both stylesheets already
name. `Movers` is now **482 content in a 491 px region** (was 466 / 486) and
`Market breadth` is 491 at all four widths; both arithmetic comments carry the
new sum and the measurement. A `@media` reserve was refused: it would be a
second home for a width the grid already owns, to save an empty line nobody
sees at three of the four widths.

### The check, and the transcript of its first draft passing wrongly

`the-footer-age-is-the-intervals-end`, in three clauses, with the 2026-09-26
procedure performed **before** the check was written.

**The defect was planted first** — the file the next story writes, in
`market-breadth.ts`: a second producer folding the newest instant off
`overview.figures` and formatting it raw, which is the shape Task 4.8.12
already found once on the source note and the one that **avoids the obvious
token** by never naming `observedAt` at all.

**The obvious first draft — _the builder reads `observedAt`_ — passed it:**

```text
$ node draft-check.mjs
PASS  the-footer-age-is-the-intervals-end (draft)
exit=0
```

**The shipped check, against the same planted defect:**

```text
Invariants that no longer hold:

  ✗ the-footer-age-is-the-intervals-end
    A second producer of the age clause:
      apps/frontend/src/market/market-breadth.ts

1 of 53 invariants failed.
```

`md5` either side of the plant: **`5a1ab161e149c45911e87b5a480e0321`** before
and after, with the defect in between.

Its three clauses, each proven red by hand on this uncommitted tree:

1. **The sentence still has one home** — `shippedSourceFiles()` walked for
   `has reached us`, which is the clause above.
2. **The interval is ADDED, not merely imported.** The first version of this
   clause tested for the identifier and was **green against a `measured-set.ts`
   with the arithmetic removed**, because `OBSERVATION_INTERVAL_MS` is on the
   module's own import line. Found by performing the break rather than by
   reading the check — `CLAUDE.md`'s rule met the hard way, _prefer a clause the
   re-implementer cannot avoid writing: the division, not the type name_. It now
   matches the addition in either operand order.
3. **Neither reader nor either component may call `formatBarInstant`** —
   nothing can draw an instant without a formatter, whatever it calls the
   variable, so this is the half a reworded sentence cannot escape. Proven by
   adding one call to `movers.ts`:
   `apps/frontend/src/market/movers.ts formats an instant of its own.`

### The break, performed by hand for Task 4.7.3's reason

`scripts/breaks.mjs` gains `the-footer-age-drops-its-interval`, whose
substitution is the **omission** a re-implementer makes: the `+
OBSERVATION_INTERVAL_MS` goes and the clause keeps formatting the instant the
wire sent, which is what every shipped _through_ sentence in this product does
today. `pnpm break` refuses on an uncommitted target and this change is
uncommitted, so it was performed by hand with the registry's exact
`find`/`replace` and the file checksummed either side:
**`89e7585946a258f0c7086a289888e83f`** before,
`395c3109933a3989307ef1ea93bf57dd` broken,
**`89e7585946a258f0c7086a289888e83f`** restored.

```text
  ✗ every-break-can-still-land
      the-footer-age-drops-its-interval: its `find` matches 0 times in apps/frontend/src/market/measured-set.ts, not once

  ✗ the-footer-age-is-the-intervals-end
    The footer's age is built without adding `OBSERVATION_INTERVAL_MS`, so it draws a bar's `startsAt` — the **start** of the minute the bar describes — as the instant the data reaches.

2 of 53 invariants failed.
```

The first of those two is the harness seeing its own substitution applied, not
rot.

### What is NOT repaired, and it is an owner's call across four surfaces

**The landing page now states two instants about one aggregate, a minute
apart, and both are correct.** Three shipped surfaces print the same
`observedAt` **raw** as a _through_ claim — `OverviewSourceNote`'s `Observed
through`, `FeedIndicator`'s `Showing data through`, and the proxy strip's
per-cell `from hh:mm` — so at 1440 a reader can meet `Observed through Sep 16 ·
14:01 EDT` at the foot and `Nothing newer than Sep 16 · 14:02 EDT has reached
us.` in the middle, from one frame. The first names the newest **bar**; the
second the instant after which nothing has reached us. Changing any of the
three is a second visible change to a sentence another task settled, and
`Showing data through` is Story 3.10's one-home staleness sentence. Written up
in `docs/GAPS.md` with both candidate resolutions, owned by **a condition** —
the first state grid that photographs the source note and either region in one
frame, which is Task 4.7.9's at 1440.

### Sideways hand-offs, written into the siblings' own files

- **4.7.9** — the grid gained an axis (two footer states, discriminated by a
  field that is not on the screen), both regions are 16 px taller at every
  width, the Story 4.5 region figures are stale, and the two-instant pair is
  this task's to photograph first.
- **4.7.10** — the 390 argument's premise moved: the nearest instant is no
  longer 2,500 px below, the page is longer by 32 px, and what the sitting now
  answers is whether a third line of micro text at 308 px reads as an age.

### Done when — verdict

1. **Met.** Both footers state it, from `describeMeasuredReach` in
   `measured-set.ts`, on both renderings of breadth's pair.
2. **Met.** Absent rather than empty, asserted exactly (`toHaveText`, not
   `toContain`) in a served frame, and keyed on the real gateway's own answer
   in the third test so neither machine skips.
3. **Met**, and guarded by a clause that goes red on the addition rather than
   on the identifier.
4. **Met.** No new vocabulary; no threshold, status word, connection word or
   per-region verdict, asserted in the browser for both regions.
5. See the gate output below.

### The gates

```text
$ pnpm verify
42 components, 42 stories files.
527 documents, 1719 cross-file links, 39 anchor links, 0 broken.
53 invariants hold.
backfill coverage: this system stores 1m, 1d; the scheduled run fills 1d, 1m.
packages/shared test:  Test Files  22 passed (22)   Tests   440 passed (440)
apps/backend  test:    Test Files  50 passed (50)   Tests  1031 passed (1031)
apps/frontend test:    Test Files  86 passed (86)   Tests  1406 passed (1406)
apps/backend test:process:  Test Files  2 passed (2)   Tests  49 passed (49)
VERIFY EXIT=0
```

No `Unhandled Errors` block in the run — grepped for, zero occurrences, rather
than inferred from the exit code.

```text
$ pnpm e2e
  16 skipped
  240 passed (3.9m)
E2E EXIT=0
```

**Two earlier full runs failed, each on a different spec outside this change's
reach, and both are recorded rather than hidden.** Run 1:
`overview-nothing-to-open.spec.ts › the UN-PINNABLE hold state …`, with the
sector list read as `[]`. Run 2:
`security-explorer-shell.spec.ts › the shell has no axe violations at 640px`,
with one `color-contrast` violation on a route this change does not touch.
Each was re-run on its own at `--repeat-each=6` and passed **6/6**, and the
third full suite was green end to end. `git diff --stat HEAD -- apps/backend
packages/shared` is **empty**, so neither spec's subject has changed; this is
the suite's own flake distribution, which `CLAUDE.md` already records for this
family at about 12% per execution. **n=6 cannot separate a 12% flake from a
regression** — what carries the attribution here is that the change is
frontend-only and lands in two components neither spec renders.

**One process test also failed on the first `pnpm verify`** —
`market-gateway.process.test.ts › leaves a HEALTHY client on the same process
untouched`, `expected +0 to be 1` — and passed on **five** subsequent runs
(three scoped, two in full verifies). It is a real socket under backpressure on
a loaded laptop, and there is no backend diff in this change at all.

## Status

**Complete — 2026-10-11.**
