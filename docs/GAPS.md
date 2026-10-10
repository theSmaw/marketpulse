# What `pnpm verify` does not cover

**This list is the residue.** A green tick means every **check** passed; it does
not mean every **claim** in this repository holds. What is written down here is
the set of claims that are true today, matter, and are guarded by nothing
mechanical — each with a `Re-measure:` line so a reader can take the figure
again rather than cite it.

It lived in `CLAUDE.md` until 2026-09-14 and moved here because it had become
41% of the file that loads at the start of every session, while being a
reference rather than a rule. `CLAUDE.md` keeps the rule and points here.

## How to use it

- **Take a figure, never cite one.** Every entry carries the command that
  re-takes it. A figure that has moved looks exactly like a figure that was
  mis-recorded, and only re-running tells them apart.
- **A break that does not go red is not evidence the check works** — it is
  equally evidence the break did not land. Several entries name the break to
  perform; `pnpm break` performs the ones that have been mechanised, restores
  the tree, and refuses unless the break actually went red.
- **An entry that can be made mechanical should be.** Two have left this list
  that way: the backfill's timeframe coverage became `pnpm coverage:check` on
  2026-09-12, and **seven entries became `pnpm invariants` on 2026-09-14**. What
  stays is what genuinely cannot — the breaks a human has to perform, and the
  claims only a browser, a live store or a person can see.

## What became mechanical, and what it replaced

`pnpm invariants` (`scripts/check-invariants.mjs`) is a `verify` step holding
the claims that used to be prose here, each a single grep over checked-in files.
Every one is break-verified through `pnpm break`:

| Invariant                                          | Break that proves it               |
| -------------------------------------------------- | ---------------------------------- |
| No recorded market body reaches the shipped bundle | `fixture-in-the-bundle`            |
| The chart's density breakpoints are spelled once   | `second-density-breakpoint`        |
| The three dash rhythms are three and differ        | `coverage-edge-matches-the-seam`   |
| The readout reservation has one home               | `second-readout-reservation`       |
| No route seeds `initiallyCollapsed`                | `route-seeds-initiallycollapsed`   |
| Words and wash count the same axis                 | `words-count-elapsed-time`         |
| The five-minute ceiling stays derived              | `ceiling-spelled-twice`            |
| The empty-window sentence has one home             | `empty-explanation-twice`          |
| The volume plot's empty sentence has one home      | `volume-explanation-twice`         |
| Case one's price headline has one home             | `no-history-sentence-twice`        |
| Case one's volume headline has one home            | `no-volume-history-sentence-twice` |
| The coverage phrase has one home                   | `coverage-sentence-twice`          |
| The feed's words are written once                  | `feed-words-in-a-renderer`         |
| Every apostrophe a reader sees is the same one     | `straight-apostrophe-on-screen`    |
| Search and the universe share no clause            | `search-repeats-the-table`         |

**The table is the count.** It read _seven_ until 2026-09-15 and the list had
already grown to eight — `one-home-for-the-empty-explanation` shipped on
2026-09-14 and nothing brought the sentence above it along. That is this
document's own failure mode in miniature: a number in prose beside a list that
moves. Corrected here rather than re-counted, and the last two rows are Story
2.14's string pass (`PROVENANCE.md` §11) obeying the rule below — an entry that
can be made mechanical should be.

**Four of those rows are one invariant**, and that is the honest spelling rather
than four checks. `one-home-for-the-empty-explanation` guards **four** sentences
since 2026-09-15 — two empty answers × two plots (`PROVENANCE.md` §6.3) — and a
check guarding four literals owes four breaks, because a break proves one
substitution and not a loop. The rows are the breaks; the invariant is one.

**The last two rows are Task 2.14.7's**, and both hold claims nothing could see.
A straight apostrophe against a typographic one typechecks, lints, renders and
matches whichever glyph the assertion was written with; a search hint repeating
the tracked universe's own clause is one node to a browser locator when the copy
sits inside a longer sentence. Both were found by producing the state and
**looking at the screen**, which is the third time this document has recorded
that as the only instrument that worked.

**One of those seven had already rotted before it was mechanised**, which is the
argument for the migration in a sentence: the five-minute-ceiling entry told a
reader to run `grep -n "CLOSED_ANSWER" apps/backend/src/http-cache.ts`, and the
constants had moved to `series-cache.ts`. The grep returned nothing, and a
re-measure that no longer resolves is indistinguishable from one that passes —
because nobody runs either.

## The list

Known, deliberate, and worth re-checking rather than citing — the one-liners are `prettier --file-info <path>` and `eslint <path>`.

1. **Files no tool reads.** `apps/backend/scripts/dev.sh`, the `Dockerfile`, `.dockerignore`, and every `migrations/*.sql` — all report `"inferredParser": null` to Prettier and `File ignored` to ESLint. That last set grows by one per migration. `shellcheck`, `hadolint` and a SQL linter are each declined on a one-file argument.
2. **Shell inside JSON strings.** Three `clean` scripts carry `rm -rf` fragments.
3. **Stated invariants nothing checks.** The largest are: the local Postgres version pin against the deployed server's (a check would need Azure credentials, which `verify` deliberately lacks); the three Vitest globs' naming convention; the absence of a `test` script in `e2e/package.json`, which is the only thing keeping the browser suite out of `pnpm test`; the two `axe-core` pins that must match; and a retry wrapper's deadline precondition, whose failure is invisible because the caller receives the real cause rather than an error saying "I did not try". Three added at Story 2.9's close, all of the same class — a claim that is true today and checked by nothing:
   - **`database.ts` matches `pg-pool`'s connection-timeout MESSAGE STRING**, because that one failure carries no code at all. A driver upgrade that rewords it silently downgrades a timed-out pool from 503 to 500 — a well-formed answer naming the wrong thing. Re-measure: point a backend at a port nothing listens on and read the code in the body (`DATABASE_PORT=59999 node dist/index.js`, then `curl /securities`).
   - **Now `pnpm invariants`.** **The five-minute ceiling is spelled twice** — `CLOSED_ANSWER_SECONDS`' 300 in the `Cache-Control` header and the derived `CLOSED_ANSWER_TTL_MS` in the cache — and the two agreeing is what makes "five minutes is the ceiling on how long anything in this system serves an invalidated body" true. They hold by construction; what nothing checked was that a later edit keeps them derived. **This entry is the reason the list was mechanised**: its re-measure said `apps/backend/src/http-cache.ts`, the constants had moved to `series-cache.ts`, the grep returned nothing, and nobody noticed. Break: `pnpm break ceiling-spelled-twice`.
   - **Nothing in `verify` negotiates a content coding against a deployed host**, so "the Azure Container Apps ingress passes `Content-Encoding` through untouched and adds none of its own" is checked by one `curl` at one moment. Re-measure: request a large route with `Accept-Encoding: br` and confirm the answer comes back **uncompressed** — an ingress compressing on its own behalf would serve brotli.

   Two added at Task 2.11.7, both properties of a screen rather than of a module:
   - **The Security Explorer's grid has the number of columns it claims.** See the layout trap under _Frontend_ above for how it failed and why nothing in `verify` could see it. `e2e/specs/security-explorer-shell.spec.ts` is the only instrument that can, and its red was verified by restoring the break rather than assumed. Re-measure: delete the `.full` override inside `SecurityExplorer.module.css`'s two-column media query and confirm test 2 of that spec fails.
   - **The five placeholder regions name a plan the roadmap still holds.** An epic that ships without filling its region leaves a sentence that was true when written and is false afterwards, and nothing compares the route's `filledBy` strings against `planning/EPICS.md`. Re-measure: `grep -n 'filledBy="Epic' apps/frontend/src/routes/SecurityExplorer.tsx` and read the epic list beside it. **Six until 2026-09-13**, when Task 2.13.4 filled the Volume region — and the count is asserted in two places, `SecurityExplorer.test.tsx` and `e2e/specs/security-explorer-shell.spec.ts`, so a region that acquires content and keeps its placeholder goes red. What went red **nowhere** was the third copy: `RegionPlaceholder.stories.tsx` used that region's sentence as fixture text and named the story that filled it, so a workshop page would have gone on planning something the product had shipped. A fixture is a live claim; grep the sentence, not just the route.

   Four more at Story 2.10's close, and the first is the most dangerous thing on this list:

   - **The `market` module's `no-restricted-imports` pattern must live inside the browser boundary's own `patterns` array.** ESLint's flat config resolves a rule to the **last** configuration that matched, so a second config object setting `no-restricted-imports` for `apps/frontend/src/**` does not add to the first — it **replaces** it. Reproduced: with the market pattern in a block of its own, `import path from "node:path"` in a frontend source file lints completely clean. The frontend section above records that this rule is the _only_ thing standing where a compile error used to be, so the failure is the browser boundary disappearing with no symptom — and the moment it becomes likely is the obvious, well-meant change, since Epics 3 to 11 add seven more feature modules and the natural way to add the second one's rule is a new block. Re-measure: `import path from "node:path"` in a file that also deep-imports `market/` must produce **two** errors, not one.
   - **`Marker` renders nothing visible unless the row containing it sets `--marker-color`.** The primitive owns the geometry and the silhouette and never the colour. A consumer that forgets renders an **invisible** marker: no error, no warning, correct DOM, green `verify`. It has happened, and it was caught by looking at the page. Six components now set it. Re-measure: delete the custom property from one row and confirm the marker disappears silently.
   - **A live region belongs to a subject and its sentences name it** (`FRONTEND-STATE.md` §7), and nothing at the page level checks that a _new_ asynchronously-filled surface follows the rule. Two polite regions updated in the same moment are queued in an order neither component controls, so an unnamed sentence is a fact with no subject. Enforced by two tests inside `BarSeriesPanel` and by nothing else. Re-measure: add a `role="status"` to any route and confirm nothing goes red. **Sharpened 2026-09-12 by Task 2.12.6, which added the page's fourth region and found the re-measure above slightly wrong**: two things _did_ go red — `SecurityExplorer.test.tsx`'s count of three, and an e2e locator resolving to two nodes under strict mode. Neither checks the rule this entry is about. They catch a region **existing**; nothing anywhere catches a region whose sentence names no subject, which is still the failure that matters. The count assertion is also jsdom-only: the chart's region renders only where there are bars to read, and jsdom computes no layout, so a browser sees four where that test sees three.
   - **Now `pnpm invariants`.** **The recorded response bodies in `apps/frontend/src/fixtures/` must not reach the shipped bundle.** They live under `src/` and are imported by tests and stories only; a fixture pulled into a component by a well-meant import ships a recorded market body to **every visitor**. Seven bodies, each identified in `scripts/check-invariants.mjs` by a string distinctive to it — `holiday-week.json` at **357 kB** is the largest and is the one no store could answer, because the week has not happened; `securities/` is the whole recorded universe at 190,736 B; `dense.json` is 221,603 B and `uncovered.json` 146,807 B; `daily.json` (12 kB) and `daily-year.json` (48 kB) are the two `1d` windows, and the latter is the only string in the set reaching into **2025**. The per-task history of when each was added is in the story records. Break: `pnpm break fixture-in-the-bundle`, which imports one into a route, builds, and confirms the leak is caught.

   Three added at Task 2.11.9's keyboard walk, all of them properties a green axe run does not touch:

   - **That no tab stop lands behind the sticky chrome.** See the trap under _Frontend_. Held by `e2e/specs/search-keyboard.spec.ts` at **two** viewports and by nothing else, because the 1440 case stays green while 768 goes red. Re-measure: set `scroll-padding-top: 0` in `base.css` and confirm the 768 test fails on three stops. **Amended 2026-10-08 by Task 4.6.1: the claim is now about the FOCUS RING rather than the border box**, at both sticky edges, and the second holder is `e2e/specs/overview-focus-ring.spec.ts` — four widths, both directions, with the tolerance read from `:root`. The predicate this entry was written around compared the border box against the chrome edge, which is the same quantity the declaration reserved, and was therefore **green at -4.00 px of ring clearance**.
   - **That every control carrying an explanation is in the tab order.** Nothing compares a component's `aria-describedby` against whether the described element can be focused, and the failing combination — a correct sentence on an unreachable control — renders and lints perfectly. Re-measure: restore `disabled={disabled}` on `TextField`'s input and confirm exactly one browser test fails, at `the search field is not reachable by Tab`.
   - **That a control which changes the page announces that it did.** `aria-expanded` on the universe's bulk toggle is the whole of the feedback a listener gets when 518 rows leave the page, and a name that flips from `Collapse all` to `Expand all` is **not** a substitute — a name is read on arrival at a control. Re-measure: delete the attribute and confirm one component test and one browser test go red.

   Five added at Story 2.11's close, and the first is the one most likely to be undone by accident:

   - **That a navigation between two securities stays CLIENT-SIDE.** Nothing in `pnpm verify` can see it: jsdom has no history and no bundle to reload, so a component test cannot tell a client-side navigation from a document one **at all**, and swapping the table's `Link` for a plain `<a href>` leaves every unit, component and integration test green while the product silently goes back to reloading itself on every symbol. The repair is a one-character import away from happening by accident, and it is held by `e2e/specs/security-navigation.spec.ts` — which does gate a merge — and by nothing else. Re-measure: make that swap and confirm the browser suite goes red on the navigation count while `pnpm verify` stays green.
   - **That a jump lands where a person can see it.** The same class as the grid's column count and a **different mechanism** from the tab-stop entry above: that one is the browser's own scroll-into-view and is fixed by `scroll-padding-top`, this one is a `window.scrollTo`, which ignores `scroll-padding` entirely and must subtract the chrome itself. Held by `e2e/specs/universe-navigation.spec.ts`. Re-measure: delete the `stickyChromeClearance()` subtraction in `jumpToBand` and confirm test 2 of that spec fails. **Amended 2026-10-08 by Task 4.6.1, and the amendment is about this entry's RELATIONSHIP to the focus-ring entry below rather than about its claim.** The sentence _"`window.scrollTo` ignores `scroll-padding` entirely"_ sat **three entries away** from an entry recording that the scroll padding under-reserved by the ring's own 4 px, and **nobody connected them for twelve days**: the same deficit existed at both sites, by two mechanisms, and only one of the two was written down. The arithmetic is now `stickyChromeClearance()` in `apps/frontend/src/styles/sticky-clearance.ts` — the one place in the application that subtracts the chrome from a scroll offset — and `pnpm invariants`' `one-subtraction-for-the-sticky-chrome` refuses a second. The spec's assertion now reads the ring's reach out of the cascade. **The lesson is the transferable part: an entry that names a mechanism another entry depends on owes a pointer at it, because the whole failure mode of this file is a reader who does not know to look.**
   - **That two surfaces describing one failure do not use the same words.** Search and the tracked universe render from the same fetch and describe the same event, and nothing refuses a sentence that repeats the other's. It happened **three times in one afternoon**, every time caught by a locator resolving to two nodes rather than by anybody reading the page. Re-measure: give the search's hint the table's own `cause` sentence and watch which tests notice.
   - **That a control is present in every state at all.** The search field was absent from three of its states for two tasks and `pnpm verify` stayed green throughout — a component nobody renders raises nothing. Re-measure: wrap `<SecuritySearch>` in `view.state === "loaded" ?` again and confirm exactly three tests go red.
   - **That the rail's counts sum to every row in the table.** This is what makes "no band the control cannot reach" true, and is therefore the thing standing between a jump control and the `status` filter `UNIVERSE.md` §12.2 forbids. Re-measure: drop a group from `BandRail`'s `groups.map` and confirm _an untracked security is still reachable through the rail_ fails. **The second half of this entry is now `pnpm invariants`**: `initiallyCollapsed` is honest API that no route uses, and a route seeding it would reintroduce the collapse-by-default Task 2.11.8 declined, with nothing going red. Break: `pnpm break route-seeds-initiallycollapsed`.

   One added at Task 2.12.3, and it is a duplication rather than an absence:

   - **Now `pnpm invariants`.** ~~**The chart's density breakpoints are spelled twice**~~ — discharged 2026-09-12 by Task 2.12.4 and kept because it is the thing a later author reintroduces. They are spelled **once**, in `chart-density.ts`: the component sets a density class and the stylesheet keys on it, so the 600px boundary has one home. What it costs instead is that the component **measures** its plot rather than reading `--chart-height`, which is also the only shape that works since `getTokens()` throws where no stylesheet is applied. `CHARTING.md` §11.1 carries the argument. The natural way to make a chart responsive is a media query, and the second one added would be a second copy of a number nothing compares. Break: `pnpm break second-density-breakpoint`.

   Two added at Task 2.12.6, and the first is a property of a layout that no unit or component test computes:

   - **That the readout strip reserves its height, so nothing below it moves when a reading appears.** The strip's two states — the invitation and a reading — must be the same height, and they are not the same content. **Amended 2026-09-12 by Task 2.12.8, which found the entry as written was true and the instrument behind it was not.** A `min-height` token held it, the spec ran at 1440, and 1440 is the one width where it could not fail: a reading wraps at widths the invitation does not, so the figures below jumped **14 to 32 px at every other viewport** with `pnpm verify` and all 96 browser tests green (`CHARTING.md` §15.4). The reservation is now a hidden reading of the last bar in the same grid cell — a measurement of the real thing at the real width — and the spec runs at all three viewports. jsdom computes no layout, so both states measure zero there and a break is still invisible below a browser. Re-measure: set `display: none` on `.sizer` in `ChartReading.module.css` and confirm _the readout reserves its height at tablet_ fails; **desktop and phone stay green**, which is the point — the middle viewport is the instrument.
   - **That a pointer move does not recompute the chart's frame.** `chartFrame` walks the trading calendar day by day and rebuilds a 1,950-point path string; the repair is structural — the read position lives in a sibling component, so the frame's owner does not render — and structural repairs are the kind that get undone by a well-meant tidy-up that "lifts state up". `PriceChart.test.tsx` counts the calls across forty arrow presses and expects **zero**, and verifies its own counter is live in the same test, because a zero from an instrument wired to nothing is indistinguishable from a working repair. Re-measure: move the `useState` from `ChartReading` into `PriceChart` and confirm _recomputes the frame zero times across forty arrow presses_ fails.

   Three added at Task 2.12.4, the first of which nothing below a real browser could ever hold:

   - **That the chart is inside the Price region, at every viewport.** The concrete defect Story 2.12's own amendment names is a drawing dropped into a fresh panel beside the region that has been waiting for it since 2026-09-11, and jsdom computes no layout, so every unit and component test is green either way. Held by `e2e/specs/security-price-chart.spec.ts` and by nothing else. Re-measure: render `<PriceChart>` from `SecurityExplorer.tsx` instead of from inside `BarSeriesPanel` and confirm the Volume region's count assertion goes red while `pnpm verify` stays green.
   - **That the x-domain comes from `coverage.requested` rather than from the bars.** This is the defect with the worst shape in the story: a short answer whose axis came from its own bars rescales to fill the frame and **looks complete** — no error, nothing red, and a picture that silently disagrees with the coverage sentence printed directly beneath it. It is one argument to one call. Held by two tests in `components/PriceChart/chart-geometry.test.ts`; `loaded` is the one state where both derivations agree, so anything built against it alone proves nothing. Re-measure: pass the bars' own span as `requested` and confirm _stops the line short when the shortfall is made of trading minutes_ fails.
   - **That a chart's marks are counted rather than asserted visible.** Playwright's visibility check is a non-empty bounding box and a horizontal gridline is zero pixels tall, so `toBeVisible()` on any mark this chart draws except the series reports `hidden` against a chart that is correct and on screen. Both specs were written the obvious way first and both went red. `CHARTING.md` §11.2. Re-measure: change any `.locator("line").count()` here to `toBeVisible()` and watch it fail.

   One added at Task 2.12.7, and it is a measurement rather than a mark:

   - ~~**That the plot is measured to the area there is to draw in, and not to the axis rule as well.**~~ — **discharged 2026-09-12 by Task 2.12.8, which made it mechanical**, and kept here because the measurement it protects is the thing a later author deletes as redundant. The plot's bottom border **is** the axis rule and `getBoundingClientRect()` includes it, so the measured height was one pixel taller than the drawable box; every stroke tolerated that and a **fill** did not, painting the uncovered ground over the axis. It is now one assertion in `e2e/specs/security-price-chart.spec.ts` — the ground's painted box must end above the plot's own bottom edge, by more than nothing and less than two pixels — and the break was performed: deleting the `offsetHeight - clientHeight` subtraction in `usePlotSize` takes exactly that test red and leaves the other 95 green. jsdom implements neither property, so the correction is still zero there and no component test can see it. Story 2.13's volume bars are the next fills this axis will carry.

   One added at Task 2.12.8, and it is a derivation rather than an absence:

   - **Now `pnpm invariants`.** **The chart's text alternative and its uncovered wash must keep counting the same axis.** The sentence says _the line covers the first 780 of 990 trading minutes_; the wash paints the pixels that sentence is about. They agree because both call `timeAxis` and `positionOfInstant`, and pixels are zero everywhere below a browser, which is why the sentence derives its own rather than reading the frame's. A clause recomputed from elapsed time would report a gap of two and a half days across a weekend the axis draws no width for, and the words would disagree with the picture about a fact neither can check against the other. The invariant asserts both functions are **called** in both files, because both discuss them at length in prose and a check a comment can satisfy is not a check. Break: `pnpm break words-count-elapsed-time`.

   Three added at Task 2.12.9, and the first is a live breach of a published target rather than an unchecked claim:

   - **The security page spends 50–66 ms of main thread on every cold load, and it is the 518-row universe table rather than the chart.** `PRODUCT_SPEC.md` §28 publishes _no routine main-thread task over 50 ms_, and `/securities` and `/securities/:symbol` both miss it — measured in real Chromium on 2026-09-12, attributed from both ends (the task is there with **no chart at all**, and gone with a 20-row universe while a **9,750-bar** chart is still drawn), with ~40 of those milliseconds in the engine's own layout and paint over a 10,331-node document. Nothing can see it below `pnpm e2e` because jsdom computes no layout, and the browser suite cannot assert it either: CI's store has 518 securities and **zero bars**, so the figure there is a duration on a shared runner. It is raised rather than absorbed — `SEARCH-AND-SELECTION.md` §10 holds the measurement and three candidate repairs, Story 2.14's close owes the answer, and the trigger is **the first time a second surface renders per-row markup at universe scale**. Re-measure: load `/securities` in Chromium with `PerformanceObserver({ entryTypes: ["longtask"] })` installed before navigation, then repeat with the universe response trimmed to twenty rows. **Re-measured 2026-09-13 by Task 2.13.9 with a second plot and a window control on the same page, and it is unchanged**: ten cold loads each, 5–7 tasks of 50–107 ms at 518 rows and **none** at twenty rows while a 9,750-bar chart is still drawn. That run added a continuous instrument `longtask` cannot be — the largest gap between consecutive `requestAnimationFrame` callbacks — and it says something the original could not: every 20-row page sits at **32–34 ms**, which is two frames and is the floor, while every 518-row page sits at **67–84 ms**. So this is not a page marginally over a line. **Re-measured a third time 2026-09-15 by Task 2.14.8, and it now has an owner rather than a question mark.** Unchanged again — ten cold loads each, 2–5 tasks of 50–76 ms at 518 rows and **none** at twenty rows while both plots are still drawn, over a 10,385-node document against 848 — and this run added the zero-bar page, which is what CI and `pnpm store:bare` render and is where Story 2.14's new vacancy markup and its `text-wrap: balance` actually live: it reads the same 66.6 ms frame gap as every other 518-row row and nothing at all at twenty rows. That run's tail is **lower** than 2.13.9's published 107 and 149 ms, and the difference was separated from the product rather than argued: commit `997170d` — the tree 2.13.9 measured — was rebuilt in a worktree and served beside the shipped build on the same machine within the same ten minutes, and **the old tree and the new tree read the same**, so the tail is the laptop. **The disposition Story 2.14 owed is taken: the repair is handed to Epic 14 by name**, beside the `Expand all` exception that is the same component and probably the same repair, and `PRODUCT_SPEC.md` §28 carries a dated amendment naming both. §28 is **not** amended as a target. All three datings are in `SEARCH-AND-SELECTION.md` §10; the figures, the three repair options and the re-measure are in `planning/epic-14-performance-scale-validation/EPIC.md`; **the trigger is unchanged and outranks the epic — the first time a second surface on this page renders per-row markup at universe scale.** **Amended 2026-10-09 by Task 4.8.8, on the unit and on the trigger, not on the figure.** The breach is no longer describable as _one task_: on 40 interleaved cold loads it is **one frame over the line on 10 of 10 loads, 62.8–77.4 ms** — script 26–31 ms, style/layout/paint 34–38 ms — while the `longtask` channel this entry's own re-measure names reports **nothing at all**, where 2026-09-22 read 50–56 ms on 7 of 10. **A channel going quiet and a cost going away produce the same output**, so this entry's re-measure now needs **three** channels (`longtask`, `long-animation-frame`, an rAF-gap recorder) each proved by a plant on the page that produced the figure. And the trigger gains a **second condition, for `/`** — _the first surface on `/` that renders one element per tracked security_ — because the clause above is written against `/securities` and cannot fire on the landing page, which draws **447 nodes and zero `<tr>` at 518 securities** and is **not** in breach (0 tasks over 50 ms in 10 of 10, one 50.9 ms frame, worst rAF gap p50 24.7 / p95 34.7). Epic 14's `EPIC.md` holds the fifth evaluation and the clause.
   - **The chart's own cost is a dated observation of one laptop, and the one thing that would break it is now mechanical.** `CHARTING.md` §16 records that the chart produces no task over 50 ms at the 9,750-bar cap, cold or under interaction — but that is 2026-09-12 on an M-series machine against a fulfilled body, and nothing re-takes it. What **is** checked is the shape those timings follow from: `PriceChart.test.tsx`'s _draws no element per bar, at sixty-five times the bars_ asserts that the paths, rects and `<use>` counts are identical at 30 bars and at 1,950, that the lines differ by exactly the session seams, and that the series path string grew twentyfold so a pair of equal counts cannot come from a pair of equal bodies. No wall-clock assertion was added anywhere, deliberately: a timing gate in `pnpm test` measures the runner. Re-measure the guard: draw one `<rect>` per bar in `PriceChart.tsx` and confirm it goes red at `expected 1952 to be 32` — in a browser the same break puts 9,790 elements in the plot and five tasks of 137–254 ms on the main thread, and at the **default** window it produces none, which is why the unit test asserts a shape and not a duration.
   - **And one regression this list cannot help with, recorded because it is the counter-example.** Lifting the reading's state back into `PriceChart` — the repair Task 2.12.6 took structurally — costs **17× the CPU on the pointer path** at the cap and produces **no long task at all**, so §28's own criterion cannot see it. `PriceChart.test.tsx`'s _recomputes the frame zero times across forty arrow presses_ is the only thing that can. A break that is real, measurable and invisible to the instrument the target is written against.

   Three added at Story 2.12's close, all owed by earlier tasks in it and all of them colour or layout, which is to say invisible below a browser:

   - **That the chart's direction survives the hue being removed.** The geometry — the line finishing above or below `--chart-reference` — is what carries it, and the two washes differ by **1.009:1 under `grayscale(1)`**, so a change that deleted the rule and kept the tint would leave a chart whose direction is carried by nothing. **Nothing mechanical can see this**, and the reason is structural rather than an omission: no test in `pnpm verify` can see a colour at all, because no stylesheet is applied in the test environment and `getTokens()` throws there. What holds it is `chart-geometry.ts`'s `DirectionalArea`, which makes the pair one value, and `PriceChart.stories.tsx`'s two simulation stories, which a person reads. Re-measure: render `Greyscale` in the workshop and say which way each of the four windows went. **And note the instrument that was pointed at this property could not see it** — `CHARTING.md` §12.6: four greyscale simulations passed against a chart whose whole area was washed one colour by where the line _finished_, because removing the hue removes the disagreement. A person looking at the screen found it.
   - **That the directional wash is painted with a wash rather than with black.** SVG's initial `fill` is black, so "is it filled with some colour" was true of the broken chart and the first version of the spec was **green against the break**. It is now `e2e/specs/security-price-chart.spec.ts`'s _the directional wash is actually painted_. Re-measure: delete `WASH[...]` from the wash's `className` in `PriceChart.tsx` and confirm that spec goes red — it was verified that way on 2026-09-12.
   - **That the value scale is built against the PLOT and not against the region.** There is no subtraction to delete — the gutter is a sibling grid column and the scale is built from the measured plot element, so the property holds by construction — which is exactly why the hazard is worth writing down: the region is also measured and is right there, and a later author who computes the scale from it draws a line running under its own labels. A plausible chart, not a broken one, and invisible to jsdom. Re-measure: build `slotScale` against `regionWidth` and confirm `e2e/specs/security-price-chart.spec.ts`'s _the plot stops where the value gutter starts_ goes red.

   One added at Task 2.13.3, and it is a cost rather than a behaviour:

   - **That the trading-calendar walk stays memoised.** `marketSessionOn` remembers each market date's session in a module-level map (`packages/shared/src/market-session.ts`), which is what takes 1Y from **17.0 ms per render to 0.8** and the server's cap check from **20.6 ms per cache hit to 0.9** — and **nothing in `pnpm verify` can see it**, because a function that got slower is still correct and a timing gate in `pnpm test` measures the runner rather than the code. So removing the memo as a simplification, or moving `assertWithinMarketCalendar` below the lookup, or handing out the cached record's own `Date`s instead of rebuilding them, are three edits of which only the last two go red. The tests that exist cover the **key** (all 1,827 calendar dates answer for themselves), the range refusal on a warm cache, and the mutation hazard; the cost is covered by nothing. Re-measure: time `timeAxis` over a 252-session `1d` window, 200 iterations after 50 warm-up calls, and read it against `CHARTING.md` §16.5's dated amendment — 0.4 ms is the memo working and 8 ms is it gone.

   Three added at Task 2.13.4, and the first is a duplication the language itself would hide:

   - **Now `pnpm invariants`.** **The marks both plots draw have one home in CSS.** The session seam's `3 3`, the coverage edge's `6 3` and the reference rule's `2 4` are a **system that has to stay distinct** — `CHARTING.md` §14 is explicit that the edge is legible only because it differs from the seam it coincides with on most answers. Two of the three are shared and the third is not, which Task 2.13.8 established by running this entry's own re-measure and finding it over-stated: the seam and the coverage edge have **two** consumers each and live in `chart-marks.module.css`; the reference rule has **one**, because volume declines it deliberately (`VOLUME-AND-WINDOW.md` §12), and lives in `PriceChart.module.css` — correct rather than a leak, since a rhythm with one consumer needs no shared home. The invariant holds all three properties: exactly three declarations, two of them shared, and all three rhythms different. Break: `pnpm break coverage-edge-matches-the-seam`.
   - **`useChartAxis` throwing outside a provider is the only thing stopping a second plot building its own axis.** Two plots that each called `timeAxis` on the same window would agree at every width where both had been measured, and differ for one frame on every resize — a chart one pixel out, intermittently, with nothing red anywhere, because no level below `pnpm e2e` computes a coordinate. The throw makes the wrong shape unreachable rather than discouraged, and the alignment itself is held by `e2e/specs/security-price-chart.spec.ts`'s _the two plots hang on one axis and stop at the same pixel_ and by nothing else. Re-measure: give `useChartAxis` a fallback that builds its own `timeFrame` and confirm `pnpm verify` stays entirely green.
   - **The volume plot's end columns are clipped to the plot box, and without that clip they paint outside it.** `.canvas` declares `overflow: visible`, which the tick labels and the crosshair need; `scaleSlot` puts the first bar at x = 0 and the last at x = width; so an unclipped end column puts up to **14 px of near-grey in the panel's padding** at a thirty-bar window. One component test holds the clip's presence and a person looking at the workshop holds what it looks like — `VOLUME-AND-WINDOW.md` §19.2 records the judgement and hands 3M a second look. Re-measure: delete the `clipPath` on the columns' wrapping `<g>` in `VolumeChart.tsx`, then open `Market/VolumeChart → Wide` and look at the left edge.

   Three added at Task 2.13.5, and the first is a rule that is now spelled once and would be spelled three times by the obvious next change:

   - **Now `pnpm invariants`.** **Both readout strips reserve their height by laying out every state they can be in, and that rule has one home.** `chart-readout.module.css` holds the one-cell grid, the `.sizer` and the figure idiom, and both strips compose it. What was unchecked is that a third plot (Epic 8's comparison, Epic 5's overlays) keeps composing it rather than restating it. **The invariant holds the one-home half only.** The reservation _working_ — that the strip is the same height in both its states, at every width — is `e2e/specs/security-price-chart.spec.ts`'s job and cannot be anything else: it is a page that jumps under the hand of somebody reading a number, it is invisible at 1440, and no level below `pnpm e2e` computes a layout. Break: `pnpm break second-readout-reservation`.
   - **The volume readout is deliberately absent from the accessibility tree, and nothing checks that its figure is still reachable another way.** It is `aria-hidden` because `volumeAlternative` already states the peak and a second surface stating it would be the two-surfaces defect; what replaces it for a listener is a **clause** in the price chart's spoken sentence. So deleting that clause leaves a figure that is on screen and reachable by no other channel, with every test green and axe silent — axe cannot see that a hidden element's content is unavailable elsewhere. Held by one assertion in `ChartReading.test.tsx`. Re-measure: delete the `Volume ${spokenVolume(bar.volume)}` clause in `chart-reading.ts` and confirm exactly one test goes red.
   - **The read position must stay in its own context**, and this one **is** mechanical — recorded because the entry above it is the counter-example and this is what became of it. `PriceChart.test.tsx`'s zero-recomputation guard now counts `timeFrame`, `priceFrame` **and** `volumeFrame` with **both** plots rendered inside one `ChartAxis`. Putting the read position on `ChartAxisValue` — the obvious tidy-up, one value instead of two — rebuilds a 1,950-point path string and a 726-stem silhouette on every mouse event, looks perfect, and produces no long task. Re-measure: add `read` to `ChartAxis`'s frame memo and its dependency array, and confirm the guard reports **120** rather than zero.

   Three added at Task 2.13.6, and the first is the one a well-meant tidy-up undoes:

   - **That a window change stays CLIENT-SIDE and does not rewrite the address.** Two properties, one instrument. jsdom has no history and no bundle to reload, so a component test cannot tell a client-side navigation from a document one **at all** — the same blind spot Task 2.11.5 recorded for the symbol, now reachable a second way, and a `window.location` assignment where a `navigate` should be leaves every unit test green while the product reloads itself on every press of a window. The second half is `VOLUME-AND-WINDOW.md` §4(b)'s no-snapping rule as a fact about the **URL** rather than about the marks: an address naming a count outside the five must still be there afterwards. Held by `e2e/specs/security-window-control.spec.ts` and by nothing else. Re-measure: make the control's `checked` flag pick the **nearest** window rather than an exact match and confirm exactly one test in that spec goes red while `pnpm verify` stays green — verified that way on 2026-09-13.
   - **That the control's readout is never dropped and its labels never truncate.** It shares a panel heading row with the region's name, so at 390 px that row has to wrap — and the readout is the half that explains the other five (a row of five cells with no bar under any of them reads as broken; the same row beside `7 SESSIONS` reads as a product that understood the address). Nothing that computes no layout can see it. Held at three viewports by the same spec. Re-measure: set `flex-wrap: nowrap` on `.control` in `TimeWindowControl.module.css` and read the phone case.
   - **That a `1d` window is drawn at all, which is now mechanical and is recorded because it is the shape of the defect.** A daily bar is stamped at **midnight** market time, midnight is earlier than any session's open, so every bar in a `1d` window resolved to the axis's _between sessions_ case and was dropped: a correct axis, a correct headline, a correct coverage sentence and **no line**, with nothing red anywhere, because all fourteen recorded bodies were `1m`. It is now four tests in `chart-time-axis.test.ts` over a recorded `1d` body, and the break was performed — deleting the branch takes three of them red. The residue that stays here is the **class**: a timeframe, a window form or a state that no recorded body reaches is a branch that typechecks and has never run.

   One added 2026-09-13, and it is the workshop rather than the product:

   - **That a story actually renders.** `pnpm stories` fails if a component under `src/components/` has **no stories file**; it does not open one. Storybook's build compiles a story rather than rendering it, so a story that throws builds clean and `pnpm verify` is green. That is not hypothetical: `BarSeriesPanel.stories.tsx` had **twenty-one** dead stories from Task 2.13.4 — the task that put the chart inside the panel — because `useChartAxis` throws outside a `ChartAxis` and the stories file wrapped none of them. Every chart story wrapped correctly, so the one file that needed a decorator was the one file without one, and the whole panel's workshop page was an error screen for two stories' worth of review. It was found by a person opening it. Re-measure: delete the `onOneAxis` decorator and confirm `pnpm verify` stays entirely green while every story on `Market/BarSeriesPanel` throws.

   One added 2026-09-13, and it is a position rather than a picture:

   - **That a control's own height does not change with what it says.** The window control's readout was `5 SESSIONS` or `21 SESSIONS` or `252 SESSIONS`, it shared a wrapping row with the five cells, and its width is what decided whether that row was one line or two — so pressing `1M` made the control **24 px taller** at a 318 px region and pushed the chart below it down. It shipped with Task 2.13.6 and was invisible for two reasons: the control sat on a heading row with nothing under it a reader was watching, and no level below `pnpm e2e` computes a layout. **The repair was a width reservation and is now the readout itself** — 2026-09-14 narrowed it to the state it exists for, _no cell selected_, so a press moves one selected state to another and neither carries one. The general hazard is what stays: nothing anywhere compares a control's height between two of its own states, and one transition still changes this control's width — an address naming a count outside the five, then a press. Re-measure: render the readout unconditionally again and confirm _pressing a window does not move the chart at **tablet**_ goes red at 24 while desktop and phone stay green.
   - **That pressing a window does not move the chart.** `security-window-change.spec.ts` already compared every mark the plot draws either side of a change and required them byte-identical — which is a strong assertion about _what_ is drawn and says nothing about _where_. The rail sits above the picture and appears only while a request is unanswered, so an identical chart was being pushed **30 px** down the page and back on every press, with that spec and all of `pnpm verify` green. jsdom computes no layout, so nothing below `pnpm e2e` can see it. Held now by `pressing a window does not move the chart` at **three** viewports, and the three matters: replacing the measured reservation with a 30px height leaves **desktop green** and takes tablet and phone red, which is `CHARTING.md` §15.4's finding reproduced on a second surface. Re-measure: delete the hidden sizer from `BarSeriesPanel.tsx`'s `Rail` and confirm it reports 30 against a tolerance of 1.

   One added 2026-09-13, and it is the shape of a tolerance rather than a missing check:

   - **Two browser specs pass on CI and fail on a developer's store, and the suite cannot tell you which.** Found 2026-09-19 by Task 3.3.5, and **confirmed against `main` in a clean worktree** rather than assumed — `pressing a window does not move the chart` at tablet and at phone assert the plot does not move when a newer answer lands, and on a store holding bars the answer that arrives is taller than the one it replaces, so the plot moves **90 px**. CI's store has 518 securities and **zero bars**, so the answer there is a correct `empty` in both directions and the assertion holds. The recorded habit is the mirror of this one — _before asserting on a NUMBER, ask whether CI has the data_ — and this is the case it does not cover: an assertion CI can satisfy **because** it has no data, which no amount of running `pnpm e2e` locally will explain, because the suite reports it identically to a real regression. The cost, paid once already: a developer changing anything near that chart reads two red specs as their own. **Confirmed from the other direction on 2026-09-19 by Task 3.3.6**: the whole suite against `DATABASE_NAME=marketpulse_bare` is **127 passed, 0 failed**, including both of them — so the pair is store-dependent rather than flaky, which is a sharper claim than the worktree reproduction alone supported. Re-measure: run `pnpm e2e security-window-change.spec.ts -g "does not move the chart"` against `DATABASE_NAME=marketpulse_bare pnpm dev` and then against your own store, and compare. **Owner: the next story that touches the window control or the panel's reserved height.** **Amended 2026-09-24 by Story 3.8's close — the owner clause fired and the 90 px is gone.** Task 3.8.3 found the same pair red, ran the two commands, and then found the defect the store was only the trigger for: `Figures` returned `null` in every state with no readable series, so the block left the layout entirely. It now reserves its room hidden, and the spec passes on **both** store shapes (`VOLUME-AND-WINDOW.md` §83). What survives here is the claim this entry was really about — **two specs can pass on CI and fail on a developer's store, and the suite reports it identically to a regression** — for which the re-measure above is unchanged.
   - **`OBSERVATION_INTERVAL_MS` is a hard-coded minute, and nothing checks that the stream subscribes to minute bars.** Task 3.3.4 found that §11.2's staleness measured an observation's age from the instant that **opens** its interval, so `live` was unreachable in session; the repair measures from the interval's end and the duration is a constant, because §10.1 chose minute bars. **A second timeframe on this feed makes that constant silently wrong in exactly the way the original defect was silent** — the reversal trigger is written beside it and nothing fires it. Re-measure: compare the channel `apps/backend/src/market-stream.ts` subscribes to against `OBSERVATION_INTERVAL_MS` in `packages/shared/src/feed-liveness.ts`. **Owner: the first story that subscribes to a second timeframe.**
   - **No browser test has ever watched a real vendor frame reach a screen, and no CI job has a market-data credential.** `market-connection.spec.ts` covers `LIVE`, `STALE` and `DISCONNECTED` by **furnishing them from inside the browser** — the venue over a fulfilled `/market-data` and the connection over a mocked socket. That is a real and cheap answer to _the suite never sees the live states_, and it is not the same claim as _the product works against Alpaca_. **The general hazard it leaves standing is the one this epic keeps producing: an assertion about an ABSENCE passes for free on a deployment that cannot produce the thing.** `market-feed.spec.ts` held one for four days after the words it forbade became real, and it did not go red. Re-measure: for any spec asserting `toHaveCount(0)` on a live-feed word, furnish the state and confirm the assertion can fail. **Owner: Story 3.11**, the epic's close, which is the first place worth deciding whether CI should hold a credential at all.
   - **The market stream's eight diagnostic events are emitted and never logged, so the feed can be dead for nineteen hours in production without a line.** `alpaca-stream.ts` reports `authenticated`, `subscribed`, `credentials-refused`, `frame-rejected`, `connection-limit`, `unexpected-error-frame`, `liveness-watchdog-fired` and `closed` through an `onLog` seam — and **`market-stream.ts` never references it.** Found 2026-09-20 by the weekend hold, which discovered the deployed feed had been `disconnected` since 2026-09-19 05:48Z with **no log line about the stream at all**, and had to be diagnosed by probing Alpaca from outside. A `406` retried every 3 s for nineteen hours is invisible; so is a watchdog firing. **`check-deployed` is green throughout**, because it checks `/diagnostics/freshness` — the store — and not the socket. Re-measure: `grep -n onLog apps/backend/src/market-stream.ts` should name a logger. ~~**Owner: Story 3.11**, which is where the deployed backend is run in anger.~~

   **CLOSED 2026-09-25 by Task 3.11.3, and narrowed rather than erased.** `market-stream.ts` now takes an `onLog` and `index.ts` passes `streamLogTo(app.log)`, so all **eleven** events — the eight above plus `subscription-shortfall`, `subscription-refused-empty` and `closing-deliberately` — reach the correlation-id logger. `stream-log.ts` decides the level: **`warn` is _something is wrong with the feed_, `info` is _the feed did what it is supposed to do_**, and `connection-limit` warns despite happening on every deploy, because §8.2's overlap is seconds and the outage was the same frame retried every three seconds for forty hours — **what tells them apart is how many lines there are**, which is only countable if they are logged. The mapping is pure, total and exhaustive, so a twelfth event is a compile error rather than a silence; `pnpm break the-market-stream-goes-silent-again` proves the wiring.

   **And the outage was longer than this entry says.** Task 3.11.1 read the weekend watch's own output — unopened for four days — and it ran **2026-09-19T13:56Z → 2026-09-21T05:44Z, about forty hours**, recovering **unattended**. **Nobody can say what recovered it**, and that is the part this repair cannot retrieve: the evidence never existed.

   **What is still not guarded, and it is the honest residue.** A log is only read by somebody looking. `check-deployed.mjs` now refuses a `disconnected` feed **at any hour** rather than only in session — which would have caught this outage on the first merge after it began — but between merges nothing reads anything, and Task 3.11.1's decision 2 rejected a scheduled in-session check as a new mechanism with its own silence. **Re-measure:** `curl $BACKEND/diagnostics/feed` and read `status` and `observedAt`. **Owner: a condition** — the first outage that begins and ends between two merges, which is the case neither the log nor the check can see.
   - **A tolerance sized for a transient absorbs a permanent offset of the same size, for ever, and nothing tells the two apart.** `check-deployed.mjs`'s `MAX_SESSIONS_BEHIND` is **2**, argued from "in the steady state every timeframe is zero or one behind — one on a weekday before the run". The backfill's window rule made one behind a **fixed point** rather than a phase, so the store was permanently a session stale, `/diagnostics/freshness` reported `sessionsBehind: 1` correctly every day, and the check was green throughout. A user found it from a screenshot: a chart drawn through Friday beside an identity block stating Thursday's close, because `GET /market-data/bars` stitches a live tail and `GET /securities` does not. `BARS.md` §8.19 carries it. The rule is now held by `backfill.test.ts` against an injected clock and the ceiling is unchanged — what is **not** checked anywhere is whether a lag is transient or permanent, and that is the property the ceiling cannot see. Re-measure: `curl $BACKEND/diagnostics/freshness` on two consecutive days and compare `newestSession` against `lastCompletedSession`; equal on neither day is a fixed point rather than a phase.

   Three added at Task 2.13.7, and the first is not a missing check at all — it is a warning about the **instrument**:

   - **An automated browser that is not painting cannot judge anything that depends on layout delivery.** A tab driven over CDP reports `document.visibilityState === "hidden"`, which pauses `requestAnimationFrame` and, with it, **`ResizeObserver` delivery**. Measured 2026-09-13: a freshly constructed observer on a laid-out **939 × 221** element fired **zero times in 500 ms**. Every chart in that tab therefore measures zero — an `<svg>` at 0 × 0, the compact density class at a 985 px region — which is **indistinguishable on inspection from a real defect**, and it cost a session's worth of chasing one. Playwright's page is visible and does not have this property, which is why a screenshot taken there is evidence and one taken through a background tab is not. Re-measure: `document.visibilityState` and a 400 ms `requestAnimationFrame` counter, in whatever browser is being used to judge a layout.
   - **A chart whose first commit has no frame is never measured again for the life of that mount** — the defect the entry above was masking, and it is **discharged rather than standing**, kept here because it is the shape a later author reintroduces. Both plots return `null` before they have a window to draw, so on a mount that begins in `refused` or `failed` the refs were empty when `usePlotBox`'s effect ran, the observer was never created, and its dependencies — `[report, role]` — could never change to re-run it. Reachable since Task 2.13.6 put the window in the address, by one short route: a cold link to `/securities/NVDA?sessions=1000`, then any window with bars. The repair is that the two elements are **state rather than refs**, so the effect depends on the elements themselves. jsdom implements no `ResizeObserver` and computes no layout, so the measurement is zero there either way; `e2e/specs/security-window-change.spec.ts`'s _a chart that arrives after a refusal is measured, and draws_ is the only instrument, and the break was performed. Re-measure: restore `useRef` in `use-plot-box.ts` and confirm exactly that test goes red while `pnpm verify` stays green.
   - **That a held answer is drawn in exactly the same style as a fresh one.** `FRONTEND-STATE.md` §2's reversal trigger is _a chart that redraws a held series in a second style_, and Task 2.13.7 is the first thing in the product that could fire it by accident — it is now routine for a chart of the **previous** window to be the picture on screen. Nothing below `pnpm e2e` can see a second style, for the reason nothing below it can see a colour: no stylesheet is applied in the test environment. What holds it is the browser suite comparing the **series path data** either side of a window change and requiring it to be byte-identical, which is a stronger statement than "a chart is still there" and is the one that would catch a dim, a dash or a second stroke. Re-measure: give the held chart any second style and confirm _a window change keeps the previous window's charts on screen, labelled_ goes red.

   Four added at Task 2.13.8's walk, and the first is the one that caught a second instance of a defect this list already described:

   - **That a description is attached to something focus can actually reach.** `CLAUDE.md` already records this class — a natively `disabled` control is not focusable, so anything `aria-describedby` hangs off it is unreachable — and Task 2.13.8's walk found it again in a new shape: `TimeWindowControl` hung the readout on the **`div[role="radiogroup"]`**, which in a roving-tabindex group has no `tabindex` and is never focused. A description on a container is not part of a child's accessible description, so the only sentence on screen saying that `1M` means twenty-one trading sessions was computed correctly, attached correctly, visible and unreachable by any key press. **axe read zero violations throughout**, because the id resolved to real text, which is all it asks. It is now on every cell, and `e2e/specs/security-window-control.spec.ts`'s _the window on screen is described at the stop focus lands on_ is the only instrument — it walks to the stop and reads the description off the element focus landed on. Re-measure: move the attribute back to the group and confirm exactly that test goes red.
   - **That a shared sentence vocabulary is read through every one of its members.** `chart-alternative.ts`'s `Mark` lets one coverage clause serve both plots, which is what stops the two pictures describing two windows — and it shipped with the plural subject parameterised and a verb three clauses later left singular, so the volume sentence said _"The columns cover the first 780 of 990 trading minutes and **stops** at 16:00"_. Nothing saw it because **`volumeAlternative` had no unit test at all**: the price chart's suite reads the same clause through `LINE`, where every verb is singular and correct, and the browser suite asserts the volume sentence **exists** rather than what it says. It now has one. The residue is the rule rather than the bug: a vocabulary with two members has to be read in both, and nothing enforces that. Re-measure: make any verb in `Mark` singular for `COLUMNS` and confirm _agrees with its own subject, in every clause that has a verb_ goes red.
   - **That two axis labels are not drawn on top of each other.** Found by looking at the rendered holiday week, which read `12:00Nov 30`: a session closing at 13:00 puts its midday tick 60 slots of 1,770 — 3.4% of the axis, 32 px — from the next session's date, and two centred labels need about 47 px. Repaired with `MIN_TICK_SEPARATION` in `chart-time-axis.ts`, and the **general** hazard stays: nothing anywhere compares a tick's position against a neighbour's rendered width, at any density, in any chart. jsdom computes no layout and Playwright's visibility check is a non-empty bounding box, so an overlap is invisible to both. Re-measure: set `MIN_TICK_SEPARATION` to 0 and confirm _drops a midday that would be drawn on top of the next session's date_ goes red — then look at `Market/ChartAxis → HolidayWeek`, because the unit test knows the number and only a person knows it collided.
   - **That a listener is told the feed died at all.** Added 2026-09-24 by Task 3.10.2, which made it sharper rather than discovered it. The status strip is a plain `<footer>`: `AppFooter`, `FeedIndicator` and `FeedProvenance` carry **no `aria-live` and no `role`** between them, so the connection word changing from `live` to `disconnected` — and the sentence that appears beside it — are **announced to nobody**. `FeedProvenance`'s _Not a live region_ comment argues the case correctly for the **venue**, whose value _"cannot change at all without a deploy and a reload"_; the **connection** half changes while a page is open, which is the opposite case and has never been argued. And Task 3.10.2 closed the other escape route: criterion 3 is now held by `security-feed-degraded.spec.ts` asserting that `main`'s entire text is **byte-identical** either side of an outage — correct, deliberate, and it means a listener who is not in the footer has **nothing whatever** to notice. The numbers they are reading silently become stale. `Live in the chrome.dc.html`'s own _what this did not decide_ said this list should be _"one entry longer"_ on 2026-09-19 and it never arrived here, which is this file's standing lesson about recording a correction and propagating it being two obligations. **Owner: Story 3.10**, which owns what the cell says in every connection state — Task 3.10.6 by name. Re-measure: open a security page, kill the gateway, and read the accessibility tree for any node whose content changed outside `contentinfo`.
   - **That a spoken sentence can be spoken in the time the pacing allows for it.** `READING_ANNOUNCEMENT_MIN_GAP_MS` is **1,500**, argued in Task 2.12.6 as roughly how long a screen reader takes to read one of these sentences — and Task 2.13.5 then added a volume clause, taking the sentence to **25 words**, which is about **8 seconds** at a default rate. The floor was not revisited. Measured 2026-09-13 by driving the live region: two arrow presses announce at 477 ms and 1,981 ms, so the region changes about four times faster than it can be read. Whether that queues or replaces is **reader-dependent and unanswerable without a real screen reader**, and if it queues the volume clause is the first thing lost because it is last. `VOLUME-AND-WINDOW.md` §45.1 carries the repair (split the sentence; do not raise the floor). **Amended 2026-09-13 by Task 2.13.10: the answer is still owed, and the owner is now a person rather than a task.** That close performed every half of this that an instrument can — the clause is present, it is last, the region does change every 477 ms — and established that the deciding half is not measurable at all: queue-versus-replace is a property of a specific screen reader on a specific platform, readable from neither the DOM nor a timing nor by an agent. It is raised with a condition rather than re-deferred to a story (§65), because a story number is a deadline nobody is standing behind. Re-measure the arithmetic: count the words in `readingAnnouncement`'s output and divide by three words a second, then compare against the floor. **Amended 2026-09-24 by Task 3.9.6 — a FIFTH entry, and the first where the region changes with NO key pressed at all.** Since Task 3.9.2 the chart extends on its own, and a **revision of the bar under the crosshair** rewrites this region unprompted — measured in a browser: a _new_ bar changes nothing here (the reading holds its instant, so the sentence is the same sentence), and a revision of the bar being read changes the close and the direction word while the instant stays put. That is **0.1062%** of bars with **37.6%** of those moving the close — re-measured over a whole session on 2026-09-24, against the 0.064% / 35.3% this entry cited until then (`LIVE-DATA.md` §14.1 carries both) — so it is rare — and it is the one case where speaking is arguably **right**, because the number under the reader's cursor has just changed. What is unanswerable is the same thing as above, arriving by a new route: **an unprompted polite update landing while a sentence is in progress** either queues or replaces, reader by reader, and no DOM and no timing can say which. Every half an instrument can do is done, in `security-live-edge.spec.ts`. **Owner: the same person with the same screen reader**, and this entry is why the pass is worth booking rather than deferring again. Re-measure: with a reading on the chart, push a revision of the bar it names and listen. **Amended 2026-09-24 by Task 3.10.6 — a SIXTH entry, and the first that is not the chart's.** The market-feed cell now announces a **degradation** — `live → stale`, `live → disconnected`, `stale → disconnected` — through a visually hidden `role="status"` in `FeedIndicator`, and is silent on mount and on any recovery. Task 3.10.5 made this cell the **only** surface on a security page that says the feed stopped, so this region is a listener's whole notice. Three things only a person with a reader can answer, and all three were reasoned rather than heard. **Does a `role="status"` region that is EMPTY on mount and later filled get spoken at all**, or does a reader that took its initial snapshot treat the fill as a first render? **Does a sentence that is written once and then held get re-read** if the listener moves focus, or is it a one-shot? And the same queue-versus-replace question as every entry above, arriving here from a **footer** while the listener is reading something in `main` — which is the case this cell exists for, because Task 3.10.2's criterion 3 asserts `main` is byte-identical either side of an outage. Every half an instrument can do is done: the sentence's presence, its content and its silence on mount and recovery are asserted in `security-feed-degraded.spec.ts`, and the defect that made it live for exactly one render was caught there. **Owner: the same person with the same screen reader.** Re-measure: load a security page, kill the backend, and listen for `Market feed disconnected. …` without touching the keyboard. **Amended 2026-09-26 by Task 4.2.8 — a SEVENTH and an EIGHTH entry, the first two that are not on a security page.** The `Market proxies` strip on `/` is four figures with no drawn label and no column heading, and both entries are properties of the sentence a listener is handed rather than of the DOM. **The figure is spoken as a bare unlabelled number** — `SPY. 774.03. up +0.42%.` — because the symbol occupies the slot the security page gives to `LATEST PRICE`, so nothing in the cell says _what kind of figure this is_; the noun is in the shared line **beneath all four** (`2026-09-11 · closing prices`), which a reader's eye takes in at a glance and a listener reaches four cells later. And **the shared basis clause is heard after the four changes it qualifies** — `… · change from 2026-09-15's close` is correct visually as a footnote and is the reverse order aurally, so a listener is given four percentages and then told what they were measured against. Neither is answerable from a DOM and neither is a defect anything mechanical can see: the strings are present, correct, in the right document order, and `MarketProxyStrip` deliberately has **no live region** (its own docblock carries the reversal trigger). **Owner: the same person with the same screen reader.** Re-measure: open `/` with a reader and navigate the strip by element and by line, in the stored state and in the observed one — the two have different sentences.

   Three added at Task 2.13.9's measurement, and the first is the most useful thing that task found:

   - **The volume silhouette's justification is a cost curve `PRODUCT_SPEC.md` §28's own criterion cannot see.** The per-pixel rule was taken so that one element per bar could not happen; the break was performed on the shipped component — one `<line>` per bar, real geometry, real stroke width — and it puts **9,810 elements** in the two plots and costs **10.7× the JavaScript on the resize path at the cap (333.5 ms against 31.3 over thirty ticks), 2.3× the engine's own time and six times the garbage collection** — while `PerformanceObserver` on `longtask` reports **nothing at all**, cold, under a resize storm or under a pointer sweep. Forty resize ticks are forty separate tasks, so 11 ms of JS a tick never crosses 50. It is the same shape as Task 2.12.9's 17× pointer-path finding and it is worth knowing twice: **a regression that is real, measurable and invisible to the instrument the published target is written against.** The only thing standing there is `VolumeChart.test.tsx`'s _draws no element per bar, at sixty-five times the bars_. Re-measure: draw one `<line className={styles.columns}>` per bar in `VolumeChart.tsx` and confirm it goes red at `expected 1951 to be 31` — verified that way on 2026-09-13 — then build it and watch a browser report a clean run.
   - **A per-bar call into the timezone layer is only safe where the answer is per session.** On a `1d` axis a slot _is_ a session, so `positionOfInstant` resolves an instant through `marketDateAt`, and `placeBars` calls it once per bar: **1.8 ms per plot at 1Y**, bounded by the 248 sessions, which is fine and is the opposite shape from every other cost in this chart layer. The counterfactual is what matters: the same call per bar on a `1m` axis is **15.9 ms at the 1,950-bar default and 59.3 ms at 1M's 8,190** — over the whole budget, on its own, before a pixel is drawn. Nothing anywhere compares a placement rule against the timeframe it will run on, and the `1m` branch avoids it by arithmetic rather than by a check. `VOLUME-AND-WINDOW.md` §55.1. Re-measure: time `marketDateAt` over every bar of a recorded `1m` body, 200 iterations after 50 warm-ups. **Amended 2026-10-09 by Task 4.8.7: every figure in this entry is ~2.6× too large and the shape of the finding is unchanged.** `marketDateAt` read `Intl.formatToParts` three times per answer and used one; it now reads it once, measured at 3.366 → 1.288 ms over 518 instants. So the counterfactual this entry turns on is roughly 6.2 ms at the 1,950-bar default and 23 ms at 1M's 8,190 rather than 15.9 and 59.3 — still the largest single term in a 50 ms budget, no longer _over the whole budget on its own_. **The rule is untouched**: a per-bar call into the timezone layer is still only safe where the answer is per session, and the `1m` branch still avoids it by arithmetic. The three figures above are left standing as the dated measurements they were; re-take them rather than scaling them.
   - **A cold load's calendar walk is ~10 ms in Chromium and it is almost entirely one function.** `timeAxis` totals **9.7–10.9 ms** on a cold 1Y load — corroborating Task 2.13.3's 9.5 ms Node figure in a second runtime — of which **8.0 ms is `marketSessionOn` and 7.3 ms of that is `instantFromMarketTime`**, which probes the timezone twice per call and reads the result back. The memo cannot touch it, because it is the first walk. It is under budget and it is the one figure here with a named, untaken repair in a different module; the trigger stays Task 2.13.3's — **the first window whose first paint is measurably late because of it**. Re-measure: profile a cold `/securities/NVDA?sessions=252` at a 50 µs sampling interval and read `timeAxis`'s **total** time, not its self time — self time reads under a millisecond and is the reason this was nearly recorded as a non-finding.

   Four added at Story 2.13's close, and the first is a warning about an **instrument** rather than a missing check:

   - **The browser-automation tools this agent has to hand cannot judge anything that depends on layout, and the failure looks exactly like a product defect.** `CLAUDE.md` already records the mechanism — a tab driven over CDP reports `document.visibilityState === "hidden"`, which pauses `requestAnimationFrame` and with it `ResizeObserver` delivery. **It fired again, immediately, on the first thing Task 2.13.10 tried to do**: the deployed `/securities/NVDA` opened in a Claude-in-Chrome tab reports **both chart `<svg>` elements at 0 × 0**, which is the picture a broken chart makes. Playwright's page in the same moment reports `visible` and real boxes. The entry is repeated as a **close** finding rather than left at 2.13.7's because the first one was written from a developer's machine and this is the deployed site, and because the cost is a session of chasing a defect that does not exist. Re-measure: read `document.visibilityState` and run a 400 ms `requestAnimationFrame` counter in whatever browser is being used to judge a layout — in a hidden tab the counter never resolves at all, which is how this was found the second time.
   - **A gap-list entry that could not be made mechanical, with the reason measured — and it generalises past this one entry.** Task 2.13.9's `marketDateAt`-per-bar rule was to become a spy asserting **zero** calls over a recorded `1m` body. It cannot be: **`vi.mock` does not reach `@marketpulse/shared`, which the frontend consumes as built output.** Probed rather than assumed — the mock intercepts the _test file's_ own import (a replaced `marketDateAt` is visible there) and the module under test keeps the real function (`timeAxis` runs to completion against a mock that returns garbage). So both halves of the guard read zero, and the break-verified half would have been **green against the break** — which is `CLAUDE.md`'s own rule catching a test that was nearly shipped. The entry stays prose with its re-measure. **The residue is the class**: any guard in `apps/frontend` or `apps/backend` that needs to observe a call into `packages/shared` is unavailable by this route, and a test that appears to work is the likely outcome rather than an error.
   - **That a tick is not drawn on top of its neighbour, at any density, in any chart.** `MIN_TICK_SEPARATION` repairs the one collision 2.13.8 found by looking at a rendering of Thanksgiving week, and `CHARTING.md`'s answer 9 now carries the rule. What nothing anywhere does is compare a tick's position against a **neighbour's rendered width**: jsdom computes no layout, and Playwright's visibility check is a non-empty bounding box, so two labels drawn on top of each other are `visible` to both. Re-measure: set `MIN_TICK_SEPARATION` to 0 and confirm _drops a midday that would be drawn on top of the next session's date_ goes red — then open `Market/ChartAxis → HolidayWeek`, because the unit test knows the number and only a person knows it collided.
   - **That the deployed page is the page that was measured, and that the two stores photograph differently.** Task 2.13.10 took every figure in `VOLUME-AND-WINDOW.md` Part nine against the **deployed** store, which is zero sessions behind and answers both `1m` windows in full; every figure in Parts one to eight came from a developer's store, which is four sessions behind and answers the default window four-fifths short. **Both are correct**, and neither is re-taken by anything. The practical consequence is that the deployed environment is the one place this story's own coverage treatment is _not_ under observation, so a screenshot means little without saying which store it came from — and `pnpm e2e:deployed` does **not** close the gap: it is three specs about routing, the universe and the two halves, and nothing in it drives the window control, the rail, either plot or the crosshair. **Amended 2026-09-15 by Task 2.14.9, and the gap narrows rather than closes.** `specs-deployed/security-explorer-journey.spec.ts` now drives the journey deployed — both plots, the crosshair, the window control and the address — so the sentence above is no longer true of the suite. What it is still true of is **this entry's own subject**: that journey asserts structure and deliberately asserts **no figure and no coverage state**, because the coverage sentence renders only under a `partial` answer and a healthy deployed store answers a named window in full. So the deployed environment is still the one place the coverage treatment is not under observation, and for a sharper reason than before — it is not that nothing looks, it is that a healthy deployment **cannot produce the state**. Re-measure: `curl $BACKEND/diagnostics/freshness` and read `sessionsBehind` for both timeframes before believing any deployed screenshot of a coverage state.

   Two added 2026-09-14 by `VOLUME-AND-WINDOW.md` §79, and both are about a plot that holds nothing:

   - **That the in-frame empty sentence is legible on the ground it sits on.** It sits on `--chart-uncovered`, which is **1.107:1** against the plot ground — so ink measured against the panel's background has not been measured against this one, and `getTokens()` throws in the test environment by design, which makes a browser the only level that can see it. `pnpm invariants` proves the sentence has one home; nothing anywhere reads its contrast. Re-measure: `pnpm store:bare`, then `DATABASE_NAME=marketpulse_bare pnpm dev`, then `pnpm probe /securities/NVDA --within Price --widths 1440,390`, and read the ratio off the screenshot in `.probe/` — or open `Market/ChartVacancy → Empty` in the workshop, which is where the greyscale check lives.
   - **That the block is centred in the plot rather than pinned to a corner of it.** This is a repair to a defect rather than a hypothetical: `composes:` emits the composed class at **equal specificity**, so `chart-marks.module.css`'s `.overlay { display: block }` beat a `display: flex` written beside it, and the sentence rendered top-left inside a correct frame. **Nothing below `pnpm e2e` can see it** — jsdom applies no stylesheet, so the component test asserting the words are present passed against the broken layout — and no browser spec asserts a position either, because the words are `aria-hidden` and every existing assertion is about the _text_. `pnpm probe` found it in thirty seconds. Re-measure: the same bare-store probe, and read `content` and `headline`; centred at 1440 is `content 801×280 @57,670` with `headline 198×18 @358,761`, and the broken shape was `headline 801×18 @57,670`.

   Two more added 2026-09-14 by §80, and both are about the pending panel:

   - **That the two timing numbers still clear what a window change costs.** `SHOW_AFTER_MS` is 160 and it was set above a measurement — 2–9 ms warm and 7–68 ms cold off a local backend, plus `CLAUDE.md`'s recorded 50–66 ms of main thread on a cold security page. Nothing re-takes any of that, and the failure is silent in **both** directions: too low and every ordinary window change flickers a panel; too high and the panel never appears at all, which looks exactly like the feature not being wired up. `use-pending-panel.test.ts` asserts the boundaries against the constants, so it stays green whatever the constants say. Re-measure: `for s in 1 5 21 63 252; do curl -s -o /dev/null -w "%{time_total}\n" "http://localhost:3000/market-data/bars?symbol=NVDA&sessions=$s&timeframe=1m"; done`, three runs, cold and warm.
   - **That the pulse reads as a wait rather than as content, and that its floor is high enough.** It breathes between `--chart-uncovered` and `--chart-grid`, a 1.107:1 range chosen so the movement is texture rather than a value changing — and the version before it animated **opacity**, which faded the plot's own gridlines in and out underneath and read as the chart flickering. Nothing mechanical can tell those two apart: jsdom applies no stylesheet, and a browser spec sees a `visible` element either way. Re-measure: `Market/ChartPending → OverAHeldChart` in the workshop, and again with `prefers-reduced-motion: reduce` forced, where the animation must not run at all and the panel must still read as one thing present and waiting.

   One added 2026-09-15 by `VOLUME-AND-WINDOW.md` §81, and it is the check `MetricStrip` says an override owes:

   - **That each of the price strip's four labels sets on one line, at every width.** `.priceStrip` overrides the primitive's `auto-fit` with four fixed columns, which means the primitive's own 7rem floor is switched off and this consumer owns the measurement instead. **Nothing below `pnpm e2e` can see a wrapped label** — jsdom computes no layout — and no browser spec asserts a height either: a wrapped `1D CLOSE` is `visible`, correct and fully legible, it just makes every metric 58px instead of 42 and pushes the chart down. The failing width is **1024 and not 390**, because 1024 is the widest layout where the strip still shares its row with the window control, so a development machine at 1440 and a phone check at 390 both miss it. Re-measure: `pnpm probe /securities/NVDA --within Price` and read `metric` at all four viewports — 42px is one line, 58px is a wrap — or drop `min-width` on `.priceStrip` and watch 1024 alone go to 58.

   Two added 2026-09-14 by Task 2.14.3, and both are about a claim that is correct and unproducible:

   - **That the source note's two-feed ledger says something true.** The sentence it draws — each stretch, in contribution order, with its bar count — is the one invariant 6 exists for, and ~~**no server this product runs can produce the answer it renders**~~ (**amended 2026-09-23 by Task 3.7.5 — the server now produces it from a store holding two tapes**, one source per contiguous run through the merge, proved against a real database; what still holds is that no deployed store has two tapes until Story 3.8, and the frontend's fixtures are unchanged; **amended again 2026-09-24 by Story 3.8's close — the deployed backend has written IEX bars since 2026-09-23, but the two-feed state is a MID-SESSION one on that store and nothing has yet photographed it**: the read prefers `sip` where a minute holds both tapes (Task 3.8.4) and the nightly backfill covers every regular-session minute, so a window read after the backfill names one source — measured against production on 2026-09-23, `NVDA` `1m` one session, 390 bars, one `alpaca`/`sip` entry): all sixteen recorded bar-series bodies carry `feed: "sip"`, `stitched.json` included, because both halves of that stitch came from Alpaca's historical API. So the state is reached from a story and a test through `twoFeedStitchView()`, which is the recorded stitch with **one field changed** through the real transition. What nothing checks is that the change still corresponds to what Epic 3's socket will actually send. Re-measure: when the IEX stream lands, record a real two-feed body, delete `twoFeedStitchView` and point its three readers at the fixture — the function is named and commented so that deletion is the obvious move rather than an archaeology exercise.
   - **That the note and the masthead never print one fact twice.** §1.3's rule is the acceptance test for this surface, and it is now held _structurally_ — the note's condition for naming a feed is the negation of the chrome's for claiming one, so the two cannot both say `All US exchanges` — rather than by a check. What nothing can see is a **fifth** clause added later that restates something the chrome, the rail or the reading strip already owns; the grain table in `VISUAL-LANGUAGE.md` is the rule and a reader applying it is the whole mechanism. Re-measure: `pnpm probe /securities/NVDA` and read the masthead and the foot of the page in one screenshot, which is what found the two wording defects this task shipped without.

   Three added 2026-09-15 by Task 2.14.5, and the first is the residue of a
   reservation that is otherwise measured:

   - ~~**That the rail's reservation still clears the coverage sentence at every width.**~~ **Closed 2026-09-16 with the sentence**, which came off the rail (`PROVENANCE.md` §3.2's amendment). The slot is back to one hidden copy and the held-window sentence's **48px**, which is what it reserved before Task 2.14.5 added a second — so this entry's whole subject, the two-cell reservation and the bar count's unreserved digits, no longer exists. What is worth carrying forward is the **shape**: a rail with two incommensurable sentences in it cannot reserve by comparing character counts, and the next third occupant will meet that again. Re-measure if one arrives: `pnpm probe "/securities/NVDA?sessions=5" --within Price` and read `rail`.
   - ~~**That a coverage sentence and a coverage edge never disagree about where the data stops.**~~ **Closed 2026-09-16, and by removal rather than by repair** — there is no drawn sentence to disagree with the edge. What the reader has instead is the picture and the axis: the line stops at `coverage.covered.end` through `positionOfInstant`, and the seams carry dates, so _when_ is answered to the session rather than to the second. **The listener's clause survives and is now unpaired**, which quietly makes this a different gap and a smaller one: nothing compares the spoken instant against the drawn edge either, but there is no second visible claim that can drift from it. Re-measure: open a partial answer, read the instant out of the chart's spoken description, and check it against `series.coverage.covered.end` — `curl "$BACKEND/market-data/bars?symbol=NVDA&sessions=5&timeframe=1m" | jq .series.coverage`.
   - **That `e2e/specs/` and `e2e/specs-deployed/` agree about where a thing on screen is.** Added 2026-09-16, after it cost a red deploy. The two directories hold their own copies of the same locators, and **a green `pnpm e2e` is not evidence about the second one** — it does not run those specs at all. The chrome moved the market feed out of the masthead into `AppFooter`; `support/app.ts` and two specs under `specs/` were rescoped from `banner` to `contentinfo` in the same change, `specs-deployed/two-halves.spec.ts` was missed, the local suite was green three runs over, and `check-deployed` went red after the merge. It behaved correctly — a deployed check gates nothing and produces a rollback decision, and the decision was _no rollback_, because the page was right and the spec was stale. Nothing mechanical connects the two directories and nothing here proposes that it should: a check that a locator appears in both would be wrong the moment one of them legitimately differs. Re-measure: `grep -rn '<the locator>' e2e/` rather than `e2e/specs/`, whenever a locator changes. `e2e/README.md` carries the habit beside the spec table.

   - **That a reader is told a short answer is short at all, now that only the picture says so.** This is the gap the removal opens and it is recorded rather than waved past. A sighted reader gets it from `CHARTING.md` §14.1's uncovered ground and coverage edge, and gets _when_ from the axis's dated seams — both geometric, neither asserted by anything mechanical, and the axis's labels thin out at narrow widths (§14's density table drops to first-and-last dates at 400–599px). **The reversal trigger is written in `Settled`'s own comment: an axis a reader cannot read a date off.** Re-measure: open a partial answer at 390 and ask whether the picture says _when_ it stops, not just _that_ it does.
     Three added 2026-09-15 by Task 2.14.6, and all three are about the empty page:

   - **That `SecuritiesResponse.coverage`'s `1m`-only shape does not mislabel a daily-timeframe empty.** The distinction between the two empty answers is derived from that array (`chart-vacancy.ts`, `PROVENANCE.md` §6.2), and the array carries the **minute** half of the ledger by Task 2.8.9's stated choice. So a security holding minute bars and no daily bars reads as _we hold nothing in this window_ at `3M` and `1Y` when the honest answer there is _we hold nothing at all_. The backfill fills both timeframes, so the shape is unlikely rather than impossible, and it fails in the safe direction — the error it can make is the **cautious** sentence where the confident one was available, never the reverse. Seen from the other side while the task was being looked at: removing one security's `1m` ledger row on a developer store draws _No history stored for ZTS yet_ under an identity block still showing a last close, because that close comes from a **daily** bar the array never described. The sentence stays true because it says _at this timeframe_, which is the clause that earns its place. Re-measure: delete one security's `1m` row from `bar_coverage`, open `/securities/<symbol>?sessions=1`, then `?sessions=63`, and read the two answers against each other. `pnpm coverage:check` is what would make this mechanical, and it does not compare the two timeframes' ledgers for a _single_ security.
   - **That the drawn empty sentence and its two spoken twins say the same thing.** Four literals are drawn (`ChartVacancy`), and each has a spoken counterpart in `chart-alternative.ts` or `series-announcement.ts` that is deliberately **worded differently**, because visible text is written to be scanned and an announcement to be heard once. `pnpm invariants` holds that each drawn sentence has one home; **nothing holds that a drawn sentence and its spoken twin agree about which empty answer they are describing**, because they share a derivation and not a string. What stops them drifting is one value threaded from one place — `storedHistoryFor` in the route — and a unit test on each side. Re-measure: `pnpm --filter @marketpulse/frontend test SecurityExplorer`, which renders the route with both requests stubbed and reads both spoken copies out of the DOM; a drawn/spoken disagreement is only visible there.

   - **That a market instant is ever rendered in market time by the browser suite CI runs.** Every assertion of the form _this timestamp carries `EDT`/`EST`_ is now scoped to an answer that has an instant in it, and **a bare store has none**: the readout checks `test.skip` with no bars, the coverage sentence needs a `partial`, and as of 2026-09-15 the store vacancy names no window. So on CI — 518 securities, zero bars — nothing in a browser checks that a timestamp is not being rendered in the runner's own timezone, which is the defect the check exists for and the one a machine in another zone is most likely to introduce. This is not a regression in the product; it is a coverage claim that was **quietly resting on an incidental string** — the window vacancy's requested range — and stopped when that sentence correctly stopped carrying one. Re-measure: `pnpm store:bare`, drive the pair at it, and read `security-series.spec.ts`'s store-vacancy branch; the assertion that survives there is that the page claims _no_ window, not that it formats one. The mechanical repair, if it is wanted, is a spec that asserts market time against a surface with no data dependency — the market clock in the status strip is the only candidate, and it prints `ET` rather than `EDT`.

   - ~~**That `No shares changed hands anywhere in the window.` stays true when a series names two feeds.**~~ — **CLOSED 2026-09-24 by Task 3.9.8, and the trigger fired as written.** The sentence now has one home, `describeSilence` in `market-provenance.ts`, and reads its scope off the series' own tapes: `anywhere` only where the consolidated tape is what we read, the venue **named** where it is not, and `on either feed` across a stitch. Asserted per tape state in `market-provenance.test.ts` and in the drawn strip in `VolumeReading.test.tsx`; `pnpm invariants` carries `the-market-claiming-sentence-has-one-home` and `pnpm break the-market-claiming-sentence-gets-a-second-home` proves it goes red. The re-measure below named `twoFeedStitchView()`, which **Task 3.9.7 deleted** — an entry that rotted between the trigger being written and its firing, which is this list's own second rule catching itself. The original, for the record: It is the one user-facing sentence in the product making a claim about **the market** rather than about our store, and it is correct today for the reason the pass records: every stored bar is the consolidated tape, so _anywhere_ means every US venue. The moment Epic 3 stitches an IEX tail onto stored bars, the sentence is a single venue's silence reported as the whole market's — the exact failure `PRODUCT_SPEC.md` §7.1 forbids, in the one place a reader would never look for it. `PROVENANCE.md` §11 records it as read-and-left with this trigger. Re-measure: when a series can carry two feeds, render `Market/VolumeReading` against `twoFeedStitchView()` and read the sentence.

   Three added 2026-09-15 by Task 2.14.7's pass over the epic's failure states,
   and all three are claims about **a screen** rather than about a module —
   which is why the pass that found them was a person opening the page with
   every request refused, and why the two that could be mechanised were.

   - **That every named region on a screen says something when its subject is
     missing.** The Volume region rendered nothing at all for a refused or
     failed series until this pass — a landmark with a visible heading and an
     empty box — and it was correct in its own component, reviewed in its own
     story, and asserted by a unit test that checks no `<svg>` is drawn. There
     is no general check for this: a region whose content is legitimately
     conditional looks identical to one whose content silently disappeared.
     `e2e/specs/backend-failure-states.spec.ts` now asserts all eight regions
     are present **and** that the Volume region carries its deferral, which
     covers this screen and no other. Re-measure: refuse every request with
     `route.abort` and read each region's contents, not just its heading.
     **Discharged for `Movers` on 2026-10-08 by Task 4.5.6, and by a sentence
     that is honest at zero rather than by a widening.** That region's empty
     state is not an accident a reader has to diagnose — it is CI's permanent
     state (518 securities, zero bars), most of a weekend and the first minute
     of every session — and until this task it drew two headings, ten held
     rows and **nothing else at all**, 466 px of labelled, empty box. It now
     carries its own footer in that state: _Of the 503 companies we track,
     none were heard from in the last 5 minutes. There is nothing to rank._,
     with every figure read off the frame and the head slot's bound suppressed
     beside it. The **one-sided** state — one list full, the other empty —
     gets the sibling sentence, `None of the names we measured declined.`,
     which claims the set we measured and never the market.
     `e2e/specs/overview-movers-denominator.spec.ts` asserts all three
     branches, keyed on what the frame actually said so that neither CI nor a
     backfilled store skips. **The general claim is unchanged and unowned**:
     nothing compares a region's states against each other, and the next
     region to ship inherits the same question.
   - ~~**That the defaulted note's invitation is still available.**~~ **Closed
     2026-09-16 by deleting the sentence**, which is worth recording because it
     is not how the trigger expected to fire. The entry read: `/securities` with
     the universe down says _Showing a default security. Search for another one
     above_ four inches under search's own _Nothing to search yet_; half the
     sentence is true — the address half — and coupling the note to search's
     state is a dependency `PROVENANCE.md` §12.5 declines to introduce. The
     trigger was **the second sentence in the product that points at another
     surface's control**, and what actually happened is that the first one
     stopped existing: the search field moved onto the page's heading row, so a
     paragraph above the panel's figures pointing upward at it was pointing at
     something already in the reader's eye. **A sentence that names another
     surface's control is a coupling whether or not that control can answer**,
     and the cheapest version of this gap was always the sentence's own
     absence. The trigger stands for the next one.
   - **That the primary navigation is legible at 390.** It reads `Market O` —
     clipped, with no affordance saying so — in every screenshot this pass
     took. Outside the failure set, because it is the chrome rather than a
     state, and outside every browser assertion, because the links are present
     and reachable. Re-measure: `pnpm probe /securities/NVDA --widths 390` and
     look at the masthead. Owner: the first story that touches `AppHeader`.

4. **Prose figures.** Documentation publishes numbers nothing regenerates. `pnpm links` closed the _link_ half of this gap; the figures half cannot be closed, because a figure in a sentence has no referent.
5. **Schemas.** `verify.yml`, `deploy.yml`, `dependabot.yml`, `staticwebapp.config.json` and `compose.yaml` are all _formatted_ by Prettier and validated by nothing.
6. **Configuration that exists only on the platform.** The deploy uses `update` and never `create`, so the container app's probes, replica floor, ingress port, `CORS_ORIGIN`, `MARKET_DATA_PROVIDER` and the Alpaca credential exist in **no file in this repository** — as do the database's firewall rules, its Entra administrator, both Postgres roles and their grants, its alerts and its delete lock. `HOSTING.md` is their only durable copy. A diffing script **cannot** be a `verify` step, because `verify` has no credentials; making it one would fork the definition of "verified".

   One added 2026-09-14, and it is a property of the machine rather than of the tree:

   - **That a browser run was taken on a quiet machine.** Under load the suite fails a **different random set of tests on each run**, each failure carrying a real assertion message, a screenshot and a trace — which is the worst shape a failure can have, because nothing about it looks like a flake. Measured 2026-09-14 across four runs of **unchanged code**: 6 failures, then 16, then 10, then 1; two of those runs had `pnpm verify` and `pnpm format` going beside them, and the one failure that survived to the quiet run was a spec that times out at 30 s under load and passes in **7.6 s** alone. Triaging it cost more than the runs did. This matters more here than in most repositories because `e2e/playwright.config.ts` sets `retries: 0` and argues it — _"a retry is how a suite stops being able to tell a flake from a defect, and this repository has never once responded to a failure by re-running it"_ — and that argument only holds while a red run means a defect. The heavy-job lock (`scripts/heavy-job.mjs`) now refuses a second job **started from this repository**; what nothing can see is the rest of the machine, which is why `scripts/check-quiet.mjs` reports the load average as a warning rather than a refusal. Re-measure: read `uptime` before believing a red run, and re-run one failing spec **alone** before believing it is a defect.

7. **The socket fixture corpus is one remove further from the vendor than the HTTP one, and one frame in it is two.** Added 2026-09-18 by Task 3.2.3.

   `apps/backend/src/fixtures/alpaca/` holds **raw** HTTP bodies — bytes the vendor sent, stored unaltered. `apps/backend/src/fixtures/alpaca-stream/` holds **none**. Story 3.1's 31 socket captures were deleted with the harness that took them, which was always the plan (`ALPACA.md` §11), so every frame there is **transcribed** out of a `LIVE-DATA.md` section that quoted it verbatim. The bytes are still the vendor's; the chain of custody is a document rather than a capture file. `MANIFEST.json` tiers each file and a unit test asserts nothing in it claims to be raw.

   **Two frames are weaker still, and they are the `updatedBars` revisions.** **No verbatim `u` frame exists anywhere in this repository** — §7.8 recorded what the fourteen revisions _changed_ (symbol, bar timestamp, lag, fields) and never quoted one. So both `u` fixtures take their **envelope** from the verbatim `b` frame in §7.3 and their **field values** from §7.8's measured table. Nobody has seen those exact bytes on a wire.

   **The risk is bounded and worth stating precisely:** the _semantics_ are measured and not in doubt — a revision supersedes a `(symbol, minute)` rather than adding to it, arriving 29.1–30.1 s later, changing the close 35.3% of the time and changing nothing 0% of the time (§14.1, n=68). What is inferred is only whether a `u` frame carries the same field set as a `b`. If it does not, Task 3.2.4's mapper is wrong about `u` and right about everything else.

   **Why it could not simply be recorded:** a `u` frame only occurs during a live session, and the corpus was built at 02:28 ET with the market shut — so the harness being gone was not the binding constraint that day. **Owner: Story 3.3** — **re-pointed twice, and the second time is the informative one.** It first named Task 3.2.5, which built the client; nothing constructed one, so it never opened a socket and completed without discharging this. It then named Task 3.2.9, which starts the stream — and 3.2.9 ran at 06:10 ET with the market `before_open`, so it could not capture a `u` frame either. **An owner that is a finished task never fires**, so it moves rather than sitting there.

   **What changed with 3.2.9 is that the capture is now POSSIBLE for the first time**: before it, nothing in this repository opened a socket against the live market at all. Story 3.3 is the first story that will be developed against a running feed during sessions, which makes the trigger something somebody will meet rather than something they must remember to go and do. **Trigger: the first `u` frame it observes in a live session** — record it verbatim, replace both fixtures, re-tier them to `transcribed`. Re-measure: `node -e` over a live subscription, or read `MANIFEST.json`'s `knownWeakness` block, which says the same thing beside the files.

8. **That a process dying without closing its market socket locks its successor out for hours.** Added 2026-09-18 by Task 3.2.5.

   `LIVE-DATA.md` §12.2 justifies the deliberate `SIGTERM` close with it, and it is an **inference rather than a measurement**. §6.4 measured _our client's_ view — `readyState` `OPEN` for **4 h 21 min** with nothing behind it — and is explicit that what killed it was not determined. **Nobody has measured whether Alpaca refuses a new connection while a half-open one sits unacknowledged**, which is the actual claim.

   **Two things follow, and neither changes the decision** — closing deliberately is free, correct and the fastest path to releasing the slot. What they change is what it is _credited_ with. A process that crashes still sends `FIN`, so on a healthy network path the slot frees at process exit either way, and the genuinely unbounded row is the one where the **network path** is broken rather than where the close was skipped. And in exactly §6.4's scenario the deliberate close bounds nothing at all: a close frame on a dead socket reaches nobody (§6.4 watched one time out after 30,016 ms), so what limits exposure there is the **165 s watchdog**, not the shutdown path.

   ~~**Owner: Story 3.11**, already the story that runs a real socket in the deployed backend. **Trigger: the first deploy that rolls a replica while the feed is connected.** Re-measure: observe whether the arriving replica is refused `406`, and for how long — one observation settles it.~~

   **ANSWERED 2026-09-25 by Task 3.11.6, on two consecutive deploys, the first day production's logs existed.** The arriving replica is refused `406` and authenticates after **45.8 s** and **46.5 s** — fifteen and sixteen retries at 3 s, each preceded by a `closed` at **3.6–5.9 ms**, which is §8.5's _refused duplicate_ shape confirmed from the other end. **`LIVE-DATA.md` §12.2's claim that the deliberate close bounds the every-deploy outage at the 5 s shutdown ceiling is wrong by 9×.**

   **And the mechanism it names is working.** On revision `0000350` the outgoing replica logged `market stream closing deliberately` at 04:40:32.620 and the arriving one authenticated **2.9 s later**. The close releases the slot promptly; what nobody checked is that **the outgoing replica is not asked to shut down until ~46 s into the new one's life**, because that is when Container Apps terminates it. **The bound is the platform's revision-overlap policy, not our shutdown path** — so the decision stands and the figure does not. **Every deploy costs about 46 seconds of live feed**, which during a session is 46 seconds of prices this product does not receive.

   **What is still unmeasured is §6.4's pathological case**: a genuinely half-open socket behind a dead process, from **Alpaca's** side. The ordinary deploy is not an instance of it — the incumbent is alive and holding the slot legitimately. **Owner: a condition — the first deploy that fails to terminate its predecessor cleanly**, which is the only way to produce one without staging it deliberately.

9. **That production is serving the real market rather than a replay.** Added 2026-09-18 by Task 3.2.8.

   **Nothing in `pnpm verify` can check this, and that is structural rather than an omission**: `verify` has no credentials and no network by design, and pointing it at a live origin would fork the definition of "verified". So the claim lives in two runtime checks and neither is preventive.

   `GET /diagnostics/feed` reports the **configured** provider, the feed identity, the connection state and the newest observation's own instant. `check-deployed.mjs` fails on it after a merge — **unconditionally if the provider or feed is `replay`**, and, **while the market is open by the server's own calendar**, if the feed is not a connected `iex`. `.github/workflows/probe-deployed.yml` runs the same script daily at 13:00 UTC, because `deploy.yml` has no `schedule:` and **nothing in this repository looks at production between merges** — a hand-edited environment variable on a quiet Tuesday is otherwise invisible for days.

   **What that leaves uncovered, stated plainly.** Both are **detective**: by the time either goes red, the wrong state has already served traffic. What they bound is its **duration** — to a merge and to a day respectively. ~~The only preventive mechanism is `deploy.yml`'s provider read (ADR 0030 §7b), and it fires only when a deploy runs.~~ — **corrected 2026-09-25 by Task 3.11.7: that sentence was describing a step that did not exist.** ADR 0030 §7b has said since 2026-09-16 that the deploy reads `MARKET_DATA_PROVIDER` off the container app and refuses to roll on anything but `alpaca`; nothing in `deploy.yml` did. This entry then quoted it as _the only preventive mechanism_, and both documents read exactly as they would have if the step were there. **It is there now** — `Read the configured provider, and refuse to roll on the wrong one`, asserting both of §7e's keys before the image rolls — and `pnpm invariants` carries `the-deploy-reads-the-provider` so the next reader of this sentence is checking a mechanism rather than a claim. **Re-measure:** `E2E_DEPLOYED_BACKEND_ORIGIN=… E2E_DEPLOYED_BASE_URL=… node scripts/check-deployed.mjs`, and read the `feed` line; for the preventive half, `pnpm break the-deploy-stops-reading-the-provider`.

   **And condition 3's grace was re-derived the same day.** `check-deployed.mjs` fails on `disconnected` at any hour with a grace for the deploy handover. That grace was **20 s**, doubled from the 9,498 ms the _outgoing_ socket took to close — the right figure for a different question. Task 3.11.6 measured what it actually races: the arriving replica is refused for **45.8 s / 46.5 s**. It is now **60 s**. On the two deploys that have run the condition it never went red, and the reason is not the grace: the probe arrived **45–52 s after the feed was already back** (backend `up 98.9s` and `up 92.3s`), because the frontend build sits between the rollout and the check. **A margin supplied by how long an unrelated step takes is not a margin.**

   **Not made mechanical because it cannot be**, which is this list's residue by design: a runtime claim about a deployment is exactly what a credential-free `verify` cannot make.

10. **That what we built is reachable at all.** Added 2026-09-18 by Task 3.2.9, which existed because it was not.

Story 3.2 shipped **three implementations of `MarketDataStream` and constructed none of them**. Every implementation had tests, every guard had a passing `pnpm break`, and `pnpm verify` was green throughout — **the absence of a construction site is not a shape any test has.** Alongside it, Task 3.2.5's deliberate `SIGTERM` close had no caller, so the mechanism that bounds the every-deploy outage at `SHUTDOWN_TIMEOUT_MS` instead of `LIVE-DATA.md` §6.4's **4 h 21 min** was hanging up a connection that was never opened — and its process test passed, because it asserts the shutdown path _reaches_ the close, which it did.

**It cannot be made mechanical, and that is argued rather than assumed.** A factory built one story ahead of its caller is a state this repository uses deliberately — `MarketDataStream` was legitimately unimplemented for a whole task by design (Task 3.2.2), which is the point of writing an interface first. A rule firing on _exported and never called_ would fire on correct work more often than on a defect.

**Re-measure:** for each exported factory, route or registration a story adds, `grep -rn 'theName(' --include='*.ts' apps packages | grep -v '\.test\.'` and expect a call site or a **written** disposition naming the story that will call it. Then **start the built server and read what it says** — the grep proves a call exists; only running it proves the call works.

**THE SECOND FORM, FOUND 2026-09-20 BY TASK 3.4.3, AND THIS HALF WAS MADE MECHANICAL.** _Constructed_ is not _working_. For two stories after Task 3.2.9 built the construction site, **none of the three streams delivered an observation into a running process** — and `pnpm verify` stayed green, because every test drove them by hand with `tick()` or an injected event. **Nothing had ever asserted that a stream left alone in a process produces anything**, which is the last sentence of the re-measure above turned into a test: _only running it proves the call works._ `apps/backend/src/self-driving-streams.test.ts` now starts each self-driving stream **through `createMarketStream`**, advances an injected timer and asserts an observation arrived, with **no call to `tick()` anywhere in it**. Two breaks hold it — `fixture-stream-drives-itself` and `replay-start-is-a-real-session` — and both restore the tree exactly as it shipped. **What is still not mechanical is the same residue as above**: a factory whose caller is a story away, and the Alpaca client, which is driven by frames rather than by time and must not own a timer.

**One entry left this list on 2026-09-12 by being made mechanical, and the route is worth knowing.** _"The scheduled backfill fills every timeframe the application reads"_ was never written here — it was a defect first: the nightly job filled `1m` only for eight days, every run green, while `routes/securities.ts` read its last close at `1d` (`BARS.md` §8.18). It is now `pnpm coverage:check`, a `verify` step. **That is the migration this list wants** — a prose entry with a re-measure command is a check nobody runs, and a `verify` step is one that cannot be skipped. An entry that can be made mechanical should be; what stays here is the residue that genuinely cannot, which is the breaks a human has to perform and the claims only a browser or a live store can see.

Its runtime half is deliberately **neither** here nor in `verify`: `GET /diagnostics/freshness` answers _how many trading sessions behind is the store_, computed on request so it has no schedule to miss, and `check-deployed.mjs` fails on it after a merge. `verify` has no credentials and no database by design, and pointing it at a live store would fork the definition of "verified".

11. **That a motion treatment still means what it says once the motion is removed.** Added 2026-09-21 by Task 3.4.5, which shipped the defect and then found it by looking.

`prefers-reduced-motion` is answered once at the token layer — the durations resolve to `0ms` — and the reasoning written there is that _a transition of zero still ends in its final state and an animation of zero does not run_. **The second half has a trap in it.** An animation of zero duration applies **no keyframe styles at all**, so an element whose visible state lives only in its keyframes falls back to the CSS initial value rather than to anything anybody chose.

The arrival mark shipped that way for a few hours: `.arrival` declared no base `opacity`, so with the token at `0ms` it rendered at `1` and **stayed on screen for ever**. A reader who asked for less motion got a permanent dot beside the price — **the opposite of the vocabulary that same task shipped**, because a mark that persists reads as _a state_ rather than as _a fact that arrived_. Repaired by giving it `opacity: 0` as its base, with `animation-fill-mode` left at `none` so the element returns there.

**Nothing in `pnpm verify` can see it, and that is structural rather than an omission.** No stylesheet is applied in the component tests — `getTokens()` throws there by design — so computed opacity is not a question that level can ask. A browser is the only level that can, and it has to be told to emulate the preference before it will disagree with the default.

**The claim that is now unguarded:** every animated element in this product has a base state that is correct when its animation does not run. It is true of the four that exist today; nothing stops the fifth.

**Re-measure:** for each `@keyframes` in `apps/frontend/src/**`, check that the property it animates is also declared on the rule that runs it. Then, in a browser with reduced motion emulated, trigger the treatment and read the computed value.

**PARTLY MECHANICAL SINCE 2026-09-21, by Task 3.4.7** — and the split is the point, because it is exactly the residue this list is for. `e2e/specs/security-price-motion.spec.ts` emulates the preference and asserts the arrival mark's computed `opacity` is `0` and its `animation-duration` is `0s`, with a control asserting it runs at `0.9s` when nobody asked for less; `pnpm break the-mark-does-not-outlive-its-motion` restores the tree as Task 3.4.5 shipped it and proves the check goes red. **That covers the one element that has the defect and nothing else.** What stays here is the general claim — _every animated element in this product has a base state that is correct when its animation does not run_ — which is true of the four that exist today and is guarded for one of them. The grep above is still the re-measure for the other three and for the fifth.

12. ~~**That `PRODUCT_SPEC.md` §28's 250 ms p95 has ever been measured — it has not, and today it CANNOT be.**~~ **CLOSED 2026-09-22 by Task 3.6.4, and the closure is at the bottom of the entry.** Added 2026-09-21 by Task 3.4.8, which measured half of it and then checked whether the other half was obtainable.

§28's clock is explicit about its two ends: **server-received → application state**. Task 3.4.8 took **frame delivered to the page → price on screen** on a production build, under §7.4's real burst shape — 20 bursts of 332 bars, 6,640 observations — and got **p95 52 ms and 51.7 ms** across two runs. That is a real figure and it is **a different figure from the one §28 publishes**: the gateway, the socket and the network are not in it.

**The missing half cannot be taken with the protocol as it stands.** No message in `packages/shared/src/market-stream-protocol.ts` carries a server-side instant — `WireObservation` has the bar's own `startsAt` (§7.3, the interval's **start**, which is a fact about the market and not about when we sent anything) and `WireFeedState` has `status`, `feed` and `marketOpen`. There is nothing to subtract from. **A browser cannot time a journey whose start was never stamped.**

So the honest state is: **one half measured with 200 ms of headroom, the other half unmeasured and currently unmeasurable**, and a reader who sees "52 ms against 250 ms" without this paragraph will believe the target is met with room to spare.

**It is not made mechanical because the instrument does not exist yet.** Closing it is a **protocol change** — a stamp the gateway writes and the browser subtracts — which is a decision about the wire rather than a test somebody forgot to write, and it has a cost of its own: a field on every frame, 332 times a minute.

**Re-measure:** once a frame carries a server instant, subtract it in the browser at the same two ends and publish the whole figure. Until then, quote the browser half **with its ends named**.

**OWNER RE-ASSIGNED 2026-09-21 by Story 3.5's close, from Story 3.11 to Story 3.6.** The original owner was chosen as _the first story whose subject is this question rather than a story that trips over it_ — and the sweep after Story 3.5 found that **three** stories were by then tripping over it: 3.4's criterion 5 (which stopped that story closing), 3.6's criterion 5, and 3.11's criterion 4, all the same sentence. Task 3.5.8 re-confirmed the mechanism had not changed: it enumerated every field on the wire again, including the `subscribe` message Task 3.5.6 had just added, and found no server-side instant anywhere.

**A criterion three stories cannot meet and none owns is a criterion that never gets met** — the shape `CLAUDE.md` records against _does it feel alive_, deferred seven times. So it moved to the story that is **already opening the wire format** and is the first to need the figure at universe scale. Two constraints travel with it: the stamp is a **new field** rather than a second meaning for `startsAt`, which is load-bearing in the qualifier, the revision rule and every stored row; and it is a **third** clock reading used for measurement only — it must not reach `feed-liveness.ts`, whose 165 s monotonic and 60 s wall-clock split is a measured defect's repair.

**The reading it produces is honest only as a distribution**: a server clock and a browser clock disagree, so a negative sample is skew rather than negative latency.

**CLOSED 2026-09-22 by Task 3.6.4 — the instrument exists and the figure was taken.** Every frame the gateway sends now carries `sentAt`, the server's wall clock at the send ([ADR 0033](adr/0033-a-send-instant-on-the-wire-for-measurement-only.md)); the constraints above were honoured and two of them became mechanical: `pnpm invariants` holds the field out of `feed-liveness.ts` and both adapters over it (`the-send-instant-is-not-a-clock`, break-verified), and the process suite asserts the stamp is the gateway's own clock at each send (`pnpm break the-gateway-stamps-nothing`). The whole journey was taken on the universe table at 518 subscribed securities on a production build — the distribution, its n, its ends and its skew caveat are in [Task 3.6.4's record](../planning/epic-03-live-market-data/story-06-live-prices-across-the-universe/TASK-04-the-instant-the-wire-does-not-carry.md) and `STREAM-SEAM.md` §8.9. **What is NOT closed, and is owned rather than open:** the take was against the fixture stream on loopback, so the network leg is a loopback socket and the clocks are one machine's; Story 3.11's criterion 4 re-takes it against the deployed gateway during a session, and its `STORY.md` carries the recipe and the skew reading it should expect. **Re-measure:** the four-line instrument in the task file, against any pair — and quote both ends every time the number is quoted.

13. **That a row of a published state grid is a row the product can actually reach.** Added 2026-09-21 by Task 3.4.9, which found one that had been on a screen-in-a-document and unreachable in the running product for four days.

**This is the third instance of one family in one epic**, and the family is what makes it worth an entry rather than a fix:

| Found by          | The shape                                                           |
| ----------------- | ------------------------------------------------------------------- |
| Story 3.2's close | three implementations of an interface with **no construction site** |
| Task 3.4.3        | three implementations **constructed, and none self-driving**        |
| Task 3.4.9        | a published decision **specified and drawn, and unreachable**       |

Each is _something that exists in one layer and cannot be reached from the next_, and **every one of them had `pnpm verify` green throughout**.

**A grid is the hardest of the three to see, because it looks complete.** `LIVE-DATA.md` §11.3's `replay` row was written on 2026-09-17 and `Live in the chrome.dc.html` §03 drew it on 2026-09-19; the shipped chrome said `NOT CONFIGURED` beside its own `REPLAYING` instead. **No renderer test could fail on it**: every test, component and browser assertion renders a combination somebody named, so a row nothing can produce is not a shape any of them has.

**The construction-site audit does not catch it either**, which is the sharp part. That audit greps an export for a caller outside a test — and here the export _had_ a caller. What had no implementation was the **decision**.

**One grid is now checked.** `apps/backend/src/routes/market-feed-grid.test.ts` walks `MarketDataProviderSelection` rather than the renderings and asserts the rule §11.3 embodies — _a deployment whose chrome can say a connection word must also be able to say a feed word_ — with `pnpm break a-stream-without-a-feed-word` behind it. **The others are not**: `PROVENANCE.md`'s failure and partial states, `CHARTING.md`'s chart states, and whatever the next story publishes.

**Re-measure:** for each published state grid, take the **producers** rather than the renderers — the selections, configurations or store shapes a deployment can be in — and confirm every row is reachable from one of them, and that every reachable pair has a row. **Owner: the next story that publishes a state grid**, which is a condition rather than a story number.

**Verdict 2026-09-24 by Task 3.10.9, which published one: discharged for that grid and RE-OWNED rather than closed.** Story 3.10's nine-state grid is discharged **by construction** — every row in it was reached by driving the shipped path (a real socket close, a real `feed` frame, a real `{"feed": null}`), so a row nothing can produce could not have appeared in it. The instrument builds rows by producing them, which is this entry's re-measure performed rather than promised. **What is still unchecked is unchanged**: `CHARTING.md`'s chart states and `PROVENANCE.md`'s failure-and-partial-state tables are renderer-side grids, and the condition stands for the next story that publishes one.

**Verdict 2026-09-26 by Task 4.2.8, which published one: discharged for that grid, and the re-measure's SECOND half failed on a grid published four days earlier.** Story 4.2's sixteen-state grid for `Market proxies` is discharged **by construction** — every row was produced by driving the shipped socket path (a real `overview` frame, a real `snapshot`, a real `bars` frame, answered through `page.routeWebSocket` in the sequence the gateway uses), so a row nothing can produce could not have appeared in it.

**What the pass found is the half nobody has run before: _every reachable pair has a row_.** This entry's re-measure has two directions and only the first — _is every published row reachable_ — has ever been performed. Taking the producers here and comparing them against the **seven-row table Task 4.2.6 published four days earlier** turned up **two reachable states with no row in it**: an observed figure carrying **no measurable change** (`changePercent` omitted, which is `changeFromClose`'s documented answer when there is no previous close — the strip reads `SPY 774.03` with no percentage and the source note collapses to `COMPUTED …` alone), and **two proxies measured from different sessions**, where `sharedBasis` correctly drops the basis clause and the shared line reads `Sep 16 · 14:01 EDT` with nothing after it. Both are renderings the product produces and nothing had ever named. **A grid is incomplete far more quietly than it is wrong**, and the direction that finds it is enumerating the producers rather than reading the table.

**Re-owned rather than closed, condition unchanged**: `CHARTING.md`'s chart states and `PROVENANCE.md`'s failure-and-partial-state tables are still renderer-side grids, and the next story that publishes one inherits it — **in both directions**.

**Verdict 2026-10-10 by Task 4.8.12, which published one: discharged for that grid by construction, and the grid IS the test rather than a table beside it.** The landing screen's source note has five states — a session running, the same screen hours later with nothing heard from since, a store with bars and no provider, CI's store with 518 securities and zero bars, and a rollback that pins a gateway sending no observation instant. Every row is **produced** by `e2e/specs/overview-source-note.spec.ts` through the shipped socket path (the shipped encoder, the gateway's own connect sequence, the shipped decoder, the shipped renderer) and is read back as the string a reader is given; the grid is `console.log`'d by the run, so a row nothing can produce cannot appear in it and a row whose spelling drifts cannot stay in it. The rows were enumerated from the **producers** — what a deployment can be in — which is this entry's re-measure in both directions, and the second direction is what put the rollback row in: a new bundle meeting a gateway from a pinned previous image is a reachable pair that nothing had named.

Two residues, and the second is this entry's own shape arriving one layer down. The spec compares `innerText`, so **the grid records the uppercase the micro-label layer applies** rather than the string the module produces — deliberate, because comparing by string is only worth doing against the thing on the screen. And **the five rows collapse to four distinct strings on purpose**: two of them must be identical, because _the age does not advance when a second tab opens_ is the whole repair, so the usual _no two rows read identically_ assertion is written as `rows.length - 1`. A grid with a deliberate collision needs that said out loud, or the next person tightens it and goes red for the right reason with the wrong conclusion.

**Re-owned again, condition unchanged**: `CHARTING.md`'s chart states and `PROVENANCE.md`'s failure-and-partial-state tables are still renderer-side grids.

14. **That a tick on the universe table stays under §28's 50 ms — the duration, as opposed to the mechanism.** Added 2026-09-22 by Task 3.6.5, which found the steady state breached (46–49 ms of script per frame plus 40 ms every 30 s from the health poll re-rendering the route) and repaired it with two memo boundaries. **The mechanism is mechanical**: `UniverseTable.render-cost.test.tsx` counts the router's `Link` renders and asserts a price arriving re-renders none and a re-render with nothing changed re-renders no row — `pnpm break a-price-re-renders-every-symbol-link` proves it goes red. **The duration cannot be**: jsdom has no layout, CI's store has zero bars and no socket, and a timing on a shared runner is noise. What nothing guards is the figure itself — a change to what a live cell renders, or a third state update at `App` level, could put a tick back over the line with the render-count test green. **Re-measure (amended 2026-10-09 by Task 4.8.1 — the command below was unsafe as written).** The recipe this entry quoted puts `MARKET_DATA_PROVIDER=fixture` against whatever `DATABASE_NAME` resolves to, which since Story 3.8 (**2026-09-23**, one day after this entry was written) means Story 3.8's live bar writer **stores invented minute bars into the developer's own store**, 518 a minute, for as long as the measurement runs — the entry two screens below, _a locally-run `fixture` or `replay` backend writes synthetic bars into whatever database it is pointed at_, is the same finding reached from the other direction. Use `scripts/overview-instrument.mjs`'s `startProductionPair()`, which defaults the provider to `none` and refuses a stream against `marketpulse`; `pnpm store:bare` builds the store it names instead. The original recipe, for the record and **only with a scratch store named**: `pnpm build`, the backend on `MARKET_DATA_PROVIDER=fixture NON_LIVE_MARKET_DATA=permitted CORS_ORIGIN=http://localhost:4173 DATABASE_NAME=marketpulse_bare`, `vite preview`; open `/securities` at 1440 with a `PerformanceObserver` on `long-animation-frame` installed from an `addInitScript`; wait for two `bars` frames and read `scripts[].duration` against 50 — the invoker is `MessagePort.onmessage`, the React scheduler. The 2026-09-22 reading was 37–40 ms with all 518 rows changing; anything over 50 is a regression, and anything with more than one long animation frame per minute is a second state update to find with a counter on `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`.

15. **That a browser test asserting an ABSENCE is asserting anything at all.** Added 2026-09-25 by Task 3.11.11, from Task 3.11.1's decision 3.

    **CI has no market-data credential, deliberately**, and the reason is the thing that dates: the binding constraint is the **single connection**, not the quota. A CI credential would be a third claimant for a slot the deployment and any developer already contend for, and a runner taking it would take **production's** socket down rather than merely failing a test. **That argument stops applying the day this product leaves the free plan** — the condition to record, rather than a story number.

    **Two measured consequences, and neither is repaired by the decision:**

    - **A spec asserting an absence passes for free on a runner with no credential.** `market-feed.spec.ts` held a list of words that must never render again for **four days** after Task 3.3.5 deliberately made them real, and did not go red — because those words happen not to appear on an unconfigured deployment. **An absence assertion is only evidence where the thing could have been present.**
    - **No browser test in this epic has ever watched a real vendor frame reach a screen.** `market-connection.spec.ts` furnishes the states from inside the browser, which is the right answer for a page-level assertion and **is not the same claim**.

    **Re-measure:** grep the browser suites for `not.toBeVisible`, `toHaveCount(0)` and `not.toContain`, and for each ask whether CI's environment could produce the thing being denied. Where it could not, the assertion is documentation.

16. **That a document describing a guard is describing something that exists.** Added 2026-09-25 by Task 3.11.11, after the epic produced it twice in five days.

    `CLAUDE.md` carries the rule — _a claim about a mechanism reads identically whether the mechanism is there or not_ — and this entry is the residue it cannot mechanise. **Both instances were found by somebody going to USE the mechanism**, never by reading: `LIVE-REHEARSAL.md` claimed a completion marking in `EPIC.md` that does not exist (2026-09-21), and ADR 0030 §7b described a `deploy.yml` step that had never been written while entry 9 above quoted it as _the only preventive mechanism_ (2026-09-25, nine days standing).

    **What is guarded now**: the two that were found. `the-deploy-reads-the-provider` in `pnpm invariants` fails if the deploy stops reading the provider, and `the-epic-close-cannot-outrun-the-rehearsal-ledger` fails if the epic closes over an empty row — both break-verified.

    **What is not**: every other sentence in this repository that says something is checked. **Re-measure:** grep the ADRs and this file for present-tense mechanism claims — `fails if`, `refuses`, `asserts`, `is enforced` — and check each against the tree. Nobody has ever done this on purpose; the two known instances were accidents.

Two of these have caught real defects, so treat the list as live: a stated invariant quietly stopped being true for two stories, and a broken link shipped.

**RE-POINTED A THIRD TIME ON 2026-09-19 BY TASK 3.3.7, AND THE REASON IS NOT THE ONE ANYBODY EXPECTED.** The trigger has been _wait for a trading session_ twice and both owners were finished tasks, which is why it never fired. It is now a **command** — `node scripts/capture-u-frame.mjs`, which refuses out of hours, refuses if a local process holds the connection, and stops at the first `u`. Its handshake path was proven against the real vendor the night it was written. **But the standing blocker is not the market's hours: it is our own deployment.** The free plan allows **one** connection, the deployed backend runs `provider: alpaca`, and §9.3 chose to hold the socket **always** — so it holds it out of hours too. A clean machine with no local process connected was refused `406 connection limit exceeded` at 23:30 ET, verified with `lsof` against the resolved address. **A developer machine cannot take an Alpaca capture at all while the deployment is running, at any hour.** So the disposition is a choice somebody has to make rather than a date: stand the deployment down for the capture, take the capture **from** production by logging the frame there, or stop sharing one connection between two consumers. **Owner: Story 3.10**, which owns reconnection and is the first story that has to reason about the single connection as a contended resource rather than as a given. Re-measure: `node scripts/capture-u-frame.mjs --handshake` — a `406` means the deployment still has it.

**Re-verdicted 2026-09-25 by Task 3.11.6, and the contention is now quantified rather than asserted.** The deployment holds the slot continuously, including out of hours — `status: "live"` with `marketOpen: false` at 2026-09-25T03:13Z, which is §9.3 working. **The only window in which the slot is free is ~46 s per deploy**, and it is not free then either: the arriving replica is spending it retrying. So _a developer machine cannot take an Alpaca capture while the deployment is running, at any hour_ is **confirmed with a mechanism** rather than inferred from one `406`. The three dispositions are unchanged and the choice is still somebody's: stand the deployment down, log the frame **from** production, or stop sharing one connection between two consumers — and **the second is now cheap**, because Task 3.11.3 wired the logging that would carry it.

## `e2e/specs/` and `e2e/specs-deployed/` are two directories, and a grep over one finds neither the other's copy of a locator nor the fact that there is one

**This has now cost the same file twice, and the second time it reported a repair as a regression.**

`two-halves.spec.ts` already carried a comment about the first occasion: on 2026-09-16 the market feed and the backend service moved out of the masthead into `AppFooter`, `e2e/specs/market-feed.spec.ts` was rescoped from `banner` to `contentinfo` in the same change, and the deployed copy was missed. The deployed check caught it — after the merge, which is where it runs and what it is for.

**The second occasion, 2026-09-21.** Story 3.3 shipped `LIVE` / `STALE` / `DISCONNECTED` into that same cell on 2026-09-19. The deployed spec had a loop asserting `disconnected`, `live` and `stale` were **absent**, calling them _"the invented value"_ — written before those words existed. It did not fail, because:

- the strings in the DOM are **lower case**; the capitals a reader sees are `.microLabel`'s `text-transform`, which `feed-words.ts` states deliberately — so a reviewer comparing the shipped `LIVE` against the asserted `live` sees two different tokens; and
- **the deployed feed had never reached any of those states.** The backend's socket was crash-looping on a `406` retry, so the cell had no connection word at all.

So the assertion held only while the product was broken, and fired the moment the feed was repaired — `Expected: 0, Received: 1`, on a page that was finally correct. **An assertion that only passes while the product is broken is worse than no assertion.**

**What makes this class invisible:** the two directories share `e2e/support/` but not their specs, and nothing relates a shipped constant to a spec that names its value as a string literal. A grep for `contentinfo`, or for `live`, over the directory a person is editing returns a complete-looking answer.

**Re-measure, and it is two greps rather than one:**

```sh
# 1. A literal in the deployed suite that is also a shipped word.
grep -rnoE '"(live|stale|disconnected|healthy|degraded|unreachable)"' e2e/specs-deployed/

# 2. A role or locator that exists in both suites and agrees in neither.
grep -rhoE 'getByRole\("[a-z]+"\)' e2e/specs e2e/specs-deployed | sort | uniq -c
```

Then read each hit against `packages/shared/src/feed-status.ts` and `feed-words.ts`.

**THIRD OCCASION, 2026-09-21, and it is a new variant: the local twin could not have caught it either.**

Task 3.6.1 made the universe table's column heading read `Last` once any row holds a live price, and `Last close` otherwise — the heading is a claim about every cell under it, and during a session two cells in three are not closes. **Both** suites assert that heading, and only the deployed one went red.

**The local suite is structurally incapable of catching it.** `pnpm e2e` runs against `marketpulse_bare` — 518 securities, zero bars — and CI has **no credential and no upstream socket**, so nothing is ever live there and the heading is _always_ `Last close`. A green local run is not weak evidence here; it is **no evidence**, and it cannot become evidence until a spec drives a fixture stream.

**What made it worse than a missed grep:** the assertion was a literal for a value that depends on **whether the market is open**. It passed every CI run and failed the first time a real deployment was doing its job — which is the mirror of the second occasion, where an assertion passed only while the product was broken. **Both spellings are now matched as a shape**, in both suites, and the comment says why.

**The general rule this earns:** a deployed spec must not assert a state that depends on the market being open, the feed having delivered, or the store having been backfilled. Those are properties of _when the suite ran_, and a gate keyed on them reports the clock as a defect.

**This entry is a candidate to become mechanical and has not been made so yet.** The check that would do it — _no string literal in `e2e/specs-deployed/` asserted absent may equal a member of an exported shipped-word set_ — is a real `pnpm invariants` grep, and it owes a `pnpm break` entry. It is left as prose deliberately: the rule needs the **asserted-absent** half to be legible to a grep, and today the absence is spelled `toHaveCount(0)` several lines away from the literal. **Owner: the next story that adds a word to a status cell** — a condition, not a story number.

**Re-measure the narrower claim too:** that the deployed suite's assertions still describe a working deployment rather than a broken one. `pnpm e2e:deployed` with the feed genuinely live is the only thing that can tell, and before 2026-09-21 that had never once been true.

**FOURTH OCCASION, 2026-09-26, and it is an ABSENCE rather than a rot.** Story 4.2 put the product's first live figures on `/`, renaming that route's first region from `Market summary` to `Market proxies`. The sweep found **nothing stale** — `e2e/specs-deployed/` names no region on the landing route at all, so there was no second copy of the list to miss — and that is the finding rather than the relief. The deployed suite visits `/` three times (`two-halves.spec.ts` for the dialled origin, for the feed cell and for the axe **report**) and asserts nothing about what `main` contains, while `security-explorer-journey.spec.ts` asserts for the **other** route that every region `PRODUCT_SPEC.md` §8.3 names is present **and says something** — `expect(region).not.toBeEmpty()`, structure and no figure, which is exactly ADR 0029's rule for a deployed assertion. The landing route now has a region with a subject and no such check, which matters because the deployed store is the only one where the strip's live states occur at all: on CI every proxy is `unknown` for ever. **Re-measure:** `grep -rn "getByRole(\"region\"" e2e/specs-deployed/` and read the answer against the routes this product serves. **Owner: the next task that touches `e2e/specs-deployed/`**, which is a condition and, at the time of writing, Story 4.2's own close.

## An empty default that is also a true answer hides a design event until the day it stops being empty

`snapshot: () => new Map()` stood in `index.ts` for four days. It was **correct** — `LIVE-DATA.md` §11.1 makes an empty snapshot the true answer after a restart rather than a degraded one — and it was simultaneously the cause of the largest undesigned visual change in the product, on **every page load**: the identity block painted `NO LIVE PRICE`, then the stored figure, then the live one, three lines changing in sequence with an arrival disc firing on a security that had merely been listed.

**Nothing was wrong with the code, so nothing could have flagged it.** A placeholder indistinguishable from a legitimate runtime value **cannot be found by reading the code**, because there is nothing to find: no `TODO`, no throw, no unimplemented branch, and the construction-site audit — which greps an export for a caller outside a test — sees a seam that is wired. It surfaces only when the value stops being empty, and by then whatever was built on top of it has a behaviour nobody chose.

**Re-measure:** for each `() => new Map()`, `?? []`, `?? {}` or equivalent standing in a seam, ask **is this also a legitimate runtime value?** If yes, the surface above it has a state nobody has designed.

```sh
grep -rn "() => new Map()\|?? \[\]\|?? {}" apps/*/src --include=*.ts --include=*.tsx
```

Read each hit against the surface that consumes it rather than against the seam. **Owner: a condition** — the first story that fills a seam which has been answering with an empty default.

## The identity block being correct on first paint is guarded by nothing

The three-line flash above is gone, and **it was verified by a person watching a page load, which is still the only thing that can see it.** `pnpm verify` is green either way.

The browser suite does not assert it and cannot easily: **CI's store has 518 securities and zero bars**, and no live provider, so the identity block there is a correct `empty` with no figure to be right or wrong about.

The **mechanism** is guarded — `pnpm break the-snapshot-marks-every-security-as-arriving` proves the arrival rule, and `market-gateway.process.test.ts` proves a subscribe is answered with a `snapshot` over a real socket. What is unguarded is the **rendering consequence**: that the first frame a reader sees carries the live figure and no disc.

**Re-measure:** run the pair against a stream that has observed —

```sh
MARKET_DATA_PROVIDER=fixture NON_LIVE_MARKET_DATA=permitted pnpm dev
```

— load `/securities/NVDA` and read the **first** frame. It must say `LATEST PRICE`, carry the live figure, and show no arrival disc. **Owner: the first story whose browser suite runs against a server with live observations** — a condition rather than a story number.

## A developer's own store can make a browser spec fail as a product defect, with a screenshot

`CLAUDE.md` already says _before asserting on a number in a browser spec, ask whether CI has the data_, and ships `pnpm store:bare`. What it does not say is **the shape of the failure when you forget**, and Story 3.5 produced it.

A store ten days stale answers `5D` **empty** and `1M` **populated**. The readout strip is absent in one state and present in the other, so pressing a window button moves the chart **90 px** — and `security-window-change.spec.ts` asserts that it does not. The run fails with a screenshot showing a chart in the wrong place: it reads as a **layout defect in the product**, which is the one diagnosis that is certainly wrong.

**It was mis-diagnosed three times in one session**: first as machine load, then as a regression bisected to a specific task — on the strength of a `main` run that happened to pass — and only correctly on the third pass. **A suite that fails a different set each time looks like contention and is not**; what varies is which securities your store happens to cover.

**Re-measure:** before believing any browser failure that looks like layout or a missing figure —

```sh
pnpm store:bare
DATABASE_NAME=marketpulse_bare pnpm dev     # then run the spec against it
```

If it passes there and fails against your own store, **the store is the subject**. **Owner: a condition** — the first browser spec that asserts on a figure whose presence depends on a window having data.

**Amended 2026-09-24 by Task 3.10.7 — it happened again, the other way round, and the condition above had already fired.** `security-chart-edge.spec.ts` (Task 3.10.5) asserted a washed edge and a bar count against the deployment's own store, which is exactly _a figure whose presence depends on a window having data_. It passed here and failed on **CI**, whose store has zero bars, with the honest sentence _"No history is stored for NVDA at this timeframe"_ on screen — so this time the failure did **not** read as a layout defect, it read as a product that had stopped drawing. **And PR 461 was merged with that check red**, which is how it reached `main`. The repair is the one the entry above implies and never states: **a spec that asserts a figure serves its own answer** — `serveFeed`'s `bars` option, added by Task 3.10.7 — rather than asking a store whose contents nobody controls. Runtime fell from **12.6 s to 1.2 s**, which is the same fact seen from the other end. **Re-measure:** grep the browser suite for a spec that asserts a count, a price or a washed width without routing `BARS_ROUTE_PATTERN`.

## The bill has been read ONCE, and the one figure that moved it has n=2

Read 2026-09-25 by Task 3.11.5, the first billing reading this product has ever taken — Epic 1's attempts were refused twice. **Run rate $13.32/month against a $9.26 estimate**, of which Container Registry is a flat **$5.07** (38%, and more than the compute) and Container Apps **$8.25**.

**Two claims rest on thin evidence and both matter.**

**The socket does not appear in the bill.** Across the 2026-09-19 → 09-21 outage — forty hours disconnected — Container Apps billed `$0.2149` and `$0.2291` a day, indistinguishable from the connected days either side. That falsifies ADR 0011's premise in both its versions, and it rests on **one outage**.

**The live bar writer appears to.** Container Apps steps from `$0.2056`/day (09-11 → 09-22) to `$0.2832` and `$0.2589` on 09-23 and 09-24 — **up 32%**, on exactly the day Task 3.8.3's writer shipped. **n=2.** A step rather than a drift, which is why it is worth stating, and two days is not a measurement.

**Re-measure:** the REST call in `HOSTING.md`'s reading, `granularity: Daily`, after another week. **Take every reading in one pass** — the API answers and then returns `429`. If the 32% holds, the cost of the live session is a **database write a minute** rather than a held socket, and ADR 0011's arithmetic needs redoing from a different premise rather than amending. **Owner: Story 3.11's close**, which is the next thing that runs.

**And the largest line is not ours to reduce by tidying.** ACR Basic is a flat $5.07/month whatever it stores, so pruning images saves nothing. The named alternative is GitHub Container Registry — free for public images, already OIDC-authenticated in CI — and moving would take the run rate under the $12 trigger on its own. **Deliberately not pursued** (2026-09-25, owner's decision): it touches `deploy.yml`, the federated credential and the rollback path, none of which is an epic close's subject. **Owner: a condition — the first month the bill actually exceeds $12**, which the budget's new first alert now reports.

## ~~The browser opens a NEW market-stream socket every few seconds on an ordinary page~~ — WITHDRAWN 2026-09-25, and the instrument was the fault

**The entry that stood here was wrong**, and it is left as a heading rather than deleted because what replaced it is the more useful claim.

Task 3.10.7 measured an ordinary security page opening **three market-stream sockets in twelve seconds** and found the same on the commit before it, so it read as a defect that predated the work. It became this entry, a **floor on the gap refill**, a paragraph in `CLAUDE.md` and a task of its own.

**Two of the three were Vite's.** The counter took `page.on("websocket")` and counted every socket on the page; on a dev server the HMR connection is two of them. Re-measured 2026-09-25 with the **URLs printed beside the count**:

```text
dev        +96ms   OPEN    ws://localhost:5173/?token=…        <- Vite HMR
           +153ms  OPEN    ws://localhost:5173/?token=…        <- Vite HMR
           +308ms  closed  ws://localhost:3000/market-stream     (+333ms)
           +337ms  OPEN    ws://localhost:3000/market-stream

deployed   +1212ms OPEN    wss://…/market-stream               <- one, held
```

The open/close pair at +308 ms is **`StrictMode`'s double-invoke** — development-only, and the effect's teardown being _proved_ rather than failing. With `StrictMode` removed the dev page opens **one**. **The deployed site opens one and holds it.**

**What is now asserted mechanically**: `e2e/specs/market-stream-socket-count.spec.ts` counts sockets whose URL contains `/market-stream` and asserts the last one was never closed, with `pnpm break the-socket-count-stops-filtering` behind it.

**The claim that survives is about measurement, not about sockets.** _Count by URL, never by event_ — a browser page holds sockets that are not this product's, and a number with no URL beside it cannot tell them apart. The cost of not doing so was a suppression, two documents and a task, and **the wrong number survived four days of being quoted in commit messages and a PR body** because it was quoted rather than re-run.

**Re-measure:** `page.on("websocket")`, print `ws.url()` with every count, and compare a dev server against `pnpm e2e:deployed`. **Owner: discharged** — the spec above is the mechanical form, which is this list's own standing instruction.

## A browser that reconnects fills its gap; a BACKEND that reconnects does not, and nothing on screen tells them apart

Since Task 3.10.7 a page whose **own** socket drops asks for its series again when the feed returns, and the minutes it missed come back — because since Task 3.8.3 the store has them.

**When the BACKEND's upstream socket drops, the store has the hole too.** The refill then returns the answer it already had and the chart keeps its hole until that night's backfill. What a reader sees is identical in both cases: a chart that states its own coverage — _covers the first 780 of 990 trading minutes_ — with no account of why.

**That is deliberate and it is Task 3.10.5's decision**: a mark derived from the **connection** is neither of the two kinds `CHARTING.md` allows, the store genuinely cannot tell a dropout from a security that did not trade, and one fact has one home. What is unguarded is the claim that the **first** case is the common one: it rests on a single overnight observation (2026-09-23, the watcher's own socket closed **38 times in 4h 36m**, every one with the backend answering HTTP) and on the fact that the deployed backend's socket has its own reconnect with backoff.

**Re-measure:** during a session, read `GET /diagnostics/freshness` and the backend's log for the live writer's per-security refusal counts; a backend-side dropout shows as minutes with no rows for **every** security at once, which is the one signature that distinguishes it. **Owner: Story 3.11**, which measures the cost of holding a socket through a bad week and is the only place that will have the week.

**Fired again 2026-09-23 — and the second half of that diagnosis was wrong, which is the part worth keeping.**
Task 3.8.3's full `pnpm e2e` came back `1 failed, 141 passed` on the same spec,
the same two narrow viewports and the same 90 px. The two commands above were
run before anything was believed, and they worked: green on `marketpulse_bare`,
red on a store seven sessions stale whose `1D` answers 0 bars and `1M` answers
5,460. The change under test had touched no frontend, shared or route file and
nothing on the read path, which pointed the same way.

**All of that was true and the conclusion drawn from it was still wrong.** The
store was the _trigger_; it was not the _defect_. `Figures` returned `null` in
every state with no readable series, so the block left the layout and the
chart, the window control and everything under them moved 90 px whenever an
answer with bars replaced one without — a real defect, on any store, reachable
by any reader who presses a window a security has no bars in. It had been read
as data twice because the store is what varies between the machines that see
it. **Repaired in that task** (a hidden reservation, plus an `8ch` column on
the close so the wrap stops depending on the price's glyph count), and the spec
now passes on both store shapes.

So the entry keeps its procedure and loses its example. The rule it was written
for stands: **run the two commands before believing a browser failure.** What
this adds is the step after them — _green on bare and red on yours_ narrows the
subject to something the data reaches; **it does not establish that the product
is correct.** A layout whose height depends on the data is a defect that only
one of the two stores can show you, and it looks exactly like a store problem
from the outside.

## A migration on `market_bars` waits for as long as the longest open transaction, and every reader of that table waits behind it

**Added 2026-09-23 by Task 3.7.6, from a rehearsal rather than an argument.**
`0010` is two catalogue writes and reads no row (ADR 0034), so the figure that
matters is not its duration — it is what it waits for. `ALTER TABLE` takes an
`ACCESS EXCLUSIVE` lock, which conflicts with every other lock mode, and
Postgres queues later requests **behind** a waiting exclusive request rather
than letting them past.

Rehearsed against the local populated store (48,797,343 rows, PostgreSQL 18.6),
three sessions: A held an open transaction that had inserted into `market_bars`;
B ran the migration's statement shape; C was an ordinary reader arriving two
seconds after B.

| Session                        | Lock wanted           | Granted | Elapsed     |
| ------------------------------ | --------------------- | ------- | ----------- |
| A — a backfill batch in flight | `RowExclusiveLock`    | yes     | held 20 s   |
| B — the migration              | `AccessExclusiveLock` | **no**  | **18.16 s** |
| C — an ordinary chart read     | `AccessShareLock`     | **no**  | **16.16 s** |

C's lock does **not** conflict with A's. It waited only because B was ahead of
it in the queue, and the same read costs **0.09 s** with nothing else running —
so a migration that waits turns every `GET /market-data/bars` on the deployed
site into a stall of the same length. `pg_stat_activity` showed B and C as
`wait_event_type: Lock`, `wait_event: relation`.

**Nothing bounds that wait.** `lock_timeout` and `statement_timeout` are both
`0` on this server, and `migrate.ts` sets neither; with `lock_timeout = '3s'`
the same rehearsal failed in **3.13 s** with `canceling statement due to lock
timeout` and exit 1, and C was released as soon as B gave up. The repair was
**not shipped**, for three reasons worth reading before shipping it: the
realistic wait on this product is one `recordSeries` transaction — one session,
390 rows, **81–137 ms** measured on the populated store — so the exposure is
small; `createDatabasePool` is shared with the **serving** pool, so bounding
only the migration's lock is a new parameter on a shared factory rather than a
line; and a `SET` on a pooled connection is not reliably the connection the
migrator's DDL runs on, because `POOL_MAX` is 10. The deploy already fails
**safely** when it waits too long: `timeout 120` gives exit 124, nothing is
applied, and the code does not roll.

**Re-measure** (the rehearsal restores itself; nothing persists):

```sh
docker exec -i marketpulse-postgres-1 psql -U marketpulse -d marketpulse -At -c \
  "select current_setting('lock_timeout'), current_setting('statement_timeout');"
```

Then hold a transaction that writes to `market_bars` in one session and run
`alter table market_bars add column rehearsal text not null default 'x';` in
another inside `begin; … rollback;`, timing both, with a third session reading.

**Owner: a condition** — **the first migration on `market_bars` that is not two
catalogue writes**, or the first deploy that reports exit 124 with
`wait_event: relation`. Either makes the bound worth buying.

## `bar_coverage.feed` is written, described and read by nothing, and dropping it has no trigger

**Added 2026-09-23 by Task 3.7.6.** Task 3.7.4 withdrew the ledger's tape from
every decision and Task 3.7.5 took it off `BarCoverage`, so the column now
holds the tape a window was **opened** with and nothing reads it —
`pnpm invariants` (`stored-sources-only-through-the-merge`) fails on a select of
it, and on any module but `market-bars.ts` building a query against the table at
all. It is still **written** on every first insert, on purpose: `schema.ts`
types it required so the database default stays unreachable from shipped code.

What nothing guards is the **second half of expand-then-contract**. Dropping a
column from a live ledger is a migration nobody has decided to run, and the
usual trap applies — a column that is written but read by nothing looks
identical to a column that is load-bearing, to everyone except the person who
read this. `migrations/README.md` has the rule; this is the instance of it.

**Re-measure:**

```sh
pnpm invariants                     # the two halves above
grep -rn "bar_coverage" apps/backend/src --include=*.ts | grep -v "\.test\."
```

**Owner: a condition** — **the first migration that touches `bar_coverage` for
any other reason.** Contract it in the same change or record why not; a drop of
its own is not worth a deploy.

## Everything Story 3.7 asserts about the schema holds only on the `database` job, and a later `VALIDATE` would reach the deploy's ceiling before anything went red

**Added 2026-09-23 by Task 3.7.6, replacing the shape Task 3.7.2 predicted.**
`pnpm test:database` is **not** in `pnpm verify` and not in `pnpm test`. It is a
required check on `main` as its own CI job, so a pull request cannot merge
without it — but locally it has to be run on purpose, and nothing at the desk
notices when it is not.

What rides on it is the whole of this story's evidence: that
`market_bars_feed_check` stays **`NOT VALID`** (`pg_constraint.convalidated`
is `false`, with `pnpm break the-tape-check-gets-validated`), that every writer
stamps the tape from the series' provenance, that a second tape extends a window
and an overlapping one is refused, and that a two-tape window reads back as two
sources in order. None of it is visible to a unit test.

**The specific hazard is a later migration.** A `validate constraint
market_bars_feed_check` added to `0011` or beyond passes `tsc`, `lint`, every
unit test and `pnpm verify` untouched; the database job would catch it, and if
it ever did not, the first thing to notice would be a deploy burning its 120 s
on a full scan of the heap — ~508 s on the B1ms tier at 10 MiB/s (ADR 0034).

**Re-measure:**

```sh
pnpm test:database                                  # all of it, on purpose
pnpm break the-tape-check-gets-validated            # the one that matters most
grep -rn "validate constraint" apps/backend/migrations
```

**Owner: a condition** — **the first migration added to `market_bars` after
`0010`.** Read it for `validate`, `cluster`, a non-concurrent index or a
rewrite, and measure it against 10 MiB/s before it is written.

## Nothing counts the frames the gateway sends, so "never one per security" is a rule about a field while the frame carrying it is one per security

**Measured 2026-09-25, from the deployed gateway, by Task 4.1.6's coverage
instrument and a second one-symbol socket.** A `feed` frame goes out **per
inbound vendor item, to every attached client, unscoped by the subscription**:
median **332 a minute** during the session against **2** out of hours, three
distinct payloads in 3h48m, 30,865 consecutive frames identical. A socket
subscribed to `NVDA` alone took **310 frames in 75 seconds** at **119 bytes**
each — ~30 KB/min, ~1.8 MB/hour, ~11.6 MB a session, per browser.

**The cause is one unconditional notify.** `alpaca-stream.ts:255` calls
`apply()` inside the per-item loop; `apply` notifies `onConnectionChange`
whether or not the published view changed; `index.ts:791` answers with a
broadcast. The connection genuinely changed — `lastFrameAt` moved — so the
frame is not a lie, it is the watchdog's private bookkeeping published as the
browser's feed state.

**What made it invisible is the part worth keeping.** `sameLiveFeedView`
already collapses a feed view that has not changed, so the no-op frames cost a
browser almost no script and show no symptom. The mitigation for the symptom
was built before anybody counted the cause, and it hid the cause for a whole
epic.

**What nothing mechanical sees:** `pnpm invariants` holds `sentAt` out of
`feed-liveness.ts` and both adapters, which is ADR 0033's constraint as a
grep — but a grep cannot count frames. The ADR's fourth constraint reads _one
per frame, 36 bytes measured, never one per security_; the **field** obeys it
and the **frame** does not, and no check in this repository can tell.

**Re-measure** — during a session, against the deployed gateway, subscribing to
ONE symbol, counting `"type":"feed"` frames over 75 s. Anything above the
keepalive's rate (`KEEPALIVE_INTERVAL_MS = 120_000`, so **0.5 a minute**) is
this defect. Out of hours the measurement cannot see it: with no vendor items
arriving there is nothing to over-publish, which is why three stories of
quiet-socket rehearsals never met it.

**Owner: Story 4.7**, which has the figures, the repair (notify only when the
published view differs) and the client cost in its own file — and which must
not derive a browser-side liveness threshold from the 332, because that rate is
this defect's and disappears with it.

## The word `LIVE` survives a dead connection for 165 seconds, and no test in this repository waits for a clock

**Five documents have promised this entry since 2026-09-24 and it has never
existed** — Epics 4, 5, 10 and 13 each carry _"one unrepaired consequence,
recorded in `docs/GAPS.md`"_, and ADR 0029 points here too. Written 2026-09-25
by Task 4.1.8, with the claim corrected on the way in.

**The claim those documents make is wrong.** They say that at 390 the
distinction between _the feed stopped_ and _the market is shut_ is **below the
fold**. Measured twice — Task 3.11.8 and Task 4.1.7 — the status bar is
**sticky**, on screen at 390 at any scroll position, about four wrapped lines,
and when the feed drops it **grows to six** with `BACKEND SERVICE` reading
`UNREACHABLE` beside it. A size change that moves the page is a **stronger**
peripheral signal than a word swap.

**What is actually true is worse.** Measured on the deployed site at 390 by
removing the browser's network and sampling the status bar every five seconds:

```text
t=0s   connected: LIVE
t=20s  LIVE
…
t=160s LIVE
t=165s DISCONNECTED
```

**Exactly 165 seconds, reproducibly.** `DISCONNECTED_AFTER_MS` is the monotonic
watchdog — _no inbound frame of any kind_ — and it governs the browser's view as
well as the backend's. The socket closing does not flip the word: the client
detects that immediately and uses it only to start reconnecting.

**So nobody fails to notice the fold, because for two minutes forty-five seconds
there is nothing to notice.**

### What nothing mechanical can see, which is why this is an entry

**Every liveness test in this repository injects the state rather than waiting
for the clock**, which is correct — a test that waits 165 s is a test nobody
runs — and it means the _duration_ is asserted nowhere. The nine degraded states
of Task 3.10.9 were all produced, and each was produced by making the state
true, not by letting it become true.

**And the second half is a person**: whether a reader notices a four-line strip
growing to six, at the bottom of a phone, while reading a figure at the top.
That is unanswerable from a DOM.

### The number was derived for a different socket

165 s comes from **Alpaca's upstream heartbeat** — 53.96–54.85 s across 82
intervals — and protects against flapping during a deploy, measured at ~46 s of
feed outage. Both facts are about the **backend's** connection to its vendor.
The browser's own socket has a different floor: the gateway's keepalive is
`KEEPALIVE_INTERVAL_MS = 120_000`. **A browser could know its gateway socket is
dead well before 165 s and still not cry wolf on a 46-second deploy.**

> **Do not tune it from here.** ADR 0036's rule is that the two-clock shape is
> the durable half and the numbers are **dated observations that get
> re-derived**. A browser-side threshold is a third number and needs its own
> derivation — and it must be re-derived **together with** the feed-frame defect
> recorded above, because repairing that changes a browser's routine inbound
> rate from ~332 frames a minute to one every two minutes.

**Re-measure** — open the deployed site at 390, take the network away, and time
the word. Five seconds of sampling; 165 s of waiting.

**Owner: Story 4.7**, which owns the overview's degraded set and has the four
alternatives priced in its own file — today's 165 s, a shorter browser-side
threshold, retries-failing-for-N, or the socket closing. The **person's** half
is owed under an owner and a condition: the owner, the next session they are
awake for with a phone to hand.

## The overview's closes lookup takes a session and ignores it, so the aggregate reads the LATEST closes whatever instant it is asked about

**Added 2026-09-26 (Task 4.2.4), the moment the production lookup was written
and not before.** Task 4.2.3 built `buildMarketOverview` with a
`closesAsOf: (session: MarketDate) => …` parameter and supplied no
implementation; while there was no implementation there was no claim to guard.
There is one now, in `apps/backend/src/last-closes-cache.ts`, and it is a claim
about a **mechanism** — so it owes something mechanical, which is what this
entry is instead of.

**What the shape says and what the code does.** `market-overview.ts` converts
its `asOf` to a market date with `marketDateAt` and passes it to the lookup —
_the replay seam, in one line_, in its own words. The cache takes that argument,
compares it against the session it last loaded **for**, and returns the closes
it holds. Those closes are `readLastCloses("1d")`'s answer: **the latest daily
bar per security in the store**, with no `observed_at` bound at all.

**Correct live, and future information under a replay.** During a session the
latest stored close _is_ the close as of today, so the two answers coincide and
nothing on any screen is wrong. Replaying 2026-03-04 would measure every proxy's
change against **September's** close — a well-formed, correctly-coloured,
completely fictional number, which is the failure class this repository keeps
naming: not a crash, not a blank, a plausible figure.

**Why the parameter exists anyway.** ADR 0015's gap 4 — _the temporal seam holds
only while no unplugged handle is exported_ — and invariant 4's requirement that
temporal isolation be structural. The question is asked in the shape Epic 13
needs so that its plugin changes **one implementation** rather than hunting a
call site with no way to ask. `market-overview.ts`'s own note says so and names
the plugin's author directly.

**What is mechanical, and what it cannot see.** `pnpm invariants` holds
`one-producer-of-the-overview-aggregate` — the aggregate has **at most one**
call site in shipped backend code — so there is exactly one place a replay clock
has to reach, and a second one fails the build. That is the half that can be
checked. What nothing can check is that the lookup **honours** the session it is
given: an implementation that ignores its argument and one that respects it are
indistinguishable to every test in this repository, because there is no replay
to run them under.

**Re-measure** —
`grep -n "session" apps/backend/src/last-closes-cache.ts`. The lookup honours
its argument the day `readLastCloses` grows an `asOf` bound and that bound is
passed; until then the function's body uses `session` only to decide **when to
refresh**, never **what to return**, and this entry stands.

**Owner: Epic 13's temporal plugin**, by condition rather than by story number:
**the first caller of `closesAsOf` whose `asOf` is not the wall clock.**

### And the same absent bound has a second consequence, today rather than under a replay

**Added 2026-09-26 after review, in the same entry because it is the same
missing `observed_at`.** The cache records `loadedFor` — the session it was
**asked about** — against whatever the unbounded read returned. So a refresh
running **after midnight ET and before the nightly backfill** reads yesterday's
closes, stamps today's date on them, and can never fire again that day, because
`session !== loadedFor` is false for the rest of it. Every proxy's change is
then measured across **two** sessions: a well-formed, correctly-coloured, wrong
number.

**Not repaired, and the reason is that the correct condition needs a fact
nothing here asserts.** It is _the newest close we hold is older than the newest
close that should exist_, and the right-hand side is the backfill's timing — the
store holds the **previous** session during a live session and today's after the
nightly run. Every cheaper condition becomes a poll: retrying whenever a read
did not advance is one 518-row query a minute for the whole of every weekend,
because a Sunday has no new close to find.

**What was done instead is to make the window observable.** A refresh whose
newest session did not move is logged by name —
`last closes refreshed and the newest session did not move` — so the state is
visible in production rather than inferred from a wrong percentage.

**Corrected 2026-09-26 at Story 4.2's close — the trigger below could not fire
in the case it was written for, and the instrument has two holes.** Found by the
coherence review, not by running anything.

**The trigger was wrong.** It read _the first deployment where
`GET /diagnostics/freshness` reports the store a session behind **after 09:30
ET**, which is … the only circumstance in which this window is reachable._ It is
not. `backfill.yml` runs at **21:00 UTC (17:00 ET, before midnight ET)** and
again at **08:00 UTC (04:00 ET)**. The window opens when the **evening** run
fails and a refresh happens before the catch-up repairs the store — and the
04:00 ET run then succeeds, so freshness is **clean** at 09:30 while the cache
holds a two-session-old denominator for the rest of the day. As written the
trigger fires only when **both** runs fail, which is strictly narrower than the
defect.

**The instrument has two holes, and the second is the one that makes the
re-measure misleading.**

- **A restart inside the window is silent for a whole session.** The warning is
  suppressed on the first load (`loadedFor !== undefined`), so a deploy at
  01:00 ET after a failed evening backfill loads D−2 closes, stamps D, never
  warns, never refreshes again that day, and leaves freshness clean after 04:00.
- **It fires harmlessly twice a week.** `newest === newestHeld` is true every
  weekend and every holiday — the first connect on a Sunday asks for Sunday and
  the read returns Friday's closes unchanged. So _has it ever fired_ is not the
  question the log can answer. **That is the same Sunday asymmetry the code cites
  as its reason for refusing a polling condition**, and the warning has the
  identical property.

**And one divergence this entry did not name.** `readLastCloses` now has **two
readers with different freshness**: `GET /securities` reads it **per request**,
while the aggregate reads a 60 s-backoff cache refreshed on a date comparison. In
the window above the universe table's SPY change is right and the strip's is
wrong, from one fact through two paths. Not on one screen today — **it will be
when Story 4.4's breadth counts 518 securities off the cache.**

**Re-measure** —
`grep -n "the newest session did not move" apps/backend/src/last-closes-cache.ts`
for the instrument. **Do not read the deployed log for whether it has fired**:
it fires every weekend. Read it for a firing on a **weekday between 00:00 and
09:30 ET**, which is the only signal that means anything, and remember a restart
inside the window produces none.

**Reversal trigger, as a condition — restated:** the first deployment where the
**evening** backfill run fails, or `GET /diagnostics/freshness` reports the store
a session behind **at any hour between 00:00 and 09:30 ET**. Both are evidence
the window is open; neither requires the catch-up run to have failed as well.

## ~~The focus ring is clipped by exactly `--focus-width + --focus-offset` at both sticky edges, on every route~~ — DISCHARGED 2026-10-08

**Added 2026-09-26 (Task 4.2.5's verification, transcribed here by Task 4.2.8).
Not this story's to repair — it is a `base.css` fact affecting every screen.**

> **Discharged 2026-10-08 by Task 4.6.1, and kept rather than deleted because
> three of its four findings are what the repair was built from.** The entry was
> **right about the mechanism and short by one pixel about the quantity.** What
> was found on measuring it:
>
> 1. **There were TWO sites and this entry named one.** `base.css`'s two
>    declarations, and `UniverseTable`'s `jumpToBand`, which subtracted the
>    chrome exactly and then focused — the same deficit by the mechanism
>    `scroll-padding` cannot reach, and the flow that carries `Collapse all`,
>    _the real skip link_. The entry that records `scrollTo`'s immunity to
>    `scroll-padding` is **three entries up this file** and nobody connected
>    them. The subtraction now has one home, `stickyChromeClearance()`.
> 1. **The deficit is 5 px and only 4 of them are the ring's.** Measured at
>    three reservations (chrome + 0, + 1, + 2 px) × four viewports × both
>    directions: Chromium lands a focus target **one whole pixel inside its own
>    `scroll-padding` edge**, exactly and linearly, with every box edge and both
>    chrome edges reading integers. So the cure named here —
>    `calc(chrome + --focus-width + --focus-offset)` — leaves one pixel of a
>    two-pixel outline behind the chrome, which is half the ring's thickness
>    along the edge it is clipped on. The shipped reservation has a third term,
>    `--scroll-overshoot`, with that measurement beside it in `tokens.css`. The
>    `top=56` against `57` recorded below is that pixel.
> 1. **The re-measure's own warning was correct and load-bearing**: a forward
>    walk alone is green against a broken `scroll-padding-bottom`, because
>    sequential focus navigation brings a target to the nearest edge. Both
>    directions at 1440, **1024** (added — the footer's wrap state there was not
>    in the record), 768 and 390 are now
>    `e2e/specs/overview-focus-ring.spec.ts`, which reads the tolerance from
>    `:root` and collects every offender rather than failing on the first.
> 1. **And this entry was invisible to the spec that walked for it, which is
>    the part worth carrying forward.** `search-keyboard.spec.ts` compared the
>    **border box** against the chrome's edge — the same quantity the
>    declaration reserved — so the check and the defect agreed with each other.
>    Reproduced before repairing: that predicate is **green at -4.00 px of ring
>    clearance** at all four widths, transcript `8 passed (6.8s)`. A check
>    written against the thing being reserved cannot see a reservation that is
>    short.
>
> Mechanised as `one-subtraction-for-the-sticky-chrome` in `pnpm invariants`,
> with `pnpm break the-top-reservation-forgets-the-ring` and
> `pnpm break the-bottom-reservation-is-a-typed-length`. **What remains
> un-mechanised is the figure**: the clearances are a browser's, so
> `overview-focus-ring.spec.ts` is the only thing that can read them, and its
> `0.00` worst case at every width is a Chromium-at-`dpr: 1` measurement rather
> than a law. **Re-measure:** run that spec; a clearance of `+1` everywhere
> means an engine that does not overshoot and `--scroll-overshoot` should go.

`scroll-padding-top` and `scroll-padding-bottom` read the published chrome
heights **exactly** — 57/33 at 1440, 57/53 at 768, **94/73 at 390** — with no
slack, while `--focus-width: 2px` and `--focus-offset: 2px` put the ring **4 px
outside the border box**. So any region the browser scrolls flush against a
sticky edge has its ring clipped by the chrome or by the status bar.

Measured on `/` during the 4.2.5 walk: `Sector performance` at 768 landed at
`top=56` against a masthead bottom of 57 — **5 px of ring behind the chrome**;
`Movers` at 390 the same; `Market topology` at 390 landed at `bottom=708`
against a footer top of 707. `Market proxies` is unaffected at every width,
being the first region in `main`.

**The 2026-09-11 repair works and is under-provisioned by exactly the ring's own
geometry.** Those stops were whole-element occlusions before it and are a ring
edge now. The cure is one line —
`calc(var(--sticky-chrome-height, 0px) + var(--focus-width) + var(--focus-offset))`
— and it belongs beside `CLAUDE.md`'s sticky-edge record with its own
`pnpm break`.

**Nothing below `pnpm e2e` can see it**: jsdom computes no layout, axe reads
zero violations throughout, and `search-keyboard.spec.ts` asserts that no _stop_
lands behind the chrome, which is true.

**Re-measure:** a Tab **and a Shift+Tab** walk of `/` at 1440, 768 and 390,
reading each focused element's box against `--sticky-chrome-height` and
`--sticky-footer-height`. **The reverse walk is the one that finds it**; a
forward walk alone does not.

**Owner: its own task, on the story that next touches `base.css`'s scroll
padding** — a condition rather than a story number.

## `AppHeader`'s descriptor renders at 11px/16px against a declared 9px/1, and the 201 px measurement that decided what wraps at 390 was taken against it

**Added 2026-09-26 (Task 4.2.6, transcribed here by Task 4.2.8). Shipping
today, on every route.** Found by sweeping all 37 CSS modules for the
`composes`-cascade shape the proxy strip hit, and **proven from the built bundle
rather than argued**:

```text
apps/frontend/src/components/AppHeader/AppHeader.module.css:91
  .descriptor { composes: microLabel from "../../styles/type.module.css";
                line-height: 1; font-size: 9px; }

dist/assets/index-*.css
  offset  4759  ._descriptor_…{color:…;margin:0;font-size:9px;line-height:1}
  offset 42523  ._microLabel_…{font-size:var(--font-size-micro);line-height:var(--line-height-micro);…}
```

Equal specificity, `microLabel` later in the sheet, so **`microLabel` wins** —
`composes` concatenates class names and does **not** cascade, so a declaration
written under it loses to the composed stylesheet's own.

**Why it matters beyond a font size.** This is the element
`AppHeader.module.css`'s own comment calls _"the longest string in the chrome —
201px at 1440"_, in the argument that decided **what wraps at 390**. That
measurement was taken against an element rendering larger than its stylesheet
says, so the wrap decision rests on a figure whose provenance is now in doubt.

**Nothing asserts a font size anywhere in this product**, and no test, axe run
or screenshot comparison of the existing states can see it — the strip's version
of this defect was invisible for a day for the same reason, and only became
visible when a rule that had only ever held digits was given a **word**.

**Re-measure:** `pnpm build`, then read `dist/assets/index-*.css` for
`_descriptor_` and `_microLabel_` and compare their offsets — the later one
wins. Or measure `.descriptor`'s computed `font-size` in a browser against the
9px the source declares.

**Owner: its own task** — it is a chrome change on every route, and the 201 px
re-measure travels with it.

## `security-gap-fill.spec.ts`'s `the chart is never blanked or covered while the gap is filled` fails on `main` about one time in eight, and nothing records it

**Added 2026-09-26 (measured by Task 4.2.6, transcribed here by Task 4.2.8).**
`e2e/specs/security-gap-fill.spec.ts:165` — the test is named here as well as
numbered, because a line number rots and this entry has to survive an edit above
it.

**14 failures in 120 executions of that test on `main` (≈12%)**, established
while proving that Task 4.2.6 had **not** regressed it: three consecutive runs
on one unchanged checkout gave `48 passed`, then 5, 5 and 3 failures, and the
branch commit that contains **no code at all** — one line of Markdown — failed
2 of 12.

The assertion is
`expect(panels.filter((count) => count > 0)).toHaveLength(0)` — **no pending
panel appears while the refill runs** — which is Story 3.9's promise that _a
refill is quiet_, against ADR 0028's measured **160 ms** cover threshold.
**Neither number is a tuning knob and neither may be relaxed to make this
green.**

**The mechanism is a hypothesis, not a measurement**, and is recorded as such:
the failing page's snapshot contains the **full 518-row universe table**,
because `/securities/:symbol` renders the Explorer shell — and this document
already records that every cold load of that route spends one main-thread task
of **50–76 ms**, that it is the table rather than the chart, and that it is
**Epic 14's by name**. A 160 ms threshold sitting on top of a documented
50–76 ms task that lands at a variable moment is a plausible source of a ~12%
flake. **Nobody has measured where the 160 ms actually goes.**

> **Amended 2026-10-09 by Task 4.8.8 — the hypothesis now rests on a TASK
> nobody can observe, which makes it weaker rather than wrong.** The unit moved:
> on 40 interleaved cold loads of `/securities` the cost is **one frame over the
> line on 10 of 10 loads, 62.8–77.4 ms** (script 26–31, style/layout/paint
> 34–38), and the `longtask` channel reports **nothing** where 2026-09-22 read
> 50–56 ms on 7 of 10. So _a documented 50–76 ms **task** that lands at a
> variable moment_ describes something no instrument currently sees, and a
> 34–38 ms render half spread across a frame is a different arrival profile
> against a 160 ms threshold than a single task is. **The breach is unchanged;
> the mechanism this entry proposes for the flake is now one step further from
> being measured.** Whoever takes the re-measure above must use **all three**
> channels and prove each with a plant, or the arm that reports zero will look
> proved. **Owner unchanged, and the figure is handed to Task 4.8.9**, which
> characterises this story's flakes on a settled machine.

> **Amended 2026-10-10 by Task 4.8.9 — MEASURED, and the mechanism this entry
> proposes is not the mechanism. The assertion named above cannot see the thing
> it is believed to watch for.** Characterised at n = 96 on one checkout, with a
> wait loop holding the load ratio under 0.75 before every arm: **1 / 24 at
> `--workers=1` (4.2%)** against **12 / 48 at `--workers=4` (25.0%, Wilson 95%
> CI 13.6–39.6%)** — four workers being Playwright's own default on 8 cores and
> therefore the condition the suite runs in. **The flake is real and
> load-dependent at a 6× rate.**
>
> **Three structural findings, and together they retire the 160 ms hypothesis
> rather than weakening it further.** (1) **`Fetching` exists nowhere in the
> product** — `grep -rn "Fetching" apps/frontend/src apps/backend/src
packages/shared/src`, excluding tests and stories, exits 1. (2) **ADR 0028's
> cover has no text**: `ChartPending` is, in full,
> `<div aria-hidden="true" className={styles.pending} />`, so `getByText()`
> cannot see it, and `BarSeriesPanel`'s other pending state says
> **`Reading the series…`**, matching neither alternative. (3) **What the
> predicate does match is the Explorer shell's own first load, and there are
> exactly two of them**, which is why all 13 failures read `Received array: [2]`
> and never `[1]` or `[3]` — measured verbatim against the running pair at
> t = 150–200 ms: `p "Loading securities. Anything typed is kept and will match
as soon as they arrive."` (`SecuritySearch`) and `p "Loading the tracked
universe…"` (`UniverseTable`).
>
> **So the test fails when `GET /securities` has not finished arriving by the
> time the sampling loop opens.** This entry named the right culprit — _it is
> the table rather than the chart_ — through the wrong route: not a main-thread
> task delaying the refill past a threshold, but the table's **own** pending
> sentence being counted by an assertion written about the chart's. Nothing
> about ADR 0028's 160 ms, Story 3.9's _a refill is quiet_, or the cold-load
> frame is implicated, and **the owner clause below is discharged by that
> rather than satisfied by it**: there is no 160 ms to account for here.
>
> **And 13 of 13 failures are line 219, 0 of 13 line 220** — where the spec's
> own comment states the 14/120 were _"every one of them the final assertion —
> the line never grew within the window"_, the basis on which `f2463d3` (Task
> 4.3.8) doubled the sampling loop to 30 s. Either the mode moved when the
> window doubled, which is the generous reading and means the raise worked, or
> the comment was wrong when written. **What is certain is that the rate did
> not fall**: 12% published, 25% measured after the raise under the suite's own
> worker count.
>
> **The repair is a separate decision and was deliberately not taken.** It is
> small and it is somebody's to own: the predicate is wrong about its subject.

**Re-measure:**
`pnpm e2e security-gap-fill.spec.ts -g "never blanked" --repeat-each=24
--workers=4`, with the load ratio under 0.75 before the arm, counting failures
**per execution** and **reading the line number of each failure**. n = 24 at
4 workers separates 25% from 4% and **cannot** separate 4% from 17%; a
`--repeat-each=6` is worthless at any rate in this range.

**Owner: a condition rather than a story number — the first task that touches
this spec's predicate.** The old clause, _the first task that measures where
the security page's refill spends its 160 ms_, is retired: Task 4.8.9 measured
that this flake does not go through the refill at all. **Epic 14 still owes the
cold-load frame**, which is its own entry.

> **REPAIRED 2026-10-10 by Task 4.8.13 — and the assertion then found a real
> cover, which is the part worth reading.** The owner clause above fired and is
> discharged.
>
> **What it now counts.** `covers()` in the spec counts two things by identity
> and nothing by text: `ChartPending` by the CSS-module class it owns
> (`[class*="_pending_"]`, which is **one** class in the whole built
> stylesheet, `_pending_xij4y_17`, and is rendered by both plots), and
> `BarSeriesPanel`'s `Reading the series…` — the second because `seen` cannot
> see a panel **replaced** rather than covered: `priceLine` returns the longest
> path on the page, so with the plot gone it returns a chrome icon's `d`,
> non-empty and changed, which breaks the loop and **passes**. The window was
> deliberately **not** widened.
>
> **The old predicate would have passed on the defect it exists to catch.**
> Proved rather than argued, with a throwaway spec that delayed every
> `GET /market-data/bars` by 3 s and pressed `1M`, i.e. produced ADR 0028's
> cover on purpose, verbatim:
>
> ```text
> PLANT — repaired predicate counted 2; the old text predicate counted 0
> ```
>
> `2`, because both plots draw the cover. So the broken predicate was not only
> failing wrongly 25% of the time; against a page that genuinely **was**
> covered it read zero.
>
> **The rate, at four workers, pooled over three takes differing only in what
> the failure PRINTS: 8 / 144 = 5.6% (Wilson 95% CI 2.8–10.6%)**, against
> 12 / 48 = 25.0% (CI 13.6–39.6%) before. **The two intervals do not overlap.**
> At `--workers=1`: **0 / 24 (CI 0–13.8%)**. Load either side of every arm,
> ratio under 0.75 before each; the machine ran 5.0–5.9 before and 11.2–13.2
> after, which is the browser suite being its own plant.
>
> **And the 5.6% residual is a DIFFERENT finding from the 25%: it is a real
> cover, and it is a PRODUCT defect rather than an instrument one.** Every
> failure, identically:
>
> ```text
> Error: a cover was drawn over a plot during a refill nobody asked for
>     + Array [
>     +   "sample 0: ChartPending over Price",
>     +   "sample 0: ChartPending over Volume",
>     + ]
> ```
>
> **`sample 0`, both plots, never a later sample, and 0 of 24 at one worker.**
> The page has already drawn the short series — `before` is non-empty and the
> spoken sentence carries the short count — so the only request that can be in
> flight when the loop opens is the **refill**, and ADR 0028's 160 ms cover is
> being drawn over it. That is precisely what this test exists to forbid:
> _nobody asked for the refill, so it must not look like a wait_ — a socket
> that blinked 38 times in 4h 36m on 2026-09-22 must not pulse a panel over the
> chart 38 times. **It is reachable in production**: any refill whose answer
> takes over 160 ms draws it, and the suite's four workers are only one way of
> making an answer slow.
>
> **Routed to the developer, not repaired here** — Task 4.8.13's brief permits
> no product code. What is unknown is whether the refill path is marked
> `loading` in the state machine at all, or whether a second request
> (`withLiveEdge`'s, the resume's) is what `usePendingPanel` is seeing;
> `held-series.ts` and `use-pending-panel.ts` are where that is decided.
> **Neither ADR 0028's 160 ms nor the sampling window may be relaxed to make
> this green.**
>
> **Re-measure:** `pnpm e2e security-gap-fill.spec.ts --repeat-each=48
--workers=4`, load ratio under 0.75 before the arm, counting failures per
> **execution** and reading the **sample index** in each failure. A failure at
> `sample 0` is this defect; a failure at a later sample is a new one; a
> failure naming `Reading the series…` is the panel being replaced rather than
> covered. **n = 48 at four workers separates 25% from 5.6% and cannot separate
> 5.6% from 0%.**
>
> **Owner: the first task that may change `apps/frontend/src/market/` or
> `use-pending-panel.ts`.**

## `security-feed-degraded.spec.ts`'s `killing the feed leaves the page exactly as it was` compares a live page against a baseline taken before the kill

**Added 2026-09-26 (diagnosed by Task 4.2.7, transcribed here by Task 4.2.8).
The same class as the entry above and it is worth naming as a class: a
byte-identical-text assertion over a page that is still settling.**

`e2e/specs/security-feed-degraded.spec.ts:141` captures `main`'s whole text —
`const before = await main.innerText()` — and after `feed.drop()` asserts
`expect(after).toBe(before)`. That is criterion 3 and it is the right assertion:
§36's hardest promise is that a degradation changes **nothing** outside the
chrome. What makes it flaky is that the baseline is a **snapshot of a page that
has more than one thing in flight**: any sentence still resolving at that
instant — a pending panel, a live region being filled, a figure arriving from a
request the spec did not serve — is baked into `before` and cannot survive into
`after`, and the test then fails on the page having _finished loading_ rather
than on the outage having changed anything.

**The spec already carries one repair of exactly this shape and it is not
general.** A comment above the capture records that waiting only for the
chrome's `live` word let a `before` miss a figure the `after` had, so the spec
now waits for the snapshot's price to be on the page first. That fixed the one
surface somebody thought of. The class is _everything else that is still
arriving_, and the landing route is about to make the class bigger: `/` now has
an aggregate, a strip, a source note and six deferrals settling together.

~~**Not repaired here**, because the repair is a decision rather than a patch —
either the assertion narrows to the surfaces the outage could plausibly reach
(and stops being criterion 3's whole-page claim), or the page is driven to a
quiescent state that nothing currently defines.~~

> **REPAIR ATTEMPTED 2026-10-07 by Task 4.3.8 — and it is REASONED RATHER THAN
> PROVEN, which is stated first because the opposite claim would be the more
> comfortable one.** The second option was taken: the page is now driven to a
> quiescent state, and the state is DEFINED. The definition
> is deliberately not a list of things to wait for — it is **_the text stopped
> changing_**: `settledText()` reads `main`, reads it again, and accepts the
> value only when two consecutive reads agree. A page with anything still
> arriving fails that and is polled again; a quiet page passes on the second
> read.
>
> **Criterion 3 is not narrowed.** The assertion is still `after === before` over
> the whole of `main`, which is §36's hardest promise and the reason the first
> option was refused — narrowing it would have traded a flaky true claim for a
> reliable weaker one.
>
> **What forced the repair was the fourth sighting, and it broke `main` rather
> than a branch**: `verify` failed on the merge of PR #506 and **`deploy` was
> skipped**, so the flake stopped being noise and started gating releases. The
> sentence that did it was the chart's `A newer answer is on its way.` — **a bar
> series request the spec never served and had no reason to name**, which is
> precisely why the previous repair (wait for the snapshot's price) was
> insufficient: it fixed the one surface somebody thought of, and this entry
> said so at the time.
>
> **The lesson worth keeping is about the shape of the first repair.** Waiting
> for a _specific_ thing to appear is a fix for one instance of the class;
> waiting for _change to stop_ is a fix for the class. The first reads as more
> precise and is strictly weaker.
>
> **What was actually established, and what was not.** The repaired spec ran
> **24/24 green** on the target test and **six full-file runs of 54 executions
> each**, with one failure whose test was not captured. Then the helper was
> **deliberately broken** — made to return the first read instead of requiring
> two to agree — and it **also passed 24/24**. So the break did not go red, and
> **this machine cannot tell the repair from a quiet afternoon**: every one of
> the four sightings was under load, which is CI's ordinary state and a
> developer's rarest. `CLAUDE.md`'s rule applies to this entry's own repair — _a
> break that does not go red is not evidence the check works_ — and here the
> break demonstrably landed, so what it proves is that **the condition does not
> occur on an idle machine**, not that the repair is sound.
>
> **Why it was shipped anyway, argued rather than assumed:** waiting for _change
> to stop_ strictly dominates waiting for _one string to appear_ — it cannot
> admit a baseline the old code would have rejected, and it rejects baselines the
> old code accepted. It cannot make the flake more likely. **The proving ground
> is CI under load, and the next full run on `main` is the measurement.** If it
> fails there again, this entry is wrong and the first option — narrowing
> criterion 3 — is what remains.
>
> **Still true, and the reason this entry is amended rather than deleted**: a
> green run of this spec certifies that the page did not change across an
> outage, **not** that it had finished arriving before the baseline — those are
> now the same thing only because `settledText` makes them so, and that helper is
> the single point where it could regress.

**Seen a THIRD time on 2026-09-27**, on CI, against a branch whose entire diff
was comment lines and planning Markdown — filtering the one source file's diff to
non-comment lines returned nothing, so the runtime tree was behaviourally
identical to `main`. It passed on a re-run of the same commit with no change.
**The baseline that failed contained `A newer answer is on its way`**, which is a
pending state: direct confirmation of the mechanism above rather than a
restatement of it. Cost: one round trip and a re-run the operator had to
authorise. **Three sightings, all three under load, none reproduced on an idle
machine** — which is the pattern the re-measure below is written to catch, and it
now has a fourth data point saying the load correlation is not a coincidence.

**Re-measure:** `pnpm e2e e2e/specs/security-feed-degraded.spec.ts
--repeat-each=6`, four times on one settled checkout, counting failures **per
execution**. Run it on a **loaded** machine as well as an idle one: all four
occasions this was seen were under load, which is CI's ordinary state and a
developer's rarest. **To prove the repair rather than the weather, break
`settledText` first** — return the first read instead of requiring two to agree —
and confirm the flake comes back under load. A repair to a 12% flake that is only
ever observed passing has not been distinguished from a quiet afternoon.

**Owner: the same condition as the entry above** — the first task that measures
where a degraded page's remaining work goes, taken once for both.

## Every open tab on every route now re-renders up to sixteen times a minute, and only `/` has an owner

**Added 2026-09-26 at Story 4.2's close, by the coherence review.** Not a defect
in itself — the decision is recorded and its error direction is the safe one —
but the consequence is unmeasured on four of the five routes and unowned on all
four.

> **COUNTED 2026-10-09 by Task 4.8.2, on all five routes, against the real
> gateway. The heading's figure is right for three routes and half of it for
> the other two.** Renders per **applied batch**: **2** on `/`, `/securities`
> and `/securities/:symbol`; **1** on `/investigations`, `/replay` and the
> not-found route, which the gateway sends no `bars` frame at all because
> `scopedTo` returns `undefined` for an empty subscription. At the real
> cadence — 6.8–16.1 applied batches a minute, `LIVE-DATA.md` §9.5/§10.2 —
> that is **13.6–32.2** whole-tree renders a minute on the three subscribing
> routes and **6.8–16.1** on the three placeholders. The sentence below is
> wrong twice and is corrected in place. **What is NOT discharged is the
> timing**: this was a count, and the `Re-measure:` line below asks for a
> script cost. Tasks 4.8.3 and 4.8.5 own that.

`useLiveFeed` is called in `App`, so **every** route holds the live feed. The
overview frame's `overview` field is compared in `sameLiveFeedView` **by
identity**, and the decoder builds a new object per frame — and `computedAt`
moves on every rebuild, so two consecutive aggregates are never byte-identical
and the gate **cannot** collapse them by construction. That was accepted
deliberately: a deep comparison would have to be told to ignore part of the
answer, and over-eager renders are the safe direction against the silent miss
`sameLiveFeedView`'s own comment records.

~~**The consequence: a security page subscribed to one symbol went from about
one whole-tree render a minute to up to sixteen.**~~ — **WRONG TWICE, measured
2026-10-09 by Task 4.8.2.** A security page subscribes to **all 518**, not one:
`SecurityExplorer`'s `liveSymbols` adds every security in the loaded universe
because `UniverseTable` renders on both of its routes, and the `subscribe`
message was read with the shipped decoder at the gateway's end — **1 then 518**
on both `/securities` and `/securities/:symbol`, against **25** on `/` and
**0** on the three placeholders. So that page already received a `bars` frame
per applied batch **before** Story 4.2, and the aggregate added **one more
render per batch rather than fifteen**: 1 → **2**, measured over four real
batches from the real gateway. And _one a minute_ was the **fixture's** cadence
(`createFixtureStream`'s `tickEveryMs = 60_000`), not the feed's. The honest
sentence is **6.8–16.1 → 13.6–32.2 whole-tree renders a minute**. That is still
the same category as the 40 ms-every-30-s health-poll re-render Task 3.6.5
found and repaired with two memo boundaries — `PRODUCT_SPEC.md` §28's
**routine** word, not the once-per-visit cold load Epic 14 owns.

**And the two frames of a batch are TWO tasks, so the second render is not
avoided by browser batching.** A 60 ms block planted in a listener on every
market-stream frame produced **two `longtask` entries of 60 ms** and one
`long-animation-frame` of 122–130.7 ms: `longtask` is per task, LoAF spans
every task in one rendering frame, so a verdict read off LoAF alone says _one
120 ms task_ and is wrong. Whether React coalesces the two `setView` calls into
one commit is decided by the **inter-frame gap** — 0.5 ms commits once, ≥4.4 ms
commits twice — and the real gateway's gap is **4.4–8.4 ms on `/`** (a 1.8 KiB
`bars` frame) and **23.7–33.1 ms on `/securities/:symbol`** (58–59 KiB).

~~**Story 4.8 owns the per-tick cost of `/`. Nothing owns `/securities`,
`/securities/:symbol`, `/investigations` or `/replay`**, and the last two are
placeholders today, which is exactly why this will be discovered late.~~ —
**false since 2026-09-27**, when Story 4.8's scope was widened to all five
routes, and discharged for the **count** on 2026-10-09. The placeholder routes
were measured and deliberately **not repaired** (the owner's Gate 1 decision):
the repair is a second notification channel reachable from below `App`, within
a hair of ADR 0023's recorded reversal trigger, and on those three routes the
whole-tree render changed `<main>`'s text **by not one byte** in 10 windows
each — so the waste is real and its size is a timing nobody has taken yet.

~~The byte cost is not the issue and is recorded for completeness: 431 bytes
measured × ~16 a minute ≈ **6.9 KiB/min per attached browser**, about 12% on top
of a 518-subscribed client and roughly **3× the inbound bytes of a one-symbol
security page**.~~ — **every figure in that sentence is wrong, re-taken
2026-10-09 by Tasks 4.8.3 and 4.8.4.** The `431 bytes` is the **four-proxy**
frame of 2026-09-26 (ADR 0038's verbatim record, which now carries a dated
amendment saying so); the frame has since gained eleven sectors, breadth and ten
mover rows. Measured off the wire: **928 B** in CI's shape (518 `unknown`),
**2,042 B** with 518 closes held and nothing observed, **3,142 B** with all 518
observed on the session basis, and **4,078 B** on the **observed** basis, which
is the ceiling — corroborated at **3,990–4,002 B** by a frame built in a browser
with the shipped encoder and the shipped **unrounded** percentage. So:

- **27.1 KiB/min** at the measured midday floor of 6.8 batches a minute and
  **64.1 KiB/min** at the close's 16.1, per attached browser — four to nine
  times the withdrawn figure.
- **6.9% on top of a 518-subscribed client**, not 12%. That client's `bars`
  frame is **58,187–59,475 B per batch** (Task 4.8.2), and the 12% was computed
  against `56.9 KiB` **a minute** — the fixture's one-batch-a-minute cadence,
  which is premise 2 of this story's Gate 1 appearing inside an arithmetic.
- **The one-symbol comparison has no subject.** `/securities/:symbol`
  subscribes to all 518 (Task 4.8.2, read off the `subscribe` message), so no
  page in this product receives one symbol's bars. The comparison that does
  exist is on `/`: at ~25 subscribed the `bars` frame is **~3,000 B**, so the
  aggregate is **1.4× the `bars` frame beside it** and **the larger half of
  what the route receives** — 7.1 KiB a batch, 48–114 KiB a minute.

**Re-measure** — `pnpm instrument:prove` for the harness, then a page on `/`
with the frame's bytes read off the page's own socket wrapper by URL. The
figure moves with the **number of securities heard from in the window**, not
with anything in the code: it is 928 B on CI's store for ever.

**Re-measure** — a production build, `/securities/:symbol` open with the feed
running, and the frame's script cost per tick against §28's 50 ms **routine**
line. Task 3.6.5's instrument is the shape; its figures (46–49 ms a tick before
two memo boundaries, 37–40 ms after) are the comparison.

~~**Owner: a condition rather than a story number — the first story that
measures a per-tick cost on any route other than `/`.** Story 4.8 is the first
candidate and its scope is `/` only, so if it takes this it is widening
deliberately.~~ — **the condition FIRED on 2026-09-27**, twelve days before
anybody read this clause: Story 4.8's scope was widened to all five routes that
day, and the clause went on describing a scope the story had already left.
**Amended 2026-10-09 by Task 4.8.2**, which took the count on all five.

**Owner now: Task 4.8.5** for the per-tick **script** cost on
`/securities/:symbol`, which is the half of this entry a count cannot answer,
and **Task 4.8.3** for the backend leg. The instrument exists and is proved:
`scripts/overview-instrument.mjs`, driven as `pnpm instrument:prove`. The
re-measure above is sound in substance but **its recipe is not** — see entry
14's 2026-10-09 amendment: `MARKET_DATA_PROVIDER=fixture` against
`DATABASE_NAME=marketpulse` writes invented bars into the developer's own store
at 518 a minute. Name a scratch store; `pnpm store:bare` builds one.

## The closes cache's two-session window can now RE-ORDER a ranking, not only skew a percentage

**Added 2026-10-07 by Task 4.3.8 — an amendment in consequence to the closes-lookup
entry above rather than a sibling of it.** The mechanism is unchanged and is
documented there: the overview's `closesAsOf` takes a session and reads the latest
closes whatever instant it is asked about.

**What changed on 2026-09-27 is who reads the result.** When that entry was written,
a stale close skewed **a percentage on one of four proxy cells** — a wrong figure,
visible as a wrong figure, in a strip where each cell stands alone. Story 4.3 feeds
the same lookup to **eleven sectors that are then RANKED against each other**, and a
ranking is a comparison: a close that is one session stale for **one** sector does
not merely make that row's figure wrong, **it moves that row past rows whose figures
are right**. The defect stops being local to a cell and becomes a property of the
list.

**Three consequences worth stating, because none is obvious from the entry above:**

1. **The error is not bounded by the stale row.** A sector displaced by one position
   displaces another in the opposite direction, so one stale close produces **two
   wrong rank positions** and neither row says anything is wrong.
2. **It survives every guard this story shipped.** The permutation assertion
   (`a-figure-lands-on-the-wrong-row`) catches a figure landing on the wrong **row**;
   this is the right figure on the right row, computed from the wrong **basis**.
   `one-home-for-the-live-change` is satisfied — the division happened in the one
   permitted place, with a stale input.
3. **The displayed basis would not disagree.** A `stored` figure carries its session
   and an `observed` one carries the shared basis line, so a reader comparing the
   footer against the row finds them consistent. **The two agree and are both
   derived from the same stale read.**

**Why it is not repaired here**: the repair is the one named in the entry above —
make the lookup honour the session it is handed — and it is the same repair for both
readers. This entry exists so that whoever takes it knows the blast radius is now a
**ranking** rather than a figure, which changes how it should be tested.

**Re-measure:** with the pair running, serve an overview frame whose sectors span a
day boundary — `pnpm store:bare` then a seeded store, or a replay across a session
edge — and compare the rendered order against `rankSectorFigures` run over the same
figures with the correct per-session closes. **The order, not the figures.**

> **Amended 2026-10-08 by Task 4.5.8 — the blast radius is larger at a top-N,
> and NEITHER of this story's two independent instruments can see it.**
>
> At eleven sectors a stale close skews one row's figure and can swap it with
> a neighbour. **At a top-N over 503 one stale close produces TWO wrong
> positions** — a name drawn that should not be there, and a name displaced
> that should be — and the displaced one is simply **absent**, which is the
> failure mode a reader cannot detect by looking, because an absence has no
> row to be wrong in.
>
> **And it is structurally invisible to the checking Story 4.5 built**, which
> is the part worth recording rather than the arithmetic. On the **session**
> basis `overview-movers-ranking.spec.ts` filters `GET /securities` to **the
> session the frame names** — a guard it inherited from the breadth spec for a
> good reason — so **both sides then read the same stale close and agree**. On
> the **observed** basis the producer's closes cache and the route's table are
> two reads of one store, so a divergence is a race rather than a defect an
> instrument can separate.
>
> So this entry is not closed by Story 4.5's independent sources; it is
> **widened** by them. The re-measure above still applies, with the movers
> lists in place of the sector roster.

## Two sectors displaying an identical figure are ordered by a value nobody can see

**Added 2026-10-07 by Task 4.3.8.** The comparator's no-swap rule is keyed on the
**displayed** figure — two moves equal at `PERCENT_DISPLAY_DECIMALS` return `0`, so
the input order survives a stable sort. That is deliberate and it is what stops the
drawn order contradicting the drawn figures.

**The consequence is that the tie is broken by something invisible.** Two sectors
both reading `+0.40%` are ordered by whichever arrived first in `SECTORS`' declared
order, and **a reader comparing the two rows has no information that would explain
why one is above the other.** They are not equal — one is `0.3999999999999999` and
the other `0.40000000000000013` — but the screen says they are.

**This is correct behaviour and the alternative is worse**: ordering by the
undisplayed precision would make the list re-order on a difference no reader can
see, which is the frame-max defect in a different costume. It is recorded because it
is a **claim the screen makes that it cannot support** — adjacency implies an
ordering, and here the ordering is real but unreadable.

**Nothing mechanical can guard it**, because the honest version is the shipped one.
What would change the disposition is a reader asking why two equal figures are
ordered — at which point the answer is either a tie-break the screen _can_ show
(volume, name) or an explicit statement that ties hold their declared order.

**Re-measure:** render two sectors whose moves differ below the second decimal and
confirm they do not swap on a tick — `packages/shared/src/sector-ranking.test.ts`
holds that pair as a fixture with a comment saying it is the rule's own proof.

## Nothing checks that the sector ladder's ratchet has exactly ONE holder, and two holders would draw two scales with every figure still correct

**Added 2026-09-27 by Task 4.3.4.** The bar's stepped ladder — `±1 / ±2 / ±5 / ±10%`,
smallest rung containing all eleven, stepping **outward only within a session** and
reset at the bell — is **state with a session lifetime**, held by exactly one
`createSectorLadderRatchet()` in `apps/backend/src/index.ts`. The arithmetic is pure
in `packages/shared/src/sector-ladder.ts` and holds no `let`; the one mutable
binding is the backend module's.

**A second holder anywhere would produce two rungs**, and because the ratchet only
ever steps **outward** the divergence is **permanent for the session** rather than
self-correcting. Every figure on screen would still be right, every test would
pass, and the only symptom is two bars of different lengths for the same
percentage — which is invisible unless both are on screen at once, and they never
are.

**This is `one-producer-of-the-overview-aggregate`'s shape for a new symbol**, and
it was not made mechanical here because that is a second check and a second break
beyond the task's brief. Today there is one holder beside the one producer, and the
producer's own invariant is what keeps them together: a second aggregate call site
is refused, and a ratchet is only useful beside one.

**Owner: the first change that adds a second stateful holder to the overview
producer** — a breadth ratchet, a movers scale, or anything else with a session
lifetime. At that point the check is worth generalising over _holders_ rather than
writing twice.

**Re-measure:** `grep -rn "createSectorLadderRatchet" apps/backend/src --include=*.ts`
and confirm exactly one call outside the module's own tests.

## No gated machine has ever seen a sector figure, and CI cannot ever see one

**Added 2026-09-27 by Task 4.3.4.** The same shape as Story 4.2's proxy entry and
worth stating separately because the set is eleven rather than four and the
consequences are wider.

**CI's store is 518 securities and zero bars**, so on every gated run all eleven
sector figures are `unknown`, for ever. Which means:

- **`sessionChangePercent` never occurs there.** A stored figure's close-to-close
  move needs a store with closes, so Gate 1's decision 2 — the thing that makes the
  region honest outside a session — is exercised by **unit tests only**.
- **The ladder is `±1` for ever on CI**, because `fitSectorLadder` over eleven
  absent keys has nothing to fit. The ratchet's stepping-outward behaviour and its
  reset at the bell are proved in unit tests and by nothing a browser has run.
- **The comparator's keyed branches are unreached.** The all-eleven-`unknown` case
  is the one combination CI _does_ prove, and it is the one that needs proving
  least: it asserts the declared `SECTORS` order, which is the input order.

**What this does NOT undermine**: the absent-key rule is the branch CI exercises, so
the defect that would place an unheard-from sector among the genuinely flat ones is
the one thing a gated run does cover.

**Owner: Task 4.3.5**, which puts the region on screen and is the first thing that
can produce a keyed figure in a browser — and `LIVE-REHEARSAL.md` for the rest,
because a ranking that is _correct_ and a ranking that _reads_ correctly are
different claims and only a person can take the second.

**Re-measure:** `pnpm store:bare`, then `DATABASE_NAME=marketpulse_bare pnpm dev`,
and read `/`'s overview frame — every sector figure should be `unknown` and
`sectorLadderStep` should be 1.

## The sequenced pair is bounded by measurement and read by nobody

**Added 2026-09-27 by Task 4.3.6.** The sector list's two events — a figure
arriving and a position changing — are separated in **time**: one
`--motion-duration-settle` of stillness, then one of travel. `pnpm invariants`
holds the **mechanism** (`the-settle-is-one-token-twice` — the same token in both
positions, no timer, no `transitionend`, no Web Animations API), and
`overview-sector-order.spec.ts` holds the **outcome** in both motion preferences,
paired.

**What neither can say is whether it reads as two events.** Every measurement
behind the decision bounds the **stimulus** — `LIVE-DATA.md` §7.4's 243 ms p50
intra-minute spread over n=445, the 900 ms decay, the 480 ms gesture inside 60 s
of stillness — and **none of them reads the reading**. A DOM cannot answer it, a
timing cannot, a screenshot cannot, and an agent cannot: it is the epic's fourth
design test, in front of a real session.

**Two further things a green run does not certify here**, both of them
structural rather than neglected:

- **No gated machine has ever seen this list re-order against a real feed.** CI's
  store is 518 securities and zero bars, so every sector figure there is
  `unknown` for ever and no rank exists to change. The browser spec **serves its
  own frames** for exactly that reason, which makes it a proof about the
  treatment and not about the data.
- **A replay cannot stand in for the session.** `replay-bar-source.ts` emits one
  slice per minute across every symbol, so a replay returns _one frame, 0 ms
  spread_ 100% of the time at any speed, and every observation in it shares one
  `startsAt` — the split minute the treatment is designed against is **absent
  from the data structure**. A replay certifies the wiring and never the loop.

**Owner: a person, in front of a live session** — the reversal trigger is a
condition and is phrased as what would be **reported** rather than what would be
measured: _the first sitting in which a person reports the sector region as
flashing or refreshing rather than as facts arriving._ If it fires, **the lever
is the disc, not the motion**, and the anti-lever is named: never slow the
movement down.

**Re-measure:** `pnpm e2e overview-sector-order.spec.ts` for the mechanism, and
`LIVE-REHEARSAL.md`'s next sitting for the reading — with the adjacent-rank gap
distribution per minute, which is Task 4.3.8's and is the number the _whole list
does not re-arrange_ half of the argument actually rests on.

## ~~Nothing forbids a SECOND comparator over a figure's move~~ — discharged 2026-10-08

**Replaced by `pnpm invariants`' `one-comparator-for-the-order-of-a-move`** (Task
4.5.2, three clauses, two `pnpm break` entries) — which is keyed on two moves
either side of one operator rather than on `.sort(`, so none of this entry's
three recorded false starts applies. The argument, the measured populations and
the transcript of `docs/GAPS.md`'s own candidate clause reporting
`45 invariants hold.` against the file the next story would write are in the
check's own comment.

## A second browser-suite flake source, and this one is a test sitting at two-thirds of its own timeout

**Added 2026-09-28 by Task 4.3.7.** `security-gap-fill.spec.ts` has been the known
flake at **~12% per execution** since 2026-09-26. There is a second, and it has a
different mechanism worth naming separately, because the cure is different too.

**`e2e/specs/securities-route.spec.ts:855` — _a query that matches nothing …_ —
failed a full-suite run with `Test timeout of 30000ms exceeded`.** Scoped and
re-run `--repeat-each=6`: **6 passed**, at **19.8 / 19.9 / 19.9 / 20.0 / 11.3 /
11.6 seconds** against a **30 s** ceiling.

**So it is not flaky in the usual sense — it is a test that takes two-thirds of its
timeout when the machine is quiet, and has nothing left when the machine is not.**
Under full-suite load the same work crosses 30 s. That is a headroom problem rather
than a race, and it will get worse every time the suite grows: **the failure arrives
in whichever spec happens to be running when the runner is busiest**, which is why
it reads as random.

**Note the bimodality in the six samples** — four at ~20 s and two at ~11.5 s — which
says the run itself has two paths, and nobody has established which. That is where
a repair would start.

**Why it is not repaired here.** Task 4.3.7 renders no part of that route, and a
timeout ceiling is a suite-wide decision rather than a spec's: raising it hides the
headroom problem, and lowering the work needs somebody who owns that spec's
subject. Attributing it to a change with no mechanism is the failure this file
already warns about twice.

**Owner: the first task that touches `securities-route.spec.ts` or the browser
suite's timeouts** — and, ahead of that, anyone diagnosing a full-suite failure
should check this entry **before** attributing one to their branch. Two known
sources now compound: at ~12% and at a load-dependent ceiling, **a clean full run is
not the common case**, and `CLAUDE.md`'s rule stands — count failures per
**execution**, and run the branch commit that contains no code before calling
anything a regression.

> **Amended 2026-10-10 by Task 4.8.9 — re-measured at n = 48, and the margin is
> twice what this entry publishes. Still a margin, still load-dependent, no
> longer two-thirds of the ceiling.** With the load ratio held under 0.75 before
> each arm: **24 / 24 passed at `--workers=1` in 7.2–10.9 s** (median 8.0) and
> **24 / 24 passed at `--workers=4` in 11.2–14.5 s** (median 13.5), where this
> entry records 19.8–20.0 s for the same test. **Like for like** — both figures
> are Playwright list-reporter durations — so the comparison stands and the
> margin has roughly halved.
>
> **But the _two-thirds of its own timeout_ framing does not stand, and neither
> would a figure of mine phrased that way.** On the three settled full-suite
> runs below, Playwright reported **35.2 s, 36.2 s and 37.8 s for tests it
> marked PASSED**, against a default per-test timeout of 30 s that
> `playwright.config.ts` does not raise and three failures that say
> `Test timeout of 30000ms exceeded` in as many words. **So the reported
> duration is not the quantity the 30 s governs** — fixture setup and teardown
> outside the timed body is the obvious candidate and is unverified — and **no
> percentage-of-ceiling may be quoted from a reported duration until somebody
> establishes the relationship between the two.** What a reported duration is
> good for is comparing itself across arms, which is what the figures above do.
>
> **The load sensitivity is confirmed and is the mechanism**: 1 → 4 workers
> costs a **1.7×** stretch, so _a test that has nothing left when the machine is
> not quiet_ is the right account of the shape. Crossing 30 s from 13.5 s needs
> a further **2.2×**, which is roughly this machine against the one Task 4.8.12
> ran on at load 34.28.
>
> **The bimodality this entry names does not reproduce.** 24 consecutive
> samples span 7.2–10.9 s with no second cluster, where the six behind _"four
> at ~20 s and two at ~11.5 s"_ suggested two paths. So _nobody has established
> which_ is now _there is no sign of a second one at n = 24_.
>
> **The halving is not attributed.** The spec has changed since 2026-09-28 —
> `aa6f88b` (Task 4.6.6) is the most recent commit to touch it — and this task
> did not rebuild the old commit, which `CLAUDE.md` says is the only thing that
> tells a figure that moved from a figure that was mis-recorded.

**Re-measure:** `pnpm e2e securities-route.spec.ts -g "matches nothing"
--repeat-each=24 --workers=1`, then again at `--workers=4`, with the load ratio
under 0.75 before each arm. Read the **durations** rather than the verdict: the
number that matters is the margin against 30,000 ms and the **ratio between the
two arms**, which is what says whether the headroom is shrinking.

## A THIRD flake, and this one is inside `pnpm verify` rather than the browser suite

**Added 2026-10-07 by Task 4.3.8.** The two characterised flakes are both in
`pnpm e2e`. This one is in **`pnpm test:process`**, which is a `verify` step — so
unlike the other two it can fail the **required** gate without a browser being
involved at all.

**`apps/backend/src/market-gateway.process.test.ts` — _a slow browser is dropped
rather than tolerated › leaves a HEALTHY client on the same process untouched_**,
failing `expected +0 to be 1` at line 567.

**Characterised rather than attributed**: **6/6 green** running
`pnpm --filter @marketpulse/backend test:process` alone, green on the repeat
`pnpm verify`, and **1 failure in 2 loaded full runs**. So the signature is the
same family as the other two — **it fails under load and not in isolation** — but
the mechanism is unexamined, and a test about **dropping a slow client** is
exactly the kind that would be sensitive to a machine that is already slow.

**Nothing was attributed to it and nothing was repaired.** The change in flight
touched `e2e/specs/` and `scripts/breaks.mjs`; this test is in the backend. Saying
so is the point — `CLAUDE.md`'s rule is to run the branch commit that contains no
code before calling anything a regression, and the cheaper version of that rule is
to notice when your diff cannot reach the file that failed.

**Why it matters more than its rate suggests.** Three known flakes now compound
across a merge: ~12% on `security-gap-fill`, a load-dependent 30 s ceiling on
`securities-route`, and this one. **A clean full run is not the common case**, and
the failure mode is a real green change being read as broken — which has now cost
one re-run, one diagnosis and one blocked deploy.

> **Amended 2026-10-10 by Task 4.8.9 — MEASURED at n = 96 across four arms, and
> the rate runs 0% → 79% monotonically in load. The mechanism is no longer
> unexamined.** With the load ratio held under 0.75 before each quiet arm, and a
> stated plant of 16 `node` processes spinning on `Math.sqrt` (two per core,
> load average 4.5 → 78.5 within 45 s, `pgrep -f` confirming `0` left
> afterwards):
>
> | arm                               | n   | failures | rate      |
> | --------------------------------- | --- | -------- | --------- |
> | scoped `-t`, quiet                | 24  | **0**    | 0%        |
> | whole `test:process` step, quiet  | 24  | **0**    | 0%        |
> | scoped `-t`, **LOADED**           | 24  | **5**    | **20.8%** |
> | whole `test:process` step, LOADED | 24  | **19**   | **79.2%** |
>
> **All 24 failures are identical** — `expected +0 to be 1` at line 567, so
> **both** clients dropped every time, which is the mode the test's own comment
> says it exists to catch.
>
> **Task 4.8.11's hypothesis is confirmed and promoted to a measurement.** It
> predicted load dependence from loopback backpressure in a shared process: the
> healthy client is served over the same loopback as the slow one, and on a
> machine that cannot drain it its own `bufferedAmount` crosses
> `MAX_BUFFERED_BYTES` (1 MiB, ~18 universe payloads) before the publish loop
> notices the slow one has gone. **It predicted a load dependence and the load
> dependence is there, 0 → 79%.** The test body is self-contained — `attach()`
> per `it` — so the quiet arms are not passing for a scoping reason.
>
> **What the quiet whole-step arm buys is the answer to the question this entry
> actually raises**: 24 executions of the real `verify` step, 12.5 s each,
> **44 passed every time**. `test:process` is trustworthy on a settled machine
> and is not on a saturated one, and the red it produces there is on a required
> check with nothing wrong. **Not repaired here**, and the repair is a decision
> rather than a tuning: either the publish loop drains the healthy client
> between batches, or the threshold stops being a count of unread payloads.

**Re-measure:** `pnpm --filter @marketpulse/backend test:process` ×24 with the
load ratio under 0.75, then ×24 again under a stated CPU plant, counting
failures **per execution**. The quiet arm is the one that says whether `verify`
is trustworthy; the planted arm is the one that says this is the machine rather
than the code. ×6 separates neither.

## A settled machine does not produce a clean browser suite, and the 30 s ceiling is a SUITE-WIDE margin rather than one spec's

**Added 2026-10-10 by Task 4.8.9, and it falsifies the reading Story 4.9 was
handed.** That hand-off recorded three whole-suite runs failing 3 / 5 / 7 at a
load average of 23–33 and concluded _"on this evidence it is the second"_ — the
machine rather than the suite. **Three runs on a settled machine say it is
both.**

| run | load before (1 min, 8 cores) | result                 | failed                                                                                                                 |
| --- | ---------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | **5.31** (ratio 0.66)        | `1 failed, 231 passed` | `securities-route:232` axe 1280x480 — **timeout**                                                                      |
| 2   | **5.74** (ratio 0.72)        | `1 failed, 231 passed` | `security-holiday-week:217` listener — **timeout**                                                                     |
| 3   | **4.35** (ratio 0.54)        | `3 failed, 229 passed` | `securities-route:281` and `:310` axe — **timeouts**; `security-gap-fill:165` — **assertion**, the entry above's flake |

**The sets are disjoint again, and 0 of 3 runs was clean.** Five failures in
three settled runs against eight in three saturated ones (Task 4.8.12, load
34.28) — fewer, and the same order of magnitude. **A clean full run is still
not the common case, and a settled machine is not the cure.**

**Why, and this is the part that generalises: the browser suite is its own
plant.** A run begun at load **5.31** left the machine at **31.04**; run 2
began at 5.74 and ended at 31.86. Four concurrent Chromium processes on 8 cores
_is_ the load, so settling the machine beforehand buys the first minute of a
five-minute run and nothing after it. **Two corollaries.** Any `uptime` read
_during_ a suite run is measuring the suite — which is most of Task 4.8.12's
34.28, and means that reading cannot be attributed to the VM beside it. And
Task 4.8.1's ceiling is right to read the load **at the top** and would be
meaningless read anywhere else.

**And the margin is a family, not a spec.** `docs/GAPS.md` names
`securities-route:883` as _a test sitting at two-thirds of its own timeout_;
that test ran at **8.5 / 13.4 / <12 s** across these three runs and is nowhere
near the front. Ranked by worst reported duration over the three runs, the
tests at the front are:

| test                                                 | run 1      | run 2      | run 3      |
| ---------------------------------------------------- | ---------- | ---------- | ---------- |
| `securities-route:281` open result surface, axe      | 23.2 s     | 26.7 s     | **48.7 s** |
| `security-holiday-week:217` what a listener is told  | 16.1 s     | **47.4 s** | 29.8 s     |
| `securities-route:232` loaded universe axe, 1280x480 | **45.7 s** | 30.4 s     | 25.0 s     |
| `securities-route:310` nothing has a close, axe      | 22.2 s     | 36.2 s     | **1.0 m**  |
| `security-explorer-shell:175` shell axe, 640px       | 15.1 s     | **37.8 s** | < 12 s     |
| `securities-route:232` loaded universe axe, 1280x560 | 17.4 s     | **35.2 s** | 23.6 s     |
| `security-price-chart:909` volume plot, alt text     | 24.5 s     | **31.1 s** | 14.1 s     |
| `securities-route:106` universe from the real pair   | 16.7 s     | 16.9 s     | **24.9 s** |

**Six of the eight are axe runs over a surface holding the 518-row universe**,
and that is the whole shape of it: every disjoint set anybody has recorded is a
draw from this family, and **which member crosses depends on which worker was
busiest**, which is exactly why it reads as random and why the failing set is
never the same twice.

**This changes what a repair would be.** Not a spec's own work and not a per-spec
timeout: either axe stops being run over 518 rows at four viewports, or the
suite's ceiling is a decision taken once for the family. **Both are owner
decisions and neither was taken here.**

> **The first of the two was taken 2026-10-10 by Task 4.8.13, at the owner's
> decision: axe stops being run over 518 rows, except once.** Nine axe passes —
> the three `securities-route` viewports, the open result surface, the
> no-closes surface, the no-matches sentence, and the Explorer shell's three
> widths — are served a **trimmed** universe through
> `e2e/support/universe.ts`. One pass keeps all 518 rows: `securities-route`'s
> _the tracked universe renders from the real pair_, which is also the one test
> that installs **no route at all** and therefore could not have been trimmed
> anyway.
>
> **The argument is about what axe measures.** Its findings are per **rule**
> and per **element kind**, not per element, so 518 rows of one shape exercise
> the same rules as 27 of the same shapes. What 518 rows uniquely test is
> **duration** — `pnpm probe`'s job and Epic 14's, not axe's. The trim is a
> **sample, not a slice**: a head slice of twenty symbols would have dropped
> the market-proxies group, ten of eleven sector bands and both ETF kinds, so
> it keeps every ETF, one equity per sector, and `NVDA`/`AAPL` by name —
> **27 rows**. `expectTrimmed()` fences it: an interception that silently
> misses would otherwise be an untrimmed slow pass under a trimmed label, which
> is `SECURITIES_ROUTE_PATTERN`'s own recorded failure mode, and it caught that
> on its first run (three Explorer-shell passes red at ~700 ms with
> `served.length` of 0, because `Price` is visible long before
> `GET /securities` is answered — the fence now polls).
>
> **The prize, measured rather than asserted.** `pnpm e2e
securities-route.spec.ts security-explorer-shell.spec.ts --workers=4`, same
> command, same machine, load 4.3–4.9 before and 5.2–7.2 after:
>
> | pass                                     | before    | after      |
> | ---------------------------------------- | --------- | ---------- |
> | loaded universe axe, 1280x720            | 8.2 s     | **1.6 s**  |
> | loaded universe axe, 1280x560            | 7.4 s     | **1.2 s**  |
> | loaded universe axe, 1280x480            | 7.2 s     | **1.3 s**  |
> | open result surface, axe                 | 7.3 s     | **1.4 s**  |
> | result surface, nothing has a close, axe | 7.3 s     | **1.3 s**  |
> | a query that matches nothing, axe        | 7.2 s     | **1.3 s**  |
> | Explorer shell axe, 1440px               | 7.7 s     | **1.6 s**  |
> | Explorer shell axe, 1024px               | 8.4 s     | **1.9 s**  |
> | Explorer shell axe, 640px                | 7.3 s     | **1.9 s**  |
> | **the kept FULL 518-row pass**           | **8.7 s** | **9.9 s**  |
> | the two files, 29 tests, wall clock      | **1.2 m** | **35.3 s** |
>
> Nine passes, **68.0 s → 13.5 s**, an 80% cut; the kept full pass is
> unchanged, as it must be. **These are scoped figures and are not comparable
> with the 15–49 s above**, which were taken inside a full suite run where four
> Chromium workers are the load — scoped, a test has the machine to itself,
> which is this entry's own finding. What the trim does to the **in-suite**
> figures is read off a `pnpm e2e` run rather than this table.
>
> **What is still not taken is the second half: the suite's ceiling.** The
> family is smaller, not gone, and the instrument caveat below still bounds
> every figure here.
>
> **And the IN-SUITE reading, which is the one this entry is actually about —
> three settled `pnpm e2e` runs, load read BEFORE each.** Against this entry's
> own three runs of the same morning, which were **0 of 3 clean** at
> 4.8 / 5.4 / 6.2 m with 1 / 1 / 3 failures:
>
> | run | load before       | load after | result                        | failed                                     |
> | --- | ----------------- | ---------- | ----------------------------- | ------------------------------------------ |
> | 1   | **5.32** (r 0.66) | 28.71      | `232 passed (3.1m)`           | —                                          |
> | 2   | **5.98** (r 0.75) | 27.39      | `1 failed, 231 passed (3.0m)` | `overview-nothing-to-open:545` — assertion |
> | 3   | **5.99** (r 0.75) | 25.21      | `232 passed (3.2m)`           | —                                          |
>
> **2 of 3 clean, and the wall clock is 3.0–3.2 m against 4.8–6.2 m.** No
> failure in any of the three was a **timeout**, where the earlier three
> produced five between them and four of those five were axe over 518 rows.
> **Nothing from the ceiling family appeared at all.** The one failure is a
> different shape — an assertion reading an empty ranked list — and is its own
> entry below; it passed **12 / 12** when re-run scoped, and `n = 3` separates
> nothing, which is said rather than glossed. **The suite is still its own
> plant**: every run began at ~5.3–6.0 and ended at 25–29.

## `overview-nothing-to-open.spec.ts`'s `the UN-PINNABLE hold state is reached by keyboard` read an EMPTY ranked list once in three settled full runs

**Added 2026-10-10 by Task 4.8.13, which saw it in its own gate. A sighting,
not a rate** — `CLAUDE.md`'s rule applies: n = 3 separates nothing.

```text
Error: expect(received).toEqual(expected) // deep equality
- Array [ "XLK", "XLC", "XLY", "XLI", "XLF", "XLV", "XLB", "XLP", "XLE" ]
+ Array []
 ❯ e2e/specs/overview-nothing-to-open.spec.ts:581:35
```

**Eleven expected tickers, zero received, at 1.2 s** — so the ranked `<ol>` was
not on the page when the assertion ran, rather than ranked wrongly. **12 / 12
on an immediate scoped re-run** at `--repeat-each=12 --workers=4`.

**Why it is worth an entry rather than a shrug.** This spec is one of the two
this file names as **immune** to the empty-ranked-list trap, because it
**furnishes its own frame** — see _a sector-list keyboard assertion written
against the real gateway is vacuous on the gate_, two entries up. The immunity
is from CI's store, not from a race: a furnished frame still has to arrive,
render and be read, and under four workers it evidently sometimes has not. So
the mechanism that makes the assertion meaningful on a gated machine does not
make it synchronous, and **`Array []` is the shape a vacuous assertion would
also have** — here it failed loudly only because this one compares against a
literal list. A sibling phrased as `toHaveCount(0)` would have passed.

**It is not reachable from Task 4.8.13's changes**: the only importers of
`e2e/support/universe.ts` are `securities-route.spec.ts` and
`security-explorer-shell.spec.ts`, and this spec routes its own socket.

**Re-measure:** `pnpm e2e overview-nothing-to-open.spec.ts -g "UN-PINNABLE hold
state is reached by keyboard" --repeat-each=24 --workers=4`, load ratio under
0.75 before the arm, counting failures per **execution**. If it is 0 / 24, the
arm that reaches it is `pnpm e2e` whole — which is the suite being its own
plant, and is expensive.

**Owner: Story 4.9, beside its `pnpm e2e` ×3 arm**, which is the only place in
the epic already paying for whole-suite executions.

**One instrument caveat that bounds everything above.** Playwright reported
**35.2 s, 36.2 s and 37.8 s for tests it marked PASSED**, against a default
30 s per-test timeout that `playwright.config.ts` does not raise, while the
failures read `Test timeout of 30000ms exceeded`. **So a reported duration is
not the quantity the ceiling governs** — fixture setup and teardown outside the
timed body is the obvious candidate and nobody has verified it. The durations
above are comparable with each other and with this file's other reported
durations; **they must not be turned into a percentage of 30 s** until that
relationship is established.

**Re-measure:** `pnpm e2e` ×3 with the load ratio under 0.75 **before each
run**, recording the load either side, the failed set, and every reported
duration over 12 s. Read the sets for **disjointness** rather than the counts
for a total: three disjoint singletons and one triple is the signature of a
ceiling family, and three identical sets would be a regression.

## The search surface's axe passes judge whichever ten rows ONE hard-coded query happens to match — and typing a different letter finds a real contrast violation today

**Added 2026-10-10 by Task 4.8.13, which found it by accident while measuring
something else, and it is a product defect rather than a suite one.**

`securities-route.spec.ts`'s two result-surface axe passes type **`he`** and
judge whatever the universe answers with. Change that one letter to **`a`** and
the same gate goes red, verbatim, from `axe-core` on the **full, untrimmed
518-row universe**:

```text
color-contrast
  target: #_r_0_-option-0 > ._change_s4mm0_178 > ._positive_wso9y_23._change_wso9y_6._dataCell_1yxhk_82
  Element has insufficient color contrast of 4.32 (foreground color: #0f7b50,
  background color: #e7e8ef, font size: 9.8pt (13px), font weight: normal).
  Expected contrast ratio of 4.5:1
```

**Four arms, one variable at a time** — the trimmed and the full universe
behave identically, which is what makes this a product finding and not a
cost of Task 4.8.13's trim:

| population    | query | options | violations             |
| ------------- | ----- | ------- | ---------------------- |
| trimmed, 27   | `a`   | 10      | **1 `color-contrast`** |
| trimmed, 27   | `he`  | 1       | none                   |
| **full, 518** | `a`   | 10      | **1 `color-contrast`** |
| **full, 518** | `he`  | 10      | none                   |

**The node is the FIRST option — the active descendant — and the ink is
`--price-up` on the active option's ground.** So any query whose top result has
a **positive** change fails, and on a live market that is roughly half of them.
`he` passes because the first of its ten results happens not to be up, which is
a fact about one laptop's store on one afternoon.

**This is the shape `securities-route.spec.ts:310`'s own comment already warns
about in as many words** — _"An accident is not a check. If CI ever gains bars,
the run above stops covering this and nothing says so."_ — written about a
different state on the same surface. It was right, and the same surface has a
second instance of it.

**Two things are owed and neither is this task's to take.** The **ink** is a
measured accessibility floor failing at 4.32:1 against 1.4.3's 4.5 for 13 px
text, which is `VISUAL-LANGUAGE.md`'s standing-exception procedure (adopt the
canvas's intent, not its value, and record the measurement beside the token) —
**routed to the developer and to UX/Design**. The **check** is that a surface
whose judged content is chosen by a hard-coded query is a gate whose coverage
is decided by data; what would guard it is an axe pass over a result surface
**constructed** to hold one of each direction rather than one found by typing.

**Nothing in `pnpm verify` can see either half**: no stylesheet is applied below
`pnpm e2e`, so contrast is structurally unrunnable there, and the browser suite
only ever asks this one question with this one letter.

**Re-measure:** with the pair up, open `/securities`, type `a`, wait for the
options, and run `axe-core` over the document; read the `color-contrast` node's
foreground, background and ratio. Repeat with `he` and confirm the two differ —
**if they ever agree, read it as the data having changed rather than the defect
having gone.**

**Owner: the first task that may change `market.css`, the price palette, or
`SecuritySearch`'s result rows.**

## A FOURTH flake, also inside `pnpm verify`, and it is an ordering assertion over log-line indices

**Added 2026-10-10 by Task 4.8.9. Recorded here because nothing in this
repository had recorded it** — Task 4.8.3 saw it and this file named neither
marker.

**`apps/backend/src/index.process.test.ts > the database pool > says goodbye to
a browser BEFORE closing its socket`**, seen once in four whole-gate executions
on 2026-10-09:

```text
AssertionError: expected 13 to be greater than 18
 ❯ src/index.process.test.ts:1004:21
    1004|     expect(drained).toBeGreaterThan(gateway);
```

`http drained` at log line 13 and `market gateway closed` at 18 — the shutdown's
two markers in the wrong order. **It is in `test:process`, so it is inside
`pnpm verify` and inside a required CI check.**

**Characterised and NOT reproduced: 0 failures in 96 executions**, 48 of them
under a CPU plant that took the load average to 130. Four arms of 24 — scoped
`-t` quiet, scoped `-t` planted, whole `test:process` quiet, whole
`test:process` planted. **Wilson 95% CI on 0 / 96 is 0–3.8%.**

**Reported as unreproduced rather than as absent, and the plant is the reason.**
The assertion is over two **log-line indices** in a spawned child's records, and
what reorders them is a scheduling difference inside that child's shutdown — not
CPU starvation of the runner, which starves runner and child alike and may
simply scale both. The sighting came from a **whole-gate** execution, where the
contention is other spawned servers, other sockets and other ports. **The arm
that would reach it is `pnpm verify` repeated, not `test:process` repeated**,
and at ~3 minutes an execution that is 72 minutes for n = 24, which Task 4.8.9
did not spend and says so rather than publishing 0/96 as a rate.

**What makes it the worst-shaped of the five.** `CLAUDE.md` warns by name that
_a marker travels with its step_, so **a genuine ordering change and a
scheduling flake fail identically** — and the markers here are `indexOf` into a
log array, which moves if anything above them logs one more line. A future
change that adds a log line to startup does not move the order and does not fail
this; one that moves the gateway close does. That is the right design and it is
also why a red here must never be waved through as "the known flake" without
reading the diff for a shutdown change.

**Re-measure:** `pnpm verify` ×24 on one checkout with the load ratio under
0.75, counting failures per execution. Nothing cheaper has reached it: n = 96
of the scoped and whole-step arms, half of them planted, produced zero.

## The sector region's absence sentence is clipped at 390, and the repair for it cannot reach that width

**Added 2026-10-07 by Task 4.3.8, and accepted by the owner rather than repaired.**

`2026-09-25 close` renders as **`2026-09-25 cl…` at 390 and in full at 1440, 1024
and 768** — the inverse of what Task 4.3.7's record claims, which is corrected in
the same change.

**The mechanism is exact and is the repair's own shape.** 4.3.7 widened the quiet
row's figure cell with `grid-column: 4 / -1`, which spans it into the **bar
column**. Above 37rem the track list has five columns, so the cell takes the figure
column _and_ the bar column. **At 390 there is no bar column** — the track list is
`2ch 144px 44px minmax(68px, 1fr)` — so `4 / -1` resolves to **column 4 alone**.
The repair buys nothing precisely where the column is narrowest.

**Why it was accepted**: the **date survives**, and the date is the information;
`close` is the word lost. Every alternative costs something the story deliberately
bought — a second line breaks the same-height-in-every-state guarantee the region
paid 25 px for, a narrower label column re-opens the 144 px decision taken at Gate
1 (where `Communication Services` already overflows by 0.70 px in the loaded face),
and a shorter string at 390 only would give one sentence two homes.

**It is invisible to every text assertion**, because the DOM holds the full string
and the clip is CSS. It was found by **photographing the state**, which is the only
instrument that can see it.

**Re-measure:** `pnpm probe / --widths 390` with a stored figure that has no prior
close, and read the rendered text rather than the DOM — or compare
`.capture/sector-states/08-the-mixed-state-390.png` against `-768.png`.

## The reserved panel's room and its override shared one element, so the held rows un-hid with it — and a SEVENTH screen-reader entry

**Added 2026-10-07 by Task 4.4.6, which produced it while building the sibling
region.** Two findings from one mechanism.

### The defect, and it was live for ten days

Task 4.3.8 gave `SectorPerformanceReservation` a silence floor by putting
`visibility: hidden` and its `visible` override **on the same element**, with
`aria-hidden` removed in the same branch. **`visibility` is inherited by children
that never set it**, so past the floor the whole box un-hid — **including the
eleven reserved rows it was only ever holding room for.**

Produced at 1440, `innerText` verbatim:

```
"Sector performance\nNOT RANKED\n—\nTechnology\ntechnology\n—\nHealth Care\nhealth_care\n—\nFinancials\nfinancials\n…"
```

The second column is `RESERVED_SECTORS`' **internal sector slugs**, in the symbol
column — which that module's own comment says _"is the React key and is never
read"_. So it is **the fully-formed-placeholder failure the component's own
docblock forbids, plus a slug leak**, and it was in the accessibility tree too.

**Repaired in the same change** with two nested boxes: the held geometry keeps its
own `hidden` and its own `aria-hidden` **unconditionally**, and the sentence is a
**sibling** in the room it holds. Nothing can un-hide the rows, because nothing
overrides them any more. `BreadthLedgerReservation` was built that way from the
start, which is how the defect was found — **by writing the correct version next
door.**

**What nothing mechanical holds**: that a reserved box's override cannot reach its
held content. The repair is structural rather than asserted, and a future author
collapsing the two boxes back into one would reintroduce it with every test green —
the unit test that covers it asserts `aria-hidden` on a box, and a one-box version
still has one.

**Re-measure:** render either reservation past `SAY_NOTHING_ARRIVED_AFTER_MS` and
read `innerText`. It must contain the sentence and **nothing else** — no label, no
slug, no em dash.

### And a seventh entry for the standing screen-reader item

`CLAUDE.md`'s _A listening pass with a real screen reader_ gains one, and it is the
entry where getting it wrong **loses the story's subject**.

The breadth region hands a listener `Of the 503 we track` as a **group heading**
and, two nodes later, `Of the 503 companies we track, 451 were heard from in the
last 5 minutes.` as the region's one sentence. **Both read `tracked` from one
field**, so it is a restatement rather than a second home — **accepted by the owner
on 2026-10-07**, because every arrangement has exactly one redundancy for a
listener (the full sentence necessarily contains both the set and the window, and
the region draws both), and restating the **set** keeps the quiet group's heading
meaningful when read alone.

**Two things only a listener can answer.** Whether that reads as _a heading followed
by its qualifier_ or as _the set size said twice_. And whether **a 13-word clause at
the foot of a 475 px region is reached at all** by somebody navigating by heading or
by landmark — because **this sentence is the only delivery of the denominator to
that audience**: the figure is otherwise printed once, as the ladder's right
endpoint, and the ladder is `aria-hidden`.

**Owner: the same person with the same screen reader.** Re-measure: open `/` with a
reader, navigate the `Market breadth` region by heading and by element, and confirm
the sentence is reached and the set is not heard as a stutter.

## At ≥861 the landing route's focus order is deliberately NOT its visual order, and nothing can check a decision

**Added 2026-10-07 by Task 4.4.7**, which moved the landing route's six regions
into the **≤860 order** — `breadth, sectors, movers, topology, unusual,
investigations` — and changed no CSS.

**Why there is a gap at all.** Each region names its own `grid-area`, so **source
order and drawn order are two independent facts** and source order can express
exactly one of the three layouts. It expresses the one where order _is_ the
hierarchy: at ≤860 the stylesheet's own comment is that _order is the only
hierarchy left_, and `overview-region-order.spec.ts` now asserts DOM order against
geometric top-to-bottom order at **768 and at 390**, with the break
`the-narrow-grid-is-re-laid-without-the-dom`. Both widths, not one: 768 covers the
**rule** — one media query, one areas list — and 390 covers the **width**, which
this product has already paid for once, in the subgrid defect of Task 4.3.5 that
was visible at 390 and at no other width with `pnpm verify` green.

**What that leaves standing.** At 1440 and 1024 the grid reads `topology unusual /
sectors breadth / movers investigations`, so a keyboard reader's six tab stops —
`Region` passes `scrollable` unconditionally and `Panel` renders
`tabIndex={scrollable ? 0 : undefined}` — run `breadth → sectors → movers →
topology → unusual → investigations` **across** a column-major screen. The
argument for accepting it is that in two columns the eye is not performing a
sequence, so there is no reading order there to disagree with; the argument
against is WCAG 1.3.2 and 2.4.3, which do not distinguish by viewport. **Nothing
mechanical can adjudicate that, and no assertion should try**: a spec asserting
agreement at 1440 would assert the opposite of the shipped decision, and one
asserting disagreement would pin a cost rather than a claim. The decision, its
argument and its reversal trigger are in `MarketOverview.tsx` beside the regions.

**Amended 2026-10-09 by Task 4.6.6 — the SIX TAB STOPS half of this entry is
discharged, and the entry's own subject is not.** This was the only place in
`docs/GAPS.md` that recorded the unconditional `scrollable`, and the question
_should it be conditional_ had then been declined twice. It is decided in
[ADR 0039](adr/0039-a-region-is-a-tab-stop-unconditionally.md) — **`Region` is a
tab stop unconditionally**, because the question was never _does this region
scroll_ but _can a tab stop appear and disappear under a reader_, and both
candidate conditions fail: overflow is a function of **height** (re-measured,
and one region on `/` does scroll below about 700 px of viewport height, where
the four-pair premise said none ever did), and focusability of the content is a
function of the **frame**, so the stop would vanish when the first aggregate
lands and drop a reader's focus to `<body>`. The six stops this paragraph
describes are now **asserted** rather than described, by
`expectEveryRegionIsATabStop` in `overview-region-order.spec.ts` and
`securities-route.spec.ts`, with the break `a-region-stops-being-a-tab-stop` —
which matters because `scrollable-region-focusable` **cannot report this any
more**: the rule does not fire while the scrolling box contains something
focusable and Story 4.6 put links inside three of these regions. **What stays
open is this entry's actual subject**, unchanged: whether a column-major focus
order at ≥861 is experienced as a defect, which no assertion should try to
adjudicate.

**Three things this leaves to a person.**

- Whether the ≥861 order is experienced as a defect by somebody who tabs the
  screen at 1440. The product's own answer is _no, because there is no sequence
  there_, and that is an argument rather than an observation.
- Whether the ≤860 sequence is **meaningful** rather than merely matching. The
  spec can see agreement; only a listener can hear whether six region names in
  that order explain the screen. This is the standing screen-reader item's
  territory and it is **not** a seventh entry there — it is about an order, not
  about an announcement.
- Whether `Market proxies`, which sits outside the grid and is first in every
  order, still reads as the screen's opening at ≤860 now that `Market breadth`
  follows it rather than `Market topology`.

**Reversal trigger for the decision** (not for this entry): the first region on
this screen whose content a reader must traverse in order **at a wide width** — a
numbered sequence, a stepper, a form, or two regions where one's figure is read
against the other's. At that point the wide layout acquires a reading order and
the choice is owed a re-take.

**Re-measure:** `pnpm probe / --widths 1440,1024,768,390` and read each region's
`@x,y` against the source order in `MarketOverview.tsx`. At 768 and 390 the two
orders must agree — which `overview-region-order.spec.ts` holds at both widths —
and at 1440 and 1024 they must disagree, which is the
accepted cost rather than a finding.

## Every breadth figure is checked against this repository and nothing else, and the 503 it counts are on no frame a browser can see

**Added 2026-10-07 by Task 4.4.8.**

**What is guarded.** The arithmetic, exhaustively: Task 4.4.8 enumerated every
`(advancing, declining, unchanged)` triple summing to N for N from 0 to 503 and
asserted the displayed identity on each. The wire's own cross-field check refuses
`measured > tracked`. `marketBreadth` is a single pass with three accumulators
whose sum **is** `measured`, so the numerator and the denominator cannot be
measured over different sets. A pass-through browser spec asserts
`advancing + declining + unchanged === measured` off the server's own frame.

**What that leaves standing — and it is the largest gap this epic has opened.**
Every one of those checks is **internal**. Breadth is a _reduction_: the backend
counts 503 securities and the browser receives five integers. **There is no
recoverable input on the frame at all** — a reader, a spec, a screen-reader pass
and a person at a live session all see the same five numbers, and none of them
can recompute one. So the claim _451 of the 503 we track were heard from in the
last 5 minutes_ is checked against:

- **the join's own entries**, which the same process produced; and
- **one one-sided cross-check**, which is worth having and is weak: the four
  proxies and eleven sectors ride the **same frame** and are inside the 518, so
  the number of those fifteen that are `observed` with a positive move is a
  **lower bound** on `advancing`. It goes red on an inverted sign, a transposed
  bucket, or breadth computed over the wrong symbol set — and it is silent on
  every error that is off by less than the fifteen.

Nothing compares a breadth count with **any figure produced outside this
repository**. There is no second implementation, no vendor breadth number, and
no stored history of the counts to compare a session against. A systematic error
— the window off by a minute, the equity set off by a handful, `unchanged`
absorbing a bucket it should not — would render as five well-formed integers
drawing a plausible picture.

**Re-measure:** during a regular session, read `GET /diagnostics/feed` for the
observed count, take the overview frame's `breadth` from the deployed socket, and
compare `measured` against the count of entries with a bar inside the window from
a direct query of `market_bars`. That is still this repository checking itself,
one layer down; the only external check available is a published breadth figure
for the same minute from a source this product does not use, read by a person.

## No gated machine has ever seen a breadth figure at all — not a wrong one, an absent one

**Added 2026-10-07 by Task 4.4.8.** The sibling of the sector entry above, with a
sharper edge.

CI's store is **518 securities and zero bars**, and nothing on a runner connects
to a market socket. So in every gated run `measured` is **0**: the region renders
its honest-nothing state — `Of the 503 companies we track, none were heard from
in the last 5 minutes.` — and the three counts, the ladder, the band track and
the net headline are **all suppressed or zero**. The sector entry could at least
say CI draws eleven rows of `unknown`; here the states a gated run reaches are
`reserved` and `N = 0`, and **nothing else**.

**The consequence, stated plainly: every browser assertion about a breadth
_number_ is an assertion about data CI does not have.** That is why the
pass-through spec asserts an **identity** (`0 + 0 + 0 === 0` holds, and
`0 !== 503` is a real distinction), a **bound** (`measured <= 503`), a **count of
figures** (exactly four proxies — the one assertion that catches the
negative-filter regression of Task 4.4.1), and **convergence on the latest
recorded frame**, rather than any figure.

What follows is that the states a reader actually meets — a ladder with a real
scale, a net headline with a sign, the two grammars, a remainder that is not the
whole population — exist on a developer's store, in Storybook, in the produced
state grid, and **in production**. They are covered by component tests over the
view builder and by photographs. They are not covered by anything that runs
before a merge against real counts.

**Re-measure:** `pnpm store:bare`, then `DATABASE_NAME=marketpulse_bare pnpm dev`
and `pnpm probe / --within "Market breadth"` — that is what CI sees. Then the
same probe against a developer's store during a session for what it does not.

## The remainder row cannot distinguish _we did not hear_ from _it did not trade_, and the honest word for it was chosen rather than derived

**Added 2026-10-07 by Task 4.4.8.**

`tracked - measured` is drawn as a quiet row below the rule, and Task 4.4.6 gave
it two grammars keyed on the **basis the wire sent**: `Not heard from` under the
observed basis, and a close-to-close wording under the session one, because
_nothing is heard from out of hours_ and the out-of-hours figure is really _how
much of the store is behind_.

**What neither grammar can say is why an individual security is in that
remainder**, and there are at least four reasons with one number:

- it did not trade in the window — common and correct, and most of the 503 on a
  quiet five minutes;
- it traded on a venue our tape does not carry — the live stream is **IEX only**,
  which is invariant 6's whole subject, and a security trading briskly elsewhere
  is silent to us;
- its bar arrived and was refused — `directionOf` answers `undefined` for a
  non-finite percentage, so such a figure is in **no bucket and outside
  `measured`**, which is correct and indistinguishable;
- it has no stored close to measure against, so `changeFromClose` cannot produce
  a percentage at all.

The first is a fact about the market. The second and fourth are facts about
**our reach**. They are summed into one integer and drawn under one label, and
**the label names the only one of the four a reader could act on**. `Not heard
from` is the honest word for the sum — it claims a limit of ours rather than a
property of the market, which is the right direction to err in — but it is a
chosen word and not a derived one.

**Re-measure:** a per-security breakdown would answer it, and is deliberately
not built: it is 503 rows of a fact nobody asked for. Until something asks,
check the direction of the claim rather than its composition — grep the region's
copy for any word that attributes the remainder to the **market** rather than to
us.

## The denominator sentence's clipping at 390 is mechanically invisible, and the longest string is the one the N = 0 state draws

**Added 2026-10-07 by Task 4.4.8**, and it is the same class as the sector
region's clipped absence sentence above — with one difference that matters: there
it is the _absence_ sentence, and here the sentence is **shipped copy in the
state a gated machine always renders**.

**Which string is at risk, which is easy to get wrong.** The long sentence is
normally the **spoken** twin. At `measured > 0` the drawn claim is a short method
clause — `Heard from means at least one observation in the last 5 minutes.` (64
characters) — and the full `Of the 503 companies we track, …` sentence is read by
a screen reader only. **At `measured === 0` the two collapse into one string and
the long sentence is drawn**: `Of the 503 companies we track, none were heard
from in the last 5 minutes.` — 74 characters, the longest string the region
holds, in the state CI renders every run and a reader meets out of hours.

**Why nothing can see it.** The DOM holds the full string whatever the box does.
`textContent` is identical whether the sentence wraps to three lines, is clipped
by `overflow: hidden`, or overflows its panel. jsdom computes no layout; the
browser suite is told not to assert a pixel; and a greyscale or deuteranopia
pass reads colour, not geometry. **A screenshot is the only instrument, and a
person looking at it is the only reader.**

**Re-measure:** `pnpm probe / --widths 390 --within "Market breadth"` and **open
the screenshot in `.probe/`** — the box figures alone will not show a clipped
glyph. Take it in both states: against a store with bars for the method clause,
and against `marketpulse_bare` for the long sentence. The two grammars double it
again: the session-basis string is `Of the 503 companies we track, none had a
close-to-close move on 2026-10-07.`, which is **76** characters and is therefore
the real worst case.

## No machine and no person has ever seen a movers list on the `observed` basis, and CI never will

**Added 2026-10-08 by Task 4.5.4.** The movers section is a two-member union
like breadth's, and only one of the two members has ever been produced outside a
unit test.

**What has been seen.** One real frame off this product's own gateway, on the
**session** basis: `eligible: 503`, `tracked: 503`, five gainers from `HPE`
+12.44% down to `HPQ` +8.40% and five losers from `ALB` −3.76% to `EW` −2.77%,
over a store whose newest session is eighteen trading days old. That exercises
`sessionMoves`, the selection, both field maps, the encode and `readMovers`.

**What has not.** The `observed` branch — the five-minute window on each bar's
own `startsAt`, the `live` figures, and therefore `windowMinutes` on the wire —
has been produced by **no** process. It needs a session **and** a store
backfilled to the previous session, and the two have not coincided on any
machine since the section existed. **CI cannot ever produce it**: 518 securities
and zero bars means every figure is `unknown`, so `eligible` is `0` and both
lists are empty on every run, for ever — the state the pass-through spec asserts
is the only state it can assert a figure in.

**And the thing no reader can see, stated so nobody over-trusts the wire's
checks.** `readMovers` verifies that each list is in `compareByMove`'s own
order, that the lists are disjoint, that every row has a ranking key, and that
the selection is no bigger than the set it claims to be from. It **cannot** see
a list that is correctly ordered over the **wrong population** — a top five of
518 including `SPY` and the sector SPDRs is internally consistent in every one of
those respects. That claim is held in-process instead, by
`breadth-is-counted-over-the-equities-alone` (exactly one eligibility pass, over
a binding that names `isEquitySymbol`) and on the frame by
`overview-frame-sections.spec.ts`, which compares the movers' `tracked` against
breadth's — the one assertion in that file that is sharp on a store with no bars.

**Re-measure:** during a regular session, against a store backfilled to the
previous session, capture one frame from `/market-stream` and check `basis`,
`windowMinutes`, and that `eligible` is below `tracked` rather than equal to it —
on the observed basis the gap between them is Task 4.1.8's ~50 securities and is
the whole reason the denominator is drawn.

## The cut is checkable only where the input is recoverable, and in the basis the region exists for it is not

**Added 2026-10-08 by Task 4.5.8.**

A top-N is a **selection**, not a reduction, so unlike breadth most of it is
checkable: ordering, uniqueness, count and the two lists' interleave are all
answerable **from the frame**, because every row carries its own key; the
population falls to `GET /securities`. **What is irreducible is the cut** —
that nothing outside the list outranks the weakest name inside it — because
ADR 0038's grain rule forbids shipping the ranking's input.

**In the `session` basis it is settled completely.** `overview-movers-ranking.spec.ts`
recomputes the whole ranking from `GET /securities`' `close` and
`previousClose`, over all 503, and compares membership, order, the cut and the
figures. **In the `observed` basis it has never been checked on any machine.**

**And the reason is structural rather than a gap in the effort.** The basis is
**session-driven, not data-driven** — `eligibleMoves` chooses `observed` only
when `isMarketOpen(asOf)` — so **no machine can produce an observed-basis
movers section outside 09:30–16:00 ET**, however many observations it holds.
Task 4.5.8 produced that rather than reasoning about it: an isolated backend
with 518 observations in hand still reported
`"the aggregate is on the session basis, whose input is the closes cache and
NOT the snapshot. This instrument could not judge…"`

**Why it matters more than the arithmetic suggests.** `pnpm break the-cut-keeps-the-first-five-it-meets`
replaces the bound with _the first five it meets in population order_, and
**every frame-checkable claim stays green** — the bound, the keys, both
orders, the disjointness, the interleave, the directions, the population, and
the screen's agreement with the frame. **271 of the 503 eligible securities
outranked the weakest row the region drew.** Only the independent recompute
sees it.

**Re-measure:** `node scripts/movers-snapshot-check.mjs <backend>` against a
process with a live feed, **between 09:30 and 16:00 ET**. The instrument's
header states its own limit: same process, same data, so it proves nothing
about the data and everything about this story's code — the population split,
the comparator, the key selection, the cut and the N.

## No gated machine has ever seen a mover, and CI never can

**Added 2026-10-08 by Task 4.5.8.** The third in this family, after the sector
and breadth entries.

CI's store is **518 securities and zero bars**, so the frame carries a movers
section reading `eligible: 0, tracked: 503` with **two empty lists, for ever**.
The region draws its heading pair, the bound falls silent, and the footer says
_"…none were heard from in the last 5 minutes. There is nothing to rank."_

Checked rather than assumed: a backend on `marketpulse_bare` answers
`{"basis":"session","gainers":[],"losers":[],"eligible":0,"tracked":503,"session":"2026-10-08"}`
with `lastCloses: 0`.

**So every browser assertion about a position or a figure is an assertion
about data the runner does not have** — which is why the pass-through spec's
first test asserts a **bound**, a **population** and a **structure**, and its
second test **skips with its reason printed by name**. The one non-vacuous
claim on CI is `tracked === 503`, which is live and does catch the population
defect.

**Re-measure:** `pnpm store:bare`, then `DATABASE_NAME=marketpulse_bare pnpm dev`,
then `pnpm probe / --within Movers`.

## The day's biggest mover may be a name we never heard from, and the ranking cannot say whether it was

**Added 2026-10-08 by Task 4.5.8.** The sharpest form of `EPIC.md`'s _an
aggregate is the one kind of number that can be wrong while looking right_.

Measured on the deployed gateway: of 518 tracked securities, the number heard
from inside the last **5 minutes** has a median of **466**, a worst hour of
**446**, and **298 at 13:00**. So on any tick the region has no recent price
for roughly fifty of them — and **a top five computed over the ~466 may show
five securities that are not the five biggest movers**, with nothing on screen
distinguishing that from a complete answer.

**The region confesses the limit and does not bound the error.** The footer
states the population — _"Of the 503 companies we track, 466 were heard from
in the last 5 minutes. Both lists are ranked over those."_ — which is the
honest thing available, and is **not** the same as knowing how wrong the list
could be.

**Re-measure:** `movers.eligible` against `movers.tracked` on the deployed
frame through a session. Nothing bounds the error without a second source for
the fifty, which this product does not have.

## The ranking is over a one-venue tape, and the headings do not say so

**Added 2026-10-08 by Task 4.5.8.** Invariant 6's territory, in the form where
a **heading** over-claims rather than a sentence.

The live stream is **IEX only**. So `GAINERS` is strictly _the biggest rises
among the names one venue told us about in the last five minutes_ — and a
security trading briskly elsewhere is silent to us and cannot appear, however
far it moves.

This is the same root as the breadth remainder's four indistinguishable
causes, arriving at a **selection** rather than a count: for breadth it
understates a figure, and here it can **omit a name entirely**.

**Re-measure:** grep the region's copy for any word attributing the ranking to
**the market** rather than to us — the direction of the claim, on the
remainder row's precedent. Today: `GAINERS`, `LOSERS`, and _"Both lists are
ranked over those"_, all of which name the measured set rather than the
market.

## A display-flat row would draw the region's own absence glyph beside a figure

**Added 2026-10-08 by Task 4.5.8.** Low severity, recorded because it is a
contingency nobody would reconstruct.

`readMovers` deliberately **does not refuse on sign** — whether a gainer may
carry a negative move is a product rule, not a wire fact. So a row whose move
reads `0.00%` is accepted by the reader and renders
`5 FLAT FLAT 100.00 — unchanged 0.00%`, where the em dash is **this region's
own absence glyph for a refused rank**.

The shipped producer cannot send it: `directionOf` puts a display-flat figure
in **neither** list. **So `Movers.test.tsx`' assertion that no em dash appears
anywhere in the region is contingent on AC 5's producer-side filter rather
than on the renderer** — and a rolled-back or foreign producer reaches it.

**Re-measure:** the state is in the produced grid; push a `0.00%` row through
`encodeMarketStreamMessage` and look.

## `breadth-is-counted-over-the-equities-alone`'s chain stops at a binding's NAME, and the break proves it

**Added 2026-10-08 by Task 4.5.8**, and it is a check reporting green on the
defect it exists to forbid — found by producing that defect rather than by
reading the check.

The check walks a three-link chain in `index.ts`: the `breadth:` section names
`const eligible =`, which names `const equities =`, which names the
**identifier** `isEquitySymbol`. **What the binding is built _from_ is
unchecked.**

So `pnpm break the-movers-population-is-the-join-whole` — which replaces
`new Set(equityTickers())` with `new Set(trackedTickers())`, i.e. the whole
518 including `SPY` and the eleven SPDRs — leaves **every clause of
`pnpm invariants` holding**. Only the browser spec catches it, on
`tracked === 503` against `GET /securities`:

```
Error: expect(received).toBe(expected)   Expected: 503   Received: 518
```

**This can be made mechanical and should be**: a fourth link asserting
`const isEquitySymbol =` names `equityTickers`. One grep, and the
`every-break-can-still-land` entry already exists to keep it honest.

**Re-measure:** `pnpm break the-movers-population-is-the-join-whole` and read
whether `pnpm invariants` goes red. Today it does not; the spec does.

## A locally-run `fixture` or `replay` backend writes synthetic bars into whatever database it is pointed at

**Added 2026-10-08 by Task 4.5.8**, found by an instrument doing it
accidentally and then cleaning up after itself.

`liveBarWriter.store()` is called from the socket callback **with no
market-open gate and no provider gate**. The writer was built for the
deployed backend's real IEX stream (Story 3.8) and it does not ask where the
observations came from — so a developer running `MARKET_DATA_PROVIDER=fixture`
or `replay` against any store **writes invented bars into `market_bars`**.

Task 4.5.8's snapshot instrument did exactly that to a scratch store; both the
seed and the writes were deleted and the table confirmed back to 0 rows, and
the real store was never pointed at. **But nothing prevented it, and nothing
would have reported it.**

This is adjacent to a standing product rule — _never ship replayed or
synthetic data to the deployed site_ — on the **developer's** side of it,
where the deployed guarantee is held by the deployment's configuration rather
than by the writer.

**Re-measure:** `apps/backend/src/index.ts` around the `liveBarWriter.store()`
call site. The cheap guard is a provider check at the writer's edge; the
cheaper one is a refusal to write when the configured provider is not the
real client.

## AC 6's browser half is one machine on one afternoon, and it is blind below about a millisecond

**Added 2026-10-08 by Task 4.5.8.**

Measured on a production build, `PerformanceObserver` installed before
navigation, 45 bursts per arm, two arms differing in exactly one thing — the
movers section's ten rows change identity and figure, or are byte-identical:

|               | worst animation frame     | script per tick         | `longtask`    |
| ------------- | ------------------------- | ----------------------- | ------------- |
| movers change | p50 **18.6 ms**, p95 21.0 | p50 **0.3 ms**, p95 0.5 | **0 entries** |
| control       | p50 18.7, p95 18.9        | p50 0.3, p95 0.6        | **0 entries** |

**Net: 0.0 ms at p50 — below the instrument's noise floor.** Three
qualifications, each worth more than the figure:

- **The brief's "make the population change" has no browser meaning.** The
  503-figure input never crosses the wire — that is the grain rule — so the
  population-sized work is the **0.28–0.41 ms the backend half measured**
  (Task 4.5.4). What crosses is ten rows and a sentence, and they cost less
  than one animation frame.
- **This instrument cannot see a regression smaller than a millisecond**, so
  §28's own blindness is **narrowed, not fixed**: the precedent it was written
  against is a change that cost **17× the CPU on the pointer path and produced
  no long task at all**, and 17× of 0.3 ms would still be invisible here.
- **The empty `longtask` case reads identically to an instrument that was
  never wired**, which is why the rAF loop, the script clock and a DOM check
  that the drawn symbols actually change (`distinctDrawn: 4` cycling against
  `1` held) are all in the transcript. The first draft's hook **was silently
  overwritten by Playwright's own `WebSocket` and reported n = 0** — the
  2026-09-25 count-by-URL lesson arriving by a new route.

**Re-measure:** the instrument is deleted; its shape is in Task 4.5.8's record.
Load averages 5.26 before and 5.01 after, on a machine whose other runs that
day sat at 23–33.

## An eighth entry for the standing screen-reader item — two lists, re-ordering, and a hold a listener may never trigger

**Added 2026-10-08 by Task 4.5.8.**

The standing item's unanswerable is whether an unprompted polite update
**queues behind a sentence in progress or replaces it**. `Movers` doubles it:
**two `<ol>`s, each with its own accessible name, re-ordering independently**
and up to ~8.8 times a minute (measured: ten names land in ~6 of the 8.8
upstream messages a minute, and there is no coalescing anywhere in the
gateway).

**And the mitigation that exists for a sighted reader may not reach a listener
at all.** `ORDER HELD` is scoped to the region via `:hover`/`:focus-within` —
so a reader whose pointer or focus is in the region freezes the order. **A
screen-reader user navigating by headings or by landmarks may never put focus
inside the region**, and would then hear a list that re-orders under them with
no hold and no announcement.

Two further things only a listener can judge: the **double ordinal** (the
printed rank is spoken _and_ the platform announces `item 1 of 5`, now ten
times on one screen), and whether `GAINERS` and `LOSERS` as two list names in
one region read as a structure or as a repetition.

**Owner: a person with a screen reader**, before Epic 11 hands this surface to
an agent.

## No gated machine has ever clicked a mover, and CI never can

**Added 2026-10-09 by Task 4.6.7.**

Story 4.6's whole point is that `Movers` is a place a reader leaves from.
**CI's store is 518 securities and zero bars**, so the overview frame a gated
runner's own gateway builds carries `eligible: 0` and two empty lists for ever
— ten held pads, each handed **no link at all** since Task 4.6.4. So the
gate's permanent state is a region with **nothing in it to click**, and the
twenty-odd mover and sector destinations this story shipped are exercised there
only against a frame a spec wrote.

`e2e/specs/overview-journey.spec.ts` drives the journey over a **furnished**
frame, which is what makes it non-vacuous on a runner with no data: measured
against `pnpm store:bare` (518 securities, 0 bars, the pair pointed at
`marketpulse_bare`) it passes in **1.8–2.4 s**, activating the third gainer by
pointer and the third loser by keyboard. What it therefore says is everything
about what the browser does with a ranked row and **nothing about whether a
ranked row ever arrives** — `e2e/README.md`'s own _not that a feed a spec
furnishes would ever have arrived_, on a fourth surface.

The chain is covered piecewise elsewhere (`movers.ts`' unit tests over the
selection, `overview-movers-ranking.spec.ts` against the real server when the
store can answer) and **nowhere end to end on a gate**.

**Re-measure:** `pnpm store:bare`, then drive the pair at it and run
`pnpm e2e overview-journey.spec.ts` — the journey is green and
`overview-movers-ranking.spec.ts`' cut test skips. The permanent figure is the
frame's: `eligible: 0`, two lists of five pads, zero links in the region.

## AC 5's last clause is unreachable on every gate this repository has

**Added 2026-10-09 by Task 4.6.7.**

Story 4.6's AC 5 is _land on `/`, reach a mover, open it, and **read a figure**
on the security page_. The last clause cannot be asserted anywhere that gates a
merge, and the two ends fail for different reasons:

- **`pnpm e2e`**: zero bars, so `/securities/<anything>` renders the vacancy
  sentence and the figures block is absent. Measured on a store 19 sessions
  behind, which is the same shape: `/securities/NVDA` draws
  `No bars stored for this window.` and **0** `Open` labels, while
  `/securities/NVDA?sessions=21` draws **1** and `1M OPEN 220.53` — so the
  locator is sound and the store is the reason.
- **`pnpm e2e:deployed`**: the store has bars, but a figure there is a property
  of the session the deployment is in, and that suite's own rule forbids
  asserting one.

So the clause is carried by `overview-journey.spec.ts`' second test, which
**skips with its reason naming the security**:
`this store holds no bars for NVDA, so the security page has no figure to read
— AC 5's last clause is unreachable on any gate, and on CI (518 securities,
zero bars) it is unreachable for ever`. A skip says _this instrument could not
judge_; nothing in this repository has ever judged it.

**Re-measure:** `pnpm e2e overview-journey.spec.ts --reporter=json` and read
the `skip` annotation. On a store with bars in the default window the same test
runs and asserts the figure; that store is a `pnpm backfill` away and is not
any gate's.

## The sector region draws no `<ol>` at all when nothing is ranked, so every list-keyboard assertion in it is vacuous on the gate

**Added 2026-10-09 by Task 4.6.7, from a finding Task 4.6.5 made in passing.**

`RankedList` renders **no `<ol>`** when no row has a rank — recorded in
`RankedList.tsx` and in Task 4.6.5, where it read as the focus recovery not
firing, because `closest("section")` on a detached node reaches nothing.

On a gated machine every sector figure is `unknown` for ever, so **all eleven
sector rows are drawn in the trailing `Not ranked` `<ul>` and the ranked `<ol>`
does not exist**. Measured in the producer walk (2026-10-09, 1440×900): the
`unknown everywhere` state draws `Sector performance / Not ranked` × 11 and no
ranked list at all. Any assertion phrased as _the ranked list's first row_,
_`Home` goes to rank 1_ or _the arrows clamp at rank 11_ therefore resolves to
nothing on CI — and a locator that resolves to nothing is a `toHaveCount(0)`
that passes, not a failure.

`overview-ranked-keyboard.spec.ts` and `overview-nothing-to-open.spec.ts` both
avoid this by **furnishing their own frame**, which is why they are not
affected. **The residue is the next spec**: a sector-list keyboard assertion
written against the real gateway is vacuous on the gate and looks identical to
one that holds.

**Re-measure:** with the pair at `marketpulse_bare`, open `/` and count —
`document.querySelectorAll('section ol').length` is **2** (the two mover
lists), and the sector region's lists are one `<ul>`.

## The pointer's MOMENT OF ENTRY is unguarded, and the rates that size it are measured

**Added 2026-10-09 by Task 4.6.7.**

`ORDER HELD` is scoped to the **region** through `:hover` / `:focus-within`, so
a reader whose pointer is inside the region has already frozen the order — and
Story 4.5's hand-off names the hole precisely: **a pointer crossing the region
boundary toward a row has not yet triggered the hold on the row it is aiming
at.** Nothing anywhere asserts anything about that window, and nothing can: it
is a race between a pointer's travel time and a frame.

The rates that size it, measured in Story 4.5.7 across three sessions and
n=9,360 adjacent-rank gaps: **0.21–0.44 membership changes a minute** and
**0.80 / 0.45 / 0.42 total order changes a minute**. So the window is small —
and the consequence of landing on the wrong row is a **navigation**, which is
the one thing a reader cannot undo with their eyes.

**Two things make it narrower than it sounds, and neither closes it.** The
destination is resolved at **render** from the row's own identity
(`<Link to={securityPath(symbol)}>`), so the row that is pressed is the row
that opens — the activation race Story 4.3's hand-off warned about is
unrepresentable. And `Region` fires `focusin`/`focusout` on its own box with
**both events bubbling**, so a keyboard reader re-takes the pin on every arrow
press. What is left is strictly the pointer, strictly in flight, and strictly
within one frame of arrival.

**Re-measure:** there is no instrument. The rates are re-taken by
`scripts/movers-snapshot-check.mjs` over a live session; the window itself would
need a synthetic pointer moving at a known speed while a frame is injected at a
chosen offset, which is a spec nobody has written and which would assert a
timing this suite forbids.

## A reverse Tab walk puts two region rings 0.09–0.14 px behind the masthead at heights the ring spec does not run, and `tokens.css`'s own measurement says that cannot happen

**Added 2026-10-09 by Task 4.6.7. This one falsifies a dated measurement.**

`tokens.css`'s `--scroll-overshoot` block records (Task 4.6.1, 2026-10-08) that
the overshoot is _"exactly linear, exactly integral, and identical at 1440,
1024, 768 and 390 — **every box edge and both chrome edges read whole pixels,
so there is no sub-pixel here for a tolerance to absorb**"_. That is true of
its sample and **is not true in general.**

Measured 2026-10-09 on `/`, Chromium at `devicePixelRatio: 1`, blurring and
then walking **Shift+Tab** 26 times, with the clearance printed to four
decimals:

```
1024×800  Tab        stops=14 breaches=0  minTop=88.0000 minBottom=0.1406
1024×800  Shift+Tab  stops=14 breaches=4  minTop=-0.1406 minBottom=75.0000
      !! section:Sector performance     h486.00 top=60.8594 topClr=-0.1406 scrollY=477 pad=62px
      !! section:Market breadth         h486.00 top=60.8594 topClr=-0.1406 scrollY=477 pad=62px
1440×680  Shift+Tab  stops=14 breaches=4  minTop=-0.0938 minBottom=47.0938
      !! section:Sector performance     h486.00 top=60.9063 topClr=-0.0938 scrollY=454 pad=62px
1024×900  Shift+Tab  stops=14 breaches=0  minTop=0.0000  minBottom=75.0000
1440×900  Shift+Tab  stops=14 breaches=0  minTop=0.0000  minBottom=55.0000
 768×800  Shift+Tab  stops=14 breaches=0  minTop=0.0000  minBottom=87.0000
 390×780  Shift+Tab  stops=14 breaches=0  minTop=0.0000  minBottom=36.0000
```

**The mechanism**: `scroll-padding-top` resolves to a whole `62px` and the
chrome's bottom is a whole `57`, but at these two viewport **heights** the
region's own document offset is fractional — `min-height: 82vh` over
`minmax(min-content, 1fr)` rows gives tops at `*.8594` and `*.9063` — while
Chromium quantises `scrollY` to whole pixels (`477`, `454`). So the browser
cannot land the box at `61.0000` and lands it at `60.8594`, which is
`-0.1406` of ring behind the masthead. The four pairs
`overview-focus-ring.spec.ts` runs — 1440×900, 1024×**900**, 768×800, 390×780 —
all give whole-pixel offsets and read exactly `0.0000`, which is why 4.6.1
concluded there was no sub-pixel to absorb.

**It is a fraction of a device pixel and the product's own criterion is zero
tolerance**, which is the whole of the disposition question: `AC 4`'s repair
holds at every pair anybody has asserted, and the assertion is red at pairs
nobody asserts. Widening the spec's `WIDTHS` to a short viewport makes the gate
red; adding a sub-pixel tolerance to the spec weakens the one check that found
the original 5 px defect. **Owner: whoever next touches `--scroll-overshoot` or
`overview-focus-ring.spec.ts`' `WIDTHS`.** Not repaired here, deliberately —
the spec is Task 4.6.1's and a gate going red is the owner's call.

**Re-measure:** blur, then press `Shift+Tab` 26 times at 1024×800 and
1440×680, reading
`activeElement.getBoundingClientRect().top - (focusWidth + focusOffset) - header.getBoundingClientRect().bottom`
to four decimals, skipping anything inside `header`/`footer`. The forward walk
is clean at every pair; **the reverse walk is the one that finds it**, which is
what `STORY.md` already says about this defect class.

## The landing page's tab-stop count is 11 reserved and 19 filled, and AC 1's reworded second half asks for one figure

**Added 2026-10-09 by Task 4.6.7.**

Gate 1 reworded AC 1's second half to _"the tab-stop count is the same in the
reserved and filled states, stated as a figure"_. Walked with real `Tab`
presses on 2026-10-09, identical at 1440×900, 1024×800, 768×800, 390×780 and
1440×680:

| State                 | Stops  | Composition                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------------- |
| first paint, no frame | **11** | 4 masthead links + 7 region sections                                        |
| furnished             | **19** | 4 masthead links + 7 region sections + 4 proxy links + 4 roving-group stops |

**The figure that is the same is 7** — the region sections, which is what
ADR 0039 decided and what `expectEveryRegionIsATabStop` holds on both routes.
The **page** count is not the same, because content stops exist only when there
is content: the proxy strip's four and one roving stop per list (ranked
sectors, `Not ranked`, gainers, losers).

Whether that satisfies AC 1 as reworded is a **reading of the criterion** and
is the owner's rather than this task's. The hazard the criterion was written
against — _a tab stop appearing and disappearing under a reader_ — is answered
by the 7 being invariant; a content stop arriving with its content is not that
hazard. **Owner: Gate 2.**

**Re-measure:** blur, then press `Tab` up to 26 times reading
`document.activeElement`, on `/` with no overview frame and then with one. The
order, verbatim, at every width in the furnished state:
`Market Overview › Investigation Workspace › Security Explorer › Market Replay ›
section:Market proxies › SPY › QQQ › DIA › IWM › section:Market breadth ›
section:Sector performance › XLK › XLU › section:Movers › SMCI › MRNA ›
section:Market topology › section:Unusual activity › section:Current investigations`.

## A NINTH entry for the standing screen-reader item — a client-side route change with an unchanged `document.title`

**Added 2026-10-09 by Task 4.6.7, and it is the INVERSE of the other eight.**

The other eight are **unprompted** updates, where the open question is whether
speaking is right at all. This one is a change the reader **asked for** — they
pressed `Enter` on a ticker — which is the one case where announcing is
unambiguously right. And it is the case where this product announces nothing.

Verified in the code rather than taken on report (Gate 1, and re-checked here):
`index.html` holds **one static `<title>MarketPulse</title>`**; `App.tsx` uses
React Router in **declarative mode** with no route announcer; the destination's
`<h1>` is **`Security Explorer` on both routes**, and the security's own symbol
is an `<h2>`. So activating a mover produces **no load event, no title change,
no focus move and no announcement** — the browser keeps focus on an anchor that
no longer exists in the new route's tree, and `AppFooter`'s and the masthead's
chrome are byte-identical either side.

**What is unanswerable from a DOM**: whether a screen reader notices a
client-side route change at all, and what it says if it does. Some pair the
URL change with the new document's heading structure; some say nothing until the
reader explores. `overview-journey.spec.ts` asserts the destination's `<h2>`
names the symbol, which is what a reader will **find** when they go and look —
not what they are **told**.

**The repair is designed and unshipped and the owner's Gate 1 decision was
raise it, do not build it**: a per-route `document.title` is ~10 lines and is
the mechanism screen readers do announce on, but it is product-wide, belongs
beside a route-announcer decision, and `/securities`' 518 links have had the
same hole for two epics.

**Owner: a person with a screen reader**, before Epic 11 hands this surface to
an agent. **Re-measure:** open `/`, press `Enter` on a ticker with a screen
reader running, and write down what was said. There is no mechanical form of
this question.
