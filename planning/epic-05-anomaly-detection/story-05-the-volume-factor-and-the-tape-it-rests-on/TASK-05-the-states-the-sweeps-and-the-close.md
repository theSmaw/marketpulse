# Task 5.5.5 — The states, the sweeps, and the close

**Status:** **Complete — 2026-10-20** — the sideways sweep was **3 of 3 MISSING**, worse than Story 5.4's 1 of 4; AC 3 was **not** met when verification started, because the same-day sweep reached `VISUAL-LANGUAGE.md` only and left the epic's own exit criterion saying `Volume 3.8× normal`; and AC 8's own `?? 0` rule was **violated three times by this story's own code**, once on a median.
**Story:** [5.5 The Volume Factor, & the Tape It Rests On](STORY.md)
**Depends on:** 5.5.4

## Objective

A collection of completed tasks is not a completed story.

## What the user can see when this lands

**Nothing new.**

## Work

- **The ADR this story owes: _what a cross-tape comparison is, and when it is
  refused._** Not because volume is new, but because **this product already
  ships a cross-tape comparison and has no decision record for it**: the live
  `iex` five-minute return is ranked against a `sip` baseline (`index.ts:1092`,
  `BASELINE_FEED`). That is legitimate — a return is scale-free and tape-invariant
  to first order — and volume is not, because the share **is** the quantity. The
  ADR states the invariance test (_is this quantity a ratio within one tape, or a
  level across tapes?_), retro-documents the price case, governs volume, and
  governs every Epic 6 and 9 factor afterwards. It is also where AC 1's
  measurement and the **no-multiplier** rule belong. **It is already disclosed on
  screen** — `Measured on IEX · baseline on All US exchanges` — so what is
  missing is the record, not the disclosure.
- **ADR 0035 is VINDICATED, not amended.** _A record of an observation rather
  than a cache of the best number_ is precisely what makes a same-tape `iex`
  baseline possible at all; had the store kept one row a minute under
  `SERVED_TAPE_RANK`, Gate 1 decision 1 would have been unimplementable. Cite
  it. **0034 needs no amendment** — no new per-bar field, so its trigger does not
  fire. **0043** needs a note only if the bucket width arrives as a third
  minute-scaled quantity.
- **The states into the kept grid** if the region's states changed — and note
  Story 5.4.6's finding: that grid keys on **surface text, not geometry**, so its
  silence is **not** evidence for the region's height.
- **Sweep upward** every figure this story falsified, and **sweep sideways by
  grepping for every `Story N.M` and `Owner:` line**, checking each against that
  story's own file and **recording the count that were missing**. Story 5.4's
  close was 1 of 4 missing; Story 5.3's missed its own epic file.
  **Known already**: Story 5.6 needs the volume factor's refusal set and the
  `>999×` cap; Epic 14 needs to know this story did **not** re-fire its condition
  and does **not** owe the `/` re-take.
- `docs/GAPS.md` for every claim left standing — at minimum that **no gated
  machine and no person can draw this figure**, and the measurement's n=1.
- **`LIVE-REHEARSAL.md` row 5.5, and it is a new KIND of row**: the figure is
  **unwatchable** rather than unwatched, because it becomes available on a
  **date nobody controls** — when `iex` depth crosses the floor. Say that on the
  row's face; no previous row has had to.
- `STORY.md` status; `MARKET-OVERVIEW.md` and `CLAUDE.md` only if what a user can
  see changed.

## Done when

1. The ADR exists, with alternatives and a **reversal trigger as a condition**.
2. The sideways sweep is **enumerated** and the missing count recorded.
3. `LIVE-REHEARSAL.md` row 5.5 states the unwatchable condition.
4. `pnpm verify` green, and the full suite run at **two workers** — four workers
   was measured at three or four front-of-margin failures a run, two workers at
   **none**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-20

### 1. ADR 0045 — the ADR this story owed

[`0045-a-cross-tape-comparison-and-what-a-ratio-is-a-ratio-of.md`](../../../docs/adr/0045-a-cross-tape-comparison-and-what-a-ratio-is-a-ratio-of.md),
indexed in `docs/adr/README.md`. **Three decisions**, not the one the task file
anticipated — the second and third emerged from Tasks 5.5.3 and 5.5.4 and had
nowhere else to live:

1. **The invariance test.** _Is this quantity a ratio **within** one tape, or a
   level **across** tapes?_ A ratio within a tape is comparable across tapes to
   first order; a level across tapes is **refused**. This retro-documents the
   price case — the live `iex` five-minute return ranked against a `sip`
   baseline, which has shipped since Story 5.3 with no decision record — and
   governs volume, where the share **is** the quantity.
2. **What a ratio is a ratio OF.** A span sum divided by its span is a **rate**;
   the median of a sum is **not** the sum of medians; a **partial** span is
   refused rather than scaled. This is Task 5.5.4's finding promoted to a rule.
3. **The tape belongs in the KEY.** `volume_baseline_passes` is keyed
   `(security_id, observed_at, feed)`, diverging from `0013`/`0014`, because
   Gate 1 decision 1's tape choice carries a reversal trigger and a tape-blind
   key would make reversing it a migration rather than a write.

**Strengthened at the close** with the cross-security spread (below), which is a
stronger argument for decision 1 than the within-security dispersion the ADR was
drafted from.

**ADR 0035 is cited as VINDICATED rather than amended**, as the task file
required: _a record of an observation rather than a cache of the best number_ is
what makes a same-tape `iex` baseline possible at all. **0034 needed no
amendment** — no new per-bar field, so its trigger did not fire. **0043** needed
none — the 5-minute bucket width is the return's own span rather than a third
minute-scaled quantity, which is the condition its note was reserved for.

### 2. AC 1's aggregate, recorded as FIGURES

The task file said AC 1's measurement belongs in the ADR. What was in TASK-02
was a **capability** — _the share is measurable per security_ — rather than the
aggregate AC 1 asks for. Taken from the six securities Task 5.5.2 measured and
written into both TASK-02 and the ADR:

| Security | Share on two-tape minutes | Bias over **all** `sip` minutes | Minute presence |
| -------- | ------------------------- | ------------------------------- | --------------- |
| `NVDA`   | **3.54%**                 | 2.75%                           | 81.6%           |
| `AAPL`   | 4.50%                     | 3.76%                           | 81.6%           |
| `KO`     | 10.36%                    | **8.32%**                       | 80.9%           |
| `CCI`    | 6.47%                     | 5.21%                           | 61.0%           |
| `NVR`    | **15.19%**                | 6.59%                           | 26.6%           |
| `ERIE`   | 10.51%                    | **2.20%**                       | **7.8%**        |

**A 4.3× spread on the share, and it runs INVERSELY with liquidity** — the most
liquid security measured has the **smallest** IEX share. The third column is the
one that decides the rule: the cross-tape bias is **2.20% to 8.32%**, so a ratio
built across tapes is **12× to 45× too low**, and _which_ depends on the security
the reader happened to open. **Gate 1 guessed 13×** from one security; the real
quantity is a range spanning nearly four-fold, which is why the comparison is
**refused** rather than corrected with a multiplier — there is no single
multiplier to apply.

**And exposure and presence come apart at the thin end.** `ERIE` prints on
**7.8%** of minutes but carries **20.9%** of the shares on the minutes it does
print; `NVR` is 26.6% against 43.4%. So _how often IEX prints_ is not a proxy for
_how much IEX sees_, in either direction.

### 3. The sideways sweep — enumerated, and 3 of 3 MISSING

Grepped this story's documents for every `Story N.M` and `Owner:` line, then
checked each against that story's own file:

| Named                                                                                           | Carried in that story's own file?  | Written                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Story 5.6** — the volume factor's refusal set, the rate contract, the `>999×` cap             | **No** — only a `Depends on:` line | The six refusal kinds, the rate contract (ADR 0045 decision 2), the caps, and the **+256 px** the band costs                                   |
| **Epic 14** — this story did **not** re-fire its condition and does **not** owe the `/` re-take | **No** — nothing at all            | Written, with the reasoning: the band is on `/securities/:symbol` and renders one element per **security on screen**, not per tracked security |
| **Epic 6** — ADR 0045 decision 1 governs every factor it will weight                            | **No** — nothing about 0045        | Written, in words that epic can act on                                                                                                         |

**3 of 3.** Story 5.4's close was 1 of 4; Story 5.3's missed its own epic file.
**The rate is getting worse, not better**, and the reason is visible in the
table: each miss is a document this story never opened, so nothing about writing
this story's own close would have reached any of them. The grep is the only
mechanism, and it is a step in this skill rather than a check.

### 4. The upward sweep — and AC 3 was NOT met

`Volume 3.8× normal` was swept on the day it was measured, and **the sweep
reached `VISUAL-LANGUAGE.md` only**. Verification found two live sites still
standing:

- `planning/PRODUCT_SPEC.md:749`
- `planning/epic-05-anomaly-detection/EPIC.md:146` — **the epic's own exit
  criterion**

Both now carry dated amendments. The second is the one that matters: the exit
criterion AC 3 is written against was **itself** the collision, so the criterion
is now met by a shipped sentence that differs from it **in both respects** — the
word (`typical`, not `normal`) **and** the unit (a per-minute **rate**, not a
bare multiple). Arithmetic in `VISUAL-LANGUAGE.md` quoting 88 px, one-3.8th and
23 px was left untouched: those are dated measurements of a drawing, not live
claims about the model.

**The lesson, for the record:** a same-day upward sweep is a `grep`, and a
`grep` run once reaches the sites that existed when it ran. `EPIC.md:146` was
not new — it was simply not in the first grep's output, because the first grep
was for the phrase in the design document's spelling.

### 5. AC 8's `?? 0` half — three violations in this story's own code

Verification's finding, not mine: AC 8 forbids `?? 0`, and Story 5.5 shipped
**three**. A developer was dispatched; all three are corrected and `pnpm verify`
is green at `66 invariants hold.` with `pnpm test:database` 336/336. **No test
changed** — neither an expectation update nor a loosening — because all three
substitutions are behaviour-preserving on every reachable path. What each turned
out to be is the interesting part:

| Site                                                                        | Reachable?                                                                                                                                                                             | Repair                                                                                                                                            |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `volume-baseline.ts` — `breakpointsOf(samples)[50] ?? 0`, **on the median** | **No** — two branches above return on an empty sample, and `breakpointsOf` throws rather than answering short                                                                          | A local `medianOf` that derives the rank as `(BASELINE_BREAKPOINT_COUNT - 1) / 2` and **throws with a stated reason** if the breakpoint is absent |
| `volume-share.ts` — a default fed to `medianRelativeStandardError`          | **No** — `buckets.length === 0` returns four branches above with `refusal: "no-sample"`                                                                                                | An explicit `undefined`, routed to that function's own documented _unknown precision_ rather than to a sample count no bucket has                 |
| `volume-ratio.ts` — `observed`                                              | **YES.** `refused()` is called before `span === undefined` is tested, and again by the `no-bar-in-bucket` branch — **a `0` reaches the wire today, on every machine with no provider** | A module-scope `NOTHING_OBSERVED` whose doc comment says it is a **measurement of that state**, destructured at the use site                      |

**The reachable one is not a wrong figure and is not drawn** — the only arm with
no numerator is `nothing-observed`, whose count is genuinely zero, and
`bucket-partially-observed` is the sole refusal whose sentence states `observed`.
So the repair is to make the zero a **named, documented count** rather than a
use-site default. That is the whole of what AC 8's rule is for: a `?? 0` is
indistinguishable from a measurement, and a named constant is not.

**Two things worth keeping.** The direction of the median's throw is deliberate:
a changed breakpoint count becomes a **loud nightly-pass failure** rather than a
persisted zero median that `comparableVolumeBaseline` then divides by. And
`@typescript-eslint/prefer-nullish-coalescing` **refused** the explicit ternary
the fix was first written as, so site 3 is `span ?? NOTHING_OBSERVED` with a
comment saying the operator is the linter's — **the repository's rule as written
forbids `?? 0`; it cannot forbid `??`.**

**One adjacent instance found and deliberately NOT fixed:**
`return-baseline.ts:434`, `const low = sorted[lower] ?? 0` inside
`breakpointsOf`. Same shape, same `noUncheckedIndexedAccess` cause, unreachable,
and **Story 5.3's code rather than this story's**. It is exactly the class the
`docs/GAPS.md` entry below exists to catch, and leaving it is the evidence that
the entry is needed.

### 6. `docs/GAPS.md` — three entries

1. **The volume factor is drawn by no machine and watchable by no person.** CI's
   store is 516 securities and zero bars with `provider=none`, and the figure
   needs `iex` depth that does not exist yet on any store. n=1 on the share
   measurement.
2. **A floating-point `ARRAY` escapes `migrate.database.test.ts`' _has no
   floating-point column anywhere_** — the check reads a column's type by its
   **shape**, and `double precision[]` is a different shape. Found by a draft
   migration being refused and then noticing what would **not** have been.
3. **Nothing checks for `?? 0`, and backend factor purity is held by prose.**
   The clock-purity lint rules are scoped to `packages/shared/src/**` **only**,
   so **no backend factor has ever been mechanically pure** — AC 8 has been
   asserted by four stories and checked by none. Recorded with a **condition**
   rather than widened blindly: widening the clock rules to the backend would
   catch the gateway reading the clock legitimately, which is a design question
   rather than a lint fix.

**No check was added in this task, so no break is owed.** Entry 3 is the one
that could be made mechanical and the reason it was not is stated on its face.

### 7. `LIVE-REHEARSAL.md` row 5.5 — and a mistake of mine

The row is a **new kind**: the figure is **unwatchable** rather than unwatched,
because it becomes available on a **date nobody controls** — when `iex` depth
crosses the per-bucket floor. No previous row has had to say that.

**I duplicated an existing row.** Task 5.5.4 had already added a 5.5 row (it is
in that commit's diff, one line) and I wrote a second one without grepping for
it first. Mine is removed and the survivor is augmented with the two things it
lacked: that the refusals are **watchable today** — a person can open a security
during a session and see the band refuse with its stated reason, which is half
of what the story ships — and the **95.5%** figure. The error is recorded
because the repository's own rule covers it (_a sentence duplicated for
legibility must be counted with a `grep` before it is corrected_) and I did not
follow it.

### 8. `STORY.md` and `CLAUDE.md`

`STORY.md`'s **_What the user can see_** still read as though a figure draws. It
is corrected: what draws is the band and its **refusals**; the figure itself
waits on depth. The sideways-sweep count is recorded in `STORY.md` as a dated
section. `CLAUDE.md`'s _Current state_ is amended for Story 5.5.
`MARKET-OVERVIEW.md` needed nothing — the band is on `/securities/:symbol`.

### Gates

| Gate                   | Result                                                                                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`          | **Green**, at a read load average of **6.52** before the run: `All matched files use Prettier code style!`, `581 documents, 1875 cross-file links, 39 anchor links, 0 broken.`, `66 invariants hold.`, shared 515, backend 1246, frontend 1651, `test:process` 60. **No `Unhandled Errors` block.** |
| `pnpm test:database`   | **336 passed (336)**, 11 files, 7.10 s                                                                                                                                                                                                                                                              |
| `pnpm e2e --workers=2` | **271 passed, 16 skipped, 0 failed, 8.5 m**, begun at a read load average of **6.89**. **Two workers produced no front-of-margin failures again**, against three or four a run at four workers.                                                                                                     |

**`verify` went red once, earlier, and it was the machine.** The documented
`market-gateway.process.test.ts` flake fired at a load average of **36.11**;
2 of 3 green when run alone, and the diff provably imports none of the gateway.
The green run above was taken after waiting for the load average to fall below
7, which is the procedure this repository's own amendment demands — **read the
load before the run, never during it.**

## For a stakeholder — a status report, 2026-10-20

This was the story's close: the decision record, the document sweeps, and the
final run of every gate.

**What it produced that matters.** One architectural decision record — when this
product may compare a figure measured on one market tape against a baseline
measured on another, and when it must refuse. It was written because the product
**already does this**, for prices, and had never written down why that is
legitimate; volume is the case where it is not, and without the rule the next
person adding a factor has no way to tell the two apart.

**Three things the close found that the story would otherwise have shipped
wrong.** An acceptance criterion about a single word was recorded as met when it
was not: the correction had reached the design document and not the epic's own
exit criterion, so the criterion the story is judged against still carried the
wording the story exists to fix. The story's own code broke one of its own
acceptance criteria three times, once in the arithmetic of a median, where a
missing value would have become a plausible **zero** rather than a visible
failure; all three are repaired, and one of them was reaching real users'
browsers today. And the hand-offs this story owed to three **other** pieces of
work were all three missing — the measurement would have been lost, which is the
exact failure this repository has written down twice before and walked into
again.

**What was measured rather than argued.** IEX's share of the market's volume,
which nothing in this product had ever measured: **3.5% to 15.2%** across six
securities, and **inversely with how liquid the security is** — so comparing the
two tapes directly would understate the answer by somewhere between **12 and 45
times** depending on which security a reader happened to open. The story had
guessed one figure for this. It is a range spanning nearly four-fold, and that is
why the comparison is refused rather than corrected with a multiplier.

**What was deliberately not done.** Two rules this product states constantly —
no silent defaults, and factors that never read the clock — are still held by
prose rather than by a check, and the second has **never** applied to the backend
at all. Widening the existing check is a design question rather than a lint
change, so both are recorded with the condition that should trigger the repair
rather than guessed at now. One instance of the same defect in Story 5.3's code
was found and left, as evidence.

**Where it leaves the work.** Story 5.5 is complete and ready for the Product
Owner's acceptance. What it ships owing is a **person**: five rehearsal rows for
this epic are unwatched, and row 5.5 is the first that is **unwatchable** for its
figure — that waits on a date nobody controls. The refusals, which are half of
what shipped, are watchable today.
