import { decodeMarketStreamMessage } from "@marketpulse/shared";
import type { WireMarketMovers, WireMarketOverview } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// **The ranking's denominator, against a frame this product's own server
// produced** (Task 4.5.6).
//
// A top five computed over 446 of 503 looks exactly as confident as one
// computed over all of them, which is `EPIC.md`'s *an aggregate is the one kind
// of number that can be wrong while looking right* in its sharpest form. So the
// region states what it was ranked over — and the thing this file asserts is
// that the sentence on screen is **the frame's own figures**, in the grammar of
// the basis the frame sent.
//
// ## Why a browser, and why the accessibility tree
//
// Two of the four claims here are unreachable below this level.
//
// **The sentence must reach a LISTENER.** Story 4.4 found that breadth's
// denominator reached none — its only printed home was an `aria-hidden` ladder,
// correctly hidden — and the DOM was correct in both the broken and the
// repaired version. This region has **no ladder at all**, so there is no
// printed endpoint anywhere and the footer is the only delivery of the figure
// to that audience. Three of its siblings in this very region legitimately
// carry `aria-hidden` (`RankedList`'s `.rules` and `.ladder`), so a sweep is
// the plausible edit, and `Accessibility.getFullAXTree` is the only instrument
// that can see it: `toContainText` passes over an `aria-hidden` subtree.
//
// **The one-sided market and the empty set are states, not fixtures.** CI's
// store is 518 securities and zero bars, so every gated run reaches
// `eligible: 0` with both lists empty — which is this file's **permanent**
// state and is exactly the 466 px of labelled, empty box `docs/GAPS.md` entry
// 13 is about. A developer's backfilled store reaches the other branch. Both
// are asserted, each keyed on what the frame actually said, so neither machine
// skips.
//
// ## What a green run here does not certify
//
// The established sentence: this says everything about what the browser does
// with an arrival and nothing about whether one arrives. And one specific to
// this file — **it cannot tell a correct denominator from a plausible one.**
// `eligible` is a reduction with no recoverable input on the frame, so the
// screen can only be compared with what the producer said. What holds the
// producer is `breadth-is-counted-over-the-equities-alone`'s one-pass clause
// and `overview-breadth-counts.spec.ts`' recount from `GET /securities`;
// `the-ranking-states-its-own-denominator` holds the browser to the movers
// section's own fields rather than breadth's, which are the same numbers and a
// different availability.

const OVERVIEW = "/";

/**
 * The sentence's parts, **written out rather than imported**.
 *
 * Task 4.3.7's rule, unchanged: `describeMeasuredSet` is the module under test,
 * so importing it would make this spec agree with it by construction. If the
 * product's words change, these strings are supposed to need changing.
 */
const RANKED_OVER = "Both lists are ranked over those.";
const NOTHING_TO_RANK = "There is nothing to rank.";
const EMPTY_GAINERS = "None of the names we measured rose.";
const EMPTY_LOSERS = "None of the names we measured declined.";

/**
 * Open the landing page through a **pass-through** market-stream route and
 * return the overview frames the real gateway sent.
 *
 * `overview-breadth-counts.spec.ts`' helper, whose docblock argues every line:
 * the forward is explicit and verbatim, the shipped decoder reads the frame so
 * a protocol change breaks this at the compiler, and the route is installed and
 * **awaited** before `goto`, because a connection already made cannot be
 * intercepted and an unawaited `routeWebSocket` leaves the page talking to the
 * gateway directly — identical on screen, and an empty list here.
 */
async function openWithRecordedStream(
  page: Page,
): Promise<readonly WireMarketOverview[]> {
  const overviews: WireMarketOverview[] = [];

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    const server = ws.connectToServer();

    server.onMessage((raw) => {
      const decoded = decodeMarketStreamMessage(String(raw));
      if (decoded.kind === "message" && decoded.message.type === "overview") {
        overviews.push(decoded.message.overview);
      }

      ws.send(raw);
    });
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  return overviews;
}

/** The last overview frame that carried a movers section, or `undefined`. */
const latestMovers = (
  overviews: readonly WireMarketOverview[],
): WireMarketMovers | undefined =>
  overviews.reduce<WireMarketMovers | undefined>(
    (carried, overview) => overview.movers ?? carried,
    undefined,
  );

/**
 * The recorded section, or a loud failure — a helper rather than a `!`, which
 * the lint rules forbid product-wide.
 *
 * *The gateway sent no movers section* is a different finding from an assertion
 * about a denominator, and it is the one a rollback produces.
 */
const mustHaveMovers = (
  movers: WireMarketMovers | undefined,
): WireMarketMovers => {
  if (movers === undefined)
    throw new Error("no overview frame carried a movers section");
  return movers;
};

/** The clause the frame's own basis licenses, reconstructed from its fields. */
function expectedClause(movers: WireMarketMovers): string {
  const of = `Of the ${String(movers.tracked)} companies we track`;
  const count = movers.eligible === 0 ? "none" : String(movers.eligible);
  const tail = movers.eligible === 0 ? NOTHING_TO_RANK : RANKED_OVER;

  if (movers.basis === "session")
    return `${of}, ${count} had a close-to-close move on ${movers.session}. ${tail}`;

  const minutes = movers.windowMinutes;
  const unit = minutes === 1 ? "minute" : "minutes";
  const verb = movers.eligible === 1 ? "was" : "were";

  return `${of}, ${count} ${verb} heard from in the last ${String(minutes)} ${unit}. ${tail}`;
}

/**
 * Every **unignored** accessibility-tree node's text, from the real tree.
 *
 * `Accessibility.getFullAXTree` over a CDP session rather than Playwright's own
 * `accessibility.snapshot`, because the latter prunes to what it considers
 * interesting and this question is about a `StaticText` node inside a `<p>`.
 * Chromium-only, which is the suite's one project.
 */
async function spokenText(page: Page): Promise<readonly string[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");

  // `AXValue.value` is `any` in the protocol, so the narrowing is explicit —
  // a name is a string or it is not this node's text.
  return nodes
    .filter((node) => !node.ignored)
    .map((node): unknown => node.name?.value)
    .filter((value): value is string => typeof value === "string");
}

test("the region states what it ranked over, in the frame's own figures", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  await expect.poll(() => latestMovers(overviews) !== undefined).toBe(true);

  const region = page.getByRole("region", { name: "Movers" });

  // **Converged on rather than snapped**: on a machine with a provider a second
  // overview frame lands every minute, and one arriving between the frame read
  // and the DOM read is the product working. What this converges on is *the
  // screen agrees with the latest frame*.
  await expect
    .poll(async () => (await region.textContent()) ?? "")
    .toContain(expectedClause(mustHaveMovers(latestMovers(overviews))));

  // **No feed word anywhere in the region.** `live`, `stale` and
  // `disconnected` have one home and it is the status bar — a sentence here
  // reaching for one would trip `one-home-for-the-feed-words` and would deserve
  // to.
  const text = ((await region.textContent()) ?? "").toLowerCase();
  for (const word of ["live", "stale", "disconnected"])
    expect(text).not.toContain(word);

  await expectNothingFailedToRender(page);
});

test("the denominator reaches a listener, read from the accessibility tree", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  await expect.poll(() => latestMovers(overviews) !== undefined).toBe(true);

  // **The DOM is correct whether this passes or fails**, which is the whole
  // reason the assertion is made here: the clause can be swept into an
  // `aria-hidden` subtree beside siblings that legitimately carry one, and
  // nothing below a real browser's accessibility tree can tell.
  await expect
    .poll(async () => (await spokenText(page)).join("\n"))
    .toContain(expectedClause(mustHaveMovers(latestMovers(overviews))));

  await expectNothingFailedToRender(page);
});

test("an empty list says what it is, and a bound nobody selected is not stated", async ({
  page,
}) => {
  const overviews = await openWithRecordedStream(page);

  await expect.poll(() => latestMovers(overviews) !== undefined).toBe(true);

  const movers = mustHaveMovers(latestMovers(overviews));
  const region = page.getByRole("region", { name: "Movers" });
  const text = ((await region.textContent()) ?? "").trim();

  // **Keyed on what the frame said, so neither machine skips.** CI reaches the
  // empty set on every run — 518 securities, zero bars — and a backfilled store
  // reaches the full lists; a one-sided market reaches the branch in between,
  // and a trend day is the only thing that produces it.
  if (movers.eligible === 0) {
    // The footer carries the whole truth, and nothing else claims anything: the
    // head slot's bound and the two per-list sentences are all suppressed,
    // because a claim nobody needs is noise and a bound over a selection that
    // selected nothing reads as a claim about the selection.
    expect(text).toContain(NOTHING_TO_RANK);
    expect(text).not.toContain("each way");
    expect(text).not.toContain(EMPTY_GAINERS);
    expect(text).not.toContain(EMPTY_LOSERS);
  } else {
    // The bound is stated whenever something was selected, including on a
    // one-sided day — it is exactly the fact that says a short list is short
    // because the market was one-sided rather than because it was truncated.
    expect(text).toContain("each way");

    // And each end says something iff it is empty. The sentence claims the set
    // we measured rather than the market: `Nothing declined.` would be a
    // statement about 503 companies, most of which nobody heard from.
    expect(text.includes(EMPTY_GAINERS)).toBe(movers.gainers.length === 0);
    expect(text.includes(EMPTY_LOSERS)).toBe(movers.losers.length === 0);
  }

  await expectNothingFailedToRender(page);
});
