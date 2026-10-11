# Task 4.7.5 — The chorus of four, the doubled ticker, and a head that outlives its content

**Status:** Complete — 2026-10-11
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.2

## Objective

**Three composition defects that no single region's story could have found**,
because each was added by a different one.

## What the user can see when this lands

**At 390: four regions that stop apologising in chorus, a mover row that stops
saying its ticker twice, and a region head that stops claiming figures that are
gone.**

## Work

### 1. The doubled ticker — the owner's decision, taken

`movers.ts` reads `label: names.get(figure.symbol) ?? figure.symbol`. With
`GET /securities` unreachable — **or merely slower than the first overview
frame, which is a genuine race at 124 ms against a measured 174–277 ms** — a
row reads `3 NVDA NVDA +4.2%`, and at 390 the price column is dropped so
**there is nothing between the duplicates.** A listener hears the identifier
twice.

**Reserve blank room instead**, with the row's accessible name unchanged:
`3 NVDA NVDA` reads as a rendering fault, and **absent context should be
absent**. Story 4.6's rule that the accessible name is the ticker is about the
**link**, which is a different track — this is the name track and it is a
separate decision.

### 2. The region head that outlives its content

`Region.tsx`'s `ErrorBoundary` wraps **only the content slot**; `meta` is
passed to `Panel` outside it, and the route computes it from
`movers !== undefined`. So a thrown `Movers` leaves the head reading
`Top 5 each way` — or **`ORDER HELD`** — over a fallback box saying the region
could not be displayed. Story 4.6 established that a tripped boundary keeps its
name, landmark and tab stop, which is correct; **nobody noticed it also keeps a
claim about figures that are gone.**

Same family as the market-feed cell's two true halves, and **checkable by
walking the producers rather than by rendering a state**.

### 3. The chorus of four, which is a photograph before it is a repair

`No prices yet.` / `No count yet.` / `No sector moves yet.` / `No moves to rank
yet.`, all four at the 2,000 ms floor, **stacked in one column at 390 with
three reserved panels after them**. Each is right by ADR 0029 — each region
owns its own subject — and the aggregate reading is **four separate apologies
and no explanation**, with the explanation at the foot of the page.

**Look at it before deciding anything.** Nobody has seen these four together at 390. The owner's standing instruction is to keep four sentences; if the chorus
reads as broken rather than waiting, **the repair is the ORDER** — breadth
first means the first thing a reader meets is an apology — rather than the
count. That is a Gate 2 conversation with the photograph in hand, not a change
to make here.

### And one risk this task must not take

The 2,000 ms floor is derived from **first-frame times of 174–277 ms against a
local pair**. On a phone on cellular mid-session the first frame may exceed
2,000 ms, in which case the terminal sentence appears **and is then replaced by
figures** — precisely the promise-the-next-frame-breaks that the floor exists to
prevent. **Not in `docs/GAPS.md`.** Record it; Task 4.7.10's sitting is the only
instrument that can see it.

## Done when

1. The name column reserves room rather than repeating the ticker, with the
   accessible name unchanged, and the race asserted rather than described
2. A region's `meta` does not claim figures its content no longer has —
   checked by walking the producers
3. The chorus of four is photographed at 390 and at 1440, and a recommendation
   recorded with the picture rather than a change made
4. The 2,000 ms floor's untested premise is written into `docs/GAPS.md` with a
   re-measure a phone can perform

---

## What was done — 2026-10-11

### 1. The doubled ticker: what a mover row renders now, verbatim

`movers.ts` reads `label: names.get(figure.symbol) ?? NAME_NOT_ARRIVED`, where
`NAME_NOT_ARRIVED` is a single `U+00A0` — `withHeldRows`' own idiom in the same
column, for the same reason: an empty `<span>` collapses its line box and a row
whose name has not arrived would then be a different height from the row below
it that has.

Measured in the browser at 390, one gainer, universe held (`innerText`,
whitespace collapsed):

| state                      | the row                                 |
| -------------------------- | --------------------------------------- |
| before, universe in flight | `1 NVDA NVDA ▲ up +3.41%`               |
| after, universe in flight  | `1 NVDA ▲ up +3.41%`                    |
| after, universe arrived    | `1 NVDA NVIDIA Corporation ▲ up +3.41%` |

Two things in those strings are the **viewport's** rather than the repair's and
are deliberately left in the assertion, so that a change to either is a change
to that line: the **price is absent**, because at 390 `.movers` is four tracks
and the price cell is the one dropped — which is precisely why the duplicate
had nothing between it — and `up` is `PriceChange`'s spoken direction, which
`innerText` reads because it is clipped rather than hidden.

**The row's accessible name is unchanged.** Story 4.6's rule is about the
**link**, and the name is a sibling `<span>` of it: the spec asserts
`getByRole("link", { name: "NVDA", exact: true })` resolves to exactly one
element in the region in the blanked state. What did change is the `<li>`'s
running text, which is the repair, stated.

### How the race was asserted rather than described

`e2e/specs/overview-movers-name-race.spec.ts`, one test, at 390.

The overview frame is served by 4.7.1's harness (`serveFeed`, one gainer and
one loser — a short list rather than five, because the lists pad to five with
**held** rows whose name track is already blank, so reading an unpadded row is
what tells the repair apart from the padding that was always there).
`GET /securities` is **held open** rather than refused, through
`page.route(SECURITIES_ROUTE_PATTERN, …)` awaiting a promise the test resolves:
an `abort` reaches the same screen and is the failure case, and the whole point
of the task is that the failure and the **ordinary cold load** are the same
screen.

Three channels, per Task 4.8.10's rule that a produced state whose producer
went quiet looks identical to a state drawn correctly:

- **the aggregate** — `feed.overviews() > 0` and two drawn rows;
- **the hold** — a count of requests this spec actually intercepted, so _the
  universe was held_ is told apart from _the page never asked_;
- **the release** — the promise is resolved and `NVIDIA` appears **in the same
  row**, with the ticker still beside it once. Without it, a blank column is
  equally evidence of a region that cannot draw a name at all.

A unit test carries the producer's half (`movers.test.ts`): the label is
`U+00A0`, explicitly `not.toBe("NVDA")`, the row's `symbol` is untouched, and a
**half-filled** map blanks only the name it does not have.

### 2. How a region's head is held to its content

**The mechanism.** `Region` holds a `caught` boolean and passes
`meta={children === undefined ? tag : caught ? undefined : meta}`.
`ErrorBoundary` gains one prop, `onCaught?: (caught: boolean) => void`, called
`true` from a new parameterless `componentDidCatch` and `false` from the
existing `reset`.

It is the **third branch of an argument this component already made twice**:
`reserved` is keyed on there being no children so it cannot disagree with the
content, and the `awaiting` tag is keyed on the same thing so _a tag computed
from the content cannot outlive the work it names_. A head whose claim outlives
its figures is that defect with the condition inverted.

Three decisions inside it:

- **`componentDidCatch` takes no parameter.** The class's _it knows nothing
  about the error_ property is load-bearing — there is no reference a fallback
  could render by mistake — and it survives the method existing. One bit
  crosses, and it is a fact about **layout**, not a second report: `main.tsx`'s
  `onCaughtError` is still the only place a caught error is logged.
- **The `false` on reset is not symmetry, it is the defect.** See the
  passing-wrongly transcript below.
- **It governs `meta` and not `filledBy`.** That sentence says what belongs in
  the region — the same kind of fact as its name, which the boundary
  deliberately preserves — rather than anything about figures that have gone.

**Whether it is a producer walk or a rendered state: it is a walk, and it
renders.** The two are not alternatives here, and the distinction worth keeping
is `market-feed-grid.test.ts`': _every other test in this repository renders a
combination somebody **named**_, and the defect that file found was a row the
grid contained and no named combination reached. So the check enumerates the
content slot's state space **exhaustively** — `absent`, `drawn`, `thrown`,
there are no others — and asserts one coherence rule over both head producers
in each, rather than rendering the one state somebody thought of. The third is
the cell nobody had ever written: a throw during render is not a state anything
upstream computed, which is exactly why the route could not get `meta` right.

It is **not** an invariant, by decision: the claim can be suppressed from
`Region`, from `Panel`, or by the caller, and all three are green against a
grep for any one of them. What cannot be faked is the string's absence from the
rendered head.

A fourth cell is reachable and is **not a state of the content** — the retry —
and it is in the walk for the reason the transcript below gives.

### The transcripts of both first drafts passing wrongly

**(a) The name track.** The defect was planted first: `?? figure.symbol`
restored, `md5` `af1fe2ec30e2f77021d36beccfd062d3` → `36d70c19c8e72ffa4d87076dea15c06c`.
The plausible first draft is the one a person writes —

```ts
await expect(gainer).not.toContainText(`${NAMED} ${NAMED}`);
```

```text
$ pnpm e2e overview-movers-name-draft.spec.ts
  ✓  1 [chromium] › the chorus… › a mover row whose name has not arrived draws blank room, not a second ticker (812ms)
  1 passed (1.3s)
```

**It is green on the exact defect it forbids**, and the reason is a property of
the instrument rather than of the code: Playwright normalises `textContent`
across the cell boundary with **no separator at all**, so the row reads
`1NVDANVDA189.42▲up +3.41%` and the spaced substring is never present. Caught
by running it, not by reading it. (The unspaced form `NVDANVDA` does go red —
and is the wrong check to ship, because it is green the moment a `·` or a space
is put between the tracks while the duplicate stays.)

The shipped assertion compares the row's whole `innerText` against a measured
string, and against the same plant:

```text
    Error: expect(received).toBe(expected) // Object.is equality

    Expected: "1 NVDA ▲ up +3.41%"
    Received: "1 NVDA NVDA ▲ up +3.41%"
```

Restored; `md5` back to `af1fe2ec30e2f77021d36beccfd062d3`.

**(b) The region head.** The defect planted here is **the repair a reader
reaches for first** rather than the shipped shape — suppress the head once it
has thrown and never bring it back:

```tsx
onCaught={(c) => {
  if (c) setCaught(true);
}}
```

The three-state walk, which is the obvious first draft of the check, **passes
against it**:

```text
$ pnpm --filter @marketpulse/frontend test Region.test -t 'says nothing untrue'
 Test Files  1 passed (1)
      Tests  3 passed | 10 skipped (13)
```

A reader who presses `Try again` then gets the figures back under a head that
has gone silent for the life of the page. The fourth cell is what sees it:

```text
 FAIL  src/components/Region/Region.test.tsx > a region's head cannot claim what its content no longer has > gives the claim back when the retry succeeds
AssertionError: the content came back and the head did not: expected null not to be null
```

And the shipped walk against the **real** defect — `meta` passed through
unconditionally, which is what shipped for nine months (`Region.tsx` `md5`
`eae56288b92a8e08b08e9c4b921bae05` → `397b679b563d4a7a50334fc905ab7947` →
restored to `eae56288b92a8e08b08e9c4b921bae05`):

```text
     × says nothing untrue over thrown content 5ms
     × gives the claim back when the retry succeeds 4ms
AssertionError: over thrown content the head claims something its content no longer has: Top 5 each way: expected true to be false
      Tests  2 failed | 11 passed (13)
```

An assertion failure with eleven tests still collecting, which is the only red
that proves a check works.

### The two breaks

`scripts/breaks.mjs` gains `a-mover-stands-its-ticker-in-for-its-name` (command
`pnpm e2e overview-movers-name-race.spec.ts --anyway`, expecting `1 NVDA NVDA`)
and `the-region-head-outlives-its-content` (command
`pnpm --filter @marketpulse/frontend test Region.test`, expecting `head claims
something its content no longer has`). Both were performed by hand with the
registry's exact `find`/`replace` and the file checksummed either side, because
`pnpm break` refuses on an uncommitted target and this change is uncommitted —
the transcripts above **are** those runs.

One note for whoever edits the second entry: its `replace` carries **no**
`pnpm break: reverted automatically` marker, deliberately. The target is an
attribute inside a JSX opening tag, where neither comment syntax is legal, and
a break that turns its file into a parse error fails loudly and certifies
nothing.

### 3. The chorus of four, photographed — and NO change

Produced through the shipped socket path: `serveFeed` answers the connect with
a real snapshot and a real `feed` frame and **no overview frame ever**, held
past `SAY_NOTHING_ARRIVED_AFTER_MS`. Instrument deleted after the run, per
`ALPACA.md` §11's shape; the bytes it produced are quoted here because a
findings section that records a behaviour without quoting the evidence is the
one that fails a fortnight later.

**`main`'s `innerText` is byte-identical at 390 and 1440** — the DOM order does
not change with the grid — and so is the footer's:

```text
MARKET OVERVIEW
Market proxies
No prices yet.
Market breadth
No count yet.
Sector performance
No sector moves yet.
Movers
No moves to rank yet.
Market topology           EPIC 6
The securities graph, in WebGL — 518 nodes clustered by sector, sized by
liquidity, moving with the market. It takes this column when it arrives.
Unusual activity          EPIC 5
Every tracked security scored 0–100 for how unusual its behaviour is, ranked,
each score carrying its explanation.
Current investigations    EPIC 7
Investigations in flight — running, awaiting input and completed. Epic 10 lets
the agent start them.
```

```text
MARKET FEED  ● IEX
Trades reported by the IEX exchange only — not the full US consolidated tape.
STALE  Connected, and no live prices have arrived yet.
BACKEND SERVICE  ● HEALTHY
```

Page height: **2,735 px at 390**, 1,657 px at 1440.

#### Does it read as broken, or as waiting? — **As waiting, and the brief's own premise is why**

Plainly: **waiting.** And the thing that decides it is the sentence the brief
says is missing. _The explanation at the foot of the page_ is **not at the foot
of the page** — the status bar is **sticky**, and in this exact state it reads
`STALE · Connected, and no live prices have arrived yet.` **about 250 px under
`No prices yet.` at 390, at every scroll position.** The first viewport at 390
holds the first apology, the top of the second region, and that explanation,
together. Four regions do not read as four unexplained apologies when the
explanation is pinned under them.

**And there is no chorus at 390.** The four regions are tall enough that **no
two of the four sentences are ever co-visible** at that width: the page is
2,735 px and the gaps between the sentences are 400–700 px. The _four apologies
stacked in one column_ the brief describes is a reading of the DOM, not of the
screen. Whatever is wrong at 390 is not a chorus and **reordering cannot
change it**, because order only matters when two things are seen together.

#### Where it comes closest to reading as broken is 1440, and it is a contrast rather than a repetition

At 1440 three of the four **are** co-visible, and the picture says something
nobody has written down: **the three regions this product has NOT built look
more intentional than the four it has.** `Market topology`, `Unusual activity`
and `Current investigations` are hatched, carry an `EPIC 6` / `EPIC 5` /
`EPIC 7` tag and a sentence saying exactly what will go there. `Market
proxies`, `Market breadth`, `Sector performance` and `Movers` are plain white
voids with one 12 px grey sentence each. A stranger scanning that screenshot
reads the hatched boxes as _designed_ and the white ones as _failed_, which is
the hierarchy exactly inverted.

Second, smaller, and visible in both pictures: **the four sentences have two
alignments.** `No prices yet.` sits at the **bottom-left** of its box;
`No count yet.`, `No sector moves yet.` and `No moves to rank yet.` are
**centred**. One kind of statement, two placements, because each region
reserved its room its own way.

#### Recommendation for Gate 2 — no change here

1. **Keep the four sentences.** The owner's standing instruction, and the
   photograph supports it rather than merely tolerating it: four nouns is what
   tells a reader _which_ region went quiet, and at 390 they are never seen
   together anyway.
2. **The order is not the repair, and the brief's candidate should be
   withdrawn.** Breadth-first does mean the first grid region is an apology,
   but the first thing on the screen is `Market proxies` either way, every
   alternative first region says the same kind of thing, and the DOM order is
   Task 4.4.7's with a recorded argument and a reversal trigger. Reordering
   would spend that argument to move one sentence 340 px.
3. **If anything is bought, buy the 1440 contrast.** The candidate is to make a
   _waiting_ region as legibly deliberate as a _reserved_ one — not by giving
   it the hatch, which would conflate _waiting for data_ with _deferred to
   Epic 6_, but by placing the sentence where the content's first line would be
   in all four, so the eye lands on it at the same height in every box. That is
   a design question for the canvas rather than a repair, and it is a Gate 2
   conversation with these two pictures in hand.

### 4. The 2,000 ms floor's untested premise

Written into `docs/GAPS.md` as _The 2,000 ms floor is derived from a local
pair, and a phone on cellular can cross it before the first frame_, owned by
Task 4.7.10's sitting, with a re-measure a phone can perform unaided: a cold
load of the deployed site on cellular from a tab that has never been opened,
market open, recording whether any of the four sentences is drawn and whether
figures then replace it. One or two signal bars is the arm that matters. The
entry also records why nothing mechanical can see it: `pnpm e2e` drives a
browser against a pair on the same machine, the harness can withhold a frame
for ever but cannot make a real one slow the way a radio does, and a
`waitForTimeout` before a send would be this repository asserting its own
number back to itself.

### Sideways hand-offs, written into the siblings' own files

- **4.7.9** — two new axes (`GET /securities` in flight; a region that
  **threw**, whose head is now part of the picture), the verbatim terminal
  text at both widths to compare rows against, and the refutation of _the
  explanation is at the foot of the page_ in that grid's own 390 column.
- **4.7.10** — the `docs/GAPS.md` entry by name, the three-tap re-measure, and
  the same refutation: what the sitting should answer is whether a reader
  **reads** the sticky bar there, not whether they can find it.

### What falsifies a planning document

**This task's own brief, in one clause, and `STORY.md` inherits it.** _The
explanation at the foot of the page_ is false — the status bar is sticky and
sits under the first apology at 390 at any scroll. The clause is left standing
in the Work section above because it is the premise the photograph was taken to
test; the correction is here, in Task 4.7.9's file and in Task 4.7.10's.
`CLAUDE.md` already records the sticky-bar measurement (_false, measured twice
and corrected 2026-09-25_), so this is the same fact arriving at a third task
that did not have it.

Nothing else measured here falsifies an ADR, an invariant or `PRODUCT_SPEC.md`.

### Done when — verdict

1. **Met.** The name column holds a `U+00A0`; the link's accessible name is
   asserted to be the bare ticker in the blanked state; the race is produced
   with a held `GET /securities` and asserted on three channels, not described.
2. **Met.** `Region` suppresses `meta` when its content boundary trips, and
   restores it on a successful retry. Checked by an exhaustive walk over the
   content slot's three states plus the retry, which is the
   `market-feed-grid.test.ts` shape rather than a named combination.
3. **Met.** Photographed at 390 and 1440, both full-page and first-viewport,
   with every surface's text quoted verbatim above. **No change made**, and the
   recommendation withdraws the brief's own candidate (the order) and names the
   1440 contrast instead.
4. **Met.** `docs/GAPS.md`, owned by Task 4.7.10's sitting, with a re-measure a
   phone can perform unaided.

### The gates

```text
$ pnpm verify
42 components, 42 stories files.
527 documents, 1719 cross-file links, 39 anchor links, 0 broken.
53 invariants hold.
backfill coverage: this system stores 1m, 1d; the scheduled run fills 1d, 1m.
packages/shared test:  Test Files  22 passed (22)   Tests   440 passed (440)
apps/backend  test:    Test Files  50 passed (50)   Tests  1031 passed (1031)
apps/frontend test:    Test Files  86 passed (86)   Tests  1411 passed (1411)
apps/backend test:process:  Test Files  2 passed (2)   Tests  49 passed (49)
VERIFY EXIT=0
```

`Unhandled Errors` grepped for in the whole log: **zero occurrences**, rather
than inferred from the exit code.

The **first** `pnpm verify` of this change exited 1, on `format:check` alone —
`[warn] apps/frontend/src/components/Region/Region.test.tsx` — which is
recorded rather than hidden. `prettier --write` and the run above.

```text
$ pnpm e2e
  16 skipped
  241 passed (3.3m)
E2E EXIT=0
```

Green end to end on the first full run, 241 against 240 at Task 4.7.4's close —
the one addition is `overview-movers-name-race.spec.ts`. None of the three
specs `CLAUDE.md` characterises as this suite's ~12% flake family fired.

`pnpm test:database` was **not** run and is out of scope: `git diff --stat`
touches `apps/frontend`, `scripts/breaks.mjs` and four Markdown files, and no
migration, query, schema or repository.

## Status

**Complete — 2026-10-11.**
