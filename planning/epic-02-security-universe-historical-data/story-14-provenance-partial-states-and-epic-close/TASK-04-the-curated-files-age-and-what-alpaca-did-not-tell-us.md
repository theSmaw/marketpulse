# Task 2.14.4 — The curated file's age, and what the market-data provider did not tell us

**Status:** Not started
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
