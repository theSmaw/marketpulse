# Epic 10 — AI-Assisted Investigations

**Status:** Not started
**Sequence:** 10 of 15 — follows Epic 9 (Corporate Filing Evidence)
**Spec references:** PRODUCT_SPEC.md §5.1 (AI proposes, code calculates), §12 (primary workflow), §32 (agent architecture), §33 (agent event protocol), §35 (AI safety/trust)

## Goal

Allow an LLM to dynamically direct investigations using the existing deterministic analytical system.

## Outcome

Users can investigate market behaviour conversationally without giving the model authority over calculations.

## Scope

- LLM-provider abstraction
- Agent execution service
- Tool-calling protocol
- Agent event protocol
- Investigation context
- Streaming agent activity
- Stream keep-alive inside the platform's **240-second** ingress idle timeout
- Findings generated from tool results
- Follow-up questions
- Agent cancellation
- Tool failure handling
- Confidence language
- Guardrails against investment recommendations
- Logging/tracing of agent activity

## Exit criteria

A user can ask:

> Why is NVDA falling?

and the agent chooses appropriate analytical tools, streams its investigation, and produces evidence-backed findings.

The model never directly invents authoritative numerical results.

**Milestone:** by the end of this epic MarketPulse becomes an agentic product.

## What Epic 1 hands this epic (2026-09-04)

> **And when you decide what to DO about that ceiling, read
> [ADR 0036](../../docs/adr/0036-two-clocks-and-what-a-liveness-threshold-must-not-read.md)
> first — handed here 2026-09-25 by Epic 3's close, which found this file did
> not know it existed.**
>
> Epic 3 shipped this product's first _is the data still arriving?_ surface and
> paid for three defects getting it wrong, **every one of which passed a green
> suite**. The rule that came out of it is two lines long and it is not the
> obvious one:
>
> - **a duration is monotonic** (`performance.now()`), because a wall clock
>   moves when the machine sleeps or NTP corrects it, and a suspended laptop
>   otherwise manufactures a disconnection;
> - **an age is wall-clock** (`Date.now()`), because an instant carried on an
>   event only has meaning against a calendar;
> - **and neither may read a stamp the wire supplied**, which is a server clock
>   measured on a browser's machine.
>
> Using one clock for both is defect 1: the comparison can never fire, so the
> stream reports healthy for ever, silently. **`worseFeedStatus` in
> `packages/shared/src/feed-liveness.ts` is the shipped shape** — one function,
> so two surfaces reporting the same stream cannot disagree about which state
> is worse.

**The agent event stream must emit something at least every four minutes.**
Azure Container Apps' default HTTP ingress states "Request time out is 240
seconds", and the premium-ingress table names the same number as an _idle_
timeout — which is what establishes it as a ceiling on **silence** rather than
on connection age. This epic's stream is **inbound** SSE, so unlike Epic 3's
outbound WebSocket it is governed by exactly that limit: a long tool call with
no event written closes the stream from underneath the browser. One keep-alive
line is the whole fix, and it is cheap because it was written down before the
stream existed. Premium ingress would raise the ceiling to 30 minutes and
requires a dedicated workload profile at a minimum of two nodes — recorded and
declined in ADR 0011. Do not read Epic 3's `minReplicas: 1` as covering this;
they are different mechanisms and conflating them is the mistake ADR 0011 exists
to prevent.

**This epic is the stated reversal trigger for the frontend's `window` error
listener.** Task 1.7.6 declined one and Task 1.12.2 re-took the decision, both
times recording the trigger as a condition rather than a story number: **an
endpoint that accepts a client error report**. Nothing before this epic
plausibly brings one; `apps/frontend/src/report-error.ts` is where the three
`createRoot` options already land and is the one place to change.

**And a second credential lands here** — the model key — on a platform whose
`secrets` array Epic 2 will have populated for the first time. ADR 0006's
secrets boundary and ADR 0011's public-environment argument both apply; the
resolved configuration is deliberately never logged, and `redact` was rejected
as a denylist whose failure mode is the key nobody added to it.

### Handed here by Story 3.10 — 2026-09-24: the degraded set exists, inherit it rather than re-inventing it

**Every live surface has degraded states and this product has already
enumerated them once**, produced rather than imagined: nine of them,
photographed at 1440, 1024, 768 and 390, with the text of six surfaces compared
so _do two states read identically_ is answered by strings rather than by eye
(Task 3.10.9). The set, the unreachable cells and why they are unreachable are
in that task's record.

**Three rules travel with it and each is somebody's measured defect:**

- **`FeedStatus` is about the CONNECTION and `MarketSessionStatus` about the
  SESSION**, and they must not be collapsed. The market being open does not
  mean data is flowing, and the market being shut is not a feed failure — a
  quiet socket at 02:00 is correct and must not read as broken.
- **A quiet security is not a broken feed.** IEX's median per-symbol minute
  coverage is **65.1%** and the worst case is **2.1%** (`LIVE-DATA.md` §7.6);
  `LIVE-DATA.md` §11.2 measured an ordinary maximum gap of **187 minutes**.
  Anything that reports silence as a fault will cry wolf on thin names all day.
- **The connection has ONE home** — the status bar — and every other surface
  stays quiet by decision (ADR 0029's fourth rule; Tasks 3.10.3, 3.10.5 and
  3.10.8 each took it with reasons). A second surface reporting the connection
  is the defect this product has produced four times on one screen.

**And one unrepaired consequence, recorded in `docs/GAPS.md`**: because the
connection has one home and that home is sticky at the **foot** of the
viewport, at 390 the distinction between _the feed stopped_ and _the market is
shut_ is below the fold. No check can see it.

> **Amended 2026-09-25 by Task 4.1.8 — both halves of that were wrong, and the
> entry it names now exists.** _Below the fold_ is false: the status bar is
> **sticky**, on screen at 390 at any scroll, and when the feed drops it
> **grows from four wrapped lines to six** — a size change that moves the page,
> which is a stronger peripheral signal than a word swap. And `docs/GAPS.md`
> held **no such entry** until this task wrote one; four `EPIC.md` files and an
> ADR had pointed at a record that never existed.
>
> **What is actually wrong is the timing**: a client that loses its network
> reads **`LIVE` for exactly 165 seconds** before anything changes, because the
> word is driven by the monotonic watchdog rather than by the socket closing.
> Nobody fails to notice the fold; for two minutes forty-five seconds there is
> nothing to notice. **Owner: Story 4.7**, with four alternatives priced.

**And the specific instruction for this epic**, which is the reason it is named
here rather than left to inherit: `PRODUCT_SPEC.md` §36 lists an agent's
failure states beside the market socket's, and this product now has a **shipped
vocabulary** for the second — `live | stale | disconnected`, one home, a
sentence and an instant, a word beside a disc, and an announcement on a
degradation only. **Do not grow a second vocabulary for the same idea.** A tool
that failed and a feed that stopped are different subjects; _how this product
says a thing has stopped working_ is one.
