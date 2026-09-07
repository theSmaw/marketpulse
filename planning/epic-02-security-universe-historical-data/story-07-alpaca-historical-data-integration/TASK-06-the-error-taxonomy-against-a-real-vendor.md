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

## The mapping, and the two places it is easy to get wrong

`PROVIDER.md` §8.1 is the destination and **it is not this task's to re-open** — no member is
added, struck or renamed here. What this task decides is which vendor response arrives at which
member, and there are two hard cases.

### `unknown-symbol` may not be producible from this endpoint, and that is a finding

Task 2.7.1 measured what an unknown symbol actually does. **If the bars endpoint answers `200`
with an empty `bars` object** — which is entirely plausible and is what several market-data APIs
do — then from here a symbol that does not exist is **indistinguishable from a symbol with no
prints in the window**, and `PROVIDER.md` §8.2 is unambiguous that the second is a success.

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

### A `422` is two different things and only one of them is a result

The vendor returns a client error for both _"this range is before our history"_ and _"this
parameter is malformed"_. The first is a fact about the vendor's limits and is
`range-not-available`; the second is **our defect** — a mapping bug in Task 2.7.3 — and
`PROVIDER.md` §8.5's line puts it on the **throw** side.

Distinguishing them means reading the body rather than the status, and where the body does not
distinguish them, **prefer the throw**. The asymmetry is deliberate: a defect reported as
`range-not-available` is a permanent break wearing the costume of a vendor limit, which nobody
investigates because it looks like the world being unhelpful. `upstream-unavailable` is the
member `PROVIDER.md` §8.1 explicitly calls _"where a defect goes to hide"_, and this is the
first task with real bodies to hide one in.

### The rest

| Vendor                                | Outcome                | Note                                                                       |
| ------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `401` / `403`                         | `unauthorised`         | Missing, wrong or unentitled — one member, `PROVIDER.md` §8.1's merge rule |
| `429`                                 | `rate-limited`         | Carries `retryAfterMs` when the vendor says; **branches**, never assigns   |
| `5xx`, connection refused, DNS, reset | `upstream-unavailable` | Retryable                                                                  |
| Deadline expired                      | `timeout`              | Carries the deadline. Task 2.7.3 built this; confirm it survives contact   |
| Caller's signal                       | `aborted`              | Carries nothing, and is never rendered as a market-data state              |
| A body we cannot parse                | **throw**              | Us, not the world                                                          |

**`Retry-After` has two forms and both arrive here already resolved.** Delta-seconds or an HTTP
date; `retryAfterMs` is a **duration**, deliberately, because an absolute vendor time reconciled
against our clock means skew in the unlucky direction retries _early_, against the service that
just asked us to stop. Task 2.7.1 recorded which form this vendor actually sends; handle both
anyway, because that is a two-line function and a vendor changing it is silent.

And the optional field is **spread, not assigned**: under `exactOptionalPropertyTypes` an absent
hint must be genuinely absent rather than present-and-`undefined`, or _"the vendor did not say"_
collapses into _"come back immediately"_. `apiError()` is the idiom and Task 2.6.6 already set it
in the fixture provider; a test asserts the key is absent.

## Produce every one of them against the live API — criterion 3

Each of these is a request somebody makes, once, with the response recorded:

- **Bad key** — a deliberately wrong secret. This is the one member Story 2.7's first deploy
  produces for real, and `PROVIDER.md` §8.1 says so
- **Unknown symbol** — per the finding above
- **A range entirely in the future**
- **A range before the plan's history depth**, which Task 2.7.1 measured
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

- The mapping, exhaustive over what this vendor produces, with the `422` split argued in a
  comment rather than assumed
- The six live productions, each recorded, each dated, in `ALPACA.md`
- Offline tests over every recorded body — this is the only way criterion 7 and criterion 3 hold
  at the same time
- The `unknown-symbol` finding written into `ALPACA.md` and handed to Task 2.7.8
- Three deliberate breaks, each seen to fail and reverted: an unparseable body laundered into
  `upstream-unavailable`, the rate-limit hint assigned rather than branched, and a `422` mapped
  to `range-not-available` unconditionally

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
