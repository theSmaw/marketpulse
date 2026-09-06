# Task 2.4.2 — `GET /securities` and the wire contract

**Status:** Complete
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

---

## What was built (2026-09-06)

Four files changed and two were added. `packages/shared/src/securities-response.ts`
is the contract; `apps/backend/src/routes/securities.ts` is the route;
`apps/backend/src/securities.ts` gained one read; `json-schema.ts` was widened;
`index.ts` registers the route; `database.ts`'s stale reversal trigger was
corrected. `pnpm test` is **304** (55 + **146** + 103), `pnpm test:database`
**61**, and `pnpm verify` is exit 0 **with no database running**.

### The five decisions, and what each rests on

**The envelope is an object, not a bare array.** A bare `Security[]` has nowhere
to put anything true of the _list_ rather than of a row, and there is already
one such thing — where the list came from. It costs one level of nesting and is
the shape Story 2.9's series endpoint inherits.

**There is no `count` field.** Without pagination `securities.length` _is_ the
count, so a field beside it is a second copy of a fact whose only interesting
behaviour is to disagree. Story 2.4's page reports two numbers — rows held and
securities tracked — and both are computed from the array, the second by
filtering on `status === "active"`. That distinction belongs to whoever makes
the claim on screen, not to the transport. Produced against the real database:
with one row marked `untracked`, the response carries **101 rows of which 100
are active**.

**There is no pagination, and the answer is a number.** `UNIVERSE.md` §8 warns
that a hard-coded 100 could hide in "an API default page size"; the thing that
reaches §6's 500 without an edit is _no page size at all_, because there is then
no number to change. Measured on the shipped universe rather than estimated:
101 securities are **17,299 bytes**, **2,591 gzipped** — so 500 is ~86 kB
uncompressed and ~13 kB on the wire, against a frontend bundle of 348 kB. The
whole universe is 4% of the JavaScript the browser downloads to render it. The
reversal trigger is a payload big enough to matter, at which point the envelope
gains the keys a bare array had nowhere to put.

**Provenance rides on the envelope, keyed by field group, and its expiry is
stated.** Task 2.4.1's read returns none — `Security` deliberately carries no
provenance — so per-row would mean 101 copies of two values _and_ a widened
column list. It is optional, and its absence means one of exactly two things:
the response is empty, so there is nothing to attribute; or the rows no longer
agree, so the claim is not true and is therefore not made. **Both were produced
against the real database.** Setting one row's `profile_source` to `alpaca`
takes the response to `{"securities": […]}` with no `provenance` key and writes
a level-40 record carrying `distinctProvenanceRecords: 2` under the request's
own `reqId`. What breaks it for real is Story 2.7, filling profile fields from
Alpaca while classification stays curated.

**No search parameter.** Story 2.11 owns search and has an open decision about
client-side versus server-side matching; a `?q=` here would settle it by
accident.

### The one place this task did not do what its brief recommended

The amendment recommended registering inside `buildServer()` — firing
`database.ts`'s recorded reversal trigger and putting the repository into
`ServerOptions`. **That is unreachable as written, and finding out why is the
task's most transferable result.** The route needs a `SecuritiesRepository`; the
repository is built over the process's one `pg.Pool`; `createDatabasePool` takes
a `DatabaseLogger`, and the only logger this application has is `app.log`, which
does not exist until `buildServer()` has returned. `pino` is not importable from
`apps/backend` at all — pnpm's strict linking hides it, since it arrives
transitively through Fastify — so there is no second logger to break the cycle
with. `ServerOptions.securities` is therefore an argument that cannot be
constructed before the call it is an argument to.

Three ways out were considered and rejected, each recorded in
`routes/securities.ts`: a repository over a thunk closing on a binding assigned
on the next line; a `createSecurities(log)` callback in `ServerOptions`, out of
which `index.ts` would have to recover the pool in order to close it; and
splitting the pool's construction from its `error` handler, which is the one
line in `database.ts` whose absence crash-loops the replica. Each is a closure
trick or a resource-lifecycle change bought to move a registration by one file.

**So the "Done when" clause was met from the other side instead.**
`server.test.ts`'s route-table walk now registers what `index.ts` registers —
this route and the diagnostics one, over stubs — so it covers **every route this
application serves** rather than every route the factory happens to know about.
That closes the cost Task 2.1.7 stated and accepted rather than merely
repeating it. Made to fail: removing `500: apiErrorSchema` gives
`GET /securities does not declare 500: apiErrorSchema` at exit 1. What the walk
still cannot see is a route added to `index.ts` and not added there, which is a
stated invariant of the third kind — prose, because a _registration site_ is not
reachable from an assembled instance.

`database.ts`'s trigger is restated rather than deleted, and it now names a
condition rather than a story: the repository becoming constructible without the
application's logger, or a route that must exist before the pool does.

### Two things measured that nothing predicted

**A nullable field declared plainly `"string"` reaches the wire as the empty
string** — not `null`, and not the string `"null"` either. Produced by declaring
`sector`, `industry` and `cik` that way and running the suite: five of nine
tests go red and `SPY`'s sector arrives as `""`. That is the quiet failure
rather than the loud one, because `""` is falsy — a client branching on
truthiness keeps working, while a client _rendering_ the value shows a blank
cell that reads as "unclassified", which is the exact inference Task 2.3.1
rejected when it made `Security` a discriminated union instead of one interface
with a nullable sector. `type: ["string", "null"]` is what fixes it, and it is
asserted on the raw body rather than on the parsed one, because `JSON.parse` is
precisely what would hide it.

**The `satisfies` guard does not reach into a nested object**, so this route
applies it **three times** — once for the envelope, once for a security, once
for a provenance record — and nothing forces the second and third. Recorded in
`json-schema.ts` as the limit of the idiom, which had never had a nested shape
before. The guard was made to fire once: a field added to `SecuritiesResponse`
and not to the schema is `TS1360` naming the object, plus a `TS2741` on the
handler.

`JsonSchemaProperty` was widened deliberately, which its own header invited:
`object`, `properties`, `required`, `items` as a full property, and the
`[T, "null"]` union. Each is used here and none is speculative.

### What a green result here does not certify

The route was driven against the real universe and answered **101 securities in
17,299 bytes at 3.0–7.8 ms** with a matching `x-request-id`, all three kinds
present and `SPY`'s sector genuinely null. It has **not** run deployed — Task
2.4.6 owns that — and no browser has ever called it, because
`apps/frontend/src/api-client.ts` does not know it exists until Task 2.4.3.
There is deliberately no `isSecuritiesResponse` predicate yet either: Task
1.7.3's rule is that a validator ships with its first reader, and that reader is
2.4.3.

---

## For the stakeholders — what this actually did, in plain terms

**In one sentence: MarketPulse can now be _asked_ for the list of companies it
watches, and it answers with the real list from the real database — 101 of
them — over the internet, in a form a web page can use.**

Up to now, everything Epic 2 built was plumbing you could only see by looking at
the database directly: we chose a hosting provider, provisioned a database, built
a way to change its structure safely, and loaded the 101 securities the product
tracks. All of that was true and none of it was _reachable_. This task built the
door. There is now a web address — `/securities` — that anybody can open and get
back the actual universe: NVDA and AMD listed as Semiconductors, XLK as the
benchmark fund for Technology, SPY as a whole-market fund rather than a company.

That is worth demonstrating on the next call, even though it is a page of raw
data rather than a designed screen. It is the first time this system has shown
anybody its own content rather than a description of what it will eventually
contain. The next task, 2.4.3, puts it on the actual `/securities` page, which
has been a placeholder since Epic 1.

### Why the small decisions were made the way they were

**We send the whole list at once rather than in pages.** The obvious "proper"
thing is to send 50 at a time and let the page ask for more. We measured it
instead of assuming: all 101 securities are 17 kB, and 2.6 kB once compressed —
about 4% of the code the browser already downloads to draw the page. Even at the
500 securities the product is designed to reach, it is still small. Paging would
buy nothing today and would put a number in the system that someone has to
remember to raise later. We wrote down what would change our mind.

**We say where the data came from, on the response as a whole.** The product's
founding rules say provenance is _displayed_, never implied — a user should
always be able to see where a number came from and when we last checked it. Every
security in our list currently came from the same place on the same day, so we
attach that fact once to the whole answer rather than repeating it 101 times.
Crucially, we made the system honest about the day that stops being true: when we
start pulling company details from our market-data provider (Story 2.7) while
keeping our own hand-curated sector classifications, the rows will disagree — and
rather than quietly picking one and presenting it as the truth, the system
**stops making the claim** and writes a note to the operations log saying
provenance now needs to move onto each individual row. We tested that by
deliberately making two rows disagree and watching it happen.

**We show securities we have stopped tracking, rather than hiding them.** If we
remove a company from our watchlist, its row stays and is marked "untracked". A
row that silently vanishes is how a product ends up quietly lying about its own
history — and the replay feature, which is this product's signature capability,
has to be able to show you a day on which that company _was_ being tracked. The
consequence, which the upcoming page has to handle carefully, is that "how many
rows do we hold" and "how many do we track" become two different numbers. We
produced that situation for real: 101 rows, 100 tracked.

**We spent real effort on one field that looks trivial.** Some securities have no
sector — a whole-market fund like SPY genuinely does not belong to one, which is
different from "we haven't worked out its sector yet". We found that the obvious
way of describing the data quietly turned that "there is no answer" into a blank
value, which on screen would read as "unclassified". That is a small bug that
would have made the product subtly dishonest about its own data, and it is
exactly the class of thing that is very cheap to fix now and very expensive to
notice in six months.

**One thing we did differently from the plan, and said so.** The plan asked for
this new endpoint to be wired into the application in a particular place. When we
tried, we found a genuine ordering problem: the piece that reads the database
needs the application's logging system, and the logging system does not exist
until the application has been built. There were three ways to force it, and all
three amounted to clever tricks that would have made the code harder to reason
about for the sake of tidiness. We wired it the same way an existing endpoint is
wired, and then closed the gap that created: our automated safety check that
"every endpoint declares how it behaves when it fails" now covers _every_
endpoint the application serves rather than just the ones it happened to see
before. That is a net improvement over where we started, and we recorded exactly
what would have to change for the original plan to become possible.

### Where this leaves the product

Epic 2's remaining backend work — the trading calendar, the market-data
provider, historical price bars — is unchanged and still ahead. What has changed
is that from the next task onward, every piece of that work has somewhere visible
to land. The three tasks after this one turn this data into a page, make that page
handle its honest failure states, and make it usable by keyboard and screen
reader; the sixth deploys it and confirms it in a real browser against the live
system. After that, a stakeholder opening the deployed site sees real content for
the first time since the project started.
