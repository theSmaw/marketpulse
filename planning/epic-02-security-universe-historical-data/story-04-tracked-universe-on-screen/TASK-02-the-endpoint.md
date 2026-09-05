# Task 2.4.2 — `GET /securities` and the wire contract

**Status:** Not started
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Task 2.4.1

## Objective

Put the universe on the wire, in a contract `packages/shared` owns and the compiler
enforces — the third route this server has, and the first that returns data.

## What the user can see when this lands

**A URL a person can open in a browser and read**: the deployed backend answers
`/securities` with the 101 tracked securities as JSON. That is not a feature, and it is not
nothing either — it is the first time this system will show a stakeholder its own data, and
it is worth demonstrating on the call rather than waiting for the page.

The application itself is unchanged: `/securities` in the frontend is still Story 1.5's
placeholder until Task 2.4.3.

## Work

- **Put the response type in `packages/shared` beside `Security`**, and use the `satisfies
Record<keyof T, JsonSchemaProperty>` guard Task 1.7.3 established, for the reason it
  exists: `fast-json-stringify` **strips every property the schema does not declare**, so a
  field added to the interface and forgotten in the schema vanishes from the wire with a
  green build, a green lint and a passing test. That is measured behaviour in this
  repository, not a hypothetical, and the guard turns it into `TS1360`
- **Declare `500: apiErrorSchema` on the route**, and note that `server.test.ts` already
  walks the route table and asserts exactly that — so forgetting it is a red test rather
  than a discovery. Read that test before adding the route, because Task 2.1.7 found the
  route-table walk cannot see a route registered from `index.ts` rather than from
  `buildServer()`, and this route should be registered where the walk reaches it
- **Decide the envelope**, and prefer the smallest thing that can grow. A bare array is the
  simplest and has nowhere to put the count, the provenance or a "there are more" signal; an
  object with a `securities` key has all three and costs one level. Story 2.9's series
  endpoint will need provenance in the payload per Story 2.6, so the shape chosen here is
  the shape that story inherits
- **Answer the pagination question this story left open**, and record it rather than
  defaulting. `UNIVERSE.md` §8 lists "an API default page size" as one of the places a
  hard-coded 100 could hide, so whatever is chosen should be expressed in terms that reach
  500 without an edit
- **Carry provenance, because the schema has it and the product requires it.** Every row has
  `profile_source`, `profile_retrieved_at`, `classification_source` and
  `classification_retrieved_at`, and invariant 6 says provenance is displayed rather than
  implied. Decide whether it rides on each security or once on the envelope — today every
  row shares one value, which argues for the envelope, and Story 2.7 filling profile fields
  from Alpaca is what will break that. Say which, and say what breaks it
- **Do not invent a search parameter.** Search is Story 2.11's and it has an open decision
  about client-side versus server-side matching that this task must not settle by accident
- **Test it through `app.inject()`**, which is where this repository's integration tests
  live, and assert the stripping property on the real route rather than on a copy of its
  schema — a `preSerialization` hook is how that is done, because an `onSend` hook is handed
  a string that has already been stripped

## Done when

- `GET /securities` returns the universe, and the response validates against the contract
- A field on the interface but not in the schema is a compile error, produced once
- The route declares `500: apiErrorSchema` and the route-table test sees it
- The envelope, the pagination answer and the provenance placement are each decided and
  written down
- `pnpm verify` passes with no database running

## Notes

This route is consumed by Stories 2.10, 2.11 and Epic 4, and its shape is read by Epic 6 and
Epic 9 later. It is worth an hour more than it feels like it needs.
