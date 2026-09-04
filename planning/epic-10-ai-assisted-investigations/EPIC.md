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
