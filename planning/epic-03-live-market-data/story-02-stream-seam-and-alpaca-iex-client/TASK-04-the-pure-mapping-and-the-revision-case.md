# Task 3.2.4 — The pure mapping, and the revision that is a replacement rather than a duplicate

**Status:** **Complete — 2026-09-18.** `alpaca-stream-mapping.ts`, 36 tests, all against fixtures. **Criterion 4's guard failed its first attempt** and is now structural, proven by substitution. See _What was found_.
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.3

## Objective

Map a vendor frame to the `Bar` and `BarSource` that already exist — **pure
functions only, no socket, no transport** — including `u`, which is the case
this product decided to carry and is the one a naive client gets wrong.

## What the user can see when this lands

**Nothing.**

## What is already decided and must not be re-taken

- **Split pure mapping from transport.** `alpaca-mapping.ts` /
  `alpaca-provider.ts` already established the arrangement, and it is the reason
  the historical client's mapping is testable at all.
- **A streamed bar is the same `Bar` a fetched bar is** — six fields,
  `startsAt` marking the interval's **start**, `number` prices. Acceptance
  criterion 3 requires it checked against a **recorded frame**, not a
  hand-written object.
- **`t` marks the START of the interval on the stream** — [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
  §7.3 confirmed it with an HTTP control, agreeing with `ALPACA.md` §5.3.
  `Bar.startsAt` maps from `t` **with no shift**. A stream that disagreed would
  put every live bar a minute out, silently, on every surface at once.
- **`feed` is `iex` and nothing in the mapping may produce `sip`** —
  acceptance criterion 4. The free plan refuses a SIP socket, so **a code path
  that could claim one is a code path that lies.** Make it structurally
  impossible rather than merely absent.
- **The product subscribes `updatedBars`** — §7.11, decided by the owner on
  2026-09-17, and the trigger that could have reversed it was **evaluated and
  not fired** on 2026-09-17 (§14.1). It stands.

## Work

- **Map `b` to `Bar` + `BarSource`**, against a fixture rather than a literal.
- **Map `u` to the same shape, and make the REPLACEMENT semantics explicit in
  the type rather than in a comment.** The handed-forward note is blunt: a client
  that maps `u` like `b` and appends produces **two bars for one minute**; one
  that ignores `u` is **quietly wrong for ever**. Neither is what was decided.
  The mapping layer should make the third option the easy one — for example by
  the mapped result carrying whether it supersedes a `(symbol, minute)` rather
  than leaving every caller to know.
- **Do not build a store to hold the replacement.** Where the superseding
  actually happens is Story 3.5's current-state model; this task's job is that
  the information survives the mapping. Building the store here is the
  scaffolding `CLAUDE.md` forbids.
- **Carry the measured numbers as test cases, not as prose**: a revision arrives
  **29.1–30.1 s** after the bar it corrects (§14.1, n=68), **35.3%** change the
  close, and **none change nothing**.
- **Reject rather than coerce.** `fast-json-stringify`'s lesson transfers: a
  `null` under a numeric field reaches the wire as `0`, _a plausible price_. A
  frame that cannot be mapped is an outcome value, never a silently defaulted
  `Bar`.
- **Zero-volume bars are real** (§7.2) and are not an error.

## Done when

- `b` and `u` both map, from **fixtures**, with `startsAt` taking `t` unshifted
- A test proves a streamed bar and a fetched bar of the same minute produce
  **the same `Bar`**
- `sip` is unreachable from the stream mapping — by construction, and a test
  says so
- The `u` result expresses _supersedes_ rather than _another bar_, and a test
  pairs a `b` and a `u` for one `(symbol, minute)`
- An unmappable frame is a value, not a throw and not a defaulted `Bar`
- No module in this task opens a socket or reads the wall clock
- `pnpm verify` passes

## Notes

**The `u` case is the one place in this story where doing nothing is actively
wrong**, which is rarer than it sounds — most omissions produce an absence
somebody notices. This one produces a number that looks right and is stale by a
few cents, for ever, with no way to know which. That is the exact failure Epic
2's whole provenance surface exists to prevent.

---

## What was found

### A streamed bar and a fetched bar are the same `Bar` because they go through the same function

Acceptance criterion 3 asked for a test. **It got a stronger thing than a test.**

The socket's `b` frame is
`{"T":"b","S":"NVDA","o":…,"h":…,"l":…,"c":…,"v":…,"t":…,"n":…,"vw":…}`, and
`AlpacaBar` — the HTTP client's per-bar type — is exactly `{t,o,h,l,c,v}`. **A
streamed bar _is_ an `AlpacaBar` with two extra keys**, so `toBar` was exported
from `alpaca-mapping.ts` and reused rather than reimplemented.

That turns _"a streamed bar maps to the same `Bar` a fetched bar maps to"_ from a
claim **two implementations have to keep agreeing on** into a property of there
being **one implementation**. The test still exists, and is now a regression
guard on that staying true rather than on two things happening to match.

### Criterion 4's guard did not work on the first attempt, and the check is what found it

The criterion says `sip` must be **structurally impossible rather than merely
absent**. The first implementation declared
`ALPACA_STREAM_FEED = "iex" as const satisfies MarketFeed` — a genuinely narrow
constant — and the doc comment claimed assigning `sip` downstream was a compile
error.

**It was not.** Verified by substituting `feed: "sip"` and running `tsc`:
**no error**. `BarSource.feed` is the wide `MarketFeed`, so narrowing the
_source_ achieves nothing when the _destination_ accepts anything.

**The guard had to be on the destination.** `StreamBarSource` narrows `feed` to
the literal, and the same substitution now fails:

```text
src/alpaca-stream-mapping.ts(207,5): error TS2322:
  Type '"sip"' is not assignable to type '"iex"'.
```

**This is the corollary `CLAUDE.md` already records, arriving in a new place:** a
break that does not go red is not evidence the check works. Here it was evidence
the check did not exist. Had the substitution not been run, a doc comment
asserting a compile-time guarantee would have shipped beside a type that provided
none — **which is worse than no comment**, because the next person reads the
claim instead of checking.

### The `Ticker` brand forced a decision the mapping would otherwise have skipped

`LiveObservation.symbol` is a `Ticker`, which is branded — so `S` could not be
passed through, and the compiler required an answer to _is this a valid symbol?_

**`isTicker` rather than `toTicker`, because a socket frame is untrusted input.**
`ticker.ts` says exactly that, and `toTicker` **throws** — which would let one
malformed symbol tear down a connection carrying 517 good ones.

**And the line between this and Story 3.5 is drawn deliberately.** §4.4 measured
that Alpaca does **not** validate symbols: `ZZQQTESTX` was subscribed, accepted
and echoed back as held. This mapping does a **format** check, which happens to
reject that particular string — but a well-formed invention like `ZZQQT` passes
here and is still in nobody's universe. **Validating against our own universe is
Story 3.5's and must happen before the subscribe frame is sent**, which is a
different place: a pure function that reads the universe is no longer pure.

### What is rejected rather than coerced, and why the list is longer than `null`

`fast-json-stringify`'s lesson transfers: a `null` under a numeric field reaches
the wire as `0` — **a plausible price**. A defaulted `Bar` is that failure one
layer up. It looks like data, it charts, and nothing says it was invented.

So every price field is checked with **`Number.isFinite`, not
`typeof === "number"`** — because `NaN` and `Infinity` are both `number`, both
survive `JSON.parse` of a malformed payload, and both produce a bar that renders
as a blank or a broken axis rather than as an error. Tested for both.

**Three outcomes, not two.** `observation`, `ignored` and `unmappable` —
and `ignored` earns its place: §4.4 measured nine bad requests producing nine
frames on a connection that survived all of them, so **a frame that is not a bar
is routine traffic**. Calling an error frame `unmappable` would make the
vendor's normal behaviour look like a defect in our parser.

**A bad frame does not discard its neighbours.** The vendor batches (§7.2), so
one malformed bar for one symbol must not lose a good bar for another. Tested.

### What was deliberately not built

- **No store.** Where the superseding actually happens is Story 3.5's
  current-state model. This task's job was that the information survives the
  mapping, and `LiveObservation.supersedes` is the whole of it.
- **`n` and `vw` are still dropped.** `PROVIDER.md` §9.1 declined both with
  triggers, and the rule is that adding one costs a column in a ~47.7M-row-a-year
  table. Widening `Bar` is a decision with an owner, not a convenience taken
  while writing a mapping.

### What was checked and found already true

- **Zero-volume bars map** rather than being rejected. §7.2: a quiet minute
  produces no frame at all, but a zero-volume bar that _does_ arrive is a fact
  about the market.
- **The module reads no clock and opens no socket** — grepped for `Date.now`,
  `new Date()`, `WebSocket`, `fetch` and `require`: **zero matches**.
  `retrievedAt` is a parameter, which is `alpaca-mapping.ts`'s own rule and the
  trap Task 2.3.5 already fell into once.
- **The two reconstructed `u` fixtures were sufficient** for every test this
  task needed. The GAPS entry stands — the _envelope_ is still inferred — but
  nothing here was blocked by it.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. This was the fourth
building block of the work that changes that.

**What this task did:** wrote the **translator**. The market data service speaks
its own compressed shorthand — `{"T":"b","S":"NVDA","o":214.88,…}`. This turns
that into the same kind of price record the rest of our application already
understands, and it does it with **no network connection and no live market**, so
every one of its 36 tests runs in under a second.

**The decision worth explaining is about corrected prices.**

Our data provider sometimes **sends a price and then corrects it** about thirty
seconds later — rare (about one bar in fifteen hundred), but when it happens a
third of the time the _closing price itself_ changes. We decided weeks ago to
accept those corrections rather than ignore them, because being quietly wrong by
a few cents for ever, with no way to know which number is stale, is not something
a product built on trustworthy data can carry.

The danger is that a correction is easy to mishandle in **two opposite ways**:
treat it as a new price and you show the same minute twice; ignore it and you
stay wrong for ever. So the translator now **labels** every corrected price as _a
replacement for one already sent_. It does not act on that label — deciding what
to replace is the next piece of work — but the fact travels with the price
instead of relying on somebody downstream remembering.

**One thing went wrong, and catching it is the report.**

The provider's free plan gives us data from **one exchange**, not the full US
market. We are contractually and ethically obliged never to imply otherwise —
it is written into the product specification. So the task required making it
**impossible for our code to claim the fuller coverage**, not merely absent.

I wrote what I believed was that protection and **wrote a comment saying it was
guaranteed.** Then I tested it by deliberately trying to make the code lie — and
**it compiled perfectly happily.** The protection was on the wrong side: I had
narrowed what we _send_ rather than what the record _accepts_.

That is now fixed, and re-tested the same way: the deliberate lie is rejected
before the code will even build. **The reason this is worth reporting is that a
comment claiming a guarantee that does not exist is worse than no comment** — the
next person reads the claim instead of checking it. The only reason it was caught
is that the task said to prove it rather than state it.

**A smaller thing worth knowing: a safety feature we built months ago did some
work here for free.** Our system treats a stock ticker as a special kind of value
that has to be validated, not just any text. Because of that, the compiler
**refused to let me pass a symbol straight from the market feed into our records**
without deciding what to do about a bad one. That matters, because we measured
back in the spike that the provider will happily accept and echo a symbol that
does not exist. The compiler asked the question; we would probably not have.

**How this unlocks progress.** The next task opens the real connection to the
market. When data starts arriving, the translation from their format to ours is
**already written and already tested against real recorded examples** — so that
task is about the network alone, which is the part that genuinely needs a live
market to get right.

**What a user can see today: nothing new.** The screen is unchanged. **Two
stories from now, a price moves on it.**
