# Task 4.8.13 — The suite's own two repairs: an assertion that sees its subject, and axe at a size that means something

**Status:** **Complete — 2026-10-10.** Both repairs landed, **no product code
changed** and the permitted test id not taken — the class `ChartPending`
already owns is unique in the built stylesheet. The gap-fill predicate counts
ADR 0028's cover by that class and names what it saw; its rate fell from
**25.0% (CI 13.6–39.6%)** to **5.6% pooled over 144 executions at four workers
(CI 2.8–10.6%)**, non-overlapping, and **0 / 24** at one worker. A plant proved
the old predicate **read zero against a page that was genuinely covered**.
**Nine** axe passes — not the six the ranking named — are served a 27-row
sample with one full-universe pass kept and labelled; scoped, the nine went
**68.0 s → 13.5 s** and three settled whole-suite runs are **3.0–3.2 m, 2 of 3
clean, with no timeout at all**, against 4.8.9's 0 of 3 clean at 4.8–6.2 m.
**Two product defects are reported rather than repaired**: the 5.6% residual is
a **real cover drawn over both plots during a refill nobody asked for**, and
the result surface's active option fails contrast at **4.32:1** on the full
universe as well as the trimmed one, reachable today by typing a different
letter.
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.9

## Objective

**Added 2026-10-10 at the owner's decision**, from Task 4.8.9's
characterisation. Two repairs to the browser suite, both of them to the suite's
own instruments rather than to the product.

## What the user can see when this lands

**Nothing.** A reader sees nothing; a developer sees a suite that fails one run
in four stop doing that, and a slow family stop being slow for a reason that
bought no coverage.

## Work

### Repair 1 — the predicate counts the wrong elements

`security-gap-fill.spec.ts:165` fails at **25.0% per execution at the suite's
own four workers** (12 of 48) and 4.2% at one. **13 of 13 failures are line
219**, never 220, every one `Received array: [2]`.

**The assertion cannot see its subject.** ADR 0028's cover is `ChartPending`,
which is in full a `<div aria-hidden="true" className={styles.pending} />` with
**no text**, and the word `Fetching` exists nowhere in this product — `grep`
exits 1. What the predicate actually matches, quoted off the running pair at
t = 150–200 ms:

    p "Loading securities. Anything typed is kept and will match as soon as they arrive."
    p "Loading the tracked universe…"

**`SecuritySearch` and `UniverseTable` — the 518-row Explorer shell's own first
load, racing the sampling loop's start.**

**Count the cover by its own identity rather than by text.** It is
`aria-hidden`, so it is deliberately invisible to an accessible-name query —
which is the reason the text route was reached for in the first place. Prefer
the class the component already owns or a test id it is given here; do **not**
reach for a text match on a sibling, and do not widen the window to make the
race less likely, which is what the spec's own comment already tried.

**And the spec's own comment is a live false claim**, amended by 4.8.9 and worth
reading before editing: it attributed the flakiness to the sampling budget and
the final assertion.

**The acceptance figure is a rate, not a pass.** Re-run at **n ≥ 24 at four
workers**, under 4.8.9's protocol — the load gate refuses rather than warns,
`pgrep -f` first, load recorded either side — and **report the rate with its
confidence interval.** A single green run proves nothing at 25%.

### Repair 2 — axe over 518 identical rows buys runtime and no coverage

The suite's slow family is **eight tests at 15–49 s against a 30 s per-test
ceiling, six of them axe over all 518 rows at four viewports**. That is why
every recorded failure set is **disjoint**, and why a suite run takes this
machine from load **5.31 to 31.04** — **the browser suite is its own plant.**

**Scope the axe passes to a trimmed universe** — the route's own `GET
/securities` intercepted at ~20 rows, which Task 4.8.6 already does for its
control arm and Task 4.8.2 for its render counts — **and keep one
full-universe pass**, because the claim _axe is clean on the real page_ is
worth holding somewhere.

**The argument, which belongs in the spec rather than in this file:** axe's
findings are per **rule** and per **element kind**, not per element, so 518
rows of one shape exercise the same rules as 20. What 518 rows uniquely test is
**duration**, and that is `pnpm probe` and Epic 14's job rather than axe's.

**Two traps named before you meet them.** `e2e/README.md` records that **axe's
scope changes the answer** and that the two scopings must never be compared —
so the trimmed pass and the full pass are **two assertions, not one with a
different input**, and each says which it is. And a permutation grid conflicts
with landmark uniqueness only for landmarks with **no accessible name**, which
is a property of the page rather than of the row count.

**Measure the prize rather than asserting it**: the family's durations before
and after, at the same worker count, with the load recorded.

### Boundaries

**No product code.** If either repair wants a change under `apps/`, that is a
finding to report rather than a licence — the exception is a **test id on
`ChartPending`**, which is the one product edit this task may make, and only if
the class it already owns will not serve.

Not the other three flakes: `securities-route`'s margin, the process-suite
sighting (**measured as the machine at 79.2% under a plant and 0 of 48
quiet**) and `index.process`'s unreproduced one all stay as 4.8.9 recorded
them.

## Done when

1. The gap-fill assertion counts the cover by its own identity, and the
   wrong-subject match is gone
2. Its rate is re-taken at **n ≥ 24 at four workers** under 4.8.9's protocol,
   reported with a confidence interval
3. The axe passes run against a trimmed universe with **one** full-universe
   pass kept, each saying which it is
4. The family's durations are measured before and after at the same worker
   count
5. `docs/GAPS.md`'s entries for both are amended with what is now true
6. `pnpm verify` and `pnpm e2e` green — and if `e2e` is not green, the failures
   are characterised against 4.8.9's two families rather than re-run

---

## Findings — 2026-10-10

### The machine, and what it was allowed to be

Task 4.8.9's protocol, reused unchanged. The gate is a **wait loop that
refuses rather than warns** — `loadavg[0] / 8 < 0.75`, inside Task 4.8.1's
`LOAD_CEILING = 1.0` with margin, 30-minute deadline then non-zero — and it
`pgrep -f`s this story's four script names (`overview-instrument.mjs`,
`browser-leg.mjs`, `session-sitting.mjs`, `spin.mjs`) **before** anything is
believed, which is Task 4.8.6's orphan check. Nothing matched at any point.
The gate held three arms back and printed what it was waiting for:

```text
waiting — load 9.19 ratio 1.15
waiting — load 7.44 ratio 0.93
waiting — load 6.10 ratio 0.76
GATE OPEN — load 5.04 ratio 0.63 (8 cores)
```

**No window was discarded inside an arm**, for the reason 4.8.9 gives: the
discard happens _before_ the arm, by refusal. Load is recorded either side of
every arm below. `pnpm ready` reported the pair and the database up throughout.

The brief warned the machine was at ~11 of 8 cores and decaying. It was: the
first gate took four polls to open.

---

## Repair 1 — the predicate now counts its own subject

### What it counts

`covers()` in `e2e/specs/security-gap-fill.spec.ts`, one `page.evaluate`,
returning **names rather than a count**:

- **`ChartPending`**, by the CSS-module class the component owns —
  `[class*="_pending_"]`. **No product edit was needed and none was made.**
  The permitted test id was not taken because the class already serves and is
  unique: `grep -oh '_pending[A-Za-z0-9_]*' apps/frontend/dist/assets/*.css |
sort -u` returns exactly **`_pending_xij4y_17`**, one class in the whole built
  stylesheet. `[class*="_x_"]` is this suite's established idiom
  (`security-price-motion.spec.ts`, `overview-breadth-region.spec.ts`,
  `overview-movers-ranking.spec.ts`). Both plots render the component, so one
  selector covers the price plot and the volume plot.
- **`BarSeriesPanel`'s `Reading the series…`** — the panel being **replaced**
  rather than covered. This is an addition rather than a translation, and it
  closes a hole neither predicate had: `seen.filter((d) => d === "")` is
  believed to catch a blanked plot, but `priceLine` returns the **longest path
  on the page**, so with the plot gone it returns a chrome icon's `d` —
  non-empty, changed, which **breaks the loop and passes**.

Each cover is named with the region it sits in. The assertion reports the
**sample index** too, which is what separated a product defect from a staging
race below.

**The window was not widened**, per the brief. The spec's own comment recording
that the 2026-10-07 raise did not lower the rate is left standing and extended.

### The old predicate would have PASSED on the defect it exists to catch

This is the part worth keeping, and it is `CLAUDE.md`'s own rule — _write the
defect somebody else will write, and confirm the check passes wrongly first_.
A throwaway spec delayed every `GET /market-data/bars` by 3 s and pressed
`1 month`, i.e. produced ADR 0028's cover deliberately. Verbatim:

```text
PLANT — repaired predicate counted 2; the old text predicate counted 0
```

**`2`**, because both plots draw the cover. **`0`** from the predicate that
shipped. So the broken assertion was not only failing wrongly a quarter of the
time — against a page that genuinely _was_ covered it read zero. The throwaway
is deleted; this transcript is the record of it.

**One incidental finding from writing the plant, and it is about the suite
rather than the product.** The window control's cells have accessible name
`1 month`, not `1M` — the glyph is `aria-hidden` and the visually-hidden span
supplies the name — so `getByRole("radio", { name: "1M" })` resolves to
**nothing**. `security-window-control.spec.ts` gets this right everywhere
(`cell(page, "1 month")`, and `getByText(label, { exact: true })` for the
glyph's box). The suite is correct; the trap is one a next author will meet,
and the probe that settled it is quoted here so they do not have to:

```text
PROBE radio text="1M1 month" visible=true enabled=true
PROBE 1M count=0
```

### The rate

Every arm `pnpm e2e security-gap-fill.spec.ts --repeat-each=N --workers=W`,
failures counted **per execution** of _the chart is never blanked or covered_.

| arm                     | n       | failures | rate      | 95% CI (Wilson) | load before | load after |
| ----------------------- | ------- | -------- | --------- | --------------- | ----------- | ---------- |
| **BEFORE** (4.8.9)      | 48      | 12       | **25.0%** | **13.6–39.6%**  | 5.0–5.2     | 6.9–15.3   |
| after, `--workers=4` ×1 | 48      | 3        | 6.25%     | —               | 5.92        | 12.34      |
| after, `--workers=4` ×2 | 48      | 2        | 4.17%     | —               | 5.85        | 11.20      |
| after, `--workers=4` ×3 | 48      | 3        | 6.25%     | —               | 5.73        | 13.17      |
| **after, pooled**       | **144** | **8**    | **5.6%**  | **2.8–10.6%**   | —           | —          |
| after, `--workers=1`    | 24      | **0**    | **0%**    | 0–13.8%         | 5.04        | 3.67       |

**The two intervals do not overlap**, which is the arithmetic this measurement
exists for: 13.6–39.6% against 2.8–10.6%. The three after-takes differ **only
in what a failure prints** — same locator, same loop, same assertion semantics,
two successive improvements to the diagnostic — so pooling them for a rate is
legitimate and is stated rather than hidden.

**And the load figures are the reason to pool rather than to quote one take.**
4.8.9's own lesson: two arms on the same commit minutes apart gave 33.3% and
16.7%. Three takes here gave 6.25 / 4.17 / 6.25 — a tighter spread, and still
not a figure any single take could have published.

The suite remains its own plant: every four-worker arm took the machine from
~5.8 to 11.2–13.2.

### The 5.6% residual is a REAL cover, and it is a product defect

**Every residual failure, identically, at every take:**

```text
Error: a cover was drawn over a plot during a refill nobody asked for

expect(received).toEqual(expected) // deep equality

- Array []
+ Array [
+   "sample 0: ChartPending over Price",
+   "sample 0: ChartPending over Volume",
+ ]
```

**`sample 0`. Both plots. Never a later sample. 0 of 24 at one worker.**

The loop opens after the page has already drawn the short series — `before` is
non-empty and the spoken sentence carries the short count — and after
`feed.drop()`, the disconnected assertion and `feed.serveBars(AFTER)`. The only
request that can be in flight at `sample 0` is the **refill**, and ADR 0028's
160 ms cover is being drawn over it. That is precisely what this test exists to
forbid: _nobody asked for the refill, so it must not look like a wait_ — a
socket that blinked **38 times in 4h 36m** on 2026-09-22 must not pulse a panel
over the chart 38 times.

**Reachable in production.** Four Chromium workers are one way of making a
refill answer take longer than 160 ms; a loaded tier is another.

**Routed to the developer and not repaired**, per the brief's boundary. What is
unknown is whether the refill path is marked `loading` in the state machine at
all, or whether a second request — `withLiveEdge`'s, the resume's — is what
`usePendingPanel` sees. `held-series.ts` and `use-pending-panel.ts` are where
that is decided. **Neither ADR 0028's 160 ms nor the sampling window may be
relaxed to make it green.**

**The three diagnostic iterations are recorded because each one was necessary
and the first was a trap.** (1) A **count** failed with `Received array: [2]` —
**byte-identical to the broken predicate's failure**, so a real cover and the
old wrong-subject match were indistinguishable in the output. (2) **Names**,
which gave `ChartPending over ?` — the regions are plain
`<section aria-labelledby>`, so their `region` role is **implicit** and
`[role="region"]` matches none of them; `closest("section")` does. (3) **Names
plus the sample index**, which is what proved `sample 0` and therefore the
refill.

---

## Repair 2 — axe at a size that means something

### What changed

`e2e/support/universe.ts` intercepts `GET /securities` through
`SECURITIES_ROUTE_PATTERN`, lets the **real backend answer**, and cuts the body
down — the same shape `securities-route.spec.ts` already used to empty
`lastCloses`, reused rather than invented, as the brief asked. `securities`,
`lastCloses` and `coverage` are all filtered to one symbol set.

**Nine passes trimmed, one full pass kept.**

| pass                                                                 | population    |
| -------------------------------------------------------------------- | ------------- |
| `securities-route` — the tracked universe renders from the real pair | **FULL, 518** |
| `securities-route` — loaded universe axe, 1280x720 / 560 / 480       | trimmed, 27   |
| `securities-route` — the open result surface                         | trimmed, 27   |
| `securities-route` — nothing has a close                             | trimmed, 27   |
| `securities-route` — a query that matches nothing                    | trimmed, 27   |
| `security-explorer-shell` — the shell at 1440 / 1024 / 640 px        | trimmed, 27   |

**The kept pass is the one that installs no route at all**, which is Story
1.13's split and what makes it go red on a wrong `CORS_ORIGIN` — so it could
not have been trimmed even if _axe is clean on the real page_ were not worth
holding. Convenient rather than clever, and stated so nobody reads it as a
coincidence.

**Each pass says which it is, in its own axe label** — `— the FULL 518-row
universe` against `— a TRIMMED universe`. The brief's first trap:
`e2e/README.md` records that axe's scope changes the answer and that two
scopings must never be compared, and the same caution applies to two
populations. They are two assertions, and no figure from one is quoted beside a
figure from the other.

**Task 4.8.9's ranking named six axe passes; there were nine.** _a query that
matches nothing_ ran axe over the whole universe at **7.2 s** with a sentence
as its subject and was not in the ranked eight. It is trimmed too.

### The trim is a SAMPLE, not a slice

A head slice of twenty symbols would have removed **element kinds** rather than
elements: the first twenty alphabetically are ordinary equities in two sectors,
so the page would have lost the market-proxies group, ten of eleven sector
bands and both ETF kinds — exactly the rows a rule might fire on. The sample
keeps **every ETF** (four index ETFs, which are the `Market proxies` group and
the one band header carrying a sentence rather than a sector name; eleven
sector ETFs, which are each band's `Benchmark` row), **one equity per sector**,
and **`NVDA`/`AAPL`** by name. **27 rows against 518.**

The brief's second trap — a permutation grid conflicts with landmark
uniqueness only for landmarks with no accessible name — does not arise: every
landmark on these routes is named, and the row count cannot change that.

### The argument, which is in the spec rather than only here

axe's findings are per **rule** and per **element kind**, not per element. A
`color-contrast` finding on the thirtieth row of one shape is the same finding
as on the five-hundredth; `region`, `landmark-one-main` and
`page-has-heading-one` are properties of the assembled page. What 518 rows
uniquely test is **duration**, and duration is `pnpm probe`'s job and Epic
14's. `security-explorer-shell.spec.ts` already said the consequence out loud
and this is it followed one step: _a timeout and a violation are not the same
finding, and a test that can produce either is a test whose red tells you
nothing._

### The fence, which caught itself on its first run

`expectTrimmed()` refuses a pass whose interception did not fire, which is
`SECURITIES_ROUTE_PATTERN`'s own recorded failure mode — a trimmed axe pass
that silently ran against 518 rows would be slow, green, and
indistinguishable from the thing it replaced. It went red immediately, on three
Explorer-shell passes at ~700 ms:

```text
Error: the trimmed universe interception never fired — this pass is running against the full 518 rows under a trimmed label
Expected: > 0
Received:   0
```

**The fence was right and the usage was wrong**: on `/securities/:symbol` the
`Price` region is visible long before `GET /securities` is answered. It polls
now. It also asserts the kinds — `NVDA`, `SPY`, `XLK` — because a trim that
lost the proxies or the benchmarks would pass two bare counts.

### The prize, measured

`pnpm e2e securities-route.spec.ts security-explorer-shell.spec.ts
--workers=4`, same command both sides, same machine, `--reporter=list`.
**Playwright used 2 workers for both**, because `fullyParallel` is not set so a
**file** is the unit of parallelism and two files cannot fill four workers —
stated because the number in the command and the number in the output
disagree, and the comparison is like-for-like regardless.

Load **4.29 (ratio 0.54) → 5.19** before, **4.94 (0.62) → 6.64** after.

| pass                                | before     | after      |
| ----------------------------------- | ---------- | ---------- |
| loaded universe axe, 1280x720       | 8.2 s      | **1.6 s**  |
| loaded universe axe, 1280x560       | 7.4 s      | **1.2 s**  |
| loaded universe axe, 1280x480       | 7.2 s      | **1.3 s**  |
| the open result surface, axe        | 7.3 s      | **1.4 s**  |
| nothing has a close, axe            | 7.3 s      | **1.3 s**  |
| a query that matches nothing, axe   | 7.2 s      | **1.3 s**  |
| Explorer shell axe, 1440px          | 7.7 s      | **1.6 s**  |
| Explorer shell axe, 1024px          | 8.4 s      | **1.9 s**  |
| Explorer shell axe, 640px           | 7.3 s      | **1.9 s**  |
| **the nine, summed**                | **68.0 s** | **13.5 s** |
| **the kept FULL 518-row pass**      | **8.7 s**  | **9.9 s**  |
| the two files, 29 tests, wall clock | **1.2 m**  | **35.3 s** |

**80% off the nine.** The kept pass is unchanged within the spread, as it must
be — it is the control.

**These are scoped figures and they are not the 15–49 s Task 4.8.9 recorded.**
That is 4.8.9's own finding: scoped, a test has the machine to itself. What the
trim does to the **in-suite** figures is read off a full `pnpm e2e` run, and
Story 4.9's `pnpm e2e` ×3 arm is where that belongs — handed there in its own
file.

### A real product defect, found by accident, and it is NOT a cost of the trim

Trying `a` instead of `he` on the trimmed result surface turned the gate red.
Four arms, one variable at a time, settled the question:

| population    | query | options | violations             |
| ------------- | ----- | ------- | ---------------------- |
| trimmed, 27   | `a`   | 10      | **1 `color-contrast`** |
| trimmed, 27   | `he`  | 1       | none                   |
| **full, 518** | `a`   | 10      | **1 `color-contrast`** |
| **full, 518** | `he`  | 10      | none                   |

Verbatim:

```text
color-contrast
  target: #_r_0_-option-0 > ._change_s4mm0_178 > ._positive_wso9y_23._change_wso9y_6._dataCell_1yxhk_82
  Element has insufficient color contrast of 4.32 (foreground color: #0f7b50,
  background color: #e7e8ef, font size: 9.8pt (13px), font weight: normal).
  Expected contrast ratio of 4.5:1
```

**The full untrimmed universe reproduces it exactly**, so it is a product
defect that this surface's axe passes have never reached. The node is the
**first** option — the active descendant — and the ink is `--price-up` on the
active option's ground, so **any query whose top result is up fails**, which on
a live market is about half of them. `he` passes because the first of its ten
results happens not to be up: a fact about one laptop's store on one afternoon.

**`securities-route.spec.ts:310`'s own comment already warned about this
shape** in as many words — _"An accident is not a check. If CI ever gains bars,
the run above stops covering this and nothing says so."_ — written about a
different state on the same surface.

**So the queries were left exactly as they were.** Changing one would have
turned a required check red for a defect this task is not allowed to repair,
and would have changed two variables at once. The cost is stated rather than
hidden: the trimmed _open result surface_ pass judges **one** option where the
untrimmed judged ten. All ten are the same element kind, and the one that
remains **is** the active descendant, which is where the only known failing ink
lives. Its own `docs/GAPS.md` entry carries the four-arm table and routes the
ink to the developer and UX/Design.

---

## Done when — the verdicts

1. **Met.** The assertion counts `ChartPending` by its own module class and
   `Reading the series…` beside it, names each and reports the sample index.
   The wrong-subject match is gone and `Fetching|Loading` appears nowhere in
   the spec. No product code was changed; the permitted test id was **not**
   taken, because the class already serves and is unique in the built
   stylesheet.
2. **Met, at n = 144 rather than 24.** 5.6% (CI 2.8–10.6%) against 25.0%
   (CI 13.6–39.6%), non-overlapping, plus 0/24 at one worker. Protocol as
   4.8.9's; loads either side of every arm, in the tables above.
3. **Met, and wider than asked** — nine trimmed, not six, because the ranked
   eight missed one. One full-universe pass kept, each pass labelled, the two
   never compared.
4. **Met.** Nine passes 68.0 s → 13.5 s, two files 1.2 m → 35.3 s, same command
   and same worker count, loads recorded. Flagged as **scoped** figures, with
   the in-suite measurement handed to Story 4.9.
5. **Met.** Both entries amended; **one new entry added** for the contrast
   defect, which neither existing entry covers.
6. See **Gates** below.

### What this task found that it was not sent to find

- **The old predicate read zero against a deliberately covered page.** It was
  not merely noisy; it was blind in the direction that matters.
- **The 5.6% residual is a product defect** — ADR 0028's cover drawn over both
  plots during a refill nobody asked for, 0% at one worker, `sample 0` every
  time.
- **A `color-contrast` violation at 4.32:1 on the result surface's active
  option**, reachable on `main` today by typing a different letter, on the full
  universe as well as the trimmed one.
- **A ninth axe-over-518 pass** that Task 4.8.9's ranking did not name.
- **A diagnostic trap**: a repaired assertion that fails with
  `Received array: [2]` is indistinguishable in the output from the broken one
  it replaced. Names, not counts, wherever a count could collide with a known
  wrong answer.

## Gates

`pnpm verify` — **exit 0**, every step, and **no `Unhandled Errors` block**
(`grep -c "Unhandled Error"` on the transcript returns `0`):

```text
$ node scripts/check-quiet.mjs && pnpm run build && pnpm run lint && pnpm run format:check && pnpm run stories && pnpm run env:check && pnpm run links && pnpm run invariants && pnpm run coverage:check && pnpm run test && pnpm run test:process
$ tsc -b && pnpm --filter @marketpulse/frontend exec vite build && pnpm --filter @marketpulse/frontend exec storybook build
$ eslint . --max-warnings 0
$ prettier --check .
$ node scripts/check-stories.mjs
42 components, 42 stories files.
$ node scripts/check-env-example.mjs
16 backend variables documented, frontend example clean.
$ node scripts/check-links.mjs
516 documents, 1708 cross-file links, 39 anchor links, 0 broken.
$ node scripts/check-invariants.mjs
52 invariants hold.
$ node scripts/check-backfill-coverage.mjs
$ pnpm -r run test
packages/shared test:       Tests  440 passed (440)
apps/backend test:          Tests  1031 passed (1031)
apps/frontend test:         Tests  1396 passed (1396)
$ pnpm -r run test:process
apps/backend test:process:  Tests  44 passed (44)
VERIFY EXIT CODE: 0
```

**The first attempt was exit 1, and it is recorded rather than quietly fixed.**
One `@typescript-eslint/no-unnecessary-condition` error in this task's own new
code — `(line.textContent ?? "")`, where `lib.dom` types `textContent` as
non-nullable on an element from `querySelectorAll("p")`. The `?? ""` was
removed; nothing else changed.

`pnpm e2e` — **three settled whole-suite runs, load read BEFORE each per Task
4.8.9's finding that the suite is its own plant:**

| run | load before       | load after | result                        | failed                                     |
| --- | ----------------- | ---------- | ----------------------------- | ------------------------------------------ |
| 1   | **5.32** (r 0.66) | 28.71      | `232 passed (3.1m)`           | —                                          |
| 2   | **5.98** (r 0.75) | 27.39      | `1 failed, 231 passed (3.0m)` | `overview-nothing-to-open:545` — assertion |
| 3   | **5.99** (r 0.75) | 25.21      | `232 passed (3.2m)`           | —                                          |

**2 of 3 clean, 3.0–3.2 m against Task 4.8.9's 0 of 3 clean at 4.8 / 5.4 /
6.2 m with 1 / 1 / 3 failures — and not one timeout in the three**, where the
earlier three produced five between them, four of which were axe over 518 rows.
**Nothing from the ceiling family appeared at all.** `n = 3` separates nothing
and _2 of 3 clean_ is **not** quoted as a rate.

**The one failure is characterised rather than re-run to green, and it is in
NEITHER of Task 4.8.9's two families.** Verbatim:

```text
Error: expect(received).toEqual(expected) // deep equality
- Array [ "XLK", "XLC", "XLY", "XLI", "XLF", "XLV", "XLB", "XLP", "XLE" ]
+ Array []
 ❯ e2e/specs/overview-nothing-to-open.spec.ts:581:35
```

Not a timeout (1.2 s), not `security-gap-fill`. **Eleven expected tickers, zero
received** — the ranked `<ol>` was not on the page when the assertion ran.
**12 / 12 on an immediate scoped re-run** at `--repeat-each=12 --workers=4`.

**It is not reachable from this task's changes**: the only importers of
`e2e/support/universe.ts` are `securities-route.spec.ts` and
`security-explorer-shell.spec.ts`, and that spec routes its own socket. It has
its own `docs/GAPS.md` entry, recorded as a **sighting** and owned by Story
4.9, which is already paying for whole-suite executions. The entry carries the
part worth keeping: this spec is one of the two this repository names as immune
to the empty-ranked-list trap **because it furnishes its own frame**, and the
immunity is from CI's store rather than from a race — a furnished frame still
has to arrive, render and be read. This one failed loudly only because it
compares against a literal list; a sibling phrased as `toHaveCount(0)` would
have passed.

`pnpm test:database` — **not run.** Nothing here touches the schema, a query, a
migration or `apps/backend/src/schema.ts`; every change is in `e2e/`, in
`docs/GAPS.md` or in a planning document.

`pnpm break` — **not run, and none is owed.** This task adds no `pnpm
invariants` check. `expectTrimmed()` is a check, but it is an **assertion inside
the suite** rather than a `verify` step, and it was proved red in the only way
that counts: it went red by itself on its first run, on three real passes, with
the transcript above. Neither of the two `docs/GAPS.md` entries amended, nor
either of the two added, is a single grep.

### What falsifies a planning document or `CLAUDE.md`

- **`CLAUDE.md`'s `Measure rather than cite` block quotes this flake's rate
  twice** — _"14 / 120 ≈ 12%"_ and _"At 12% per execution, `P(0 failures in 6)
≈ 0.46`"_ — in the worked arithmetic behind _n=6 cannot separate a 12% flake
  from a regression_. The figure has now moved twice: 4.8.9 re-measured it to
  25%, and this task repaired it to **5.6%**. **The lesson survives and gets
  stronger** — at 5.6%, `P(0 failures in 6) ≈ 0.71` — so it is owed a dated
  amendment beside the worked example, never a rewrite. Handed to Task 4.8.10,
  which already held the same sentence from 4.8.9.
- **`docs/GAPS.md`'s ceiling-family entry said _six of the eight are axe runs
  over a surface holding the 518-row universe_**, and the ranked eight it was
  built on **missed one**: _a query that matches nothing_ ran axe over all 518
  rows at 7.2 s. Nine, not six. Corrected in the entry.
- **`docs/GAPS.md`'s gap-fill entry quoted the assertion by its source text**,
  `expect(panels.filter((count) => count > 0)).toHaveLength(0)`. That
  expression no longer exists. Amended.
- **The brief's own figure for the trim, _~20 rows_, is 27**, and the
  difference is deliberate: a 20-row head slice would have dropped the
  market-proxies group, ten of eleven sector bands and both ETF kinds. Stated
  here because a later reader comparing the brief with the code will otherwise
  read it as drift.
