import {
  BASELINE_MINIMUM_SAMPLE,
  PERCENT_DISPLAY_DECIMALS,
  decodeMarketStreamMessage,
  directionOf,
} from "@marketpulse/shared";
import type { ReturnMessage } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import {
  expectEveryRegionIsATabStop,
  expectNothingFailedToRender,
} from "../support/app.js";
import { backendOrigin } from "../support/pair.js";

// **`Abnormal-move indicators`, over a frame this product's own server
// produced** (Task 5.2.4 — Story 5.2's done-when 4).
//
// ## It is a PASS-THROUGH, and that is the whole design
//
// Task 4.3.8 found **four** overview specs green against a server with the
// ranking deleted, because each one supplied the data it then checked. A
// furnished frame can only ever be made to agree with itself. So nothing here
// is written by this file: the real gateway's `return` frames are recorded on
// the way past and the drawn region is compared with **them**.
//
// ## What that is worth, stated rather than implied
//
// **Strictly weaker than correctness.** This says the browser draws what the
// server sent; it says **nothing** about whether what the server sent is the
// right 5-minute return. A gateway computing the figure between bars 47
// minutes apart would pass every assertion in this file. The arithmetic's own
// guard is `apps/backend/src/five-minute-return.test.ts`, over the shipped
// window; the spelling's is `apps/frontend/src/market/five-minute-return.test.ts`.
// What only a browser can say is here: that the two meet, that the region is
// one height whether a figure arrived or not, and that it is a tab stop.
//
// ## What no gated machine will ever see here
//
// **A figure.** CI's store is 516 securities and zero bars and its feed is
// `provider=none`, so the trailing window never holds an entry and every
// gated run records `nothing-observed` — for ever. The measured arm below is
// therefore written to run **when the server produces one**, and the refusal
// arm is the one that has teeth on CI. Neither is skipped: the first test
// asserts the agreement whichever of the two the server sent, and says which
// in its failure message.
//
// **And a PERCENTILE is further out of reach than a figure** (Task 5.3.4):
// it needs a measured return *and* a 60-session baseline, so no machine in
// this repository draws one. CI has neither; a developer's store has the
// baseline and no feed. So every assertion here about a drawn percentile is
// **conditional and vacuous outside production**, and the claim with teeth is
// the negative one — *this deployment cannot support a percentile, therefore
// nothing on the page may claim one* — grounded on `GET /market-data` and on
// `GET /diagnostics/baseline-cost`. `docs/GAPS.md` carries that as a standing
// item rather than a hole this file can close.
//
// ## The 2,000 ms floor is a property of this page, not an accident
//
// `security-feed-degraded.spec.ts` went red the day before this file was
// written because its baseline settled at ~200 ms and the region's honest
// sentence arrived afterwards — the spec could not tell *the feed died* from
// *two seconds passed*. Every reading below is taken from a **settled** state:
// either a drawn band or the region's own sentence, both of which are positive
// states rather than the absence of one.

const EXPLORER = "/securities/NVDA";

/**
 * The region's four honest-absence sentences, **written out rather than
 * imported**.
 *
 * `relative-performance.ts`' and `five-minute-return.ts`' constants are the
 * module under test's own, so importing them would make this spec agree with
 * the renderer by construction — which is the furnished-frame defect wearing a
 * different hat. If the product's words change, these strings are supposed to
 * need changing.
 */
const REFUSAL_SENTENCES = {
  "nothing-observed": "No bars observed yet",
  "no-earlier-endpoint": "No bar five minutes back",
  "no-basis": "No basis for a percentage",
} as const;

/**
 * The volume band's six honest-absence sentences, **written out rather than
 * imported** for {@link REFUSAL_SENTENCES}' reason: importing the module under
 * test's own constants makes this spec agree with the renderer by
 * construction, which is the furnished-frame defect wearing a different hat.
 */
const VOLUME_REFUSAL_SENTENCES = {
  "no-same-tape-baseline": "No IEX volume history for this security",
  "too-few-sessions": "Too little history —",
  "split-discontinuity": "Unadjusted price break — shares not comparable",
  "zero-volume-baseline":
    "No IEX shares in a typical minute at this time of day",
  "no-bar-in-bucket": "No IEX bars in the last",
  "bucket-partially-observed": "IEX printed in only",
} as const;

/** The region's own noun — the one sentence that takes a terminal stop. */
const NO_RETURN = "No return yet.";

/**
 * **Whether this deployment has a market-data provider at all**, asked of the
 * backend over HTTP rather than of the socket.
 *
 * This is the one source outside the `return` frame that can say anything
 * about whether the frame is *right*, and it is what makes this file
 * non-vacuous on CI. The trailing window is filled by **live observations and
 * by nothing else** — Gate 1 decision 3: there is deliberately no
 * store-backed fill at cold start — so a process with no provider has
 * observed nothing, for ever, and **a measured 5-minute return from it is
 * structurally impossible**.
 *
 * Without this, a pass-through is blind by construction to the defect it most
 * needs to catch: a producer that fabricates a figure instead of refusing
 * sends a frame the browser then draws faithfully, and *the page agrees with
 * the frame* is green either way. `pnpm break the-return-is-fabricated-
 * rather-than-refused` is that defect, and this is the assertion it hits.
 */
async function providerFeed(page: Page): Promise<string | null> {
  const response = await page.request.get(`${backendOrigin}/market-data`);
  const body = (await response.json()) as { feed: string | null };
  return body.feed;
}

/**
 * **What this deployment's STORE can support, asked of the database rather
 * than of the frame** (Task 5.3.4).
 *
 * `GET /diagnostics/baseline-cost` runs the pass's own read — one security,
 * the real predicate — and reports whether `bar_coverage` has a `1m` row at
 * all and how many `sip` bars the 60-session window holds. Both answers bound
 * what a percentile can possibly be, from outside the `return` frame:
 *
 * - `measured: false` means the store has **no `1m` coverage**, so no baseline
 *   window can be read for any security and a ranked percentile is
 *   fabricated. **This is the arm CI takes**: its store is 516 securities and
 *   zero bars.
 * - `sipRows` is an upper bound on the sample, because every grid anchor the
 *   sampler pairs is a distinct `sip` bar inside that window — so a
 *   `sampleCount` above it is a number nothing could have counted, and a
 *   `sipRows` below `BASELINE_MINIMUM_SAMPLE` makes a rank impossible
 *   outright.
 *
 * Without this the percentile assertions below are a **pass-through**, which
 * `docs/GAPS.md` records as proving fidelity and never correctness: a producer
 * that invents a `99th percentile` is drawn exactly as faithfully as a
 * correct one, and *the page agrees with the frame* is green either way.
 */
interface BaselineCost {
  readonly measured: boolean;
  readonly sipRows: number | null;
  /**
   * **How many `iex` rows the 60-session window holds for this security**, and
   * the one fact outside the `return` frame that bounds a volume multiple
   * (Task 5.5.4).
   *
   * The volume baseline is built from `feed = 'iex'` **by name** (Gate 1
   * decision 1), and the nightly pass writes **no row at all** for a security
   * with no `iex` bar in the window. So `0` or `null` here means no same-tape
   * baseline can exist for NVDA on this deployment, and a drawn IEX multiple
   * is fabricated **by construction** — which is this file's second
   * out-of-frame claim and the one with teeth on every machine that is not
   * Azure, because the live writer only runs where a provider is configured.
   */
  readonly iexRows: number | null;
}

async function baselineCost(page: Page): Promise<BaselineCost> {
  const response = await page.request.get(
    `${backendOrigin}/diagnostics/baseline-cost?symbol=NVDA`,
  );
  return (await response.json()) as BaselineCost;
}

const region = (page: Page): Locator =>
  page.getByRole("region", { name: "Abnormal-move indicators" });

const heightOf = (locator: Locator) =>
  locator.evaluate((element) => element.getBoundingClientRect().height);

/**
 * What the region draws, **line by line**.
 *
 * The band is four `<p>` elements and `textContent` runs them together with no
 * separator; a reserved line holds a no-break space and nothing else. So the
 * lines are read individually, the room-holders dropped, and the
 * `aria-hidden` subtrees — the direction glyph, and the whole reserved box in
 * the held state — removed, because what is being compared with the frame is
 * what a reader is given.
 */
const linesOf = (locator: Locator): Promise<readonly string[]> =>
  locator.evaluate((root) => {
    const copy = root.cloneNode(true) as HTMLElement;
    for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) {
      hidden.remove();
    }

    return [...copy.querySelectorAll("p")]
      .map((line) =>
        line.textContent.replaceAll("\u00a0", "").replace(/\s+/gu, " ").trim(),
      )
      .filter((line) => line !== "");
  });

/**
 * Open the security page through a **pass-through** market-stream route, and
 * return the `return` frames the real gateway sent.
 *
 * `overview-breadth-counts.spec.ts`' helper, pointed at the fifth message
 * type: `server.onMessage` turns off automatic forwarding so the forward is
 * explicit and verbatim, the shipped decoder reads the frame so a protocol
 * change breaks this at the compiler, the route is installed **before** `goto`
 * because a connection already made cannot be intercepted, and it is
 * **awaited**, because an unawaited `routeWebSocket` leaves the page talking to
 * the gateway directly — identical on screen, and an empty list here.
 *
 * Nothing on the client's side is intercepted, so the `subscribe` the page
 * sends — and the **focus** on it, which is what makes the gateway answer with
 * this frame at all — is the page's own.
 */
async function openWithRecordedStream(
  page: Page,
): Promise<readonly ReturnMessage[]> {
  // **The whole frame rather than its `return` member** (Task 5.5.4), because
  // the frame now carries TWO figures and they refuse independently — a pair
  // read out of two arrays is a pair that can describe two different sends.
  const frames: ReturnMessage[] = [];

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    const server = ws.connectToServer();

    server.onMessage((raw) => {
      const decoded = decodeMarketStreamMessage(String(raw));
      if (
        decoded.kind === "message" &&
        decoded.message.type === "return" &&
        decoded.message.symbol === "NVDA"
      ) {
        frames.push(decoded.message);
      }

      ws.send(raw);
    });
  });

  await page.goto(EXPLORER, { waitUntil: "networkidle" });

  return frames;
}

/**
 * The last figure the gateway sent, or a loud failure.
 *
 * *The gateway sent no `return` frame at all* is a different finding from a
 * disagreement about what it said, and it is the one a rollback produces.
 */
const mustHaveSent = (frames: readonly ReturnMessage[]): ReturnMessage => {
  const last = frames.at(-1);
  if (last === undefined)
    throw new Error("the gateway sent no `return` frame for NVDA");
  return last;
};

test.use({ viewport: { width: 1440, height: 900 } });

test("the region draws what the SERVER sent, figure or refusal", async ({
  page,
}) => {
  const frames = await openWithRecordedStream(page);
  const panel = region(page);
  await expect(panel).toBeVisible();

  const sent = mustHaveSent(frames).return;

  // **The one claim here that is not *the page agrees with the frame*.** See
  // `providerFeed`: with no provider configured nothing has ever been
  // observed, so a figure is impossible and the only honest answer is a
  // refusal. On CI this arm is always taken.
  if ((await providerFeed(page)) === null) {
    expect(
      sent.measured,
      "a gateway with no market-data provider has observed nothing, so a measured 5-minute return is fabricated",
    ).toBe(false);
  }

  // **Converged on rather than snapped once.** On a store with a live feed a
  // second `return` frame landing between reading the frames and reading the
  // DOM is an ordinary sequence, not a defect, so the agreement is polled and
  // the frame list is re-read each time.
  await expect
    .poll(async () => (await linesOf(panel)).join(" / "))
    .toContain("5-minute return");

  const lines = (await linesOf(panel)).join(" / ");

  if (sent.measured) {
    // **The digits, from the frame's own percentage.** `PERCENT_DISPLAY_DECIMALS`
    // is shared with the backend and is the one home for the precision a
    // direction is decided at, so this is arithmetic on what was sent rather
    // than a second formatter.
    expect(lines).toContain(
      `${Math.abs(sent.percent).toFixed(PERCENT_DISPLAY_DECIMALS)}%`,
    );
    // The spoken direction, which is what carries the sign when the colour is
    // taken away — the price palette differs by 1.04:1 in greyscale.
    expect(lines).toContain(directionOf(sent.percent) ?? "unchanged");
    expect(lines).toContain(
      `observed ${String(sent.observed)} of ${String(sent.spanMinutes)} minutes`,
    );
    // And it names the tape it was measured on, which the chart beside it
    // cannot do for this figure (invariant 6).
    expect(lines).toContain("Measured on");

    // **The comparison, bounded by something that is not the frame** (Task
    // 5.3.4). See `baselineCost`: these are the only assertions in this file
    // about the percentile that a fabricating producer cannot satisfy.
    const comparison = sent.percentile;
    const cost = await baselineCost(page);

    if (comparison?.ranked === true) {
      expect(
        cost.measured,
        "a store with no 1m coverage can read no baseline window, so a ranked percentile is fabricated",
      ).toBe(true);
      expect(
        comparison.sampleCount,
        "a baseline cannot hold more samples than the window holds sip bars",
      ).toBeLessThanOrEqual(cost.sipRows ?? 0);
      expect(
        comparison.sampleCount,
        "a percentile below the stated minimum sample must be refused rather than printed",
      ).toBeGreaterThanOrEqual(BASELINE_MINIMUM_SAMPLE);
      // The ordinal is on screen and the `%` is not — AC 7, as a reader meets
      // it rather than as the unit tests have it.
      expect(lines).toMatch(/\d+(?:st|nd|rd|th) percentile/u);
    } else if (
      !cost.measured ||
      (cost.sipRows ?? 0) < BASELINE_MINIMUM_SAMPLE
    ) {
      // **The arm with teeth on CI.** This deployment's store cannot support a
      // percentile for NVDA at all, so the region must not draw one — and the
      // producer break is pointed at exactly this assertion.
      expect(
        lines,
        "this store cannot support a baseline, so nothing here may claim a percentile",
      ).not.toContain("percentile");
    }
  } else {
    // **The honest absence, by exact text.** This is the arm every gated run
    // takes, and the one the producer break is pointed at: a gateway that
    // fabricates a figure rather than refusing draws digits here, and this
    // assertion is what sees it.
    expect(lines).toContain(REFUSAL_SENTENCES[sent.refusal]);
    // **A refusal has no comparison, by the shape of the frame** (Task
    // 5.3.4): `percentile` is a member of the measured arm alone, so there is
    // no magnitude to rank and nothing on screen may say otherwise. This is
    // the arm every gated run takes.
    expect(lines).not.toContain("percentile");
    expect(lines).not.toContain("Baseline");
    // A refusal has no figure at all — never a dash, which is `unchanged` in
    // `PriceChange` and would assert a zero return, and never a zero.
    expect(lines).not.toContain("%");
    expect(lines).not.toContain("—");

    // **And what the window DID hold, where it held something** (Task 5.2.4).
    // The clause is what keeps *one bar and no pair* off *we heard nothing*:
    // the frame's own shape decides, so a `seen` of `null` must draw no clause
    // and a `seen` with a span must draw its count.
    if (sent.seen === null) {
      expect(lines).not.toContain("of 5 minutes");
    } else {
      expect(lines).toContain(
        `observed ${String(sent.seen.observed)} of ${String(sent.seen.spanMinutes)} minutes`,
      );
    }
  }

  // The region it replaced said this, and a placeholder that survives the
  // thing it was waiting for is a screen holding a plan while holding the
  // plan's output.
  expect(lines).not.toContain("Filled by Epic 5");

  await expectNothingFailedToRender(page);
});

test("the volume band draws what the SERVER sent, multiple or refusal", async ({
  page,
}) => {
  // **Story 5.5's visible deliverable, through a pass-through** (Task 5.5.4).
  // The caveat at the head of this file applies unchanged and harder: a
  // pass-through proves **fidelity, never correctness**, and a producer broken
  // into inventing a multiple is drawn exactly as faithfully as a correct one.
  // What has teeth is the claim grounded OUTSIDE the frame — `iexRows` — and
  // it is the arm every machine that is not Azure takes.
  const frames = await openWithRecordedStream(page);
  const panel = region(page);
  await expect(panel).toBeVisible();

  const sent = mustHaveSent(frames).volume;

  // **The gateway always says something about the volume.** `null` is the
  // *this gateway sent no comparison at all* state, which only a browser
  // holding a bundle across a deploy reaches — a shipped gateway refuses with
  // a word instead, and a `null` here would mean the producer was never wired.
  expect(
    sent,
    "the gateway sent a `return` frame with no volume comparison on it at all",
  ).not.toBeNull();
  if (sent === null) return;

  await expect
    .poll(async () => (await linesOf(panel)).join(" / "))
    .toContain("Volume per minute");

  const lines = (await linesOf(panel)).join(" / ");
  const cost = await baselineCost(page);

  if (sent.measured) {
    // **The out-of-frame claim.** See `BaselineCost.iexRows`: with no `iex`
    // row in the window the nightly pass writes no row, so no same-tape
    // baseline exists and any multiple is fabricated by construction.
    expect(
      cost.iexRows ?? 0,
      "a store with no iex rows holds no same-tape volume baseline, so a drawn IEX multiple is fabricated",
    ).toBeGreaterThan(0);
    expect(
      sent.sampleCount,
      "a bucket cannot hold more minutes than the window holds iex bars",
    ).toBeLessThanOrEqual(cost.iexRows ?? 0);

    // **The figure, as a reader meets it.** The `×` is U+00D7 glued to the
    // digits, the comparand is a word beside it, and there is **no sign** —
    // which is the discriminator no unit test can see in situ, because the
    // tinted percentage one band up is on the same screen.
    expect(lines).toMatch(/\d+\.\d\u00d7 typical/u);
    expect(lines).not.toMatch(/[+\u2212]\d+\.\d\u00d7/u);
    // And it names the tape on **both** sides, which is Gate 1 decision 1 on
    // screen: this baseline is the same venue as its numerator, where the
    // percentile's is the consolidated tape.
    expect(lines).toContain("baseline on");
  } else {
    // **The arm every gated machine takes, for ever**, and the words are
    // written out rather than imported for `REFUSAL_SENTENCES`' reason.
    expect(VOLUME_REFUSAL_SENTENCES[sent.refusal]).toBeTruthy();
    expect(lines).toContain(VOLUME_REFUSAL_SENTENCES[sent.refusal]);
    // A refusal has no figure at all: no multiple, no comparand, and no
    // baseline clause about a baseline that was not used (ADR 0029).
    expect(lines).not.toContain("×");
    expect(lines).not.toContain("typical");
    expect(lines).not.toContain("today excluded");
  }

  // **And the negative claim with teeth**, which holds whichever arm was
  // taken: a deployment whose store has no `iex` rows cannot draw a multiple,
  // so nothing on this page may show one.
  if ((cost.iexRows ?? 0) === 0) {
    expect(
      lines,
      "this store holds no iex rows, so nothing here may claim a volume multiple",
    ).not.toContain("×");
  }

  await expectNothingFailedToRender(page);
});

test("a region with no frame at all says so, and is exactly as tall", async ({
  page,
}) => {
  const frames = await openWithRecordedStream(page);
  await expect(region(page)).toBeVisible();

  // Settled on a **positive** state before the height is taken: the band has
  // drawn whatever the frame said. Reading a height off a page that is still
  // acquiring answers is the shape all three of this suite's characterised
  // flakes have.
  await expect
    .poll(async () => (await linesOf(region(page))).length)
    .toBeGreaterThan(1);
  mustHaveSent(frames);
  const drawn = await heightOf(region(page));

  // **No socket at all**, which is the only way this page reaches *no frame
  // has arrived* on a server that is up: the route is installed and never
  // connected to the gateway, so the browser's socket opens and stays silent.
  await page.routeWebSocket(/\/market-stream$/u, () => {
    // Deliberately empty: connected, and nothing is ever sent.
  });
  await page.goto(EXPLORER, { waitUntil: "networkidle" });
  await expect(region(page)).toBeVisible();

  // **The sentence is behind a 2,000 ms floor**, so this wait is the product's
  // own decision elapsing rather than a tolerance — and waiting for the
  // sentence is what makes the height below a reading of a settled state. An
  // ordinary load's first frame lands at 174–277 ms, so on a page that is
  // merely slow this sentence never appears at all.
  await expect(region(page).getByText(NO_RETURN)).toBeVisible({
    timeout: 10_000,
  });

  // **And the held room is held from the accessibility tree too.** The whole
  // band sits inside one `aria-hidden` element with the sentence as a sibling
  // — never an override on the same element, because `visibility` is inherited
  // and un-hiding the box un-hides every reserved row in it, which leaked
  // eleven sector slugs one region over for ten days.
  const spoken = await region(page).ariaSnapshot();
  expect(spoken).toContain(NO_RETURN);
  expect(spoken).not.toContain("%");
  expect(spoken).not.toContain("5-minute return");

  const held = await heightOf(region(page));

  // **The assertion this spec exists for.** The region sits in a column of
  // three with `Relative performance` directly below it, so a region that
  // grows when a figure arrives moves `Anomaly history` under the reader.
  // `Movers` paid exactly this at 81 px. Every row reserves its own room so
  // that it cannot happen again — a claim nothing below a browser can check,
  // because jsdom applies no stylesheet and computes no layout.
  expect(held).toBe(drawn);

  await expectNothingFailedToRender(page);
});

test("the region is a tab stop like every other", async ({ page }) => {
  await openWithRecordedStream(page);
  await expect(region(page)).toBeVisible();

  // ADR 0039: a tab stop must not appear and disappear under a reader, so
  // `Region` is one unconditionally — which this region inherits rather than
  // decides. Asserted over every region on the route, because the defect this
  // replaces is a stop that exists in one state and not another.
  await expectEveryRegionIsATabStop(page, { atLeast: 8 });
});
