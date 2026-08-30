# Epic 13 — Market Replay

**Status:** Not started
**Sequence:** 13 of 15 — follows Epic 12 (Investigation Persistence & Branching)
**Spec references:** PRODUCT_SPEC.md §8.4 (Market Replay), §21 (replay), §22 (temporal consistency), §23 (what did the market know), §24 (replay architecture)

## Goal

Introduce historical replay and enforce temporal correctness.

## Outcome

Users can reconstruct a historical market session and investigate it using only information available at that time.

## Scope

- Replay mode
- Global replay clock
- Play/pause
- Replay speed
- Timeline scrubbing
- Historical market-event playback
- Historical anomaly reproduction
- Timestamp-aware analytical tools
- Timestamp-aware SEC queries
- Data-layer future-information prevention
- "Investigate at this moment"
- Agent replay context
- Replay-state visualization

## Exit criteria

The user can select a historical session, stop the clock at a particular time and ask:

> What appears to be happening right now?

MarketPulse cannot access observations or evidence originating after that timestamp.

**Milestone:** by the end of this epic MarketPulse has its signature capability.
