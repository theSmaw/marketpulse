# Story 1.6 — Configuration & Environment Handling

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Stories 1.2, 1.3
**Epic scope covered:** shared configuration, environment handling

## Description

Typed, validated configuration for both packages, with a clear boundary between server-only secrets and values safe to ship to the browser. Epic 2 introduces Alpaca API credentials and Epic 10 introduces LLM provider credentials, so this boundary must be correct before either arrives.

## Acceptance criteria

* Configuration is parsed and validated at startup, with a declared schema
* The server refuses to start on missing or invalid configuration and names the offending key
* Distinct configuration for development, test and production
* `.env.example` documents every variable, with descriptions and safe placeholder values
* Only explicitly whitelisted variables reach the frontend bundle; secrets cannot leak by accident
* Real secrets are gitignored and never committed

## Notes

Market-data and LLM credentials are server-side only, without exception. The browser talks to the MarketPulse backend, never directly to Alpaca or a model provider.
