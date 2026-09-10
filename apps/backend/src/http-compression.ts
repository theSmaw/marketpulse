// Response compression, and the hook order the validator depends on (Task
// 2.9.10).
//
// **Transport only**, the same line `http-cache.ts` draws: nothing here knows
// what a bar or a security is. It registers one plugin and argues one ordering
// question, and the ordering question is the whole of the work.
//
// ## Why this exists at all
//
// Task 2.9.9 measured the wire and found the encoding is `identity`, everywhere,
// always — neither this application nor the Azure Container Apps ingress
// compressed anything (`MARKET-DATA-API.md` §12.5). `/securities` is shipped,
// rendered on every load of the one page that shows real prices, and is
// **190,736 bytes**; deployed from the United Kingdom that measured **1,153 ms**
// against ~20 kB compressed. It is the single largest improvement available to
// this API and it is one dependency.
//
// ## The hook order, and both failures it can take — produced before choosing
//
// `http-cache.ts` installs an `onSend` hook whose **first guard is `typeof
// payload !== "string"`**. A compressor is also an `onSend` hook, so there are
// two orders and both have a failure in them:
//
//  1. **Compression first** hands the validator a `Buffer`, the guard takes its
//     early return, and **no response carries an `ETag` at all**. Nothing 404s,
//     nothing 500s, every existing test goes on passing — they run through
//     `app.inject()` and none of them negotiates an encoding — and every client
//     silently re-downloads a body it already had. Produced deliberately, with
//     an instance-level `onSend` returning a gzipped `Buffer` ahead of the
//     validator: **no `etag` on the 200, and the conditional request answered
//     `200` with the full body** rather than `304`. That is the shape to be
//     afraid of, and it is why it was made to happen once on purpose.
//  2. **Compression second** hands the compressor the validator's output, which
//     for a `304` is the empty string. A `304` must not carry
//     `Content-Encoding`, so this was produced too rather than assumed: with
//     `threshold: 0` the shipped arrangement emits **a `304` carrying
//     `content-encoding: gzip` and a 20-byte body** — gzip's framing of nothing.
//     At the default threshold it does not, because the empty payload is below
//     it and the plugin returns before it touches a header.
//
// **What the experiment actually found is that order 1 is not reachable through
// this plugin**, and that is worth stating because it is the opposite of what
// the task expected. `@fastify/compress` does not add an instance-level hook: it
// listens on `onRoute` and attaches its `onSend` to each **route**, and Fastify
// runs route-level hooks after instance-level ones. Registering it at the root,
// before the validator inside a plugin, and after the validator inside a plugin
// all produced the identical entity tag over the identity bytes. So the order
// below is belt-and-braces on a property the plugin already guarantees — which
// is exactly why the argument is written down: the next reader will otherwise
// have to re-derive that a registration line they could move is safe to move.
//
// The `onSend` argument in `http-cache.ts`'s header survives all of this
// unchanged: the validator still hashes the string `fast-json-stringify`
// produced, after every undeclared field has been stripped, because compression
// happens strictly downstream of it.

import compress from "@fastify/compress";
import type { FastifyInstance } from "fastify";

/**
 * The smallest body worth compressing, in bytes.
 *
 * `@fastify/compress`'s own default, restated here rather than inherited, for
 * the reason every option in `tsconfig.base.json` is explicit: an upgrade must
 * not be able to quietly change what goes on the wire, and this number is one
 * of the two guards keeping `Content-Encoding` off a `304` (the other being
 * that a `304`'s payload is the empty string, which is below any positive
 * threshold).
 *
 * It is a *measured* number rather than a default that happened to be there.
 * Below roughly a kilobyte, gzip's framing and the `Content-Encoding` and
 * `Vary` headers cost more than the coding saves, and every response this API
 * serves under it is a refusal, a 404 or `GET /market-data` — 173 to 258 bytes,
 * where the round trip is the entire cost (§12.8: a 173-byte 404 is 280 ms,
 * which is the link). The bodies this task exists for are 44 kB and up.
 */
const COMPRESSION_THRESHOLD_BYTES = 1024;

/**
 * The largest body compressed on the synchronous path, in bytes.
 *
 * `0` disables that path entirely: **every** body above the threshold is
 * compressed through a stream, which puts the coding on libuv's threadpool
 * instead of on the event loop. Two reasons, and both are measurements.
 *
 * **The plugin's default is derived from `availableParallelism()`**, so the
 * same code compresses synchronously on a small host and through a stream on a
 * large one. On this laptop it computes to 4,096; the deployed replica has 0.25
 * vCPU (`HOSTING.md`) and would very likely compute something else. A behaviour
 * that differs by host is a figure that cannot be re-taken.
 *
 * **And the two paths cost the same serially and are not the same under
 * load.** One request at a time, gzip adds +16.2 ms to the 1.10 MB
 * at-the-cap series either way — the coding is the coding. With **four
 * concurrent** such requests in flight and a `/health` probe running beside
 * them, on loopback through the built server:
 *
 * | Path            | 32 × 1.10 MB | `/health` p95 | `/health` max |
 * | --------------- | ------------ | ------------- | ------------- |
 * | Synchronous     | 798 ms       | **92.7 ms**   | 93.8 ms       |
 * | Streamed (`0`)  | **487 ms**   | **29.7 ms**   | 40.6 ms       |
 *
 * The synchronous path holds the loop for the whole of each coding, so the
 * probe waits behind it; the streamed path answered 143 probes in the same
 * window against 42. On a **single replica** — `maxReplicas: 1`, measured — the
 * event loop is the whole server, and a platform liveness probe is one of the
 * things queued behind it.
 *
 * The price is that a compressed response carries **no `Content-Length`**: it
 * is `Transfer-Encoding: chunked`, so a client cannot show determinate
 * progress, and `MARKET-DATA-API.md` §12.5's method of reading a size off that
 * header does not work on a compressed response. `curl`'s `%{size_download}`
 * does, and it is what the re-taken figures use.
 */
const SYNC_THRESHOLD_BYTES = 0;

/**
 * Register response compression for every route on this instance.
 *
 * Called once from `buildServer()`, beside CORS and the error contract, because
 * like both of those it is a property of the **application** rather than of any
 * route — and unlike `installResponseValidator`, which is deliberately
 * per-plugin so a route opts in by setting `Cache-Control`, there is no
 * response this API serves that should be excluded. The small ones are excluded
 * by their size, which is a better rule than a list of paths that goes stale.
 *
 * `global: true` is stated rather than left implicit: it is the plugin's
 * default, and the alternative — per-route `compress` options — would put the
 * decision in as many places as there are routes.
 *
 * Only `gzip` and `deflate` are offered, and **`br` is deliberately declined**.
 * Brotli compresses this JSON a little better and costs materially more CPU on
 * the request path, and the deployed backend is one replica at 0.25 vCPU
 * (`HOSTING.md`). Where the saving is entirely transfer and the budget is
 * entirely CPU, the cheap coding is the right one; the condition for revisiting
 * is a measurement showing the server is not the constraint.
 */
export function installResponseCompression(app: FastifyInstance): void {
  app.register(compress, {
    global: true,
    threshold: COMPRESSION_THRESHOLD_BYTES,
    encodings: ["gzip", "deflate"],
    syncThreshold: SYNC_THRESHOLD_BYTES,
  });
}
