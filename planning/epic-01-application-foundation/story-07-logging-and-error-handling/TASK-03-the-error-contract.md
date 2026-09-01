# Task 1.7.3 — The error contract, and whether responses carry a JSON schema

**Status:** Complete
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Task 1.7.2

## Objective

Define the single shape every API error takes, put it where both apps can see it, and close the response-schema question Task 1.2.3 deferred and Story 1.6 declined to take.

## Work

- **This is the first genuinely shared contract, so it goes in `packages/shared` — and that has a cost worth stating at the top.** Shared is consumed as **built output**, so editing the error shape means rebuilding it before either app typechecks against the change. `pnpm build` and `pnpm verify` order that themselves; a bare `tsc --noEmit` in an app passes against the previous shape. Task 1.6.1 declined to put the _config_ type there because the two apps share no variable — the error shape is the opposite case, and the contrast is worth one sentence in the outcome so the rule is not read as "never use shared"
- **Design the shape against `exactOptionalPropertyTypes`, which bites here harder than anywhere so far.** An error with `details` absent and one with `details: undefined` are different types. The domain reason is the same one that put the setting there — a missing field and an explicitly unknown one are different states — and this is the story where that first shows up in real code. Declare the interface by hand and make the constructors produce it; do not infer it from anything
- **Fields, and the ones to argue about.** A machine-readable `code` (a string union, not a free string, so a client can branch on it without matching prose), a human-readable `message`, the correlation id from Task 1.7.2 — which is now a concrete thing rather than a promise: `request.id`, a UUID v4, already on every response as `x-request-id` — and an optional `details`. Two things to settle: whether the payload is wrapped (`{ error: { … } }`) or flat, and whether `code` is a union today — a union of one member is honest and makes the next addition non-breaking, exactly as `HealthStatus` is a union of `"ok"`
- **This is a transport error, not a `Finding`, and conflating them would be expensive.** Architectural invariant 5 gives findings `CONFIRMED`/`SUPPORTED`/`POSSIBLE`/`UNKNOWN` and an evidence trail; "not enough evidence" is a **successful** response carrying an uncertain finding, not an error. Say so here, because the next reader looking for "how do we express uncertainty" will find this file first
- **Now the schema question, which Story 1.6 explicitly did not settle.** Task 1.2.3's deferral is recorded at the registration site in `apps/backend/src/server.ts`. Story 1.6 threw away Zod and Valibot on the ground that a schema over `process.env` is a schema over strings — and ADR 0006 §1 says outright that the argument does **not** transfer to a JSON body, which is typed data and the case a schema is actually good at. So weigh the real options here: Fastify's built-in JSON Schema support (ajv is already in the tree as a Fastify dependency, so this is zero new packages), a library, or nothing
- **Measure the two things a Fastify response schema actually does**, because one of them is a criterion and the other is a trap:
  - It serialises through `fast-json-stringify`, which **strips properties not declared in the schema**. That is a real mechanism for criterion 6 — internal detail cannot reach a client if the serialiser has no slot for it — and it is stronger than remembering not to include it
  - The same stripping is silent. Add a field to `HealthResponse`, forget the schema, and it vanishes at runtime with a green `tsc -b`, a green lint and a green build. That is a **fourth** silent-failure class in this repository, alongside the misspelled CSS Module class, the missing `.js` import extension and the unchecked router path. Either close it or record it as known and dated, the way the `scripts/dev.sh` gap is
- **If a schema is adopted, decide the duality deliberately.** A shape declared as a TypeScript interface _and_ as a JSON Schema is one fact in two places. The options are deriving the type from the schema (`json-schema-to-ts` or Fastify's type providers — a dependency of `apps/backend`, and a check on whether it survives `strictTypeChecked` and `verbatimModuleSyntax`), deriving nothing and writing both, or declaring the schema only where it earns its keep. Whatever is chosen, `/health` is the first application: Task 1.2.3 left it schemaless on purpose and this task is where that ends, one way or the other
- **This task also owns a question Task 1.7.2 deliberately left open: where the `x-request-id` name lives.** It is currently a single exported constant in `apps/backend/src/request-id.ts`, because 1.7.2 was backend-only and moving a lone string into `packages/shared` would have pre-empted how this task structures the wire contract. Now the contract has a structure. If the error shape goes to `packages/shared`, the header name is the same kind of fact and should go with it; if it does not, say why the two are different. The thing to avoid either way is Story 1.12 writing the string out by hand, which is the fourth silent-failure class in a different costume — a header name typo is not a compile error anywhere
- **Leave the shape unused if that is the honest state.** This task defines the contract and applies the schema decision to `/health`; Task 1.7.4 is what makes errors take the shape. Shipping a type nothing constructs yet is fine and is better than half-wiring the handler here

## Done when

- The error interface exists in `packages/shared`, exported from its index, with each field's presence justified
- The home of the `x-request-id` constant is decided either way, with the reason
- The wrapped-vs-flat and union-vs-string decisions are recorded, not just implemented
- The schema question is closed with a measurement — at minimum, whether the stripping behaviour was observed rather than read about
- `/health`'s deferral is resolved and the comment in `server.ts` is replaced by the decision rather than left describing a question that has been answered
- The silent-stripping hazard is either checked or written down as known, dated, and with the reason it was accepted
- `pnpm verify` exits 0 from a tree where `packages/shared` was rebuilt

## Notes

The one thing not to do here is invent error codes for failures that do not exist yet. Epic 7's failed analytical tools, Epic 9's SEC unavailability and Epic 10's agent failures are all product states with their own vocabulary; this contract has to accommodate them, not enumerate them.

## Outcome

The contract exists, `/health` carries a schema, and **nothing constructs an
`ApiError` yet** — that is Task 1.7.4's job and shipping the shape unused was
preferred to half-wiring a handler here.

### What landed

| File                                | What                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `packages/shared/src/api-error.ts`  | `ApiError`, `API_ERROR_CODES`, `ApiErrorCode`, `apiError()` — new          |
| `packages/shared/src/request-id.ts` | `REQUEST_ID_HEADER`, moved here from the backend — new                     |
| `packages/shared/src/index.ts`      | both exported from the package root                                        |
| `apps/backend/src/request-id.ts`    | keeps the generator and the validation; imports the name                   |
| `apps/backend/src/server.ts`        | imports the name from shared; the schema deferral replaced by the decision |
| `apps/backend/src/routes/health.ts` | the response schema and the `satisfies` guard that keeps it in step        |

### The decisions

**Flat, not wrapped.** Decided on one question rather than on taste: where does
`requestId` go? It is a property of the response and not of the failure — the
same id is on every successful response as `x-request-id` — so inside an
`{ error: … }` wrapper it is misfiled and outside it the payload has two levels
for four fields. The HTTP status has already done the wrapper's usual job of
telling success from failure. **RFC 9457 `application/problem+json` was
rejected for the reason `request-id.ts` rejected `traceparent`**: its
machine-readable discriminator is a `type` URI meant to dereference to
documentation, and adopting the field names without the URIs behind them is the
shape of the thing without the thing.

**`code` is a union, of exactly two.** `NOT_FOUND` and `INTERNAL_ERROR`, and
both are measured rather than anticipated — they are the two failures the
server already produces today, verified against the running instance. A union
rather than a free string so a client branches on a value instead of matching
prose; two members rather than one because there are honestly two.
SCREAMING_SNAKE unlike `AnomalyBand`'s lowercase, because those are names an
interface renders to a human and these are discriminators a client switches on.
Epic 7's tool failures, Epic 9's SEC unavailability and Epic 10's agent
failures are **not** enumerated: the contract accommodates them, it does not
guess at them.

**`details` is `readonly string[]`, never an object.** An open-ended
`Record<string, unknown>` is the field a leak arrives through — an exception, a
query, a stack ends up in it without anybody deciding it should. Every entry is
a sentence already fit to show a user, by construction. Optional, and the
`exactOptionalPropertyTypes` handling is in `apiError()` below.

**Two fields deliberately absent.** No `statusCode` — Fastify's own default
body has one, and a copy in the body is a second place for the status to be
wrong. No `timestamp` — the log record has one and the correlation id joins the
two.

**It is a transport error and not a `Finding`.** Written into the module's own
doc comment, because the next reader looking for "how do we express
uncertainty" will find this file first. "Not enough evidence to explain this
move" is a **successful** response carrying an uncertain finding.

**The header name moved to `packages/shared`; only the name.** The generator
and the inbound-id validation are server behaviour with a threat model behind
them and stayed in `apps/backend/src/request-id.ts`, which now imports the
constant. The contrast with Story 1.6 is worth stating so the rule is not read
as "never use shared": 1.6 declined to put the _configuration_ type here
because the two apps share no environment variable — that would have been a
shared file with one consumer. Shared means both sides depend on the same fact.

### The schema question, closed with measurements

**Fastify's built-in JSON Schema, declared per route. Zero new dependencies** —
ajv and `fast-json-stringify` arrive with Fastify. Story 1.6's rejection of Zod
and Valibot was not reused and does not transfer, exactly as ADR 0006 §1 says:
that was a schema over `process.env`, which is a schema over strings.

| Measurement                                | Result                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| Undeclared property, schema present        | **stripped** — `secret` absent from the wire entirely                            |
| Undeclared property, no schema             | serialised verbatim, `postgres://user:pw@10.0.0.4/db` and all                    |
| `required` property the handler omits      | **500** at runtime, `{"statusCode":500,…,"message":"\"buildSha\" is required!"}` |
| Declared type disagreeing with the value   | **silently coerced** — a `number` declared `"string"` went out `"1.5"`           |
| `/health` over 20 000 `app.inject()` calls | **11.9 µs** with schema against **14.9 µs** without                              |
| Schema attached to the live route          | confirmed via an `onRoute` hook on the built server                              |

So the stripping was observed rather than read about, and it is a real
mechanism for criterion 6: internal detail cannot reach a client if the
serialiser has no slot for it.

### The fourth silent-failure class was closed, not recorded

The stripping is silent in the direction that matters — add a field to
`HealthResponse`, forget the schema, and it vanishes at runtime with a green
`tsc -b`, lint and build. That is closed for zero dependencies by declaring the
schema's properties:

```ts
} satisfies Record<keyof HealthResponse, JsonSchemaProperty>;
```

Verified in the real tree: adding `buildSha: string` to the interface gives
**TS1360** naming the missing property, and a property here that is not on the
interface is an excess-property error. `required` is `Object.keys(properties)`,
so it cannot fall behind either.

**Two smaller gaps stay open, known and dated 2026-09-01**: the silent type
coercion and the runtime 500 for an omitted `required` field, both in the table
above. Closing either means deriving the type from the schema
(`json-schema-to-ts` or a Fastify type provider), which is a dependency of
`apps/backend` and a second place the response shape lives. The guard costs
three lines and catches the class that actually loses data; the coercion case
needs the JSON and TypeScript types to disagree, which is a narrower mistake.
**Copy the idiom for every new route** — it is written up in `README.md` and in
`CLAUDE.md`.

### `exactOptionalPropertyTypes`, in real code for the first time

The obvious constructor does not compile:

```
TS2375: Type '{ …; details: readonly string[] | undefined; }' is not assignable
to type 'ApiError' with 'exactOptionalPropertyTypes: true'.
```

So `apiError()` branches and builds the object two ways. The branch is not
style — it is what makes an absent `details` genuinely absent rather than
explicitly unknown, which is the domain distinction the setting exists for.

### Cost

- **No new dependency**, in any package. `allowBuilds` did not fire.
- **The frontend artefact is byte-identical to `HEAD`'s** — same hash
  `index-BAidohu3.js`, 342.01 kB, 9.82 kB of CSS, three files. The new shared
  exports are tree-shaken away because the frontend imports none of them yet.
- **One correction found by re-measuring rather than citing**, which is this
  repository's own rule: the artefact is **342.01 kB**, not the 342.08 carried
  through Story 1.5 and Story 1.6. Both a `HEAD` build and a build with these
  changes produce the same hash, so nothing since Story 1.5 moved it and the
  written figure was simply 0.07 kB high. `CLAUDE.md` now says so beside the
  original.
- `pnpm verify` exits 0 from a tree with `packages/shared` rebuilt.

### For the tasks that follow

- **Task 1.7.4** constructs the shape. `apiError()` is the constructor; the id
  is `request.id` and must not be re-minted. It should declare the error
  response's JSON schema with the same `satisfies Record<keyof ApiError, …>`
  idiom, which is where the stripping becomes criterion 6's mechanism for the
  responses that actually carry internal detail today — Fastify's current 500
  returns the thrown error's own message verbatim.
- **Task 1.7.7** has a new ADR section to write: the wire contract, its four
  rejected alternatives (wrapped, RFC 9457, a free-string `code`, an object
  `details`), the schema decision, and the `satisfies` guard as the answer to a
  silent-failure class this repository has three other instances of.
