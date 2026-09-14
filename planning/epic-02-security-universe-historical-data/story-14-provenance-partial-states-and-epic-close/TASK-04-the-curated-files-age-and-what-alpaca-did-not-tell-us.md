# Task 2.14.4 — The curated file's age, and what the market-data provider did not tell us

**Status:** Complete
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1, 2.14.2, 2.14.3 (which creates the component this adds to)

> **Amended 2026-09-14 by Task 2.14.1.** Three of this task's bullets asked for a
> decision that [`PROVENANCE.md`](PROVENANCE.md) §5 has now taken, and two of them
> it took the **other way**: the date is stated in full rather than as an age, and
> a stale file gets **no mark**. The landing place also moved — it is a clause on
> Task 2.14.3's `SourceNote`, **not** the identity block and **not** the universe
> table. Edited in place.

> **Amended 2026-09-14 by Task 2.14.3, which built the component this joins.**
> Three things below are now decided by what shipped rather than open: the date
> formatter **exists and must be reused**, the component's shape is known, and
> this task's clause is what makes the note appear on a zero-bar page at all.
> Edited in place; the objective and the wording are untouched.

## Objective

Render the metadata provenance the wire has carried since Story 2.9 and no
screen has ever shown: that a security's **sector and industry are curated by
this project**, not supplied by the market-data provider, and **when that
classification was last retrieved**.

This is the task that pays off the column Story 2.3 argued about.
`classification_retrieved_at` exists for exactly this, `GET /securities` already
serves `provenance.profile` and `provenance.classification` — each a source and
an ISO instant — `use-securities.ts` already holds it, and **nothing renders a
character of it**.

## What the user can see when this lands

**A sector on the Security Explorer stops being an anonymous fact.** It says
where it came from and how old that judgement is. A reader who assumed the
sector arrived with the prices learns that it did not — which matters the moment
Epic 5 scores a security _relative to its sector_ and Epic 6 clusters the
topology by one.

## What is already decided and must not be re-taken

- **The provenance is per field group, not per field** —
  `securities-response.ts`. `profile` and `classification` each carry a source
  and a `retrievedAt`; `kind` deliberately carries none, because it is a
  judgement rather than a retrieval and a timestamp on it would be a lie about
  what kind of fact it is.
- **`classification` is stated and `profile` is not** (§5.2). The scope names the
  concern exactly: sector and industry did not come from the market-data provider
  and the UI must not imply they did. Nobody mistakes a company's **name** or its
  **listing exchange** for a market observation; a sector sitting above a price
  chart is precisely the field that can be read as one. The condition that earns
  `profile` a line of its own: **the first profile field that is a number** — a
  market cap, a share count — because then it is a figure and §35 applies.
- **The note names the field GROUP, never the source string** (§5.2).
  `FieldGroupProvenance.source` is a free `string`, deliberately, so that a
  provider can replace `curated` later — which means **no `Record<…>` guard can
  ever give it words**, and a renderer printing `s&p-500-gics + curated ETFs` at a
  reader is printing an internal slug. The slug stays in the response for an
  operator. This is a discovery rather than a preference and it is the reason the
  wording below is what it is.
- **`provenance` is `null` when the server declined to make a claim**, and
  `use-securities.ts` already models that. A null is a state to render, not a
  field to default.
- **The words for a sector live in `SECTOR_LABELS`**, not in a component.
- **One curated file today means one pair of provenance values for every row**,
  and `securities.ts` records why that changes: the day profile fields come from
  Alpaca while classification stays curated, rows retrieved on different days
  stop sharing a pair. Do not build something that only works while they agree,
  and do not build for the split before it exists.

## Work

- **Add a clause to `SourceNote`**, the component Task 2.14.3 built — which is
  a third field on `SourceNoteView` (`feeds`, `prices`, and this), a third term
  in the `dl`, and a third argument to `toSourceNote`, whose two views become
  three. The route already holds what it needs: `SecurityExplorer` calls
  `useSecurities()` for the identity block and the table, so this clause reads a
  fetch the page already makes and adds none. `hasClauses` is the predicate that
  already decides whether the note draws at all, and it needs one more term.

  Not the identity block, and — settled — **not the universe table**: §5 keeps this off
  a 518-row surface, which also means Task 2.14.8's re-measure is a confirmation
  rather than a reading of markup this task added. If a later reading of 2.14.2's
  canvas argues for the table after all, that is a decision with a measurement
  attached to it and 2.14.8 is the place it is taken.

- **The words, settled** (§5.2): _"Sector and industry are curated, not from the
  market feed. Last checked 8 September 2026."_
- ~~**Age, not a raw instant.**~~ **A full date, and not a relative age**
  (§5.3). A relative age is computed against the **browser's clock**, which this
  repository fences off for market instants for good reasons, and an ISO string
  is a machine's spelling — so `8 September 2026`, in body text. The formatting
  ~~goes beside the existing `formatMarketInstant` rather than in a component;
  note this one is a **date without a market session behind it**, so it is a
  different function rather than a reuse.~~ **Written already — reuse it**
  (2026-09-14, Task 2.14.3). `components/SourceNote/source-note.ts` holds
  `formatFullDate`, which turns a market date into `8 September 2026`, and a
  twelve-member `MONTH_NAMES` table beside it. The retrieval clause takes the
  same path this one needs — an ISO instant through `marketDateAt` and then that
  formatter — so writing a second one here would be a second table of month names
  for one vocabulary, which is the drift this story spends its time preventing
  one layer up. If it needs to be shared more widely than one module, move it;
  do not copy it.
- **The `null` provenance state renders**, and it says _we do not claim_ rather
  than showing an empty space. `SecurityIdentity`'s existing absence states and
  their markers are the idiom: a marker shape carries "we don't know" separately
  from the words. **One tension to resolve deliberately rather than inherit**
  (2026-09-14): as shipped, `SourceNote` carries **no marker at all** — it is
  entirely typographic, and the recession is done by size, the label column and
  position. A marker added for this one clause would be the first on the surface,
  and the question is whether _we do not claim_ earns one when _these prices are
  unadjusted_ does not. Take it as a decision with a sentence beside it; the
  answer may well be yes, since an absence is the one thing on this surface that
  is not a claim.
- **Do not imply the market-data provider supplied it**, which is this bullet's
  entire point and the scope line that named it. `Source: MarketPulse curated`
  and `Source: Alpaca` are different claims and the UI has been making neither.
- ~~**A stale file is visible.** Decide whether age is merely stated or marked.~~
  **Settled: stated, never marked** (§5.3). There is no threshold and no amber.
  The argument is an ordering one rather than a taste one: `pnpm universe:check`
  already exists, compares the curated universe against the vendor and changes
  nothing, and **the honest path to a staleness mark is to put that check on a
  schedule first** — so that _overdue_ means a run that did not happen rather than
  a date somebody eyeballed. A mark with no cadence behind it is a claim nothing
  checks, which is how a stated invariant quietly stops being true. **Do not add
  one here**, and if the date looks uncomfortably old on screen, that is the
  disclosure working.
- **Stories for: fresh, old, absent provenance, and a security the universe does
  not hold.** The last already has a rendering; it must not regress. ~~Add the
  no-bars case too, where `SourceNote` renders nothing~~ — **answered before this
  task starts, and it is the consequence worth reading twice.** §0.1's rule is
  **per clause** since 2026-09-14 and Task 2.14.3 implemented it that way
  (`hasClauses`, and a `null` per clause rather than for the note): the
  classification's data is the **universe** answer, which has resolved on a
  zero-bar page, so this clause draws and the note renders **with it alone**.
  So this task is what makes the note appear on every zero-bar page — which is
  **every page CI renders**, since CI's store is 518 securities and no bars. Add
  the story, and expect the knock-on: three later tasks currently say the note is
  absent there, and each carries an amendment pointing here. The existing
  `NoBars` story in `SourceNote.stories.tsx` stops rendering nothing and becomes
  the one-clause shape; its text says so today and must be corrected rather than
  left.

## Done when

- The classification's claim and its date render on the Security Explorer, as a
  clause of `SourceNote`, in the canvas's placement.
- **No source slug reaches the screen** — the group is named, not
  `s&p-500-gics + curated ETFs`.
- The `null`-provenance and not-found states render deliberately and are in
  stories.
- No screen implies the market-data provider classified anything, and no screen
  marks the file stale.
- **Nothing was added to the universe table.** If that changed, its cost was
  measured and the number is in Task 2.14.8's record rather than asserted to be
  small.
- `pnpm stories`, `pnpm verify` and the frontend suite pass; the page was looked
  at with `pnpm probe` at 1440 and 390 before any suite ran.

## Notes

`GET /securities` is the request the whole application makes once and shares.
Nothing here should add a second request, and if something appears to need one,
the fact wanted is probably already in the body. `use-securities.ts` has held
`provenance` parsed and typed since Story 2.10 and **nothing has ever rendered a
character of it** — this task is pure rendering, and if it finds itself editing a
route, it has gone wrong.

Task 2.14.6 leans on the same response for a different reason — a security absent
from `coverage` is one we hold nothing for. Two clauses of one screen now read two
keys of one body, which is the shape `SecuritiesResponse`'s envelope was argued
for.

---

## What was done

**A third clause on `SourceNote`, reading a fetch the page already makes.** No
route was edited, no request was added, and `use-securities.ts` has held
`provenance` parsed and typed since Story 2.10 — this was pure rendering, which
is what the Notes section predicted and is the one thing that would have meant it
had gone wrong.

- `source-note.ts` gains `ClassificationClause`, a third field on
  `SourceNoteView`, a third term in `hasClauses`, and two more arguments to
  `toSourceNote` — the universe view and the symbol. The words live there
  (`CLASSIFICATION_CLAIM`, in three pieces so the group can carry the emphasis),
  not in JSX, which is §9's rule.
- `SourceNote.tsx` gains a `Classification` term. Four props, still no hook and
  no `fetch`.
- `SecurityExplorer.tsx` passes `useSecurities()`'s view and the address's
  symbol. That is the same fetch the identity block and the table already read.
- Three new stories — the undated claim, a symbol the universe does not hold, a
  universe still in flight — the `NoBars` story corrected from _renders nothing_
  to its one-clause shape, three more rows in the permutation grid, and fourteen
  new tests across the two test files (18 to 32).

### The defect the wording could not have caught

**The curated date is not a market instant, and reading it as one puts it a day
early.** `UNIVERSE_PROVENANCE` holds `checkedOn: "2026-09-08"` — a date a person
types and reviews in a diff — and the loader parses it as **UTC midnight** so a
run in any timezone stores the same instant. `GET /securities` serves it back
through `toISOString()`. Put that through `marketDateAt`, which is exactly right
for the bars' own retrieval one clause above, and it lands at 20:00 on the
**7th** in New York: the screen reads `7 September 2026` against a file, an ADR
and four documents that all say the 8th, **and nothing on the page looks wrong.**

So `formatFullDate` is reused, as the amendment required, and the way the date is
_reached_ is not: a slice of the instant's own UTC calendar date, which
round-trips what was typed. There is a test named for it and an assertion that
`7 September 2026` appears nowhere in the note.

### The three decisions this task was handed open

- **A term of its own, `Classification`, rather than a second paragraph under
  `Prices`.** The canvas's §04 drew both under one `SOURCES` label and already
  said they were grouped by subject; 2.14.3 then built the note as a label/value
  grid with a term per subject, so a term each is that grouping made structural.
- **The date sits under the claim, not beside it** — the opposite of the prices
  clause, with a reason rather than an oversight: that line pairs a date with
  `Unadjusted`, a label from a closed vocabulary, and this group has none. Its
  `source` is a free string that may never reach a screen, so there is no word to
  hoist, and a sentence beside a date is the run 2.14.3 measured and removed. The
  two clauses share the shape that matters: claim first, qualification beneath.
- **No marker, in either state** — the tension 2.14.2 left open, resolved rather
  than inherited. The `null`-provenance absence turned out to be **smaller than
  the phrasing suggested**: `provenance` goes absent when the rows stop sharing
  one pair, _not_ when they stop being ours. The claim survives whatever slug the
  server would have named; only the date is withdrawn, and the clause says _When
  they were last checked is not recorded._ A marker on that would rank a missing
  date above a stated one.

### A smaller finding, in the test helper

`SourceNote.test.tsx`'s `reading()` walks the tree the way the accessibility
layer does and treats every element boundary as worth a space. This clause
emphasises one word **inside** a sentence, so it produced `curated , not from the
market feed.` — a space before a comma that no assistive technology inserts. A
boundary between two block-ish parts of the note is a real pause; one inside a
running sentence is not, and jsdom computes no layout so the walk cannot tell
them apart. Whitespace before punctuation is now dropped, which is the one rule
that separates the two and costs nothing elsewhere.

### What the user can see

**On every Security Explorer page with a security on it**, at the foot of the
region group:

> **CLASSIFICATION** Sector and industry are **curated**, not from the market
> feed.
> Last checked 8 September 2026

So a sector sitting three centimetres above a price chart on a market product has
stopped reading like a market observation. No source slug reaches the screen — the
group is named, never `s&p-500-gics + curated ETFs` — nothing is marked stale,
and nothing was added to the universe table.

**And the note now appears on a page holding no bars**, alone, which is the
consequence worth reading twice: CI's store is 518 securities and zero bars, so
that is every page the browser suite renders, and until this clause the note was
absent from all of them.

**What a user still cannot do:** watch a price move. There is no live data.

### Verified

`pnpm verify` green (8 invariants, 1,854 unit/component/integration tests, 14
process tests). The browser suite green for every affected spec — 78 passed
across `security-*`, then 42 across `securities-route`, `universe-navigation` and
`search-keyboard`. The page was looked at with Playwright at **1440 and 390**
before any suite ran, and the permutation grid was read in Storybook: both widths
read correctly and the date is the 8th.

### Documents amended

- **`PROVENANCE.md` §5** — a dated amendment carrying the UTC-date finding, the
  term, the date's position and the marker resolution.
- **`VISUAL-LANGUAGE.md`'s Provenance section** — a dated amendment: a term per
  subject with the test for adding a fourth, claim-then-qualification, no marker
  in any state, and the standing question any future dated clause owes — _is this
  an instant somebody stamped, or a date somebody typed?_
- **The design canvas** — `Provenance and the empty answers.dc.html` gains §10:
  the note as built with three terms, the clause's two missing states drawn
  (undated, and silent), and the three things it deliberately does not do.

---

## For the stakeholder — what this actually was, in plain words

**The short version: the sector label on a stock's page has stopped quietly
pretending to be market data.**

Open NVDA in MarketPulse and, just under the company name, you see
`Technology · Semiconductors · NASDAQ`. Everything else on that screen is a real
market observation: the price, the volume, the last close, all of it fetched from
a market-data provider. That one line is not. **We decided it.** It comes from a
research file this project curates by hand — a list of which company belongs in
which sector — and it was last checked against its published source on
8 September 2026.

Nobody had ever told you that. The information was in the data the page already
downloads; no screen had ever printed a character of it. So a reasonable person
reading that page assumed the sector arrived with the prices, because everything
around it did.

That matters more than it sounds, and it matters _soon_. Two of the features on
the roadmap work by comparing a stock **against its sector** — "is this a
semiconductor move, or just NVDA?" is one of the questions this whole product is
built to answer, and the market map groups companies by sector too. If our sector
list is a few months out of date, those answers are quietly a few months out of
date with it. A user who does not know the list is ours cannot even ask the
question. Now they can see who made the judgement and how fresh it is.

**Three decisions worth explaining, because each one was the road not taken.**

_We state the date. We do not colour it._ The obvious move is an amber "stale"
warning after, say, ninety days. We refused, and the reason is not restraint for
its own sake: we have no schedule for re-checking that file, so ninety days would
be a number somebody made up at the moment of drawing the screen. We already have
a tool that compares our list against the published source; the honest route to a
staleness warning is to **run that on a schedule first**, so that "overdue" means
a check that did not happen rather than a date somebody eyeballed. A warning
light with nothing behind it is worse than no warning light, because people
believe it. If the date on screen looks uncomfortably old, that is the disclosure
doing its job.

_We name what it is, not what we call it internally._ Our data carries the tag
`s&p-500-gics + curated ETFs`. That is genuinely useful — to an engineer reading a
server response. Printed at a user it is jargon that explains nothing and looks
like a leak. The screen says the plain thing: sector and industry are curated, not
from the market feed.

_When we cannot say when it was last checked, we say that._ There is a future in
which parts of this data come from different places on different days, and the
system honestly cannot name one date for the whole list. It would be easy to
print nothing and let the reader assume. Instead the line keeps the claim it can
still make and replaces the date with a sentence saying we do not have one. An
empty space reads as a bug; a sentence reads as candour.

**One thing we caught that would have been almost impossible to spot later.**

The date on the page is `8 September 2026`, and that is the same date written in
our source file. Getting there took a correction. Everywhere else in this product,
timestamps are converted into New York market time — that is the right thing to
do with a moment a server stamped, and the price data three lines above does
exactly that. But this one is not a moment; it is a _date somebody typed_, stored
as midnight. Convert midnight to New York time and you land at eight o'clock the
previous evening — so the screen would have read **7 September**, off by one,
against a file and four documents all saying the 8th. Nothing on the page would
have looked wrong. It is now written down as a standing question for any date we
put on this surface: _is this an instant somebody stamped, or a date somebody
typed?_

**Where this leaves the product.** Epic 2 is one task from its close. The Security
Explorer now accounts for itself completely: where the prices came from, what has
been done to them, when they were fetched, and — as of today — where the words
above the numbers came from and how old that judgement is. That is the last of the
five disclosures this story set out to add, and the screen still reads as one
instrument rather than a chart with a pile of footnotes under it, which was the
thing genuinely at risk. Next up is the epic close itself; after that, Epic 3
brings the live market feed and prices that actually move.
