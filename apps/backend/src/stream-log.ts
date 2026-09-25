import type { StreamLogEvent } from "./alpaca-stream.js";

// **What an operator is told when the market socket does something** (Task
// 3.11.3).
//
// ## Why this file exists
//
// `createAlpacaStream` has emitted eleven diagnostic events since Story 3.2 and
// **nothing passed it an `onLog`**, so every one of them reached production
// nowhere. A socket that authenticated, a credential that was refused, a
// watchdog that fired, a `406` retried every three seconds: all silent.
//
// That is why a dead feed ran for about **forty hours** unseen from
// 2026-09-19 — and why, when it recovered **unattended** on the Sunday, nobody
// could say what had recovered it. The events that would have said were not
// being written down.
//
// ## What is decided here rather than at the call site
//
// **The level**, which is the whole editorial content of an operational log.
// `LOG_LEVEL` defaults to `info` and the deployment runs at that, so an `info`
// line is visible — but a log where everything is `warn` is a log nobody reads,
// and one where everything is `info` is a log nobody greps. The split below is
// the one an operator would draw: **`warn` is _something is wrong with the
// feed_, `info` is _the feed did what it is supposed to do_.**
//
// ## The rule that shapes the shape
//
// **A diagnostic that can crash the process is worse than no diagnostic.** This
// is reached from the socket's own callback, where an unhandled rejection is a
// crashed process — `live-bar-writer.ts` carries the same constraint and states
// it. So this function is **pure and total**: it maps an event to a level and a
// message and touches nothing. There is no branch here that can throw, which is
// stronger than a `try` around one that can.
//
// And the exhaustive `switch` is the second half of that: **a twelfth event is
// a compile error rather than a silence**, which is exactly the failure this
// task exists to repair, arriving a second time.
//
// ## What is deliberately NOT logged
//
// **Nothing that carries a credential, and nothing that carries a price.**
// `CLAUDE.md`'s line is that the resolved configuration is never logged and
// that `redact` was rejected as a denylist whose failure mode is the key nobody
// added — so this file names the fields it emits rather than spreading an
// event. `credentials-refused` carries **no detail at all**, which is also what
// the wire supports: §8.3 measured `402` as byte-identical for a wrong key, a
// wrong secret and no credential, so a log claiming to distinguish them would
// be inventing the distinction.

/** The shape a logger has to satisfy — Fastify's, narrowed to what is used. */
export interface StreamLogger {
  info(details: Record<string, unknown>, message: string): void;
  warn(details: Record<string, unknown>, message: string): void;
}

/** One event, as a level, a message and the fields worth having beside it. */
export interface StreamLogLine {
  readonly level: "info" | "warn";
  readonly message: string;
  readonly details: Record<string, unknown>;
}

/**
 * Turn one event into one line. Pure, total, and it never throws.
 *
 * Exported for its own test: the mapping is the decision, and a test that
 * drove a real logger would be asserting about Pino rather than about this.
 */
export function streamLogLine(event: StreamLogEvent): StreamLogLine {
  switch (event.kind) {
    // ------------------------------------------------ the feed working
    case "authenticated":
      return {
        level: "info",
        message: "market stream authenticated",
        details: { symbols: event.symbols },
      };

    case "subscribed":
      return {
        level: "info",
        message: "market stream subscribed",
        details: { acknowledged: event.acknowledged },
      };

    // **`info` rather than `warn`, and it is a judgement.** Every deploy
    // closes a socket deliberately and §8.2 measured that every deploy also
    // meets a `406` — so a close is routine, and a log that warns on routine
    // teaches an operator to filter it.
    case "closing-deliberately":
      return {
        level: "info",
        message: "market stream closing deliberately",
        details: {},
      };

    case "closed":
      return {
        level: "info",
        message: "market stream closed",
        details: { elapsedMs: event.elapsedMs },
      };

    // ------------------------------------------- something is wrong
    //
    // **`connection-limit` is a warning even though it happens on every
    // deploy**, which is the one place this file disagrees with itself on
    // purpose. §8.2's overlap is seconds; the 2026-09-19 outage was the same
    // frame **retried every three seconds for forty hours**. The event cannot
    // tell those apart and neither can a level — what tells them apart is
    // **how many of these lines there are**, and that is only countable if
    // they are logged at a level somebody looks at.
    case "connection-limit":
      return {
        level: "warn",
        message: "market stream refused: connection limit",
        details: { retryInMs: event.retryInMs },
      };

    case "credentials-refused":
      return {
        level: "warn",
        message: "market stream refused: credentials",
        details: {},
      };

    case "frame-rejected":
      return {
        level: "warn",
        message: "market stream frame rejected",
        details: { code: event.code },
      };

    case "unexpected-error-frame":
      return {
        level: "warn",
        message: "market stream sent an unexpected error frame",
        details: { code: event.code },
      };

    // **The one that would have said the feed was dead.** The watchdog fires
    // when nothing has arrived for its window; §6.4 measured a socket
    // reporting `OPEN` with nothing behind it for 4 h 21 min.
    case "liveness-watchdog-fired":
      return {
        level: "warn",
        message: "market stream watchdog fired: silent for too long",
        details: { silentForMs: event.silentForMs },
      };

    case "subscription-shortfall":
      return {
        level: "warn",
        message: "market stream acknowledged fewer symbols than requested",
        details: {
          requested: event.requested,
          acknowledged: event.acknowledged,
        },
      };

    case "subscription-refused-empty":
      return {
        level: "warn",
        message: "market stream refused an empty subscription",
        details: {},
      };
  }
}

/**
 * Wire the events to a logger.
 *
 * **A function rather than the logger itself**, so `market-stream.ts` depends
 * on a callback rather than on Fastify — which is what keeps the seam testable
 * and keeps a vendor's logger out of the stream's own types.
 */
export function streamLogTo(
  logger: StreamLogger,
): (event: StreamLogEvent) => void {
  return (event) => {
    // **The one `try` in this file, and it is the constraint rather than
    // caution.** This runs inside the market socket's own callback, where an
    // unhandled throw is a **crashed process** — `live-bar-writer.ts` carries
    // the same rule and states it the same way: *a diagnostic that can crash
    // the process is worse than no diagnostic.*
    //
    // `streamLogLine` cannot throw — it is pure, total and exhaustive — so the
    // only thing inside this boundary that can is the **logger**, which is a
    // vendor's and is not ours to reason about. Losing a line is a line; losing
    // the process is the feed.
    //
    // **Swallowed rather than re-reported**, because the only surface left to
    // report a broken logger *to* is the logger.
    try {
      const { level, message, details } = streamLogLine(event);
      if (level === "warn") logger.warn(details, message);
      else logger.info(details, message);
    } catch {
      // Deliberately nothing.
    }
  };
}
