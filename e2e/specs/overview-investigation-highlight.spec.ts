import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { backendOrigin } from "../support/pair.js";

// **The headline journey — press `Investigate` on one page, see another page
// change** (Task 7.4.2), and it is the first time in this product that
// sentence has been true.
//
// ## Why a gated machine can run this at all
//
// Most of Epic 7 is unreachable on CI: the store has 516 securities and zero
// bars and there is no provider, so five of the pipeline's six steps refuse
// for ever. This one is not, by Story 7.4's own AC 3: the orchestrator asks
// for the command **regardless of the peer-comparison step's own outcome**,
// deriving it from the subject's curated sector rather than from anything
// measured — so a `highlightNodes` command is produced on a zero-bar store
// exactly as it is on the deployment. The topology itself is likewise a
// function of the universe REQUEST alone, which succeeds everywhere
// (`overview-market-topology.spec.ts`' own account).
//
// What a gated machine still cannot see is the **ink**: every equity draws
// `unscored` on CI, so the complement de-emphasis there is one faint hollow
// outline against another, and whether it reads as *receded* rather than as
// *broken* is `pnpm probe`'s and a person's. This spec asserts the thing a
// browser can: that the command crossed two routes and the region says so.
//
// ## And it asserts the wire carries no coordinate
//
// ADR 0048 Decision 3's server/browser coordinate agreement is what makes
// `highlight_graph_nodes` answerable with symbols alone, and the failure mode
// it forbids is the quiet one — a highlight landing beside the right node
// because two processes' ring radii disagreed by a release. The shared
// serialiser's own test proves the projection drops a coordinate attached to
// a command; this proves the real SSE frames a real run emits carry none.

const EXPLORER = "/securities/NVDA";

/** The peer-comparison step, by the sentence its own tool owns. */
const COMPARE_STEP = "Compare against sector benchmark";

test("Investigate on a security page lights the graph up on the landing page", async ({
  page,
}) => {
  await page.goto(EXPLORER);

  const region = page.getByRole("region", { name: "Abnormal-move indicators" });
  await expect(region).toBeVisible();
  await region.getByRole("button", { name: "Investigate" }).click();

  // **Wait for the step the command is sequenced BEHIND, completed.**
  // `scripted-agent-provider.ts` appends the command after that step's own
  // `STEP_COMPLETED`, so a reader must not meet the consequence before the
  // step has finished — and the six rows are painted client-optimistically
  // in the same frame as the press, so the row's own presence proves nothing
  // at all. A duration is what distinguishes *queued* from *complete*
  // (`security-investigate.spec.ts`' own account), and waiting on it is what
  // keeps this spec from racing a pipeline that happens to be slower than
  // Story 7.2's measured p50 of 32 ms on some runner.
  const compare = region.locator("[data-step]", {
    has: page.getByText(COMPARE_STEP, { exact: true }),
  });
  await expect(compare).toHaveCount(1, { timeout: 10_000 });
  await expect(compare.getByText(/^\d+ ms$/u)).toHaveCount(1, {
    timeout: 10_000,
  });

  await page.getByRole("link", { name: "Market Overview" }).click();
  await expect(page).toHaveURL(/\/$/u);

  const topology = page.getByRole("region", { name: "Market topology" });
  await expect(topology).toBeVisible();

  // **The note, which is the one rendering of this fact a browser can read.**
  // The ink is the other one and no gated machine can check it.
  const note = topology.locator('[data-topology-highlight="active"]');
  await expect(note).toBeVisible();
  await expect(note).toHaveText(/^Highlighting NVDA and \d+ related securit/u);
  // The relation this run can always answer on any store, because it is
  // curated rather than measured. `return_correlation` needs a nightly pass
  // CI has never run, so it is deliberately not asserted.
  await expect(note).toContainText("sector peers");

  // And the same fact, in the canvas's own text equivalent — one builder, two
  // renderings, which is what could silently become two sentences.
  await expect(
    topology.getByText(/A graph of every security we track/u),
  ).toContainText("Highlighting NVDA and the");

  await expectNothingFailedToRender(page);
});

test("no coordinate crosses the wire in either direction", async ({ page }) => {
  // **The real backend, driven directly rather than through the page**, which
  // is what makes this deterministic: the SSE route terminates its HTTP
  // response after the terminal event (`routes/investigations.ts`' own
  // `raw.end()`), so one request returns the whole run's frames as a body
  // this spec can read. Sniffing the browser's own stream was the first
  // draft and it races the navigation that aborts it.
  const started = await page.request.post(`${backendOrigin}/investigations`, {
    data: { symbol: "NVDA" },
  });
  expect(started.ok()).toBe(true);
  const { id } = (await started.json()) as { id: string };

  const stream = await page.request.get(
    `${backendOrigin}/investigations/${id}/events?from=0`,
  );
  expect(stream.ok()).toBe(true);
  const body = await stream.text();

  // The command was emitted at all — which is AC 3's *regardless of the
  // step's own outcome* holding on a store with zero bars.
  expect(body).toContain("highlightNodes");

  // **The clause a re-implementer cannot avoid**: a coordinate reaching this
  // wire would be a field named for a position, and the two this layout
  // speaks in are `x` and `y`. `symbols`, `relations` and `subject` are the
  // whole of a `highlightNodes` payload, and `toWireWorkspaceCommand` is a
  // field map rather than a spread precisely so a fourth field cannot ride
  // along unnoticed.
  expect(body).not.toMatch(/"x"\s*:/u);
  expect(body).not.toMatch(/"y"\s*:/u);
  expect(body).toContain('"subject"');
});
