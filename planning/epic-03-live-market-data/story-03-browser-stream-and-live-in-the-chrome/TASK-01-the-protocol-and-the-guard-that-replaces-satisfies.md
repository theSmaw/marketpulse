# Task 3.3.1 — The browser protocol, and the guard that plays `satisfies`'s role on a socket

**Status:** **Complete — 2026-09-19.** `market-stream-protocol.ts` and `wire-serialiser.ts` in `packages/shared`. **The guard restores both halves of what the HTTP wire gets for free**, proven by substitution in each direction. 18 tests, no socket.
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.2 (complete)

## Objective

The message types the browser and the server agree on, in `packages/shared` —
**and the mechanism that stops a field added to a type and forgotten on the wire
becoming a leak.** No socket, no route, no component.

## What the user can see when this lands

**Nothing.** Types and a guard.

## What is already decided and must not be re-taken

- **The protocol is §11.1's**: a **snapshot on connect, then one message per
  upstream frame**. The snapshot is the backend's current-state object
  serialised, and **absence is expressed by omission** — an entry for every
  security observed and **no entry at all** for the rest. After a restart the
  snapshot is `{}`, and that is the **true** answer rather than a degraded one.
- **No `staleSeconds` on the wire** (§11.1). Every entry carries its
  observation's **own instant**; a derived age is a clock read wearing a
  different name, and ADR 0017 forbids `packages/shared` reading one.
- **A security gets NO status word** (§11.2). The gap between one security's
  bars has a p50 of 1 minute and a **maximum of 187**, so no threshold separates
  a quiet security from a broken one. A security carries **the age of its
  observation**; `STALE` beside a price is a judgement this product cannot
  support.
- **The client renders from an ordered stream of TYPED events**, never from
  anything it parses loosely. That is `PRODUCT_SPEC.md` §33's rule for the
  investigation stream and it applies here for the same reason.
- **WebSocket for market data, SSE for agent events** (§31). Two streams, two
  semantics. **Do not build one thing with a mode flag.**

## Work

- **Define the message union** in `packages/shared`, with a **version**. Both
  halves of the wire import one definition — the reason `Bar` and the provenance
  vocabulary live there, applied to a protocol.
- **Decide and build the guard that plays `satisfies`'s role**, which is this
  task's real work. Every HTTP route here declares its schema with
  `satisfies Record<keyof T, JsonSchemaProperty>`, so a field on the interface
  and not in the schema is **`TS1360`** rather than a value that vanishes.
  **A socket message has the same failure and none of the same machinery.**

  **And the trap is WORSE on a socket, which is the sentence to design against:**
  `fast-json-stringify` strips every property a schema does not declare, so an
  undeclared field on an HTTP response **disappears**. Nothing strips a socket
  message. So the failure mode inverts — **an absence becomes a leak**, and the
  thing that leaks is whatever a developer attached to an internal object.

- **Write the encode/decode boundary as pure functions**, so every message shape
  is testable with no socket at all. The precedent is `alpaca-stream-mapping.ts`,
  one layer over.
- **A malformed message is a value, never a throw** — `PROVIDER.md` §8.5's line,
  and the browser is the side that must not crash.

## Done when

- The message union and its version exist in `packages/shared`
- **A field added to a message type and not to its encoder is a COMPILE ERROR**,
  demonstrated by adding one and showing the error, then removing it
- A malformed inbound message decodes to a value rather than throwing
- The snapshot's **omission** semantics are encoded in the type, not a comment —
  an absent security is unrepresentable as "present but empty"
- No module in this task opens a socket
- `pnpm verify` passes

## Notes

**The guard is the deliverable, not the types.** Types anyone can write; the
question this task exists to answer is _what stops the socket's version of
`TS1360` from being a code review_. If the honest answer turns out to be "a
runtime validator", say so and build it — but do not leave the question
unanswered, because §33's ordered-typed-events rule is load-bearing for Epic 10
as well and this is where the shape is set.

---

## What was found

### The HTTP wire's guarantee is TWO guarantees, and only one of them is the type

This is the thing the task existed to work out, and it is worth stating
precisely because it changes what had to be built.

`satisfies Record<keyof T, JsonSchemaProperty>` buys **exhaustiveness** — a
field on the interface and not in the schema is `TS1360`. But _no internal
detail reaches a client_ is **not** that guarantee. It is
`fast-json-stringify` **stripping every property the schema does not declare**,
which is a property of the **serialiser**, not of the type.

**A socket has neither, so the failure inverts:**

|                                            | HTTP response         | Socket message |
| ------------------------------------------ | --------------------- | -------------- |
| Field on the type, missing from the schema | **Vanishes** silently | —              |
| Field on the object, not on the type       | **Stripped**          | **LEAKS**      |

**An absence is a bug somebody eventually notices. A leak is a bug nobody
notices at all** — and what leaks is whatever a developer attached to the
internal object.

### The guard is a field map, and it restores both halves

`WireFields<T>` is a mapped type over `keyof T` **with `-?`**, and `toWire`
builds its output by walking **the map's keys rather than the value's**.

- **Exhaustiveness** — a field added to `T` and not to the map is a compile
  error naming it.
- **Narrowing** — a property on the object and not on the type is **never
  read**, so it cannot be written. That is `fast-json-stringify`'s stripping,
  rebuilt with no dependency.

**`-?` is load-bearing rather than tidy.** Without it an _optional_ field could
satisfy the map by omission — which is exactly the hole being closed, since a
field that is optional on the type is still a field that needs a decided wire
representation.

### Both halves were proven by substitution, not asserted

**Exhaustiveness** — adding `leakedField` to `WireFeedState`:

```text
error TS2741: Property 'leakedField' is missing in type
'{ status: …; feed: …; marketOpen: … }'
but required in type 'WireFields<WireFeedState>'
```

**Narrowing** — the same message through both serialisers:

```text
JSON.stringify:      {"type":"feed",…,"SECRET_CREDENTIAL":"apca-key-that-must-never-leave","internalRowId":42}
the named serialiser: {"type":"feed","version":1,"feed":{"status":"live","feed":"iex","marketOpen":true}}
```

**Re-proven after a lint-driven refactor**, because a guard that stopped working
during cleanup would have looked identical.

### The answer to the Notes' question: NOT a runtime validator

The task said that if the honest answer was _a runtime validator_, say so and
build it. **It is not**, and the reason is worth keeping: a validator checks at
the moment of sending, which means **the leak is a test failure rather than a
compile failure**, and only on a path a test happens to cover. The field map
makes it unrepresentable — the leaking property has nowhere to be written from.

**There is still a runtime half, and it is on the OTHER side**:
`decodeMarketStreamMessage` returns a **value**, never a throw. A malformed
message from a server we wrote is a bug, but a **browser that throws on one
takes the page down**, which §36 forbids and which this story's acceptance
criterion 2 is about to test.

### Omission is in the type, not a comment

Every field of `WireObservation` is **required**, so _present but empty_ is
unspellable: a key is either there with a whole observation or it is not there.
An empty snapshot round-trips to `{}`, which §11.1 insists is **the true answer
rather than a degraded one**.

And two fields are **absent on purpose**, each with a measurement behind it:

- **No `staleSeconds`** — an age is a clock read wearing a different name, and
  ADR 0017 forbids `packages/shared` reading the wall clock. The browser has a
  clock; let it subtract.
- **No per-security status word** — §11.2 measured the gap between one
  security's bars at a p50 of 1 minute and a **maximum of 187**. No threshold
  separates a quiet security from a broken one, so there is no field for one.

### One decode behaviour worth naming

**A malformed security does not discard the frame.** The vendor batches (§7.2),
so one frame carries many securities; losing all of them because one is
malformed is the failure `alpaca-stream-mapping.ts` already refuses one layer
over. Prices are checked with `Number.isFinite` rather than
`typeof === "number"` for the same reason it is there: `NaN` and `Infinity` are
both `number`, both survive `JSON.parse`, and both render as a blank or a broken
axis rather than as an error.

### What was checked and found already true

- **`health.ts` already records the two limits this inherits** — the HTTP guard
  _"checks that the keys match, not that the types do"_, and a declared property
  the handler omits is a runtime 500. The field map is strictly better on the
  first (a field serialiser's return type is checked) and identical on the
  second.
- **The exhaustive `switch` over message types** fails the build on a fourth
  type, which is `createMarketDataProvider`'s mechanism applied to a protocol —
  and that mechanism has now fired four times in this repository.

## For a stakeholder — a status report, 2026-09-19

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move — **but the connection
to the live market now exists inside the running system**, and this story is the
one that carries it to the screen. This was its first of seven tasks.

**What this task built: the language the server and the browser speak.**

Three kinds of message. A **snapshot** when a browser connects — everything we
currently know — then one message per update, plus a message about the health of
the feed itself.

**Why a snapshot at all, which is not obvious.** Without one, a browser opening
at 11:20 would see **nothing** until each company's next price arrived. We
measured that wait: typically a minute, but for the quietest company we track,
**over three hours**. The snapshot is not a performance optimisation — **it is
what makes the first thing you see honest.**

**The real work was a safety mechanism, and the reason is worth explaining.**

Everywhere else in this system, when we send data to a browser over the normal
web request path, there is an automatic protection: we declare what a response
contains, and **anything not declared is silently removed before sending**. That
is what stops an internal detail — a password, a database id, an error with a
stack trace — accidentally reaching a user because someone attached it to the
wrong object.

**A live connection has no such protection.** Send an object down a live
connection and _everything on it goes_, including whatever happened to be
attached. So the risk doesn't just persist, it **reverses**: on the normal path
the mistake is that something goes _missing_, which somebody eventually notices.
Here the mistake is that something **leaks**, which nobody notices at all.

**So we rebuilt the protection rather than relying on care.** Every message is
now assembled field by field from a declared list. Two things follow
automatically:

- **Add a field and forget to declare it → the code will not compile.**
- **Attach something undeclared to the object → it cannot reach the browser**,
  because nothing ever reads it.

**And we proved both rather than claiming them.** We deliberately attached a
fake credential to a message: the ordinary method sent it; ours did not. We
deliberately added a field and forgot to declare it: the build failed, naming
it. Then we re-ran both proofs after a tidying-up change, because a protection
that quietly stopped working during cleanup would look exactly the same as one
that works.

**One deliberate decision to report.** The task allowed a different answer —
check for leaks _when sending_, at run time. **We didn't**, because that turns
the problem into a test that has to be written and a code path that has to be
exercised. The approach we took makes the leak **impossible to express**: there
is nowhere for the offending data to be written from.

**One thing the messages deliberately do NOT contain.** No "this price is X
seconds old" and no per-company _stale_ label. Both were measured away: the gap
between one company's price updates is typically a minute but can legitimately be
**over three hours** for a quiet stock, so a _stale_ label would be a judgement
we cannot support — it would brand a perfectly healthy feed as broken. Each price
carries **when it happened**, and the screen works out what to say.

**How this unlocks progress.** The language exists. The next tasks build the
connection that speaks it, the words a person reads, and the wiring into the
page. **`LIVE` appears on screen at task five of seven** — the first time this
product says anything true about the market **right now**.

**What a user can see today: nothing new.** Two more tasks of plumbing, and then
the screen changes.
