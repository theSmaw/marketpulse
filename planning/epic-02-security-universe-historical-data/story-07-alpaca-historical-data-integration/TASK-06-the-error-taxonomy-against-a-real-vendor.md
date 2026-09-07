# Task 2.7.6 — Every failure this vendor can produce, mapped onto the outcomes Story 2.6 settled — and produced rather than imagined

**Status:** Not started
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.5

## Objective

Map Alpaca's real failure responses onto `BarsResult`'s seven failure members, **produce each
one against the live API at least once**, and record the raw bodies so every mapping test runs
offline afterwards.

This is acceptance criterion 3, and it is the criterion most likely to be met by assertion
rather than by evidence.

## What the user can see when this lands

**Nothing on screen.** Nothing renders a market-data failure until Story 2.12, which is when a
user first sees one of these outcomes as a sentence.

What changes is that a wrong key, a dead vendor and a rate limit stop being the same event.
Today they all land in whichever branch was written first; after this they are three different
answers a caller can act on differently — and Task 2.7.7's retry wrapper is a caller that acts
on exactly this distinction.

## Where the throw you are removing actually lives (added 2026-09-07 by Task 2.7.3)

> **AMENDED 2026-09-07 by Task 2.7.5: there are now FOUR throws rather than two, and this task
> still removes exactly one of them.** That task added two more to `alpaca-provider.ts`, both
> on `PROVIDER.md` §8.5's argument — the same argument this section already makes — so a reader
> working from the original inventory would find throws it does not mention, in the very file
> this task is editing, each carrying a comment that reads like a candidate for mapping. They
> are not candidates. Sweeping either into `BarsResult` is precisely the laundering §8.5
> forbids, and one of them is the whole point of Task 2.7.5.

Four throws shipped, and **only the first is this task's to remove**:

- **`alpaca-provider.ts`, on `!response.ok`** — a single `throw` naming this task. It is what
  this task replaces with the mapping below. **It never reads the response body**, deliberately,
  so removing it is where the HTML-`401` collision below actually bites: the shipped code has
  no body-parsing path on the failure branch at all, and this task adds one.
- **`alpaca-provider.ts`, on the page bound being exceeded** — added 2026-09-07 by Task 2.7.5,
  and it **stays**. A `next_page_token` that never becomes null is the vendor behaving
  impossibly or our page arithmetic being wrong; both are defects. Returning the bars collected
  so far is the well-formed-but-incomplete series that task exists to prevent, and mapping it to
  `upstream-unavailable` is the same lie with a member's name on it.
- **`alpaca-provider.ts`, on neither composed signal having aborted** — added 2026-09-07 by Task
  2.7.5, and it **stays**. It is unreachable by construction and says so; a member here would be
  a defect wearing a fact about the world.
- **`alpaca-mapping.ts`'s `parseAlpacaBarsBody`** — the unparseable-body throw, on a **`200`**
  whose shape is not what we believe. That one is the last row of the table below and it
  **stays**. It is already asserted against four malformed shapes and against a non-finite
  `close`.

So the last row of that table is already built and the trap is that the throws look like one
rule. They are not: one is _"a body we needed to read and could not"_, the other is _"a status
that already tells us everything"_ — which is precisely why the box below says map on the
**status** first.

## The mapping, and the two places it is easy to get wrong

`PROVIDER.md` §8.1 is the destination and **it is not this task's to re-open** — no member is
added, struck or renamed here. What this task decides is which vendor response arrives at which
member, and there are two hard cases.

### `unknown-symbol` may not be producible from this endpoint, and that is a finding

**MEASURED 2026-09-07 and CONFIRMED: it is not producible here.** The bars endpoint answers
`200` with `{"bars":{},"next_page_token":null}` for a symbol that does not exist — **byte-identical
to a valid symbol with no prints in the window** — and `PROVIDER.md` §8.2 is unambiguous that the
second is a success. So this is no longer a conditional; take the first of the three responses
below unless Task 2.7.8 adopts the assets endpoint anyway.

Do not resolve that by guessing. Three responses, in order of preference:

- **Record it as a member this provider cannot produce**, with the reason. That is honest, it is
  the same shape as `SECURITY_STATUSES` shipping without `delisted`, and it hands Task 2.7.8 a
  concrete argument for the assets endpoint — which is the one thing in this vendor's API that
  does have an opinion about whether a symbol exists
- **Produce it from the assets endpoint** if Task 2.7.8 adopts that endpoint anyway, at the cost
  of a second request per fetch, which is a real cost against a metered plan and should not be
  paid to populate a union member
- **Never invent it from an empty answer.** A symbol with no prints becoming `unknown-symbol` is
  a product telling a user a real security does not exist, which is worse than saying nothing

Whichever it is, write it into `ALPACA.md` beside the measurement, because Story 2.14 renders
this member as an answer rather than a failure and needs to know whether it can ever arrive.

### The `422` split does not exist — it is a `400`, and `range-not-available` turns out to be a SECOND member this endpoint cannot produce

**AMENDED 2026-09-07. This section was written against a `422` that this vendor does not send,
and against a split that does not arise.** Measured:

| Asked for                        |    Status | Body                                                  |
| -------------------------------- | --------: | ----------------------------------------------------- |
| Range **before** history depth   | **`200`** | `{"bars":{},"next_page_token":null}`                  |
| Range entirely **in the future** | **`200`** | `{"bars":{},"next_page_token":null}`                  |
| Malformed parameter              | **`400`** | `{"message":"Invalid format for parameter start: …"}` |
| End before start                 | **`400`** | `{"message":"end should not be before start"}`        |

**Neither range case is an error at all.** Both are empty successes — which §8.2 makes the
correct answer, and which is the _safe_ shape, because the dangerous alternative was a silently
clipped partial answer and that does not happen either.

So **`range-not-available` is not producible from the bars endpoint**, exactly as
`unknown-symbol` is not. That is two of the seven failure members, and it is a finding rather
than a gap in the testing: §8.7's argument for shipping `range-not-available` without
sub-reasons looks _better_ for it, and both belong in `ALPACA.md` and in Task 2.7.9's
_"any member it cannot produce is named as such"_ check.

What survives is the **principle**, and it still matters: a `400` is **our defect** — a mapping
bug in Task 2.7.3 — and `PROVIDER.md` §8.5's line puts it on the **throw** side. Read the body
rather than the status, and where the body does not distinguish, **prefer the throw**.

Distinguishing them means reading the body rather than the status, and where the body does not
distinguish them, **prefer the throw**. The asymmetry is deliberate: a defect reported as
`range-not-available` is a permanent break wearing the costume of a vendor limit, which nobody
investigates because it looks like the world being unhelpful. `upstream-unavailable` is the
member `PROVIDER.md` §8.1 explicitly calls _"where a defect goes to hide"_, and this is the
first task with real bodies to hide one in.

### The rest

> **A measured collision, and it is this task's sharpest trap.** A **bad key returns `401` with
> an HTML body** — nginx's `<html><head><title>401 Authorization Required</title>…`, produced
> before the application is reached — **not JSON**. The last row of this table says an
> unparseable body is a **throw**. Applied naively, that turns the single most important
> auth failure into a laundered parse error, which is precisely what §8.5 forbids.
>
> **So map on the STATUS first, and parse the body only when there is one and it is JSON.** The
> unparseable-body throw is for a body we needed to read and could not — not for a status that
> already tells us everything. Assert this with a recorded copy of the real HTML body, because
> a fixture written as JSON would pass while the shipped path throws.

| Vendor                                | Outcome                | Note                                                                                                               |
| ------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `401` / `403`                         | `unauthorised`         | Missing, wrong or unentitled — one member, `PROVIDER.md` §8.1's merge rule. **Body is HTML, not JSON — see above** |
| `429`                                 | `rate-limited`         | Carries `retryAfterMs` when the vendor says; **branches**, never assigns                                           |
| `5xx`, connection refused, DNS, reset | `upstream-unavailable` | Retryable                                                                                                          |
| Deadline expired                      | `timeout`              | Carries the deadline. Task 2.7.3 built it; **Task 2.7.5 made it span the whole WALK** — see below                  |
| Caller's signal                       | `aborted`              | Carries nothing, and is never rendered as a market-data state                                                      |
| A body we cannot parse                | **throw**              | Us, not the world                                                                                                  |

> **AMENDED 2026-09-07 by Task 2.7.5: the cheapest way to produce a `403` has been CLOSED, and
> the `timeout` row now means something wider.**
>
> That task measured a **`403 subscription does not permit querying recent SIP data`** on any
> request whose `end` falls inside the last 15 minutes — a cliff, keyed on `end` alone. It is the
> obvious way to produce a `403` without a deliberately wrong key, it costs one request, and
> **the shipped client can no longer produce it**: `alpacaServableEnd` clamps `end` to
> `now − 16 min` unconditionally, before the request is built, so a recent-window fetch comes
> back a clamped **`200`**. A task that reaches for it gets a success and no error at all, and
> criterion 3 is left resting on a production that never happened.
>
> **So `unauthorised` must still be produced from a deliberately wrong secret**, as the bullet
> below says — and the recency `403` is worth recording beside the mapping anyway, because it
> is a **`403` that is not an authorisation failure**. The mapping is unaffected while the clamp
> stands (the status never arrives), and the day anyone removes or widens the clamp it arrives
> as `unauthorised`, which would tell an operator their key is wrong when it is not. That is the
> reversal trigger, and it belongs in a comment beside the `401`/`403` branch.
>
> **The `timeout` row's _"confirm it survives contact"_ also grew.** The deadline now spans a
> whole paginated walk rather than one request, and a walk that expires mid-pagination returns
> `timeout` and **discards the pages already fetched** — argued in Task 2.7.5 against a partial
> `ok`, because a clipped `covered` is indistinguishable from _"the vendor had nothing after this
> point"_. Confirming the row means confirming that, not just that a single slow request expires.

**`Retry-After` — MEASURED 2026-09-07: this vendor sends NEITHER form. The header is absent
from the `429` entirely**, along with every `x-ratelimit-*` header. The body is
`{"message": "too many requests."}` and nothing else.

So `retryAfterMs` **will be absent in practice against Alpaca**, which is not a problem — it is
the vindication of `PROVIDER.md` §8.6 making the hint a **branch rather than an assignment** and
a **floor rather than an instruction**. Handle both forms anyway, because that is a two-line
function and a vendor adding the header is silent; but **test the absent case first**, because it
is the only one this vendor currently produces, and Task 2.7.7's backoff must work with no
server-supplied delay at all.

And the optional field is **spread, not assigned**: under `exactOptionalPropertyTypes` an absent
hint must be genuinely absent rather than present-and-`undefined`, or _"the vendor did not say"_
collapses into _"come back immediately"_. `apiError()` is the idiom and Task 2.6.6 already set it
in the fixture provider; a test asserts the key is absent.

## Produce every one of them against the live API — criterion 3

Each of these is a request somebody makes, once, with the response recorded:

- **Bad key** — a deliberately wrong secret. ~~This is the one member Story 2.7's first deploy
  produces for real~~ — **amended 2026-09-07: the first deploy has now happened (Task 2.7.4) and
  it did NOT produce this.** The key was correct, the client constructed cleanly and no request
  was ever made, because no route calls `fetchBars`. So `unauthorised` has **not** been produced
  against anything real at this point and **this task must produce it deliberately**; criterion 3
  rests on it, and a reader who takes the struck sentence at face value will skip the one
  production that matters most. `PROVIDER.md` §8.1's point stands — it is the member a
  misconfigured deployment produces first — as a statement about what _can_ happen rather than
  about what _has_. **And amended again 2026-09-07 by Task 2.7.5: the one cheap substitute for a
  wrong secret is gone.** A recent-window request answered `403` until that task clamped `end`;
  it now answers a clamped `200`, so a deliberately wrong secret is the only route left
- **Unknown symbol** — per the finding above
- ~~**A range entirely in the future**~~ and ~~**a range before the plan's history depth**~~ —
  **struck 2026-09-07: both are `200` with an empty body**, so neither produces an error to map.
  Record them as the empty successes they are, which is a check that §8.2 is honoured rather
  than an error production
- **The rate limit**, exceeded on purpose. That is criterion 4's first half; Task 2.7.7 owns the
  behaviour at the limit and this task owns the mapping of the response
- **The vendor unreachable** — which is the one that cannot be produced against the live API at
  all, and is produced instead by pointing the base URL at a host that refuses, the way Task
  2.1.7 used `203.0.113.7` (RFC 5737, guaranteed unroutable, so a genuine timeout rather than a
  fast refusal) and Task 1.8.4's squatter produced a socket that accepts and never answers

## What no error may ever carry

**The credential, in any form, anywhere.** Task 2.1.6 extended this from a rule to a measured
property by reading five real failure classes _whole_ rather than by their messages, and the
same discipline applies: an error body may echo a request header, a client library may include
the request in a thrown error, and a log record built from a caught error may serialise
properties nobody enumerated.

So: read the whole error object in each of the six cases above, not its message; assert on it in
a test with a value that is deliberately not a real or fixture credential; and re-run Task
2.7.2's leak check over the newly recorded fixtures before committing them, because **error
bodies are the fixtures most likely to contain a key**.

## Work

- The mapping, exhaustive over what this vendor produces, ~~with the `422` split argued in a
  comment rather than assumed~~ — **struck 2026-09-07 with the section above: this vendor sends
  no `422`.** What replaces it is the argument that a `400` is **our defect** and belongs on the
  throw side, written in a comment beside the branch that throws
- The six live productions, each recorded, each dated, in `ALPACA.md`
- Offline tests over every recorded body — this is the only way criterion 7 and criterion 3 hold
  at the same time
- The `unknown-symbol` finding written into `ALPACA.md` and handed to Task 2.7.8
- Three deliberate breaks, each seen to fail and reverted: an unparseable body laundered into
  `upstream-unavailable`, the rate-limit hint assigned rather than branched, and ~~a `422`
  mapped to `range-not-available` unconditionally~~ — **the third is not producible against a
  vendor that sends no `422`.** Replace it with one that is: **a `401`'s HTML body parsed as
  JSON**, which is the collision the box above names and the one break here that maps to a real
  measured response

## Done when

- Every failure member this provider can produce has been produced against something real and
  its body is recorded
- Any member it **cannot** produce is named as such with the reason, rather than left looking
  implemented
- No error object, message or log record contains the secret — read whole, not by message
- `pnpm verify` is exit 0 with no network access

## Notes

The reason to produce these rather than construct them from documentation is that this
repository has already been paid for it once: Task 2.1.6 produced five real database failure
classes and found that _"Azure's message names the resource to acquire"_ on a wrong audience —
a detail no documentation page carries and that would have cost an afternoon later. Error
mapping written against imagined responses is the code most likely to be wrong in the exact
moment it is most needed.

And one thing to hold on to when a response does not fit: **the union is not this task's to
widen.** `PROVIDER.md` §8's seven were argued against Story 2.6's producible-member rule, and a
vendor response that fits none of them is either a defect (throw) or evidence for a new member
that belongs in a decision, not in an `else`.
