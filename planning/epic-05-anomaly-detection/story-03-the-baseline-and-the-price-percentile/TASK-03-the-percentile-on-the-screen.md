# Task 5.3.3 — The Percentile on the Screen

**Status:** Not started
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

<!-- written at completion -->
