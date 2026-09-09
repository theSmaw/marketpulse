# Task 2.9.3 — The response contract in `packages/shared`

**Status:** Complete — 2026-09-09
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

- ~~**Decide, and write down, whether a downsampled series says so on the
  wire.**~~ **Settled by Task 2.9.1: the server never reduces a series**
  (`MARKET-DATA-API.md` §3), so there is no reduction to declare and **no field to
  add**. Nothing to do here beyond not inventing one — and note the shape the
  repair would take if the trigger in §3 ever fires: a `reduction` record naming
  `from`, `bucket` and `method`, never a new member of `TIMEFRAMES`.

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

---

## What was built

`packages/shared/src/bar-series-response.ts` — six wire types — and the seven
schema shapes that serialise them, in `apps/backend/src/routes/market-data.ts`,
with `satisfies Record<keyof T, JsonSchemaProperty>` applied to every one.
Twelve tests in `routes/market-data.test.ts`, six of them new and all driven
through the real serialiser.

### The one place this deviates from the brief, stated plainly

**The brief says "the response types and their schemas live in
`packages/shared`". The types do; the schemas do not.** `json-schema.ts` records
in terms that `JsonSchemaProperty` is _"deliberately **not** in
`packages/shared`: nothing outside this application declares a response schema,
and Story 1.6's rule applies — shared means both sides depend on the same
fact."_ `/health`, `/securities` and `/market-data` all follow it. Satisfying the
sentence literally would have meant moving that type into the package that is
**inlined into the frontend bundle**, to reverse a decision two files argue for,
in a task whose objective is the guard rather than its address. So the schemas
sit beside the route that will serve them, which is the arrangement the brief's
own instruction — _"copy `securities-response.ts`'s arrangement"_ — actually
describes.

### The shapes: seven, not the six the brief counted

The brief said to count them and named six — envelope, series, bar, coverage,
provenance, source. There are **seven**, and the extra one is worth the
paragraph because it is the shape the nullable field hangs off.

`SeriesCoverage` holds two `TimeRange`s, and a `TimeRange` is two `Date`s. On
the wire that is two ISO 8601 strings, and the question is whether they are a
nested object or four flat fields. **Nested, `TimeWindowPayload`, because
`covered` is nullable as a whole**: flattened, "we hold nothing" would be
spelled by `coveredStart: null` **and** `coveredEnd: null`, which is two nulls
that can disagree and a half-null pair the domain cannot represent and no
consumer could act on. One nullable object has one spelling.

That guard is applied once and covers both uses — `timeWindowSchema` and
`nullableTimeWindowSchema` share one `timeWindowProperties` — so the nullable
form cannot drift from the plain one.

### Why the types are twins rather than the domain types themselves

Not a stylistic choice, and both halves are mechanical:

- **`BarSeries`, `SeriesProvenance` and `TimeRange` are branded.** A brand is a
  `unique symbol` key, so `Record<keyof BarSeries, JsonSchemaProperty>` demands a
  property for a symbol no schema can carry — the guard cannot be applied to a
  branded type at all. Which is the type system saying something true:
  `bar-series.ts` already states that _"a series parsed out of JSON is not a
  `BarSeries` and has to be re-validated"_, and a wire type is the honest name
  for a thing checked by nobody.
- **`Date` is not a wire type.** Every instant here is an ISO 8601 UTC string
  with the `Z`, per `CALENDAR.md` §5. There is no timezone in the payload.

**`BarSource` is deliberately not twinned.** All four of its fields are already
JSON-native — `retrievedAt` is a string precisely because JSON has no date type
— so a copy would agree with the original exactly until somebody edited one.
The guard is applied over the shared interface itself.

### Decisions taken here

- **An envelope with a `securityStatus`, not a bare series.** §7 requires the
  response to be **able to say** the security is untracked and leaves the field
  to this task. It is on the envelope rather than inside the series because it
  is a fact about the _security_, not about a run of bars — put inside, it would
  produce a series-shaped object carrying a field `BarSeries` deliberately does
  not have, and nesting means `response.series` re-validates into a `BarSeries`
  on its own with nothing to strip first. Named `securityStatus` rather than
  `status` because an envelope field called `status` beside an HTTP status code
  is a field two readers understand differently. It is never null: an unknown
  symbol is a 404, and §6's sentence is that **a 404 is about the security,
  never about the data**.

- **`sources` is typed `readonly BarSource[]` where the domain types it
  `[BarSource, ...BarSource[]]`**, and that is the one place this file is
  weaker than what it mirrors. A tuple has no JSON Schema equivalent
  `fast-json-stringify` would enforce, so declaring one would be a claim the
  wire cannot keep. The non-emptiness is re-established where it can be checked:
  `toSeriesProvenance` on the way out, and the predicate Story 2.10 writes on
  the way in.

- **All five status codes are on the exported schema**, not just 200 and 500 —
  400, 404, 503 and 500 all share `apiErrorSchema`, which is §6's table as a
  declaration. `503` is declared here and its `SERVICE_UNAVAILABLE` code still
  does not exist; adding the `API_ERROR_CODES` member **with** `errors.ts`'s
  status-to-code mapping is Task 2.9.6's, and a 503 raised before that answers
  `INTERNAL_ERROR`, which names the wrong thing.

- **No `isBarSeriesResponse`, and no domain→wire mapper.** Task 1.7.3's rule
  both times: a validator ships with its first reader (Story 2.10), and the
  mapper's first reader is Task 2.9.6. The module header says so, so the absence
  reads as a decision. What the predicate will have to do is more than the
  universe's envelope needed, and it is written down there rather than
  discovered: a body re-checked field by field and never passed through
  `toTimeRange`, `toSeriesProvenance` and `toBarSeries` is a body whose bars may
  be out of order and whose sources may not add up.

- **No `reduction` record and no `complete` flag**, per §3 and the brief. The
  shape the reduction repair would take is recorded in `MARKET-DATA-API.md` §3;
  it is not pre-built here.

### The guard was made to fire — at all seven levels, not one

The brief asks for one demonstration. Seven were run, because the whole point is
that nothing forces the second through seventh applications and a demonstration
at the envelope proves nothing about the ones inside it. A field was added to
each interface in turn, `packages/shared` rebuilt, and `pnpm --filter
@marketpulse/backend typecheck` read:

| Field added to            | Result                                                |
| ------------------------- | ----------------------------------------------------- |
| `TimeWindowPayload`       | `TS1360` … `Record<keyof TimeWindowPayload, …>`       |
| `SeriesCoveragePayload`   | `TS1360` … `Record<keyof SeriesCoveragePayload, …>`   |
| `BarSource`               | `TS1360` … `Record<keyof BarSource, …>`               |
| `SeriesProvenancePayload` | `TS1360` … `Record<keyof SeriesProvenancePayload, …>` |
| `BarPayload`              | `TS1360` … `Record<keyof BarPayload, …>`              |
| `BarSeriesPayload`        | `TS1360` … `Record<keyof BarSeriesPayload, …>`        |
| `BarSeriesResponse`       | `TS1360` … `Record<keyof BarSeriesResponse, …>`       |

Every one names the object it is about, which is the half that makes the error
actionable. All seven were reverted.

**Note what this required, because it is the trap in verifying it:**
`packages/shared` is consumed as **built output**, so editing the interface and
running `typecheck` proves nothing until the shared package is rebuilt. A
"verification" that skipped the rebuild would have been green against the old
`.d.ts` and read as the guard not firing.

### The null was measured, in this exact shape, before the shape was chosen

`type: ["object", "null"]` is not the same claim as `["string", "null"]`, and
the recorded measurement was about a string. So it was re-taken against a
throwaway Fastify route carrying both, and it reproduced the trap and confirmed
the fix in one body:

```json
{
  "coverage": { "requested": { "start": "a", "end": "b" }, "covered": null },
  "plain": ""
}
```

`covered`, declared `["object", "null"]`, is a real `null`. `plain`, declared
`"string"` and handed a `null`, is `""` — falsy, so a client branching on
truthiness keeps working while a client rendering it shows a blank. In this
contract that is the difference between _"we hold nothing for this symbol"_ and
_"we hold up to the empty string"_, on the one field that carries the partial
answer §36 makes a first-class product state.

The test asserts it **on the raw body** (`response.body`, not `response.json()`)
for the reason the brief gives: `JSON.parse` is exactly what hides it.

### The tests

Six new, all through `app.inject()` against a throwaway route carrying the real
schema — the route itself is Task 2.9.6's, and the same Fastify and the same
`fast-json-stringify` are what these exercise. No socket, no database, no
network.

They build their fixtures **through the domain constructors** — `toTicker`,
`toTimeRange`, `toSeriesProvenance`, `mergeSeriesProvenance`, `toBarSeries` — so
every coherence check runs over the values being serialised. A hand-written
literal would pass while describing a series the domain refuses to construct.

1. A populated series round-trips whole, asserted as a deep equality rather than
   field by field, because a per-field assertion cannot see a field that vanished.
2. A null `covered` is `null` on the raw body, and the key is present rather
   than dropped.
3. An empty series still carries the requested window and the provenance —
   §6's argument for why it is a 200 with a body rather than a 204.
4. A stitched series keeps both sources and both feeds (`sip` and `iex` in one
   array), which is the entire reason `sources` is a list. Today both parts of a
   real stitch report `sip`; asserting it now means the shape cannot be
   flattened before Epic 3 needs it.
5. An `untracked` security is served with its history and says so.
6. **The failure the guard exists to prevent, demonstrated**: unknown fields at
   three levels of the envelope are silently stripped, with a 200 and a green
   build. That is what a forgotten schema entry looks like from the outside.

`pnpm verify` passes with no database running.

---

## For the stakeholder — what this actually was, in plain terms

### The one-sentence version

We wrote down, in a form the compiler enforces, exactly what the server is
allowed to say back when someone asks for a stock's price history — including
how it says _"we only have part of that"_ and _"we have none of that"_ without
pretending either is an error.

### Why a whole task for "the shape of an answer"

The chart you will see in a few weeks is drawn from numbers this server sends.
Between the database and the chart sits a translation step, and this task
defined its output.

That step has one property worth knowing about, because it is the reason this
was worth an hour more than it looks like it needs: **the machinery that turns
our data into a response deletes anything the contract does not mention, without
complaining.** If we add a piece of information to the data — say, which
exchange a run of prices came from — and forget to add it to the contract, the
build passes, every test passes, the server returns a perfectly valid-looking
answer, and the information is simply gone. Nobody finds out until somebody
notices a blank label on a screen.

So the contract is written with a compile-time tripwire on it. Add a field and
forget the contract, and the code refuses to build, naming the exact object you
forgot. This response has **seven** nested pieces — the answer, the series, each
price bar, the coverage window, the timestamps inside it, the provenance record
and each source in it — and the tripwire has to be attached to each one
separately; attaching it to the outer one does nothing for the six inside. We
attached all seven, then deliberately broke each one in turn to watch the build
fail. That is the eighth of the seven things: a check nobody has ever seen fire
is not a check, it is a hope.

### The three answers this contract can now give

Most systems can only say "here is your data" or "something went wrong". This
one distinguishes three things a market analyst genuinely needs to tell apart:

1. **"Here is everything you asked for."**
2. **"Here is what we have — it runs to 15:42, and you asked through 16:00."**
   Partial answers are _answers_. The response reports the window you asked for
   next to the window we actually reached, so the screen can say "data through
   15:42" honestly instead of drawing a chart that quietly stops early and looks
   complete.
3. **"We asked, and we hold nothing for this symbol."** Also a 200-and-a-body,
   not an error — because the body is the answer: it says _which window we
   looked in_, which is the difference between "nothing traded" and "we never
   asked".

There is a genuinely subtle bug we headed off here. The "we hold nothing" case
is expressed by a field being empty. It turns out that if you describe that
field slightly carelessly, the delivery machinery replaces the empty value with
an **empty piece of text** instead. That is invisible in almost every test,
because an empty text and a genuine nothing both behave the same way in most
code — right up until a screen tries to display one, and prints a blank where it
should print "no data held". We measured that exact behaviour, in this exact
shape, before choosing the shape, and there is now a test that reads the raw
bytes coming off the server rather than the tidied-up version, because the
tidying is precisely what hides the problem.

### The honesty requirement, and the thing that will matter in a month

MarketPulse must never show a number without being able to say where it came
from. That is not a nice-to-have — the free market-data plan we are on gives us
the **full US consolidated tape** for stored history but a **single exchange**
for live prices, and presenting the second as if it were the first would be
misleading in a way that matters to an analyst.

The complication is that a chart running up to _right now_ will be **stitched
together from both** — the stored history, plus a live tail. So the contract
carries a **list** of sources rather than one, and each part of a series names
its own. Today both halves of a stitch happen to be the same source and the seam
is invisible; when the live feed arrives, the same response will carry two, and
the screen will label each for what it is. We wrote a test for the two-source
case now, while it is easy, specifically so nobody can simplify the list down to
a single value in the meantime.

There is a related decision worth surfacing: if you ask about a company we have
**stopped tracking**, you get its stored history back, plus a note saying we no
longer track it. The tempting alternative — "not found" — would have been a lie
about data we are holding, and it would break the replay feature, which has to
be able to show you a day on which that company _was_ tracked.

### What you can see on screen today

**Nothing new.** This is the fourth of ten tasks in this piece of work, and the
first six are all under the surface. The order is deliberate: settle the
decisions, define what may be asked, define what may be answered, then read the
database, then build the endpoint.

The next task reads real bars out of the 48-million-row store. The one after
stitches on the live tail. Then the endpoint goes live as a URL you can open in
a browser and see genuine NVIDIA price history come back — and the task after
**that** is the first thing you will actually see: the last traded price and its
change, on the securities page that already exists. That will be the first real
market price this product has ever put on a screen.

### Why we went slightly against instructions in one place

The task asked for the contract's two halves — the type definitions and the
delivery description — to live in the shared library that both the server and
the browser read. We put the type definitions there and the delivery description
with the server instead.

The reason is that the delivery description is about _how this server puts bytes
on a wire_, which is not something the browser needs to know, and the shared
library is **downloaded by every visitor**. A decision recorded twice in this
codebase says exactly that, and three existing endpoints follow it. Reversing it
in passing, to satisfy the letter of one sentence, would have been a change to a
load-bearing rule made as a side effect. It is flagged here rather than done
quietly, so it can be overruled if the intent was the other way round.
