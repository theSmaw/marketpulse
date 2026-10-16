import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";
import {
  overviewWithUnusual,
  sessionUnusualSection,
  unusualRow,
  unusualSection,
} from "../support/unusual.js";

// **What `/` draws while the market is shut** (Task 5.4.5) — the last
// completed session's closing ranking, labelled with the session it describes,
// instead of an empty region.
//
// ## Why this needs a browser at all
//
// The two bases are the same ten rows drawn the same way: the whole visible
// difference is **one sentence under the list**, and that sentence is built by
// a module the component imports rather than by the component. So the question
// a browser answers — and no unit test can — is whether the *rendered* region
// is distinguishable at all between *this is what is happening now* and *this
// is what happened at Friday's close*. A reader who cannot tell them apart has
// a ranking of yesterday's closing minutes presented as the state of the
// market.
//
// ## The frame is FURNISHED, and that is stated rather than hidden
//
// CI's store is 516 securities, zero bars, and it runs no nightly job — so the
// real producer answers with an **empty session arm** there for ever, which is
// honest and has nothing in it to assert about. The frame goes down the
// shipped socket, through the shipped encoder and the shipped decoder, so what
// is furnished is the **data** and not the behaviour.
//
// **So this file says nothing about whether the producer would send a session
// arm**, and nothing about whether the nightly pass computes the right
// ordinal. Task 5.2.4's lesson: a pass-through forwards a producer's bytes
// faithfully, so a broken producer is drawn exactly as faithfully as a correct
// one. What holds the producer is `market-unusual.test.ts` (the arm it builds
// from a stored ranking) and `session-return-percentiles.database.test.ts`
// (what the pass wrote and what a crashed pass leaves behind).

const OVERVIEW = "/";

/** The symbols, in the one order `compareByPercentile` admits for these ranks. */
const RANKED = ["CTSH", "NVDA", "AVGO"] as const;

const ROWS = [
  unusualRow("CTSH", 99, -4.12, { aboveSample: true }),
  unusualRow("NVDA", 99, 3.88),
  unusualRow("AVGO", 98, -2.4),
];

const COUNTS = { scored: 455, eligible: 466, tracked: 501 } as const;

/**
 * The two sentences, **written out rather than imported**.
 *
 * Task 4.3.7's rule: `measured-set.ts` is the module whose words these are, so
 * importing its builder would make this spec agree with it by construction. If
 * the product's words change, these strings are supposed to need changing.
 */
const SESSION_CLAIM =
  "Of the 501 companies we track, 466 had a measurable 5-minute move into " +
  "the close on 2026-10-14 and 455 have a long enough history to rank.";

const OBSERVED_CLAIM =
  "Of the 501 companies we track, 466 were heard from in the last 5 " +
  "minutes and 455 have a long enough history to rank.";

const region = (page: Page) =>
  page.getByRole("region", { name: "Unusual activity" });

/** The drawn rows' tickers, in document order, excluding the held pads. */
const drawnSymbols = (page: Page): Promise<string[]> =>
  region(page).evaluate((root) => {
    const out: string[] = [];
    for (const row of root.querySelectorAll("ol > li")) {
      if (row.getAttribute("aria-hidden") === "true") continue;
      const symbol = row.querySelector('[class*="_symbol_"]');
      out.push(symbol?.textContent.trim() ?? "?");
    }
    return out;
  });

/** Open `/` with a furnished section already on the connect frame. */
async function open(
  page: Page,
  section: ReturnType<typeof unusualSection>,
): Promise<void> {
  await serveFeed(page, { overview: overviewWithUnusual(section) });
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  // The positive state, waited for before anything is read — every
  // characterised flake in this suite is a text assertion over a page that is
  // still settling.
  await expect.poll(() => drawnSymbols(page)).toEqual([...RANKED]);
}

test.use({ viewport: { width: 1440, height: 900 } });

test("draws the last session's ranking, and names the session", async ({
  page,
}) => {
  await open(page, sessionUnusualSection(ROWS, COUNTS));

  const text = (await region(page).textContent()) ?? "";

  // **The ranking is drawn**, which is the whole of this task: out of hours
  // this region used to be `Nothing ranked while the market is shut.` over ten
  // held pads, for about 80% of the week.
  expect(text).toContain("99th");
  expect(text).toContain(SESSION_CLAIM);

  // **And it is NOT the live sentence.** *Heard from in the last 5 minutes* is
  // false about a session that ended hours ago, and it is the sentence a
  // renderer that chose its own basis draws — a well-formed, confidently-dated
  // wrong claim about which measurement is on screen.
  expect(text).not.toContain("heard from");

  await expectNothingFailedToRender(page);
});

test("the two bases are distinguishable on screen, in the same ten rows", async ({
  page,
}) => {
  // The rows, the ordinals, the glyphs and the counts are identical by
  // construction; the sentence is the entire difference, and a region that
  // drew the same words for both would be claiming the market is doing now
  // what it did at Friday's close.
  await open(page, unusualSection(ROWS, COUNTS));
  const observed = (await region(page).textContent()) ?? "";

  await open(page, sessionUnusualSection(ROWS, COUNTS));
  const session = (await region(page).textContent()) ?? "";

  expect(observed).toContain(OBSERVED_CLAIM);
  expect(session).toContain(SESSION_CLAIM);
  expect(observed).not.toBe(session);

  // The drawn rows really are the same in both, so the difference above is the
  // claim rather than the content.
  expect(await drawnSymbols(page)).toEqual([...RANKED]);

  await expectNothingFailedToRender(page);
});

test("says the market is shut, from the section's own basis, when nothing was ranked", async ({
  page,
}) => {
  // The state every store is in before its first nightly run, and CI's for
  // ever. The noun is the region's own — *the ranking* — and the clause about
  // the market being shut is read off **this section's** basis rather than off
  // `Market breadth`'s, which is what lets the two regions be on different
  // bases the day anything puts them there.
  await serveFeed(page, {
    overview: overviewWithUnusual(
      sessionUnusualSection([], { scored: 0, eligible: 0, tracked: 501 }),
    ),
  });
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  await expect(region(page)).toContainText(
    "Nothing ranked while the market is shut.",
  );

  // **And no cut, and no refusal clause**: a fully-formed denominator about
  // nothing is ADR 0029's false impression in a conjunct.
  const text = (await region(page).textContent()) ?? "";
  expect(text).toContain(
    "Of the 501 companies we track, none had a measurable 5-minute move " +
      "into the close on 2026-10-14.",
  );
  expect(text).not.toContain("long enough history to rank");

  await expectNothingFailedToRender(page);
});
