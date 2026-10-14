# Task 5.3.3 — The Percentile on the Screen

**Status:** Complete — 2026-10-14
**Story:** [5.3 The Baseline, & the Price Percentile](STORY.md)
**Depends on:** 5.3.2

## Objective

**The first figure in this product that says how unusual something is.** Until
now every number on screen has said _what happened_; this one says _how that
compares with this security's own history_.

## What the user can see when this lands

**The percentile beside the 5-minute return** in `Abnormal-move indicators`,
with the sample it was taken against. Still no 0–100 score and still no band.

## Work

- **A second cell on the existing figure row, and one new footer row.** The
  region draws **five** rows today — label, figure, qualifier, **tape**
  (`Measured on IEX`, invariant 6) — at **106 px**, which is
  `16 + 4 + 26 + 8 + 32 + 4 + 16` exactly. **Any shape that forgets the tape row
  is 20 px wrong before it starts.**

  ```
  5-MINUTE RETURN
  ▲ +0.42%   99th percentile
  Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 5 of 5 minutes
  of 4,620 five-minute returns · all times of day pooled
  Measured on IEX
  ```

- **106 px does not survive and that is the accepted price** — one step, one
  row. The new reserve is a **probed figure per width**, not this file's guess:
  `pnpm probe /securities/NVDA --within "Abnormal-move indicators"` and the
  stories at all four widths, measured against **the bias clause, which is the
  longest string the row can hold**.
- **The percentile cell is a flex item, not inline text.** A micro child inside a
  metric strut measured **125 against 122 px** in Task 5.2.3 — a 3 px step at
  every width, invisible to jsdom and fatal to the one-height claim.
- **It is `--ink-primary`, never the price palette.** The return beside it is
  already tinted; a second tinted number in one band is where the 1.04:1
  greyscale problem becomes two numbers deep.
- **Four channels tell a percentile from a change, three of them non-colour**:
  the **ordinal suffix** (no numeral in this product ends in `th`), the
  **absence of `%`** (AC 7 made visible rather than only true), the **word**
  `percentile` immediately after it, and the untinted ink.
- **Integer ordinals only, and `>99th` is the ceiling** (the owner's Gate 1
  decision). Above the highest order statistic there is no sample, so `100th`
  asserts a strict maximum over a sample that **excludes the scored window** and
  no reader can falsify it. `PRODUCT_SPEC.md` §11's own `99.1st` example gains a
  **dated amendment** — the precedent is §9 carrying Story 4.4's refusal of
  percentages.
- **The counted `n`, never a constant** (the owner's Gate 1 decision), so the
  sentence is `of 4,620 five-minute returns` for a dense name and a smaller
  figure for most.
- **AC 8's bias, answered: always three words, conditionally a clause, and never
  from a clock.** `· all times of day pooled` whenever a percentile draws —
  that is not a caveat, it is what the figure **is**, the sample's shape beside
  its size, the way breadth states its denominator. Then, when **the figure's own
  measured window** falls in the first thirty minutes of the session:

  ```
  of 4,620 five-minute returns · opening 30 minutes, the fattest-tailed bucket — pooled, this reads high
  ```

  **The condition is read off the figure's own `from`/`to` instants**, which are
  bars' own `startsAt` and already on the frame — so it is **not a second clock**,
  `computedAt`/`sentAt`/`Date.now()` stay absent, and it is **correct in replay**.
  A wall clock would be wrong in the state the region already has a story for: a
  window that **ended** at 09:45 and is read at 11:00 must still carry the
  clause, and a 09:30–10:00 clock drops it exactly then.

- **One tape per comparison is not achievable and the screen must not imply it
  is.** The numerator is `iex`-over-`iex` by construction; the baseline is `sip`
  only. **Every comparison this story ships is a SIP baseline against an IEX
  numerator**, and invariant 6 has something to say about that — one clause,
  in the register Story 5.2 set, beside the existing `Measured on IEX`.
- **Fix the stale comment shipped in 5.2.3**: `AbnormalMove.tsx` says _"Three
  lines of room are reserved … the clause wraps to three at 390"_ and the CSS
  reserves **two** — the probe corrected the reserve and the comment was not
  swept.

## Done when

1. The percentile draws beside the return with its counted `n`, from a frame
   this product's own server produced.
2. **Integer ordinals only**, `>99th` at the ceiling, and `%` appears nowhere
   near it — with `PRODUCT_SPEC.md` §11 carrying its dated amendment.
3. The bias clause is conditional on **the figure's own instants**, with no
   clock reader anywhere in the band, asserted.
4. The region is **one height in every state at every width**, probed and
   recorded per width, with the bias clause as the longest string.
5. The SIP-baseline-against-IEX-numerator fact is on screen in one clause.
6. The stale three-line comment is corrected.
7. `pnpm verify` green; `pnpm probe` run at four widths and the screenshots
   looked at.

---

## What was done — 2026-10-14

**The percentile is on the screen.** A second cell on the figure's row, one new
footer row stating the sample, and a second clause on the tape line. Five files
are new or changed in the producer chain and the region is **142 px** in every
state at every width.

### What a reader sees

```
5-MINUTE RETURN
▲ +0.42%  99th percentile
Oct 14 · 09:38 EDT → Oct 14 · 09:43 EDT · observed 3 of 5 minutes
of 4,620 5-minute returns · opening 30 minutes, the fattest-tailed
bucket — pooled, this reads high
Measured on IEX · baseline on All US exchanges
```

### The one deviation from this file's own copy, and it is the span

The task file writes `of 4,620 **five**-minute returns`. The shipped sentence
says **`5-minute`**, because the span is **read off the frame** rather than
spelled: `return-baseline.ts`' `SAMPLE_SPAN_MINUTES` argues at length that the
baseline's grid stride is deliberately **not** `RETURN_SPAN_MINUTES` and that
_the product spells `5` three times, each with its own home_. A word typed in a
browser would have been the **fourth** home and the one that does not move when
the sampler's does. The wire carries `percentile.spanMinutes`; the digit also
matches the region's own label, `5-MINUTE RETURN`, two rows above it.

### The pieces

| Where                                               | What                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/market-stream-protocol.ts`     | `WireReturnPercentile` — rank, `aboveSample`, `sampleCount`, `spanMinutes`, `feed` — and `WireMeasuredReturn.percentile: … \| null`, a **total** member for `seen`'s reason. Encoder, and a decoder that **bounds** the three numbers |
| `apps/backend/src/return-percentile.ts`             | `returnPercentileOf` — the inverse of `breakpointsOf`. Pure, no clock, no handle, no protocol                                                                                                                                         |
| `apps/backend/src/five-minute-return-wire.ts`       | the percentile as a **second argument**, so `fiveMinuteReturn` stays a pure function over a window                                                                                                                                    |
| `apps/backend/src/index.ts`                         | the baseline cache instantiated and loaded at startup, and the **join** — the one site that holds both the live window and the stored distribution                                                                                    |
| `apps/frontend/src/market/return-percentile.ts`     | the words: the ordinal, the ceiling, the sample clause and the bias clause                                                                                                                                                            |
| `apps/frontend/src/market/five-minute-return.ts`    | two new band members, and the tape's second clause                                                                                                                                                                                    |
| `AbnormalMove.tsx` / `.module.css` / `.stories.tsx` | the cell, the row, four new stories                                                                                                                                                                                                   |

### Done when

**1. The percentile draws with its counted `n`, from a frame this product's own
server produced.** Two frames, printed by a throwaway instrument that ran the
**shipped** modules against **this machine's own store** — the real
`return_baselines` generation through the shipped store and cache, real stored
`sip` minute closes through the shipped trailing window and pure function, the
join copied from `index.ts`, and `encodeMarketStreamMessage`'s bytes. Verbatim:

```
baseline generation held: 2026-09-11 over 516 securities
stored closes: 2026-09-11T19:54:00.000Z 218.720000  2026-09-11T19:59:00.000Z 218.190000
stored row: n=4620 refusal=null breakpoints[0,50,99,100]= 0.0000, 0.0999, 0.7512, 1.6102

FRAME (397 B):
{"type":"return","version":1,"sentAt":"2026-10-14T11:51:16.601Z","symbol":"NVDA","return":{"measured":true,"percent":-0.24231894659839118,"from":{"at":"2026-09-11T19:54:00.000Z","price":218.72,"feed":"sip"},"to":{"at":"2026-09-11T19:59:00.000Z","price":218.19,"feed":"sip"},"observed":1,"spanMinutes":5,"percentile":{"rank":82,"aboveSample":false,"sampleCount":4620,"spanMinutes":5,"feed":"sip"}}}
```

and the **refusal** path, on one of the five securities Task 5.3.2's split guard
refused — a row that carries an `n` and no breakpoints:

```
stored row: n=4620 refusal=split-discontinuity breakpoints[0,50,99,100]= null

FRAME (322 B):
{"type":"return","version":1,"sentAt":"2026-10-14T11:51:29.089Z","symbol":"CRWD","return":{"measured":true,"percent":-0.14494854326714565,...,"percentile":null}}
```

**What it does not prove**, said here because the instrument is deleted: the
bars reached the window from the **store** rather than from a socket, because
this machine has no live feed and its minute history ends 2026-09-11. The socket
half is `market-gateway.process.test.ts`' new case, which carries the five
fields through a real `WebSocketServer` on the routing path a browser uses.

**2. Integer ordinals, `>99th` at the ceiling, `%` nowhere near it.** The
producer clamps to `BASELINE_BREAKPOINT_COUNT - 2` and sets `aboveSample` off
the **top order statistic** — so a magnitude between the 99th breakpoint and the
sample maximum is a legitimate `99th`, and only a magnitude **strictly above
every sample** draws `>99th`. Asserted over every rank 0–99 × both flags that
the string never contains `100`, and over the teens (`11th`, not `11st`).
`PRODUCT_SPEC.md` **§11 and §5.1** both carry dated amendments: §11 for the
`99.1%` example (SE at the 99th of n = 4,620 is 0.146 points) and §5.1 for the
`98.4th percentile` tool response, whose _point_ — who calculates — is untouched.

**3. The bias clause is conditional on the figure's own instants, asserted.**
`percentileSample(percentile, from, to)` reads `marketSessionStateAt(from)` and
tests an **overlap** with `[open, open + 30m)`. No clock reader exists anywhere
in the band — and that is now **mechanical**:
`the-opening-bias-is-read-off-the-figure` (59 invariants now) walks every
shipped source file for the clause's own words, requires exactly one home,
requires that file to hold the session read, and refuses `Date.now()`, a
zero-argument `new Date()`, `computedAt` and `sentAt` in it.

**The break, and the half of it that was done by hand.**
`pnpm break the-opening-bias-asked-the-wall-clock` is registered; the harness
**refuses a dirty target** and the file is new in this change, so it was
performed manually and must be re-run by the harness after the commit. The
transcript, red for the right reason — an assertion failure naming the check,
with the other 57 still collecting:

```
  ✗ the-opening-bias-is-read-off-the-figure
    apps/frontend/src/market/return-percentile.ts draws the opening-bias clause AND reads a process clock (`new Date()`).
```

**The second conjunct was proved separately, on the defect somebody else
writes**, per `CLAUDE.md`'s _write the defect the next author writes_: the
condition was moved into a new `opening-bucket.ts` reading `new Date()`, with
the clause's words left behind. The shipped check went red on conjunct 2; a
one-conjunct draft — the clock pattern alone — is **green on that defect**,
because `shippedSourceFiles()` strips comments and the holder file then contains
no clock token at all in code. That is the draft that would have shipped without
this note.

**4. One height in every state at every width, probed.** `pnpm probe
/securities/NVDA --within "Abnormal-move indicators"`:

| Width | Content box | Region     |
| ----- | ----------- | ---------- |
| 1440  | 419 px      | **142 px** |
| 1024  | 446 px      | **142 px** |
| 768   | 318 px      | **142 px** |
| 390   | 308 px      | **142 px** |

**106 → 142 px**, as `16 + 4 + 26 + 8 + 32 + 4 + 32 + 4 + 16`: the step this
story was told it would pay, one row (+36 px). And across **twelve** states —
the eight Story 5.2 shipped plus the four new ones — at the rail's four content
widths, measured with the region's box forced to each: **142 px in all 48
readings**, with the figure row at **26** and the sample row at **32**
throughout. The reserve is the **bias clause's**, which wraps to two lines at
276 px of content, 32 px narrower than the narrowest real rail.

**Two defects the probe caught and nothing else would have.** The percentile
cell first measured **29 px against 26** — Task 5.2.3's 3 px step, arriving
again: `.absent`'s metric-leading trick is correct for the row's **only** item
and wrong beside a 20px figure, because baseline alignment unions the two line
boxes. On the dense 18px leading the row is 26 **and the baselines coincide**;
an `align-self: center` version measured 26 too and sat **~1.25 px high**,
photographed at 8× rather than computed.

**5. The SIP-baseline-against-IEX-numerator fact is on screen in one clause.**
`Measured on IEX · baseline on All US exchanges`, built from
`MARKET_FEED_DESCRIPTIONS` at both ends and from `BASELINE_FEED` — the store's
own `where` — carried on the frame. It draws **only where a percentile does**
(ADR 0029), so the refusal states and every gated run are unchanged.

**6. The stale three-line comment is corrected**, with a note saying the CSS was
right throughout and the comment was the thing left behind.

**7. Gates.** `pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm stories`,
`pnpm links`, `pnpm invariants` (**59**), `pnpm env:check`,
`pnpm coverage:check`, `pnpm test` (464 + 1,115 + 1,533, no `Unhandled
Errors`), `pnpm test:process` (60). **`pnpm e2e` was not run** — the browser
spec is Task 5.3.4's, and nothing here touches a shipped layout outside this
region.

### What is owed, and to whom

- **Task 5.3.4** has the minimum sample and its sentence, the split refusal's
  sentence, the three correctness layers, the remaining state pictures, the
  browser spec and the live-region trigger. Nothing here invents a threshold.
- **Nobody has seen this against a live feed**, and no gated machine ever will:
  CI's store is 516 securities and zero bars, so every gated run renders
  `No bars observed yet` and no frame can carry a percentile.
- **The spoken form of `>99th` is unanswerable from a DOM** — whether a reader
  speaks `>` as _greater than_, or at all, differs by reader. It joins
  `docs/GAPS.md`' standing screen-reader item rather than being claimed
  answered.

## The orchestrator's half — 2026-10-14

### Looked at, not only measured

`market-abnormalmove--in-the-opening-bucket` at 390, photographed:

```
5-MINUTE RETURN
▲ +0.42%   99th percentile
Oct 14 · 09:38 EDT → Oct 14 · 09:43 EDT · observed 3 of 5 minutes
of 4,620 5-minute returns · opening 30 minutes, the fattest-tailed bucket — pooled, this reads high
Measured on IEX · baseline on All US exchanges
```

The bias clause fires because the **figure's own window** is 09:38–09:43, not
because a clock said so. And the no-percentile state holds the sample row
**empty and reserved**, which is the one-height claim doing its job rather than
a gap.

### Three findings where the specification was necessary and not sufficient

These are the ones worth keeping, because in each case following the task file
exactly would have shipped the defect it was written to prevent.

1. **"A flex item, not inline text" was not enough.** It _was_ a flex item and
   still measured **29 px against 26**: `.absent`'s metric-leading trick works
   only because it is its row's **only** item, and beside a 20 px figure
   baseline alignment unions the two line boxes. Dense leading gives 26 **and**
   coincident baselines.
2. **The two figures concatenated for a screen reader.** `textContent` read
   **`+0.42%99th percentile`**, because the gap between them is `margin-left`,
   which is invisible to assistive technology. A whitespace-only text node fixes
   it at **zero layout cost** — Flexbox §4: an anonymous flex item containing
   only white space is not rendered. **This is the class of defect this product
   has a standing rule about** — assert the concatenation a screen reader is
   handed, never a single element's text — and it was caught by applying that
   rule rather than by looking at the screen, where it is invisible.
3. **The author's own one-conjunct draft of the new invariant was green on the
   defect.** `shippedSourceFiles()` strips comments, so a file whose condition
   has moved into a clock-reading neighbour contains no clock token in code at
   all. The second conjunct requires the session read to live **with the
   clause's words**, and it was proved by planting exactly that file.

### And one the product's own vocabulary refused

**`of 4,620 five-minute returns` cannot be shipped as written.** This product
spells `5` three times — an eligibility cutoff, a measurement span, and now the
baseline's grid stride — each with its own home and its own argument, which is
[ADR 0043](../../../docs/adr/0043-two-five-minutes-a-freshness-cutoff-and-a-measurement-span.md)'s
whole point. **A typed-out word would have been a fourth home.** Shipped as
`of 4,620 5-minute returns`, with `spanMinutes` carried on the wire.

### The break, re-run through the harness

`pnpm break` refuses a dirty target and the check's file was **new**, so the
developer performed it by hand. Re-run on the committed tree:

```
$ pnpm break the-opening-bias-asked-the-wall-clock
Breaking apps/frontend/src/market/return-percentile.ts
  A bias clause that asks whether it is the open NOW rather than whether the
  FIGURE was measured at the open is caught — the defect that loses the clause
  on a window which ended at 09:43 and is read at 11:00, gains it on a stale
  Friday figure read on Monday morning, and is wrong in every state under a
  replay.

✓ apps/frontend/src/market/return-percentile.ts broken → red → restored byte-identical.
  matched: the-opening-bias-is-read-off-the-figure
```

**The entry is named for the DEFECT (`the-opening-bias-asked-the-wall-clock`)
and the check for the CLAIM** (`…-is-read-off-the-figure`), which is this
registry's convention and is why a run by the check's name finds nothing.

### Gates

- `pnpm verify` — **exit 0** at load 3.40, `59 invariants hold.`, **3,172
  tests** (464 + 1,115 + 1,533 + 60).
- `pnpm probe` — twelve states at four widths, **142 px in all 48 readings**,
  and the opening-bucket state photographed at 390.
- `pnpm break the-opening-bias-asked-the-wall-clock` — red then restored
  byte-identical, on the committed tree.

### What this leaves standing

- **No gated machine will ever draw a percentile.** CI's store has zero bars, so
  there is no trailing window, no return, and no baseline — the region's
  permanent state there is the reserved row and the honest absence.
- **AC 6's minimum sample is still not implemented.** `sample_count` crosses the
  wire and nothing refuses on it yet; that is Task 5.3.4's, and until then a
  security with **737 samples** prints a percentile as confidently as one with
  4,620.
- **The three correctness layers are 5.3.4's.** What exists here is the shape,
  the ceiling and monotonicity; the golden sample, the independent recompute and
  the properties are the next task's.

## For a stakeholder — a status report, 2026-10-14

**The product now says how unusual a move is.** Beside the five-minute return it
prints a percentile — _99th percentile, of 4,620 five-minute returns_ — which is
the first figure in MarketPulse that compares something against its own history
rather than just reporting it.

Three things were deliberately made harder to misread. The percentile is **never
written with a percent sign** and never carries a decimal, because a sample of a
few thousand cannot support one and two numbers formatted alike would be read as
the same kind of thing. It **never prints 100th**, because that would claim a
record no reader could check; above every sample we have it says _greater than
99th_. And when the move being scored happened in **the first half hour of
trading** — structurally the most volatile part of the day — the region says so,
in its own words, because otherwise a perfectly ordinary opening move reads as
exceptional.

Three defects were found by following this repository's existing rules rather
than by looking at the screen: a spacing fix that was invisible to the eye but
made a screen reader say "plus nought point four two percent ninety-ninth
percentile" as one run-on number; a three-pixel misalignment that would have
made the region change height; and a new build check that, as first written,
**would have passed on the very mistake it exists to catch**.
