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
  `buildServer()`, ~~and this route should be registered where the walk reaches it~~ — **and
  where to register it is a decision with a real cost rather than a preference. See the
  amendment at the foot of this file: it fires `database.ts`'s recorded reversal trigger.**
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
  from Alpaca is what will break that. Say which, and say what breaks it. **Task 2.4.1
  sharpened that argument considerably: see the amendment — the read as built returns no
  provenance at all, and per-row provenance is therefore not free.**
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

---

## Amended 2026-09-06, after Task 2.4.1

Three things this file did not know when it was written, and one it did not mention. None
of them changes the task's scope or its position; two of them turn a bullet that reads as a
preference into a decision with a stated cost.

### Where the route is registered fires a recorded reversal trigger

The bullet above says the route "should be registered where the walk reaches it" — i.e.
inside `buildServer()` — as though that were free. It is not, and Task 2.4.1 is what makes
the cost concrete: the route needs `createSecuritiesRepository(pool)`, the repository needs
the pool, and **`index.ts` creates the pool after `buildServer()` has returned**, because
the pool takes `app.log`.

So the two options are:

|                                                                     | What it costs                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Register inside `buildServer()`**                                 | The repository (or the pool) enters `ServerOptions` beside `corsOrigin`, so **every test that builds a server has to supply or fake one**. This is exactly `database.ts`'s recorded reversal trigger and ADR 0002 §3's warning about the factory's signature |
| **Register from `index.ts`**, as `/diagnostics/database` already is | Costs nothing structurally and the route-table walk **cannot see it**, so `500: apiErrorSchema` has to be asserted in the route's own test — which is precisely what Task 2.1.7 did and recorded                                                             |

**The recommendation is the first**, because this is the route that is meant to fire the
trigger: unlike `/diagnostics/database`, it is a real data route with more of its kind
behind it, and a second route registered outside the walk starts a habit rather than taking
a decision. Prefer passing the **repository** rather than the pool — the interface is the
narrower dependency, it keeps `ServerOptions` free of `pg` types, and it is what lets a test
build a server over a stub with no database at all, which criterion 7 needs.

**And `database.ts`'s own comment is now stale and this task should correct it.** It reads
"The reversal trigger is a route that needs data — **Story 2.9's**", which was true until
Story 2.4 took the universe endpoints from 2.9. It is a source comment in a shipped file,
so it goes in the same commit as the change it describes.

### The read returns no provenance, which is a stronger argument for the envelope

`Security` in `packages/shared` deliberately has **no** provenance fields — its own header
lists them among what is absent — and Task 2.4.1's `SECURITY_COLUMNS` selects the eight
domain columns and nothing else. So per-row provenance is not a matter of choosing where to
put a value that is already in hand: it needs either a widened column list and a second
return type, or a second read function.

That is a real cost against a value **every row currently shares**, so the envelope is now
the clear answer rather than the marginal one. What breaks it is unchanged and worth
restating: Story 2.7 filling profile fields from Alpaca while classification stays curated,
at which point the two groups stop sharing one date and the field-group vocabulary
`SECURITY_FIELD_GROUP` already carries is what the payload has to reflect.

### What the route does with a `SecurityMappingError`

Task 2.4.1 decided that a row which does not map **fails the whole read** rather than being
dropped, and throws `SecurityMappingError` naming the symbol. This task owns what the route
does with it: **a 500 and `INTERNAL_ERROR`**, because a malformed row is this server having
failed rather than the client having asked wrongly — and it needs no new code, because
Task 1.7.4's error handler already maps an uncaught throw to exactly that.

Two things that follow and are worth asserting rather than assuming. The message names the
symbol and **must not reach the client** — Task 1.7.4's rule is that a 5xx never carries the
thrown message, and the stack goes to the log under the request's `reqId`. And the response
must still be the `ApiError` shape, which the `500: apiErrorSchema` bullet above already
requires.

### What did not change

The envelope question, the pagination question, the no-search rule, the `app.inject()`
testing level and this task's position. Task 2.4.1 shipped what this file assumed it would.
