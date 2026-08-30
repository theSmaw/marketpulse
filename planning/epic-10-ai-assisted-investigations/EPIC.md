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
