# Epic 7 — Deterministic Investigation Engine

**Status:** Not started
**Sequence:** 7 of 15 — follows Epic 6 (Market Topology)
**Spec references:** PRODUCT_SPEC.md §13 (investigation model), §14 (investigation steps), §17 (agent toolset), §33 (agent event protocol), §41 Phase 2

## Goal

Create the investigation system before introducing an LLM.

## Outcome

Users can launch a structured investigation into an anomalous security and see deterministic analytical steps execute.

## Scope

- Investigation domain model
- Investigation lifecycle
- Investigation steps
- Analytical tool interfaces
- Security snapshot tool
- Return-percentile tool
- Volume-anomaly tool
- Peer-comparison tool
- Market-breadth tool
- Correlation tool
- Investigation orchestration
- Streaming investigation events
- Cancellation
- Partial failure handling

## Exit criteria

Selecting:

> Investigate NVDA

runs a structured workflow such as:

- measure price anomaly;
- measure volume anomaly;
- compare peers;
- compare market;
- calculate breadth;

and streams the results into the UI.

No LLM is involved yet.
