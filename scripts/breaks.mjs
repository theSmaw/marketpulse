// The breaks this repository knows how to perform, and what each one proves.
//
// One entry per invariant in `scripts/check-invariants.mjs`. Every check there
// is a claim that something in the tree holds; an entry here is the edit that
// makes it stop holding, so `pnpm break <name>` can demonstrate that the check
// is live rather than decorative.
//
// `CLAUDE.md`: *a break that does not go red is not evidence the check works —
// it is equally evidence the break did not land.* These are how that gets
// verified without anybody hand-editing a file and remembering to undo it.
//
// ## The shape of an entry
//
//   name     what `pnpm break <name>` is called
//   proves   the sentence a reader sees; what going red demonstrates
//   file     repo-relative, and it must be committed — `break-verify.mjs`
//            refuses on a dirty target because it restores by overwriting
//   find     the exact text to replace. **Must occur exactly once**, which the
//            harness checks before touching anything
//   replace  what to put there
//   command  argv, run from the repository root
//   expect   a string that must appear in the failing output, so a command
//            failing for an unrelated reason is not mistaken for a proof
//   build    true when the break only reaches the subject through a build, so
//            the harness rebuilds before the command and again after restoring
//
// ## Why the first entry is the only one that rebuilds
//
// `no-fixture-reaches-the-bundle` is a claim about `apps/frontend/dist/`, which
// no edit touches directly — the leak happens when a shipped source file
// imports a recorded body and the bundler pulls 357 kB of market data in behind
// it. So that break edits the source and the harness builds twice: once to make
// the leak real, once after restoring so the next command does not read a
// polluted `dist/` and go red for a reason that no longer exists.

export const BREAKS = [
  {
    name: "fixture-in-the-bundle",
    proves:
      "A recorded market body imported by a shipped source file reaches every " +
      "visitor, and the invariant catches it.",
    file: "apps/frontend/src/routes/SecurityExplorer.tsx",
    find: 'import { useNavigate } from "react-router";',
    replace:
      'import { useNavigate } from "react-router";\n' +
      "\n" +
      "// eslint-disable-next-line no-restricted-imports -- pnpm break: reverted automatically\n" +
      'import { BAR_SERIES_FIXTURES } from "../fixtures/bar-series.js";\n' +
      "\n" +
      "// eslint-disable-next-line no-console -- pnpm break: reverted automatically\n" +
      "console.log(JSON.stringify(BAR_SERIES_FIXTURES).length);",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "no-fixture-reaches-the-bundle",
    build: true,
  },

  {
    name: "second-density-breakpoint",
    proves:
      "A media query in the chart's stylesheet is a second home for the 600 px " +
      "density boundary, and the invariant catches it.",
    file: "apps/frontend/src/components/PriceChart/PriceChart.module.css",
    find: ".chart {",
    replace:
      "@media (width < 600px) {\n  .chart {\n    --density: compact;\n  }\n}\n\n.chart {",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-density-breakpoint",
  },

  {
    name: "coverage-edge-matches-the-seam",
    proves:
      "The coverage edge drawn in the session seam's own rhythm is invisible " +
      "where the two coincide, and the invariant catches it.",
    file: "apps/frontend/src/components/PriceChart/chart-marks.module.css",
    find: "stroke-dasharray: 6 3;",
    replace: "stroke-dasharray: 3 3;",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "three-dash-rhythms-and-they-differ",
  },

  {
    name: "second-readout-reservation",
    proves:
      "A third plot restating the readout reservation instead of composing it " +
      "puts one decision in two homes, and the invariant catches it.",
    file: "apps/frontend/src/components/PriceChart/PriceChart.module.css",
    find: ".plot {",
    replace: ".plot {\n  min-height: var(--chart-readout-height);",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-readout-reservation",
  },

  {
    name: "route-seeds-initiallycollapsed",
    proves:
      "A route seeding `initiallyCollapsed` reintroduces the collapse-by-" +
      "default Task 2.11.8 declined, and the invariant catches it.",
    file: "apps/frontend/src/routes/SecurityExplorer.tsx",
    find: 'import { useNavigate } from "react-router";',
    replace:
      'import { useNavigate } from "react-router";\n' +
      "\n" +
      "// pnpm break: reverted automatically\n" +
      "const initiallyCollapsed = true;\n" +
      "void initiallyCollapsed;",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "initiallycollapsed-stays-unused",
  },

  {
    name: "words-count-elapsed-time",
    proves:
      "A coverage clause recomputed from elapsed time instead of from the axis " +
      "reports a gap across a weekend the picture gives no width to, and the " +
      "invariant catches the derivation going away.",
    file: "apps/frontend/src/components/PriceChart/chart-alternative.ts",
    find: "  const position = positionOfInstant(axis, instant);",
    replace:
      "  const position = Math.round(\n" +
      "    (instant.getTime() - axis.from.getTime()) / 60_000,\n" +
      "  );",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-axis-behind-the-words-and-the-wash",
  },

  {
    name: "ceiling-spelled-twice",
    proves:
      "The cache TTL spelled as its own literal can drift from the max-age the " +
      "header states, and the invariant catches the derivation going away.",
    file: "apps/backend/src/series-cache.ts",
    find: "export const CLOSED_ANSWER_TTL_MS = CLOSED_ANSWER_SECONDS * 1_000;",
    replace: "export const CLOSED_ANSWER_TTL_MS = 300_000;",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "the-five-minute-ceiling-stays-derived",
  },

  {
    name: "empty-explanation-twice",
    proves:
      "The empty-window sentence restored to the panel while the plot also " +
      "draws it puts two visible copies inside one region — a Playwright " +
      "strict-mode failure in every browser spec on a store with no bars — and " +
      "the invariant catches the second home.",
    // The break is the change somebody would actually make: putting the
    // sentence back where it used to be, because the plot's copy is easy to
    // miss when reading the panel. That is the reason this check exists rather
    // than a synthetic edit chosen to trip a grep.
    file: "apps/frontend/src/components/BarSeriesPanel/BarSeriesPanel.tsx",
    find: '    case "empty":\n      return null;',
    replace:
      '    case "empty":\n' +
      "      return (\n" +
      "        <p>\n" +
      "          {/* pnpm break: reverted automatically */}\n" +
      "          No bars stored for this window.\n" +
      "        </p>\n" +
      "      );",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-empty-explanation",
  },

  {
    name: "volume-explanation-twice",
    proves:
      "The volume plot's empty sentence re-inlined in the spoken alternative " +
      "puts one fact in two vocabularies — and one of them is the copy no " +
      "sighted reader ever checks — and the invariant catches the second home.",
    // The break is the change somebody would actually make: making the spoken
    // sentence quote the drawn one, on the reasonable-sounding grounds that a
    // listener and a reader should be told the same thing. They should be told
    // the same *fact*; visible text is written to be scanned and an
    // announcement to be heard once, out of context.
    file: "apps/frontend/src/components/PriceChart/chart-alternative.ts",
    find:
      "        `No bars are stored anywhere in the window asked for, ` +\n" +
      "        `${formatMarketRange(view.series.coverage.requested)}, so the whole ` +\n" +
      "        `frame is empty ground.`\n" +
      "      );",
    replace: "        `No volume stored for this window.`\n" + "      );",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-empty-explanation",
  },

  {
    name: "no-history-sentence-twice",
    proves:
      "Case one's price headline re-inlined in the announcement is the drawn " +
      "sentence and the spoken sentence written twice — the drift a screen and " +
      "a screen reader can diverge through with nothing to notice — and the " +
      "invariant catches the second home.",
    // The break is the plausible one: hoisting the visible headline into the
    // live region so the two "cannot disagree". They cannot disagree *because*
    // one of them is derived and the other is written, and quoting a drawn
    // string in a spoken one is the arrangement that guarantees the opposite.
    file: "apps/frontend/src/components/BarSeriesPanel/series-announcement.ts",
    find: '            "no history is stored for this security at this timeframe. Changing the window will not help; the store is filled overnight."',
    replace: "            `No history stored for ${symbol} yet.`",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-empty-explanation",
  },

  {
    name: "no-volume-history-sentence-twice",
    proves:
      "Case one's volume headline re-inlined in the volume alternative is the " +
      "fourth of these sentences given a second home, and the invariant " +
      "catches it as surely as the first three.",
    // The break is the same motivation one plot across: the volume plot's
    // spoken sentence quoting its drawn one. It is written out separately
    // because four literals is four hazards — `PROVENANCE.md` §6.3 costed them
    // as four `pnpm break` entries and this is the fourth.
    file: "apps/frontend/src/components/PriceChart/chart-alternative.ts",
    find:
      "          `No volume history is stored for ${symbol} at this timeframe, so ` +\n" +
      "          `the whole frame is empty ground.`",
    replace: "          `No volume history stored for ${symbol} yet.`",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-empty-explanation",
  },

  {
    name: "coverage-sentence-twice",
    proves:
      "The coverage sentence re-inlined in the announcement while the rail " +
      "also draws it puts one fact in two vocabularies — the drift a screen " +
      "and a screen reader can diverge through with nothing to notice — and " +
      "the invariant catches the second home.",
    // The break is the change somebody would actually make: putting the
    // sentence back where it was assembled until Task 2.14.5, because reaching
    // into a component's `series-facts.ts` from the announcement looks like a
    // layering mistake until you know why it is one function.
    file: "apps/frontend/src/components/BarSeriesPanel/series-announcement.ts",
    find: "        coveragePhrase(view.series),",
    replace:
      "        `holding ${formatCount(view.series.bars.length)} bars, ` +\n" +
      "          `through ${String(view.series.coverage.covered.end)}, ` +\n" +
      "          `of a window running to ${String(view.series.coverage.requested.end)}.`,",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-coverage-phrase",
  },

  {
    name: "feed-words-in-a-renderer",
    proves:
      "A renderer writing its own words for a feed is a claim about US market " +
      "coverage that no vocabulary decided — `PRODUCT_SPEC.md` §7.1 and " +
      "invariant 6 — and the invariant catches the second spelling.",
    // The break is the plausible one rather than a synthetic edit: a fallback
    // label in the component that renders the chrome's feed indicator, for the
    // deployment where no provider is configured. It reads as defensive and it
    // is a coverage claim.
    file: "apps/frontend/src/components/FeedIndicator/FeedIndicator.tsx",
    find: "export function FeedIndicator({",
    replace:
      "// pnpm break: reverted automatically\n" +
      'const FALLBACK_FEED_LABEL = "All US exchanges";\n' +
      "void FALLBACK_FEED_LABEL;\n" +
      "\n" +
      "export function FeedIndicator({",
    command: ["node", "scripts/check-invariants.mjs"],
    expect: "one-home-for-the-feed-words",
  },
];
