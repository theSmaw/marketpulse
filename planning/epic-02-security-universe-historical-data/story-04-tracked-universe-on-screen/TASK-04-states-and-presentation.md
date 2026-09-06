# Task 2.4.4 — The states, and making it look like the product

**Status:** Not started
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
