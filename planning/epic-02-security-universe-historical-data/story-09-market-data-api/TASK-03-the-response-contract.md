# Task 2.9.3 — The response contract in `packages/shared`

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.1

## Objective

Type what a series answer looks like on the wire, in `packages/shared`, with the
`satisfies` guard applied at **every** level of the shape — so a field added to
the interface and forgotten in the schema is `TS1360` rather than a value that
silently vanishes.

## What the user can see when this lands

**Nothing.** This is the contract three later epics consume.

## Work

- **Copy `securities-response.ts`'s arrangement and its traps, both of which were
  measured rather than reasoned about.** An **object envelope, not a bare array**,
  because there are facts about the answer that are not facts about a bar. The
  `satisfies Record<keyof T, JsonSchemaProperty>` guard **does not reach into a
  nested object**, so it is applied once per nested shape — that route applies it
  three times and nothing forces the second and third. Count the shapes here
  (envelope, series, bar, coverage, provenance, source) and apply it to each.

- **A nullable field declared plainly `"string"` reaches the wire as the empty
  string** — not `null` — which is falsy, so a client branching on truthiness
  keeps working while a client rendering it shows a blank. `type: ["string",
"null"]` is the fix, and it is asserted on the **raw body** rather than the
  parsed one, because `JSON.parse` is exactly what hides it. `coverage.covered` is
  this response's nullable field and it is the one that carries the partial answer,
  so getting it wrong turns "we hold nothing" into "we hold up to the empty
  string".

- **Carry the provenance the domain already defines**, not a new vocabulary:
  `SeriesProvenance` is `adjustment` plus a **non-empty list** of `BarSource`
  (`provider`, `feed`, `retrievedAt`, `barCount`). The list is a list because a
  stitched series may name two feeds truthfully, and `barCount` exists so the
  record can be **checked** — `toBarSeries` asserts the counts sum to the bars.
  Whatever this schema declares must not make either property unrepresentable.

- **Do not put a feed on the envelope.** Task 2.6.7 is explicit: `GET /market-data`
  is the one home for _which feed is this deployment reading_, and per-series
  provenance is already on the series. A second field answering the first question
  is the thing that amendment forbids.

- **Numbers are JSON numbers and `startsAt` is an ISO 8601 UTC string with the
  `Z`.** `bar.ts` settled that, including the guard that comes with it: prices are
  aggregated in SQL over `numeric`, never in JavaScript over this type. There is
  no timezone in the payload and there must not be one.

- **Express the partial answer without an error code.** `SeriesCoverage` is
  `requested` (always) and `covered` (`null` exactly when empty). Story 2.14's
  _"we have data through 15:42"_ is `covered.end`, computed by whoever makes the
  claim — so do not add a derived `complete` flag, for the reason a `count` was
  refused on the universe response: a second copy of a fact whose only interesting
  behaviour is to disagree with the first.

- **Ship no `isBarSeriesResponse` predicate yet.** Task 1.7.3's rule is that a
  validator ships with its first reader, and that reader is Story 2.10. Say so in
  the module header so the absence reads as a decision.

- **Decide, and write down, whether a downsampled series says so on the wire.** If
  Task 2.9.1 chose to reduce, a consumer that cannot tell a reduction from the raw
  store is a consumer that will eventually publish a number as a minute bar which
  is not one.

## Done when

- The response types and their schemas live in `packages/shared` beside `Bar`,
  `BarSeries` and `SeriesProvenance`, and are exported from `index.ts` with the
  package's existing comment convention
- The guard is applied at every nesting level, and **made to fire once** — add a
  field to one interface, see `TS1360` naming the object, remove it
- A null `covered` is asserted **on the raw body** to be `null` and not `""`
- `pnpm verify` passes

## Notes

Three later epics read this shape and Epic 3 sits beside it rather than replacing
it. It is worth an hour more than it feels like it needs — which is what Task
2.4.2 said about the universe response, and it was right.
