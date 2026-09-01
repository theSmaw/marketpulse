# Task 1.7.3 — The error contract, and whether responses carry a JSON schema

**Status:** Not started
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
