# Task 3.10.2 — A disconnection that can be produced, and the sentence §36 named

**Status:** **Complete — 2026-09-24.** The harness is `e2e/support/feed.ts` and it produces all three states through the shipped path — **closing the socket** for `disconnected`, a `feed` frame for `stale`, and the browser's own retry for a reconnect — with **six browser assertions** against it, including criterion 3, which Task 3.10.1 had measured and nothing held. The no-data case was **a real defect**, not merely undecided: a page that had never received a live price still said _"Prices shown are the last known."_ It now says _"No live prices have arrived yet."_ The two-clock coverage the task asked for **already existed** and is named rather than duplicated.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1

## Amended by Task 3.10.1 — 2026-09-24: the sentence ships, so this task is the harness

**The chrome already says it.** Measured by producing the states rather than
reading the code:

```text
DISCONNECTED  The live feed is not connected. Prices shown are the last known.
              Showing data through Sep 24 · 05:05 EDT.

STALE         Connected, but no new data has arrived.
              Showing data through Sep 24 · 05:04 EDT.
```

§36 names _"Live feed disconnected — displaying data through 10:42:17"_. **That
is the same sentence with better words** — ours says which data and why, and
carries the instant in the product's own bar-instant format.

**So what is left of this task is the half that was always the harder one:**

- **The harness**, made permanent. Criterion 7 wants the claim asserted against
  _"a produced disconnection rather than a simulated one"_, and Task 3.10.1's
  throwaway proved the mechanism: the browser takes the **worse** of its own
  reading and the server's, so a stubbed `feed` frame produces `stale` through
  the shipped path, and **closing the socket** produces `disconnected` without
  waiting out 165 s.
- **The assertions**, which do not exist. Criterion 3 was measured by that
  throwaway and is **met**; nothing in the suite holds it.
- **The no-data case**, still undecided: a page that has received nothing at all
  and then disconnects has no instant to show.

**Do not rewrite the sentence.** It is correct, it is shipped, and it is the one
thing in this story a stakeholder has already been promised.

### And one constraint on the harness, which Task 3.10.1 learned by breaking it

**A stub that can send any frame can manufacture states the server cannot, and
those look exactly like findings.** Task 3.10.1's throwaway did it twice: it
modelled a quiet **security** as a silent **connection**, and it produced a
`LIVE` connection word inside a deployment with **no provider configured** — a
combination `createMarketStream` forbids, because a `none` selection constructs
no stream at all. The second was written up as a defect and withdrawn.

**So this harness must be constrained to what the gateway would actually
send**, rather than to what the wire format permits. Concretely: derive the
`feed` frame from the same selection the backend was built with, so a state a
real deployment cannot reach is a state the harness cannot reach either. A
harness that can lie is a harness whose green runs mean less than they look.

## Objective

Two things that belong together because neither is worth much alone:

1. **A degraded state a test can PRODUCE**, rather than simulate. Criterion 7
   says the `LIVE` claim must be false _"asserted against a produced
   disconnection rather than a simulated one"_, and a browser suite cannot
   disconnect a vendor. This is the harness every task after this one stands on.
2. **The sentence this entire epic has been walking towards.**

> `Live feed disconnected — displaying data through 10:42:17`

## What the user can see when this lands

**The chrome stops claiming `LIVE` when it is not, and says what it is showing
instead and as of when.** Kill the feed with a real page open and the strip
changes on its own — no reload — while every number, every region and the venue
stay exactly as they were.

**This is the most quotable single change in the epic**, and it is deliberately
second rather than ninth.

## Why the harness is half this task rather than a task of its own

Because a harness with nothing asserted against it is scaffolding, and this
repository's rule is to build the thin slice that works. The sentence is what
proves the harness produces a real state rather than a rendered one.

**What "produced" has to mean here**, and it is three different mechanisms for
three different states:

| State          | How a test reaches it                                                               |
| -------------- | ----------------------------------------------------------------------------------- |
| `disconnected` | Close the gateway socket from the test and let the browser's own policy conclude it |
| `stale`        | Hold the socket **open** and send nothing, past the 60 s wall-clock threshold       |
| reconnected    | Close, then accept the retry — `reconnect-policy.ts` dials at 500 ms on `1001`      |

**`1001` is forbidden unless you mean it** (Task 3.5.7): dropping a client with
`goingAway` produces a tight loop, back in half a second and dropped again.
`MARKET_STREAM_CLOSE` in `packages/shared` is where both ends read the codes.

**And the two thresholds are on two different clocks.** 165 s `disconnected` is
**monotonic**; 60 s `stale` is **wall clock**. Using one for both is not a
simplification, it is a silent failure that shipped once already — the
subtraction goes hugely negative and `stale` can **never** fire, with every test
green. `FeedStatusInputs` carries both and the compiler names any call site that
forgets one.

## The trap in the sentence itself

**`10:42:17` is an instant, and the question is _whose_.** It is the instant the
data on screen was correct as of — the newest observation's own instant — and
**not** the moment the socket died. Those differ by however long the feed was
silent before anybody noticed, which is at least the threshold.

**A second trap: the sentence is a claim about data, so it renders only when
there is data to claim about.** ADR 0029's first rule. A page that has received
nothing at all and then disconnects has no instant to show, and must say
something else rather than an empty slot or an epoch.

## Work

- The harness, in `e2e/support/`, producing all three states through a real
  socket rather than a stubbed status
- The sentence, with its instant, in the chrome's feed cell
- The empty-instant case decided and rendered
- Browser assertions: the claim is false exactly when it should be; every
  number, region and venue survive the transition; nothing collapses
- Unit coverage for the two clocks, so the silent failure cannot return

## Done when

1. A browser test produces a disconnection and asserts the claim goes false
2. The sentence renders with the right instant, and the no-data case is decided
3. Nothing on the page is cleared, blanked or collapsed by the transition
4. `pnpm verify` and `pnpm e2e` pass

---

## What was done — 2026-09-24

### The no-data case was a defect rather than an open question

The task listed it as _"still undecided"_. Rendering it showed it was worse
than that: a page that had **never received a live price** said

```text
DISCONNECTED  The live feed is not connected. Prices shown are the last known.
```

**There are no prices shown.** `Live in the chrome` §05 settled when the
**instant** appears and stated the rule behind it — _a clause renders only when
its own data is present_ — and that rule was applied to the instant and **not
to the sentence carrying it**. So the timestamp was correctly withheld and the
words beside it were left making a claim about data the page did not have.

**It is reachable and not exotically**: a cold load while the market is shut, a
first paint before any bar lands, a gateway that is up against a vendor
connection that is not. In all of them the page still holds **stored closes**
from HTTP on the chart and in the table — which is exactly why a sentence
saying _prices shown are the last known_ is believed.

| State          | Live data | The sentence                                                                     |
| -------------- | --------- | -------------------------------------------------------------------------------- |
| `disconnected` | yes       | `The live feed is not connected. Prices shown are the last known.` **unchanged** |
| `disconnected` | **none**  | `The live feed is not connected. No live prices have arrived yet.`               |
| `stale`        | yes       | `Connected, but no new data has arrived.` **unchanged**                          |
| `stale`        | **none**  | `Connected, and no live prices have arrived yet.`                                |

**The word `live` inside the sentence is load-bearing.** The page is not empty,
so _no prices have arrived_ would contradict what the reader can see. _No
**live** prices_ is the true and narrower claim, and it draws the one
distinction this strip exists for.

**`stale`'s empty spelling is one word apart from its full one, deliberately.**
_No **new** data has arrived_ implies there was old data; with nothing ever
received that is a false implication rather than a clumsy sentence.

**`live` has no empty spelling**, for the same reason it carries no instant: a
healthy connection has nothing to qualify, and a live feed that has delivered
nothing yet is the **session's** fact rather than the connection's.

> **Rejected — drop the clause**, rendering only `The live feed is not
connected.` True, and it says **nothing about the numbers on screen**, which
> is the question the sentence exists to answer. This product names an empty
> answer rather than leaving it silent — `StoredHistory` has three members and
> not two for exactly this reason.
>
> **Reversal trigger, as a condition:** the first surface that must tell _we
> never connected_ from _we connected and it went quiet before anything
> arrived_. Both read as the empty case here, deliberately — the difference is
> about our socket rather than about the reader's numbers.

The words live in `CONNECTION_SENTENCES_WITHOUT_DATA`, beside the five they
qualify, so a status added without deciding this is visible in one file.

### The harness, and the rule it had to learn twice

`e2e/support/feed.ts`. Three verbs — `send`, `goStale`, `drop` — and all three
travel the shipped path:

| State          | Produced by                                                        |
| -------------- | ------------------------------------------------------------------ |
| `disconnected` | **closing the socket**; `feedStatusFrom` reads `closed` directly   |
| `stale`        | a `feed` frame carrying `status: "stale"`, which the gateway sends |
| reconnected    | closing, then serving the retry the browser dials on its own       |

**Waiting out the real thresholds is the alternative** — 165 s monotonic,
60 s wall clock — and it is four minutes a spec. Those two numbers have unit
tests that own them; this owns the journey.

**`1006`, never `1001`.** `goingAway` tells the browser _they are redeploying,
come straight back_ and it dials in 500 ms, which is right for a deploy and
wrong for an outage a spec wants to observe (Task 3.5.7 hit the same edge from
the other side).

#### The constraint, and the draft that got it wrong

Task 3.10.1 handed this task a rule: **a stub that can send any frame can
manufacture states the server cannot, and those look exactly like findings.**
The first draft implemented it by **reading the venue from the deployment's own
`GET /market-data` and echoing it**, reasoning that anything else would be
inventing one.

**That made the harness unusable on the runner it exists for.**
`MARKET_DATA_PROVIDER` defaults to `none` on a developer's machine **and on
CI**, so the answer is `{"feed":null}`, the chrome correctly renders **no
connection word at all** (§11.3's `—`), and all six assertions failed against a
page that was behaving perfectly.

**The rule that survives is _coherence_, not provenance.** Both halves of the
cell are served from **one** `feed` value, so the forbidden pair — a connection
word beside _nothing is configured_ — is **unrepresentable** here rather than
merely avoided, and a configured deployment is modelled rather than faked.

> This is the second time in two tasks that the instrument was the thing that
> was wrong, and both were caught by running it rather than by reading it.

### The assertions

`security-feed-degraded.spec.ts`, six tests, all green:

1. **the `LIVE` claim goes false when the socket really dies** — criterion 7,
   concluded by the browser from the close itself
2. **a dead feed says what it is still showing, and as of when** — §36's
   sentence with its instant
3. **a page that never received a price does not claim to be showing one** —
   the new case, asserting the absence of both false claims by name
4. **a quiet socket says so without claiming data it never had**
5. **killing the feed leaves the page exactly as it was** — **criterion 3**:
   `main`'s entire text byte-identical either side of the outage, and
   `role="alert"` count **zero**
6. **the venue survives the connection dying** — including its sentence, which
   invariant 6 makes **unconditional**

### The two clocks — already covered, and named rather than duplicated

The task asked for _"unit coverage for the two clocks, so the silent failure
cannot return"_. **It exists**: `feed-liveness.test.ts`'s _the two clocks_ →
_measures liveness on the monotonic one and staleness on the wall one_, whose
own comment calls it _"the pair that makes the 2026-09-18 defect
unrepresentable: a monotonic reading near zero and an epoch instant near
1.76e12, both current."_ Writing a second one would be the duplication this
repository has a check against.

### The design

**A new canvas page rather than a section on an existing one**, and the reason
is the subject: `Live in the chrome` owns **the cell**, and Story 3.10's
subject is **the set** — every surface against every state. `Degraded states`
opens with Task 3.10.1's measured grid (§01) and this task's decision (§02),
and Task 3.10.9 photographs the whole set into it.

It reuses the existing page's stylesheet, strip markup and section idiom
verbatim, adds **no token and no component**, and cross-references
`Live in the chrome` §04, §05 and §11 rather than restating them.

### Gates

`pnpm verify` green — **2,402 tests** (four new), 26 invariants. `pnpm e2e`
green — **155 passed, 15 skipped, 2.7 min**, up from 149 by exactly the six
added here. No new token, no new component; `FeedIndicator` chooses between two
strings on a field it already read.

> **A contended run first, reported rather than swallowed.** The first full
> browser run failed **seven** specs — four axe checks on `/securities`, the
> holiday week's spoken sentence and two volume assertions — none of which this
> change touches. Load average was **10.9–12.4** with the session watcher's
> headless browser running beside it. All seven pass in isolation, and the
> clean re-run at load 4.5 is the 155 above. **This machine has now produced
> that shape three times in this epic**, each time against a change that could
> not reach the failing specs.

## For a stakeholder — a status report, 2026-09-24

### What this was

**Two things: the promise this whole phase of work has been building towards,
and the machinery that proves we keep it.**

The promise is a sentence. When the live market data stops arriving, the
product should not silently show you stale numbers dressed as current ones. It
should say what it is showing and as of when.

### What we found first

**The sentence was already there.** Last night's audit discovered that the
status strip already says:

> **DISCONNECTED** — The live feed is not connected. Prices shown are the last
> known. Showing data through 14:02 EDT.

So this task became the harder half — and then found a real fault in the
sentence itself.

### The fault

**On a page that had never received a live price, the product still said
"Prices shown are the last known."**

There were no prices shown. It happens on an ordinary cold load — opening the
app before the market opens, or before the first minute of data lands — and it
matters because **the page is not blank**. The charts and the table are full of
yesterday's closing prices from our database. So a reader sees numbers, reads
"prices shown are the last known", and reasonably concludes those numbers came
from the live feed. They did not.

It now says:

> The live feed is not connected. **No live prices have arrived yet.**

The word _live_ is doing real work there. Saying "no prices have arrived" would
contradict the screen, which is full of prices. "No **live** prices" is the
true, narrower statement — and it is exactly the distinction this strip exists
to draw.

We made the same correction to the other degraded state, where the shipped
wording said "no **new** data has arrived" — which quietly implies there was
old data. One word different, and the difference is a false impression.

### Why we did not simply delete the clause

That was the easy fix and we rejected it. "The live feed is not connected" on
its own is true and **tells you nothing about the numbers you are looking at**,
which is the only question the sentence exists to answer. This product has a
standing rule that an empty answer gets named rather than left silent.

### The machinery, and why it took two attempts

The other half of this task was building something that can **genuinely break
the feed** in an automated test, rather than pretending to. Faking it would
prove nothing: the real question is whether an outage travels all the way from
a dead connection to the words a person reads.

**Our first version was subtly useless and we caught it by running it.** It
tried to be scrupulous — it read the data-provider setting from the running
system rather than inventing one. But our test machines run with no market-data
provider configured, so the product correctly displays no connection status at
all, and every test failed against a page that was behaving perfectly.

The fix was to realise the rule we actually needed. Not _never invent
anything_, but **never invent an incoherent combination**: the test now models
one consistent deployment, so a situation the real product cannot get into is
one the test cannot get into either.

That is the second time in two days that our measuring tool was the thing that
was wrong. Both times we found it by running it rather than reading it, which
is the argument for building these things at all.

### What is now guaranteed

Six automated browser tests, including the one this story cares about most:
**kill the feed and every number, chart and caption on the page is
character-for-character identical afterwards**, with no error screen. Our
product rules forbid collapsing into a global error page more explicitly than
almost anything else, and until today nothing held us to it.

### Where the product stands

**Epic 3's final story, two of ten tasks done.** The status strip is now honest
in every connection state, and we can prove it automatically.

**What is next:** the other five surfaces. The big price, the 518-row table,
the charts and the data-source note still say precisely the same thing whether
the feed is healthy or dead for three hours — starting with the price that is
three hours old and does not say so.
