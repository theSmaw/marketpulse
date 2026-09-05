# Task 2.3.2 — `Security` in `packages/shared`, and the vocabularies it fixes

**Status:** Not started
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Task 2.3.1 — every name in this file is one that task chose

## Objective

Define what a security **is** in this product, once, in `packages/shared`, and have both
apps compile against it. Acceptance criterion 1, and nothing else: no table change, no
rows, no loader.

## Work

- **Write `Security` in `packages/shared/src/security.ts`, beside `SECURITY_KINDS`**,
  which has been sitting there since Task 2.2.4 saying in its own comment that this
  interface is Story 2.3's. It is a **domain object and not a row**: `apps/backend/src/
schema.ts` already holds `SecuritiesTable`, and the two are deliberately different types
  in different packages — `migrations/README.md` §6 gives the three reasons and they have
  not changed. Expect the differences to be visible rather than theoretical: the row has
  `recorded_at` and `updated_at` and the domain object almost certainly should not, and
  the row's nullable `sector` is where the domain type gets to make an explicit answer
- **Ship the vocabularies as `const` arrays with derived unions**, the shape
  `HEALTH_STATUSES`, `FEED_STATUSES`, `ANOMALY_BANDS`, `API_ERROR_CODES` and
  `SECURITY_KINDS` already have, so each is readable at run time by anything comparing it
  against the database. That is at least the sector taxonomy and the `status` vocabulary,
  plus whatever Task 2.3.1 decided about the index-proxy / sector-proxy distinction
- **Put the sector-to-ETF mapping here too, and decide out loud whether it is domain
  vocabulary or data.** It is the one thing in this task that could plausibly live in the
  universe file instead, and the argument for `packages/shared` is that Epic 5's
  relative-move reads it and Epic 4's sector rows group by it, so it is a fact both sides
  depend on rather than a fact about our particular list. The argument against is that it
  is a table of strings that changes when the ETF set changes. Say which and why
- **Do not widen the type to carry anything Story 2.7 or Epic 9 owns.** No price, no bar,
  no filing, no CIK-derived anything beyond the identifier field that already exists. The
  test is whether the field is a fact about the security or a fact about something that
  happened to it
- **Decide whether a predicate ships beside the interface, on the precedent rather than on
  taste.** `isHealthResponse` and `isApiError` are both in this package for a stated
  reason — a validator written anywhere but beside its shape drifts from it — and both
  have a reader. The reader here is Task 2.3.5's loader, which has to reject a malformed
  row. Note the one asymmetry those two already record: `isApiError` **does** check its
  discriminator against the const array where `isHealthResponse` deliberately does not,
  because one is switched on and the other is rendered. Say which case a `Security` is
- **Make both apps compile against it, and make that mean something.** `apps/backend`
  imports it or nothing has changed for the backend at all; `apps/frontend` has no reader
  until Story 2.9, so state whether "both apps compile against it" is met by the shared
  package being in both type graphs or requires an actual import, and do not manufacture a
  fake consumer to satisfy a criterion
- **Add the tests this package's convention asks for**, beside the subject. Note what is
  worth asserting and what is not: `security.ts` has shipped no test until now, correctly,
  because `SECURITY_KINDS` alone had nothing to assert — the same position `feed-status.ts`
  and `anomaly.ts` are in. A union whose members must not overlap with another union, or a
  mapping that must be total over a taxonomy, **is** worth asserting, and that second one
  is acceptance criterion 3's first half expressed at compile time rather than at load time
- **Do not touch the `Database` interface or the migration.** The schema catching up with
  this vocabulary is Task 2.3.3, deliberately in that order: the type is the source of
  truth and the `check` constraint is the backstop, which is the arrangement
  `migrations/README.md` requires of every closed set

## Done when

- `Security` and its vocabularies exist in `packages/shared` and are exported from the
  package root
- Every closed set is a `const` array with a derived union, and the sector-to-ETF mapping
  is total over the taxonomy in a way the compiler holds
- Both apps typecheck; `pnpm verify` passes with no database running
- Nothing about the table, the rows or the loader changed

## Notes

The `Database` interface and `Security` will look like near-duplicates in a diff, and the
reflex will be to make one derive from the other. `migrations/README.md` §6 already
refused that: a row has a nullable column where a domain object has an explicit answer,
and the mapping between them is exactly where that decision gets made. That mapping is
Story 2.8's to write, one function per domain type and never a generic mapper — and this
task should not pre-empt it either.
