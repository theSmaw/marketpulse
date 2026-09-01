// The property type behind this repository's response-schema guard.
//
// It exists to be the second half of `satisfies Record<keyof T,
// JsonSchemaProperty>` — the idiom Task 1.7.3 introduced on `/health` and Task
// 1.7.4 applied to the error contract. That guard is what closes a silent
// failure class: Fastify serialises a schema'd response through
// `fast-json-stringify`, which strips every property the schema does not
// declare, so a field added to an interface and forgotten here disappears at
// runtime with a green build. With the guard, it is `TS1360` naming the field.
//
// It lives in its own file rather than being declared beside the first schema
// that needed it, because the second schema needed it too and a copy is how the
// two stop agreeing. This type is deliberately **not** in `packages/shared`:
// nothing outside this application declares a response schema, and Story 1.6's
// rule applies — shared means both sides depend on the same fact.
//
// It is also deliberately not a general JSON Schema type. It models exactly the
// property shapes this application's responses actually use, so widening it is
// a decision somebody takes on purpose rather than a `Record<string, unknown>`
// that would make the guard check nothing.
export interface JsonSchemaProperty {
  readonly type: "string" | "number" | "boolean" | "array";

  /** For a union-typed string field, so the serialiser enforces the union. */
  readonly enum?: readonly string[];

  /** For an array field. Every array in this contract is an array of strings. */
  readonly items?: { readonly type: "string" };
}
