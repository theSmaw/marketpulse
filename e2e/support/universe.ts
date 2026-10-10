import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { SECURITIES_ROUTE_PATTERN } from "./pair.js";

// **A trimmed tracked universe, for the checks whose subject is not the row
// count** (Task 4.8.13).
//
// ## Why this exists
//
// Task 4.8.9 ranked the browser suite's slowest eight tests across three
// settled full-suite runs at 15–49 s against a 30 s per-test ceiling, and
// **six of the eight were whole-document axe runs over a surface holding all
// 518 securities**. Every disjoint failure set anybody has recorded is a draw
// from that family, and which member crosses depends on which worker was
// busiest — which is why re-running one scoped always passes and why the sets
// are never the same twice.
//
// ## The argument, which is about what axe measures
//
// **axe's findings are per rule and per element kind, not per element.** A
// `color-contrast` finding on the thirtieth row of one shape is the same
// finding as on the five-hundredth; `aria-required-children`, `region`,
// `landmark-one-main` and `page-has-heading-one` are properties of the
// assembled page. So 518 rows of one shape exercise the same rules as 27 of
// the same shapes do.
//
// What 518 rows uniquely test is **duration**, and duration is `pnpm probe`'s
// job and Epic 14's — not axe's. A run that takes 49 s is not a stronger
// accessibility claim than one that takes 7 s; it is the same claim with a
// timeout attached, and `security-explorer-shell.spec.ts` already records why
// that is bad: *a timeout and a violation are not the same finding, and a test
// that can produce either is a test whose red tells you nothing.*
//
// ## And one full-universe pass is kept
//
// `securities-route.spec.ts`'s *the tracked universe renders from the real
// pair* keeps its axe run over all 518 rows, because **axe is clean on the
// real page** is a claim worth holding somewhere. That test is also the one
// that installs **no route at all** — Story 1.13's split, which is what makes
// it go red on a wrong `CORS_ORIGIN` — so it could not be trimmed even if the
// claim were not worth keeping.
//
// **The trimmed passes and the full pass are two assertions, not one with a
// different input.** `e2e/README.md` records that axe's scope changes the
// answer and that two scopings must never be compared; the same caution
// applies to two populations. Each pass says in its own label which it is, and
// no figure from one is ever quoted beside a figure from the other.
//
// ## What the trim preserves, and why it is a sample rather than a slice
//
// A head slice of twenty rows would have been easier and would have removed
// **element kinds** rather than elements: the first twenty symbols
// alphabetically are all ordinary equities in two sectors, so the page would
// have lost the market-proxies group, ten of the eleven sector bands and both
// ETF kinds — exactly the rows a rule might fire on. The sample therefore
// keeps:
//
//   - **every ETF** — the four index ETFs, which are the `Market proxies`
//     group and the one band whose row header carries a sentence rather than a
//     sector name, and the eleven sector ETFs, which are each sector band's
//     `Benchmark` row;
//   - **one equity per sector**, so all eleven sector bands render with a real
//     security under them;
//   - **`NVDA` and `AAPL` by name**, because specs navigate to the first and
//     assert on the second.
//
// Twenty-seven rows against 518.

/** The symbols a spec is entitled to find in a trimmed universe. */
const ALWAYS_KEPT = ["NVDA", "AAPL"] as const;

/**
 * An upper bound on a trimmed population, asserted rather than trusted.
 *
 * The number is not a target — it is a fence. `SECURITIES_ROUTE_PATTERN`'s own
 * docblock records what happens when a route interception silently matches
 * nothing: the spec quietly asserts a state it believes it has produced. A
 * trimmed axe pass whose interception missed is an **untrimmed** axe pass
 * wearing a trimmed label, and it would read as a pass.
 */
const TRIM_CEILING = 60;

interface Security {
  readonly symbol: string;
  readonly kind: string;
  readonly sector: string | null;
}

interface UniverseBody {
  readonly securities: readonly Security[];
  readonly lastCloses?: readonly { readonly symbol: string }[];
  readonly coverage?: readonly { readonly symbol: string }[];
}

/** The handle a spec holds, so it can prove the trim actually happened. */
export interface TrimmedUniverse {
  /** The symbols the page was served, once the interception has fired. */
  served: () => readonly string[];
}

function sample(securities: readonly Security[]): Set<string> {
  const keep = new Set<string>(ALWAYS_KEPT);

  for (const security of securities) {
    if (security.kind !== "equity") keep.add(security.symbol);
  }

  const firstBySector = new Map<string, string>();
  for (const security of securities) {
    if (security.kind !== "equity" || security.sector === null) continue;
    const held = firstBySector.get(security.sector);
    if (held === undefined || security.symbol < held) {
      firstBySector.set(security.sector, security.symbol);
    }
  }
  for (const symbol of firstBySector.values()) keep.add(symbol);

  return keep;
}

/**
 * Serve this page a trimmed tracked universe.
 *
 * The real backend answers and its body is cut down, rather than a body being
 * written here — the same shape `securities-route.spec.ts` already uses to
 * empty `lastCloses`. So the rows, the bands, the industries and the group
 * headings are all this product's own data, and a change to the wire breaks
 * this the way it breaks the page.
 *
 * `withoutCloses` empties `lastCloses` in the same pass. It is an option
 * rather than a second `page.route` because Playwright runs the **last**
 * handler registered first, so two interceptions of one pattern are an
 * ordering question nobody should have to answer.
 */
export async function serveTrimmedUniverse(
  page: Page,
  options: { readonly withoutCloses?: boolean } = {},
): Promise<TrimmedUniverse> {
  let served: readonly string[] = [];

  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as UniverseBody;

    const keep = sample(body.securities);
    const securities = body.securities.filter((security) =>
      keep.has(security.symbol),
    );
    served = securities.map((security) => security.symbol);

    await route.fulfill({
      response,
      json: {
        ...body,
        securities,
        lastCloses:
          options.withoutCloses === true
            ? []
            : (body.lastCloses ?? []).filter((close) => keep.has(close.symbol)),
        coverage: (body.coverage ?? []).filter((entry) =>
          keep.has(entry.symbol),
        ),
      },
    });
  });

  return {
    served: () => served,
  };
}

/**
 * Assert that the page under test really was served a trimmed universe.
 *
 * Called by every trimmed pass, immediately after the page has rendered. An
 * axe pass that is quietly running against 518 rows is the failure this
 * guards: it would be slow, green, and indistinguishable from the thing it
 * replaced.
 */
export async function expectTrimmed(trimmed: TrimmedUniverse): Promise<void> {
  // **Polled rather than read once**, and that was a correction this fence
  // made to itself on its first run (Task 4.8.13). On `/securities/:symbol`
  // the `Price` region becomes visible well before `GET /securities` has been
  // answered — three of the Explorer shell's passes failed here at ~700 ms
  // with `served.length` of `0`. The fence was right: at that instant the page
  // genuinely had not been served a trimmed universe. It had not been served
  // anything.
  await expect
    .poll(() => trimmed.served().length, {
      message:
        "the trimmed universe interception never fired — this pass is " +
        "running against the full 518 rows under a trimmed label",
    })
    .toBeGreaterThan(0);

  const served = trimmed.served();

  expect(
    served.length,
    `the trim served ${String(served.length)} securities, over the ${String(
      TRIM_CEILING,
    )}-row fence`,
  ).toBeLessThan(TRIM_CEILING);

  // The kinds are the point of the sample, so they are asserted rather than
  // assumed: a trim that lost the proxies or the benchmarks would still pass
  // the two counts above.
  expect(served, "the trim keeps the symbols specs navigate to").toContain(
    "NVDA",
  );
  expect(served, "the trim keeps the market-proxies group").toContain("SPY");
  expect(served, "the trim keeps a sector benchmark").toContain("XLK");
}
