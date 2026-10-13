# Task 5.1.1 — The Decisions, the Band Rename, & Three Live Discrepancies

**Status:** **Complete — 2026-10-13** — the rename has **nine** homes rather than three, and a tenth match that looks identical must NOT be renamed: `MarketOverview.module.css`'s `"unusual"` is the `grid-template-areas` name for the `Unusual activity` region, so Done-when 3's grep can never return nothing.
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](STORY.md)
**Depends on:** nothing

## Objective

**Twelve decisions were taken at this story's two gates and five of them are
the reason the rest of Epic 5 is shaped as it is.** A decision re-litigated in
story four is a decision nobody took, so they are written into the governing
documents before any of them is built on.

**And one of them has a blast radius larger than its acceptance criterion
says.** `unusual` → `high` was written as two homes; it is **three**.

## What the user can see when this lands

**Nothing.** No screen changes. Paid off by Task 5.1.3, which draws
`Relative performance`.

## Work

- **`PRODUCT_SPEC.md` §11 gains a dated amendment** for Gate 1's decisions 2,
  3, 4 and 5 — the magnitude percentile, the pooled distribution, breadth as a
  stated clause rather than a weighted factor, and absolute calibration. The
  shape to follow is **§9's own amendment from Story 4.4**, which refuses §9's
  percentages and says why. **Do not rewrite §11's prose**; amend beside it and
  leave the original standing.
- **The `PROVIDER.md` / `market-bars.ts` contradiction is resolved with a dated
  note in both.** `PROVIDER.md` §3.1 says an adjusted series is obtained by
  **asking a provider for one**; `market-bars.ts`'s `STORED_BAR_ADJUSTMENT`
  docblock says Epic 5 _"will have to adjust for themselves"_. Both are live
  claims. The decision is **ask the provider**, and the reason to record beside
  it is §3.5: a series spanning no corporate action returns identical numbers
  either way, so a wrong adjustment argument is **invisible in testing and
  wrong exactly once**.
- **The band rename, in all THREE homes** — the acceptance criterion named two:
  1. `packages/shared/src/anomaly.ts` — `ANOMALY_BANDS`
  2. `AnomalyBadge` — the `BAND_CLASS` key **and** the class in
     `AnomalyBadge.module.css`
  3. **`apps/frontend/src/styles/market.css` — the `--anomaly-unusual` token**,
     which the AC did not mention and which a grep for `ANOMALY_BANDS` does not
     find.
     `VISUAL-LANGUAGE.md`'s ramp table carries no band names in its rows, so the
     table needs no edit — **its anomaly prose does**.
- **Three live documentation discrepancies, found while shaping and swept the
  same day** because falsification travels upward and nothing sweeps that way
  on its own:
  1. **The greyscale figure is spelled two ways in two live files** —
     `PriceChange.tsx`'s header says **1.05:1**, `VISUAL-LANGUAGE.md` and
     `market.css` say **1.04:1**. One measurement, two numbers, both live.
  2. **The positive green's contrast is published against three grounds in two
     files with no overlap on the tightest one.** `market.css` says **5.29 on
     white, 4.77 on sunken**; `VISUAL-LANGUAGE.md`'s table says **5.29 on
     `#ffffff`, 5.03 on `#f8f9ff`** and has **no sunken column at all** — so
     **4.77, the figure closest to the 4.5 floor, appears in exactly one of the
     two places a designer would look.**
  3. **`LiveFeedView.overview`'s docblock still says _"Nothing renders it
     yet — Task 4.2.5 is the payoff"_**, which is stale on `/` and correct on
     `/securities/:symbol`. It is about to become stale there too.

## Done when

1. §11 carries a dated amendment for decisions 2–5 with the original prose
   untouched, and the amendment states the **known cost** of the pooled
   distribution: the open is structurally the fattest-tailed bucket.
2. `PROVIDER.md` and `market-bars.ts` each carry a dated note naming the
   decision and pointing at the other, so neither reads as the live claim.
3. `ANOMALY_BANDS` reads `normal | elevated | high | extreme`, and
   `git grep -i 'anomaly.unusual\|"unusual"'` over shipped source returns
   **nothing** — including the CSS token, the `BAND_CLASS` key and the CSS
   class. `AnomalyBadge`'s own tests and stories move with it.
4. The three discrepancies are corrected at their live sites, with the **4.77
   sunken figure added to `VISUAL-LANGUAGE.md`'s table** rather than left in one
   file, and any dated measurement left standing as one.
5. `pnpm verify` green, and `pnpm links` green with its numbers recorded.
6. Every decision is recorded with its alternatives and, where one applies, a
   **reversal trigger that is a condition** rather than a story number.

---

## What was done — 2026-10-13

### The corrected rename count: NINE homes, not three — and two more the enumeration cannot see

The acceptance criterion said two, this task file said three, and the enumeration
run before any edit returned **nine files**. A figure that counts a phrase in this
repository is invalidated by recording it, so here is the command and the date:

```
$ git grep -n '"unusual"\|anomaly-unusual\|\.unusual\b\|unusual:' | grep -v unusualness     # 2026-10-13, before any edit
apps/frontend/src/components/AnomalyBadge/AnomalyBadge.module.css:43:.unusual {
apps/frontend/src/components/AnomalyBadge/AnomalyBadge.module.css:44:  background: var(--anomaly-unusual);
apps/frontend/src/components/AnomalyBadge/AnomalyBadge.stories.tsx:27:export const Unusual: Story = { args: { band: "unusual" } };
apps/frontend/src/components/AnomalyBadge/AnomalyBadge.test.tsx:27:      "unusual",
apps/frontend/src/components/AnomalyBadge/AnomalyBadge.tsx:30:  unusual: styles.unusual,
apps/frontend/src/components/Popover/Popover.stories.tsx:52,60,91,96    (four uses)
apps/frontend/src/components/SecurityRow/SecurityRow.stories.tsx:32,143,144
apps/frontend/src/routes/MarketOverview.module.css:252:      "unusual"          <- NOT the band. Left alone.
apps/frontend/src/styles/market.css:241:  --anomaly-unusual: var(--palette-amber);
apps/frontend/src/styles/tokens.ts:101:  "--anomaly-unusual",
packages/shared/src/anomaly.ts:25:  "unusual",
```

**And the grep cannot see two more sites, because the band is written in
backticks rather than in quotes.** Both are the same sentence — _"Where
`elevated` ends and `unusual` begins is detection policy"_ — copied from one
file to the other two years apart:

- `packages/shared/src/anomaly.ts:18`, the docblock three lines above the array
  it describes. **Renamed.** A vocabulary's own home describing a band that no
  longer exists is the worst place to leave it.
- `docs/adr/0004-styling-approach-component-library-and-the-component-workshop.md:461`.
  **Not renamed** — an ADR's decisions are never rewritten. It carries a dated
  amendment beside it saying the band is now `high` and that the bullet's own
  claim (no thresholds, they are Epic 5's) is untouched.

So: **nine homes by the command, eleven sites in ten files once the prose is
counted, of which ten were edited and one was deliberately not.** Expect the next
reader's `grep -c` to disagree with all of these numbers, because this paragraph
moved them.

Two sites were **considered and left**, both correctly:

- `docs/adr/0025-…:101,103` — _"amber means elevated or unusual across anomaly,
  feed, service and provenance"_ and _"this is unusual"_. The first is a claim
  about what a hue means across four domains rather than an enumeration of bands,
  and the second is the English word. Renaming either would make the ADR worse.
- `apps/frontend/src/components/AnomalyBadge/AnomalyBadge.module.css:19` —
  _"the absence of unusualness"_, the English word, excluded by the command's own
  filter.

### The two traps — both verdicts are the brief's

**Trap 1: `MarketOverview.module.css:252` is the region's grid area. The brief is
right, and it must not be renamed.** It is one of six quoted strings inside the
`grid-template-areas` of the `@media (width <= 860px)` rule, and the same name
appears twice more in the same file — `"topology unusual"` in the base rule at
:162, and `.areaUnusual { grid-area: unusual; }` at :205–206. It names the
**`Unusual activity` region**, which is `PRODUCT_SPEC.md` §8.1's and Epic 5's own
Story 5.4, and which this rename exists to stop colliding with. Renaming it would
drop a region out of the grid at ≤860 — a silent CSS failure of exactly the kind
`CLAUDE.md` says nothing below `pnpm e2e` can see.

**The consequence worth recording: this task's own Done-when 3 is unsatisfiable
as written.** It asks that `git grep -i 'anomaly.unusual\|"unusual"'` over shipped
source return **nothing**; it returns that one line and always will. The criterion
is met in substance — no band is named `unusual` anywhere in shipped source — and
the grep needs a `-- . ':!*MarketOverview.module.css'` or the narrower pattern.

**Trap 2: the token and its declaration must move together, and they do.** The
brief is right about the mechanism. `readTokens()` in `apps/frontend/src/styles/tokens.ts`
walks `TOKEN_NAMES` and **throws naming the token** when `getPropertyValue`
returns `""`; `main.tsx:51` calls `getTokens()` at mount and
`.storybook/preview.tsx:36` calls it again for the workshop. So renaming
`--anomaly-unusual` in `market.css` without renaming the entry in `tokens.ts`
is a blank page on every route, and renaming the entry without the stylesheet is
the same. They moved in one change.

**Proved at the production-build / real-browser level, because no cheaper level
can see it.** `pnpm test` applies no stylesheet, so `getTokens()` throws there by
design and a component test proves nothing about this. A throwaway instrument
drove Chromium against a **fresh** `vite preview` over the `pnpm build` artefact —
fresh deliberately, because the dev server on this machine had been up 22 hours
and `CLAUDE.md` says a stale one reports a false all-clear on a stylesheet change:

```
--anomaly-high      = "#e2b544"
--anomaly-unusual   = ""
--anomaly-elevated  = "#f0dda4"
#root children      = 1
h1                  = "Market Overview"
problems            = [ 3 × CORS from :4173 against a backend allowlisting :5173, and their ERR_FAILED ]
```

`--anomaly-high` resolves, `--anomaly-unusual` is gone, **zero `pageerror`**, the
app mounted and rendered its heading. The three console errors are the preview
origin against the dev backend's CORS allowlist — `CLAUDE.md`'s own note that CORS
is enforced by the browser — and they land long after `getTokens()` has run. The
instrument is deleted; its output is quoted above because a deleted instrument's
findings section owes the bytes rather than the conclusion.

### What changed, per file

**The decisions.**

- `planning/PRODUCT_SPEC.md` §11 — a dated amendment of four clauses for Gate 1's
  decisions 2–5, placed after the composite-score example and before §12, in the
  shape and voice of §9's Story 4.4 amendment. **No prose above it is rewritten**;
  each clause names the sentence it reads. The pooled distribution's **known cost
  is stated rather than discovered** — the open is structurally the fattest-tailed
  bucket, so a pooled percentile reads a market open as more unusual than it is,
  and the clause carries a reversal trigger that is a condition (_the first time
  the open is over-represented in a ranked list often enough for a reader to
  notice_). Decision 5's honest cost — `Anomaly 91` is not producible on
  demand — is stated against this section's own example.
- `…/story-06-market-data-provider-abstraction/PROVIDER.md` §3.1 — a dated note
  confirming **ask the provider**, naming the contradicting file, and recording
  §3.5 as the reason the alternative was refused: a series spanning no corporate
  action returns identical numbers either way, so a wrong adjustment argument is
  invisible in testing and wrong exactly once. The reversal trigger is §3.4's
  existing condition (the first reader comparing total return).
- `apps/backend/src/market-bars.ts` — `STORED_BAR_ADJUSTMENT`'s docblock. The
  clause _"what Epic 5's percentile windows will have to adjust for themselves"_
  is **struck in place** and a dated correction added beside it pointing at
  `PROVIDER.md` §3.1. The first sentence is untouched: it was always right, and
  the constant is still a statement about what this table holds.

**The rename**, `normal / elevated / high / extreme`:

- `packages/shared/src/anomaly.ts` — the array member, the docblock prose, and a
  new dated paragraph recording the decision, **the alternative that was refused**
  (renaming the region, priced and declined) and a reversal trigger that is a
  condition. Ordering unchanged, no fifth member, no boundaries invented.
- `AnomalyBadge.tsx` (`BAND_CLASS` key), `AnomalyBadge.module.css` (the class and
  its `var()`), `AnomalyBadge.stories.tsx` (`export const Unusual` → `High`),
  `AnomalyBadge.test.tsx` (the vocabulary pin), `Popover.stories.tsx` (four),
  `SecurityRow.stories.tsx` (the `BAND_EXPLANATION` key and its two readers),
  `styles/market.css` (`--anomaly-high`), `styles/tokens.ts` (the declaration).
- `docs/adr/0004-…` — a dated amendment, not a rewrite.
- **`VISUAL-LANGUAGE.md` needed no edit for the rename at all** — see the
  disagreements below.

**The discrepancies.**

- `PriceChange.tsx` — the header keeps Task 1.4.4's `1.05:1` as the dated
  measurement it is and gains a note saying the figure to cite is **1.04:1**,
  why the two differ, and that `market.css`'s `1.096:1` is a third **method**
  rather than a fourth disagreement.
- `VISUAL-LANGUAGE.md`'s `market.css` table — a **third column**, `on #f2f3f9`
  (`--surface-sunken`): positive **4.77**, negative **5.23**. An addition, not a
  correction; no figure above it moved. And the sentence under it, _"within 0.25
  of each other"_, was **false on the table's own numbers** (5.29 against 5.80 is
  0.51) and had already been corrected in `market.css` on 2026-10-07 by Task
  4.4.3 without being swept here. Corrected to **~0.5**, with the pairing argument
  preserved on the real figures.
- `apps/frontend/src/market/live-feed.ts` — `LiveFeedView.overview`'s docblock.
  _"Nothing renders it yet"_ struck in place, with the live half written beside
  it: four regions on `/` read it (4.2–4.5) plus `OverviewSourceNote`, and what
  survives is narrower and is about the **other** route — nothing on
  `/securities/:symbol` reads it, and Story 5.1's `Relative performance` is the
  first surface there that will, which is why it was found now.

### Four disagreements with the brief, stated rather than worked around

**1. `market.css` does not say `1.04:1`.** The brief says `VISUAL-LANGUAGE.md`
_and_ `market.css` carry that figure. `market.css` carries **neither**: it records
the same ink pair at **1.096:1 by luminance ratio** (line 158) and the washes at
**1.009:1** in greyscale. `VISUAL-LANGUAGE.md:355` is the only `1.04:1` among the
three files.

**2. It is not one measurement spelled two ways.** `1.05:1` is Task 1.4.4's
measurement of the **pre-refresh** palette — `#427400` against the old red.
`1.04:1` is `VISUAL-LANGUAGE.md`'s 2026-09-11 **re-take against the shipped**
`#0f7b50` / `#c5221f`. Both are correct about their own palette; what is wrong is
that live sites present the superseded one as current. That is why the repair in
`PriceChange.tsx` is a note rather than a substitution — overwriting `1.05:1`
would destroy a dated record, which is the one thing `CLAUDE.md` says not to do.

**3. And it is not confined to `PriceChange.tsx`.** Taken 2026-10-13:

```
$ git grep -n "1\.05:1" -- apps packages e2e | grep -ivE "greys|three bands are|raised fill|segment order|1\.57:1|page ground is 1\.05"
16 occurrences across 15 files
```

(The unfiltered count is 24 across 21 files; the excluded eight are a different
pair — the raised fill on the page ground, and the breadth greys.) One of the 16
is this task's own corrective note. **So fourteen shipped files still quote the
superseded price-pair figure with nothing beside it**, across `Marker`,
`UniverseTable`, `BackendIndicator`, `FeedProvenance`, `MarketClock`,
`ErrorFallback`, `market-breadth.ts`, `e2e/README.md` and two `PriceChange`
siblings. **Deliberately not swept here**: it is a fourteen-file edit across
components this story does not own, and the right shape is one sweep with one
dated note per file rather than fourteen drive-bys inside a decisions task.
Routed, not repaired.

**4. `VISUAL-LANGUAGE.md`'s anomaly prose did not need the rename.** The task file
says its ramp table needs no edit _"— its anomaly prose does"_. Verified: the
table needs no edit (its ramp row carries three hex values and no band names, and
the only band it names is `normal`), **and neither does the prose** —

```
$ grep -n -i "unusual" planning/epic-01-application-foundation/story-04-…/VISUAL-LANGUAGE.md
(no matches)
```

The word does not occur in that file. Its four anomaly mentions are _"an anomaly
band is a fill **and** a written band name"_, the ramp row, the neutral fill row
and Epic 5's reserved marker lane — none of which names a band this rename
touches. No edit was made for the rename; the file was edited only for
discrepancy 2.

### Gates

Machine load read **before** each heavy job, never during. `pnpm e2e` and
`pnpm test:database` were **not run** and are out of scope: no spec, layout,
browser behaviour or data-layer query changed — the only runtime edits are a
string in a shared constant, a CSS class name, a custom-property name and a
`TOKEN_NAMES` entry, none of which a browser spec or a database test asserts on.

```
$ pnpm build
… Storybook build completed successfully

$ pnpm verify          # first run, load 4.11 before starting
$ prettier --check .
[warn] packages/shared/src/anomaly.ts
[warn] Code style issues found in the above file.
```

Prettier re-flowed `ANOMALY_BANDS` to one line once `"high"` made it fit. Fixed
with `prettier --write`, then:

```
$ pnpm verify
$ eslint . --max-warnings 0
$ prettier --check .
All matched files use Prettier code style!
$ node scripts/check-stories.mjs
42 components, 42 stories files.
$ node scripts/check-env-example.mjs
16 backend variables documented, frontend example clean.
$ node scripts/check-links.mjs
551 documents, 1813 cross-file links, 39 anchor links, 0 broken.
$ node scripts/check-invariants.mjs
    ⚠ Epic 4's rehearsal row 4.7 is WAIVED 2026-10-13 — a dated, owned waiver rather than a watch.
56 invariants hold.
$ node scripts/check-backfill-coverage.mjs
backfill coverage: this system stores 1m, 1d; the scheduled run fills 1d, 1m.
$ pnpm -r run test
packages/shared test:  Test Files  22 passed (22)   Tests  440 passed (440)
apps/backend  test:    Test Files  50 passed (50)   Tests 1045 passed (1045)
apps/frontend test:    Test Files  86 passed (86)   Tests 1413 passed (1413)
$ pnpm -r run test:process
apps/backend test:process:  Test Files  2 passed (2)   Tests  55 passed (55)
```

Green. The `⚠` line is Epic 4's standing waiver printed by every run, not a
finding of this task.

**`Unhandled Errors` read rather than the exit code.** `pnpm test` re-run on its
own and grepped: no `Unhandled Errors` block in any of the three projects, and no
skipped count — 2,898 tests passed across 158 files.

```
$ pnpm links
551 documents, 1813 cross-file links, 39 anchor links, 0 broken.
```

**Looked at the page before believing anything.** `pnpm probe / --widths 1440`
against the running pair: **no page error**, and `.probe/1440.png` shows all seven
regions, `Market proxies` with its four figures, `Sector performance` with eleven
ranked rows, `Market breadth` reading `NET ADVANCING ▲+169` over 334/165/2, and
`Unusual activity` still reserved and still badged `EPIC 5`. **Nothing on screen
changed**, which is what this task promised.

**Token coupling proved at the one level that can see it** — production build,
real browser, fresh server — and recorded above with its bytes.

## For a stakeholder — a status report, 2026-10-13

**Nothing on any screen changed, and that was the plan.** This was the paperwork
task that stops Epic 5 arguing with itself in three stories' time: four readings
of the anomaly specification that the spec leaves genuinely ambiguous are now
written into it, a two-year-old contradiction between two live documents about
who adjusts for stock splits is resolved, and one word in the scoring vocabulary
was changed before anything was built on it.

**The one finding worth knowing is that the word change was three times bigger
than anybody thought.** The anomaly bands run `normal → elevated → high →
extreme`; the third used to be `unusual`, which collided with `Unusual activity`,
the name of the region on the home page that lists these very scores. The
acceptance criterion said the rename had two homes; the task brief said three; it
had **nine**, plus two more in prose that the search could not see — and a tenth
match that looks identical and would have **broken the home page's layout at
narrow widths** if it had been renamed, silently, in a way nothing except a real
browser could detect. It was left alone. The cheap lesson: a rename is counted by
running the command, on the day, and then quoted with the command beside it.

**The splits decision is the one with money in it.** Our database stores raw
prices and deliberately never rewrites them — that is what makes the Market
Replay feature of a later epic honest. Epic 5's anomaly scores compare today's
move against sixty days of history, and a ten-for-one stock split inside that
window looks like a **−90% crash** to any arithmetic that does not know about it:
a permanent, confident, completely false "most unusual security in the market".
Two of our own documents disagreed about whose job it was to fix that. It is now
settled — **we ask the data provider for split-adjusted history**, which costs one
query parameter and no new machinery — and the reason is recorded in both places:
a series with no split in it returns identical numbers either way, so getting this
wrong is **invisible in every test we could write and wrong exactly once**, on the
one company and the one week somebody happens to be looking.

**Three documentation defects were swept the same day they were found**, which is
this repository's standing rule. The most useful: an accessibility figure for the
"price up" green — 4.77, the one closest to the legal floor — existed in exactly
one of the two files a designer would open. It is now in both. A fourth was found
in passing and fixed: a sentence claiming two colours were "within 0.25 of each
other" when its own table said 0.51.

**What is still owed, and is named rather than quietly left**: fourteen source
files quote a contrast measurement of a colour palette this product stopped
shipping in 2026. Both numbers mean the same thing in practice and nothing on
screen is wrong, so it is a tidy-up rather than a defect — but it is a fourteen-
file sweep across components this story does not own, and doing it inside a
decisions task would have been the wrong trade. It is written down here.

**Every gate was run and every gate is green**: build, lint, formatting, the
component workshop, configuration, 1,813 documentation links, 56 structural
invariants, and 2,898 automated tests. The browser suite and the database suite
were not run, and that is stated rather than implied — nothing in this change is
in their scope.
