# Task 2.3.1 — Choose the vocabulary, the taxonomy and where the metadata comes from, shipping nothing

**Status:** Complete
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Story 2.2 (a migration mechanism, applied locally and deployed, and one
empty `securities` table)
**Record:** `UNIVERSE.md` (in this directory), created by this task — the story's one
document about what a security is here and which ones this product tracks, in the shape
`DATA-LAYER.md` has for Story 2.2, `HOSTING.md` for Story 1.11 and `BROWSER-TESTING.md`
for Story 1.13. One document per subject; a second one about the same subject is a copy
waiting to disagree

## Objective

Settle every open decision in this story's STORY.md **before** a row, a type or a
migration exists, and finish with the tree byte-identical to how it started.

This is the fifth task in this repository's history that decides and ships nothing —
after 1.10.1, 1.11.1, 2.1.1 and 2.2.1 — and it earns that shape for the reason those did:
the vocabulary chosen here is read by Epics 4, 5, 6, 7 and 9, appears in URLs, chart axes
and agent-facing text, and this story's own Design surface note says renaming it later is
expensive. A decision spent across five epics should have one possible cause when it goes
wrong.

## Work

- **Decide the sector taxonomy, and decide it against the ETFs rather than against
  familiarity.** GICS names are the ones people recognise and are proprietary; a plain
  eleven-sector approximation is free and is what the sector SPDRs already imply. Epic 5
  compares a security against **its sector ETF**, so a taxonomy whose members do not map
  one-to-one onto the ETF set produces a security with a sector and no benchmark — which
  is acceptance criterion 3 failing structurally rather than by data entry. Write out the
  members, and write out the sector-to-ETF mapping beside them, because the mapping is the
  thing that makes the taxonomy the right one rather than merely a list
- **Decide how an index proxy is distinguished from a sector proxy, and note that this is
  the decision most likely to be answered by accident.** `kind` is `equity | etf` and
  `SECURITY_KINDS` is its source of truth. SPY, QQQ, DIA and IWM are ETFs and so are the
  sector SPDRs, and Epic 4 and Epic 5 need to tell them apart — one is what "the market"
  means and the other is what "the sector" means. Three shapes, and the third is the trap:
  widen `SECURITY_KINDS` to three or four members; add a second column that is null for an
  equity; or infer it from whether `sector` is set, which is a rule nobody wrote down and
  which breaks the first time an equity arrives unclassified. Note the cost that Task
  2.2.4 already paid for: `kind` is `text` + `check` and **not** a Postgres `enum`
  precisely so this widening is writeable in one migration, so if widening is the answer
  the mechanism is already there for it
- **Decide the `status` vocabulary and what each member means to a reader of the data**,
  not just to the loader. `securities.status` is `not null` with **no check constraint and
  no default**, deliberately — Task 2.2.4 refused to invent this vocabulary. It is the
  thing that replaces a soft delete, so "what happens to a removed symbol" (acceptance
  criterion 5, Task 2.3.6) is a question about this list. Decide whether `delisted` and
  `removed from our universe` are the same member — they are not the same event, one is a
  fact about the market and the other a fact about us, and conflating them is the kind of
  thing that is cheap now and a migration later
- **Decide where sector and industry metadata comes from, and record what it costs.**
  Alpaca's assets endpoint carries neither. The three candidates are a curated file in
  this repository, a third-party source with its own licence and key, and deriving sector
  membership from ETF holdings. The curated file is the honest V1 answer at ~100 rows —
  reviewable in a diff, no dependency, no second credential, no second failure mode in the
  loader — and **its cost is that it goes stale silently**, which is this repository's
  third kind of gap and should be recorded as one rather than glossed. State the reversal
  trigger, and state what "stale" would actually look like (a ticker change, a sector
  reclassification, a delisting), because that is what a later story would have to detect
- **Decide the per-field provenance shape, which is acceptance criterion 6 and is the
  requirement in this story most likely to be deferred into nothing.** Invariant 6 says
  provenance is displayed rather than implied, and Story 2.13 is the consumer. Note that
  the fields have genuinely different sources: `symbol`, `name` and `exchange` plausibly
  come from the provider, `sector` and `industry` from whatever this task chooses, `cik`
  from Epic 9, and `kind` from us. So a single `source` column on the row is already known
  to be wrong, and the question is how much less wrong the alternatives are: a column per
  field group, a `jsonb` provenance object, or a separate table. Decide against what Story
  2.13 has to render rather than against what is tidy, and say which fields are covered
  and which are deliberately not
- **Decide whether the universe is a migration or a seed script, and read
  `apps/backend/migrations/README.md` §7 before deciding rather than after.** That section
  already answers this in the general case and the answer is _not a migration_: a migration
  runs once, is recorded, and — since Task 2.2.7 — is **refused outright** if the file
  changes afterwards, so a corrected sector in a migration cannot be corrected in that file
  at all. The reason to re-take it here rather than cite it is acceptance criterion 2's
  word **idempotent**, which for a seed has to mean "picks up an edited list", not "does
  nothing the second time" — those are different programs, and only one of them is useful
- **Decide where the universe data physically lives and in what format**, which is a
  smaller decision with one measurement in it worth taking now: a `.ts` module is inside
  `tsc -b`, so a row that does not satisfy `Security` is a compile error, while a `.json`
  or `.csv` file is read by Prettier for formatting and by **nothing** for meaning — the
  same signature `apps/backend/migrations/*.sql`, the `Dockerfile` and `scripts/dev.sh`
  carry. Take the `prettier --file-info` reading for the candidate formats rather than
  assuming, because that one-liner has been the deciding evidence three times in this
  repository
- **Write the selection rule that produces the list, before producing it.** Task 2.3.4
  chooses the actual symbols and this task decides the criteria they have to meet:
  liquidity, market-cap spread, and — the criterion a naive "top 100 by market cap" list
  fails — **deliberate sector coverage**, with a stated floor per sector, because breadth
  and relative-move are structurally uninteresting against a list that is 40% mega-cap
  technology. A rule stated as a number is checkable; a rule stated as "a good spread" is
  not, and Task 2.3.4 has to inspect the distribution against it
- **State how the architecture expands to 500 without redesign**, per §6, as a list of
  places a hard-coded 100 could hide — the loader, the schema, an API's default page size,
  a frontend list — and say which of them exist today. This is demonstrated by argument
  and by absence, never by loading 500

## Done when

- `UNIVERSE.md` exists in this directory and answers all four of the story's open
  decisions plus the four this task adds (proxy distinction, `status` vocabulary,
  provenance shape, data file format), each with its rejected alternatives and its cost
- The sector taxonomy and the sector-to-ETF mapping are both written out, and every
  member of the first has a member of the second
- The selection rule is expressed in terms something can be checked against
- Nothing was installed, no migration was written, and `git status` is clean apart from
  `UNIVERSE.md` and this file

## Notes

The temptation here is to start listing symbols. Resist it: the list is Task 2.3.4's, and
a list written before the selection rule is a rule reverse-engineered from a list, which
is how "not 40% technology" becomes something asserted rather than met.
