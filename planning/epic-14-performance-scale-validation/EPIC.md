# Epic 14 — Performance & Scale Validation

**Status:** Not started
**Sequence:** 14 of 15 — follows Epic 13 (Market Replay)
**Spec references:** PRODUCT_SPEC.md §27 (high-performance rendering), §28 (performance targets)

## Goal

Demonstrate that the architecture can operate beyond the deliberately constrained live-data universe.

## Outcome

MarketPulse contains measurable evidence of frontend and streaming performance.

## Scope

- Synthetic-market generator
- 5,000+ synthetic securities
- 25,000+ graph relationships
- High-frequency update simulation
- Performance instrumentation
- Frame-rate measurement
- Main-thread task measurement
- Streaming-latency measurement
- Web Worker optimization where justified
- Bottleneck analysis
- Published benchmark results

## Exit criteria

Performance targets are reproducible and documented rather than claimed.
