// The correlation id: where it comes from, and what it is allowed to be. The
// header that carries it is named in `packages/shared` — see below.
//
// Fastify already had a request id before this module existed — a per-process
// counter rendered `req-1`, `req-2`, … It appeared in the log and *nowhere
// else*, which is the half of the criterion that matters: an id nobody outside
// the process can see correlates nothing. What this module adds is an id that
// is unique without coordination, and a decision about ids arriving from
// outside.

import { randomUUID } from "node:crypto";

import { REQUEST_ID_HEADER } from "@marketpulse/shared";

// The header name is no longer here. Task 1.7.2 left its home open; Task 1.7.3
// moved it to `packages/shared`, beside the error shape, because it is the same
// kind of fact — something the server writes and Story 1.12's frontend reads.
// Only the name moved: generating an id and deciding whether to honour an
// inbound one are server behaviour with a threat model behind them, and they
// stay in this file.
//
// `x-request-id` rather than a W3C `traceparent`. Trace context is a
// propagation *format* — version, trace id, parent id, flags, plus `tracestate`
// and a sampling decision — and adopting the header without the model behind it
// is the shape of the thing without the thing. Epic 10 runs several requests
// per investigation and is where real tracing would earn its keep; it can adopt
// the whole specification then, alongside this header rather than instead of
// it.

// What an inbound id is allowed to look like.
//
// Deliberately narrow rather than merely bounded. It admits a UUID, a hex trace
// id, a nanoid and any ordinary opaque token, and excludes whitespace, control
// characters, quotes, commas and every other delimiter — so an id that reaches
// a log line cannot carry structure into whatever reads that line, and cannot
// carry a line break into a format where one would matter.
//
// The 128-character ceiling is the other half. Node caps a whole header block
// at 16 kB, which is a per-request limit; an id is copied onto *every* record
// for that request and onto the response, so an unbounded one is a log volume
// decision handed to the caller.
//
// Note one property this buys for free: Node joins repeated headers of this
// kind with ", ", so two `x-request-id` headers arrive as one string containing
// a comma, fail here, and get a fresh id — which is the right answer, because
// there is no way to choose between them.
const INBOUND_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

// A UUID, not Fastify's counter.
//
// The counter is per process and starts at 1, so it collides across every
// restart and across every instance: two requests logged as `req-1` on two days
// are indistinguishable, and Story 1.11 may run more than one process. Uniqueness
// without coordination is the property that makes an id worth returning to a
// client at all.
//
// The cost was measured rather than waved at, and it is smaller than it looks.
// Per call it is 34 ns against the counter's 11 ns — 23 ns a request, which is
// nothing beside the 0.14 ms a `/health` response takes. On the wire it is 36
// characters instead of `req-1`'s five, +31 bytes on each of the two records a
// request writes; but Task 1.7.2 also dropped three fields from the request
// serialiser, so the JSON pair went from 427 bytes to **416**. The id got more
// expensive and the record got cheaper.
//
// Epic 3's market stream is the place where the bytes might matter. A shorter
// random token would halve them, and that is a change to this one function.
export function generateRequestId(): string {
  return randomUUID();
}

// Honour an inbound id, validated, or mint a fresh one.
//
// Honoured, rather than always minting, because the id's whole purpose is to
// join records that belong to one user action. Story 1.12 gives the frontend a
// request to make and Epic 10 gives the agent layer several per investigation;
// in both, an id that survives the hop is the difference between one trace and
// several unrelated ones. Deciding it now rather than when something first
// sends one is the point — a caller that sends an id and is silently ignored
// has no way to find that out.
//
// The counter-argument is real and is why the pattern above exists: an inbound
// id is attacker-controlled text on its way into a log line. Validating shape
// and length before it is adopted is what makes honouring it safe; a value that
// fails is dropped rather than sanitised, because a repaired id is a different
// id and correlating on it would be a lie.
//
// Fastify's own `requestIdHeader` option would do the adoption, and is not used:
// it copies the header's value with no validation at all. (Measured: its default
// in Fastify 5.12.1 is `false`, so nothing was being honoured before this.)
export function resolveRequestId(
  headers: NodeJS.Dict<string | string[]>,
): string {
  const inbound = headers[REQUEST_ID_HEADER];
  if (typeof inbound === "string" && INBOUND_ID_PATTERN.test(inbound)) {
    return inbound;
  }
  return generateRequestId();
}
