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
// that would make the guard check nothing. **Task 2.4.2 took that decision**,
// and the trigger was a response that is genuinely an array of objects with
// nullable fields in them: `object`, `items` as a full property, `properties`,
// `required`, and a `[T, "null"]` type union. Each is used by
// `routes/securities.ts` and none of them is speculative.
export interface JsonSchemaProperty {
  /**
   * A single type, or a union of one type with `"null"`.
   *
   * The union form is what a nullable field needs, and it is the shape
   * `fast-json-stringify` understands. Measured on `/securities` rather than
   * assumed, and the result is worse than the guess: a `sector` declared
   * plainly `"string"` serialises a genuine `null` as the **empty string**, not
   * as `null` and not as `"null"`. That is a silent corruption of exactly the
   * field whose nullability carries meaning here — and it is the quiet kind,
   * because `""` is falsy, so a client branching on truthiness behaves
   * correctly while a client rendering the value shows a blank cell that reads
   * as "unclassified", which is the inference Task 2.3.1 rejected outright.
   *
   * It is deliberately not `readonly JsonSchemaType[]` — an arbitrary union of
   * types is a field whose type nobody can read off the contract, and every
   * nullable field here is one type or absent.
   */
  readonly type: JsonSchemaType | readonly [JsonSchemaType, "null"];

  /**
   * For a union-typed string field, so the serialiser enforces the union.
   *
   * `null` is admitted as a member for the nullable case: `sector` is one of
   * eleven names **or** absent, and an enum listing only the eleven would be a
   * contract that excludes the value an index proxy actually carries.
   */
  readonly enum?: readonly (string | null)[];

  /**
   * For an array field: what one element is.
   *
   * `readonly string[]` was the whole of it until Task 2.4.2, whose response is
   * an array of objects. Recursive rather than a second shape, so an array of
   * arrays would also typecheck — which is a widening taken knowingly, because
   * the alternative is a type that has to be edited for every new nesting.
   */
  readonly items?: JsonSchemaProperty;

  /**
   * For an object field: what its properties are.
   *
   * **The `satisfies Record<keyof T, JsonSchemaProperty>` guard does not reach
   * in here, and that is the limit to know.** It checks that the *top-level*
   * keys of a schema match the keys of a type; a nested object's properties are
   * checked only if whoever wrote them applied the same guard to that object
   * too — which `routes/securities.ts` does, once per nested shape, for exactly
   * this reason. Nothing forces it.
   */
  readonly properties?: Readonly<Record<string, JsonSchemaProperty>>;

  /** For an object field: which of its properties are always present. */
  readonly required?: readonly string[];
}

/** The scalar and container types this application's responses actually use. */
type JsonSchemaType = "string" | "number" | "boolean" | "array" | "object";
