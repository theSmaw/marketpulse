# Task 2.9.10 — Compress the wire

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.9

> **Added 2026-09-10, after Task 2.9.9 measured that nothing on this path
> compresses.** The close task that was 2.9.10 is now 2.9.11, because this has to
> land before `MARKET-DATA-API.md` is finished and an ADR is written against a
> wire shape that is about to change.

## Objective

**Make the responses this story serves compress, and re-take the figures §4's cap
decision rests on.** Story 2.9's scope has said from the start that _"a year of
minute bars is large enough that the encoding matters — measure it before
choosing anything clever"_. It has now been measured (`MARKET-DATA-API.md` §12.5)
and the measurement is that **the encoding is `identity`, everywhere, always**.

## Why this is a task and not a condition

Task 2.9.9 found five things and deliberately built none of them. This is the one
that comes back as a task rather than a trigger, for three reasons that are worth
separating, because the other four findings fail at least one of them:

1. **It is a live cost, not a future one.** `/securities` is shipped, is fetched
   on every load of the one page that shows real prices, and is **190,736 bytes**
   — measured at **1,153 ms** deployed, against ~20 kB compressed. The calendar
   walk (§12.4) costs nothing until a chart asks for a decade; this costs today.
2. **This story's scope names it**, and its stated precondition — measure first —
   is now satisfied. Nothing else in §12 has a scope bullet waiting for it.
3. **§4's cap argument is currently amended-false.** The cap is stated on a
   gzipped-transfer argument and nothing gzips, so the number stands on a
   re-argument rather than on its own reasoning. Shipping compression makes §4
   true again, which is a better repair than a paragraph explaining why it isn't.

**Story 2.9 is also the last backend-only story in the epic.** Everything after
it renders. If this is not done here, the natural owner is nobody.

## What the user can see when this lands

**Nothing new on screen, and the one screen there is gets faster.** `/securities`
is the only rendered page that fetches from this API, and its payload should fall
from ~190 kB to ~20 kB. Say the measured before-and-after rather than "faster" —
and note the local figure will be unimpressive, because 190 kB costs nothing over
loopback (§11 says this about the validator for the same reason). **The deployed
reading is the one that means anything.**

## Work

- **Register a response-compression plugin** (`@fastify/compress` is the obvious
  candidate; it is not chosen here, and if something else is chosen say why).
  Everything below is about getting it right rather than getting it registered.

- **THE TRAP, AND IT IS A SILENT ONE. `http-cache.ts`'s validator is an `onSend`
  hook whose first guard is `typeof payload !== "string"`.** A compression plugin
  is also an `onSend` hook, and hook order inside one encapsulation context is
  **registration order**. So:

  - **Compression registered first** hands the validator a `Buffer`, the guard
    takes the early return, and **no response carries an `ETag` at all**. Every
    one of Task 2.9.8's tests goes on passing, because they all run through
    `app.inject()` and none of them negotiates an encoding. That is the exact
    failure shape `CLAUDE.md` names — a green run certifies internal consistency,
    not an environment — and it would ship silently.
  - **Compression registered second** hands the compressor the validator's
    output, which for a `304` is the empty string `""`. A `304` must not carry
    `Content-Encoding`; check what the plugin does with an empty payload on a
    304 rather than assuming it does nothing.

  **Produce both failures before choosing an order**, the way Task 2.9.8 produced
  its three breaks — a break that does not go red is equally evidence the break
  did not land.

- **Decide what the `ETag` is a validator FOR, and say it.** `strongETag` is
  strong, and RFC 9110 makes a content-coding a **different representation** — so
  one strong validator covering both the gzipped and the identity bytes is, read
  strictly, wrong. There are three honest answers and the plugin may already take
  one of them: hash before compression and mark the validator **weak**; let the
  compressor **suffix** the entity-tag per encoding; or hash after compression and
  emit `Vary: Accept-Encoding`. **Find out which one is actually happening rather
  than which one the documentation describes**, and write the reason into
  `http-cache.ts` beside the hook, where the next person meets it.

  Note the existing header comment argues `onSend` was chosen so the validator
  hashes **the bytes after `fast-json-stringify` has stripped undeclared
  fields**. Whatever order is chosen must keep that property true, or the
  paragraph explaining it becomes false and has to be amended rather than left.

- **`Vary: Accept-Encoding`, and whether `private` already covers it.** §11's
  argument for `private` is that two headers on this API are per-requester, so no
  shared cache should hold these bodies at all. If that argument holds, `Vary` is
  belt-and-braces rather than load-bearing — but say which, because "we set
  `private` so `Vary` does not matter" is a claim about every intermediary
  between here and a browser, and §12.5 is the section that exists because an
  assumption of that shape was wrong.

- **Measure the CPU, do not assume it is free.** The deployed backend is one
  replica at 0.25 vCPU (`HOSTING.md`), and compressing a 1 MB body is real work on
  the request path. §12.1 has the uncompressed serialise costs to compare
  against, and §11 has the miss/hit/304 medians. Take the same three, the same
  way — **distinct window per sample, or you will measure the cache** (§11) —
  and report the added server time beside the removed transfer time. If the trade
  is bad at the cap, a size threshold is the ordinary answer and it should be a
  measured number rather than a plugin default.

- **Then confirm it deployed, and treat that as a gate rather than a reading.**
  This is the same gate Task 2.9.8 was given and for the same reason: the Azure
  Container Apps ingress is configured by no file in this repository, it is
  already known **not** to compress on its own behalf (§12.5), and an ingress that
  strips, re-encodes or buffers `Content-Encoding` makes the whole thing inert
  with every test green. Four readings, `curl` against the deployed backend:

  1. `GET /securities` with `Accept-Encoding: gzip` answers **`content-encoding:
gzip`** and a `content-length` in the tens of kilobytes;
  2. the same request **without** `Accept-Encoding` still answers the full
     identity body, unchanged;
  3. a conditional request still answers **304**, still carrying `cache-control`
     and `etag`, and **without** `content-encoding`;
  4. `GET /market-data/bars` over an absolute closed window answers
     `cache-control: private, max-age=300`, an `etag`, and gzip — i.e. §11's four
     header readings still hold with compression in front of them.

  **If any differ, it is a falsification of §11 or §12.5 and it sweeps upward the
  same day**, not a variation for a table.

- **Re-take the figures that change, and only those.** §12.1's `gzip` column stops
  being hypothetical and becomes the wire; §12.5's whole framing inverts; §4's
  amendment gets a second dated note saying the original argument is true again
  and on what date. §12.8's deployed table wants its 200 rows re-taken — the 304
  rows should not move, which is itself a check. **Do not re-take §12.2, §12.4,
  §12.6, §12.7 or §12.11**: none of them touch the encoding, and re-taking a
  figure nothing changed is how a document acquires two numbers for one thing.

- **The frontend needs no change and that should be confirmed rather than
  assumed.** `api-client.ts` uses `fetch`, browsers negotiate and decompress
  transparently, and `useSecurities` sees the same JSON. One `pnpm e2e` run
  against a locally started pair is the check, because Task 2.9.7 put a rendered
  page on this path.

## Done when

- A compression plugin is registered, and **the hook order is argued in a comment
  beside it** rather than being whichever order happened to work
- **Both order failures were produced and seen red** — the missing `ETag` and
  whatever a `304` does — before the shipped order was chosen
- What the `ETag` validates under content negotiation is **established by
  observation** and written into `http-cache.ts`; if the existing header comment's
  `onSend` argument stopped being true, it is amended rather than left
- A test asserts a compressed response carries an `ETag` **and** that a
  conditional request still earns a 304 — that is, a test that would have caught
  the silent order, which means it must negotiate an encoding rather than use a
  bare `app.inject()`
- The four deployed readings are taken and quoted, and any difference from local
  is swept upward the same day
- The CPU cost is measured, not assumed, and a size threshold is either set on a
  number or explicitly declined
- `MARKET-DATA-API.md` §4, §12.1, §12.5 and §12.8 carry the re-taken figures with
  their date; **§12.2, §12.4, §12.6, §12.7 and §12.11 are untouched**
- `pnpm verify` passes, and `pnpm e2e` passes against a locally started pair

## Notes

**The failure mode to be most afraid of here is not a broken response — it is a
working one with no `ETag` on it.** Task 2.9.8 bought a mechanism whose entire
value is invisible when it is absent: nothing 404s, nothing 500s, nothing looks
wrong, and every client simply re-downloads a body it already had. Both of this
task's suggested breaks exist to make that visible once, deliberately, before it
happens by accident.

**And do not let this grow.** It is one plugin, one ordering decision, one test
that negotiates an encoding, and a re-take of four tables. The other four findings
in §12 have their own conditions written as conditions; none of them is this
task's.
