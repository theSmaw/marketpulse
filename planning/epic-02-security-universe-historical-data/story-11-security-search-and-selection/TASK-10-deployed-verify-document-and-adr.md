# Task 2.11.10 — Deployed, verified, documented: the record and the ADR

**Status:** Not started
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.9

## Objective

Close the story: prove the per-security URL deep-loads cold in the deployed
environment, finish `SEARCH-AND-SELECTION.md` as the subject document, write the
ADR, and sweep upward everything this story falsified.

## What the user can see when this lands

**Search, live.** Everything the previous nine tasks built, on the deployed site,
reachable from a link somebody sends. The epic's exit criterion is half met and
demonstrable: **a user can search for NVDA and open it.** The other half — look
at its price and volume — is Stories 2.12 and 2.13.

## Work

- **Deploy and check the deployed thing**, not the local one. Acceptance
  criterion 2 is specifically that **a per-security URL deep-loads cold**, which
  is a property of the host's fallback configuration rather than of the
  application: `public/staticwebapp.config.json` is part of the artefact and the
  three hosts this product runs on behave differently for an unmatched path.
  `pnpm e2e:deployed` and `specs-deployed/host-routing.spec.ts` are the existing
  mechanism.

  **Poll for coherence rather than checking once.** The frontend's upload is not
  atomic; for roughly two seconds around a deploy that changes the artefact a
  cold load can be broken in two distinct ways, and the window _opens_ at the
  second the deploy step reports success.

- **Take the measurements this story owes**, rather than citing any:
  - The universe payload as a browser receives it, re-taken — the client-side
    matching decision rests on it and the figure has already moved twice
  - **Not the matcher's, which is taken — added 2026-09-11 by Task 2.11.2.** The
    shipped rules measured **0.101 ms** for `nv`, **0.040 ms** for `nvid`,
    **0.072 ms** for `a` and **0.216 ms** over a synthetic 5,000, against §0's
    0.295 ms and 0.58 ms for the naive scan. Both sets are true and they are
    **different implementations**, so §0's figures are a historical record and
    §2's slope argument should cite the shipped ones. Reconcile rather than
    re-measure, unless the implementation has stopped being a linear scan.
  - The bundle, before and after this story, since it added a control and
    possibly an icon
  - Whatever figure Task 2.11.8 recorded about rendering 518 rows

- **Finish `SEARCH-AND-SELECTION.md`.** It was created in Task 2.11.1 with three
  decisions in it; it closes as the subject document for search, selection, the
  Security Explorer shell and the input idiom. It must carry: the matching rules
  and the ranking tiers; where search lives and why; the URL rule and what a
  shared link means; the live-region rate; the keyboard flow from 2.11.9; the
  grouping control and its trigger; and **what a green run does not certify**
  here, in this repository's habit of saying so.

- **Write the ADR — the next free number is 0024** — and add it to
  `docs/adr/README.md`'s index. ADRs are never renumbered and their decisions
  never rewritten. It covers the interactive layer: client-side matching over a
  payload the page already holds, the URL as the home of selection, client-side
  navigation and what it changed about the cache's lifetime, and the input idiom
  this product now has.

- **Add `SEARCH-AND-SELECTION.md` to `CLAUDE.md`'s _Where the record lives_
  table**, and update the _Current state_ section: what a user can see today
  changes materially with this story, and that paragraph is the thing readers
  trust.

- **The upward sweep, and it travels upward rather than sideways.** A story close
  sweeps that story's own documents; what a measurement here invalidates is a
  premise in an ADR, an invariant in `CLAUDE.md`, or `PRODUCT_SPEC.md`. Grep for
  each claim, correct the live sites, give an ADR a **dated amendment** rather
  than a rewrite, and leave the historical records standing. Specific candidates:
  - `VISUAL-LANGUAGE.md` says input fields have never been built and names this
    story as the consumer. That is now false, and the file owns the input idiom.
  - The icon set is recorded as closed at five members. If it gained one, every
    place that says five is a live claim.
  - Story 2.4's reversal trigger for grouping is recorded as unfired. It fired.
  - `FRONTEND-STATE.md` §7's note that nothing changes a live region without a
    user having navigated or pressed something, and its two reversal triggers.
    **Amended 2026-09-11 by Task 2.11.1: both of §7's triggers have already fired
    and been answered**, so this is a correction to make rather than a question to
    settle — a third region exists, it speaks 400 ms after a keystroke rather than
    after a navigation, and §7's "what nothing checks" paragraph gains the page-level
    gap that a fourth region would pass through unnoticed.
  - Any live claim that the only route to a second symbol is a document
    navigation. **Amended 2026-09-11 by Task 2.11.4: 2.11.4 ended it, not
    2.11.5** — search navigates client-side already (measured: the `window`
    marker survives and there is one navigation entry). The claim is asserted in
    more than one file and every one of them is live. **Amended again the same
    day by Task 2.11.5: ADR 0023's copy is swept** — its "does not certify …
    the only route is a document navigation" carries a dated amendment stating
    the narrower thing that is still true. `STORY.md`'s own two copies are
    **not** swept and are deliberately yours: they are this story's documents,
    which is what a close sweeps.
  - **Two candidates on this list are already swept and should not be re-swept.**
    `VISUAL-LANGUAGE.md`'s "input fields have never been built" was corrected by
    Task 2.11.3, and `CLAUDE.md`'s "the React Compiler rules have never fired on
    shipped code" by Task 2.11.4 — they fired twice, on the combobox, and both
    were right. Check them rather than assume; the point of the list is that a
    correction recorded is not a correction propagated.
  - **A third is swept, and the "if it gained one" above is settled: the icon set
    is SIX.** `magnifier` was added by Task 2.11.3 for `TextField`, and
    `VISUAL-LANGUAGE.md` §_No icon beyond the closed set_ already says six with
    the date. Task 2.11.5 added **no** icon — the chevron on a table row's symbol
    is the existing `chevronRight`. Verify the count rather than carrying this
    line: `grep -c '"' apps/frontend/src/components/Icon/Icon.tsx` is not the
    check; `ICON_NAMES` is.
  - **`SEARCH-AND-SELECTION.md` §3's "Back returns to an empty field" was
    falsified and swept on 2026-09-11 by Task 2.11.5** — the field keeps its
    query, because the two routes render the same module and React re-renders
    rather than re-mounts. §3 and §7's handoff row carry dated amendments and
    `TASK-09`'s bullet was corrected. **What is left for the close is the
    keyboard flow's own wording**, since 2.11.9 writes that sentence into this
    document.
  - **Count a duplicated sentence with a grep before correcting it**, and tell a
    live claim apart from a historical record. Story files record what was true
    when written; correcting those destroys the record.

- **Update `STORY.md`, `EPIC.md` and `EPICS.md`** to complete, with what is
  genuinely left in the epic: 2.12, 2.13 and 2.14.

- **Check what `pnpm verify` does not cover** and add to that list anything this
  story introduced of the same class — a claim that is true today and checked by
  nothing, with a **re-measure one-liner** beside it. Likely candidates: a
  focus-order or announcement rule enforced by one component's tests and nothing
  else; the fixture bodies staying out of the bundle now that a second surface
  imports securities; and the summary line's truthfulness under filtering.

  **One is already written and needs carrying up rather than re-deriving — added
  2026-09-11 by Task 2.11.5.** `SEARCH-AND-SELECTION.md` §8 records that nothing
  in `pnpm verify` can see whether a navigation stays client-side: jsdom has no
  history and no bundle to reload, so swapping the table's `Link` for a plain
  `<a href>` leaves **every** unit, component and integration test green while
  the product silently goes back to reloading itself on every symbol. It is held
  by `e2e/specs/security-navigation.spec.ts`, which gates a merge, and by nothing
  else. That belongs in `CLAUDE.md`'s own list with its one-liner, because the
  failure is invisible and the repair is a one-character import away from
  happening by accident.

## Amended 2026-09-11 by Task 2.11.6 — one decision to carry into the document, two entries to carry up, and two sites already swept

**A decision this story took that is recorded only in a component header and a
task file, and that the document and the ADR owe a home:**

> **One retry per failure per screen, and it belongs to the surface that owns
> the data.** Search and the tracked universe render from the same fetch, so a
> failure puts two explanations on one screen. Search states the fact and defers
> the control; the table offers the `Try again`. `FRONTEND-STATE.md` §4's rule —
> a retryable failure says waiting may help, a permanent one says it will not —
> is honoured in the **words**, in both directions, which is the half that
> survives there being one button. A browser test asserts
> `toHaveCount(1)` on the page's `Try again` buttons.

Its reversal trigger is **the first screen where the two surfaces read different
fetches**, at which point they are two failures rather than one and each owes its
own control. Epic 3's live feed is the likely first, and Task 2.11.7 may reach it
sooner if the universe table leaves `/securities/:symbol` — that route would then
hold a failure with no control on it at all, which is the trigger firing with
nothing to fire it.

**Two "what nothing checks" entries are already written and should be carried up
rather than re-derived.** `SEARCH-AND-SELECTION.md` §8 gained them on 2026-09-11:
that nothing refuses a sentence duplicating another surface's (found three times
in one afternoon, every time by a locator matching two nodes), and that nothing
notices a control being absent from a state entirely — `pnpm verify` was green
for two tasks while the field was missing from three of them. Both belong in
`CLAUDE.md`'s own list with their re-measure one-liners.

**Two sites are already swept and must not be re-swept — verify instead.**

- `CLAUDE.md`'s bundle-leak entry now names `fixtures/securities/` and carries a
  second re-measure one-liner (`grep -o "Agilent Technologies"`). The claim it
  amends was about bar timestamps only, and the securities body is by far the
  larger thing that must not ship.
- `CLAUDE.md`'s repository map described `src/fixtures/` as the recorded bodies
  of `GET /market-data/bars`. That became false the moment this task landed and
  was corrected the same day.

**One measurement this story owes is taken and is `SEARCH-AND-SELECTION.md`
§6's**: untracked, `AAPL` falls from match 2 of 99 to **match 50** for the query
`a` and off the shown slice while the total still counts it. Reconcile rather
than re-measure, unless the ranking rules have changed.

## Amended 2026-09-11 by Task 2.11.7 — one conditional settled, three entries already carried up, and the ADR's subject grew

**1. The conditional in the amendment above did not fire, and it can be struck
rather than checked.** It reads: _"Task 2.11.7 may reach it sooner if the
universe table leaves `/securities/:symbol` — that route would then hold a
failure with no control on it at all."_ **The table did not leave.** It stays on
both addresses, last and full width, and the decision is recorded with its
alternatives and a reversal trigger in `SEARCH-AND-SELECTION.md` §1's amendment.
So "one retry per failure per screen, and it belongs to the surface that owns the
data" is still true and still has a control behind it on every route, and the
trigger stays what it was: **the first screen where the two surfaces read
different fetches**, which is Epic 3's live feed.

**2. Three "what nothing checks" entries are already written and carried up.
Verify them rather than re-deriving them** — the point of this list is that a
correction recorded is not a correction propagated, and these were propagated the
same day:

- `SEARCH-AND-SELECTION.md` §8 gained **the grid's column count** and **the six
  placeholder labels naming a plan the roadmap holds**, both with re-measure
  one-liners.
- `CLAUDE.md`'s _What `pnpm verify` does not cover_ gained the same two, and its
  _Frontend_ section gained the trap behind the first: **nothing below `pnpm e2e`
  can see a layout**, and a `span N` item wider than the explicit grid grows
  implicit columns rather than being clamped. That one is the most dangerous of
  the three and is written where a frontend author will meet it rather than only
  in this story's documents.

**3. `SEARCH-AND-SELECTION.md` has two more dated amendments to fold into its
finished form**, and neither is a decision left open: §1's — the table's home —
and §4's, which records that **the identity block is the fourth
asynchronously-filled surface on this page and deliberately speaks not at all**.
The second matters to the ADR because it is the first time `FRONTEND-STATE.md`
§7's trigger fired and the answer was _silence_ rather than a fourth region.

**4. The ADR's subject is larger than "the interactive layer".** ADR 0024 as
scoped above covers matching, the URL, client-side navigation and the input
idiom. Add the shell, because it is the decision with the longest reach in this
story: **PRODUCT_SPEC.md §8.3's seven contents placed once**, on a grid of spans
rather than named areas, with the identity block and the placeholder convention
that four later epics will each add to. Four epics inherit that arrangement; an
ADR that does not mention it leaves the most consequential thing this story did
recorded only in a task file.

**5. The design source for the shell is the canvas, not `2.11-design.html`.**
Section 07 of the `Component library for MarketPulse` project — the grid map, the
identity block's four states, the placeholder treatment with its five sentences,
and the three viewports — was added on 2026-09-11 via `DesignSync`, which is ADR
0026's chain working as intended. §5 of `SEARCH-AND-SELECTION.md` adjudicates the
**mock**; the finished document should say plainly that the shell came from the
canvas and the mock's Explorer tab is a superseded reference.

**6. Two sweep candidates this task adds, both about what the next stories
inherit.** Stories 2.12 and 2.13 no longer _add_ anything to this page — they
**fill a region that already exists and already names them**. If either story's
file or `EPIC.md` describes the work as putting a chart onto the Security
Explorer, that is a live claim that has become false, and a chart dropped into a
fresh panel beside the one waiting for it is the concrete defect. Also check
`STORY.md`'s _What this story hands forward_: it hands forward a grid with five
named vacancies, which is a larger handoff than it currently describes.

## Amended 2026-09-11 by Task 2.11.8 — one measurement taken, one sweep already done, one upward candidate that did not exist, and three entries for the verify list

**1. The 518-row render figure this file asks for is taken. Reconcile rather
than re-measure**, unless the table has stopped rebuilding its rows in one pass.
Production build, Chromium, 2026-09-11: `Collapse all` (530 rows → 12) costs
**17, 19, 20, 44 ms**; `Expand all` (12 → 530) costs **69, 76, 76, 87 ms**. The
dev build is 17–27 ms and 151–222 ms, which is why the production figures are the
ones to carry. Virtualisation was declined with that measurement behind it.

**2. A new upward-sweep candidate, and it is the only one on this list that
leaves the story.** `Expand all` at 69–87 ms **exceeds PRODUCT_SPEC.md §28's
_no routine main-thread task >50 ms_**. The task's own argument is that it is
neither new (the same work happens on every first paint and always has) nor
routine (a deliberate press, once) — but that argument currently lives in one
task file, which is exactly the shape of a finding that gets re-found. Carry it
somewhere durable: **Epic 14 owns performance**, and a line in `EPICS.md`'s entry
for it, or in `CLAUDE.md`, is what stops the next person measuring it from
scratch. Do not quietly amend §28 — the target is right and this is a measured
exception to it.

**3. Story 2.4's reversal trigger is fired _and answered_, and the one live site
is already swept. Verify rather than re-sweep.** The bullet above says the
trigger "is recorded as unfired. It fired." Both halves are now stale: it fired
**and a control answers it**. `grep -rn "jump between or collapse"` finds exactly
one live site, `UniverseTable.tsx`'s `groupUniverse` doc comment, which carried
the prediction in the present tense and now carries a dated amendment beside it
rather than a rewrite. Story 2.4's own task files are **historical records of
what was true when written** and must not be corrected.

**4. The icon set is still six, and 2.11.8 added none.** The band disclosure is
the existing `chevronRight` rotated a quarter turn in CSS — one drawing in two
positions, on the argument that a seventh icon needs its own argument in its own
task. So the "if it gained one" line above stays settled at six; check
`ICON_NAMES`, as that bullet already says.

**5. The ADR's design source has a second file, and ADR 0026 has a new dated
amendment to reflect.** §5's amendment tells the finished document to say the
shell came from **section 07 of the canvas** rather than from
`2.11-design.html`. The same is true of this control and its file is different:
**`Universe navigation.dc.html`**, a second file in the same project. It is
second rather than a ninth section because `DesignSync`'s `get_file` caps a read
at **256 KiB** and the main canvas is larger — it returns exactly 262,144 bytes,
truncated mid-attribute, so a read-modify-write of that path can only publish a
file with everything past the cap deleted. ADR 0026's "the canvas is one file"
bullet carries that as a dated amendment. Two consequences for this close: the
finished `SEARCH-AND-SELECTION.md` should name **both** canvas files as design
sources, and ADR 0024 inherits a canvas that is no longer one document.

**6. `SEARCH-AND-SELECTION.md` §5 has a fourth dated amendment to fold in**, and
it settles three things the "sector jump rail — taken in principle" row left
open: the **full sector name** rather than the mock's `TECH` (because
`SECTOR_LABELS` exists so nobody derives a display string by transform);
**`Collapse all`**, which the §5 row never covered because this file adjudicated
only the rail; and **a sticky band header declined with a measurement** — set
live and scrolled 400px past, a band's viewport top read **−400px**, because the
`Panel` around the table is the scrollport and never scrolls.

**7. One verify-list candidate above is partly discharged, and three new ones
are owed.** The bullet naming "the summary line's truthfulness under filtering"
is narrower now: there **is** a control that changes which rows are on screen,
its clause is asserted at the component level as a sentence and in the browser
against `0 of 518 rows shown`, and the other half — that search leaves the
sentence byte-identical — was already asserted in `SecurityExplorer.test.tsx`.
What is still unchecked, and belongs on the list with its one-liner:

- **A jump that lands behind the sticky chrome is invisible below `pnpm e2e`**,
  and it is the same class as the grid's column count: jsdom computes no layout,
  so an element scrolled to underneath a 133px sticky masthead looks identical to
  one scrolled to correctly. It happened, it was caught by looking, and it is now
  held by **one spec** — `e2e/specs/universe-navigation.spec.ts` — whose red was
  verified by restoring the break. Re-measure: delete the
  `stickyChromeHeight()` subtraction in `jumpToBand` and confirm test 2 of that
  spec fails.
- **The rail's counts must sum to every row in the table.** That is the property
  which makes "no band the control cannot reach" true, and therefore the thing
  standing between a jump control and the `status` filter `UNIVERSE.md` §12.2
  forbids. Held by one browser test. Re-measure: drop a group from `BandRail`'s
  `groups.map` and confirm _an untracked security is still reachable through the
  rail_ fails.
- **`initiallyCollapsed` is honest API that no route uses**, and nothing would go
  red if a route started seeding it — a page that arrives with bands already shut
  is the collapse-by-default this task declined, reintroduced through a prop.
  Re-measure: `grep -rn "initiallyCollapsed" apps/frontend/src` should find it in
  the component and its stories and **nowhere under `src/routes/`**.

**8. The tab-stop figures moved again**, which matters to this file only because
`CLAUDE.md`'s _Current state_ is written from them: **556** focusable elements
expanded, **38** with every band shut, and **23** stops from the search field to
the first table link where 2.11.7 measured 8. `TASK-09` has the composition.

## Amended 2026-09-11 by Task 2.11.9 — the keyboard flow is written, the ADR's subject grew twice more, and six entries are already carried up

The walk is done and its record is
[`SEARCH-AND-SELECTION.md` §6](SEARCH-AND-SELECTION.md). Seven consequences for
this close, and only two of them are new work.

**1. "The keyboard flow from 2.11.9" is written. Fold it in rather than
deriving it.** §6 holds the numbered flow with focus stated after every
transition, the two decisions this task was handed and took, the five findings
and the two that were deliberately not acted on. What the finished document owes
it is a **home for §6.6**, which is the only part that is neither a decision nor
a repair: two open observations with reversal triggers — accessible names
reaching an assistive technology in capitals, and a table with twelve rowgroup
headers and zero data rows. Neither belongs in an ADR, because neither is a
decision; both belong in the subject document's "what nothing checks", and one
of them is already there.

**2. Two decisions with product-wide reach belong in ADR 0024**, and they are
larger than the story that produced them:

- **A disabled control stays in the tab order.** `TextField` renders
  `aria-disabled` + `readOnly` rather than the native attribute, because a
  description hung off a control with `aria-describedby` is read **when the
  control is reached** and a natively disabled one cannot be. This is now the
  contract every control after it inherits, which is the same argument §1 makes
  for why the first control decides what the rest look like. **And the
  consequence has to travel with the decision**: the state stops being
  _inactive_, so WCAG 1.4.11's and 1.4.3's exemptions stop covering its border
  and its ink — both were moved, with the measurements beside them.
- **An announcement rate is two numbers, not one.** A debounce answers _have
  they stopped?_ and **cannot tell a pause from an ending**, so below its own
  threshold it speaks once per keystroke; a floor answers _how often may this
  speak at all?_. Epic 3's socket is where a live region first has to be paced
  by something other than a person's typing, and it should inherit the pair
  rather than rediscover the inversion.

**3. `FRONTEND-STATE.md` §7 is an upward-sweep candidate it did not have
before.** §7 governs live regions and treats a rate as a per-surface judgement;
§4's own reversal trigger says that at some point "regions need a rate rather
than a per-surface judgement". The floor is the first piece of an actual rate
policy and it lives in one component's hook. Carry it, or record deliberately
that Epic 3 owns it — but do not leave a mechanism that paces a region recorded
only in this story.

**4. Two mechanisms now measure the same fact, and the close should decide
whether that is a duplication or a seam.** `AppHeader`'s `useStickyChromeHeight`
publishes the chrome's height as `--sticky-chrome-height` for
`base.css`'s `scroll-padding-top`; `UniverseTable`'s `stickyChromeHeight()`
measures the same element for `jumpToBand`. Both were written against the same
argument — that the number exists at three values and cannot be a token — and
both are correct. They are not redundant today (`window.scrollTo` ignores
`scroll-padding`), but they are two readers of one fact with no link between
them, which is the shape this repository normally refuses. Either the second
reads the first's custom property, or the reason it does not is written down.

**5. Item 7's first verify-list bullet above is narrower than it now reads.** It
says a jump landing behind the sticky chrome is held by one spec. Still true of
**the rail's** jump. What changed is that the same class of defect on **Tab** —
which no jump control is involved in — was found, fixed and is held by
`e2e/specs/search-keyboard.spec.ts` at two viewports. Carry both, and note they
are two mechanisms rather than one (item 4).

**6. Six entries are already carried up and must be verified rather than
re-derived** — the point of this list is that a correction recorded is not a
correction propagated, and these were propagated the same day:

- `CLAUDE.md`'s _Frontend_ section gained **two traps**: that a sticky header
  occludes focus and the browser's own scroll-into-view does not know it, and
  that a natively `disabled` control is not focusable so anything
  `aria-describedby` hangs off it is unreachable. Both are written where a
  frontend author meets them rather than only in this story's documents.
- `CLAUDE.md`'s _What `pnpm verify` does not cover_ gained **three**, each with a
  re-measure one-liner: that no tab stop lands behind the chrome, that every
  control carrying an explanation is in the tab order, and that a control which
  changes the page announces that it did.
- `SEARCH-AND-SELECTION.md` §8 gained **two**: that a `Region` taller than the
  viewport lands focus anywhere useful, and that the capitals finding stays
  harmless.
- `e2e/README.md` gained a section on the two properties this level alone can
  see, and its spec table and test count are re-taken — **thirteen files, 81
  tests**.
- `UniverseTable.test.tsx` carried a comment claiming a focused button's
  changing accessible name is announced. **It is not**, and the comment is
  corrected with the measurement rather than deleted.
- `SEARCH-AND-SELECTION.md` §4's rate is amended with the cadence table and §3's
  Back row points at §6.1's step 8, where the sentence it predicted wrongly is
  finally said out loud.

**7. One inherited question is answered and one figure is unchanged.** Task
2.11.8's item 4 — _"the thing to listen for hardest"_ — is **confirmed rather
than overturned**: collapsing a single band still announces only `collapsed` and
the summary line is still not spoken, and that reads correctly on the walk. What
2.11.8's argument did **not** cover is `Collapse all`, which had no
`aria-expanded` to speak and removed 518 rows in silence; it has one now. The
tab-stop figures in item 8 are unchanged at **556 / 38 / 23**.

**One trap this close should not walk into, because it was found here.**
Playwright's `toBeDisabled()` treats a native `disabled` attribute and
`aria-disabled="true"` as the same verdict. `securities-route.spec.ts`'s
"search says it cannot answer" was therefore **green in both worlds** — green
when the control was unreachable with an unreadable explanation, and green now
that it is neither. It is the right assertion for what that test is about and it
is evidence of nothing else; a note beside it now says so. Expect the same of
any assertion that names a state rather than a mechanism.

**No task is added, re-ordered or deleted, and one gap is handed forward with a
named owner.** Acceptance criterion 3 says the control "announces itself
correctly to a screen reader", and the pass was taken from Chromium's
accessibility tree — the data an assistive technology is handed — rather than
from a screen reader reading aloud. That is stated plainly in §6 and in
`TASK-09` rather than glossed. Everything mechanically checkable was checked and
five defects were fixed; what is left needs a person with VoiceOver or NVDA, and
**Epic 15 already owns the accessibility review** (`e2e/README.md`: "a green axe
run is not one"). Adding an eleventh task here would be adding one nobody in
this loop can execute, which is how a task becomes permanently deferred. So the
two observations in §6.6 are carried into that epic's entry instead, which is
this close's job under _the upward sweep_.

---

## Done when

- The deployed site serves a per-security URL cold, checked by polling rather
  than once
- `pnpm verify`, `pnpm e2e` and `pnpm e2e:deployed` all pass, and the three
  required checks are green on `main`
- `SEARCH-AND-SELECTION.md` is complete and linked from `CLAUDE.md`
- ADR 0024 exists and is in the index
- The upward sweep is done, with each corrected site named
- `CLAUDE.md`'s _Current state_ describes what a user can see today, including
  what they still cannot do
- The four tests of the bar are applied to the deployed screens and the answers
  recorded

## Notes

Two of this repository's own rules bite hardest at a close. **Measure rather than
cite** — every figure that goes into these documents is re-taken here, including
ones taken three tasks ago, because a figure that has moved looks exactly like a
figure that was mis-recorded. And **a measurement that falsifies a governing
document is swept the same day**: the failure mode this project has already had
is recording a correction and not propagating it, so the sweep is a grep and a
list of corrected sites rather than an intention.
