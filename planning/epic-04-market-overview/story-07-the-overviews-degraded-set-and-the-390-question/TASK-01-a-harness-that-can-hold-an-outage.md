# Task 4.7.1 — A harness that can hold an outage

**Status:** **Complete — 2026-10-10. The harness holds an outage, serves the aggregate and can serve a poorer one on the reconnect — and the first draft of it manufactured a state that reads exactly like a finding.** Keying the two new behaviours on a connection count was wrong, because a cold page opens more than one socket before anything is dropped: `StrictMode`'s open/close pair meant the **surviving** socket got the reconnect behaviour, so the refusal killed the only socket the page kept and the poorer aggregate was served on the **first paint** — drawing `No prices yet.` over four `None stored` cells, a real state of this product produced entirely by the instrument. Both now key on `drop()`. **Ten inline copies, not thirteen**, and **one** was migrated
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** —

## Objective

**No spec that visits `/` has ever degraded a feed, and the shared harness
cannot hold a disconnection even if one asked it to.**

## What the user can see when this lands

**Nothing.** Every task after this one runs through it.

## Work

### The harness answers the browser's own retry

`e2e/support/feed.ts`'s `routeWebSocket` callback **unconditionally re-sends a
`live` snapshot**, so the browser's reconnect is answered and a produced
`disconnected` **self-heals about 2 s after `drop()`** —
`ABNORMAL_FIRST_MS = 2_000`. That is **Task 3.10.9's fourth instrument error**,
whose fix lived in `state-grid.mjs`, which was deleted, and **was never carried
into the shared harness.** A real outage does not answer the retry.

Make refusing the retry an **opt-in option defaulting to today's behaviour**:
`market-reconnect.spec.ts` exists to watch the retry **be** answered, and
`serveFeed`'s connect sequence drives `LiveFeedView.resumes`, which
`security-gap-fill.spec.ts` — the 25%→5.6% flake — asserts a quiet refill
against.

### `serveFeed` has no `overview` verb, and ten specs have one each

Measured: thirteen `overview-*` specs each build a `type: "overview"` frame
inline. `FURNISHED_BREADTH`'s own docblock makes the argument — _the day the
section gains a field, four specs stop compiling at one line_. **This story's
grid is the eleventh copy unless the verb lands first.**

The verb the degraded states actually need is the one no spec can express
today: **serve a different, POORER aggregate on the reconnect** — which is
Task 4.7.3's subject and this task's capability.

### What the harness must not pretend

**A harness that can lie produces findings that look exactly like real ones** —
the canvas's `Degraded states.dc.html` §02 records Task 3.10.1 manufacturing
two states the server cannot reach, one written up as a defect before being
withdrawn. So the frames this harness can build are **derived from the shipped
encoder and the gateway's own connect sequence**, and a state a deployment
cannot reach must be a state the harness cannot reach — **except** the rollback
shape, which is deliberately reachable and must be **labelled** as furnished
because `WireMarketOverviewInputs.breadth` and `.movers` are non-optional and
no shipped producer can build it.

### And prove the plant per channel

Task 4.8.10's rule transfers exactly: **a produced state whose producer went
quiet looks identical to a state drawn correctly.** Every arm asserts its own
subject arrived — a frame counted **by URL**, the socket wrapper intact, the
text moved — and reports **nothing** rather than zero when it cannot.

## Done when

1. `serveFeed` gains an `overview` verb, and the thirteen inline copies are
   either migrated or the count of those left is recorded with the reason
2. Refusing the retry is opt-in, defaults to today's behaviour, and
   `market-reconnect` and `security-gap-fill` are unaffected — asserted, not
   assumed
3. A `disconnected` state can be **held** for the length of an assertion, shown
   by a spec that would have passed wrongly against the old harness
4. The poorer-aggregate-on-reconnect verb exists
5. `pnpm verify` and the overview specs green

---

## What was done — 2026-10-10

### The verb count was wrong in the brief, and it is ten

`grep -l 'type: "overview"' e2e/specs/*.ts` returns **ten** specs, not
thirteen: `overview-breadth-region`, `-frame-sections`, `-journey`,
`-movers-hold`, `-nothing-to-open`, `-proxy-live-update`, `-ranked-keyboard`,
`-sector-order`, `-sector-region`, `-source-note`. Seventeen of the 45 specs
mention `overview` at all; seven of those assert against a frame another spec
drives or against the real gateway.

### What `serveFeed` does now, verb by verb

Unchanged: `send` (a `bars` burst), `goStale` (a `feed` frame), `drop(code)`
(the close, default `1006`), `feed()` (the modelled venue), `serveBars(body)`.

| New                                       | What it does                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| option `overview`                         | sent **beside the snapshot** on every connect — `sendSnapshot`'s own sequence   |
| verb `sendOverview(overview)`             | a later broadcast, as the gateway does once per applied batch                   |
| option `overviewOnReconnect`              | a different, **poorer** aggregate for every connection after `drop()`           |
| option `reconnect: "served" \| "refused"` | `"refused"` closes every connection after `drop()`, so `disconnected` **holds** |
| `connections()`                           | sockets this harness answered, matched **by URL**                               |
| `refusals()`                              | retries it closed — zero unless `reconnect: "refused"`                          |
| `overviews()`                             | aggregate frames sent, across every connection                                  |

`reconnect` defaults to `"served"`, which is the behaviour every existing spec
was written against.

### The defect in the first draft, which is the finding worth keeping

Both new behaviours keyed on `connections > 1`. **A cold page opens more than
one socket before anything is dropped** — React's `StrictMode` double-invokes
the effect in development, so a dev page opens one socket plus an open/close
pair about 25 ms apart (`CLAUDE.md`, after Task 3.11.2 re-measured it with the
URLs printed). So the **surviving** socket was connection 2 and was handed the
reconnect behaviour. Produced verbatim, three tests red:

```text
Expected substring: "774.03"
Received string:    "Market proxies            No prices yet."

Expected substring: "774.03"
Received string:    "Market proxiesSPYNone stored QQQNone stored DIANone stored
                     IWMNone stored No prices stored for these four yet."
```

**Both of those are real states of this product**, drawn for a reason that was
entirely the instrument's — which is this harness's own standing hazard
restated, and the third time Story 3.10's canvas note has been earned. Both now
key on **`dropped`**, set by `drop()`, which is also the honest model: a real
outage is _the far end is gone from now on_, not _the second dial fails_.

### The migration: one of ten, and the reason the other nine stayed

**Migrated: `overview-breadth-region.spec.ts`.** Its `serveBreadth` was
`serveFeed(page, { feed: "iex", overview })` frame for frame — one
`{"feed":"iex"}` answer to `GET /market-data`, a snapshot with
`observations: {}` and `status: "live"`, then the aggregate — so it is the
**proof that the verb is a faithful substitute** rather than a parallel
implementation. 61 lines out, 5 tests green in 6.9 s afterwards.

**Left: nine, deliberately.** Three reasons, and the first is the one that
would have been a silent regression:

1. **`the-landing-route-has-a-spec-that-drives-a-figure` scans `e2e/specs` for
   an inline `type: "overview"`** beside a text assertion, and the break
   `the-landing-spec-stops-driving-the-frame` substitutes that exact string in
   `overview-proxy-live-update.spec.ts`. A blanket migration moves the frame
   into `e2e/support/` and **deletes the only mechanism guarding the landing
   route's figure assertion** — the check that exists because that spec once
   went missing from the PR named after it. Re-pointing it at _a spec that
   hands an aggregate to the harness_ is defensible and is a change to a
   shipped check with its own break; it belongs to whoever needs it, with the
   measurement in front of them.
2. **Seven of the nine answer `subscribe` or capture a `send` closure**, with
   their own `announce`/`connected` handshake and their own scoping rules —
   `overview-proxy-live-update` throws on a `bars` frame for an unsubscribed
   symbol on purpose. The verb does not express a subscribe-answering gateway
   and was not widened to, because this task is a thin slice.
3. **`overview-source-note.spec.ts` registers its route five times on one
   page**, once per grid row, and serves `feed: null` on three of them.

So: **1 migrated, 9 left.** Task 4.7.9's grid is written against the verb from
the start, which is what the brief asked for.

### The proof that a `disconnected` state can be held

`e2e/specs/overview-held-outage.spec.ts` — three tests, 11.7 s, green. It is
the **first spec in this repository that degrades a feed on `/`**. The arm that
matters reads the chrome's whole text when `disconnected` first appears, waits
until `refusals()` has grown — the page dialled again of its own accord and the
harness closed it — and then asserts the text is **byte-identical**. Against
the old harness that is unsatisfiable: the page is back on `LIVE` about two
seconds after the drop.

Performed by hand rather than through `pnpm break`, because the harness refuses
on an uncommitted target and this change is uncommitted; the registry entry
`the-harness-answers-the-browsers-own-retry` is in `scripts/breaks.mjs` and the
substitution is the one it performs. The file was checksummed either side —
`f412f3a8…b19c` before and after — and the break deletes the single line that
sets `dropped`, which is the **omission a re-implementer makes** rather than an
inverted condition: the branch, the option and both docblocks stay exactly
where they are.

```text
Running 3 tests using 1 worker

  ✘  1 … › a produced disconnection is held, and the refused retry is counted (16.5s)
  ✓  2 … › the default still answers the retry, which is what two shipped specs are about (3.4s)
  ✘  3 … › the reconnect can be answered with a poorer aggregate (13.7s)

  1) … › a produced disconnection is held, and the refused retry is counted

    Error: expect(received).toBeGreaterThan(expected)

    Expected: > 0
    Received:   0

    Call Log:
    - Timeout 15000ms exceeded while waiting on the predicate

      211 |   await expect
      212 |     .poll(() => feed.refusals(), { timeout: 15_000 })
    > 213 |     .toBeGreaterThan(0);

  2) … › the reconnect can be answered with a poorer aggregate

    Error: expect(locator).not.toContainText(expected) failed

    Locator: getByRole('region', { name: 'Market proxies' })
    Expected substring: not "774.03"
    Received string: "Market proxiesSPY774.03▲up +0.42% QQQ601.88▲up +0.61% …"
```

**Two assertion failures on two different claims, with the third test still
collecting and passing** — which is the only red that proves a check works.
The one that stays green is the one asserting the **default** answers the
retry, because the break _is_ the default.

### `market-reconnect` and `security-gap-fill`, asserted rather than assumed

Both green, with every other `serveFeed` consumer, in one scoped run:

```text
Running 20 tests using 4 workers
  ✓ market-reconnect.spec.ts — a dropped socket comes back by itself, with no reload (3.0s)
  ✓ market-reconnect.spec.ts — the price stays on screen for the whole outage (1.8s)
  ✓ market-reconnect.spec.ts — the reconnect's snapshot fires no arrival mark (2.2s)
  ✓ market-reconnect.spec.ts — the page re-sends its subscription on every reconnect (1.6s)
  ✓ security-gap-fill.spec.ts — a dropout leaves a hole, and the feed coming back fills it (4.2s)
  ✓ security-gap-fill.spec.ts — the chart is never blanked or covered while the gap is filled (3.2s)
  20 passed (14.1s)
```

`market-reconnect.spec.ts` does **not** call `serveFeed` at all — it owns
`serveDroppableFeed`, a local harness that sends `1001 going away` — so the
claim it is unaffected is structural as well as measured. `security-gap-fill`
does call `serveFeed`, with no `reconnect` option, and its refill is driven by
the connect sequence the default still serves. Note also that the 25% → 5.6%
flake is about a **cover over the plot**, not about the retry, and nothing here
touches it.

### A `/\blive\b/iu` negative on the footer cannot hold in a dropped state

The first draft of the held-outage spec asserted the footer did not contain
`live` after the drop. It cannot: the shipped sentence **is** `The live feed is
not connected. No live prices have arrived yet.`, so the word is present in
exactly the state the assertion was meant to forbid. Produced verbatim:

```text
Expected pattern: not /\blive\b/iu
Received string: "Market feedIEXTrades reported by the IEX exchange only — not
the full US consolidated tape.Market feed disconnected. The live feed is not
connected. No live prices have arrived yet.disconnectedThe live feed is not
connected. No live prices have arrived yet.Backend servicehealthy"
```

Worth knowing because **`security-feed-degraded.spec.ts` carries that exact
assertion** on `page.locator("footer").first()` and is green — it reads inside
the window before the sentence has rendered, which the self-heal made
unexaminable until now. It is not this task's to repair and it is handed to
nobody by name, because the shipped behaviour is right and only the assertion
is weak; it is recorded here so the next reader of that line knows what it is
worth.

## Done when — verdict

1. **The verb lands; one of ten migrated, nine recorded with reasons** —
   above. The count in the brief was thirteen and is ten.
2. **The refusal is opt-in and defaults to today's behaviour**, with
   `market-reconnect` and `security-gap-fill` run green rather than reasoned
   about.
3. **A `disconnected` state is held**, with the break's transcript above.
4. **`overviewOnReconnect` exists** and is driven green.
5. `pnpm verify` green; all 18 `overview-*` specs green (69 passed, 1 skipped,
   40.0 s).
