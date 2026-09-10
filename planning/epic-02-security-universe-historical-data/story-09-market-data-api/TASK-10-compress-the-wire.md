# Task 2.9.10 — Compress the wire

**Status:** Complete — the deployed gate was taken 2026-09-10 and all four readings pass
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

---

## What was done — 2026-09-10

`@fastify/compress` 9.2.0, registered in `buildServer()` beside CORS and the
error contract, gzip and deflate over every response above 1,024 bytes.
`apps/backend/src/http-compression.ts` is the whole of it and carries the
arguments beside the numbers; `MARKET-DATA-API.md` §13 is the record.

**Both order failures were produced and seen red before an order was chosen.**

| Break                                                                          | Result                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| An instance-level `onSend` returning a gzipped `Buffer` ahead of the validator | **No `etag` at all**, and the conditional request answered `200` with the whole body         |
| `threshold: 0` on the shipped arrangement                                      | **A `304` carrying `content-encoding: gzip` and a 20-byte body** — gzip's framing of nothing |

Both turn the four new assertions in `http-cache.test.ts` red — three and two
respectively — which is the check that the tests would have caught the silent
order rather than merely describing it.

**The trap this task was written around does not exist in this plugin, and that
is worth more than the ordering line it justifies.** `@fastify/compress` adds no
instance-level hook: it listens on `onRoute` and attaches its `onSend` to each
**route**, and Fastify runs route hooks after instance hooks. Registered at the
root, before the validator, and after the validator all produced the identical
tag over the identity bytes. The argument is written down anyway, in the module
and in §13.1, because the next reader would otherwise have to re-derive that a
line they could move is safe to move.

**What the `ETag` validates was established by observation.** The plugin
suffixes nothing — the same request with and without `Accept-Encoding: gzip`
returns the identical tag — and the validator cannot run last, so of the three
honest repairs only one was available: hash before the coding and mark the tag
**weak**. `strongETag` is now `weakETag` and emits `W/"…"`. The `onSend`
argument in `http-cache.ts`'s header survives unchanged and was amended only
where it claimed the bytes reach the socket untransformed.

**`Vary: accept-encoding` is set by the validator, not left to the plugin**,
which sets it only on a response it actually compressed — an identity `200` and
a `304` came back with none. It is belt-and-braces rather than load-bearing,
and §13.3 says which.

**Two numbers, both measured rather than defaulted.** The threshold is 1,024 —
the plugin's default, restated so an upgrade cannot quietly move it, and one of
the two guards keeping a coding off a `304`. The synchronous path is disabled,
because its default is derived from `availableParallelism()` and because four
concurrent at-the-cap requests hold `/health` at a **92.7 ms p95 synchronously
against 29.7 ms streamed**, on a server whose replica count is one. The price is
a chunked response with no `Content-Length`, stated in §13.4.

**What it bought, on the wire, locally:**

| Response                      | identity    | gzip      | Removed                    |
| ----------------------------- | ----------- | --------- | -------------------------- |
| `/securities`                 | 190,736 B   | 20,072 B  | 89.5%                      |
| `1m`, one session             | 44,701 B    | 7,549 B   | 83.1%                      |
| `1m`, at the cap (9,750 bars) | 1,104,621 B | 178,698 B | 83.8%                      |
| `1m`, one year — refused      | 258 B       | 258 B     | none — below the threshold |
| Unknown symbol — 404          | 173 B       | 173 B     | none — below the threshold |

Every gzip figure reproduced §12.1's hypothetical column **to the byte**, which
is the second confirmation that the column was honestly labelled rather than
optimistic.

**The frontend needed no change and it was confirmed rather than assumed:**
`pnpm e2e` passes against a locally started pair, 30 specs, including the three
that render the tracked universe from the real pair and the three axe runs over
it. `pnpm verify` passes.

**Documents swept the same day:** §4 gains a second dated amendment saying its
original arithmetic is true again; §11's mechanism and its bytes table gain
amendments for the weak validator and for the `gzipped` column becoming the
wire; §12.1 gains a re-taken table with both arms; §12.5's framing is inverted
in a dated note with its heading left standing; §12.8 carries a note saying what
it owes. §12.2, §12.4, §12.6, §12.7 and §12.11 are untouched. `STORY.md`'s scope
bullet is discharged. Nothing here falsifies `PRODUCT_SPEC.md`, an ADR or
`CLAUDE.md`.

### The upward sweep, done 2026-09-10 and not anticipated by this file

**This task's own work list said "re-take the figures that change, and only
those" and named five sections of one document. It named no code and no other
story, and three live claims outside `MARKET-DATA-API.md` were made false by the
same change** — which is exactly the shape `CLAUDE.md` warns about when it says
falsification travels upward and that recording a correction and propagating it
are two obligations. Found by grepping for the claim rather than by remembering
it:

| Site                                         | The claim                                                                       | What it is now                                                                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/frontend/src/api-client.ts`            | _"nothing in this stack compresses, which is Story 2.10's to look at"_          | False, and it also named the wrong owner — this story's scope owed it. Amended with the 20,072 B figure                                                                                       |
| `packages/shared/src/securities-response.ts` | _"quote the gzipped one"_, false since 2.9.9 and **true again** since this task | Both halves recorded, because the second is not a restoration of the first. And the number is **20,072 B, not the 19,526 there** — that reading was `gzip -9`, the plugin runs zlib's default |
| `apps/frontend/src/use-securities.ts`        | 190,736 B, as the reason not to poll the universe                               | The argument survives at 20,072 B — still ~330x `/health`'s 61 bytes per open tab — and the figure is dated rather than substituted                                                           |
| Story 2.11 `STORY.md`                        | _"take it uncompressed"_, which **Task 2.9.9 put there**                        | Reversed with a dated note. It moves that story's decision rather than decorating it: at 20 kB, client-side filtering needs no defending                                                      |

The last one is the one worth noticing. **Task 2.9.9 swept a claim into another
story's file eleven hours before this task made it false**, which is a sweep
behaving correctly and then being overtaken — the amendment says so rather than
quietly reversing it.

**One figure in that file is a deployed reading and cannot be re-taken here**:
`/securities` at ~1.15 s. It is marked as owed by the gate below.

### The deployed gate — taken 2026-09-10, all four pass

Taken against the deployed backend after the merge that carried this change.
`MARKET-DATA-API.md` §13.6 has the table; §12.8 has the re-taken timings.

1. `/securities` with gzip → `content-encoding: gzip`, **19,902 B**, `vary`,
   a weak `ETag`, `private, no-cache`.
2. Without it → the identity body unchanged, **`content-length: 190736`**, same
   `ETag`.
3. Conditional → **`304`, 0 B**, carrying `cache-control` and `etag`, and **no
   `content-encoding`**.
4. `/market-data/bars` over an absolute closed window → **`private,
max-age=300`**, an `etag`, gzip, 7,473 B.

**Nothing differs from local in a way that falsifies §11 or §12.5**, so there was
nothing to sweep upward.

**`/securities` fell from 1,153 ms to 484 ms, against its own 376 ms conditional
floor.** The prediction on record was 1,153 → towards 356; what is left above the
floor is about 100 ms of transferring 19,902 bytes. A month of minute bars fell
from **2,606 ms to 1,210 ms**. The identity arm of the same run reproduces
§12.8's original table, which is the control saying the improvement is the coding
rather than a better day. The `304` column did not move, which was the stated
check.

**One discrepancy was chased rather than filed.** The deployed coding produced
**7,473 bytes where local produced 7,549 for a byte-identical body** — not any
`gzipSync` level of those bytes locally, and exactly the shape of _the ingress
re-encoded it_. Tested: `Accept-Encoding: deflate` returns **`deflate`**, which
nothing but this application offers, and `br` alone returns **no coding and the
full identity body**, where an ingress compressing on its own behalf would have
served brotli. So §12.5 survives with our coding in front of it. The 76 bytes are
our own zlib on linux against darwin/arm64 — **a compressed size is
platform-dependent and is re-taken per environment rather than carried across
one.**

**One reading came with a caveat the method already anticipated**: the link
timed out twice mid-run and the script retried. §12.8's own sentence — one
machine over one link cannot tell its own network from the environment — is why
that is a retry rather than a finding.

---

## For the stakeholders — what this actually did

**In one sentence: the page that shows real prices now downloads about a
twentieth of what it used to, and nothing about it looks different.**

Every time somebody opens MarketPulse's securities page, their browser asks our
server for the list of 518 companies we track, together with what each one last
closed at. Until today that answer travelled as **186 kilobytes of plain text**.
Measured honestly — a laptop in the UK talking to our server in Virginia — that
took **1.15 seconds**, and almost all of it was the text crawling down the wire
rather than the server thinking.

Text like that is enormously repetitive: the same field names, the same date
format, the same shapes, 518 times over. Squeezing it before it is sent is a
solved problem that every website has used for twenty years, and we simply
were not doing it. Last week's measuring task found that out — not by assuming,
but by looking at what actually arrives — and this task is the repair.
**The same answer is now 20 kilobytes. About nine tenths of it never leaves the
building.**

Three decisions are worth explaining, because each one is a place where the
obvious thing would have been quietly wrong.

**First, we made sure the squeezing did not break the thing we built last
week.** MarketPulse already avoids re-sending data a browser has seen before: it
gives every answer a short fingerprint, and a browser that still has the old
answer gets told "nothing changed" instead of the whole thing again. That saves
about 800 milliseconds on every repeat visit. The catch is that squeezing and
fingerprinting happen at the same moment in the request, and **in the wrong
order the fingerprint silently disappears** — no error, no crash, nothing on
screen looks wrong, every one of our tests keeps passing, and every visitor
quietly starts re-downloading everything forever. So we deliberately built that
failure once, on purpose, watched it happen, and then wrote a test that catches
it. We did the same for a second, opposite mistake. Neither can now reach a
user without a test going red first.

**Second, we chose the cheap squeezing rather than the best.** There is a newer
method that would have squeezed a little harder. It also costs noticeably more
of the server's attention, and our server is deliberately a small one — a single
machine with a quarter of a processor. Where the thing we are short of is
transfer and the thing we are spending is processing, the cheap method is the
right trade. That is written down along with the condition that would make us
revisit it.

**Third, we measured the cost instead of assuming it was free.** Squeezing is
work, and work on a small server can make everything else wait. We tested that
directly: with four large requests running at once, one way of doing the
squeezing made the server's own health checks take three times longer than the
other. We took the slower-looking option that keeps the server responsive, and
we wrote down what it costs us — the browser can no longer show a determinate
progress bar on a large download. That is a fair trade and it is recorded as one
rather than glossed over.

**How this moves the product forward.** MarketPulse's whole pitch is that a user
sees something odd in the market and investigates it _while they are still
curious_. The specification asks for visible feedback within half a second of an
action. The very next stories build the price and volume charts — the first
screens that will pull down a month of minute-by-minute market data, which is
just over a megabyte each time. Uncompressed, from the UK, that measured between
two and four seconds. Compressed, it is under 180 kilobytes. **Without this
task, the first chart we ship would have felt slow on the day it shipped**, and
the natural instinct would have been to fix it by showing users less data —
which is exactly the wrong repair for a product whose job is to show people the
evidence.

**And it is now released, which is the half that matters.** Everything above was
first measured on a developer machine, and the honest caveat was that we could
not know the hosting platform would pass the squeezed data through untouched
rather than helpfully un-squeezing it — a thing no file can tell you, only a live
request. It does. **Measured against the live service: the securities page fell
from 1.15 seconds to 0.48 seconds, and a month of minute-by-minute market data
from 2.6 seconds to 1.2.** Roughly two thirds of the wait, removed from the two
requests this product actually makes.

We also chased one small thing that looked wrong and turned out not to be. The
live server squeezed the same data 1% smaller than the laptop did, which is
exactly what it would look like if the hosting platform had quietly unpacked and
re-packed our data behind our back — the one failure this check exists to catch.
It had not: the difference is that the two machines ship slightly different
versions of the same compression library. We know that because we asked the live
server for a format only our own code offers, and it obliged. Worth the ten
minutes: the alternative was recording a number we did not understand.

**Nothing on screen changed today.** The securities page looks exactly as it did
yesterday. It just arrives.
