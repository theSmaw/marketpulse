import { expect, test, type Page } from "@playwright/test";

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

/**
 * **Run an investigation on `/securities/NVDA` and arrive on `/` with its
 * highlight in force** — the journey the first test asserts, as a helper the
 * clearing tests start from (Task 7.4.3).
 */
async function highlightOnTheOverview(page: Page): Promise<void> {
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
  await expect(highlightNote(page)).toBeVisible();
}

/** The drawn note, in the state where it says a highlight is in force. */
function highlightNote(page: Page) {
  return page
    .getByRole("region", { name: "Market topology" })
    .locator('[data-topology-highlight="active"]');
}

/** The graph's own text equivalent, by its one stable opening. */
function structuralSentence(page: Page) {
  return page
    .getByRole("region", { name: "Market topology" })
    .getByText(/A graph of every security we track/u);
}

/**
 * **A point on the canvas that hit-tests to a node, and one that does not** —
 * found by sweeping rather than guessed (`overview-market-topology-hover.
 * spec.ts`' own technique, in its smallest form: move the pointer and ask the
 * readout plate what it found).
 *
 * **Guessed coordinates were the first draft and they were wrong**, which is
 * this repository's own *look at the page* rule arriving on a spec: the centre
 * of the canvas box is not the hub's own screen position (`fitView` fits the
 * elliptical layout to the box, and the two centres do not coincide), so a
 * click there hit nothing and cleared the highlight — reading as a defect in
 * the feature rather than in the assertion. The one thing a drawn canvas
 * cannot tell a spec is where it drew, so both points are discovered.
 */
async function canvasPoints(page: Page): Promise<{
  readonly node: { readonly x: number; readonly y: number };
  readonly clear: { readonly x: number; readonly y: number };
}> {
  const found = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const readout = document.querySelector('[data-readout="ticker"]');
    if (canvas === null || readout === null) return null;

    const box = canvas.getBoundingClientRect();
    let node: { x: number; y: number } | null = null;
    let clear: { x: number; y: number } | null = null;

    for (let y = 4; y < box.height; y += 5) {
      for (let x = 4; x < box.width; x += 5) {
        if (node !== null && clear !== null) break;
        if (document.elementFromPoint(box.left + x, box.top + y) !== canvas)
          continue;

        canvas.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: box.left + x,
            clientY: box.top + y,
            bubbles: true,
          }),
        );

        const at = { x: box.left + x, y: box.top + y };
        if (readout.textContent === "") clear ??= at;
        else node ??= at;
      }
    }

    canvas.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    return node === null || clear === null ? null : { node, clear };
  });

  if (found === null) {
    throw new Error(
      "the sweep found no pair of points — one on a node, one clear of every node",
    );
  }

  return found;
}

test("Investigate on a security page lights the graph up on the landing page", async ({
  page,
}) => {
  // **The journey itself is `highlightOnTheOverview`** (Task 7.4.3), which
  // the two clearing tests below start from — one copy of *press Investigate,
  // wait for the step the command is sequenced behind, navigate*, so the
  // three cannot drift apart about what *a highlight is in force* means.
  await highlightOnTheOverview(page);

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

// **The way back out — Task 7.4.3, Story 7.4's AC 8.**
//
// This is the only level that can prove any of it. The gestures live in
// `renderer-canvas.ts`, which jsdom cannot mount (no 2d context), and the
// *holder* lives in `App.tsx`, two routes away from the region that draws the
// consequence — so "the reader's press reached the thing that holds the
// command" is a claim about a real browser or about nothing.
test("Escape clears the highlight, and the holder stops holding it", async ({
  page,
}) => {
  await highlightOnTheOverview(page);

  const canvas = page
    .getByRole("region", { name: "Market topology" })
    .locator("canvas");

  // **`press` rather than a click**, deliberately: a click on empty canvas is
  // the OTHER gesture under test, so using one here would prove nothing about
  // the key. Playwright focuses the element first, which is the state Story
  // 6.4's own keyboard spec reaches by `Tab`.
  await canvas.press("Escape");

  await expect(highlightNote(page)).toHaveCount(0);
  await expect(structuralSentence(page)).not.toContainText("Highlighting");

  // **And now the half that is about the HOLDER rather than the canvas.**
  // Leaving `/` and coming back re-mounts `MarketOverview`, whose effect
  // re-applies whatever `App` is holding — so a holder that still held the
  // withdrawn command would put the highlight back here, under a reader who
  // dismissed it. That is the defect this task's own prompt named, and this
  // is the only assertion in the repository that can see it.
  await page.getByRole("link", { name: "Security Explorer" }).click();
  await expect(page).toHaveURL(/\/securities$/u);
  await page.getByRole("link", { name: "Market Overview" }).click();
  await expect(page).toHaveURL(/\/$/u);

  await expect(
    page.getByRole("region", { name: "Market topology" }),
  ).toBeVisible();
  await expect(highlightNote(page)).toHaveCount(0);
  await expect(structuralSentence(page)).not.toContainText("Highlighting");

  await expectNothingFailedToRender(page);
});

test("a click on empty canvas clears it, and a click on a node does not", async ({
  page,
}) => {
  await highlightOnTheOverview(page);

  const { node, clear } = await canvasPoints(page);

  // **A node first, and the highlight survives it** — selecting one of the
  // peers must not be the gesture that destroys the picture it was read from.
  await page.mouse.move(node.x, node.y);
  await page.mouse.down();
  await page.mouse.up();
  // The plate's anchor proves the click landed on a node at all, rather than
  // the highlight surviving a press that hit nothing.
  await expect(
    page.getByRole("region", { name: "Market topology" }).getByRole("link"),
  ).toHaveCount(1);
  await expect(highlightNote(page)).toBeVisible();

  // Then empty canvas, which is the mouse reader's own way out.
  await page.mouse.move(clear.x, clear.y);
  await page.mouse.down();
  await page.mouse.up();

  await expect(highlightNote(page)).toHaveCount(0);
  await expect(structuralSentence(page)).not.toContainText("Highlighting");

  await expectNothingFailedToRender(page);
});

// **The keyboard's own way out — Task 7.4.4**, the affordance `Escape` and a
// click on empty canvas both leave owed: neither is reachable to a reader who
// arrived at the note by `Tab` and has never been told a key clears anything.
//
// This is the only level that can prove two of the three things about it: that
// the control is a real tab stop rather than an inert one, and that pressing it
// does not drop the reader on `<body>`.
test("the note's own Clear control is a tab stop, and returns the reader to the canvas", async ({
  page,
}) => {
  await highlightOnTheOverview(page);

  const topology = page.getByRole("region", { name: "Market topology" });
  const clear = topology.getByRole("button", { name: "Clear" });

  // **A real, present control exactly when the state exists.** The paragraph
  // carries `hidden` while nothing is highlighted, so this locator finds
  // nothing at all before a command — never a `disabled` control, which is
  // the defect this product shipped once and rebuilt `TextField` around.
  await expect(clear).toBeVisible();
  await expect(clear).toBeEnabled();

  await clear.focus();
  await expect(clear).toBeFocused();
  await clear.press("Enter");

  await expect(highlightNote(page)).toHaveCount(0);
  await expect(structuralSentence(page)).not.toContainText("Highlighting");

  // **Focus, which is the half nothing below a browser can see.** The press
  // removes the element holding it, and `Region`'s own dropped-focus backstop
  // does not fire for a removal driven by this component's imperative write
  // (Task 6.4.4 measured exactly that one element over). Where `Escape`
  // already leaves a reader is the canvas, and so does this.
  await expect(topology.locator("canvas")).toBeFocused();

  // And the holder stopped holding it, which is the same assertion the
  // `Escape` test makes and for the same reason: one clearing path, two
  // callers.
  await page.getByRole("link", { name: "Security Explorer" }).click();
  await expect(page).toHaveURL(/\/securities$/u);
  await page.getByRole("link", { name: "Market Overview" }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(highlightNote(page)).toHaveCount(0);

  await expectNothingFailedToRender(page);
});

// **The filter's own third clause — Task 7.4.4, Done-when 1–3.**
//
// Runnable on a gated machine for this spec's own stated reason: the command is
// produced on a zero-bar store and the topology is a function of the universe
// request alone. What a gated machine still cannot see is that the ink actually
// stayed put — `pnpm probe` and a person own that.
test("a filter that hides the whole highlighted set says so, and Show all is the way back", async ({
  page,
}) => {
  await highlightOnTheOverview(page);

  const topology = page.getByRole("region", { name: "Market topology" });

  // `NVDA` is Technology; `?sector=energy` draws no equity the command named.
  // The `Sector` control's own destination, reached as a reader reaches it.
  await topology.getByRole("button", { name: /^Sector/u }).click();
  await topology.getByRole("link", { name: "Energy", exact: true }).click();
  await expect(page).toHaveURL(/[?&]sector=energy/u);

  const filterNote = topology.locator("[data-topology-filter-line]");
  await expect(filterNote).toContainText("Energy");
  await expect(filterNote).toContainText("nothing is quietened");

  // The spoken twin, from the same builder — what could silently become two
  // sentences, which this region has lost three times.
  await expect(structuralSentence(page)).toContainText(
    "None of the highlighted securities are inside this filter",
  );
  // **And the de-emphasis claim is withheld with it**, because there is no
  // de-emphasis drawn for it to describe.
  await expect(structuralSentence(page)).not.toContainText(
    "Every other equity is drawn quieter.",
  );

  // The highlight itself is untouched — the filter never clears a command, and
  // the note still names what was pointed at.
  await expect(highlightNote(page)).toBeVisible();

  // **`Show all`, one press, both cuts** — the existing control, never a
  // second one added for this feature.
  await topology.getByRole("link", { name: "Show all" }).click();
  await expect(page).not.toHaveURL(/[?&]sector=/u);
  await expect(structuralSentence(page)).not.toContainText(
    "None of the highlighted securities",
  );
  await expect(structuralSentence(page)).toContainText(
    "Every other equity is drawn quieter.",
  );

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
