# Task 5.5.4 — The volume band draws

**Status:** Complete — 2026-10-20 — the figure draws, and **on every machine that exists today it is an honest refusal**, because the `iex` tape's best bucket achieves **10.65%** relative standard error against a 5% target and NVDA needs **132 sessions**. The numerator contract is a **RATE** — `Σvolume / span` against a per-minute median — with a partial span **refused** rather than scaled, because the three available scalings are an imputation, the same imputation rearranged, and the `?? 0` defect. Measured: region **142 → 256 px, +114, uniform at four widths**, one height across **twelve states** — and **two refusal sentences were 26 px too tall** at 308 px and were shortened, which only the probe could see. A **floor** was added that the task file does not name: `toFixed(1)` renders a small ratio as `0.0×`, which asserts zero volume. §1.4's trigger fired a **third** time.
**Story:** [5.5 The Volume Factor, & the Tape It Rests On](STORY.md)
**Depends on:** 5.5.3

## Objective

The story's visible deliverable: a volume figure beside the return and the
percentile.

## What the user can see when this lands

**`volume 4.1× typical for this time of day`** in `Abnormal-move indicators`,
with its baseline defined and its tape named — or, on every machine without IEX
depth, an honest refusal saying which kind.

## Work

- **A second BAND, not a third cell** (Gate 1 decision 3). Derived reserve:
  separator 12 + label 16 + 4 + figure 26 + 8 + terms 32 + 4 + tape 16 =
  **+118 px, region 142 → 260**, uniform at four widths. **Re-probe per width
  and record the measured figure** — `pnpm probe /securities/NVDA --within
"Abnormal-move indicators"` (the **full** region name; a prefix prints
  `⚠ no region named …`). §1.4's trigger fires a **third** time.
- **The nearest relative is `Band` in `AbnormalMove.tsx` itself**, generalised
  from _the return band_ to _a band_, with `HeldRoom` reserving both. Nothing new
  is needed.
- **Drawing a multiple, five channels, three colourless.** `×` is **U+00D7
  glued to the digits**, same size, weight and ink — never `x`, never
  superscript, never a smaller suffix; no other figure in this product ends in
  `×`. **No sign, ever** — `+4.1×` is a category error and an unsigned figure is
  the strongest single discriminator. **One decimal always** (`1.0×`, `10.0×`),
  tabular numerals. **The word `typical` immediately after**, as the comparand
  rather than a unit. **Untinted `--ink-primary`** — inherited, not decided:
  _Volume does not encode direction_ is already settled in
  `VISUAL-LANGUAGE.md`.
- **The shapes that break naive formatting.** Below 1: `0.3× typical`, identical
  treatment, **no reciprocal and no word** — "3.3× quieter" invents a second
  scale and a direction, and `quiet`/`heavy` collide with Story 5.6's band
  vocabulary, which is the collision AC 3 is about. Very large: a stated digit
  cap, `>999× typical` above it, **re-using the percentile's shipped `>` glyph**.
  Exactly 1: **`1.0× typical`** — never `—`, which is `unchanged` in
  `PriceChange` and would assert zero volume, AC 4's own lesson.
- **The baseline's three facts in one row**, `·`-separated, in the register
  `.sample` already set: `median of 60 sessions · same 5-minute bucket · today
excluded`. Measured: **1 line at 419/446 px of content, 2 at 318/308**, so a
  32 px reserve. Foldable: the median and the lookback, and the bucket width.
  **Not foldable**: the refusal sentences and the shortfall count.
- **The tape row is per band**, which is already how this region works —
  `five-minute-return.ts:280` ships `Measured on IEX · baseline on All US
exchanges` **today**, so two tape claims in one region is **structural rather
  than a contradiction**. The failure mode would be one region-level tape line,
  which this region does not have.
- **The serialiser trap, before the schema is written.** A refusal must not reach
  the wire as a figure: declare the properties
  `satisfies Record<keyof T, JsonSchemaProperty>` and assert an **injected
  body**, because `fast-json-stringify` turns a `null` under `"number"` into
  **`0`** — a plausible `0× typical`.

## Done when

1. The figure draws, and the region is **one height in every state at every
   width** — probed, screenshots **looked at**, and the measured number recorded
   rather than the +118 derivation.
2. Every refusal kind draws a sentence that does not read like another's.
3. A browser spec through a **furnished frame**, plus an **out-of-frame** claim:
   `baseline-cost`'s `iexRows` at `0`/`null` means no same-tape baseline exists,
   so a drawn IEX ratio is fabricated **by construction**. Proved red on a
   planted producer defect first.
4. §1.4's trigger recorded as fired, with the measured displacement.
5. `pnpm verify` green; scoped specs green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-20

### What a reader sees

A second band in `Abnormal-move indicators` on `/securities/:symbol`:

```
VOLUME PER MINUTE
4.1×  typical
last 5 minutes · median minute of 60 sessions · same 5-minute bucket · today excluded
Measured on IEX · baseline on IEX
```

**And on every machine that exists today, this instead:**

```
VOLUME PER MINUTE
No IEX volume history for this security
```

That is not a degraded state. Gate 1 decision 1 made the baseline same-tape
`iex`, the `iex` tape begins on 2026-09-23, and the nightly pass writes **no
row** for a security with no `iex` bar in the window — so CI, every laptop and
every developer's store answer `no-same-tape-baseline` for all 516 securities,
permanently. The figure above has been drawn **only in Storybook**.

### The numerator contract, which Task 5.5.3 left to this task

**A five-minute sum against a per-minute median is a RATE.** The numerator is
the shares printed in the five minutes the return covers, divided by the span;
the denominator is the median volume of **one minute** of this time of day. Both
sides are shares-per-minute, the ratio is dimensionless, and nothing is scaled.

**The arithmetic is identical to `Σvolume / (5 × median)` and the CLAIM is
not**, which is the whole of the distinction and is why the band's label is
`VOLUME PER MINUTE` rather than `5-MINUTE VOLUME`. `5 × median` is _the typical
five-minute volume_ — a quantity this product does not hold and cannot derive,
because the median of a sum is not the sum of medians — so a figure drawn under
a label naming five minutes would assert something nothing computed. That is
Gate 1 decision 3's own argument (a figure under a label is a claim about what
the label names) applied one level down, to the wording rather than to the row.

**A partial span is REFUSED rather than scaled, and there are three wrong
answers rather than one:**

- `Σvolume × 5/k` imputes the minutes IEX did not print as if they traded like
  the ones it did;
- `Σvolume / k` — the rate over the observed minutes alone — is **the same
  imputation with the arithmetic rearranged**, and it is the one a reviewer
  would wave through, because it looks like a rate. On a tape whose median
  per-symbol minute presence is 65.1% the unprinted minutes are systematically
  the quiet ones, so it is biased **upward** by an unmeasurable amount;
- `Σvolume / 5` with `k < 5` is the `?? 0` defect: it reads an absent bar as
  zero shares, which on IEX is a claim about a stock exchange (AC 4).

So `bucket-partially-observed` fires at `k < 5`, and `k` is **the same count
`fiveMinuteReturn` already produced in the same pass that sums the volume** —
which is why the numerator was added to that function rather than to a module of
its own. Two reasons, and the second is mechanical: a sum taken by a second
traversal is a second measurement that can disagree with the first, and a second
module would need a **second span cutoff**, which
`one-home-for-the-observation-window` refuses by name.

**Where the baseline is read is the one approximation here, and it is stated.**
The bucket is the one the **newest** of the five minutes falls in, so the five
minutes straddle two buckets whenever that minute is not the last of its bucket
— up to four minutes of the day away. _Rejected: aligning the numerator to the
grid_, which is exact and would draw the figure **one minute in five** at full
coverage, because a grid bucket is complete only on its last minute and the
trailing window is 6.5 minutes deep — it does not reliably hold the previous
bucket at all. A figure that blinks on and off on a five-minute cycle is a worse
answer than one whose grain is the five minutes `PRODUCT_SPEC.md` §11 calls
_approximate_. _Also rejected: a denominator summed from each minute's own
bucket median_, which is exact and continuous and needs two buckets' precision
bounds combined into one — new arithmetic, and an `n` the surface could no
longer state as a single number.

### The order the refusals are asked in, which is a product decision

**A bucket-independent refusal outranks the numerator's.** _We have never heard
IEX for this security_ and _the history crosses a price break_ are facts about
the whole session; _we heard two of these five minutes_ resolves itself in a
minute. Reporting the transient one first would hide the durable one behind a
sentence that keeps changing — and on every machine today the durable one is the
answer, so this decision is what puts the informative sentence on the screen
rather than `No IEX bars in the last 5 minutes` blinking.

### The six sentences, verbatim

| refusal                     | sentence                                                  |
| --------------------------- | --------------------------------------------------------- |
| `no-same-tape-baseline`     | `No IEX volume history for this security`                 |
| `too-few-sessions`          | `Too little history — 80 IEX minutes at this time of day` |
| `split-discontinuity`       | `Unadjusted price break — shares not comparable`          |
| `zero-volume-baseline`      | `No IEX shares in a typical minute at this time of day`   |
| `no-bar-in-bucket`          | `No IEX bars in the last 5 minutes`                       |
| `bucket-partially-observed` | `IEX printed in only 2 of 5 minutes`                      |

Every number in them is read off the frame. **No two read alike**, asserted as a
`Set` over the whole vocabulary rather than by eye, and each names IEX where the
fact is about IEX — _we have no history_ is about our store, _nothing printed in
these five minutes_ is about **one venue's tape**, which is `describeSilence`'s
narrowing applied to a new sentence.

**Two of them were 62 and 65 characters and had to be shortened**, which is the
defect the probe found and nothing else could: drawn in the figure's own
reserved single metric line box, they wrapped and **stepped the region by 26 px
at 308 px wide** — 282 against 256 — at the one width nobody develops at. The
budget is now measured and written down beside them: **58 characters fit at
308 px and 62 do not**.

### The region's measured height, in every state at every width

**142 → 256 px, +114, uniform at all four widths.** The task file derived
**+118, 142 → 260**; the measurement is 4 px under it. The band is 102 px and
the separator is a 12 px top margin on it — no rule, because a drawn line here
would be the only horizontal rule inside a `Region` in this product.

`pnpm probe /securities/NVDA --within "Abnormal-move indicators"`, 2026-10-20:

| width | content box | region before | region after |
| ----- | ----------- | ------------- | ------------ |
| 1440  | 419 px      | 142           | **256**      |
| 1024  | 446 px      | 142           | **256**      |
| 768   | 318 px      | 142           | **256**      |
| 390   | 308 px      | 142           | **256**      |

**One height in every state**, probed across **twelve** states at the rail's own
four content widths through the stories (`pnpm probe --story … --viewports
485x900,512x900,384x900,374x900`, because the story box at 374 is the rail's
308): the multiple, below 1, exactly 1, above the cap, below the floor, all six
refusals, the `null` comparison and the held room. **256 px in every one of
them, at all four widths** — after the two long sentences above were shortened.

`MARKET-OVERVIEW.md` §1.4's trigger is recorded as **fired a third time**, with
the measured displacement, and it is the first firing under the second half of
that section's widened wording: nothing was _filled_, a region holding figures
_moved_.

### Drawing a multiple — five channels, three colourless

`formatMultiple` is the one home for it. `×` is **U+00D7 glued to the digits**
in one element, at the same size, weight and ink; **no sign, ever**; **one
decimal always**; `typical` immediately after as the **comparand** rather than a
unit; and untinted `--ink-primary`, inherited rather than decided (_volume does
not encode direction_).

**Below 1 gets no reciprocal and no word** — `0.3× typical`, not `3.3×
quieter`: a reciprocal invents a second scale running the other way, and
`quiet` / `heavy` collide with Story 5.6's band vocabulary. **Exactly 1 draws
`1.0×`**, never a dash. **Above the cap, `>999×`**, re-using the percentile's
shipped `>` — and the condition is `>= 1000` rather than `> 999`, because
`999.4×` is three integer digits and draws.

**And there is a FLOOR, which the task file does not name.** `toFixed(1)`
renders every ratio below 0.05 as **`0.0×`**, and `0.0× typical` is the one
sentence this figure exists to keep off a screen: it reads as _nothing traded_.
The producer guarantees a ratio strictly above zero and the decoder refuses one
that is not, so a `0.0×` could only ever be the **formatter** inventing it —
AC 4's lesson arriving at the last place anybody would look for it. Below the
floor the figure says `<0.1× typical`.

### What shipped, module by module

- **`packages/shared/src/volume-baseline.ts`** — the six-word vocabulary,
  **moved** from the backend, which is where Task 5.5.3's own note said it would
  go the day the wire carried it. No alias was left behind.
- **`market-stream-protocol.ts`** — `WireVolumeRate | WireRefusedVolume`, a
  **sibling of `return` on the frame rather than a field inside its measured
  arm**, because the two refuse independently: a window with no bar five minutes
  back has no return and may hold all five minutes of volume. The decoder bounds
  the ratio strictly above zero, the sample as a positive integer, and the tape
  against the known feeds.
- **`five-minute-return.ts`** — `volume` beside `observed`, summed in the one
  pass, on both the measured arm and `ObservedSpan`.
- **`volume-ratio.ts`** (new, pure) — the contract above, the refusal order, and
  the one division.
- **`volume-baseline-store.ts`** — `readNewestGeneration`, frontier **per tape**
  because the tape is in the key, with the three parallel arrays zipped into one
  entry per bucket and a row that is neither an answer nor a refusal dropped.
- **`volume-baseline-cache.ts`** (new) — the **third** instance of this shape,
  copied rather than extracted, with the reversal trigger written down: the
  fourth generation cache, or the first defect that has to be repaired in all
  three. It reads `BASELINE_REFRESH_FLOOR_MS` and `windowEndBoundFor` from the
  return baseline's cache rather than spelling either again — one nightly pass
  writes both tables.
- **`market-gateway.ts`** — `symbolReturn` now answers **both figures**, because
  they come from one walk of one window; two producers would be two walks and a
  pair that can describe different minutes.
- **`AbnormalMove.tsx` / `.module.css`** — the second band, with `HeldRoom`
  reserving **both**.

### The checks, and the break proved GREEN on the defect first

**`one-home-for-the-multiple-glyph`** — the `×` is written in exactly one
shipped file. The clause is the **glyph**, which a re-implementer cannot avoid,
rather than the identifier.

**The naive draft passed WRONGLY, with the transcript kept.** The obvious check
is _`formatMultiple` is declared exactly once, in the home_. Run against
`apps/frontend/src/market/composite-score.ts` — the file Story 5.6 plausibly
writes, holding `` `${ratio.toFixed(1)}× normal` `` and no import at all — it
reported:

```
66 invariants hold.
```

The shipped check, same tree:

```
✗ one-home-for-the-multiple-glyph
  2 shipped files draw a ×, expected exactly 1:
    apps/frontend/src/market/composite-score.ts
    apps/frontend/src/market/volume-ratio.ts
1 of 66 invariants failed.
```

The plant was deleted and the run returned to `66 invariants hold.`

**Keep or delete the weak draft: DELETED**, and the rule is the check's own
shape. This is a **single behaviour** — one glyph, one home — so a conjunct
satisfied by an identifier can never fail for the reason the check was written,
which is exactly 5.5.2's and 5.5.3's call. 5.5.1 kept its weak line because it
was one of two conjuncts and deleting it would have tripped the other; there is
no second behaviour here for _the module declares the formatter_ to guard.

**Two breaks registered, both hand-performed with checksums**, because
`pnpm break` refuses a dirty target and every file in this change is
uncommitted.

`a-second-multiple-glyph` — the plant is the **renderer appending the glyph the
formatter already returned**, which is how a `<sup>`, a smaller suffix or a
second ink gets written. Red at `2 shipped files draw a ×`, naming
`AbnormalMove.tsx`; `e725bb7f…` before and after.

`the-volume-multiple-is-fabricated-rather-than-refused` — the producer answers a
confident `4.1×` where it should refuse. Red on the **out-of-frame** claim, with
the other three tests still passing:

```
Error: a store with no iex rows holds no same-tape volume baseline, so a drawn IEX multiple is fabricated
Expected: > 0
Received:   0
```

`eb550146…` before and after.

**And one existing break had to be re-pointed and re-proved**:
`the-percentile-is-fabricated-rather-than-refused`'s `find` named the line this
task changed, so `every-break-can-still-land` went red immediately. Re-pointed,
hand-performed, and red for the right reason —
`a gateway with no market-data provider has observed nothing, so a measured
5-minute return is fabricated`, 3 passed 1 failed — with the checksum matching
either side.

### What was run

| command                                                            | result                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `pnpm probe /securities/NVDA --within "Abnormal-move …"`           | 142 → **256 px** at all four widths; screenshots looked at                                             |
| `pnpm probe --story … --viewports 485x900,512x900,384x900,374x900` | twelve states × four content widths; **two at 282 px**, repaired, then 256 everywhere                  |
| `pnpm e2e security-abnormal-move.spec.ts`                          | **4 passed (8.7s)** — including the new volume test                                                    |
| `pnpm test:database`                                               | see below                                                                                              |
| `pnpm verify`                                                      | see below                                                                                              |
| `node scripts/check-invariants.mjs` on the plant                   | **1 of 66 failed**, naming the new check                                                               |
| three hand-performed breaks                                        | each red on an assertion with the rest still collecting; trees restored, checksums matched either side |

**`pnpm e2e` was NOT run whole**, deliberately: the brief asked for it to be
skipped on a memory-starved machine and named the two-worker run as the owner's.

### What is false in the task file or the brief, said plainly

1. **The brief's constraint 6 is false for this surface.** It asks for the
   schema properties to be declared
   `satisfies Record<keyof T, JsonSchemaProperty>` "because
   `fast-json-stringify` turns a `null` under `"number"` into **`0`**". **There
   is no JSON schema anywhere on the market stream**: every frame is built by
   `WireFields` maps and `JSON.stringify` in `encodeMarketStreamMessage`, and
   that coercion cannot happen on this wire at all. It is a real trap on a
   **route** — 5.5.2's fourth break is exactly it, on
   `GET /diagnostics/baseline-cost` — and this task adds no route. The hazard
   the brief is pointing at is real and was answered with the mechanism this
   wire has: a **discriminated union**, so the refused arm has no `ratio`
   member and a `0×` is unrepresentable rather than guarded; plus decoder
   bounds (ratio strictly above zero, an integer sample, a known tape)
   asserted against **injected bodies**, which is the half of the brief that
   does apply.
2. **The derived reserve is 4 px out.** `+118 px, region 142 → 260` is the task
   file's; the probed figure is **+114, 142 → 256**, uniform. Recorded as a
   measurement rather than carried as the derivation, which is what the task
   asked for.
3. **The task file lists a digit cap and no FLOOR**, and one decimal needs
   both. `toFixed(1)` draws every ratio below 0.05 as `0.0×`, which reads as
   _nothing traded_ — the one claim this figure exists to keep off a screen.
   `<0.1×` is the mirror of `>999×`.
4. **`five-minute-return-wire.ts` says `five-minute-return.ts`' own suite
   asserts it exports exactly ONE function; the suite asserts one exported
   FUNCTION, not one export.** The distinction is load-bearing for this task:
   `RETURN_SPAN_MINUTES` is already exported beside it, and the volume
   numerator was added as a **field on the returned value** rather than as a
   second function, so the guard is satisfied rather than widened.
5. **The brief says the tape row is "already how this region works" and cites
   `five-minute-return.ts:280`.** True in substance; the line number had
   already rotted (that file's `tapeOf` was at 253 when this task started, and
   the function has since **moved** to `measured-tape.ts`, because the volume
   band needs the same grammar with a different pair of feeds and two copies
   would be two answers to _how does this product name the tapes behind a
   comparison_). A line-keyed pointer is premise 5 of this story's own Gate 1,
   proving itself for the third time.
6. **`Done when 3` is met in letter and the figure's half of it is vacuous
   everywhere.** The browser spec passes through a furnished frame and grounds
   its claim outside it, and the break proves the out-of-frame assertion red —
   but **the measured arm cannot run on any machine**, including production,
   until the `iex` tape has depth. `docs/GAPS.md` carries that with an owner
   and a condition rather than being finessed here.

## For a stakeholder — a status report, 2026-10-20

**The product now says how busy a security is, and today it says that it cannot
say.**

Beside the return and the percentile, the security page draws one more figure:
_volume per minute, 4.1× typical_ — how heavily this security is trading right
now against a typical minute at this time of day, measured over sixty trading
sessions. Under it, in the product's own words, what that comparison was made
against and which market feed both halves came from.

**On every machine we own, it draws a sentence instead**, and that was the
decision taken at this story's gate rather than a fault found now. The figure is
built from one venue's data — the same venue our live feed comes from, because
comparing one venue's volume against the whole market's history would make every
security look permanently quiet — and we have only been recording that venue
since late September. Measured against the deployed system this morning: our
best-covered security, NVDA, holds eighty minutes of history for a typical time
of day where it needs enough for the first decimal place to mean something, and
would need about **132 trading sessions** to get there. So the product says
_"Too little history — 80 IEX minutes at this time of day"_ rather than printing
a number it cannot stand behind, in six different sentences depending on which
thing is missing, because _we have never heard this venue for this security_ and
_we have heard it and it is not enough yet_ are a fault and a wait and should not
look the same.

**The hard decision in it was arithmetic rather than design.** The figure
compares five minutes of trading against a typical **single** minute, and there
are three plausible ways to bridge that gap. Two of them quietly invent data for
the minutes the venue did not report — and on this feed that is roughly a third
of them — and the third treats a minute nobody reported as a minute in which
nothing traded, which is a claim about a stock exchange rather than about our
listening. All three produce a confident, well-formed, wrong number. The product
takes none of them: it compares like with like, and where it cannot it says how
many of the five minutes it actually heard.

**What it cost to be sure the page does not move.** The region grew by 114
pixels, once, and every state of it is now exactly the same height — twelve of
them, measured at four screen widths — so nothing shifts under somebody reading
it. Two of the six sentences were four characters too long at phone width and
pushed the page down by 26 pixels; nothing mechanical could see that, and the
only reason it was caught is that somebody looked at the page at every width
before running a test suite.
