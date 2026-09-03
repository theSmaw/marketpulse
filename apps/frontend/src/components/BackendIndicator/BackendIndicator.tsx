import type { BackendDegradedCause, BackendStatus } from "@marketpulse/shared";

import { cx } from "../../cx.js";
import styles from "./BackendIndicator.module.css";

// The **backend service's** state, as a marker shape plus a word — and it is a
// second component beside `FeedIndicator` rather than a widening of it.
//
// ## The one-indicator-or-two decision (Task 1.12.4)
//
// Story 1.4 posed it, Story 1.5 put the market-feed half on screen, and this is
// where it is answered: **two indicators, one visual language.** The reason is
// the same one that made `BackendStatus` a second type rather than three more
// members on `FeedStatus`:
//
// - `FeedStatus` is a fact the **backend computes and reports** about the
//   market data feed. `BackendStatus` is a conclusion **this client reaches**
//   about whether the backend answered at all — a thing no server can report
//   about itself. They are not two spellings of one fact, so one indicator
//   rendering both would be one component with two vocabularies in it, and the
//   first person to add a member to either would have to work out which.
// - They also fail independently and a user needs both answers: a live feed
//   with an unreachable backend is a real state, and an indicator that could
//   only show one of them would have to pick.
//
// What is *shared* is the visual language, not the component: a marker whose
// **shape** carries the state, a lowercase word beside it, achromatic except
// for the one amber state a glance should land on. Copying that idiom is
// cheaper than a `variant` prop, and it is what stops two indicators in one
// strip reading as two unrelated widgets. The cost, stated rather than
// discovered: the two stylesheets now share an idiom by imitation, so a change
// to the marker language means editing both.
//
// ## None of these is an error, including `unreachable`
//
// PRODUCT_SPEC.md §36 is explicit that a lost connection is a product state —
// "displaying data through 10:42:17" — and this component is this repository's
// first instance of that shape. So nothing here is `--status-error` red, there
// is no `role="alert"`, and the interface around it goes on working. Amber
// marks `degraded` for the same reason `stale` takes it: it is the one of the
// states a glance should land on. `unreachable` is achromatic and told apart
// from `healthy` by the shape of the marker, which is what survives greyscale —
// this palette's red and green are 1.05:1 apart under desaturation, so hue is
// never the encoding here.
//
// ## What it deliberately does not show
//
// **No request id.** Task 1.12.2 settled that rule beside the type that carries
// one: the whole id, never a prefix, and only ever as a labelled reference
// beside a failure the user is being asked to report. This reports a *state*,
// so there is nothing here to quote and no id is rendered. The hook does not
// even hand one over.
//
// **No `version`.** `lastSuccess.version` is `"0.0.0"` deliberately — the image
// tag and its digest are what answer "what is deployed" — so it is not a prop
// here at all, which is why this component takes four fields from
// `useBackendHealth()`'s five rather than the result object whole. A prop named
// after a hook's return type is how a presentational component acquires a
// dependency on a network loop.
//
// **No live region.** `role="status"` would announce every transition, and the
// most common transition is `checking` → `healthy` on every single page load.
// Announcing "backend healthy" to a screen-reader user each time they navigate
// is noise about the client's own startup. The reversal trigger is Epic 3's
// live feed, where a transition is genuinely news.

export interface BackendIndicatorProps {
  /** What the client concluded, straight from `useBackendHealth()`. */
  readonly status: BackendStatus;

  /**
   * Which of the two producible causes made it `degraded`, and `null`
   * otherwise. Required rather than optional so it mirrors the hook's field
   * exactly: under `exactOptionalPropertyTypes` an optional prop and a nullable
   * one are different types, and a caller holding a `T | null` cannot pass it
   * to an optional `T` without a branch at every call site.
   */
  readonly degradedCause: BackendDegradedCause | null;

  /** When the last successful check completed, or `null` if none ever has. */
  readonly lastSuccessAt: Date | null;

  /**
   * Has any check settled yet?
   *
   * This is the fourth **visual** case and deliberately not a fourth
   * `BackendStatus` member. Before the first poll returns, the hook's `status`
   * reads `unreachable` — literally true, nothing has arrived, and true for an
   * uninteresting reason. Rendering that would flash "unreachable" for one
   * round trip on every page load, which is reporting the client's own startup
   * as a fact about the server: the opposite of §36.
   *
   * The case is rendered as a **neutral placeholder** — a dashed marker and the
   * word "checking" — rather than as nothing. Rendering nothing would collapse
   * the region and shift the whole chrome when the first result lands, and it
   * would also be the one thing worse than a wrong state: no state at all,
   * indistinguishable from an indicator that is broken.
   */
  readonly hasChecked: boolean;
}

/** What the user reads. The words are the union's own members, so the screen
 *  and the type share one vocabulary; `checking` is the placeholder and is the
 *  only word here that is not a `BackendStatus` member. */
const STATUS_WORD: Readonly<Record<BackendStatus, string>> = {
  healthy: "healthy",
  degraded: "degraded",
  unreachable: "unreachable",
};

const STATUS_CLASS: Readonly<Record<BackendStatus, string | undefined>> = {
  healthy: styles.healthy,
  degraded: styles.degraded,
  unreachable: styles.unreachable,
};

/**
 * Whether the user is told **which** cause made it degraded, and in what words.
 *
 * `not-ok-status` and `unreadable-body` are engineering slugs and neither is a
 * sentence anybody can act on, so the raw member is never rendered — but the
 * distinction is worth keeping, because the two mean genuinely different things
 * to whoever is debugging: one is the service answering badly, the other is
 * something that is not the service answering at all. A `title` attribute was
 * the obvious home for it and is rejected — a tooltip is unreachable by
 * keyboard and by touch, and Task 1.4.5 already found that this repository's
 * "hint" primitive is a popover for exactly that reason.
 *
 * So the cause selects a **sentence**, rendered in the same detail line every
 * other state uses. Nothing is hidden and nothing is a slug.
 */
const DEGRADED_DETAIL: Readonly<Record<BackendDegradedCause, string>> = {
  "not-ok-status": "The service answered with an error.",
  "unreadable-body":
    "Something answered at the service's address, and it was not this service.",
};

const UNREACHABLE_DETAIL = "No response from the service.";

/**
 * `HH:MM:SS` in the viewer's own clock, formatted by hand rather than through
 * `toLocaleTimeString`.
 *
 * Two reasons, and the second is the one that decided it. §36's example is
 * "displaying data through 10:42:17" — a 24-hour wall clock — and
 * `toLocaleTimeString` gives whatever the runtime's locale says, which is a
 * 12-hour string with a meridiem in a US locale and a different width in
 * several others. A status strip is exactly where a value changing width
 * matters: `font-variant-numeric: tabular-nums` is inherited from `body` and
 * fixes the width of the digits, and it cannot fix the width of an " AM" that
 * comes and goes. And a hand-formatted string is the same string under every
 * runner, so a test can assert it without pinning a locale.
 *
 * An absolute time rather than "3 minutes ago" is the other half of the same
 * decision: a relative label needs its own ticking state, which would put a
 * second interval in the tree beside the poll — a component that re-renders on
 * a timer to keep a sentence true, in the chrome, on every route.
 */
function formatClockTime(at: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");

  return `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
}

/**
 * When the last successful check is worth saying, and what to say when there
 * has never been one.
 *
 * It is rendered in every state **except** `healthy`, where the last successful
 * check is the one that just happened and the word already says so — a
 * timestamp there is a second copy of the same fact, ageing by up to a poll
 * interval, in a strip where it would read as news.
 *
 * The never-succeeded case is its own sentence rather than a hidden line.
 * "Unreachable" with no time beside it looks like a component that forgot the
 * time; "no successful check yet" is the honest and materially different
 * statement that this client has never once been answered, which is what a
 * misconfigured `VITE_API_BASE_URL` looks like from here.
 */
function lastSuccessLine(
  status: BackendStatus,
  lastSuccessAt: Date | null,
): string | undefined {
  if (status === "healthy") return undefined;
  if (lastSuccessAt === null) return "No successful check yet.";

  return `Last confirmed ${formatClockTime(lastSuccessAt)}`;
}

export function BackendIndicator({
  status,
  degradedCause,
  lastSuccessAt,
  hasChecked,
}: BackendIndicatorProps) {
  // The placeholder is a whole render rather than a modifier on the state
  // below, because none of `status`, `degradedCause` or `lastSuccessAt` means
  // anything before the first check settles.
  if (!hasChecked) {
    return (
      <span className={cx(styles.indicator, styles.checking)}>
        <span aria-hidden="true" className={styles.marker} />
        <span className={styles.label}>checking</span>
      </span>
    );
  }

  const detail =
    status === "degraded"
      ? degradedCause === null
        ? undefined
        : DEGRADED_DETAIL[degradedCause]
      : status === "unreachable"
        ? UNREACHABLE_DETAIL
        : undefined;

  const since = lastSuccessLine(status, lastSuccessAt);

  return (
    <span className={cx(styles.indicator, STATUS_CLASS[status])}>
      <span aria-hidden="true" className={styles.marker} />
      <span className={styles.label}>{STATUS_WORD[status]}</span>
      {detail !== undefined && <span className={styles.detail}>{detail}</span>}
      {since !== undefined && <span className={styles.since}>{since}</span>}
    </span>
  );
}
