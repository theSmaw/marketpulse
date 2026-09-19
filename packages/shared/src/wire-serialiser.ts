/**
 * The socket's answer to `satisfies Record<keyof T, JsonSchemaProperty>`.
 *
 * ## What the HTTP wire gets for free, and why a socket gets none of it
 *
 * Every route in this repository declares a response schema with
 * `satisfies Record<keyof T, JsonSchemaProperty>`, and that buys **two
 * separate guarantees** which are easy to mistake for one:
 *
 * 1. **Compile-time exhaustiveness.** A field added to the interface and not to
 *    the schema is `TS1360`, naming the missing property.
 * 2. **Runtime narrowing.** `fast-json-stringify` **strips every property the
 *    schema does not declare**, which is the mechanism behind *no internal
 *    detail reaches a client* — and it is a property of the serialiser rather
 *    than of the type.
 *
 * **A socket has neither.** `JSON.stringify` of whatever the handler is holding
 * serialises *everything* — so the failure mode does not merely persist, it
 * **inverts**:
 *
 * | | HTTP response | Socket message |
 * | --- | --- | --- |
 * | Field on the type, missing from the schema | **Vanishes** silently | — |
 * | Field on the object, not on the type | **Stripped** | **LEAKS** |
 *
 * An absence is a bug you eventually notice because something is missing. **A
 * leak is a bug nobody notices at all**, and what leaks is whatever a developer
 * attached to the internal object — a credential on a config, an error with a
 * stack, a database row's id.
 *
 * ## What this module is
 *
 * A **field map**: one serialiser per field, keyed by the type's own keys. It
 * restores both guarantees without a dependency:
 *
 * - **Exhaustiveness** — {@link WireFields} is a mapped type over `keyof T`
 *   with `-?`, so a field added to `T` and not to the map is a **compile
 *   error** naming it. The `-?` matters: an optional field would otherwise be
 *   satisfiable by omission, which is exactly the hole being closed.
 * - **Narrowing** — {@link toWire} builds its output by walking **the map's
 *   keys**, never the value's. A property on the object and not on the type
 *   cannot reach the wire, because nothing ever reads it.
 *
 * So the rule §11.1 states — *a frame is produced by a named serialiser over a
 * declared type, never by `JSON.stringify` of whatever the handler is holding*
 * — is enforced by the compiler rather than by review.
 *
 * ## What it deliberately does NOT do
 *
 * **It does not validate types on the way out**, and that limit is inherited
 * rather than new: `health.ts` records that the HTTP guard *"checks that the
 * keys match, not that the types do"*, and a `number` declared as `"string"`
 * went out as `"1.5"`. Here the field serialiser's return type is checked by
 * the compiler, which is strictly better — but a serialiser that returns the
 * wrong *shape* of JSON is still the author's mistake to make.
 *
 * **It is not a parser.** Inbound messages are {@link fromWire}'s problem and
 * that is a different job with a different failure: the browser must not crash
 * on a malformed message, so decoding returns a **value** rather than throwing.
 */

/** Anything that survives `JSON.stringify` unchanged. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * One serialiser per field of `T`.
 *
 * **`-?` is load-bearing.** Without it an optional field on `T` could be
 * satisfied by leaving the map entry out, which is the precise hole this exists
 * to close — a field that is optional on the type is still a field that must
 * have a decided wire representation.
 */
export type WireFields<T> = {
  readonly [K in keyof T]-?: (value: T[K]) => JsonValue;
};

/**
 * Build a wire object from a declared type and its field map.
 *
 * **It walks the MAP's keys, not the value's**, and that single choice is what
 * makes a leak structurally impossible: a property present on `value` and
 * absent from `fields` is never read, so it cannot be written.
 */
export function toWire<T>(
  fields: WireFields<T>,
  value: T,
): Readonly<Record<string, JsonValue>> {
  const wire: Record<string, JsonValue> = {};

  for (const key of Object.keys(fields) as (keyof T)[]) {
    const encode = fields[key];
    wire[String(key)] = encode(value[key]);
  }

  return wire;
}

/** The identity serialiser, for fields already of a JSON type. */
export const asIs = <T extends JsonValue>(value: T): T => value;

/** An instant on the wire is always an ISO 8601 string. */
export const asInstant = (value: Date): string => value.toISOString();
