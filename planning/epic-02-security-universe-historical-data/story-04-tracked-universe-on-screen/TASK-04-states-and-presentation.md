# Task 2.4.4 — The states, and making it look like the product

**Status:** Complete
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Task 2.4.3

## Objective

Turn a correct table into a page that reads as MarketPulse — and produce each of the three
failure states rather than reasoning about them.

## What the user can see when this lands

**The same data, presented as a product rather than a dump.**

- A **summary line** — "101 securities · 11 sectors" — which is the first sentence in this
  application that states a fact about our own data
- The eleven sectors **legible as groups** rather than an alphabetical run, so the page
  answers "what do we cover?" and not only "what is in the list?"
- The **equity / sector ETF / index ETF distinction shown visually**, so it is obvious at a
  glance that XLK is the benchmark for Technology and SPY is a market proxy rather than a
  company — the distinction Story 2.3 spent a whole task establishing, made visible for the
  first time
- A **loading state** while the request is in flight, rather than a blank region that shifts
  when data lands
- A **failed state** that says the service could not be reached, leaves the rest of the page
  usable, and does not show an error message or a stack — Story 1.7's rule, and the same
  treatment `BackendIndicator` already gets
- An **empty state** that says the universe has not been loaded and names the command,
  because that is what a migrated-but-unseeded database looks like and it is a real state a
  developer will hit on their first run
- An **untracked security shown as untracked**, rather than missing — a row-level state
  beside the three page-level ones above, and the story's acceptance criterion 6

## The bar this task is held to

**This is the task the design bar lands on**, and it is not "tidy up the table". PRODUCT_SPEC.md §5.6 and `VISUAL-LANGUAGE.md`'s _The bar_ are acceptance criteria here: at the end of it, a screenshot of `/securities` has to look like a real, funded product rather than a scaffold with data in it. Correct and accessible is the floor and was Task 2.4.3's job.

Two of the four tests are genuinely at risk on a table of 101 rows and should be named before the work rather than after it. **"Is there a moment in it worth showing somebody?"** — a table has no natural one, so it has to come from somewhere deliberate: the sector structure made visible, the density made to feel considered rather than cramped, the numerals and labels set with real care. **"Does it feel alive?"** — see the motion bullet below, which is this task's, because it is the first thing in this product where content arrives asynchronously and something has to happen when it does.

## Work

- **Produce each state from a named cause rather than a flag**, which is the standard Story
  1.12 set and met: stop the backend for `failed`, point at an empty database for `empty`,
  and use a throttled connection or a route intercept for `loading`. A state produced by
  flipping a boolean in a component proves the component and not the wiring. **There are
  four, not three**: an untracked row is produced by removing a symbol from
  `apps/backend/src/universe.ts`, running `pnpm universe`, and putting it back — which costs
  nothing and is the only way to see the rendering against a row that is genuinely in that
  state
- **Render an untracked security visibly rather than filtering it, and say which number the
  count is reporting.** This is the story's acceptance criterion 6 and the amendment
  `STORY.md` took on 2026-09-06 after Task 2.3.6; it lands here because it is presentation,
  and Task 2.4.1's read already refuses to filter it away. Three things it needs. The row is
  **marked**, not merely present — and by the same rule as the kind distinction below, so
  not by colour alone; `FeedIndicator`'s marker-plus-word is the nearest precedent, and
  `BackendIndicator` is the second. The **summary line has to say which of two numbers it
  reports** — `count(*)` over the table and "how many securities we track" are different
  from the first removal onward, and today they are equal at 101, so the wrong one passes
  every check this story can run and is silently wrong later. And the tone is
  `UNIVERSE.md` §3's: "we stopped tracking this" is **information**, not a failure and not
  an error state, so it must not borrow the failed state's language or its red
- **Use the existing design language rather than inventing one.** `tokens.css` and
  `market.css` already hold the ground, the surfaces, the hairlines, the 4px grid and the
  semantic market colours; `SecurityRow` already exists from Story 1.4 and this is the first
  chance to find out whether it was the right component. If it is not, say so — that is a
  useful finding about a component built before there was data
- **Colour must not be the only encoding of the kind distinction**, per `VISUAL-LANGUAGE.md`
  and invariant 6's spirit. The precedent is `AnomalyBadge`, which writes the band's name
  inside its fill, and `FeedIndicator`, whose marker is a shape rather than a colour. Two
  price directions in this product differ by **1.05:1 in greyscale**, which is the measured
  reason this rule exists
- **Decide grouping versus sorting** and record it. Grouping by sector makes coverage
  legible and makes finding one symbol harder; sorting alphabetically does the reverse.
  Search arrives in Story 2.11 and changes which of those matters, so prefer the one that
  serves _this_ page and say what would reverse it
- **Do not add a sort control, a filter or a density toggle.** They are each a small piece of
  state and a second thing to keep correct, on a page whose job is to show 101 rows, and
  they are the kind of thing that arrives instead of the next story
- **Define the first motion tokens, because there are none and this is the first screen
  that needs any.** `VISUAL-LANGUAGE.md` specifies colour, ink, geometry and spacing to the
  pixel and says **nothing at all** about motion — no durations, no easings, no opinion on
  what happens when content arrives. For a live market application that is the largest gap
  in that document, and it is the reason test 4 currently fails outright. This task owns the
  thin first cut rather than the whole system: **two durations and one easing**, as tokens
  beside the others, used for the loading-to-loaded transition on this page. Do not build a
  motion system for animations nothing has yet — Epic 3's live price updates are where this
  becomes load-bearing and where the full vocabulary should be decided, against something
  that actually moves.
  Two constraints that come with it. **Respect `prefers-reduced-motion`** from the first
  token, because retrofitting it means finding every animation later. And **motion must not
  make a number harder to read** — a value that fades or slides while an analyst is reading
  it is worse than one that changes instantly, which is the specific reason the full
  vocabulary waits for Epic 3 rather than being guessed here
- **Check the contrast of anything new against the page ground**, because Task 1.12.4 found
  a real 2.09:1 violation on exactly this kind of secondary label where 4.5 is the threshold

## Done when

- A screenshot of this page passes the four tests in `VISUAL-LANGUAGE.md`'s _The bar_, and
  the judgement is recorded rather than assumed
- The first motion tokens exist, are used for the loading-to-loaded transition, and honour
  `prefers-reduced-motion`

- All three non-loaded page states are produced from a named cause and seen on screen, and
  so is an untracked row — four causes, not three
- An untracked security is rendered, visibly distinguished without relying on colour, and
  the summary line says which of the two counts it is reporting
- The kind distinction is legible without colour
- The summary line is derived from the response rather than written down — nothing anywhere
  states 101 as a constant, which is `UNIVERSE.md` §8's rule arriving on the frontend
- Grouping versus sorting is decided with a stated reversal trigger — noting the API already
  returns rows ordered by symbol, so grouping is this page adding structure rather than
  correcting an unordered response
- `pnpm verify` passes and the artefact's new size is recorded

## Notes

This is the first page in the product with real content, so it sets the pattern for every
table after it. It is worth more care than its size suggests — and it is also the task most
likely to expand, because everything on it could be a little better. The scope fence is the
list of things deliberately not added above.

---

## Amended 2026-09-06, after Task 2.4.2

One design obligation this file did not carry, found by measuring the wire rather than by
reading the schema. It changes nothing about this task's scope or position.

### An absent sector needs a rendering, and a blank cell is the wrong one

Four of the 101 securities — `SPY`, `QQQ`, `DIA`, `IWM` — have a `sector` of `null`, and
that null is **the complete and correct answer** rather than a missing value: an index proxy
does not belong to a sector. Task 2.3.1 rejected reading it as "unclassified" so firmly that
`Security` is a discriminated union instead of one interface with a nullable field, purely
to keep those two meanings apart in the type system.

**A blank cell puts them back together.** It is indistinguishable from a row whose sector we
have not worked out, which is the inference the domain model spent a whole task refusing —
and this page is where that refusal either survives contact with a screen or quietly does
not. So an index proxy's sector cell states the absence rather than being empty, in the same
register as everything else on the page, and it should read as a property of what the thing
_is_ rather than as missing data. It is the same distinction the kind column carries, which
is worth noticing before drawing both: if the kind column already says "index ETF", the
sector cell may only need to not contradict it.

Task 2.4.2 makes this reachable rather than theoretical. Declaring the field the obvious way
sent SPY's sector to the wire as the **empty string** — falsy, so every branch kept working
while the cell rendered blank — and `type: ["string", "null"]` is what fixes it at the
transport. The wire is now honest; this task decides whether the screen is.

`industry` is null for all fifteen ETFs and needs the same judgement, and it may well
deserve a different answer from `sector`: an ETF has no industry for the same structural
reason, but nothing in the domain model was built to protect that distinction, so the cost
of getting it wrong is lower. Say which and why.

### Two smaller things the shipped contract settles

**The summary line's two numbers are both derived from the array**, because 2.4.2 put no
`count` on the wire — rows held is `securities.length`, securities tracked is the rows whose
`status` is `"active"`. That is the "nothing anywhere states 101 as a constant" clause in
_Done when_ already satisfied by the transport rather than by discipline.

**Provenance is on the envelope and is optional**, so if this page ever renders "last
checked on …" it has to handle its absence — which is not an error and means either an empty
list or, from Story 2.7, rows that no longer agree. Rendering provenance is **Story 2.14's**
and is not in this task's scope; this note exists so that if it is added here anyway, it is
added knowing the field can legitimately be missing.

---

## Amended 2026-09-06, after Task 2.4.3

Five things this file did not know, and the first is the one that changes the size of the
work rather than only its detail. None changes this task's position, and nothing moved to or
from another task.

### There are TWO failure renderings to design, not one

This file says "a **failed state** that says the service could not be reached", singular.
Task 2.4.3 shipped **two**, because the seven transport outcomes collapse onto two failures a
person can act on rather than one:

| `failure`        | What ships today                                                              | What it means                                         |
| ---------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| `unreachable`    | _The service could not be reached, so the tracked universe is not available._ | Nothing arrived. Is it up? Are we allowed to call it? |
| `answered-badly` | _Something answered at the service's address and it was not this service._    | Something is there and it is the wrong thing          |

They are separate because they send a reader to two different places, and a single
"something went wrong" would send them to the wrong one half the time. So this task designs
**two** sentences in one visual treatment rather than one — and the treatment has to make
them read as the same _kind_ of thing, or the page will look like it has two unrelated
error states.

### The first correlation id in the product is on screen, and it has no typeface

`answered-badly` renders a **`Reference: <uuid>`** line when the response carried an
`x-request-id`, which is the first time this product has put an internal identifier in front
of a user. It obeys `api-client.ts`'s rule verbatim — the whole UUID, never a prefix,
labelled, only beside a failure — and that rule is not this task's to revisit.

**What is this task's is that it is set in the body face, and it should not be.** A monospace
face is the obvious right answer for a string somebody is expected to transcribe, and Task
2.4.3 deliberately did not add one: `tokens.css` has exactly one family, `--font-sans`, and a
second is a change to the **design language** rather than to a page. That makes it
`VISUAL-LANGUAGE.md`'s and therefore this task's, alongside the motion tokens it already
owns — and it is the same shape of decision, a thin first cut of a vocabulary that does not
exist. `base.css` already sets tabular figures globally, which is the half of the problem
that matters most, so the honest options are a mono token, letter-spacing, or deciding the
body face is good enough and saying why.

### `SecurityRow` was not used, and that finding is half-made

This file asks whether Story 1.4's `SecurityRow` "was the right component" and says to
record the answer if it was not. Task 2.4.3 did not use it, and the reason is available
without re-deriving it: `SecurityRow` composes `PriceChange`, `AnomalyBadge` and
`FeedIndicator` into a `<tr>`, and **this page has no price, no anomaly score and no feed
state** — three of its four columns are things Epics 3 and 5 bring. So a component built
before there was data turns out to have been built for a _different table_ from the first one
that arrived, which is a real finding rather than an oversight and is worth stating plainly.
What is left for this task is the forward-looking half: whether `SecurityRow` is what Story
2.12's security list becomes, or whether the table this task styles is.

### The absent-sector rendering already exists — judge it, do not invent it

The amendment above asks for an index proxy's null sector to state the absence rather than
be blank. Task 2.4.3 ships an **em dash**, and its own comment says the choice of glyph is
this task's. So the decision is now a review rather than a design: `SPY` reads
`SPY · SPDR S&P 500 ETF Trust · — · Index ETF`, and the question the amendment actually
poses is still open — the kind column already says "Index ETF", so the sector cell may only
need to not contradict it. `industry` is not rendered at all today, so its judgement is
untouched.

### The promotion trigger has fired, and this is the task it fires on

Task 2.4.3 left the page in `src/routes/` rather than `src/components/`, on Task 1.5.3's
test — _does it have states worth reviewing side by side?_ — with the reason stated: it has
four, so the answer is yes, but the states are **this task's** subject and promoting the
table before the task that designs them would fix a shape one task early.

That deferral expires here. Designing four states without a workshop grid to see them side by
side is exactly the thing `scripts/check-stories.mjs` exists to prevent, and moving the table
into `src/components/` makes it owe an `AllPermutations` story — which is not overhead, it is
the instrument this task needs. `Region` is the precedent for the move and for its timing:
it lived beside the route it served until it acquired a failed state, and then it moved.

Note what moves and what does not. The **hook stays** in `src/`, and the **route module
stays** a route module holding the page's frame — what is workshop material is the table and
its four states, rendered from props, with no `fetch` in it. That is also what makes the
states reviewable without a backend, which is the property `BackendIndicator` has and the
reason it could be designed before it was wired.

---

## What was built — 2026-09-06

`apps/frontend/src/components/UniverseTable/` is the new component (four files), the route
module is down to the page's frame, and `tokens.css` gained a mono family and the product's
first motion tokens. `pnpm verify` is exit 0; the artefact is recorded at the foot of this
section.

### The promotion happened, and what moved is narrower than "the page"

`SecurityExplorer.tsx` went from 225 lines to 71. The **hook stays** in `src/`, the **route
module stays** a route module holding the heading and the `Region`, and what moved is the
table and its four states, rendered from one prop with no `fetch` in it. That is what makes
every state reviewable in the workshop with no backend running — the property
`BackendIndicator` has and the reason it could be designed before it was wired.

It takes `view: SecuritiesView` rather than four props, which is the **opposite** of
`BackendIndicator` on purpose and the difference is recorded beside the component.
`SecuritiesView` is not a hook's internals — it is what this page knows, and its whole
reason for being a discriminated union is that the impossible combinations cannot be built.
Four props would hand the renderer back the eight-way boolean space the union removed. The
import is `import type`, so it is erased.

### Grouping beat sorting, and the reversal trigger is size rather than search

Eleven sector bands in `SECTORS` order, each headed by the sector name, its **benchmark
ETF** and a right-aligned count, with the sector's own ETF as the first row of its group and
the four index proxies in a final `Market proxies` group.

- **Grouping wins because it answers the question this page is for.** "What does MarketPulse
  cover?" is a question only this screen answers; "where is NVDA?" is one **Story 2.11's
  search** answers far better than any ordering can. The alphabetical run was optimising for
  the job that is about to get a proper tool.
- **The order is `SECTORS`, not the counts.** Ordering by depth reads well exactly once and
  then reshuffles the page the day one security is added.
- **Reversal trigger:** the universe reaching Story 2.3's stated ceiling of 500, at which
  point one group is longer than a screen and groups need to be jumpable or collapsible —
  which is a control, and controls are out of scope here.

`Benchmark XLK` in the band is the **first time this product has rendered `SECTOR_ETFS`**,
which is the domain table Epic 5's relative-move calculation also reads. It is the one fact
on the page that comes from the domain rather than from the database.

### The Sector column was removed and Industry took its place

Grouping by sector makes a sector cell the same word repeated down every row of a group,
directly under a heading that already says it. The freed column carries `industry`, **which
the wire has always sent and nothing had ever rendered**. So the page shows strictly more
than Task 2.4.3's did, with less repetition, and story acceptance criterion 2's four fields
are all still on screen — the sector is stated once per group instead of once per row.

That also settles the two amendments about absent values, and it settles them together:
`NOT_APPLICABLE` is one em dash used by both the null `industry` on all fifteen ETFs and, in
the `Market proxies` band's own words, the null `sector` on the four index proxies. **The em
dash is kept and the reason it is now enough is the grouping**: Task 2.4.3 flagged that a
bare dash is indistinguishable from data we failed to load, and what changed is the context
— every row sits under a band that names its sector or says in words that it has none, and
the Kind column names the row as an ETF. Spelling it out in the cell would be the third copy
of a fact already stated twice above it.

### There are two failure renderings and they share one treatment

`unreachable` is a hollow marker and the word **no response**; `answered-badly` is an amber
square and **unexpected response**. Both then give a headline sentence and an action
sentence, and only the second has an id to offer.

The treatment is **`BackendIndicator`'s marker-plus-word language, deliberately**: the
indicator in the chrome is reporting the same two conditions at the same moment, and a
second vocabulary for one fact would read as two unrelated things going wrong. **Nothing is
`--status-error` red** — §36 makes a lost connection a product state, and the hook stores a
value rather than throwing, so no boundary is involved. The cost is the one
`BackendIndicator` already records: the marker idiom is now held by imitation in **three**
stylesheets, so a change to it means editing all three.

### The untracked row, and the count that says which number it is

Three encodings and none is hue: a hairline **chip** reading `No longer tracked`, the row's
ink receding to `--ink-secondary` (6.66:1 on white — `--ink-disabled` is 2.32:1 and is the
mistake Task 1.12.4 already found on this kind of label), and the row keeping its place in
its sector. No red, no `role="alert"`, no error vocabulary: `UNIVERSE.md` §3's rule that "we
stopped tracking this" is information.

The summary line reports **`101 securities tracked`** where the figure is the count of
`active` rows, with `1 no longer tracked` appearing as its own clause only when there is
one. Both are derived from the array; nothing anywhere states 101 as a constant.

### The first motion tokens, and reduced motion answered at the token layer

`--motion-duration-quick` (120ms), `--motion-duration-settle` (240ms) and
`--motion-ease-standard`. Three consumers: the table's one-time arrival, the row hover, and
the loading skeleton's breathe (derived as `settle * 6` rather than a third token).

**`prefers-reduced-motion` is honoured once, in `tokens.css`, by setting both durations to
`0ms`.** That is the whole argument for the durations being tokens: a per-component media
query is a thing each future author has to remember and whose failure is silent. Proved in a
browser rather than asserted — the media rule exists and sets both tokens, and forcing the
tokens to `0ms` takes the wrapper's `animation-duration` and the row's `transition-duration`
to `0s` and back to `0.24s` on removal. So the consumers genuinely read the tokens.

**Epic 3 owns the full vocabulary**, and waiting is the decision rather than the deferral:
the hard question is what happens when a _number_ changes, and a vocabulary guessed against
a table that arrives once and sits still would be guessed against the easy case.

### A mono face is the second family, and it is a change to the design language

`--font-mono`, with the rule that comes with it written beside it: **it is for a value
somebody is expected to transcribe or type back**, never for numbers in tables. Two
consumers, both here — the correlation id beside `answered-badly`, and `pnpm universe` in the
empty state. `base.css`'s global `tabular-nums` fixes a _column_; it does nothing for `l`
against `1` in a UUID that has no column to align to.

### Four states, four named causes, all produced against the running system

| State               | Cause                                                                   | What was seen                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Untracked row       | `GILD` removed from `universe.ts`, `pnpm universe`, then restored       | `100 securities tracked · 11 sectors · 15 ETFs · 1 no longer tracked`, GILD grey in Health Care with its chip, on its original row |
| Empty               | `DELETE FROM securities` against the local database                     | "The universe has not been loaded." and `pnpm universe` in mono                                                                    |
| No response         | the backend's listener killed                                           | hollow marker, `NO RESPONSE`, page otherwise usable, no fallback                                                                   |
| Unexpected response | an impostor on 3000 answering 500 with an `ApiError` and `x-request-id` | amber square, `UNEXPECTED RESPONSE`, `Reference 88374ebd-d234-4147-9be2-512d2ea60a0e` in mono                                      |
| Loading             | an impostor that accepts and never answers                              | the sentence plus seven breathing skeleton bars                                                                                    |

`apps/backend/src/universe.ts` is **byte-identical** to where Task 2.3.7 left it, confirmed
by `git diff`, and the local database holds 101 rows all `active` again.

### Three things measured that the plan did not anticipate

**Sticky column headings are inert inside a `Region`, and it is `overflow: auto` that
disables them.** They were written, shipped in a first draft, and then measured **not
working** — `Region` declares `overflow: auto` so a region sized by the landing grid scrolls
its own content, and an ancestor with a scrolling overflow becomes the scrollport a sticky
descendant is measured against. On this page that region is never height-constrained, so it
never scrolls, so the headings have nowhere to stick and travel up the page with everything
else. **The `overflow: auto` that does nothing to the layout here is what silently kills
document-level sticky inside it.** All three ways back cost more than the feature: overriding
a shared component's overflow from outside, a second scrollbar inside a page that already
has one, or lifting the table out of `Region` and losing the landmark, the heading and the
boundary. Removed, with the finding written where the next person will reach for it.

**The sector bands are exactly what makes axe inconclusive, and that was measured rather than
assumed.** The page is **0 violations / 31 passes / 1 incomplete** (`th-has-data-cells`, on
the table). Removing the eleven band rows from the live DOM and re-running the rule gives
**0 incomplete / 1 pass**; putting them back restores it. So it is attributable rather than
mysterious, it is inconclusive rather than failing, and it sits on the same footing as the
`color-contrast` inconclusive the landing route has carried since Story 1.5.
`e2e/support/axe.ts` already attaches incompletes as annotations that cannot fail a gate.
Whether a screen reader announces the band _usefully_ is Task 2.4.5's, and that is the
question worth asking rather than this number. `contrastPassNodes` is **21**, so the renderer
computed real styles — Task 1.13.6's blind-renderer check satisfied here too.

**`scope` had to be `rowgroup`, not `colgroup`.** The band labels the rows beneath it inside
its own `<tbody>`, which is what a rowgroup is; `colgroup` claims it heads a span of columns.
The change moves the element's ARIA role from `columnheader` to `rowheader`, which four test
queries had to follow — worth knowing before writing an assertion against a grouped table.

### `SecurityRow` was not used, and the forward-looking half of that finding

Task 2.4.3 did not use Story 1.4's `SecurityRow` and this task did not either. The reason is
unchanged: it composes `PriceChange`, `AnomalyBadge` and `FeedIndicator`, and **this page has
no price, no anomaly score and no feed state** — three of its four columns are things Epics 3
and 5 bring. So a component built before there was data was built for a _different table_
from the first one that arrived.

The forward-looking half: **`SecurityRow` is what Story 2.12's security list becomes, not
this table.** The two are different objects. This one answers "what do we cover?" and is
therefore grouped, static and complete; that one answers "what is happening?" and is a live,
sorted, per-security view where a price, a change and an anomaly band are the point.
`UniverseTable` should not grow price columns to become it. What they will share is the
row's _type hierarchy_ — the ticker strong, the name primary, the classification secondary,
the furniture at micro-label — and if that ever needs to be one thing, it is a shared cell
vocabulary rather than a shared row component.

### The route keeps its name

Task 2.4.3 handed over whether `/securities` should be renamed now that its first content is
the universe rather than one security. **No.** §8.3 names this experience the Security
Explorer and lists a price chart, filings and connected securities among its contents;
Stories 2.11 to 2.13 build those into this same screen. Renaming it after the one thing it
happens to hold today would move the heading, `AppHeader`'s link and two browser specs, for
a name with a shorter life than the route.

### The design bar, judged rather than assumed

1. **Would a stranger believe this is a real, funded product?** Yes. The warm ground, the
   near-black band rules and the four typographic registers in a row are the reference's own
   idioms rather than a table library's defaults.
2. **Does it look designed rather than defaulted?** Yes, and the test is that every default
   was displaced by a decision: the sector cell was removed rather than styled, the count
   column is right-aligned so eleven of them can be compared at a glance, the bands take the
   _page_ ground rather than the sunken one because the sunken grey is 1.03:1 against white
   and invisible at band size, and the column proportions exist because a `width: 100%` table
   gives all of its slack to the last boundary.
3. **Is there a moment worth showing somebody?** The sector bands. `Technology · BENCHMARK
XLK · 13` repeated eleven times says "we cover eleven sectors and here is the yardstick
   for each" — which is a product statement, where an alphabetical list of 101 rows is a
   dump. This is the page's one bold thing and everything around it is deliberately quiet.
4. **Does it feel alive?** More than it did, and honestly not much more. The table arrives
   rather than appearing, rows respond to the pointer, and the wait breathes. That is the
   right amount for a screen with no changing numbers on it — and it is the reason the full
   motion vocabulary is Epic 3's, where something actually moves.

**What was deliberately not added**, which is the scope fence this file set: no sort control,
no filter, no density toggle, no search, no click-through, no pagination, and no proportional
"depth" bar in the band — the count and the alignment already answer the coverage question,
and a bar would have been decoration competing with the thing it decorated.

### Figures

- `pnpm verify` **exit 0**. `pnpm test` is **344** (68 + 146 + 130); `pnpm test:process` 14.
- The frontend suite is **130 across 15 files**, up 13: `UniverseTable.test.tsx` is eleven
  and `SecurityExplorer.test.tsx` gained two, and the split is deliberate — the route's tests
  drive the real read path through a stubbed `fetch`, and the component's drive presentation,
  so a change to what a row looks like does not go red in a test about a transport.
- **The artefact moved**: **356,324 B** of JavaScript (`3c02056c…`) against Task 2.3.8's
  348,250, and **17,905 B** of CSS (`66ad6676…`) against 12,128 — `index.html` 1,101 B
  (`e4115c91…`) and `staticwebapp.config.json` 300 B, for **375,630 B over four files at 284
  modules**. The CSS grew more than usual in proportion because this is the first component
  in the product with a stylesheet of any size.
- The bundle is clean: `AllPermutations`, `UniverseTable`, `stories.module` and the fixtures
  all return **zero** in both emitted files, so the workshop is outside the artefact exactly
  as it has been for six stories.

## In plain language — what this actually did, and where the product is

**Before this task, MarketPulse could show you its list of companies. After it, MarketPulse
can show you what it covers.** Those sound like the same thing and they are not, and the
difference is the whole point of the work.

The previous task put real data on the screen for the first time — 101 rows in alphabetical
order, correct and honest and looking exactly like the output of a database query. This task
turned that into a page. It is now organised by sector: eleven bands down the page, each
naming a slice of the market, how many companies we follow in it, and which fund the industry
uses as that sector's yardstick. Underneath the eleven sits a twelfth group for the four
whole-market funds — SPY, QQQ and the rest — which belong to no sector at all, and the page
says so in words rather than leaving a blank space for you to interpret.

That reorganisation is the answer to a question a stakeholder actually asks, which is "what
does this thing know about?" You can now see in about three seconds that we cover technology
most deeply, that we have the benchmark fund for every sector, and that the market proxies are
a separate kind of thing. None of that was legible in an alphabetical list.

**Four smaller decisions that are worth knowing about, because each one is a judgement rather
than a detail.**

_We dropped a column and gained information._ The old table had a "Sector" column, which after
grouping would have repeated the heading above it on every single row. We removed it and put
"Industry" there instead — data the server had always been sending and that nothing had ever
shown. So the page displays more than before while looking less repetitive.

_We designed what it looks like when things go wrong, and there are more failures than
anyone expected._ A page like this has four states, not one: it can be loading, it can have
data, it can be correctly connected to a database that nobody has filled in yet, and it can
fail. And "fail" is really two different things — nothing answered at all, versus something
answered and it was not us. Those send an engineer to two completely different places, so
they get two different messages. Crucially, **we produced every one of these for real** rather
than faking them: we deleted the data, we killed the server, we stood up a fake server that
answers wrongly, and we photographed what a user would see each time. A state you have only
ever tested by flipping a switch in the code is a state you have not tested.

_Nothing that goes wrong here is painted red._ That is deliberate and it is a product
principle, not a style preference: this is a market-monitoring tool, and a disconnected feed
or an unavailable service is a normal condition to report calmly, not an emergency. Red is
reserved for something genuinely broken. The same logic covers a company we have stopped
tracking: it stays on the page, greyed, labelled "no longer tracked", because it is
information rather than a fault — and because when we start storing years of price history,
the history of a company we dropped is still real history we will need for the replay feature.

_The page now moves, slightly, and that was a gap in the design system._ The design guide
this product is built to specifies colours, spacing and type down to the pixel and said
**nothing at all** about motion — which for a live market application is a real hole. We
filled the smallest useful part of it: the table now arrives rather than snapping into place,
rows respond to your cursor, and the loading state breathes gently instead of sitting there
looking frozen. We deliberately did **not** design the rest of it, because the hard question —
what should happen when a _price_ changes on screen — should be answered against real moving
prices in the next epic, not guessed against a static table now. And anyone who has asked
their computer to reduce animation gets none of it, which we built in from the first line
rather than retrofitting.

**Where this leaves the product.** The Security Explorer is now the first screen in
MarketPulse that a stranger could look at and believe is a real, funded product rather than
a scaffold with data in it. That was an explicit requirement — visual quality is written into
the product specification as an acceptance criterion, not as polish to be done later, on the
reasoning that polish deferred is polish that never happens. This is the first task where
that requirement had a screen to land on, and the patterns it settles — how a table of
securities looks, how a sector is presented, what loading and failure look like inside a
region — are inherited by every table this product builds after it.

**What you still cannot do**, so nobody demonstrates this and promises more than it is: you
cannot search, you cannot click a company to open it, and there are no prices, no charts and
no volume. Those are Stories 2.11 to 2.13 and Epic 3. The page says so on itself, in the line
under its heading, rather than leaving the absence looking like a bug.

**Next**, Task 2.4.5 takes the same screen through a keyboard and a screen reader and puts it
behind the automated accessibility gate, and Task 2.4.6 deploys it and confirms all of the
above against the live site rather than a laptop.
