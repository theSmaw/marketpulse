// The validator: an `ETag` recomputed from the whole serialised body, and the
// `304` that a matching `If-None-Match` earns (Task 2.9.8).
//
// **Transport only.** Nothing here knows what a session, a bar or a security
// is; `series-cache.ts` owns every market-shaped decision and this file owns
// the two HTTP mechanisms that carry them. The split is the same one
// `series-request.ts` and `routes/market-data.ts` already have — a pure module
// that can be tested without a socket, and a route that wires it up.
//
// ## Why a validator rather than a long `max-age`
//
// Task 2.9.8's objective is the cheapest caching opportunity this product will
// ever have: **the bars of a closed session never change.** Two things have
// since been found true of the *response* that are not true of the *bars*, and
// they arrived from different directions:
//
//   - **A vendor correction overwrites a bar and moves its `recorded_at`**
//     (Story 2.8's open decision 1), so a correction landing against a closed
//     session changes a price *and* the `retrievedAt` beside it, inside a
//     window the calendar calls immutable. Rare, and `BarWriteResult.corrected`
//     exists because it would otherwise be undetectable.
//   - **`securityStatus` does not come from `market_bars` at all** (Task
//     2.9.6). It is read from `securities`, and `pnpm universe` can flip a
//     security from `active` to `untracked` at any moment — including against
//     a window of sessions that closed years ago. So a response about a closed
//     session is **immutable in its bars and mutable in its envelope**, and a
//     freshness lifetime derived purely from the calendar would serve a stale
//     label under a correct-looking body.
//
// One mechanism survives both, and it is this one: an `ETag` recomputed from
// the **bytes that are about to be sent** changes when anything in them
// changes, whichever half moved. A long `Cache-Control: max-age` does the
// opposite — it is a promise made before the change, which a client has no way
// to withdraw and we have no way to reach.
//
// So: **no response this application serves carries a long `max-age`, and none
// carries `immutable`.** What a closed window earns is a *short* freshness
// lifetime (`series-cache.ts`'s five minutes) on top of the validator, which
// buys a repeated window with no round-trip at all while bounding how long any
// party can hold a body a correction has invalidated.
//
// ## Why the handler declares cacheability and this hook does not
//
// The hook fires for every response the plugin it is registered in produces,
// and only some of them should be cached at all: `GET /market-data` reports a
// standing configuration, `/health` is a platform probe, and an `ApiError` is
// never worth a validator. Rather than teach a transport hook which routes
// those are — a list that goes stale the first time a route is added — the
// **handler sets `Cache-Control` and that is the signal**. A response with no
// `Cache-Control` gets no `ETag` and is never answered `304`.
//
// The mechanism is `onSend` rather than `preSerialization` deliberately, and it
// is the one place in this repository where `onSend`'s stated weakness is the
// property we want: it is handed the payload **as the string that will go on
// the wire**, after `fast-json-stringify` has stripped everything the schema
// does not declare. A validator computed before that would hash fields the
// client never receives, so two responses that differ only in a stripped field
// would carry different validators and revalidate forever.

import { createHash } from "node:crypto";

import type { FastifyInstance } from "fastify";

/**
 * `Cache-Control` for a response that must be revalidated before it is used.
 *
 * `no-cache` does **not** mean "do not store" — that is `no-store`, and it is
 * the wrong instruction here. `no-cache` means *store this, and ask me before
 * you use it*, which is exactly the arrangement that makes the `ETag` worth
 * having: the client keeps the body, sends `If-None-Match`, and gets a `304`
 * with no body when nothing has changed.
 *
 * `private` on both directives in this file, and it is not decoration. A shared
 * proxy caching this API would key on the URL alone, and two of this
 * application's headers are computed per requester — `@fastify/cors` echoes the
 * configured origin, and `x-request-id` is the correlation id. Neither is safe
 * to hand to a second client. The deployed frontend's own host caches nothing
 * on this path, so the browser is the whole audience anyway; `private` says so
 * rather than relying on it.
 */
export const REVALIDATE = "private, no-cache";

/**
 * `Cache-Control` for a response that may be reused without asking, for a
 * bounded time.
 *
 * The number is the caller's, and every caller in this repository passes
 * `series-cache.ts`'s single five-minute ceiling. There is deliberately no
 * `immutable` and no lifetime long enough to outlive a deployment: see the
 * module comment for the two things already found mutable in a response the
 * calendar calls immutable.
 */
export function reusableFor(seconds: number): string {
  return `private, max-age=${String(seconds)}`;
}

/**
 * A strong entity tag for a serialised body.
 *
 * SHA-1 rather than a stronger digest because this is a **change detector and
 * not a security boundary**: an attacker who can choose the bytes of a bar
 * series can already choose the bar series. `base64url` because every character
 * it produces is legal inside an ETag's quoted string, unescaped.
 *
 * Strong rather than weak (`W/`), which is a claim we can actually make: the
 * bytes are the response, byte for byte, with no transformation between here
 * and the socket — nothing in this application compresses, and the header is
 * computed from the payload the hook is about to return.
 */
export function strongETag(payload: string): string {
  return `"${createHash("sha1").update(payload).digest("base64url")}"`;
}

/**
 * Does an `If-None-Match` header name this tag?
 *
 * Three shapes have to be read, and two of them are easy to get wrong:
 *
 *   - **`*`** matches any existing representation. RFC 9110 §13.1.2.
 *   - **A list.** `If-None-Match: "a", "b"` is legal and a browser sends one
 *     after a redirect chain or a `Vary` split. Splitting on the comma is
 *     safe here because the tags this application emits are base64url and can
 *     never contain one.
 *   - **A weak tag.** `If-None-Match` uses the *weak* comparison function, so
 *     `W/"x"` matches `"x"`. Since every tag we emit is strong and unaltered,
 *     stripping the prefix and comparing is that comparison exactly.
 */
export function matchesETag(
  ifNoneMatch: string | undefined,
  etag: string,
): boolean {
  if (ifNoneMatch === undefined) return false;
  if (ifNoneMatch.trim() === "*") return true;

  return ifNoneMatch
    .split(",")
    .some((candidate) => weaken(candidate.trim()) === weaken(etag));
}

/** A tag without its weakness prefix, for the weak comparison function. */
function weaken(tag: string): string {
  return tag.startsWith("W/") ? tag.slice(2) : tag;
}

/**
 * Install the validator on a plugin's routes.
 *
 * Called from inside a plugin callback, so Fastify's encapsulation scopes the
 * hook to that plugin's routes and nothing else — the same property that lets
 * `market-data.test.ts` add a `preSerialization` hook without it reaching
 * `/health`.
 *
 * The three conditions are each load-bearing:
 *
 *  1. **A `200` only.** A `304` is a statement about a representation that
 *     exists; an `ApiError` is not one, and a `400` that happened to hash the
 *     same as a previous `400` would be answered with an empty body carrying no
 *     message at all.
 *  2. **A string payload only.** A stream or a `Buffer` cannot be hashed
 *     without consuming it. Nothing here serves either, so this is a guard
 *     against a future route rather than a branch anything takes today.
 *  3. **A `Cache-Control` the handler set.** See the module comment: the
 *     handler decides what is cacheable, and this hook decides how that is
 *     carried.
 */
export function installResponseValidator(app: FastifyInstance): void {
  app.addHook("onSend", (request, reply, payload, done) => {
    if (
      reply.statusCode !== 200 ||
      typeof payload !== "string" ||
      !reply.hasHeader("cache-control")
    ) {
      done(null, payload);
      return;
    }

    const etag = strongETag(payload);
    reply.header("etag", etag);

    if (!matchesETag(request.headers["if-none-match"], etag)) {
      done(null, payload);
      return;
    }

    // The body is dropped and the headers stay, which is what a `304` is: the
    // client already holds the representation and is being told it is still
    // current. `Cache-Control` and `ETag` travel with it — a `304` that omits
    // them tells the client nothing about how long the answer it kept is good
    // for, and it would revalidate on the very next request.
    reply.code(304);
    // **The `304` goes out with `Content-Length: 0`, and that was checked
    // rather than accepted.** RFC 9110 §15.4.5 says a `304` carries no content,
    // and a length header on one is a claim about a representation that is not
    // empty. `reply.removeHeader("content-length")` here does nothing: Fastify
    // computes the header from the payload *after* every `onSend` hook has run,
    // so the empty string wins whatever this hook says. Produced against a
    // running server before it was believed. Left as it is, because it is what
    // `@fastify/etag` emits, every client tested handles it, and the
    // alternative is a serialiser-level hook to save one header.
    done(null, "");
  });
}
