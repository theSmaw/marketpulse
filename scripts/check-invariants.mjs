// The claims that used to be prose. This is the check that says they hold.
//
// It was seven when it was written and is ten now — the count is in the
// output rather than in this sentence, because a number in a comment beside
// a list is a second spelling of `INVARIANTS.length`.
//
// ## Why this exists
//
// `CLAUDE.md` keeps a list called *What `pnpm verify` does not cover*: claims
// that are true today and checked by nothing, each with a `Re-measure:`
// one-liner a reader is meant to run by hand. That list is 64 entries long, and
// the file itself states the migration it wants:
//
// > a prose entry with a re-measure command is a check nobody runs, and a
// > `verify` step is one that cannot be skipped.
//
// **The list had already started to rot when this was written (2026-09-14).**
// The five-minute-ceiling entry said to run
// `grep -n "CLOSED_ANSWER" apps/backend/src/http-cache.ts`. That returns
// nothing — the constants moved to `series-cache.ts` — and a re-measure that no
// longer resolves is indistinguishable from one that passes, because nobody
// runs either. It is check 7 below for exactly that reason.
//
// Seven entries were a single grep over checked-in files. They are these, plus
// everything later stories have added the same way — Story 2.14's string pass
// added two (`PROVENANCE.md` §11), which is `CLAUDE.md`'s rule doing its job:
// an entry that can be made mechanical should be.
//
// ## What this proves
//
// That a set of specific, named properties of the tree hold right now. Each is
// a *shape* — a string present, a string absent, a count — and each replaces a
// gap-list entry that is deleted in the same change.
//
// ## What it does NOT prove, and must not be described as proving
//
//   1. **That the property it names is the property that matters.** Check 2
//      asserts there is no `@media` in `PriceChart.module.css`; what it is
//      *for* is that the density breakpoint has one home. A second copy spelled
//      some other way passes here. These are the cheapest honest proxy for a
//      claim, not the claim.
//   2. **That the other 57 gap-list entries hold.** They stayed prose because
//      they need a browser, a live store, a human performing a break, or a
//      judgement. `docs/GAPS.md` is still the list; this is the part of it that
//      became mechanical.
//   3. **Anything about behaviour.** Nothing here runs the application.
//
// ## The rule every check here obeys
//
// **A "must find nothing" assertion needs an anchor, or it passes vacuously
// the day its target moves** — which is precisely how check 7's prose version
// rotted. So every check asserts its subject *exists and is non-empty* before
// asserting anything about the contents, and reports a missing subject as a
// failure rather than as a pass. This is `check-stories.mjs`'s empty-set guard,
// applied seven times.
//
// ## Where it runs
//
// In `pnpm verify`, **after `pnpm run build`**, because check 1 reads
// `apps/frontend/dist/`. A run against a stale or absent `dist/` is caught by
// that check's own anchor rather than passing quietly.
//
// Dependency-free, like every script in this directory.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");

const BUNDLE_DIR = resolve(REPO_ROOT, "apps/frontend/dist/assets");
const CHART_DIR = resolve(REPO_ROOT, "apps/frontend/src/components/PriceChart");

/**
 * Read a file that must be there.
 *
 * Returns its text, or throws an {@link InvariantFailure} naming the path. A
 * check whose subject has moved must go red: a missing file is the failure
 * mode this whole script exists to catch, not an excuse to skip a check.
 */
function readAnchored(path) {
  let text;

  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new InvariantFailure(
      `${relative(REPO_ROOT, path)} is not there — has it moved?`,
    );
  }

  if (text.trim() === "") {
    throw new InvariantFailure(`${relative(REPO_ROOT, path)} is empty.`);
  }

  return text;
}

/** A check that did not hold. Carries the sentence a reader sees. */
class InvariantFailure extends Error {}

/** Every `.js` file the frontend bundle ships, as one string per file. */
function bundleFiles() {
  let entries;

  try {
    entries = readdirSync(BUNDLE_DIR).filter((name) => name.endsWith(".js"));
  } catch {
    throw new InvariantFailure(
      `${relative(REPO_ROOT, BUNDLE_DIR)} is not there. This check reads the ` +
        "BUILT frontend, so it must run after `pnpm run build`.",
    );
  }

  if (entries.length === 0) {
    throw new InvariantFailure(
      `${relative(REPO_ROOT, BUNDLE_DIR)} holds no .js files — the bundle did ` +
        "not build, and 'the fixtures are absent' would pass vacuously.",
    );
  }

  return entries.map((name) => {
    const path = resolve(BUNDLE_DIR, name);
    const text = readFileSync(path, "utf8");

    if (statSync(path).size === 0) {
      throw new InvariantFailure(`${name} is a zero-byte bundle file.`);
    }

    return { name, text };
  });
}

/**
 * Every `.ts`, `.tsx` and `.css` file under a directory, recursively.
 *
 * Used by the checks that assert a string appears in exactly one place, where
 * the interesting failure is a *second* home somebody added.
 */
function sourceFilesUnder(directory) {
  const found = [];

  const walk = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = resolve(path, entry.name);

      if (entry.isDirectory()) {
        walk(child);
      } else if (/\.(?:tsx?|css)$/u.test(entry.name)) {
        found.push({ path: child, text: readFileSync(child, "utf8") });
      }
    }
  };

  walk(directory);

  if (found.length === 0) {
    throw new InvariantFailure(
      `No source files under ${relative(REPO_ROOT, directory)} — has it moved?`,
    );
  }

  return found;
}

/**
 * **Every shipped source file in the workspace, comments removed** — the
 * corpus for *where is this sentence written* (Task 4.2.7).
 *
 * Three trees, tests and stories excluded, read through {@link withoutComments}
 * because this repository writes more prose than code and a check a comment can
 * trip is a check nobody can keep green.
 *
 * **It exists because a hard-coded file list is a check that cannot see the
 * file the claim is about.** `one-home-for-the-feed-words` walked the trees
 * from the day it was written; `the-consolidated-word-has-one-producer` and
 * `the-market-claiming-sentence-has-one-home` each carried a hand-written
 * array of the files that happened to discuss their literal at the time, so a
 * component added afterwards was outside both — and both stayed green while
 * spelling the words. Task 4.2.7 proved that with a defect before repairing
 * it. One corpus, one place, and a new file is in it by existing.
 */
function shippedSourceFiles() {
  return [
    resolve(REPO_ROOT, "apps/frontend/src"),
    resolve(REPO_ROOT, "apps/backend/src"),
    resolve(REPO_ROOT, "packages/shared/src"),
  ].flatMap((directory) =>
    sourceFilesUnder(directory)
      .filter(({ path }) => !/\.(?:test|stories)\.tsx?$/u.test(path))
      .map(({ path, text }) => ({ path, text: withoutComments(text) })),
  );
}

/**
 * The seven recorded market bodies, by a string distinctive to each.
 *
 * These are the *names* `CLAUDE.md`'s entry gives, kept as names rather than
 * collapsed into one pattern, because the point of the list is that each body
 * is separately identifiable in a failure message. `holiday-week` is the
 * largest at 357 kB; `securities/` is the whole recorded universe.
 */
/**
 * A source file with its **whole-line** comments removed.
 *
 * For the checks that ask *where is this sentence written*, and it exists
 * because this repository writes more prose than code: six shipped files
 * discuss the feed vocabulary and the coverage sentence at length in comments,
 * and a check a comment can trip is a check nobody can keep green. The first
 * version of `one-home-for-the-coverage-phrase` went red on a doc comment
 * quoting the sentence it guards, which is the check being wrong rather than
 * the tree.
 *
 * **It strips block comments and lines that are only a comment, and nothing
 * else** — never a trailing `//` after code. That asymmetry is deliberate and
 * is the safe direction: a stripper that cut a line short could *hide* a real
 * second copy, and a missed copy looks exactly like a pass. Leaving code lines
 * whole means the worst this can do is report a match that a reader then reads
 * for themselves.
 *
 * Every caller pairs it with an anchor — the literal must still be **found** in
 * its one expected home — so over-stripping is loud rather than silent.
 */
function withoutComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/^[ \t]*\/\/.*$/gmu, "");
}

/**
 * A **trailing** `//` comment removed as well — for the checks that read text
 * and would otherwise be exempted by a comment.
 *
 * `withoutComments` deliberately leaves these, and its own note argues the
 * asymmetry is the safe direction because *the worst it can do is report a
 * match*. That judgement **inverts** the moment a check treats the presence of
 * a token as a PASS: `return { percent: null }; // cf. changeFromClose(a, b)`
 * is then an exemption written in a comment. Task 4.2.1 hit the same asymmetry
 * from the other side, in front of a brace matcher, and solved it with a local
 * stripper; this is that stripper, promoted to a second consumer rather than
 * copied.
 *
 * **`https://` is not a comment**, so the `//` must not be preceded by a `:`.
 * A stripper that cuts a line at a URL inside a string would hide a real match,
 * which is the direction that costs something.
 */
function withoutTrailingComments(text) {
  return withoutComments(text).replace(/(^|[^:])\/\/[^\n]*/gu, "$1");
}

const RECORDED_BODIES = [
  { fixture: "bar-series/default", pattern: /2026-09-04T13:3[0-9]/u },
  { fixture: "securities/universe", pattern: /Agilent Technologies/u },
  { fixture: "bar-series/dense", pattern: /2026-08-31T13:3[0-9]/u },
  { fixture: "bar-series/uncovered", pattern: /2026-09-03T13:3[0-9]/u },
  { fixture: "bar-series/holiday-week", pattern: /2026-11-27T18:5[0-9]/u },
  { fixture: "bar-series/daily", pattern: /2026-06-12T04:00/u },
  { fixture: "bar-series/daily-year", pattern: /2025-09-11T04:00/u },
];

const INVARIANTS = [
  {
    id: "the-workspace-package-reaches-the-bundle",
    claim:
      "The frontend bundle contains a value that can only have come from " +
      "`@marketpulse/shared`, so the workspace dependency resolves through " +
      "the bundler and not only through `tsc`.",
    check() {
      // **This replaces a component — 2026-09-25, Task 4.1.4.**
      //
      // Story 1.4's render check sat on the landing route for five epics, and
      // the route file said in its own comment that the `@marketpulse/shared`
      // import in it was *the only thing proving the workspace dependency
      // resolves through the bundler as well as through `tsc`, and the two use
      // entirely different resolvers*. That sentence was the reason nobody
      // deleted a component gallery from the product's landing page.
      //
      // **Two things were wrong with it, and only the second matters.** It had
      // stopped being the *only* proof somewhere around Epic 2 — 27 files in
      // this application now carry a value import from that package. But
      // nothing ever **asserted** any of it, which is the half that counts: a
      // proof that depends on somebody keeping a demo alive is a claim, not a
      // mechanism.
      //
      // **The anchor is the live feed's own sentence**, and it is chosen
      // rather than convenient: `MARKET_FEED_DESCRIPTIONS` in
      // `packages/shared/src/market-provenance.ts` is its one home, and
      // `one-home-for-the-feed-words` below is what keeps it one — the name
      // matters, because `feed-words-in-a-renderer` is the BREAK that proves
      // that invariant rather than the invariant itself, and Task 4.1.5 found
      // this comment naming the wrong one. So a bundle
      // containing that sentence contains it **because shared was bundled** —
      // there is no second way for it to get there, which is the property an
      // anchor needs and a component never had.
      //
      // It is also a string this product would notice losing for its own
      // sake: it is the sentence that stops `IEX` implying every US exchange,
      // which is `CLAUDE.md`'s invariant 6 and `PRODUCT_SPEC.md` §7.1.
      //
      // What it does not prove is the same as what the render check did not
      // prove: that every export resolves, or that the types agree. It proves
      // the package is in the graph.
      const anchor =
        "Trades reported by the IEX exchange only \u2014 not the full US " +
        "consolidated tape.";
      const files = bundleFiles();

      if (!files.some((file) => file.text.includes(anchor))) {
        throw new InvariantFailure(
          "The live feed's honest sentence is not in the frontend bundle. " +
            "It is spelled once, in `packages/shared/src/market-provenance.ts`, " +
            "so either the workspace package stopped reaching the bundler — " +
            "which `tsc` cannot see, because it resolves through an entirely " +
            "different mechanism — or the sentence that stops `IEX` implying " +
            "every US exchange has been edited, which is `CLAUDE.md`'s " +
            "invariant 6 and a larger problem wearing the same symptom.",
        );
      }
    },
  },

  {
    id: "no-fixture-reaches-the-bundle",
    claim: "No recorded market body reaches the shipped frontend bundle.",
    check() {
      const files = bundleFiles();
      const leaked = [];

      for (const { fixture, pattern } of RECORDED_BODIES) {
        for (const file of files) {
          if (pattern.test(file.text)) {
            leaked.push(`${fixture} is in assets/${file.name}`);
          }
        }
      }

      if (leaked.length > 0) {
        throw new InvariantFailure(
          `A recorded market body is being served to every visitor:\n      ` +
            leaked.join("\n      "),
        );
      }
    },
  },

  {
    id: "one-home-for-the-density-breakpoint",
    claim:
      "The chart's density breakpoints are spelled once, in chart-density.ts.",
    check() {
      const path = resolve(CHART_DIR, "PriceChart.module.css");
      const text = readAnchored(path);

      if (text.includes("@media")) {
        throw new InvariantFailure(
          "PriceChart.module.css has a @media query. The density boundary " +
            "lives in market/chart-density.ts and the stylesheet keys on the " +
            "class it produces — a media query here is a second copy of a " +
            "number nothing compares.",
        );
      }
    },
  },

  {
    id: "three-dash-rhythms-and-they-differ",
    claim:
      "The session seam, the coverage edge and the reference rule are three " +
      "distinct rhythms, two of them in the shared stylesheet.",
    check() {
      const declarations = [];

      for (const name of ["PriceChart.module.css", "chart-marks.module.css"]) {
        const text = readAnchored(resolve(CHART_DIR, name));

        for (const match of text.matchAll(/stroke-dasharray:\s*([^;]+);/gu)) {
          declarations.push({ file: name, rhythm: match[1].trim() });
        }
      }

      if (declarations.length !== 3) {
        throw new InvariantFailure(
          `Expected 3 stroke-dasharray declarations, found ` +
            `${String(declarations.length)}: ` +
            declarations.map((d) => `${d.rhythm} (${d.file})`).join(", ") +
            ". A fourth is the duplication this check is about.",
        );
      }

      const shared = declarations.filter(
        (d) => d.file === "chart-marks.module.css",
      );

      if (shared.length !== 2) {
        throw new InvariantFailure(
          "The seam and the coverage edge have two consumers each and belong " +
            "in chart-marks.module.css; the reference rule has one and " +
            `belongs beside it. Found ${String(shared.length)} in the shared ` +
            "stylesheet rather than 2.",
        );
      }

      const rhythms = new Set(declarations.map((d) => d.rhythm));

      if (rhythms.size !== 3) {
        throw new InvariantFailure(
          "Two of the three dash rhythms are identical: " +
            declarations.map((d) => d.rhythm).join(" / ") +
            ". The coverage edge is legible only because it differs from the " +
            "seam it coincides with on most answers.",
        );
      }
    },
  },

  {
    id: "one-home-for-the-readout-reservation",
    claim: "Both readout strips reserve their height from one stylesheet.",
    check() {
      const needle = "min-height: var(--chart-readout-height)";
      const homes = sourceFilesUnder(resolve(REPO_ROOT, "apps/frontend/src"))
        .filter((file) => file.text.includes(needle))
        .map((file) => relative(REPO_ROOT, file.path));

      if (homes.length === 0) {
        throw new InvariantFailure(
          `Nothing declares \`${needle}\`. The reservation is what stops a ` +
            "page jumping under the hand of somebody reading a number.",
        );
      }

      const expected = "chart-readout.module.css";

      if (homes.length !== 1 || !homes[0].endsWith(expected)) {
        throw new InvariantFailure(
          `\`${needle}\` should live only in ${expected}, and is in:\n      ` +
            homes.join("\n      ") +
            "\n      A third plot must compose that stylesheet rather than " +
            "restate it.",
        );
      }
    },
  },

  {
    id: "initiallycollapsed-stays-unused",
    claim: "`initiallyCollapsed` is honest API that no route seeds.",
    check() {
      const needle = "initiallyCollapsed";
      const users = sourceFilesUnder(resolve(REPO_ROOT, "apps/frontend/src"))
        .filter((file) => file.text.includes(needle))
        .map((file) => relative(REPO_ROOT, file.path));

      if (users.length === 0) {
        throw new InvariantFailure(
          `\`${needle}\` is gone. This check guards a prop that exists and is ` +
            "deliberately unused; if it was removed on purpose, remove this " +
            "check in the same change.",
        );
      }

      const inRoutes = users.filter((path) =>
        path.startsWith("apps/frontend/src/routes/"),
      );

      if (inRoutes.length > 0) {
        throw new InvariantFailure(
          `A route seeds \`${needle}\`:\n      ` +
            inRoutes.join("\n      ") +
            "\n      That reintroduces the collapse-by-default Task 2.11.8 " +
            "declined, and nothing else would go red.",
        );
      }
    },
  },

  {
    id: "one-axis-behind-the-words-and-the-wash",
    claim:
      "The chart's text alternative and its uncovered wash count the same axis.",
    check() {
      const required = ["timeAxis", "positionOfInstant"];
      const missing = [];

      for (const name of ["chart-alternative.ts", "chart-geometry.ts"]) {
        const text = readAnchored(resolve(CHART_DIR, name));

        for (const symbol of required) {
          // A CALL, not a mention. Both of these files discuss both functions
          // at length in prose, so `includes(symbol)` would be satisfied by the
          // comments alone — and a check a comment can satisfy is not a check.
          const called = new RegExp(String.raw`\b${symbol}\(`, "u").test(text);

          if (!called) missing.push(`${symbol}() is never called in ${name}`);
        }
      }

      if (missing.length > 0) {
        throw new InvariantFailure(
          `Both files must derive from both functions. Missing:\n      ` +
            missing.join("\n      ") +
            "\n      A clause recomputed from elapsed time reports a gap " +
            "across a weekend the axis draws no width for, and the words then " +
            "disagree with the picture about a fact neither can check.",
        );
      }
    },
  },

  {
    id: "the-five-minute-ceiling-stays-derived",
    claim:
      "The cache's TTL is derived from the header's max-age rather than " +
      "spelled a second time.",
    check() {
      const path = resolve(REPO_ROOT, "apps/backend/src/series-cache.ts");
      const text = readAnchored(path);

      if (!/CLOSED_ANSWER_SECONDS\s*=\s*300\b/u.test(text)) {
        throw new InvariantFailure(
          "CLOSED_ANSWER_SECONDS is not 300 in series-cache.ts. If the " +
            "ceiling moved, move it here too — this check is the only thing " +
            "holding the two spellings together.",
        );
      }

      if (
        !/CLOSED_ANSWER_TTL_MS\s*=\s*CLOSED_ANSWER_SECONDS\s*\*\s*1_?000/u.test(
          text,
        )
      ) {
        throw new InvariantFailure(
          "CLOSED_ANSWER_TTL_MS is no longer derived from " +
            "CLOSED_ANSWER_SECONDS. Five minutes is the ceiling on how long " +
            "anything here serves an invalidated body, and it is spelled " +
            "twice — in the Cache-Control header and in the cache. Derivation " +
            "is what keeps them equal.",
        );
      }
    },
  },

  {
    id: "one-home-for-the-empty-explanation",
    claim:
      "Each of the four sentences explaining an empty plot is written in " +
      "exactly one source file.",
    check() {
      // The sentence moved out of `BarSeriesPanel` and into the plot on
      // 2026-09-14 (`VOLUME-AND-WINDOW.md` §78). **Moved, not copied**, and the
      // difference is not tidiness: `e2e/support/app.ts`'s `readable()` does not
      // filter `aria-hidden`, and two of the specs that locate a settled answer
      // by this phrase build their locator without `.first()`. A second copy
      // inside the Price region is a Playwright strict-mode failure — on CI, in
      // every spec, because CI's store holds 518 securities and zero bars so
      // every chart there is a correct `empty`.
      //
      // That is a six-minute round trip to discover and a grep to prevent.
      //
      // **Anchored on literals that must be FOUND**, not on ones that must be
      // absent: a check whose passing condition is "no matches" passes just as
      // happily when the string it looks for has been renamed, which is how one
      // of the original seven invariants rotted. If a sentence is reworded, this
      // check goes red and names its new home rather than going quiet.
      //
      // ## Four rather than one, since Task 2.14.6
      //
      // `PROVENANCE.md` §6 tells the two empty answers apart — *we hold nothing
      // for this security* and *we hold nothing in this window* — and there are
      // two plots under one axis, each naming its own subject. So the product
      // has four of these sentences, all four are located by the browser suite
      // or could be, and all four carry the same duplication hazard.
      //
      // **Two of them interpolate the symbol**, because naming the security is
      // the whole encoding of case one, so each is anchored on the longest
      // fragment a grep can see — and the two fragments are deliberately
      // distinct from each other. `No volume stored for ` would have been a
      // prefix of the window sentence, so the check could not have told the two
      // homes apart and would have stayed green with the sentence deleted.
      //
      // **Read through `withoutComments`**, for the reason
      // `one-home-for-the-coverage-phrase` learned first: these sentences are
      // quoted in prose in more than one file — `chart-alternative.ts` and
      // `series-announcement.ts` both explain why their own wording differs —
      // and a check a correct doc comment can trip is a check nobody can keep
      // green.
      const SENTENCES = [
        "No bars stored for this window.",
        "No volume stored for this window.",
        "No history stored for ",
        "No volume history stored for ",
      ];

      const expected =
        "apps/frontend/src/components/PriceChart/ChartVacancy.tsx";

      const files = sourceFilesUnder(resolve(REPO_ROOT, "apps/frontend/src"))
        .filter(({ path }) => !/\.(?:test|stories)\.tsx?$/u.test(path))
        .map(({ path, text }) => ({ path, text: withoutComments(text) }));

      for (const sentence of SENTENCES) {
        const homes = files
          .filter(({ text }) => text.includes(sentence))
          .map(({ path }) => relative(REPO_ROOT, path));

        if (homes.length === 0) {
          throw new InvariantFailure(
            `No source file contains ${JSON.stringify(sentence)}. Either the ` +
              "sentence was reworded — in which case reword it here too, and " +
              "check the browser specs that match on it — or one of the two " +
              "empty answers stopped explaining itself, which is the defect " +
              "this guards.",
          );
        }

        if (homes.length > 1 || homes[0] !== expected) {
          throw new InvariantFailure(
            `${JSON.stringify(sentence)} should be written only in ` +
              `${expected}, and is in:\n      ` +
              homes.join("\n      ") +
              "\n      Two visible copies inside one region is a Playwright " +
              "strict-mode failure in every browser spec that locates a " +
              "settled answer by this phrase, and CI's store makes every " +
              "chart there an `empty`.",
          );
        }
      }
    },
  },

  {
    id: "one-home-for-the-coverage-phrase",
    claim:
      "The sentence saying how far a short answer reaches is written in one " +
      "source file, and nothing draws a second copy of it.",
    check() {
      // **The drift this prevents is the one Story 2.14 spends most of its
      // time on**, and it is invisible to every other instrument here: a
      // visible sentence and a spoken sentence about the same fact, written
      // separately, that agree on the day they are written and diverge on the
      // day one of them is reworded. Nothing renders both at once, no test that
      // reads one reads the other, and a reader who can see the screen never
      // hears the other copy.
      //
      // `PROVENANCE.md` §3.2 settled it as **one function, two readers**. This
      // is that arrangement as a grep.
      //
      // **There is one reader since 2026-09-16** — the drawn sentence came off
      // the rail and only the announcement's clause remains (§3.2's amendment)
      // — and the check is unchanged and still earns its place, for two
      // reasons that are easy to miss. It still catches somebody re-inlining
      // the phrase in the announcement, which is the edit `pnpm break
      // coverage-sentence-twice` performs and the one that looks like tidying
      // up a layering mistake. And its `homes.length === 0` branch is now the
      // *more* interesting half: with no drawn copy, the spoken clause is the
      // only thing telling a listener a short answer is short, and deleting it
      // would leave nothing on any channel.
      //
      // **Anchored on a literal that must be FOUND.** A "no second copy"
      // assertion passes just as happily when the phrase has been renamed,
      // which is how one of the original seven rotted.
      //
      // Read through `withoutComments`, because `chart-alternative.ts` quotes
      // this exact sentence in prose to explain why *its* coverage clause says
      // something different — which is the rule being honoured, not broken.
      const PHRASE = "of a window running to";

      const homes = sourceFilesUnder(
        resolve(REPO_ROOT, "apps/frontend/src"),
      ).filter(
        ({ path, text }) =>
          !/\.(?:test|stories)\.tsx?$/u.test(path) &&
          withoutComments(text).includes(PHRASE),
      );

      const expected =
        "apps/frontend/src/components/BarSeriesPanel/series-facts.ts";

      if (homes.length === 0) {
        throw new InvariantFailure(
          `No source file contains ${JSON.stringify(PHRASE)}. Either the ` +
            "coverage sentence was reworded — in which case reword it here " +
            "too — or a partial answer stopped saying how far it reaches, " +
            "which is the only fact about a short answer the session-ordinal " +
            "axis cannot carry.",
        );
      }

      const paths = homes.map(({ path }) => relative(REPO_ROOT, path));

      if (paths.length !== 1 || paths[0] !== expected) {
        throw new InvariantFailure(
          `The coverage sentence should be written only in ${expected}, and ` +
            `is in:\n      ` +
            paths.join("\n      ") +
            "\n      A second copy is two vocabularies for one fact: the " +
            "rail and the announcement must read one function, or the screen " +
            "and the screen reader can come to disagree with nothing to " +
            "notice.",
        );
      }
    },
  },

  {
    id: "one-apostrophe-in-the-product-voice",
    claim:
      "Every apostrophe a reader sees is the typographic one, so two " +
      "sentences on one screen are not set in two typefaces' worth of " +
      "punctuation.",
    check() {
      // **Found by looking at the screen, and invisible from anywhere else**
      // (Task 2.14.7). With the backend unreachable, `/securities/NVDA` drew
      // *Nothing answered at the service’s address* four inches under *How
      // unusual this security's behaviour is right now* — one curly, one
      // straight, in the same size and colour. The same sentence existed twice
      // in the tree, once each way: `BackendIndicator`'s *the service's
      // address* against `UniverseTable`'s *the service’s address*.
      //
      // Nothing mechanical could see it. It typechecks, it lints, it renders,
      // and every assertion about it matched whichever glyph the spec was
      // written with. This product already sets curly double quotes (search's
      // *No security matches “NVDA”*), em dashes and a real ellipsis, so the
      // house style was settled and only the apostrophes had escaped it.
      //
      // **Scoped to what renders.** `.tsx` under `components/` and `routes/`,
      // which is every file that returns markup — **stories included**, which
      // is the one place this check departs from the others of its shape. The
      // workshop is where a person reviews the language side by side, and nine
      // of the fourteen straight apostrophes in the tree were in story captions
      // and in copy the stories quote from the product. Excluding them would
      // have left the grid a reviewer reads set in both.
      //
      // Deliberately not `.ts`: the one straight apostrophe left is in
      // `market/bar-series-view.ts`'s `console.error`, which is written for a
      // developer reading a devtools panel and is not the product's voice.
      // Curated company names — *Domino's Pizza Inc* — are backend data and
      // are outside this directory entirely, which is the right side of the
      // line: they are what a vendor calls itself, not something we wrote.
      const RENDERERS = [
        resolve(REPO_ROOT, "apps/frontend/src/components"),
        resolve(REPO_ROOT, "apps/frontend/src/routes"),
      ];

      const offenders = RENDERERS.flatMap((directory) =>
        sourceFilesUnder(directory)
          .filter(({ path }) => /\.tsx$/u.test(path))
          .filter(({ path }) => !/\.test\.tsx$/u.test(path))
          .flatMap(({ path, text }) =>
            [
              ...withoutComments(text).matchAll(
                /"([^"\\\n]*[a-z]'[a-z][^"\\\n]*)"/gu,
              ),
            ].map((match) => `${relative(REPO_ROOT, path)}: ${match[1]}`),
          ),
      );

      if (offenders.length > 0) {
        throw new InvariantFailure(
          `A straight apostrophe in a rendered string:\n      ` +
            offenders.join("\n      ") +
            "\n      This product sets ’, and a screen that mixes the two " +
            "reads as two documents pasted together. Only a person looking " +
            "at the page can see it, which is why it is a check.",
        );
      }
    },
  },
  {
    id: "search-and-the-universe-share-no-words",
    claim:
      "Search and the tracked universe describe one failure on one screen, " +
      "and no clause of either appears in the other.",
    check() {
      // **The rule was written in 2026-09-11 and broken in the same file**
      // (`SecuritySearch.tsx`'s `hintFor` header; the breaches are recorded
      // there). Task 2.14.7 found both by producing the state and reading the
      // screen, and this check exists because neither was reachable any other
      // way: a browser locator sees *one* node for a clause that sits inside a
      // longer sentence, and sees two different strings where one says *a
      // service starting up* and the other *a service that is starting up*.
      //
      // Search and the table render from **one fetch**, so every failure of it
      // puts both surfaces on screen at the same moment, inches apart. The rule
      // this enforces is `PROVENANCE.md` §12's, and it is narrower than *say it
      // once*: the **cause** belongs to the surface that owns the data, and the
      // **prospect** is owed by both — search's hint is the input's
      // `aria-describedby` and has to stand alone for a listener who never
      // reaches the table. What neither may do is say it in the other's words.
      //
      // **Four words, measured across both trees rather than argued.** The
      // first version of this check used six, from reasoning rather than
      // measurement, and went green on the tree it was written to catch —
      // `CLAUDE.md`'s *a tolerance is measured, never argued*, and *a break
      // that does not go red is not evidence the check works*, both arriving
      // in one afternoon. What the measurement says, over the historical tree
      // and the repaired one:
      //
      //   6 — neither breach fires. `starting up looks exactly like this` is
      //       six words but the two copies differ by *that is*, so no window
      //       of six is shared.
      //   5 — only `would produce the same answer` fires.
      //   4 — both breaches fire, and the repaired tree is clean.
      //   3 — `holds no securities` fires, and that is two surfaces sharing a
      //       vocabulary rather than a sentence.
      //
      // So four is the only window that fails the real duplication and passes
      // the real tree, and the two neighbours are recorded so the next person
      // to reach for this number can see what is either side of it.
      const WINDOW = 4;

      // **A headline names the failure and both surfaces must; a cause or a
      // prospect explains it and only one may.** That distinction is the whole
      // of the rule, and the cheapest honest way to draw it turns out to be a
      // length: the table's four headlines are 33–48 characters (*The tracked
      // universe could not be read.*) and its causes and prospects are 60–115.
      // Search legitimately repeats a headline — a reader told search is
      // unavailable is owed the name of the thing that is — and may not repeat
      // the explanation or the prospect, because the table owns the fetch and
      // the control.
      //
      // The cut is stated rather than tuned: if a fifth failure arrives with a
      // 60-character headline this check goes red on correct copy, and the
      // repair then is to name the two halves in the source rather than to
      // raise the number.
      const SEARCH = {
        path: "apps/frontend/src/components/SecuritySearch/SecuritySearch.tsx",
        shortest: 24,
      };

      const UNIVERSE = {
        path: "apps/frontend/src/components/UniverseTable/UniverseTable.tsx",
        shortest: 55,
      };

      // Whole sentences only, and from **string literals** rather than from the
      // file: JSX text and identifiers would put `securities tracked` and every
      // sector name into the comparison, which is two surfaces sharing a
      // vocabulary rather than sharing a sentence.
      const clausesIn = ({ path, shortest }) => {
        const text = withoutComments(readAnchored(path));
        // **Single-line literals only.** A `[^"]` class matches a newline, so
        // the first version of this matched from one string's opening quote to
        // another's, swallowed forty lines of JSX between them and reported
        // `view securitiesview string switch view state` as a shared clause —
        // a check that goes red on two files that merely both switch on a union.
        const literals = [...text.matchAll(/"([^"\\\n]+)"/gu)]
          .filter((match) => match[1].length >= shortest)
          .map((match) => match[1])
          .filter(
            (literal) => / [a-z]/u.test(literal) && !/[<>{}]/u.test(literal),
          );

        const windows = new Map();

        for (const literal of literals) {
          const words = literal
            .toLowerCase()
            .replace(/[^a-z0-9 ]/gu, " ")
            .split(/\s+/u)
            .filter(Boolean);

          for (let at = 0; at + WINDOW <= words.length; at += 1)
            windows.set(words.slice(at, at + WINDOW).join(" "), literal);
        }

        return windows;
      };

      const search = clausesIn(SEARCH);
      const universe = clausesIn(UNIVERSE);

      const shared = [...search.keys()].filter((phrase) =>
        universe.has(phrase),
      );

      if (shared.length > 0) {
        throw new InvariantFailure(
          `Search and the tracked universe both write:\n      ` +
            shared
              .map(
                (phrase) =>
                  `${JSON.stringify(phrase)}\n        search:   ${JSON.stringify(search.get(phrase))}\n        universe: ${JSON.stringify(universe.get(phrase))}`,
              )
              .join("\n      ") +
            "\n      One fetch feeds both, so both are on screen for one " +
            "failure, inches apart. Both are entitled to say whether waiting " +
            "helps — search's hint is the input's description and has to " +
            "stand alone for a listener who never reaches the table — but " +
            "neither may say it in the other's words. See PROVENANCE.md §12.",
        );
      }
    },
  },
  {
    id: "every-spec-named-in-the-suite-exists",
    claim:
      "A browser spec named in the suite's own prose or comments is a file " +
      "that exists.",
    check() {
      // **A rename breaks this graph silently, and it did** (Task 3.3.6). The
      // e2e package cross-references itself heavily — one spec explaining what
      // another owns is how `e2e/README.md`'s "one failure, one surface" rule
      // stays legible — and **31 distinct spec filenames** are named across it
      // with nothing resolving any of them. Renaming
      // `market-feed-degrades.spec.ts` to `market-connection.spec.ts` left a
      // comment pointing at a file that no longer existed, and every check in
      // this repository stayed green.
      //
      // `pnpm links` is the precedent and deliberately not the answer: it
      // resolves relative **Markdown links**, and these are backticked
      // filenames in TypeScript comments.
      //
      // **Scoped to `e2e/` on purpose.** A task file under `planning/` records
      // what was true when it was written, and `CLAUDE.md` is explicit that
      // correcting those destroys the record — so a check that forced a rename
      // through history would be worse than the defect. This directory is code
      // and its own README: both describe the tree as it is now.
      const SPEC_DIRECTORIES = ["e2e/specs", "e2e/specs-deployed"];

      const shipped = new Set(
        SPEC_DIRECTORIES.flatMap((directory) =>
          readdirSync(resolve(REPO_ROOT, directory)).filter((name) =>
            name.endsWith(".spec.ts"),
          ),
        ),
      );

      if (shipped.size === 0) {
        throw new InvariantFailure(
          `No specs under ${SPEC_DIRECTORIES.join(" or ")} — have they moved? ` +
            "A check that finds nothing to check looks exactly like one that " +
            "passes.",
        );
      }

      const named = [];

      const walk = (path) => {
        for (const entry of readdirSync(path, { withFileTypes: true })) {
          const child = resolve(path, entry.name);
          if (entry.name === "test-results" || entry.name === "node_modules") {
            continue;
          }
          if (entry.isDirectory()) {
            walk(child);
            continue;
          }
          if (!/\.(?:tsx?|md)$/u.test(entry.name)) continue;

          const text = readFileSync(child, "utf8");
          for (const [, name] of text.matchAll(
            /`(?:[a-z0-9-]+\/)?([a-z0-9-]+\.spec\.ts)`/gu,
          )) {
            named.push({ name, in: relative(REPO_ROOT, child) });
          }
        }
      };

      walk(resolve(REPO_ROOT, "e2e"));

      const missing = named.filter(({ name }) => !shipped.has(name));

      if (missing.length > 0) {
        throw new InvariantFailure(
          "Named in the suite and not on disk:\n      " +
            missing
              .map(({ name, in: where }) => `${name} — named in ${where}`)
              .join("\n      ") +
            "\n      A spec that explains what another one owns is how this " +
            "suite stays legible, and a rename that leaves the reference " +
            "behind is invisible to every other check here.",
        );
      }
    },
  },
  {
    id: "one-home-for-the-socket",
    claim:
      "One module in the frontend opens the market socket and knows its " +
      "address; nothing else in the application does either.",
    check() {
      // **`api-client.ts` is the only file that calls `fetch`, and a socket is
      // a second network boundary** (Task 3.3.4). The rule is the same and so
      // is the reason: a second place that knows the address is a second place
      // that can be pointed at the wrong one, and a second place that opens a
      // socket is a connection nothing above it is holding state for.
      //
      // Two literals, because there are two ways to break it — spelling the
      // address, and constructing the socket.
      const TRANSPORT = "apps/frontend/src/market/market-stream-client.ts";

      const LITERALS = ["MARKET_STREAM_PATH", "new WebSocket("];

      // **Through `withoutComments`, for the reason the feed words are**: this
      // repository discusses its own seams at length in prose, and a check a
      // doc comment can trip is a check nobody can keep green.
      const shipped = sourceFilesUnder(resolve(REPO_ROOT, "apps/frontend/src"))
        .filter(({ path }) => !/\.(?:test|stories)\.tsx?$/u.test(path))
        .map(({ path, text }) => ({ path, text: withoutComments(text) }));

      for (const literal of LITERALS) {
        const homes = shipped
          .filter(({ text }) => text.includes(literal))
          .map(({ path }) => relative(REPO_ROOT, path));

        if (homes.length === 0) {
          throw new InvariantFailure(
            `No shipped frontend file contains ${JSON.stringify(literal)}. ` +
              `The market socket's transport is ${TRANSPORT}; if it moved, ` +
              "move this check with it — a grep that matches nothing looks " +
              "exactly like a grep that passes.",
          );
        }

        if (homes.length !== 1 || homes[0] !== TRANSPORT) {
          throw new InvariantFailure(
            `${JSON.stringify(literal)} should appear only in ${TRANSPORT}, ` +
              "and is in:\n      " +
              homes.join("\n      ") +
              "\n      A second place that knows the socket's address is a " +
              "second place that can be pointed at the wrong one, and a " +
              "second place that opens one is a connection nothing above it " +
              "holds state for.",
          );
        }
      }
    },
  },
  {
    id: "the-send-instant-is-not-a-clock",
    claim:
      "Neither of the wire's process clocks — `sentAt` and `computedAt` — is " +
      "read by any liveness or staleness rule, on either side of the socket. " +
      "They are third and fourth clock readings, for measurement and for " +
      "dating an aggregate.",
    check() {
      // **Task 3.6.4 put a server-stamped instant on every frame** so that
      // `PRODUCT_SPEC.md` §28's p95 could be taken at all, and the constraint
      // that travelled with it (`docs/GAPS.md` entry 12, ADR 0033) is that it
      // must never reach `feed-liveness.ts`.
      //
      // The reason is a measured defect rather than a taste: `STREAM-SEAM.md`
      // §3 records that the 165 s disconnection threshold is monotonic and
      // the 60 s staleness threshold is wall clock, and that using one for
      // both made `stale` unreachable — silently, with every test green. A
      // server's wall clock read on a browser's machine is a THIRD reading,
      // and it is worse than either for a threshold: it is skew as readily as
      // latency, so a rule keyed on it fires on a viewer whose clock is a
      // minute out and never on a feed that has stopped.
      //
      // Three files, because the rule has one home and two adapters — the
      // shared rule, the backend's collapse of a vendor handshake into it,
      // and the browser's derivation of the chrome's word from it. Read
      // through `withoutComments`, because the field is discussed in prose in
      // at least one of them.
      const GUARDED = [
        "packages/shared/src/feed-liveness.ts",
        "apps/backend/src/stream-connection.ts",
        "apps/frontend/src/market/live-feed.ts",
      ];

      // **Two words since 2026-09-26 (Task 4.2.4), and the second is the one
      // with a live defect behind it.** `computedAt` says when the overview
      // aggregate was TRUE, and it is worse than `sentAt` for a threshold
      // rather than merely as bad: the frame is rebuilt on connect, on
      // subscribe and on every applied batch, so it moves whenever a browser
      // opens a tab. A staleness rule keyed on it would read a **dead feed as
      // `LIVE`** for as long as the gateway kept recomputing — the exact
      // inversion the 60 s rule exists to prevent, and it is also why the
      // browser's `observedIn` returns `NOTHING_OBSERVED` for an overview.
      //
      // Both words are one list because they are one rule: a clock reading
      // about THIS PROCESS is never evidence about the MARKET.
      const CLOCKS = [
        {
          word: "sentAt",
          what:
            "the send instant. It is a measurement field (Task 3.6.4, ADR " +
            "0033) and a server clock read on a browser's machine, so it is " +
            "skew as readily as latency",
        },
        {
          word: "computedAt",
          what:
            "the aggregate's own instant (Task 4.2.4). It moves every time " +
            "the gateway rebuilds the overview — on every connect and every " +
            "subscribe — so a rule keyed on it reports a dead feed as live",
        },
      ];

      for (const path of GUARDED) {
        const text = withoutComments(
          readFileSync(resolve(REPO_ROOT, path), "utf8"),
        );
        for (const { word, what } of CLOCKS) {
          if (text.includes(word)) {
            throw new InvariantFailure(
              `${path} reads \`${word}\` — ${what}. It must not become a ` +
                "clock a status is derived from: `STREAM-SEAM.md` §3 is what " +
                "happened last time two clocks were merged (ADR 0033).",
            );
          }
        }
      }
    },
  },
  {
    id: "one-home-for-the-feed-words",
    claim:
      "The words for a market feed, and for the connection behind it, are " +
      "written once in the shipped vocabulary and never in a renderer.",
    check() {
      // **`PRODUCT_SPEC.md` §7.1 and invariant 6, as a grep** — and it guards
      // both directions of Story 2.14's acceptance criterion 2, which is why
      // it takes two literals rather than one:
      //
      //  - `All US exchanges` is the most coverage-claiming string in the
      //    product. Since Task 2.14.3 it reaches the *page* rather than only
      //    the chrome. A renderer writing those four words itself is a claim of
      //    full US coverage that no vocabulary decided.
      //  - the IEX sentence is the same hazard in the other direction: a
      //    disclaimer copied onto a surface whose bars are the consolidated
      //    tape disclaims coverage the plan actually has, and criterion 2 read
      //    literally asks for exactly that mistake.
      //
      // Both live in `MARKET_FEED_DESCRIPTIONS`, and every renderer reads
      // `.label` / `.sentence` from there. The check is that they are the only
      // spellings.
      //
      // **Read through `withoutComments`**, because at least four shipped
      // files discuss these words at length in prose — `BarSeriesPanel` and
      // `chart-alternative` both name them in doc comments, correctly — and a
      // check a comment can trip is a check nobody can keep green.
      const FEED_VOCABULARY = "packages/shared/src/market-provenance.ts";

      // **The connection words joined this check in Task 3.3.3**, and they are
      // a second home rather than an extension of the first: *which venues are
      // in these numbers* and *is data arriving right now* are two facts that
      // fail independently, so they are two records — Task 1.12.4's
      // two-indicators argument, applied a fourth time.
      //
      // What is guarded is the **sentences** and the one multi-word label. The
      // connection labels themselves are `live` / `stale` / `disconnected`,
      // which are the union's own members and appear legitimately in every
      // file that switches on a `FeedStatus`; a grep for those would be a check
      // nobody can keep green, and a renderer writing `live` has not invented a
      // claim the way a renderer writing a sentence has.
      const CONNECTION_VOCABULARY = "packages/shared/src/feed-words.ts";

      const LITERALS = [
        { literal: "All US exchanges", home: FEED_VOCABULARY },
        {
          literal: "Trades reported by the IEX exchange only",
          home: FEED_VOCABULARY,
        },
        { literal: "not configured", home: CONNECTION_VOCABULARY },
        {
          literal: "No market-data provider is configured.",
          home: CONNECTION_VOCABULARY,
        },
        {
          literal: "Connected, but no new data has arrived.",
          home: CONNECTION_VOCABULARY,
        },
        {
          literal:
            "The live feed is not connected. Prices shown are the last known.",
          home: CONNECTION_VOCABULARY,
        },
        // **`Replaying a past session. Not the live market.` left this list on
        // 2026-09-21 by ceasing to exist** (Task 3.4.9), and the check is what
        // made that deliberate rather than quiet: deleting the string turned
        // this invariant red with *no shipped source file writes it*.
        //
        // It was removed because the moment the feed cell beside it became
        // reachable, the pair read `Real bars from a past US session,
        // replayed. Not the live market.` three words from `Replaying a past
        // session. Not the live market.` — **a shared four-word run**, which
        // is the defect `search-and-the-universe-share-no-words` guards one
        // surface over. `REPLAYING` now carries no sentence, which is what
        // `LIVE` does and what the canvas drew.

        // **Task 3.4.6's two, and they are the same hazard one surface in.**
        // `pre-market` and `after-hours` are claims about *when a price is
        // from*, derived from the bar's own instant against the calendar —
        // §7.7 measured that **nothing on the frame distinguishes** an
        // extended-hours bar, so the words are entirely ours and a renderer
        // writing one is a claim no vocabulary decided. Stories 3.6, 3.8 and
        // 3.9 consume them, which is what makes a second spelling expensive
        // rather than untidy.
        { literal: "pre-market", home: CONNECTION_VOCABULARY },
        { literal: "after-hours", home: CONNECTION_VOCABULARY },
      ];

      // The corpus is `shippedSourceFiles`' since Task 4.2.7 — this check
      // built it inline and was the only one that walked, which is how its
      // two array-driven neighbours went unnoticed.
      const shipped = shippedSourceFiles();

      for (const { literal, home: VOCABULARY } of LITERALS) {
        const homes = shipped
          .filter(({ text }) => text.includes(literal))
          .map(({ path }) => relative(REPO_ROOT, path));

        if (homes.length === 0) {
          throw new InvariantFailure(
            `No shipped source file writes ${JSON.stringify(literal)}. The ` +
              `feed vocabulary lives in ${VOCABULARY}; if the words changed, ` +
              "change them here too — and read §7.1 first, because both of " +
              "these are claims about which venues are in a number.",
          );
        }

        if (homes.length !== 1 || homes[0] !== VOCABULARY) {
          throw new InvariantFailure(
            `${JSON.stringify(literal)} should be written only in ` +
              `${VOCABULARY}, and is in:\n      ` +
              homes.join("\n      ") +
              "\n      A renderer with its own words for a feed is a claim " +
              "about market coverage that no vocabulary decided, which is " +
              "the defect invariant 6 exists for.",
          );
        }
      }
    },
  },

  {
    id: "the-live-stream-has-a-consumer",
    claim:
      "The process feeds live observations into the current market state, " +
      "rather than discarding them.",
    check() {
      const path = resolve(REPO_ROOT, "apps/backend/src/index.ts");
      const text = readAnchored(path);

      // **This repository has shipped this exact defect three times**, and
      // every one had `pnpm verify` green throughout: Story 3.2's three
      // implementations with no construction site, Task 3.4.3's three
      // implementations constructed and none self-driving, Task 3.4.9's
      // published grid row nothing could reach. Each is *something that exists
      // in one layer and cannot be reached from the next*.
      //
      // The current market state is the fourth candidate: a module with a full
      // unit suite that passes whether or not the process ever calls it. So
      // the check is on the WIRING rather than on the object.
      // **Updated by Task 3.5.2 rather than deleted.** That task collapsed two
      // subscriptions into one and moved the wiring inside this same file, so
      // the grep still holds — but the expression it looks for changed shape,
      // and a check whose subject moved must be re-read rather than assumed.
      if (!text.includes("currentMarketState.observe(")) {
        throw new InvariantFailure(
          "index.ts does not feed the market stream into the current market " +
            "state. Before Task 3.5.1 this line read `onObservations: () => " +
            "undefined` and every observation was discarded — a unit suite " +
            "over the state object passes either way, which is what makes " +
            "this invisible.",
        );
      }

      if (/onObservations:\s*\(\)\s*=>\s*undefined/.test(text)) {
        throw new InvariantFailure(
          "index.ts is discarding live observations again.",
        );
      }
    },
  },

  {
    id: "the-store-takes-what-is-true-not-what-is-news",
    claim:
      "`index.ts` hands the live bar writer the TRACKED list, not the applied one.",
    check() {
      // **The two lists have different owners, and one line decides which
      // reader gets which** (Task 3.8.7). `currentMarketState.observe` drops a
      // revision for a minute already passed — correctly, because applying it
      // would walk the latest observation backwards and every reader would see
      // the price jump. That is a statement about what is NEWS. It is not a
      // statement about what is TRUE, and §14.1 measured 35.3% of revisions
      // changing the close.
      //
      // Story 3.5's close put the consequence in terms worth repeating: if the
      // store does not get them, this product's stored history is permanently
      // and knowably wrong for a fraction of bars **and nothing will ever
      // report it**, because the frame that would have corrected it was
      // dropped a story earlier.
      //
      // A grep rather than a test because `index.ts` is the process: no runner
      // instruments a spawned child, so this wiring is at 0% coverage by
      // construction and the only mechanical guard is the text.
      const path = resolve(REPO_ROOT, "apps/backend/src/index.ts");
      const text = readAnchored(path);

      if (!text.includes("liveBarWriter.store(observed.tracked)")) {
        throw new InvariantFailure(
          "index.ts does not hand the live bar writer `observed.tracked`. " +
            "If it is handing it `observed.applied`, every revision for a " +
            "minute the live path has already moved past is dropped on the " +
            "floor and the store is quietly wrong for those bars.",
        );
      }

      if (!text.includes("gateway.publishObservations(observed.applied)")) {
        throw new InvariantFailure(
          "index.ts does not broadcast `observed.applied`. A browser must " +
            "never receive an observation the current market state rejected " +
            "(Task 3.5.2).",
        );
      }
    },
  },

  {
    id: "one-subscriber-on-the-upstream-socket",
    claim: "Shipped serving code subscribes to the market stream exactly once.",
    check() {
      // **Two subscribers is not untidy, it is two policies** (Task 3.5.2).
      // `market-gateway.ts` used to subscribe alongside `index.ts` and
      // broadcast the RAW batch, while the current market state drops a
      // revision for a minute already passed so the latest observation never
      // walks backwards. They disagreed about what had happened and nothing
      // said which was authoritative — invisible until something read both.
      //
      // The free plan also allows ONE connection, so "how many things think
      // they own this socket" is a question with a real bill attached.
      const sources = [];

      const walk = (dir) => {
        for (const child of readdirSync(dir)) {
          const path = resolve(dir, child);
          if (statSync(path).isDirectory()) {
            if (child !== "fixtures") walk(path);
            continue;
          }
          if (!child.endsWith(".ts")) continue;
          if (child.endsWith(".test.ts")) continue;
          sources.push({ path, text: readFileSync(path, "utf8") });
        }
      };

      walk(resolve(REPO_ROOT, "apps/backend/src"));

      // **Count CALL SITES, not files.** Counting files was the first version
      // and `pnpm break a-second-subscriber-on-the-upstream-socket` caught it
      // immediately: a second subscription added to the file that already had
      // one left the count at 1 and the check green. That is the likeliest
      // shape of the real regression, too — somebody adds a subscriber next to
      // the existing one rather than in a new module.
      const sites = [];

      for (const source of sources) {
        const matches =
          source.text.match(/\.subscribe\(\s*(?:STREAM_SYMBOLS|\[)/g) ?? [];
        for (let i = 0; i < matches.length; i += 1) {
          sites.push(relative(REPO_ROOT, source.path));
        }
      }

      if (sites.length !== 1) {
        throw new InvariantFailure(
          `${String(sites.length)} call sites subscribe to the market stream, ` +
            "expected exactly 1:\n      " +
            sites.join("\n      "),
        );
      }
    },
  },

  {
    id: "stored-sources-only-through-the-merge",
    claim:
      "A served series' `sources` are built by `toSeriesProvenance` and " +
      "joined by `mergeSeriesProvenance`, never written out as an array; " +
      "and the ledger's withdrawn `feed` column is read by nothing.",
    check() {
      // **Two halves of Story 3.7's read path, both greps (Task 3.7.5).**
      //
      // The first: `mergeSeriesProvenance` is the only route to a
      // multi-source record and its adjustment check fires whether or not
      // anybody read the rule — so a `sources:` literal in the repository
      // module is a second route that skips it. Criterion 2 says *through
      // the merge rather than around it*, and a test cannot see which of
      // two identical arrays came through a function, so the file is read.
      //
      // The second: Task 3.7.4 withdrew `bar_coverage.feed` from every
      // decision (the tape the window was OPENED with, a fact one column
      // cannot keep once a window holds two tapes) and Task 3.7.5 took it
      // off `BarCoverage`. It is still written on insert, on purpose, so
      // the database default stays unreachable; what must not come back is
      // a read. `schema.ts` describes the column and `extendCoverage` writes
      // it — everything else is a reader.
      const path = "apps/backend/src/market-bars.ts";
      const text = withoutComments(
        readFileSync(resolve(REPO_ROOT, path), "utf8"),
      );

      if (/\bsources\s*:/.test(text)) {
        throw new InvariantFailure(
          `${path} writes a \`sources:\` array by hand. A served series' ` +
            "sources are one `toSeriesProvenance` per stretch joined by " +
            "`mergeSeriesProvenance`, whose adjustment check is the point " +
            "(Task 3.7.5, criterion 2).",
        );
      }
      if (!text.includes("mergeSeriesProvenance(")) {
        throw new InvariantFailure(
          `${path} no longer calls \`mergeSeriesProvenance\`; a two-tape ` +
            "window has no route to two sources (Task 3.7.5).",
        );
      }

      // Only the column select: `BarCoverage` no longer has a `feed` to read,
      // so a domain-level reader is a compile error and needs no grep — and
      // `.source.feed` is also how a *series'* source is spelled, which is
      // exactly the read this file should be doing.
      const reads = text.match(/"bar_coverage\.feed"/g) ?? [];
      if (reads.length > 0) {
        throw new InvariantFailure(
          `${path} reads the ledger's \`feed\` column ${String(reads.length)} ` +
            "time(s). It is the tape the window was opened with and nothing " +
            "else — withdrawn by Task 3.7.4, off `BarCoverage` since 3.7.5, " +
            "written on insert only (`TAPE.md` §7).",
        );
      }

      // **And the reason one file is enough** (Task 3.7.6). The grep above
      // scopes to `market-bars.ts`, which is only sound while that module is
      // the one place `bar_coverage` is queried — the seam `market-bars.ts`'s
      // header states and `DATA-LAYER.md` requires, since a module that built
      // its own query could select the withdrawn column and pass every check
      // above. Measured on 2026-09-23: eleven files mention `bar_coverage`
      // and **none of them but this one builds a query against it**. So the
      // scope is asserted rather than assumed.
      const LEDGER_QUERY =
        /(?:selectFrom|insertInto|updateTable|deleteFrom)\(\s*"bar_coverage"/u;
      for (const file of sourceFilesUnder(
        resolve(REPO_ROOT, "apps/backend/src"),
      )) {
        if (file.path.endsWith("market-bars.ts")) continue;
        if (/\.test\.tsx?$/u.test(file.path)) continue;
        if (LEDGER_QUERY.test(withoutComments(file.text))) {
          throw new InvariantFailure(
            `${relative(REPO_ROOT, file.path)} builds a query against ` +
              "`bar_coverage`. The ledger has one reader — `market-bars.ts` — " +
              "and that is what lets the check above scope its grep to one " +
              "file; a second querier could select the withdrawn `feed` and " +
              "pass it (Task 3.7.6, `TAPE.md` §7).",
          );
        }
      }
    },
  },
  {
    id: "the-epic-close-cannot-outrun-the-rehearsal-ledger",
    claim:
      "Story 3.11 cannot be closed while a story in LIVE-REHEARSAL.md's " +
      "ledger still has an empty row.",
    check() {
      // **This check exists because the file already claimed it.**
      // `LIVE-REHEARSAL.md`'s rules said, in as many words, that the ledger is
      // *"checkable rather than promised: `pnpm invariants` asserts every
      // story marked complete in EPIC.md has a row here"* — and nothing
      // asserted anything. Story 3.5's close found it by grepping for the
      // subject rather than by reading the sentence, which is the only way
      // this class is ever found: a claim about a mechanism reads exactly the
      // same whether the mechanism exists or not.
      //
      // The claim is narrowed to what the file can actually support. `EPIC.md`
      // marks *visibility*, not completion — there is no "complete" column to
      // key on — and a per-story check would go red today on Story 3.3, which
      // closed on 2026-09-19 with an empty row for a reason the epic accepted:
      // the deployed backend holds the free plan's one Alpaca connection, so
      // no developer machine can watch a live session at all. Going red on a
      // constraint nobody can clear is how a check gets deleted.
      //
      // So it keys on the **epic close**, which is where the file puts the
      // deadline and where the constraint must be cleared or consciously
      // waived.
      const ledgerPath = resolve(
        REPO_ROOT,
        "planning/epic-03-live-market-data/LIVE-REHEARSAL.md",
      );
      const ledger = readAnchored(ledgerPath);

      // The anchor. A "must find nothing" assertion over a table passes
      // vacuously the day the table moves or is reformatted, so the rows are
      // counted and their shape asserted before anything is concluded from
      // their contents.
      const rows = ledger
        .split("\n")
        .filter((line) => /^\|\s*3\.\d+\s*\|/.test(line));

      if (rows.length < 6) {
        throw new InvariantFailure(
          `LIVE-REHEARSAL.md's ledger has ${String(rows.length)} story rows; ` +
            "it had 7 when this check was written and the list only grows. " +
            "A reformatted or relocated table makes this check pass without " +
            "reading anything.",
        );
      }

      const closePath = resolve(
        REPO_ROOT,
        "planning/epic-03-live-market-data/" +
          "story-11-cost-performance-and-the-epic-close/STORY.md",
      );
      const closeStatus = /^\*\*Status:\*\*(.*)$/m.exec(
        readAnchored(closePath),
      );

      if (closeStatus === null) {
        throw new InvariantFailure(
          "Story 3.11's STORY.md has no `**Status:**` line, so there is no " +
            "way to tell whether the epic has closed.",
        );
      }

      if (!/\b(complete|closed)\b/i.test(closeStatus[1])) return;

      const empty = rows.filter((row) =>
        row
          .split("|")
          .slice(2, -1)
          .every((cell) => cell.trim() === "" || cell.trim() === "\u2014"),
      );

      if (empty.length > 0) {
        throw new InvariantFailure(
          `Story 3.11 is closed and ${String(empty.length)} rehearsal rows ` +
            "are still empty:\n      " +
            empty.map((row) => row.trim()).join("\n      ") +
            "\n    A row written retrospectively at the epic close is a row " +
            "about a memory — the file says so. Either the rehearsal was " +
            "done and the row is owed, or it was not and the close is early.",
        );
      }
    },
  },

  {
    id: "one-caller-of-the-live-feed-hook",
    claim:
      "Shipped frontend code calls `useLiveFeed` exactly once, so a screen " +
      "showing 518 securities holds one subscription rather than 518.",
    check() {
      // **The naive wiring for a live table is one subscription per row**, and
      // this repository has already produced the counterfactual for exactly
      // that choice: `useMarketClock` placed in `AppHeader` gives **0**
      // whole-route re-renders in 20 s where the same hook in `App` gives
      // **40**. At 518 rows that is not a wasted render, it is 518 sockets'
      // worth of subscription bookkeeping behind one socket.
      //
      // Task 3.6.1's done-when asks for this check by name. It is on the
      // CALL SITES rather than on the files, because the defect it guards
      // against is a second `useLiveFeed()` inside a row component — which
      // would live in one file and could be called 518 times from it.
      //
      // `UniverseTable` takes its observations as a **prop** for the same
      // reason it takes everything else as one: a component that subscribes is
      // a component the workshop cannot render, and every state of that table
      // is reviewable with no backend running precisely because it does not.
      const shipped = sourceFilesUnder(resolve(REPO_ROOT, "apps/frontend/src"))
        .filter(({ path }) => !/\.(?:test|stories)\.tsx?$/u.test(path))
        .map(({ path, text }) => ({ path, text: withoutComments(text) }));

      // The hook's own module defines it; every other mention is a call.
      const DEFINITION = "apps/frontend/src/market/use-live-feed.ts";

      const sites = [];

      for (const { path, text } of shipped) {
        const where = relative(REPO_ROOT, path);
        if (where === DEFINITION) continue;

        for (const match of text.matchAll(/\buseLiveFeed\s*\(/gu)) {
          sites.push(`${where} (offset ${String(match.index)})`);
        }
      }

      if (sites.length !== 1) {
        throw new InvariantFailure(
          `${String(sites.length)} shipped call sites use \`useLiveFeed\`, ` +
            "expected exactly 1:\n      " +
            (sites.length === 0
              ? "(none — if the hook was renamed, rename it here too: a grep " +
                "that matches nothing looks exactly like a grep that passes)"
              : sites.join("\n      ")) +
            "\n    One subscription lives in `App` and every screen declares " +
            "what it needs through `onLiveSymbols`. A second caller is a " +
            "second socket's worth of state that nothing above it is holding.",
        );
      }
    },
  },

  {
    id: "one-caller-of-the-market-clock",
    claim:
      "Shipped frontend code calls `useMarketClock` exactly once, so there " +
      "is one clock on screen and it is the chrome's.",
    check() {
      // **The landing screen is the surface most likely to grow a second
      // clock, and `PRODUCT_SPEC.md` §9's own sketch is why** — it draws
      // `LIVE   10:42:16 ET` across the top of the Market Overview, and a
      // reader building from that sketch reaches for a clock in the route.
      //
      // Both halves of that line already exist and neither is the route's.
      // The market clock shipped in Story 2.5 and the feed cell in Story 2.6,
      // with the connection word added by Epic 3; Epic 4's `EPIC.md` says it
      // in as many words — *live market status indicators here means the
      // CONNECTION state Epic 3 adds beside them, not a second clock.*
      //
      // **Two reasons, and the second is measured rather than tidy.**
      //
      //  - *One home.* A page where two surfaces answer *what time is it in
      //    the market* is a page where they can disagree — and this product
      //    has produced the two-surfaces defect four times on one screen
      //    already (ADR 0029's fourth rule; Tasks 3.10.3, 3.10.5 and 3.10.8).
      //  - *Render cost.* `useMarketClock` ticks, so its caller re-renders
      //    every second. In `AppHeader` that is **0** whole-route re-renders
      //    in 20 s; lifted to `App` it was **40**. A second caller in a route
      //    puts that cost on a screen that is about to hold four aggregates
      //    over 518 securities, which is Epic 14's trigger by condition.
      //
      // Written in the shape of `one-caller-of-the-live-feed-hook` above,
      // deliberately: the two are the same rule about different subjects, and
      // a reader meeting one should recognise the other.
      const shipped = sourceFilesUnder(resolve(REPO_ROOT, "apps/frontend/src"))
        .filter(({ path }) => !/\.(?:test|stories)\.tsx?$/u.test(path))
        .map(({ path, text }) => ({ path, text: withoutComments(text) }));

      // The hook's own module defines it; every other mention is a call.
      const DEFINITION = "apps/frontend/src/use-market-clock.ts";

      const sites = [];

      for (const { path, text } of shipped) {
        const where = relative(REPO_ROOT, path);
        if (where === DEFINITION) continue;

        for (const match of text.matchAll(/\buseMarketClock\s*\(/gu)) {
          sites.push(`${where} (offset ${String(match.index)})`);
        }
      }

      if (sites.length !== 1) {
        throw new InvariantFailure(
          `${String(sites.length)} shipped call sites use ` +
            `\`useMarketClock\`, expected exactly 1:\n      ` +
            (sites.length === 0
              ? "(none — if the hook was renamed, rename it here too: a grep " +
                "that matches nothing looks exactly like a grep that passes)"
              : sites.join("\n      ")) +
            "\n    The clock is the chrome's, in `AppHeader`, on every route. " +
            "A second caller is a second answer to *what time is it in the " +
            "market* and a per-second re-render of whatever holds it.",
        );
      }
    },
  },

  {
    id: "one-provenance-note-on-the-landing-route",
    claim:
      "The Market Overview renders exactly one source note, and its clause " +
      "terms are produced in one place — so a region cannot grow a second.",
    check() {
      // **`PROVENANCE.md` §1.3's one-note-per-screen rule, as a check** (Task
      // 4.2.7), in the shape of `one-caller-of-the-market-clock`: the two are
      // the same rule about different subjects, and a reader meeting one
      // should recognise the other.
      //
      // **Why the rule needs a mechanism here specifically.** Three regions
      // on this screen are still deferrals and each of 4.3, 4.4 and 4.5
      // lands one with figures in it — so the screen is about to grow three
      // surfaces, each of which has a true and correct provenance fact to
      // state. Five correct additions made one at a time is exactly how a
      // footnote pile is built, and Task 3.10.9 deleted a duplicate ledger
      // that got there that way.
      //
      // **Two conjuncts, because there are two ways to get a second note and
      // `one-home-for-the-feed-words` catches neither.** That check stops a
      // second renderer inventing the feed *labels*; it says nothing about a
      // second note assembled out of the shared vocabulary, which is the
      // likelier shape — a region reading `MARKET_FEED_DESCRIPTIONS` and
      // drawing its own caption spells no literal of its own at all.
      //
      //  - the note is **rendered** in exactly one place, and that place is
      //    the route rather than a component inside it;
      //  - its **terms** are written in exactly one place, so a second note
      //    that says the same things in the same words goes red even if it
      //    imports nothing from here.
      const RENDERER = "apps/frontend/src/routes/MarketOverview.tsx";
      const WORDS =
        "apps/frontend/src/components/OverviewSourceNote/" +
        "overview-source-note.ts";

      const shipped = shippedSourceFiles();

      const renders = [];
      for (const { path, text } of shipped) {
        const where = relative(REPO_ROOT, path);
        for (const match of text.matchAll(/<OverviewSourceNote[\s/>]/gu)) {
          renders.push(`${where} (offset ${String(match.index)})`);
        }
      }

      if (renders.length !== 1 || !renders[0].startsWith(RENDERER)) {
        throw new InvariantFailure(
          `The landing screen's source note is rendered in ` +
            `${String(renders.length)} place(s), expected exactly 1 in ` +
            `${RENDERER}:\n      ` +
            (renders.length === 0
              ? "(none — if the component was renamed, rename it here too: a " +
                "grep that matches nothing looks exactly like a grep that " +
                "passes)"
              : renders.join("\n      ")) +
            "\n    One note for the SCREEN, at the foot of the region group " +
            "(`PROVENANCE.md` §1.3). A second one inside a region is the " +
            "footnote pile that rule exists to prevent.",
        );
      }

      // **A term, not a phrase** — and the distinction was measured rather
      // than anticipated. The first version matched the bare substring and
      // went red on `UniverseTable.tsx`, which says *"Closing prices are from
      // the 2026-09-11 session."* — a different sentence about the same
      // subject, correctly owned by the surface that draws the column. So a
      // term is matched in the two shapes a term can take: a quoted constant
      // and inline JSX text.
      //
      // **What that cannot see, stated rather than discovered**: a second note
      // whose terms are assembled rather than written — a template literal, a
      // concatenation, a record keyed elsewhere. This check is the cheapest
      // honest proxy for *one note per screen*, not the claim itself, and the
      // conjunct above it is what covers the likelier shape.
      for (const term of ["Observed prices", "Closing prices"]) {
        const spellings = [`"${term}"`, `>${term}<`];
        const homes = shipped
          .filter(({ text }) =>
            spellings.some((spelling) => text.includes(spelling)),
          )
          .map(({ path }) => relative(REPO_ROOT, path));

        if (homes.length !== 1 || homes[0] !== WORDS) {
          throw new InvariantFailure(
            `${JSON.stringify(term)} should be written only in ${WORDS}, ` +
              `and is in:\n      ` +
              (homes.join("\n      ") || "(nowhere — was a term renamed?)") +
              "\n    A second surface saying what this note says, in this " +
              "note's words, is a second note however it was assembled.",
          );
        }
      }
    },
  },

  {
    id: "the-consolidated-word-has-one-producer",
    claim:
      "`All US exchanges` is produced by exactly one place — `sip`'s label in " +
      "`MARKET_FEED_DESCRIPTIONS` — so no live stretch can be given Epic 2's " +
      "word.",
    check() {
      // **Criterion 3's harder half, walked at the producers** (Task 3.9.7).
      //
      // `PRODUCT_SPEC.md` §7.1 forbids implying coverage the plan does not
      // have, and the concrete failure is one venue's bars labelled as the
      // whole consolidated tape. Rendering a state cannot prove the absence:
      // it proves that ONE state does not say it. What can be proved is that
      // the string has a single producer and every consumer reads through it.
      //
      // So: the literal appears in exactly one place that produces a value —
      // `sip`'s `label` — and a second occurrence anywhere in shipped source
      // is either a second producer or a hard-coded copy. Comments are read
      // out first, because the argument for the words is worth keeping and is
      // not a producer.
      //
      // **A WALK, since 2026-09-26, and it was a seven-path array until then**
      // (Task 4.2.7). The list named the files that happened to discuss the
      // word on the day it was written, so a component added afterwards was
      // outside it and **this check stayed green while spelling the most
      // coverage-claiming string in the product** — which is this
      // repository's named recurring defect, a claim about a mechanism
      // reading identically whether the mechanism covers the new case or not.
      // Verified rather than suspected: the landing page's note was written
      // with the literal in it, and the run reported `1 of 34 invariants
      // failed` with this one **passing**.
      //
      // The walk is the same corpus `one-home-for-the-feed-words` reads, and
      // the overlap is deliberate rather than accidental — see the note under
      // `pnpm break a-second-component-spells-the-consolidated-word`.
      const HOME = "packages/shared/src/market-provenance.ts";

      const producers = shippedSourceFiles()
        .filter(({ text }) => text.includes("All US exchanges"))
        .map(({ path }) => relative(REPO_ROOT, path));

      if (producers.length !== 1 || producers[0] !== HOME) {
        throw new InvariantFailure(
          `\`All US exchanges\` is produced in ${producers.length} place(s) ` +
            `(${producers.join(", ") || "none"}), and it must be produced in ` +
            "exactly one: `sip`'s label. A second one is how a live stretch " +
            "acquires Epic 2's word, which is the coverage claim " +
            "`PRODUCT_SPEC.md` §7.1 forbids (Task 3.9.7).",
        );
      }
    },
  },

  {
    id: "the-market-claiming-sentence-has-one-home",
    claim:
      "`No shares changed hands` is produced by exactly one place — " +
      "`describeSilence` in `market-provenance.ts` — so the drawn strip and " +
      "its spoken twin cannot be corrected apart.",
    check() {
      // **The only sentence this product ships that claims something about
      // the MARKET rather than about our store** (Task 3.9.8), and it had two
      // homes: a literal in `VolumeReading.tsx` and a second literal in
      // `chart-alternative.ts`, each carrying a comment saying it was
      // deliberately said in the other's words *because it is the same fact*.
      //
      // That is ADR 0029's `one fact has one home` broken with a note
      // explaining the break, and the cost is specific rather than tidy: the
      // sentence's SCOPE — `anywhere`, against one named venue — is a fact
      // about the series' tapes, so a correction applied to one copy leaves
      // the other reporting one exchange's silence as the whole market's.
      //
      // Walked at the producers for `the-consolidated-word-has-one-producer`'s
      // reason: rendering a state proves that ONE state does not say it.
      // Comments are read out first, because the argument for the words is
      // worth keeping and is not a producer.
      //
      // **A WALK, since 2026-09-26** (Task 4.2.7), for its neighbour's reason
      // and with a sharper edge here: `All US exchanges` has a second guard
      // in `one-home-for-the-feed-words` and this sentence has **none**, so
      // for this literal the five-path array was the only thing standing
      // between the product and a second copy — and it could not see a file
      // added after the day it was written.
      const HOME = "packages/shared/src/market-provenance.ts";

      const producers = shippedSourceFiles()
        .filter(({ text }) => text.includes("No shares changed hands"))
        .map(({ path }) => relative(REPO_ROOT, path));

      if (producers.length !== 1 || producers[0] !== HOME) {
        throw new InvariantFailure(
          `\`No shares changed hands\` is produced in ${producers.length} ` +
            `place(s) (${producers.join(", ") || "none"}), and it must be ` +
            "produced in exactly one: `describeSilence`. A second one is a " +
            "copy that can be corrected alone, and the fact it carries is " +
            "how wide a claim the series' feeds entitle it to make " +
            "(Task 3.9.8).",
        );
      }
    },
  },

  {
    id: "the-two-feed-state-comes-from-a-recorded-body",
    claim:
      "The frontend's two-feed fixture is a RECORDED body, not a recorded " +
      "body with a field changed: `twoFeedStitchView` does not come back.",
    check() {
      // **The state this product's provenance design exists for, and for two
      // epics nothing could produce it** (Task 3.9.7).
      //
      // `twoFeedStitchView()` took `stitched.json` — two `sip` stretches, both
      // halves from Alpaca's historical API — and changed the second's `feed`
      // to `iex`. It was admissible when it was written and it asserted
      // something by construction: that a two-FEED record looks exactly like a
      // two-`sip` one with a different letter in it. Nothing checked that.
      //
      // Since 2026-09-24 there is a real one. `two-feed.json` was recorded from
      // this product's own `GET /market-data/bars` reading its own store: 60
      // `sip` minutes then 30 `iex`, with the stretches started by
      // `toStoredSeries` where the tape changed and joined through
      // `mergeSeriesProvenance`. Every byte of its provenance is the read
      // path's work.
      //
      // The grep is the cheap half of keeping it that way: a fixture module
      // that reintroduces a view built by editing a recorded one is the same
      // mistake wearing the same name.
      const path = "apps/frontend/src/fixtures/bar-series.ts";
      const text = readFileSync(resolve(REPO_ROOT, path), "utf8");

      // **The DECLARATION, not the name.** The first draft grepped for the
      // name and went red on the fixture's own comment explaining why the
      // function is gone — which is the paragraph most worth keeping. A check
      // that forbids its own explanation is a check that gets deleted.
      if (/function\s+twoFeedStitchView\b/u.test(text)) {
        throw new InvariantFailure(
          `${path} names \`twoFeedStitchView\` again. The two-feed state has ` +
            "a RECORDED body since Task 3.9.7 — `two-feed.json`, 60 sip bars " +
            "then 30 iex, read off this product's own server — and a view " +
            "built by changing one field of another body asserts by " +
            "construction the thing it is supposed to demonstrate.",
        );
      }

      if (!text.includes("two-feed.json")) {
        throw new InvariantFailure(
          `${path} no longer imports \`two-feed.json\`. That body is the ` +
            "only two-TAPE answer this repository holds; without it the " +
            "source note's split-series states are drawn from nothing a " +
            "server has ever sent (Task 3.9.7).",
        );
      }
    },
  },

  {
    id: "every-prepared-index-has-its-adopter",
    claim:
      "Every entry in `prepare-indexes.ts`'s `PREPARED` list names a " +
      "migration file that exists.",
    check() {
      // **The silent half of a two-step index build (raised 2026-09-23 by
      // Task 3.8.2, mechanised at Story 3.8's close).**
      //
      // `market_bars` is too large for a migration to build an index inside
      // `deploy.yml`'s `timeout 120`, so `pnpm index:prepare` builds it
      // CONCURRENTLY in a step of its own and the migration only ADOPTS it
      // (`migrations/README.md` §9). That splits one change across two files,
      // and the two failure modes are not symmetric:
      //
      //   - **An adopter with no entry** fails a deploy once and loudly — the
      //     migration renames an index that was never built.
      //   - **An entry with no adopter** is SILENT. The prepare step builds
      //     the index on every deploy, reports `waiting for <migration>`, and
      //     waits forever for a file that was renamed or never written. The
      //     store carries an unadopted index and the message reads like
      //     progress.
      //
      // The second is the one worth a grep, and it is one `existsSync`.
      const path = "apps/backend/src/prepare-indexes.ts";
      const text = readFileSync(resolve(REPO_ROOT, path), "utf8");
      const adopters = [...text.matchAll(/adoptedBy:\s*"([^"]+)"/g)].map(
        (match) => match[1],
      );

      if (adopters.length === 0) {
        throw new InvariantFailure(
          `${path} names no \`adoptedBy\` migration. Either the list is ` +
            "empty — in which case this check and the step are both dead — " +
            "or the field was renamed and nothing now ties a prepared index " +
            "to the migration that adopts it (Task 3.8.2).",
        );
      }

      const missing = adopters.filter(
        (name) =>
          !existsSync(
            resolve(REPO_ROOT, `apps/backend/migrations/${name}.sql`),
          ),
      );

      if (missing.length > 0) {
        throw new InvariantFailure(
          `${missing.length} prepared index adopter(s) name a migration that ` +
            `does not exist: ${missing.join(", ")}. \`pnpm index:prepare\` ` +
            "would build the index on every deploy and wait for an adopter " +
            "that is never going to run — which reads as progress rather " +
            "than as a fault (migrations/README.md §9).",
        );
      }
    },
  },

  {
    id: "the-deploy-reads-the-provider",
    claim:
      "`deploy.yml` asserts the deployed provider before it rolls an image — " +
      "ADR 0030 §7b, the only preventive replay guard.",
    check() {
      // **This exists because the mechanism did not.** ADR 0030 §7b has said
      // since 2026-09-16 that the deploy reads `MARKET_DATA_PROVIDER` off the
      // container app and refuses to roll on anything but `alpaca`, and
      // `docs/GAPS.md` called it *the only preventive mechanism*. Task 3.11.7
      // went to break it and found there was no such step: nine days of two
      // documents asserting a guard that was never written.
      //
      // Every other ADR 0030 mechanism has a `pnpm break` entry over a source
      // file. This one lives in a workflow, which nothing in `pnpm verify`
      // parses and no local command exercises — so the thing that rots is the
      // step being deleted or renamed in a refactor, with both documents still
      // asserting it. That is precisely the failure this check answers, and it
      // is the cheap half: it proves the assertion is there, not that Azure
      // answers it.
      const workflow = readFileSync(
        resolve(REPO_ROOT, ".github/workflows/deploy.yml"),
        "utf8",
      );

      const required = [
        "MARKET_DATA_PROVIDER",
        "NON_LIVE_MARKET_DATA",
        '[ "$provider" != "alpaca" ]',
      ];

      const missing = required.filter((needle) => !workflow.includes(needle));

      if (missing.length > 0) {
        throw new InvariantFailure(
          "`deploy.yml` no longer reads the configured provider before it " +
            `rolls (missing: ${missing.join(", ")}). ADR 0030 §7b is the ` +
            "ONLY preventive guard — 7c and 7d are detective and bound the " +
            "duration of a wrong state rather than its existence. Without " +
            "this step a container app edited by hand to serve a replay or a " +
            "fixture rolls a new image over the top and serves invented " +
            "prices to a real user until the next check-deployed run.",
        );
      }
    },
  },

  {
    id: "the-overview-frame-is-not-a-heartbeat",
    claim:
      "The overview frame is built in at most one place in " +
      "`market-gateway.ts`, and the word `overview` appears nowhere in " +
      "`feedMessage`, `publishFeedState`, the keepalive callback, or " +
      "`index.ts`'s `onConnectionChange` handler.",
    check() {
      // **Written BEFORE the frame it guards** (Task 4.2.1), which is the only
      // ordering in which it can be proved against the real defect rather
      // than against a memory of one.
      //
      // ## The defect it forbids, measured
      //
      // Task 4.1.6 measured `alpaca-stream.ts` calling `apply()` inside the
      // per-vendor-item loop and `index.ts` answering `onConnectionChange`
      // with `publishFeedState()` — **~332 `feed` frames a minute, broadcast
      // to every browser regardless of subscription**. That is unrepaired on
      // purpose and handed to Story 4.7. The `feed` frame is 127 bytes and
      // `sameLiveFeedView` collapses the render, which is why it survived a
      // whole epic unnoticed.
      //
      // **An overview frame on that path inherits the rate and none of the
      // mercy.** It would be sent ~332 times a minute instead of once, it
      // carries an aggregate over 518 securities rather than three enum
      // fields, and `sameLiveFeedView` does not cover it.
      //
      // ## Why the rule is about the WORD and the FRAME rather than a name
      //
      // The symbol does not exist yet, so a check keyed on one name would be
      // a check whose target the implementing task is free to spell
      // differently — and it would then pass for ever. What is guarded
      // instead is the **frame** (`type: "overview"`, which the wire fixes)
      // and the **regions** it may not appear in.
      //
      // ## Why the regions are sliced by their PRETTIER SHAPE, not by braces
      //
      // **The first draft counted braces from the next `{` after a marker,
      // and a review demonstrated three ways through it** — all of them
      // ordinary rather than adversarial:
      //
      //  1. A destructured parameter. `onConnectionChange: ({ phase }) => {`
      //     made the "body" the destructuring pattern, so a publish on the
      //     line after `publishFeedState()` passed.
      //  2. A `}` in a trailing comment, a string, a template or a regex
      //     literal truncated the region. `withoutComments` leaves trailing
      //     `//` deliberately — its own note argues the asymmetry is the safe
      //     direction because *the worst this can do is report a match* — and
      //     that judgement **inverts** in front of a brace matcher.
      //  3. `indexOf("publishFeedState()")` found the method only because no
      //     call site precedes it in the file.
      //
      // So there is no parser here. Every region is delimited by a **start
      // marker and an end marker taken from the file's Prettier-formatted
      // indentation**, which no parameter list, comment or string can move —
      // and each region must contain a **sentinel** proving the slice is the
      // block meant rather than a shorter one that happened to terminate
      // early. A missing marker or a missing sentinel is a FAILURE, because a
      // grep that matches nothing looks exactly like a grep that passes.
      //
      // ## The zero case, which is today's case
      //
      // Nothing matches `overview` yet and that is expected. The anchors
      // above are what make that non-vacuous.

      /**
       * The text between two markers, or a reason it could not be taken.
       *
       * One helper rather than the two identical copies the first draft had:
       * four rotted breaks in one week is what a second copy of a hand-rolled
       * matcher costs here.
       */
      const regionBetween = (text, { from, to }) => {
        const start = text.indexOf(from);
        if (start === -1) return { missing: `start marker \`${from}\`` };

        const rest = start + from.length;
        const stop = text.indexOf(to, rest);
        if (stop === -1) return { missing: `end marker \`${to}\`` };

        return { body: text.slice(start, stop + to.length) };
      };

      /**
       * Trailing `//` comments removed, **for this consumer only**.
       *
       * `withoutComments` deliberately leaves them and that is right for
       * every other check; here a comment saying *the overview does not ride
       * this path* inside `publishFeedState` would otherwise fail the build
       * for saying the true thing.
       */
      const withoutTrailingComments = (body) =>
        body.replace(/\/\/[^\n]*/gu, "");

      const REGIONS = [
        {
          where: "apps/backend/src/market-gateway.ts",
          name: "feedMessage",
          from: "\n  const feedMessage = ",
          to: "\n    });",
          sentinel: "encodeMarketStreamMessage(",
        },
        {
          where: "apps/backend/src/market-gateway.ts",
          name: "the keepalive callback",
          from: "\n  const keepalive = setTimer(",
          to: "\n  }, KEEPALIVE_INTERVAL_MS);",
          sentinel: "broadcast(",
        },
        {
          // **`\n    publishFeedState() {` rather than `publishFeedState()`.**
          // The leading newline and four spaces pin it to a method definition
          // in the returned object literal, and the trailing ` {` is
          // something no call site can be followed by — so a call added above
          // this point cannot retarget the region.
          where: "apps/backend/src/market-gateway.ts",
          name: "publishFeedState",
          from: "\n    publishFeedState() {",
          to: "\n    },",
          sentinel: "broadcast(",
        },
        {
          // **The parameter list is inside the slice and that is harmless
          // now**, because nothing here looks for a brace: a destructured
          // handler reads the same as a named one.
          where: "apps/backend/src/index.ts",
          name: "the `onConnectionChange` handler",
          from: "\n    onConnectionChange:",
          to: "\n    },",
          sentinel: "publishFeedState()",
        },
      ];

      const sources = new Map();
      const readOnce = (where) => {
        const cached = sources.get(where);
        if (cached !== undefined) return cached;
        const text = withoutComments(readAnchored(resolve(REPO_ROOT, where)));
        sources.set(where, text);
        return text;
      };

      for (const { where, name, from, to, sentinel } of REGIONS) {
        const taken = regionBetween(readOnce(where), { from, to });

        if (taken.body === undefined) {
          throw new InvariantFailure(
            `${where}: cannot delimit \`${name}\` — no ${taken.missing}. ` +
              "This check refuses a path, so it must be able to find the " +
              "path: a grep that matches nothing looks exactly like a grep " +
              "that passes. If the feed broadcast was renamed or " +
              "reformatted, repoint this check in the same change.",
          );
        }

        if (!taken.body.includes(sentinel)) {
          throw new InvariantFailure(
            `${where}: the slice taken for \`${name}\` does not contain ` +
              `\`${sentinel}\`, so the end marker \`${to}\` matched earlier ` +
              "than the block it delimits. The region is shorter than the " +
              "code it is meant to refuse, which is the silent-pass shape.",
          );
        }

        if (/overview/iu.test(withoutTrailingComments(taken.body))) {
          throw new InvariantFailure(
            `${where}: \`${name}\` mentions the overview frame. The feed ` +
              "broadcast runs ~332 times a minute (Task 4.1.6, measured on " +
              "the deployed gateway), it goes to every browser regardless " +
              "of subscription, and `sameLiveFeedView` does not suppress an " +
              "overview change the way it suppresses an unchanged `feed`. " +
              "The overview rides the `bars` path, on its own publish.",
          );
        }
      }

      // **One place builds the frame.** Counting encode sites rather than
      // files is `one-subscriber-on-the-upstream-socket`'s recorded lesson:
      // counting files left a second subscriber added beside the first
      // invisible, and a second publish added beside the first is the same
      // shape. Zero is the state until Story 4.2 adds the frame.
      const gateway = "apps/backend/src/market-gateway.ts";
      const built = [...readOnce(gateway).matchAll(/type:\s*"overview"/gu)].map(
        (match) => `offset ${String(match.index)}`,
      );

      if (built.length > 1) {
        throw new InvariantFailure(
          `${String(built.length)} places in ${gateway} build an ` +
            "`overview` frame, expected at most 1:\n      " +
            built.join("\n      ") +
            "\n    One computation for every browser (Task 4.1.1's decision " +
            "1). A second encode is a second cadence nobody chose.",
        );
      }
    },
  },

  {
    id: "one-home-for-the-live-change",
    claim:
      "`previousClose` is read as a change BASIS in exactly one module — " +
      "`packages/shared/src/live-change.ts` — and no shipped file that can " +
      "reach both halves of the join, or that divides by a close, computes " +
      "the move itself instead of calling `changeFromClose`.",
    check() {
      // **A producer walk, not a call-site count** (Task 4.2.3), in
      // `the-consolidated-word-has-one-producer`'s family. More callers of
      // `changeFromClose` is the DESIRED state here — it is now called by two
      // processes — so counting them would be a check that goes red when the
      // thing it protects is working.
      //
      // ## What the defect actually looks like
      //
      // Not a second copy of the function. A backend author who needs *the
      // change since the previous close*, has the live map and has the stored
      // closes, writes `(live.close - close.close) / close.close` and gets a
      // correct-looking number for most of the day. What they do not write is
      // the **same-session branch**: the nightly backfill writes today, so
      // between it and the next open the store's last session and the live
      // bar's session MEET, and that expression reports ≈0.00% for every
      // security on the screen — well-formed, correctly-formatted,
      // correctly-coloured numbers saying the market did not move.
      //
      // So there are two clauses, and the second is the one that catches it:
      // a re-implementation that reads only `close.close` never mentions
      // `previousClose` at all.
      const SOURCE_ROOTS = [
        "apps/backend/src",
        "apps/frontend/src",
        "packages/shared/src",
      ];

      // `.stories.` is excluded with the tests: a story builds a
      // `SecurityLastClose` literal to render a state, which is a fixture
      // rather than a producer.
      const shipped = [];

      const walk = (dir) => {
        for (const child of readdirSync(dir)) {
          const path = resolve(dir, child);
          if (statSync(path).isDirectory()) {
            if (child !== "fixtures" && child !== "node_modules") walk(path);
            continue;
          }
          if (!/\.tsx?$/u.test(child)) continue;
          if (/\.(?:test|process|database|stories)\.tsx?$/u.test(child))
            continue;
          shipped.push({
            path: relative(REPO_ROOT, path),
            // `withoutTrailingComments`, not `withoutComments`: every clause
            // below treats the PRESENCE of `changeFromClose(` as a pass, so a
            // trailing comment naming it is an exemption anybody can write.
            text: withoutTrailingComments(readFileSync(path, "utf8")),
          });
        }
      };

      for (const root of SOURCE_ROOTS) walk(resolve(REPO_ROOT, root));

      // ## Clause one — where the basis field may be READ
      //
      // Three modules, and only one of them is reading it for its VALUE. The
      // other two carry the field across a boundary and are named with the
      // reason, because a bare "exactly one module" is not true of this tree
      // and never was: the shaping note for this task recorded *zero
      // occurrences outside `last-close.ts`*, and the measured answer on
      // 2026-09-26 was five modules. A check written from that premise would
      // have been red on the day it landed.
      //
      // `previousClose:` as a property — the type declaration in
      // `securities-response.ts` and `market-bars.ts`, the response schema,
      // the row mapper — is deliberately NOT counted. Declaring and writing a
      // field is carriage; `.previousClose` is somebody deciding what to
      // measure from.
      const BASIS_READERS = [
        {
          path: "packages/shared/src/live-change.ts",
          why: "the one basis choice",
        },
        {
          path: "packages/shared/src/securities-response.ts",
          why: "the wire predicate, which checks the field's TYPE",
        },
        {
          path: "apps/backend/src/routes/securities.ts",
          why: "the row-to-wire mapper, which copies the field untouched",
        },
        {
          // Added 2026-09-26 by Task 4.2.4. The same kind as the entry above
          // and for the same reason: `toSecurityLastClose` is a row-to-wire
          // mapper that copies the field untouched so `changeFromClose` can
          // choose a basis from it later. It is the SECOND such mapper in the
          // tree, which is recorded beside it as a condition — a third is the
          // trigger to merge them.
          path: "apps/backend/src/last-closes-cache.ts",
          why: "the cache's row-to-wire mapper, which copies it untouched",
        },
      ];

      const readers = shipped.filter((file) =>
        /\.previousClose\b/u.test(file.text),
      );

      // The anchor. Every named reader must still contain a read, or this
      // check is asserting the absence of something that has simply moved —
      // `CLAUDE.md`'s *a grep that matches nothing looks exactly like a grep
      // that passes*.
      for (const { path, why } of BASIS_READERS) {
        if (!readers.some((file) => file.path === path)) {
          throw new InvariantFailure(
            `${path} no longer reads \`.previousClose\`, and it is this ` +
              `check's anchor for ${why}. If the basis moved, repoint this ` +
              "check in the same change; a list of expected readers that " +
              "matches nothing passes vacuously.",
          );
        }
      }

      const extra = readers
        .map((file) => file.path)
        .filter((path) => !BASIS_READERS.some((known) => known.path === path));

      if (extra.length > 0) {
        throw new InvariantFailure(
          `${String(extra.length)} shipped module(s) outside the named ` +
            "carriers of `previousClose` read it as a basis:\n      " +
            extra.join("\n      ") +
            "\n    The basis choice is `changeFromClose`'s and it is one " +
            "function for both processes. A second reader is a second " +
            "same-session branch, or — far likelier — the absence of one.",
        );
      }

      // ## Clause two — anything that can REACH both halves must call it
      //
      // **Rewritten 2026-09-26 after a review demonstrated the defect walking
      // straight through the first version.** That one selected on
      // `SecurityLastClose`, the WIRE type. The backend's own closes type is
      // `LastClose` (`market-bars.ts`), returned by `readLastCloses` — same
      // shape, no `session`, different name. So the file Story 4.3 will
      // actually write:
      //
      //     const observations = currentMarketState.all();
      //     const closes = await readLastCloses("1d");
      //     …((observed.bar.close - close.close) / close.close) * 100
      //
      // held neither name — `close` and `observed` are INFERRED — mentioned
      // `previousClose` nowhere, and the run said `32 invariants hold.` The
      // author of that file is also the likeliest re-implementer, because
      // holding a `LastClose` they cannot call `changeFromClose` without
      // converting first.
      //
      // So the population is keyed on the READERS of the closes rather than
      // on a type name, and there is a second, independent clause below keyed
      // on the arithmetic itself — because F2 is unfixable by greps: nothing
      // requires an author to write either type name anywhere.
      //
      // **What this therefore cannot see**, stated so the next reader does
      // not over-trust it: a join whose closes arrive through a parameter of
      // an inferred type, from a helper in a third file, with no mention of
      // `readLastCloses`, `closesAsOf`, `LastClose` or a division by a
      // `close`. That file is invisible here and always will be.
      const CLOSES_SIDE =
        /\b(?:SecurityLastClose|LastClose|readLastCloses|closesAsOf)\b/u;
      const LIVE_SIDE = /\b(?:Bar|CurrentObservation|currentMarketState)\b/u;

      const joins = shipped.filter(
        (file) => CLOSES_SIDE.test(file.text) && LIVE_SIDE.test(file.text),
      );

      // Raised from 3 to the measured figure, because a floor well under the
      // population lets two sites stop matching unnoticed.
      const JOIN_SITES_ON_2026_09_26 = 6;

      if (joins.length < JOIN_SITES_ON_2026_09_26) {
        throw new InvariantFailure(
          `Only ${String(joins.length)} shipped file(s) can reach both ` +
            "halves of the join, and there were " +
            `${String(JOIN_SITES_ON_2026_09_26)} on 2026-09-26. Either the ` +
            "types and readers were renamed or this walk stopped finding the " +
            "tree; both look identical to a pass.",
        );
      }

      /**
       * Is this file exempt from clause two, and why?
       *
       * Two exemptions, both written as SHAPES rather than filenames so a
       * future file of the same kind is covered — and both tightened after a
       * review slipped a full inline implementation through the first draft.
       */
      const exemption = (file) => {
        // **A pure re-export barrel.** The first draft exempted any file
        // matching `export { … changeFromClose … }`, which exempts the WHOLE
        // FILE: a re-export line at the top and a complete `sectorMove`
        // underneath was green. A barrel has no statement body at all, so
        // that is what is required — no arrow, no `function`, no `return`.
        // True of `packages/shared/src/index.ts`, the only intended
        // beneficiary.
        if (
          /export\s*\{[^}]*\bchangeFromClose\b/u.test(file.text) &&
          !/=>/u.test(file.text) &&
          !/\bfunction\b/u.test(file.text) &&
          !/\breturn\b/u.test(file.text)
        ) {
          return "a re-export barrel with no statement body";
        }

        // **The closes PRODUCER.** `market-bars.ts` declares `LastClose` and
        // implements `readLastCloses`; it supplies one half of the join and
        // performs none of it. Detected by the declaration rather than by
        // name, so the exemption moves if the type does.
        if (/export\s+interface\s+LastClose\b/u.test(file.text)) {
          return "the module that DECLARES the closes type";
        }

        // **A file that hands both halves to the one producer** (added
        // 2026-09-26 by Task 4.2.4, which is the task this clause was written
        // one task ahead of). `index.ts` holds `currentMarketState` and
        // constructs the closes cache, so it matches both sides — and it
        // performs no arithmetic at all: it passes them to
        // `buildMarketOverview`, whose own call count is held at one by
        // `one-producer-of-the-overview-aggregate`. Delegating to the one
        // implementation is the DESIRED state, and a clause that goes red on
        // it is a clause that goes red when the thing it protects is working.
        //
        // **It is safe because clause three does not honour it.** A file that
        // called the builder and also divided by a close would still be
        // caught there, by the arithmetic itself, whatever it is named.
        //
        // **It must not cover the module that DECLARES the builder**, which
        // is how the first version of this exemption was written and what
        // `pnpm break the-proxies-do-their-own-arithmetic` caught in the same
        // session: `market-overview.ts` contains `buildMarketOverview(` in
        // its own signature, so the exemption swallowed the one file the
        // break targets and the substitution went red on clause three alone.
        if (
          /\bbuildMarketOverview\(/u.test(file.text) &&
          !/function\s+buildMarketOverview\b/u.test(file.text)
        ) {
          return "a wiring site that hands both halves to the one producer";
        }

        return undefined;
      };

      const reimplementers = joins
        .filter(
          (file) =>
            !file.text.includes("changeFromClose(") &&
            exemption(file) === undefined,
        )
        .map((file) => file.path);

      if (reimplementers.length > 0) {
        throw new InvariantFailure(
          `${String(reimplementers.length)} shipped file(s) can reach both ` +
            "halves of the join and never call `changeFromClose`:\n      " +
            reimplementers.join("\n      ") +
            "\n    That is the shape of the re-implementation: it reads " +
            "`close.close`, it is right for most of the day, and on the " +
            "evening the backfill catches up it reports ≈0.00% for " +
            "everything. The arithmetic is " +
            "`packages/shared/src/live-change.ts`'s, for both processes.",
        );
      }

      // ## Clause three — a division by a close is this arithmetic
      //
      // Independent of the two type names, because an author writes neither
      // and TypeScript never asks them to. What they cannot avoid writing is
      // the division, and a percentage move whose denominator is a close is
      // the thing `changeFromClose` exists to be.
      //
      // Anchored on the one legitimate site: if `live-change.ts` stops
      // matching, the pattern has rotted and this clause is asserting the
      // absence of a shape it can no longer recognise.
      const CLOSE_DENOMINATOR =
        /\/\s*(?:[A-Za-z_$][\w$]*\.)?(?:close|previousClose|previous|basis\w*)\b/u;

      const dividers = shipped.filter((file) =>
        CLOSE_DENOMINATOR.test(file.text),
      );

      const ARITHMETIC_ANCHOR = "packages/shared/src/live-change.ts";

      if (!dividers.some((file) => file.path === ARITHMETIC_ANCHOR)) {
        throw new InvariantFailure(
          `${ARITHMETIC_ANCHOR} no longer divides by a close, and it is this ` +
            "clause's anchor. The pattern that recognises the arithmetic has " +
            "rotted, and a pattern matching nothing passes vacuously.",
        );
      }

      const dividing = dividers
        .filter((file) => !file.text.includes("changeFromClose("))
        .map((file) => file.path);

      if (dividing.length > 0) {
        throw new InvariantFailure(
          `${String(dividing.length)} shipped file(s) divide by a close ` +
            "without calling `changeFromClose`:\n      " +
            dividing.join("\n      ") +
            "\n    A percentage move measured from a close is " +
            "`changeFromClose`, whatever the operands are named. The branch " +
            "an inline version omits is the same-session one, and omitting " +
            "it is invisible until the evening the backfill catches up.",
        );
      }
    },
  },

  {
    id: "one-pairing-of-a-sector-and-its-benchmark",
    claim:
      "Which ETF is a sector's benchmark is written down in exactly one " +
      "place — `SECTOR_ETFS` in `packages/shared/src/security.ts` — and no " +
      "other shipped file pairs those tickers with anything.",
    check() {
      // **The defect is a PERMUTATION, and it is invisible** (Task 4.3.4).
      // `SECTOR_ETFS` is `Record<Sector, Ticker>`; the overview frame carries a
      // `symbol`, so somebody needs the inverse. A hand-written one — the
      // obvious thing to write, in the module that renders eleven rows — puts
      // XLV's figure on the Financials row with **every number on the screen
      // still right**: it satisfies every arithmetic guard in this repository,
      // passes every state grid, and is invisible in greyscale. The only thing
      // on the row that can contradict it is the printed ticker.
      //
      // ## Keyed on the tickers, because they are what cannot be avoided
      //
      // A re-implementer writes neither `SECTOR_ETFS` nor `Sector`, and
      // TypeScript never asks them to. What they cannot avoid writing is the
      // **symbols themselves**, more than one of them — an inverse map, a
      // `switch`, a lookup array and an `if` chain all do. So the clause is:
      // **no shipped file outside the one home names two or more of the
      // eleven.** One is an example (`sectorOfEtf("XLK")` in a docblock is not
      // a pairing); two is a table.
      //
      // **The first version of this clause required the ticker to be QUOTED,
      // and it passed green on the exact defect it forbids.** The file Task
      // 4.3.5 would write is
      // `Record<string, string> = { XLK: "Technology", XLV: "Health Care", … }`
      // — eleven bare identifier keys, not one of them a string literal, and
      // `pnpm break` would have proved nothing because a break edits the file
      // the check was written around. Produced and kept: `37 invariants hold.`
      // against all eleven pairings sitting in
      // `apps/frontend/src/components/SectorList/`. So the scan is over the
      // **word**, on comment-stripped text — a bare `XLK` token in code is a
      // key, an identifier or a string, and all three are the table.
      //
      // ## The corpus is derived, never a list here
      //
      // The eleven tickers are read out of `SECTOR_ETFS`' own literal. A
      // hard-coded list in this file would be the twelfth home of the thing
      // the check forbids, and `CLAUDE.md` records a check whose corpus was a
      // hard-coded file list as one of four guards that shipped green on the
      // defect they forbade.
      const HOME = "packages/shared/src/security.ts";
      const homeText = readFileSync(resolve(REPO_ROOT, HOME), "utf8");

      const record = /export const SECTOR_ETFS[^=]*=\s*\{([\s\S]*?)\n\};/u.exec(
        homeText,
      );

      if (record === null) {
        throw new InvariantFailure(
          `${HOME} no longer declares \`SECTOR_ETFS\` in the shape this ` +
            "check reads, so the corpus of tickers is empty and every clause " +
            "below would pass vacuously. Repoint it.",
        );
      }

      const tickers = [...record[1].matchAll(/"([A-Z]{2,5})"/gu)].map(
        (match) => match[1],
      );

      const sectors = /export const SECTORS = \[([\s\S]*?)\] as const;/u.exec(
        homeText,
      );
      const declared =
        sectors === null ? 0 : [...sectors[1].matchAll(/"[a-z_]+"/gu)].length;

      // The anchor: as many benchmarks as sectors, or the parse has rotted.
      if (declared === 0 || tickers.length !== declared) {
        throw new InvariantFailure(
          `read ${String(tickers.length)} benchmark ticker(s) against ` +
            `${String(declared)} declared sector(s) in ${HOME}. The two must ` +
            "agree — `SECTOR_ETFS` is total over the union by construction — " +
            "so a mismatch means this check is reading the wrong text.",
        );
      }

      // Word boundaries rather than quotes, so a bare object key counts —
      // and `\bXLE\b` does not match inside `XLRE`, which is the one pair in
      // this set where a substring match would double-count.
      const named = new RegExp(`\\b(?:${tickers.join("|")})\\b`, "gu");

      const offenders = [];

      const walk = (dir) => {
        for (const child of readdirSync(dir)) {
          const path = resolve(dir, child);
          if (statSync(path).isDirectory()) {
            if (child !== "fixtures" && child !== "node_modules") walk(path);
            continue;
          }
          if (!/\.tsx?$/u.test(child)) continue;
          // Tests and stories are excluded with the fixtures: a test naming
          // three ETFs is a fixture, and `one-home-for-the-live-change` draws
          // the same line for the same reason.
          if (/\.(?:test|process|database|stories)\.tsx?$/u.test(child)) {
            continue;
          }

          const relativePath = relative(REPO_ROOT, path);
          if (relativePath === HOME) continue;

          // Comments stripped, trailing ones included: this file's own
          // docblocks name `XLK` and `XLV` in prose, `universe.ts` explains at
          // length why it does not type them out, and `UniverseTable.tsx`
          // quotes an accessible name containing one. None of those is a
          // pairing, and this clause treats two occurrences as proof.
          const text = withoutTrailingComments(readFileSync(path, "utf8"));
          const found = new Set([...text.matchAll(named)].map((m) => m[0]));

          if (found.size > 1) {
            offenders.push(`${relativePath} (${[...found].sort().join(", ")})`);
          }
        }
      };

      for (const root of [
        "apps/backend/src",
        "apps/frontend/src",
        "packages/shared/src",
      ]) {
        walk(resolve(REPO_ROOT, root));
      }

      if (offenders.length > 0) {
        throw new InvariantFailure(
          `${String(offenders.length)} shipped file(s) name more than one ` +
            "sector benchmark ticker:\n      " +
            offenders.join("\n      ") +
            `\n    Two or more of those symbols in one file is a second copy ` +
            `of ${HOME}'s table, whatever it is spelled as. Derive it: ` +
            "`SECTOR_BY_ETF` in `packages/shared/src/sector-ranking.ts` is " +
            "the inverse, built once by mapping over `SECTORS`. A " +
            "hand-written pairing is where a permutation comes from, and a " +
            "permutation leaves every figure on the screen correct.",
        );
      }
    },
  },

  {
    id: "one-producer-of-the-overview-aggregate",
    claim:
      "`buildMarketOverview` has at most one call site in shipped backend " +
      "code — one computation for every browser.",
    check() {
      // **Task 4.1.1's decision 1, held mechanically**: the aggregate is
      // computed once where `currentMarketState` already lives, not
      // recomputed per page and not recomputed twice on the way out.
      //
      // ## It guards a symbol with no caller yet, on purpose
      //
      // Task 4.2.3 builds the join; Task 4.2.4 wires it to a frame. So the
      // count today is **zero**, and the claim is *at most one* rather than
      // *exactly one*. A check that only becomes meaningful after the code it
      // guards is written is a check that is written after the defect.
      //
      // What makes the zero case non-vacuous is the anchor below: the
      // DEFINITION must exist, exactly once. If the builder is renamed and
      // this is not repointed, the check fails rather than passing on an
      // absence.
      //
      // ## Call sites, never files
      //
      // `one-subscriber-on-the-upstream-socket` recorded this lesson the
      // expensive way: its first version counted files, and
      // `pnpm break a-second-subscriber-on-the-upstream-socket` caught it
      // immediately, because a second subscription added BESIDE the first one
      // left the count at 1 and the check green. That is also the likeliest
      // shape of the real regression here — a second publish added next to
      // the existing one.
      const sources = [];

      const walk = (dir) => {
        for (const child of readdirSync(dir)) {
          const path = resolve(dir, child);
          if (statSync(path).isDirectory()) {
            if (child !== "fixtures" && child !== "node_modules") walk(path);
            continue;
          }
          if (!child.endsWith(".ts")) continue;
          // **Widened past `.test.ts`, deliberately.** `index.process.test.ts`
          // and `market-bars.database.test.ts` both end in `.test.ts` today,
          // so the narrow test would have covered them — and the naming is a
          // convention nothing enforces (`CLAUDE.md`: a process-style test
          // named `foo.test.ts` runs in the fast suite). Spelling all three
          // means a `market-overview.database.ts` cannot quietly add a
          // counted call site.
          if (/\.(?:test|process|database)\.ts$/u.test(child)) continue;
          sources.push({
            path: relative(REPO_ROOT, path),
            // Trailing comments too. Today the count is 0 against a bound of
            // "at most 1", so a phantom call site in a comment is absorbed —
            // and the day Task 4.2.4 adds the real one, a comment naming
            // `buildMarketOverview(` would turn this red for nothing.
            text: withoutTrailingComments(readFileSync(path, "utf8")),
          });
        }
      };

      walk(resolve(REPO_ROOT, "apps/backend/src"));

      // ## Classifying every occurrence, after a review walked past the
      // first version
      //
      // That one matched `buildMarketOverview\s*\(` and split on a
      // `function ` lead. **A second exported `const buildMarketOverview =
      // (…) => …` in a new backend file was invisible to both branches** —
      // neither a definition nor a call site — so it neither disturbed the
      // real definition's count nor added one of its own. Green.
      //
      // So the scan is over the NAME, and every occurrence is classified.
      // Anything the classifier does not recognise is ignored (an import
      // specifier, a type position, an `export {}` line), and the two shapes
      // that hide call sites are refused outright.
      const definitions = [];
      const sites = [];
      const aliases = [];

      for (const source of sources) {
        for (const match of source.text.matchAll(/\bbuildMarketOverview\b/gu)) {
          const at = match.index;
          const before = source.text.slice(Math.max(0, at - 24), at);
          const after = source.text.slice(at + "buildMarketOverview".length);
          const where = `${source.path} offset ${String(at)}`;

          // `import { buildMarketOverview as build }` — every call site is
          // then spelled `build(` and this check cannot see one. Refused
          // rather than counted, because the alternative is a count that is
          // silently wrong.
          if (/^\s+as\s+\w/u.test(after)) {
            aliases.push(where);
            continue;
          }

          // `function buildMarketOverview(`, `const buildMarketOverview = (`,
          // and `buildMarketOverview = ` (a reassignment is a redefinition).
          // `==` and `=>` are excluded so a comparison is not a definition.
          if (
            /(?:function|const|let|var)\s+$/u.test(before) ||
            /^\s*=[^=>]/u.test(after)
          ) {
            definitions.push(where);
            continue;
          }

          if (/^\s*\(/u.test(after)) sites.push(where);
        }
      }

      if (aliases.length > 0) {
        throw new InvariantFailure(
          `${String(aliases.length)} place(s) rename \`buildMarketOverview\` ` +
            "on import:\n      " +
            aliases.join("\n      ") +
            "\n    An alias spells every call site as some other name, which " +
            "this check cannot count. A count that is silently wrong is " +
            "worse than no count, so the alias is refused rather than " +
            "followed.",
        );
      }

      if (definitions.length !== 1) {
        throw new InvariantFailure(
          `${String(definitions.length)} definitions of ` +
            "`buildMarketOverview` in apps/backend/src, expected exactly 1" +
            (definitions.length === 0
              ? ". This check refuses a second CALL site, so it must be able " +
                "to find the thing being called: a grep that matches nothing " +
                "looks exactly like a grep that passes. If the builder was " +
                "renamed or moved, repoint this check in the same change."
              : `:\n      ${definitions.join("\n      ")}`),
        );
      }

      if (sites.length > 1) {
        throw new InvariantFailure(
          `${String(sites.length)} call sites build the market overview, ` +
            "expected at most 1:\n      " +
            sites.join("\n      ") +
            "\n    One computation for every browser (Task 4.1.1's decision " +
            "1). A second is a second answer to one question, and the two " +
            "disagree the moment anything reads both.",
        );
      }
    },
  },

  // ## Task 4.2.6's two, both on the proxy strip's honest states
  //
  // The first keeps the staleness sentence in one place; the second keeps the
  // rule that produces it keyed on a calendar rather than on a duration. They
  // are separate because they fail separately: a second copy of the words is a
  // sentence that can be corrected alone, and a number in that file is a
  // threshold `LIVE-DATA.md` §11.2 refused with a measurement behind it.

  {
    id: "one-home-for-the-strip-staleness-sentence",
    claim:
      "`last prices of the session` is written in exactly one shipped " +
      "source file — `market-proxies.ts` — so the strip's staleness claim " +
      "cannot be corrected in one place and left standing in another.",
    check() {
      // **This is a CLAIM rather than a noun, which is why it is guarded and
      // `closing prices` is not.** The strip's other new words — `close`,
      // `closing prices` — are domain nouns this product already writes in
      // four files (`chart-alternative.ts`, `UniverseTable.tsx`,
      // `SecurityIdentity.tsx`), and a grep for one of those is a check
      // nobody can keep green: `one-home-for-the-feed-words` declines to
      // grep `live` for exactly that reason, and says so.
      //
      // `last prices of the session` is different in kind. It is a statement
      // that the figures beside it are **not current**, derived from the
      // calendar rather than read off the wire, and it is the only such
      // statement on a screen whose other surfaces are all silent about
      // staleness by decision (Story 3.10's one-home rule, five surfaces,
      // each with a measurement behind it). A second surface writing it is a
      // second staleness verdict on the landing page.
      const HOME = "apps/frontend/src/market/market-proxies.ts";
      const LITERAL = "last prices of the session";

      const homes = [
        resolve(REPO_ROOT, "apps/frontend/src"),
        resolve(REPO_ROOT, "apps/backend/src"),
        resolve(REPO_ROOT, "packages/shared/src"),
      ]
        .flatMap((directory) => sourceFilesUnder(directory))
        .filter(({ path }) => !/\.(?:test|stories)\.tsx?$/u.test(path))
        .filter(({ text }) => withoutComments(text).includes(LITERAL))
        .map(({ path }) => relative(REPO_ROOT, path));

      if (homes.length === 0) {
        throw new InvariantFailure(
          `No shipped source file writes "${LITERAL}". It is the strip's ` +
            "only staleness claim and it lives in " +
            `${HOME}; if the wording changed, change it here too — and read ` +
            "Task 4.2.6 first, because the sentence is the absolute rule the " +
            "universe table is deliberately not being given.",
        );
      }

      if (homes.length !== 1 || homes[0] !== HOME) {
        throw new InvariantFailure(
          `"${LITERAL}" should be written only in ${HOME}, and is in:\n      ` +
            homes.join("\n      ") +
            "\n      A second surface saying a figure is not current is a " +
            "second staleness verdict on the landing page, and Story 3.10 " +
            "settled that a degradation is announced in one place.",
        );
      }
    },
  },

  {
    id: "the-proxy-strip-dates-a-figure-from-a-calendar",
    claim:
      "The strip decides whether a figure is current by READING THE TRADING " +
      "CALENDAR: `market-proxies.ts` calls `marketSessionStateAt`, which is " +
      "ADR 0028's instrument and the only thing here that is not a duration.",
    check() {
      // **`LIVE-DATA.md` §11.2 refused a per-security staleness threshold
      // with a measurement behind it**: the ordinary maximum gap between one
      // security's bars is **187 minutes**, with a p50 of one minute, so a
      // surface reporting silence as a fault cries wolf on thin names all
      // day. Story 3.10 held that line and `ProxyReading.note` says so in as
      // many words — *an age, never a verdict*.
      //
      // The regression is not a verdict word, it is the calendar being
      // **replaced** by arithmetic: `if (now - instant > FIVE_MINUTES)`. That
      // reads as a repair, it is one line, and it is invisible in a green
      // suite because every fixture in this file is inside whatever window
      // its author picked. What is left behind is a file with no calendar
      // read in it, which is what this asserts and what the break performs.
      //
      // ## What this DOESN'T assert, and why the second half was deleted
      //
      // It shipped for one review round with a second clause: *and the file
      // holds no numeric literal but `0` and `1`*. That was a tripwire with a
      // hole at both ends and it is gone.
      //
      // It **missed** the thing it was for — `3e5` and `0x493e0` are 300,000
      // and neither matches `\b\d[\d_]*\b` as a bare integer, so
      // `const STALE_AFTER_MS = 3e5;` satisfied it. And it would have gone
      // **red for nothing**, repeatedly: `withoutComments` strips only
      // full-line `//`, so a trailing comment carrying a digit — this file's
      // house style — trips it, as do `slice(0, 10)`, `toFixed(2)`, a
      // `/\d{4}-\d{2}/` regex and any string containing a year. Its own
      // first version went red on `figures.length > 0`.
      //
      // A check that fires on an innocent edit long before it fires on the
      // defect is a check somebody eventually deletes in a hurry, and the
      // honest version is the clause above: the calendar is read here, and a
      // reviewer reads what it is read FOR.
      const path = "apps/frontend/src/market/market-proxies.ts";
      const text = withoutComments(
        readFileSync(resolve(REPO_ROOT, path), "utf8"),
      );

      // **The CALL rather than the name**, so an import left behind by a
      // substitution does not satisfy it — which is exactly the residue the
      // break leaves and the shape the real regression takes.
      if (!text.includes("marketSessionStateAt(")) {
        throw new InvariantFailure(
          `${path} no longer CALLS \`marketSessionStateAt\`. The absolute ` +
            "staleness rule is keyed on ADR 0028's instrument — the last " +
            "session whose bell has rung — and nothing else in this " +
            "repository answers that question without a clock in the browser " +
            "(`a-second-clock-on-the-landing-page` refuses one on this " +
            "route). A rule that has stopped reading the calendar is reading " +
            "a duration, and `LIVE-DATA.md` §11.2 refused one with a " +
            "measurement behind it: an ordinary maximum gap of 187 minutes " +
            "between one security's bars.",
        );
      }
    },
  },

  {
    id: "the-landing-route-has-a-spec-that-drives-a-figure",
    claim:
      "A browser spec drives an `overview` frame and asserts the figure it " +
      "carries — because a spec that only checks the seven regions are NAMED " +
      "passes long before any of them holds a number.",
    check() {
      // **Written because the spec it guards went missing from the PR named
      // after it.** Story 4.2's close, 2026-09-26. Task 4.2.8 wrote a 584-line
      // spec, ran it green, and recorded it in its task file, in
      // `docs/GAPS.md` and in a commit message — and the commit staged
      // `planning` and `docs` only, so `main` received the prose and not the
      // mechanism. `pnpm verify` and `pnpm e2e` were both green without it,
      // because a suite cannot miss a file it has never heard of.
      //
      // That is `CLAUDE.md`'s own shape: a claim about a mechanism reads
      // identically whether the mechanism is there or not.
      //
      // **It keys on the FRAME rather than on a filename or a test id.** A
      // filename makes a rename look like a regression; a `data-testid` is not
      // how this spec locates anything (it reaches the cell through the row
      // holding the symbol). Driving `type: "overview"` is the one thing only a
      // spec that actually exercises this wire can do — `landing-route.spec.ts`
      // scores zero on it, which is the discrimination this check needs.
      // `sourceFilesUnder` returns `{ path, text }` and throws an
      // InvariantFailure of its own if the directory is empty or gone — so the
      // "a glob that matches nothing looks like a pass" case is already
      // covered upstream and is not re-implemented here.
      const specs = sourceFilesUnder(resolve(REPO_ROOT, "e2e/specs")).filter(
        ({ path }) => path.endsWith(".spec.ts"),
      );

      const driving = specs.filter(({ text }) => {
        const body = withoutComments(text);
        return (
          body.includes('type: "overview"') &&
          /toHaveText|toContainText|innerText|textContent/u.test(body)
        );
      });

      if (driving.length === 0) {
        throw new InvariantFailure(
          "no spec under e2e/specs drives an `overview` frame and asserts the " +
            "figure it carries. Asserting the seven region NAMES is not this: " +
            "a region is named long before it holds a number, and the spec " +
            "that asserted a proxy figure was once written, run green, " +
            "recorded in three documents and never committed.",
        );
      }
    },
  },

  {
    id: "each-overview-section-names-its-own-set",
    claim:
      "The join's answer is split into sections by POSITIVE membership — each " +
      "section names the set it is about, and the movers section names the " +
      "one eligibility pass — so widening the join cannot flood a section " +
      "that was defined as `everything else`.",
    check() {
      // **Task 4.4.1, and it is a defect found by shaping Story 4.4 rather
      // than by anything mechanical.** The proxy section was
      // `entries.filter((entry) => !isSectorSymbol.has(entry.symbol))` — true
      // of exactly the four index proxies while the join is handed fifteen
      // symbols, and true of **every non-sector security in the universe** the
      // moment Story 4.4's breadth count widens it to 503 equities. Hundreds
      // of cells in a strip built for four, a ~56 KB frame, and
      // `market-proxies.ts`' five folds (`newest`, `sharedBasis`,
      // `sharedClosingSession`) computing over 507 entries. **No compile
      // error, no failing test**, and every individual number on the screen
      // correct.
      //
      // Story 4.3's comment there warned against a *slice* and could not cover
      // this, because the sector predicate is positive and the proxy one was
      // not — so the two sections looked symmetrical and were not.
      //
      // ## Why the claim is "names its own set" rather than "has no `!`"
      //
      // A negation is the shape the defect took, not the thing that is wrong
      // with it. What is wrong is that *not a sector* is a definition of
      // **everything else**, and a section of a frame is never everything
      // else. So the check asserts the positive form: the `proxies:` predicate
      // must consult a proxy set and the `sectors:` predicate a sector set,
      // which is a clause the re-implementer cannot avoid writing — the
      // property names are the wire's and the call is
      // `toWireMarketOverview`'s.
      //
      // Three failure modes, and all three are red rather than absent: a
      // negated predicate, a section handed the answer **whole**
      // (`proxies: entries`), and a section taken by `.slice()`, which Story
      // 4.3's own comment already argued against in prose with nothing
      // checking it.
      //
      // ## No match is a FAILURE
      //
      // A grep whose anchor has moved returns nothing and reads exactly like a
      // pass — `CLAUDE.md`'s own note about a prose re-measure rotting
      // silently. So a missing `proxies:` or `sectors:` property, or more than
      // one of either, is reported rather than tolerated.
      const path = resolve(REPO_ROOT, "apps/backend/src/index.ts");
      const text = withoutTrailingComments(readFileSync(path, "utf8"));

      // ## The `movers` row, added 2026-10-08 by Task 4.5.4
      //
      // **It names a BINDING rather than a membership set, and that is the
      // shape taken from `breadth-is-counted-over-the-equities-alone` rather
      // than from the two rows above.** Two reasons it cannot be theirs: a
      // top-N legitimately *is* a slice, which the refusal below forbids
      // outright; and the movers section is not a subset of the join's answer
      // picked by symbol, it is the **eligibility pass** over the equity
      // subset — one array, shared with the breadth count, which is what makes
      // `movers.eligible` and `breadth.measured` the same number rather than
      // two filters agreeing.
      //
      // So the two halves live in two checks, deliberately: this one asserts
      // the section names the one binding, and
      // `breadth-is-counted-over-the-equities-alone` asserts that binding is
      // one pass over the 503 equities. The defect this row refuses is
      // `movers: eligibleMoves(entries, …)` — a **second** pass over the whole
      // universe, which typechecks, runs, and draws five plausible rows
      // including `SPY` and `XLE` beside the two regions already asserting
      // those same figures, with a denominator that disagrees with the count
      // directly above it on screen.
      /**
       * What each section's predicate must name, by the section's own name.
       *
       * `what` is the noun the failure message uses, because the three rows
       * fail for two different reasons.
       */
      const SECTIONS = [
        ["proxies", /\bisProxySymbol\b/u, "a POSITIVE membership test"],
        ["sectors", /\bisSectorSymbol\b/u, "a POSITIVE membership test"],
        ["movers", /\beligible\b/u, "the one eligibility pass"],
      ];

      for (const [section, owns, what] of SECTIONS) {
        // The property and everything up to the end of its line. The call is
        // Prettier-formatted, so one property is one line; a property that
        // wrapped would read short here and fail on the positive clause rather
        // than pass on a truncation.
        const found = [
          ...text.matchAll(new RegExp(`\\b${section}:([^\\n]*)`, "gu")),
        ];

        if (found.length !== 1) {
          throw new InvariantFailure(
            `apps/backend/src/index.ts has ${String(found.length)} ` +
              `\`${section}:\` properties, expected exactly 1. This check ` +
              "reads the one place the overview aggregate is split into " +
              "sections; it cannot read a split that has moved or been " +
              "duplicated, and a grep that matches nothing looks exactly " +
              "like a pass.",
          );
        }

        const predicate = found[0][1];

        if (!owns.test(predicate)) {
          throw new InvariantFailure(
            `the overview's \`${section}:\` section does not name its own ` +
              `set:\n      ${section}:${predicate}\n    It must consult ` +
              `${String(owns)} — ${what}. A section ` +
              "defined as the complement of another one, or handed the " +
              "join's answer whole, is correct only for as long as nobody " +
              "widens the join: Story 4.4's breadth count asks it about 503 " +
              "equities, and a complement then puts all of them in the proxy " +
              "strip with no compile error and no failing test.",
          );
        }

        if (/!/u.test(predicate) || /\.slice\(/u.test(predicate)) {
          throw new InvariantFailure(
            `the overview's \`${section}:\` section is taken by negation or ` +
              `by position:\n      ${section}:${predicate}\n    Positive ` +
              "membership only. A negation is the complement of some other " +
              "set and grows when the join does; a slice silently shifts the " +
              "day a fifth index proxy or a twelfth sector is tracked.",
          );
        }
      }
    },
  },

  {
    id: "breadth-is-counted-over-the-equities-alone",
    claim:
      "Breadth is counted over the 503 EQUITIES, by positive membership — " +
      "never over the join's whole answer, which holds the four index " +
      "proxies and the eleven sector SPDRs beside their own constituents.",
    check() {
      // **The owner's Gate 1 decision 2 for Story 4.4, and the defect it
      // guards is the shortest thing to write.** Task 4.4.4 widened the join
      // to all 518 because breadth is the first consumer that needs the whole
      // universe — so `entries` is now sitting there, already the right shape,
      // and `marketBreadth(entries, …)` compiles, runs, and produces three
      // plausible counts over the wrong set.
      //
      // What is wrong with it is not an error anybody can see: a count that
      // includes `SPY` and the eleven sector SPDRs **alongside their own
      // constituents** makes this region and `Market proxies` non-independent
      // — in a one-sided market all fifteen fall the same way as the names
      // inside them, shifting the figure by up to ~2.9 points toward the
      // majority. Every number on screen is individually correct and the
      // region answers a question no reader asked.
      //
      // **This check's own first draft passed wrongly on exactly that**, and
      // the transcript is in Task 4.4.4: it asserted the `breadth:` section
      // was derived from `entries`, which the defect satisfies by being the
      // defect. The clause that catches it is the one the re-implementer
      // cannot avoid writing — the SET, named positively — so the check is in
      // two halves: the section must name the binding, and the binding must
      // name the set.
      //
      // ## No match is a FAILURE, for `each-overview-section-names-its-own-set`'s
      // reason
      //
      // A grep whose anchor has moved returns nothing and reads exactly like a
      // pass. Both halves are therefore "exactly one, or report it".
      const path = resolve(REPO_ROOT, "apps/backend/src/index.ts");
      const text = withoutTrailingComments(readFileSync(path, "utf8"));

      /**
       * The two statements, each as a property or binding and everything to
       * the end of its line, with the clause that line must contain.
       *
       * The call is Prettier-formatted, so each is one line; a line that
       * wrapped would read short here and fail on its clause rather than pass
       * on a truncation.
       */
      /**
       * **Re-scoped 2026-10-08 by Task 4.5.4, and deliberately rather than by
       * widening a regex.**
       *
       * `marketBreadth` took the entries until that task extracted the
       * eligibility pass so the movers could be a selection from the **same
       * array** this count is a tally of. So `breadth:` no longer names
       * `equities` directly and the old two-link chain would have gone **red
       * on the desired state** — the failure mode where the honest repair is
       * to make the check say less. It says more instead: the chain is now
       * three links, and the middle one is the claim that was previously
       * free.
       *
       *   breadth:  →  the eligible binding  →  equities  →  isEquitySymbol
       *
       * Each link is *exactly one, or report it*, for the reason below: a grep
       * whose anchor has moved returns nothing and reads exactly like a pass.
       */
      const CLAUSES = [
        ["breadth:", /\bbreadth:([^\n]*)/gu, /\beligible\b/u],
        ["const eligible =", /\bconst eligible =([^\n]*)/gu, /\bequities\b/u],
        [
          "const equities =",
          /\bconst equities =([^\n]*)/gu,
          /\bisEquitySymbol\b/u,
        ],
      ];

      for (const [what, where, owns] of CLAUSES) {
        const found = [...text.matchAll(where)];

        if (found.length !== 1) {
          throw new InvariantFailure(
            `apps/backend/src/index.ts has ${String(found.length)} ` +
              `\`${what}\` statements, expected exactly 1. This check reads ` +
              "the one place the breadth count is taken and the one place " +
              "its set is derived; it cannot read either if it has moved or " +
              "been duplicated, and a grep that matches nothing looks " +
              "exactly like a pass.",
          );
        }

        if (!owns.test(found[0][1])) {
          throw new InvariantFailure(
            `\`${what}\` does not name ${String(owns)}:\n      ${what}` +
              `${found[0][1]}\n    Breadth is counted over the 503 equities, ` +
              "derived from `UNIVERSE` by `kind` and tested positively. The " +
              "join sees all 518 since Task 4.4.4, so the whole answer is " +
              "sitting there in the right shape — and a count over it " +
              "includes the fifteen funds beside their own constituents, " +
              "which makes this region and `Market proxies` " +
              "non-independent and shifts the figure by up to ~2.9 points " +
              "with every number on screen individually correct.",
          );
        }
      }

      // And positively: a complement of the two fund sets is the same defect
      // spelled as a filter, and it grows the day a sixteenth fund is tracked.
      const binding = [...text.matchAll(/\bconst equities =([^\n]*)/gu)][0][1];

      if (/!/u.test(binding) || /\.slice\(/u.test(binding)) {
        throw new InvariantFailure(
          `the equity set is taken by negation or by position:\n      ` +
            `const equities =${binding}\n    Positive membership only — ` +
            "`equityTickers()` derives it from `UNIVERSE` by `kind`. *Not a " +
            "fund* is a definition of everything else, which is what the " +
            "proxy section already cost once.",
        );
      }

      // ## And exactly ONE eligibility pass — the clause the chain above
      // cannot hold on its own (Task 4.5.4)
      //
      // The three links say the breadth count is a tally of a pass over the
      // equities. They say nothing about a **second** pass: `movers:
      // eligibleMoves(entries, { asOf, marketOpen })` leaves every link
      // intact, typechecks, runs, and ranks over all 518 — which puts `SPY`
      // and `XLE` among the day's movers twenty-four pixels from two regions
      // already asserting those same figures, and gives the ranked list a
      // denominator that disagrees with the count directly below it.
      //
      // One pass is also the only thing that makes `movers.eligible` and
      // `breadth.measured` the same number **by construction** rather than by
      // two filters agreeing — and the thing that drifts between two filters
      // is never the loop, it is the predicate: the five-minute window, the
      // `state === "live"` test and the session filter all live inside it.
      const passes = [...text.matchAll(/\beligibleMoves\(/gu)];

      if (passes.length !== 1) {
        throw new InvariantFailure(
          `apps/backend/src/index.ts calls \`eligibleMoves(\` ` +
            `${String(passes.length)} time(s), expected exactly 1. The ` +
            "eligibility pass is shared: `Market breadth` tallies it and " +
            "`Movers` ranks it, so a second call is two populations with one " +
            "screen's worth of sentences about them. A pass over `entries` " +
            "rather than `equities` ranks the fifteen funds beside their own " +
            "constituents and still satisfies every clause above.",
        );
      }
    },
  },

  {
    id: "the-settle-is-one-token-twice",
    claim:
      "The sector list's travel states `--motion-duration-settle` TWICE — as " +
      "the delay and as the duration — with no time literal in the " +
      "stylesheet and no timer or `transitionend` in the component, so " +
      "`prefers-reduced-motion` collapses both halves together.",
    check() {
      // **The defect is a delay, and every re-implementation of this treatment
      // writes one.**
      //
      // The two events the sector region shows — a figure changing and a
      // position changing — are separated in **time**: one settle of stillness,
      // then one settle of travel. `LIVE-DATA.md` §7.4 is why (n=445 minutes,
      // intra-minute spread 243 ms p50 against a 900 ms decay, so all eleven
      // discs are lit together for ~650 ms however many frames carried them),
      // and the owner took it on 2026-09-27 against drawing them coincident.
      //
      // What makes it safe under `prefers-reduced-motion` is **one token in
      // both positions**: `tokens.css` resolves `--motion-duration-settle` to
      // `0ms` at the one layer that answers the preference, so the pause and
      // the travel vanish together. Any other spelling leaves a reader who
      // asked for less motion **waiting 240 ms for nothing** — a literal
      // `240ms` in the delay, a `transition-delay` of its own, a
      // `setTimeout` before the release, or a release hung off `transitionend`
      // (which at `0ms` may never fire at all, leaving the row under a
      // transform nobody cleared, on its neighbour's line, with every printed
      // ordinal correct).
      //
      // **Three clauses, because the delay has three homes and only one of
      // them is the obvious one.** A check over the stylesheet alone is green
      // against a `setTimeout` in the component, which is exactly where the
      // next author will put it: the sequencing reads as logic rather than as
      // style.
      const STYLES =
        "apps/frontend/src/components/RankedList/RankedList.module.css";
      const COMPONENT =
        "apps/frontend/src/components/RankedList/RankedList.tsx";

      const css = readFileSync(resolve(REPO_ROOT, STYLES), "utf8");

      // The declaration itself, whatever Prettier did to its line breaks.
      const declaration = /transition:[^;]*;/gu;
      const transitions = [...css.matchAll(declaration)].map(([text]) =>
        text.replaceAll(/\s+/gu, " "),
      );

      if (transitions.length !== 1) {
        throw new InvariantFailure(
          `${STYLES} holds ${String(transitions.length)} \`transition\` ` +
            "declarations; this check reads one. **One declaration for all " +
            "eleven rows is also what makes a stagger unrepresentable** — " +
            "refused twice, because it encodes an order the data does not " +
            "have and lengthens the gesture from 240 ms to 640.",
        );
      }

      const [travel = ""] = transitions;
      const settles = travel.split("var(--motion-duration-settle)").length - 1;

      if (settles !== 2) {
        throw new InvariantFailure(
          `${STYLES}'s travel names \`--motion-duration-settle\` ` +
            `${String(settles)} times, not twice:\n      ${travel}\n` +
            "    The stillness and the travel are the SAME token in the delay " +
            "and the duration. Anything else — a literal, a second token, a " +
            "`transition-delay` of its own — is a pause reduced motion cannot " +
            "collapse, and the reader who asked for less motion waits 240 ms " +
            "for nothing.",
        );
      }

      // A time literal anywhere in the declaration is the same defect wearing
      // the token's clothes: `240ms 240ms` reads identically on screen and is
      // 240 ms of nothing under the preference.
      if (/\d\s*m?s\b/u.test(travel)) {
        throw new InvariantFailure(
          `${STYLES}'s travel carries a time literal:\n      ${travel}\n` +
            "    Reduced motion is answered at the token layer, once. A " +
            "component that spells a duration is the only way to get that " +
            "wrong.",
        );
      }

      const source = readFileSync(resolve(REPO_ROOT, COMPONENT), "utf8");

      // **The call forms rather than the words**, so the comments that explain
      // why neither is used do not trip it: `withoutComments` here strips only
      // full-line `//`, and this file argues both traps in block comments.
      const timers = [
        ["setTimeout(", "a timer before the release"],
        ['transitionend"', "a release hung off `transitionend`"],
        ["onTransitionEnd", "a release hung off `transitionend`"],
        // **The Web Animations API is the re-implementation this check would
        // otherwise be green on**, and it is the likeliest one: a FLIP written
        // with `element.animate([...], { duration: 240, delay: 240 })` is a
        // textbook FLIP, it needs no stylesheet at all, and **it does not
        // consult `prefers-reduced-motion`** — so the reader who asked for less
        // motion gets the whole gesture, at full length, with nothing in the
        // tree saying so.
        [".animate(", "the Web Animations API, which reads no media query"],
      ].filter(([token = ""]) => source.includes(token));

      if (timers.length > 0) {
        throw new InvariantFailure(
          `${COMPONENT} reaches for ${timers
            .map(([, what]) => what)
            .join(" and ")}. The inverse and its release are written in ONE ` +
            "commit — applied with the transition suppressed, one forced " +
            "reflow, then removed — so the element's resting state is " +
            "`transform: none` before the effect returns and there is nothing " +
            "left to clear. A timer is a delay JavaScript owns, which reduced " +
            "motion cannot resolve to zero; `transitionend` at `0ms` may not " +
            "fire at all, and the row is left sitting on its neighbour's line " +
            "with every printed ordinal correct — which is what would make it " +
            "survive a review.",
        );
      }
    },
  },

  {
    id: "one-classifier-for-the-direction-of-a-move",
    claim:
      "Which of three buckets a move falls into is decided in exactly one " +
      "place — `directionOf` in `packages/shared/src/price-direction.ts` " +
      "— and no other shipped file classifies a percentage by comparing " +
      "it against zero.",
    check() {
      // **The three existing guards on this seam cannot see a second
      // classifier, and that is measured rather than assumed** (Task 4.4.2).
      //
      //   - `one-producer-of-the-overview-aggregate` counts join call sites
      //     and `type: "overview"` encodes;
      //   - `one-home-for-the-live-change`'s strongest clause keys on **a
      //     division by a close** — and a count classifies by
      //     **comparison**, so it has no division to match;
      //   - `one-pairing-of-a-sector-and-its-benchmark` is about the ticker
      //     table.
      //
      // So `percent > 0 ? "advancing" : percent < 0 ? "declining" :
      // "unchanged"` passes all three. Produced before this check existed, in
      // `apps/backend/src/market-breadth.ts`, and the run said
      // `39 invariants hold.`
      //
      // ## What the defect costs, which is why a comparison is worth a guard
      //
      // Two things, and the second is the one nothing else would catch.
      //
      // **It classifies on the raw sign.** A +0.004% move prints `0.00%` and
      // would be counted an advancer — a breadth figure reading *312
      // advancing* beside 312 rows reading `0.00%`, which is the same
      // three-channels-disagreeing defect `PriceChange` was built to prevent,
      // one level up and expressed as a total.
      //
      // **And `NaN > 0` and `NaN < 0` are both false**, so every non-finite
      // figure lands in the final `else`. In a renderer that is an em dash
      // beside `NaN%`; in a count it is the sentence *"518 unchanged, 0
      // advancing, 0 declining"* — a confident, well-formed claim that the
      // market did not move, which is ADR 0029's false impression as a total.
      // `directionOf` answers `undefined` and a count leaves the figure out of
      // every bucket.
      //
      // ## Keyed on the comparison, because it is what cannot be avoided
      //
      // A re-implementer writes neither `PriceDirection` nor `directionOf` and
      // TypeScript never asks them to — `CLAUDE.md`'s rule is to prefer a
      // clause the author cannot avoid writing, *the division, not the type
      // name*. Here it is the **comparison of a move against zero**. An `if`
      // chain, a ternary, a `switch (Math.sign(…))` and a `reduce` all
      // contain one.
      //
      // Narrowed to an operand that NAMES a move, because `> 0` on its own is
      // every length check in the tree. Measured on 2026-10-07: the pattern
      // matched **nothing** in `apps/backend/src`, `apps/frontend/src`,
      // `packages/shared/src` or `e2e` before the home was written —
      // including `formatChangePercent`, whose `percent > 0 ? "+" : MINUS` was
      // rewritten in the same task to read the classifier instead. That is the
      // whole reason this clause needs **no exemption list**: there is no
      // legitimate second site to exempt, so there is no escape hatch for the
      // next author to widen.
      //
      // **What it therefore cannot see**, stated so nobody over-trusts it: a
      // classifier whose operand is named `p`, `value` or `x`. Clause three
      // closes the one realistic version of that — rounding first and then
      // comparing a short-named local — and a bare `if (x > 0)` over a
      // percentage is invisible here and always will be.
      const HOME = "packages/shared/src/price-direction.ts";

      // The three SHIPPED roots, which is `one-home-for-the-live-change`'s
      // population and is deliberate rather than copied. **`e2e/specs` was in
      // this list for one run and came out**: the first red named
      // `overview-sector-region.spec.ts`, whose `shown()` helper spells a
      // figure from `percent > 0` under a docblock saying *written out here
      // rather than imported — importing it would assert that the
      // application agrees with itself*. A browser spec's job is to restate
      // the expected answer independently, so a guard against a second
      // implementation must not reach one. The finding is kept because it is
      // the distinction the check rests on: a second **producer** drifts, a
      // second **assertion** is the point.
      const SOURCE_ROOTS = [
        "apps/backend/src",
        "apps/frontend/src",
        "packages/shared/src",
      ];

      const shipped = [];

      const walk = (dir) => {
        for (const child of readdirSync(dir)) {
          const path = resolve(dir, child);
          if (statSync(path).isDirectory()) {
            if (child !== "fixtures" && child !== "node_modules") walk(path);
            continue;
          }
          if (!/\.tsx?$/u.test(child)) continue;
          if (/\.(?:test|process|database|stories)\.tsx?$/u.test(child))
            continue;
          shipped.push({
            path: relative(REPO_ROOT, path),
            // Comment-stripped, or the prose above — which spells the
            // defect out in full, twice — would be the first match.
            text: withoutTrailingComments(readFileSync(path, "utf8")),
          });
        }
      };

      for (const root of SOURCE_ROOTS) walk(resolve(REPO_ROOT, root));

      // ## Clause one — one declaration
      //
      // The cheap half, and it is not redundant: a second `directionOf` in a
      // second package would be imported by name and read as the one home at
      // every call site.
      const declarations = shipped.filter((file) =>
        /\bfunction\s+directionOf\b/u.test(file.text),
      );

      if (declarations.length !== 1 || declarations[0].path !== HOME) {
        throw new InvariantFailure(
          `\`directionOf\` is declared in ${String(declarations.length)} ` +
            "shipped file(s) and the one home is " +
            `${HOME}:\n      ` +
            (declarations.map((file) => file.path).join("\n      ") ||
              "(nowhere)") +
            "\n    A second declaration is a second rule, read as the first " +
            "one at every call site. A re-export is fine and is what " +
            "`apps/frontend/src/market/price-format.ts` does.",
        );
      }

      // ## Clause two — the comparison
      // **The first draft of this pattern read
      // `[A-Za-z_$][\w$]*(?:percent|change|move)` and passed green on the
      // probe file — `40 invariants hold.` against
      // `if (percent > 0) advancing += 1;`** It required at least one
      // character BEFORE the word, so it matched `changePercent` and
      // `sessionChangePercent` and missed the one identifier an author is
      // likeliest to use: `percent` itself. Kept here because it is
      // `CLAUDE.md`'s own warning arriving on the one check written to obey
      // it — a break would never have found it, since a break edits the
      // file the check was written around, and this was found by writing the
      // file the next author would write.
      //
      // The optional `(…)` is the call form: `displayedPercent(percent) > 0`
      // is the same classification with the rounding inlined.
      const CLASSIFY =
        /\b[\w$]*(?:percent|change|move)[\w$]*(?:\([^()]*\))?\s*[<>]=?\s*0\b/iu;
      const SIGN_OF = /\bMath\.sign\s*\(\s*[^)]*(?:percent|change|move)/iu;

      // The anchor. If the home stops matching, the pattern has rotted and
      // every clause below it passes vacuously — `CLAUDE.md`'s *a grep
      // that matches nothing looks exactly like a grep that passes*.
      const home = shipped.find((file) => file.path === HOME);

      if (home === undefined || !CLASSIFY.test(home.text)) {
        throw new InvariantFailure(
          `${HOME} no longer compares a named move against zero, and it is ` +
            "this check's anchor. Either the classifier moved or the pattern " +
            "that recognises one has rotted; repoint it in the same change.",
        );
      }

      const classifiers = shipped
        .filter(
          (file) =>
            file.path !== HOME &&
            (CLASSIFY.test(file.text) || SIGN_OF.test(file.text)),
        )
        .map((file) => file.path);

      if (classifiers.length > 0) {
        throw new InvariantFailure(
          `${String(classifiers.length)} shipped file(s) classify a move by ` +
            "comparing it against zero:\n      " +
            classifiers.join("\n      ") +
            "\n    Which bucket a move falls into is `directionOf`'s, for " +
            "both processes. A comparison on the RAW sign counts a +0.004% " +
            "move as an advancer while its own row prints `0.00%`, and it " +
            "counts every non-finite figure as unchanged — which in a " +
            "total is the sentence *518 unchanged, 0 advancing, 0 declining*.",
        );
      }

      // ## Clause three — rounded first, then compared
      //
      // The one realistic way to write the defect with a short-named local,
      // and the version an author who has READ `price-direction.ts` writes:
      //
      //     const shown = displayedPercent(percent);
      //     if (shown > 0) advancing += 1;
      //
      // Clause two cannot see `shown > 0`. But reaching for
      // `displayedPercent` and then comparing against zero is the
      // classification whatever the local is called, so the rounding helper's
      // own call sites are a second, independent population. Legitimate
      // callers compare moves against **each other** (`compareByMove`)
      // or take a magnitude (`fitSectorLadder`); none of them compares one
      // against zero.
      const rounders = shipped.filter(
        (file) =>
          file.path !== HOME && /\bdisplayedPercent\s*\(/u.test(file.text),
      );

      const ROUNDER_ANCHORS = [
        "packages/shared/src/sector-ranking.ts",
        "packages/shared/src/sector-ladder.ts",
      ];

      for (const path of ROUNDER_ANCHORS) {
        if (!rounders.some((file) => file.path === path)) {
          throw new InvariantFailure(
            `${path} no longer calls \`displayedPercent\`, and it is this ` +
              "clause's anchor: a population of zero rounders passes " +
              "vacuously whatever anybody writes.",
          );
        }
      }

      const roundThenCompare = rounders
        .filter((file) => /[<>]=?\s*0\b/u.test(file.text))
        .map((file) => file.path);

      if (roundThenCompare.length > 0) {
        throw new InvariantFailure(
          `${String(roundThenCompare.length)} shipped file(s) round a ` +
            "percentage to the displayed precision and then compare it " +
            "against zero:\n      " +
            roundThenCompare.join("\n      ") +
            "\n    That is `directionOf` written out with the guard left " +
            "off. Rounding first fixes the +0.004% half and leaves the " +
            "non-finite half: `displayedPercent(NaN)` is `NaN`, and it " +
            "compares false both ways.",
        );
      }
    },
  },
  {
    id: "one-comparator-for-the-order-of-a-move",
    claim:
      "The order two figures' moves put them in is decided in exactly one " +
      "place — `compareByMove` in `packages/shared/src/sector-ranking.ts`, " +
      "which `selectMovers` and `rankSectorFigures` both go through — and no " +
      "other shipped file subtracts or compares one move against another, or " +
      "rounds a percentage to the displayed precision and sorts.",
    check() {
      // **`docs/GAPS.md`'s second-comparator entry, discharged by Task
      // 4.5.2** — added 2026-09-27 by Task 4.3.7, which was asked to write
      // this guard and recorded three measured false starts instead. Story
      // 4.5 is the entry's named owner because it writes the second caller,
      // so it is the change that can say what the two have in common.
      //
      // ## What the three false starts were, and why none of them is below
      //
      // The proposal was *no shipped file both imports the figure type and
      // calls `.sort(` outside the comparator module*. It is **red today**:
      // `apps/frontend/src/market/sector-performance.ts` imports
      // `WireOverviewFigure` and calls `held.sort((left, right) => left.at -
      // right.at)` — Task 4.3.6's hold, which sorts by a **position a reader
      // pinned** and reads no figure at all. A file-level clause over `.sort(`
      // plus a move-field name also flags
      // `components/UniverseTable/UniverseTable.tsx`, where `changePercent` is
      // an imported **function** rather than the wire field. And exempting a
      // file by name exempts the most likely site of the defect.
      //
      // So none of the three clauses below is file-level over `.sort(`.
      //
      // ## Keyed on the arithmetic, because it is what cannot be avoided
      //
      // `CLAUDE.md`: *prefer a clause the re-implementer cannot avoid writing
      // — the division, not the type name.* A second ranking over moves
      // cannot be written without putting **two moves either side of one
      // operator**: a subtraction in a comparator body, or an inequality in a
      // ternary. It needs neither `compareByMove` nor `WireOverviewFigure`
      // nor `.sort(` — `toSorted`, a heap, a `reduce` and a hand-rolled
      // insertion all qualify — but all of them contain that operator.
      //
      // Measured 2026-10-08 over the three shipped roots, comment-stripped:
      // clause two's pattern matched **nothing at all** before the home was
      // rewritten to return a sign, including `sector-performance.ts`' hold
      // and `UniverseTable.tsx`. That is why there is no exemption list: there
      // is no legitimate second site to exempt, so there is no escape hatch
      // for the next author to widen.
      //
      // ## The draft that passed WRONGLY, and the transcript
      //
      // `docs/GAPS.md`'s own candidate was narrower — *the subtraction of two
      // displayed percentages*, `displayedPercent(a) - displayedPercent(b)`.
      // Run against `apps/backend/src/market-movers.ts`, the file the next
      // story would write (a `[...figures].sort((left, right) =>
      // (moveRankingKey(right) ?? 0) - (moveRankingKey(left) ?? 0))` with a
      // `?? 0` in it and a `.slice` at each end), the run reported
      // `45 invariants hold.` with that file in the walked population of 60.
      //
      // **Two things were wrong with it and the second is worse.** The next
      // author subtracts two *ranking keys*, not two *rounded* ones — they
      // have no reason to round at all, which is the +0.004% half of the
      // defect. And the clause **had no anchor and could never have had one**:
      // the home binds the two rounded figures to locals before comparing
      // them, so `displayedPercent(a) - displayedPercent(b)` has never
      // appeared in this repository. A grep that matches nothing looks exactly
      // like a grep that passes.
      //
      // ## What it cannot see, stated so nobody over-trusts it
      //
      // A comparator whose operands are named `a`, `b`, `ka` or `x`:
      // `(left, right) => keyOf(right) - keyOf(left)` is invisible to clause
      // two and always will be. Clause three closes the realistic version of
      // that — reaching for the rounding helper and then sorting — and the
      // residue is an author who re-derives the field, rounds nothing and
      // names nothing after a move, which is a different defect from the one
      // this module exists to prevent.
      const HOME = "packages/shared/src/sector-ranking.ts";

      // The three SHIPPED roots — `one-classifier-for-the-direction-of-a-move`'s
      // population, for its recorded reason: `e2e/specs` is deliberately out,
      // because a browser spec's job is to restate the expected answer
      // independently and a guard against a second *producer* must not reach
      // a second *assertion*.
      const SOURCE_ROOTS = [
        "apps/backend/src",
        "apps/frontend/src",
        "packages/shared/src",
      ];

      const shipped = [];

      const walk = (dir) => {
        for (const child of readdirSync(dir)) {
          const path = resolve(dir, child);
          if (statSync(path).isDirectory()) {
            if (child !== "fixtures" && child !== "node_modules") walk(path);
            continue;
          }
          if (!/\.tsx?$/u.test(child)) continue;
          if (/\.(?:test|process|database|stories)\.tsx?$/u.test(child))
            continue;
          shipped.push({
            path: relative(REPO_ROOT, path),
            // Comment-stripped, or the prose above — which spells the defect
            // out in full — would be the first match.
            text: withoutTrailingComments(readFileSync(path, "utf8")),
          });
        }
      };

      for (const root of SOURCE_ROOTS) walk(resolve(REPO_ROOT, root));

      // ## Clause one — one declaration of each
      //
      // The cheap half, and not redundant: a second `compareByMove` or a
      // second `selectMovers` in another package would be imported by name and
      // read as the one home at every call site.
      for (const name of ["compareByMove", "selectMovers"]) {
        const declarations = shipped.filter((file) =>
          new RegExp(String.raw`\bfunction\s+${name}\b`, "u").test(file.text),
        );

        if (declarations.length !== 1 || declarations[0].path !== HOME) {
          throw new InvariantFailure(
            `\`${name}\` is declared in ${String(declarations.length)} ` +
              `shipped file(s) and the one home is ${HOME}:\n      ` +
              (declarations.map((file) => file.path).join("\n      ") ||
                "(nowhere)") +
              "\n    A second declaration is a second rule, read as the " +
              "first one at every call site. A re-export is fine.",
          );
        }
      }

      // ## Clause two — two moves either side of one operator
      //
      // Read line by line, so the 32-character window either side of the
      // operator cannot straddle a statement. The window is what makes
      // `(b.changePercent ?? 0) - (a.changePercent ?? 0)` match: the `?? 0`
      // sits between the operand and the operator, and the obvious regex —
      // two move-named operands adjacent to the operator — does not see it.
      //
      // **The whitespace around the operator is Prettier's**, which is a
      // `pnpm verify` step, so `b.changePercent-a.changePercent` cannot
      // survive a formatted tree. Requiring it is what keeps `=>` out of the
      // `>` alternative.
      const MOVE = "(?:percent|change|move)";
      const ORDER_BY_MOVE = new RegExp(
        `${MOVE}[\\w$]*[^\\n]{0,32}?\\s(?:-|<=?|>=?)\\s[^\\n]{0,32}?${MOVE}`,
        "iu",
      );

      const matchingLines = (file) =>
        file.text.split("\n").filter((line) => ORDER_BY_MOVE.test(line));

      // The anchor. If the home stops matching, the pattern has rotted and
      // the clause passes vacuously.
      const home = shipped.find((file) => file.path === HOME);

      if (home === undefined || matchingLines(home).length === 0) {
        throw new InvariantFailure(
          `${HOME} no longer puts two named moves either side of one ` +
            "operator, and it is this check's anchor. Either the comparator " +
            "moved or the pattern that recognises one has rotted; repoint it " +
            "in the same change.",
        );
      }

      const comparators = shipped
        .filter((file) => file.path !== HOME && matchingLines(file).length > 0)
        .flatMap((file) =>
          matchingLines(file).map((line) => `${file.path}: ${line.trim()}`),
        );

      if (comparators.length > 0) {
        throw new InvariantFailure(
          `${String(comparators.length)} shipped line(s) order one move ` +
            "against another outside the one comparator:\n      " +
            comparators.join("\n      ") +
            `\n    That order is \`compareByMove\`'s, in ${HOME}, and a ` +
            "second one silently un-holds the rule it carries: *two figures " +
            "equal at displayed precision never swap*. Eleven sector ETFs " +
            "cluster inside one displayed step, so a raw comparison " +
            "re-orders the list up to ~16 times a minute with nothing on it " +
            "changing. Rank through `compareByMove`, `rankSectorFigures` or " +
            "`selectMovers`.",
        );
      }

      // ## Clause three — rounded to the displayed precision, and sorted
      //
      // The realistic way to write the defect with short-named locals, and the
      // version an author who HAS read the module writes:
      //
      //     const left = displayedPercent(a);
      //     const right = displayedPercent(b);
      //     rows.sort(() => right - left);
      //
      // Clause two cannot see `right - left`. But rounding to the displayed
      // precision and sorting in one file is a ranking on the displayed move
      // whatever the locals are called. It is **not** file-level over `.sort(`
      // alone — that is false start one — because the second half is the
      // rounding helper's own call sites, which is a population of two:
      // this module and `sector-ladder.ts`, which takes a magnitude and sorts
      // nothing.
      const SORTS = /\.(?:sort|toSorted)\s*\(/u;

      const rounders = shipped.filter((file) =>
        /\bdisplayedPercent\s*\(/u.test(file.text),
      );

      if (!rounders.some((file) => file.path === HOME)) {
        throw new InvariantFailure(
          `${HOME} no longer calls \`displayedPercent\`, and it is this ` +
            "clause's anchor: a population with no rounder in it passes " +
            "vacuously whatever anybody writes.",
        );
      }

      const roundThenSort = rounders
        .filter((file) => file.path !== HOME && SORTS.test(file.text))
        .map((file) => file.path);

      if (roundThenSort.length > 0) {
        throw new InvariantFailure(
          `${String(roundThenSort.length)} shipped file(s) round a ` +
            "percentage to the displayed precision and sort:\n      " +
            roundThenSort.join("\n      ") +
            "\n    A ranking on the displayed move is `compareByMove`'s, " +
            `in ${HOME}. This clause is keyed on the rounding helper's own ` +
            "call sites rather than on an identifier's name, so it holds " +
            "whatever the comparator's locals are called.",
        );
      }
    },
  },
  {
    id: "the-denominator-reaches-a-listener",
    claim:
      "The breadth region's spoken denominator sentence is rendered, and is " +
      "rendered into the accessibility tree — the printed ladder that carries " +
      "N is `aria-hidden`, so that clause is the only route by which the " +
      "denominator reaches a listener.",
    check() {
      // **Task 4.4.6, and the finding it repairs is a defect in no file.**
      //
      // N is printed exactly once on this region — the ladder's right endpoint
      // — and the ladder is `aria-hidden`, which is `RankedList`'s decision at
      // its own ladder, inherited correctly. The counts are correctly labelled,
      // the heading names the set, nothing is missing from the DOM. Read from
      // the **accessibility tree** rather than from the DOM, a listener gets
      // the three counts with nothing to measure them against — which is the
      // exact shape `EPIC.md` was written to prevent, arriving by the one route
      // nobody checked, on the story whose whole subject is the denominator.
      //
      // So the repair is a second *rendering* of one string, and the thing that
      // must not quietly stop being true is that the second rendering is **in
      // the tree**. Three ways it stops, all of them plausible and all of them
      // invisible to every test below a browser reading the a11y tree:
      //
      //   1. the spoken span is deleted as a duplicate — the two renderings sit
      //      in one `<p>` and read as one string said twice;
      //   2. the spoken span gains `aria-hidden`, by being swept with the
      //      sibling it sits beside, which legitimately has it;
      //   3. `.spoken` is "simplified" from the clip-rect idiom to
      //      `display: none` or `visibility: hidden`, both of which take an
      //      element out of the accessibility tree as well as off the screen —
      //      `a11y.module.css`'s own warning, which it says has been copied
      //      into three components and would have been three chances to make
      //      it.
      //
      // **A grep rather than a spec**, because the DOM is correct in every one
      // of those states and the only instrument that can tell them apart is
      // `Accessibility.getFullAXTree` in a real browser.
      const component = resolve(
        REPO_ROOT,
        "apps/frontend/src/components/BreadthLedger/BreadthLedger.tsx",
      );
      const text = withoutComments(readFileSync(component, "utf8"));

      // Every JSX expression rendering the spoken clause, with the opening tag
      // it sits inside. The tag is everything back to the nearest `<`, which is
      // robust to Prettier wrapping the attributes across lines.
      const rendered = [
        ...text.matchAll(/<([^<>]*)>\s*\{\s*[\w.]*claim\.spoken\s*\}/gu),
      ];

      if (rendered.length !== 1) {
        throw new InvariantFailure(
          `BreadthLedger.tsx renders \`claim.spoken\` in ` +
            `${String(rendered.length)} elements, expected exactly 1. The ` +
            "printed ladder that carries N is `aria-hidden`, so this clause " +
            "is the only delivery of the denominator to a listener — and a " +
            "region that drops it is a story about a denominator with no " +
            "denominator in it for that audience. A grep that matches " +
            "nothing looks exactly like a pass, so a missing one is reported " +
            "rather than tolerated.",
        );
      }

      const tag = rendered[0][1];

      if (/aria-hidden/u.test(tag)) {
        throw new InvariantFailure(
          `BreadthLedger.tsx hides the spoken denominator clause from the ` +
            `accessibility tree:\n      <${tag}>\n    It is the only route ` +
            "by which N reaches a listener; the element beside it carries " +
            "`aria-hidden` because it is the drawn twin, and sweeping both " +
            "silences the region's denominator entirely.",
        );
      }

      if (!/styles\.spoken/u.test(tag)) {
        throw new InvariantFailure(
          `BreadthLedger.tsx renders the spoken denominator clause without ` +
            `the visually-hidden class:\n      <${tag}>\n    It must be in ` +
            "the accessibility tree and not on the screen — N is already " +
            "printed 24 px above it at the ladder's right endpoint, and the " +
            "same number twice inside 24 px reads as a mistake.",
        );
      }

      // And the class has to be the clip-rect idiom rather than either of the
      // two ways of hiding that take an element out of the tree with it.
      const stylesheet = resolve(
        REPO_ROOT,
        "apps/frontend/src/components/BreadthLedger/BreadthLedger.module.css",
      );
      const rule = /\.spoken\s*\{([^}]*)\}/u.exec(
        withoutComments(readFileSync(stylesheet, "utf8")),
      );

      if (rule === null) {
        throw new InvariantFailure(
          "BreadthLedger.module.css has no `.spoken` rule. It is the class " +
            "the spoken denominator clause is rendered with, and a CSS " +
            "module class name that resolves to nothing is completely " +
            "silent: it typechecks, lints, builds and renders unstyled — " +
            "which here means the sentence is drawn on the screen beside a " +
            "ladder that already prints the same number.",
        );
      }

      if (!/composes:\s*visuallyHidden/u.test(rule[1])) {
        throw new InvariantFailure(
          `BreadthLedger.module.css's \`.spoken\` does not compose ` +
            `\`visuallyHidden\`:\n      {${rule[1].trim()}}\n    ` +
            "`display: none` and `visibility: hidden` remove an element from " +
            "the accessibility tree as well as from the page, which is the " +
            "exact opposite of what this class is for. The clip-rect idiom " +
            "has one home, in `styles/a11y.module.css`.",
        );
      }
    },
  },

  {
    id: "every-break-can-still-land",
    claim:
      "Every entry in `scripts/breaks.mjs` substitutes text that still exists " +
      "exactly once in the file it names.",
    check() {
      // **A break whose `find` no longer matches proves nothing, and nothing
      // noticed for a day.**
      //
      // `pnpm break` refuses loudly when a substitution does not land — the
      // harness is not the problem. The problem is that **breaks are not in
      // `pnpm verify`**, deliberately: several of them run the browser suite or
      // a database, and `verify` has neither. So an entry rots in silence and
      // the first symptom is somebody running it months later and finding that
      // the check it was written to prove has been unprovable since.
      //
      // Found on 2026-09-21 by Task 3.6.2's sweep: Task 3.4.5's and 3.4.6's
      // entries both keyed on a single-line `useArrival(symbol, …)` call that
      // Task 3.5.4 had given a third argument, which Prettier then wrapped. Two
      // arrival-rule checks were unprovable and every run stayed green.
      //
      // **This asserts the cheap half — that the text is still there — which is
      // the half that rots.** It cannot assert that the substitution still
      // expresses the defect; that needs running the break, which is what
      // `pnpm break` is for.
      const registry = resolve(REPO_ROOT, "scripts/breaks.mjs");
      const text = readAnchored(registry);

      // The anchor: entries are objects with `name`, `file` and `find`, and a
      // parse that silently found none would pass vacuously.
      const names = [...text.matchAll(/^\s{4}name:\s*"([^"]+)"/gmu)];

      if (names.length < 10) {
        throw new InvariantFailure(
          `scripts/breaks.mjs parsed to ${String(names.length)} entries; it ` +
            "had far more when this check was written. If the registry's " +
            "shape changed, change this check with it — a parse that finds " +
            "nothing looks exactly like a parse that passes.",
        );
      }

      // Import the registry rather than re-parsing its string literals: `find`
      // is often a concatenation across several lines, and a regex over source
      // would have to re-implement JavaScript to read one.
      return import(pathToFileURL(registry).href).then(({ BREAKS }) => {
        if (!Array.isArray(BREAKS) || BREAKS.length !== names.length) {
          throw new InvariantFailure(
            "scripts/breaks.mjs does not export a `BREAKS` array matching its " +
              "own `name:` count. This check reads the export; if the module " +
              "stopped providing one, it is asserting nothing.",
          );
        }

        const rotted = [];

        for (const entry of BREAKS) {
          const target = resolve(REPO_ROOT, entry.file);
          let body;

          try {
            body = readFileSync(target, "utf8");
          } catch {
            rotted.push(`${entry.name}: ${entry.file} is not there`);
            continue;
          }

          const hits = body.split(entry.find).length - 1;
          if (hits !== 1) {
            rotted.push(
              `${entry.name}: its \`find\` matches ${String(hits)} times in ` +
                `${entry.file}, not once`,
            );
          }
        }

        if (rotted.length > 0) {
          throw new InvariantFailure(
            `${String(rotted.length)} break entries can no longer land:\n      ` +
              rotted.join("\n      ") +
              "\n    A break that cannot be applied proves nothing, and " +
              "because breaks are not in `pnpm verify` nothing else will say " +
              "so. Repoint the entry, then run `pnpm break <name>` — this " +
              "check proves the text is still there, not that the " +
              "substitution still expresses the defect.",
          );
        }
      });
    },
  },
  {
    id: "the-ranking-states-its-own-denominator",
    claim:
      "The movers region's footer clause is built from the MOVERS section's " +
      "own `eligible` / `tracked` / window, never from the breadth section " +
      "— and it is rendered into the accessibility tree, which is the only " +
      "route by which a denominator reaches a listener in a region that " +
      "prints none.",
    check() {
      // **Task 4.5.6, and both halves are defects that look exactly like
      // correct code.**
      //
      // ## Half one — the figures must be the movers section's
      //
      // `breadth.measured` and `movers.eligible` are **the same number by
      // construction**: one eligibility pass over one array, consumed twice,
      // which `breadth-is-counted-over-the-equities-alone` permits exactly one
      // of. So building the ranked region's sentence from the breadth section
      // is numerically identical, draws the same words in every state anybody
      // photographs, and is still wrong — `encodeBreadth` drops the **whole**
      // breadth section on one non-finite count (ADR 0031), and the region
      // then goes silent about its denominator in precisely the state
      // `WireMoverLists.eligible` was added to survive. That is a ranked list
      // with no denominator, which is the one thing Story 4.5 must not ship.
      //
      // The clause is the import rather than a field name, because a module
      // cannot read a section it cannot reach: `movers.ts` may not import from
      // a module named for breadth, and may not name the wire's `breadth`
      // property at all. Both are things the re-implementer **cannot avoid
      // writing** — the wire's field is called `breadth` and the only shipped
      // builder of the breadth clause lives in `market-breadth.ts`.
      //
      // The positive half is the anchor: the builder must read all four of the
      // section's own fields, so the window and the session are **read rather
      // than spelled**. A `5` typed into the sentence is the second home for a
      // number a rollback can move.
      //
      // ## Half two — the clause must reach the accessibility tree
      //
      // `the-denominator-reaches-a-listener` guards breadth's, where the
      // repair was a second rendering. This region's shape is different and
      // the hazard is sharper: it draws **no ladder and prints no
      // denominator**, so the footer is the only delivery of the figure to
      // **either** audience — and three of its siblings in the same region
      // legitimately carry `aria-hidden` (`RankedList`'s `.rules` and
      // `.ladder`). A sweep leaves the DOM correct, every component test
      // green, axe silent, and the region's only denominator unreachable.
      const reader = resolve(REPO_ROOT, "apps/frontend/src/market/movers.ts");
      const words = resolve(
        REPO_ROOT,
        "apps/frontend/src/market/measured-set.ts",
      );

      // **Three files and four fields, each "or report it"**: a grep whose
      // anchor has moved returns nothing and reads exactly like a pass.
      //
      // The split is the design: `movers.ts` reads the two **figures** off its
      // own section and hands the qualifier whole to `measured-set.ts`, which
      // is the one home for the WORDS both regions say. So the window and the
      // session are named in the builder rather than at either call site —
      // which is what makes them read and never spelled, and what makes the
      // two sentences unable to disagree about the basis.
      const ANCHORS = [
        [reader, "eligible", /\beligible\b/u, "the denominator"],
        [reader, "tracked", /\btracked\b/u, "the size of the set"],
        [
          reader,
          "describeMeasuredSet",
          /\bdescribeMeasuredSet\b/u,
          "the one builder of the clause both regions state",
        ],
        [
          words,
          "windowMinutes",
          /\bwindowMinutes\b/u,
          "the live grammar's window",
        ],
        [words, "session", /\bsession\b/u, "the session grammar's session"],
      ];

      for (const [path, field, pattern, what] of ANCHORS) {
        if (!pattern.test(withoutComments(readAnchored(path)))) {
          throw new InvariantFailure(
            `${relative(REPO_ROOT, path)} never names \`${field}\` — ` +
              `${what}. Every figure in the region's footer is **read** off ` +
              "the frame: a literal `503` is a lie with no symptom the day a " +
              "constituent is delisted, and a literal `5` is a second home " +
              "for a window a rollback can put two values apart from the " +
              "gateway's. And a second builder is two sentences 200 px apart " +
              "that can disagree about the window, the session, the set or " +
              "the count. If the clause moved, repoint this check in the " +
              "same change — a grep that matches nothing looks exactly like " +
              "a pass.",
          );
        }
      }

      // And it may not reach the breadth section, by either route.
      const movers = [
        reader,
        resolve(REPO_ROOT, "apps/frontend/src/components/Movers/Movers.tsx"),
      ];

      for (const path of movers) {
        const text = withoutComments(readAnchored(path));
        const reaching = text
          .split("\n")
          .filter((line) => /\bbreadth\b/iu.test(line));

        if (reaching.length > 0) {
          throw new InvariantFailure(
            `${relative(REPO_ROOT, path)} reaches the breadth section:\n` +
              `      ${reaching.map((line) => line.trim()).join("\n      ")}` +
              "\n    `breadth.measured` and `movers.eligible` are the same " +
              "number by construction — one eligibility pass, consumed " +
              "twice — so this is invisible in every state anybody " +
              "photographs. It is still wrong: `encodeBreadth` drops the " +
              "whole breadth section on one non-finite count, and the ranked " +
              "region then states no denominator at all in exactly the state " +
              "`WireMoverLists.eligible` exists for. Read the movers " +
              "section's own fields; the shared WORDS live in " +
              "`measured-set.ts`, which names neither region.",
          );
        }
      }

      // ## The footer element, and the attribute that silences it
      const component = withoutComments(
        readAnchored(
          resolve(REPO_ROOT, "apps/frontend/src/components/Movers/Movers.tsx"),
        ),
      );

      // The opening tag of every element carrying the footer's class. The tag
      // is everything back to the nearest `<`, which is robust to Prettier
      // wrapping attributes across lines.
      const footers = [
        ...component.matchAll(/<([^<>]*styles\.claim[^<>]*)>/gu),
      ];

      if (footers.length !== 1) {
        throw new InvariantFailure(
          `Movers.tsx has ${String(footers.length)} elements carrying ` +
            "`styles.claim`, expected exactly 1. It is the region's footer " +
            "and the only place a denominator is stated on this surface; a " +
            "grep that matches nothing looks exactly like a pass, so a " +
            "missing one is reported rather than tolerated.",
        );
      }

      // **And the string it renders is the VIEW's**, which is the escape the
      // import clause above cannot see: `MarketOverview.tsx` already holds a
      // `breadth` with a `claim` on it, so `<Movers view={movers}
      // claim={breadth.claim} />` reaches the breadth section without either
      // movers file ever naming it. Every rendering of the clause must be
      // rooted at `view.claim`, whose only producer is `marketMovers`, which
      // reads `overview.movers` — a closed path from the wire to the screen.
      const renderings = [
        ...component.matchAll(/([\w.]*)\bclaim\.(?:drawn|spoken)\b/gu),
      ];

      if (renderings.length === 0) {
        throw new InvariantFailure(
          "Movers.tsx renders neither `claim.drawn` nor `claim.spoken`. The " +
            "footer clause is the region's only denominator; a grep that " +
            "matches nothing looks exactly like a pass, so its absence is " +
            "reported rather than tolerated.",
        );
      }

      const foreign = renderings
        .filter((match) => match[1] !== "view.")
        .map((match) => match[0]);

      if (foreign.length > 0) {
        throw new InvariantFailure(
          `Movers.tsx renders the footer clause from something other than ` +
            `its own view:\n      ${foreign.join("\n      ")}\n    The ` +
            "only producer of a `MarketMovers` is `marketMovers`, which " +
            "reads `overview.movers` — so rooting every rendering at " +
            "`view.claim` is what makes the path from the wire to the screen " +
            "closed. `MarketOverview.tsx` holds a `breadth` with a `claim` " +
            "on it two lines away, and handing that in reaches the droppable " +
            "section without either movers file naming it.",
        );
      }

      if (/aria-hidden/u.test(footers[0][1])) {
        throw new InvariantFailure(
          `Movers.tsx hides the region's only denominator from the ` +
            `accessibility tree:\n      <${footers[0][1]}>\n    This ` +
            "region draws no ladder and prints no figure the clause could " +
            "defer to, so the footer is the whole delivery of *what the " +
            "lists were ranked over* — to a listener and to everybody else. " +
            "Three of its siblings legitimately carry `aria-hidden` " +
            "(`RankedList`'s `.rules` and `.ladder`), which is what makes " +
            "sweeping it the plausible edit; the DOM stays correct, every " +
            "component test stays green and axe stays silent.",
        );
      }
    },
  },
  {
    id: "the-population-is-never-a-literal",
    claim:
      "No shipped sentence states the size of the tracked universe as a " +
      "literal. Every surface that names the population reads it off the " +
      "frame, so the phrase `we track` never appears in a string literal " +
      "beside a digit.",
    check() {
      // **Task 4.4.8, and it is a defect that shipped for a day in the one
      // story whose entire subject is the denominator.**
      //
      // `MarketOverview.tsx` read *"Advancing, declining and unchanged among
      // the 503 companies we track"* in the state where the frame arrived and
      // its breadth section was **refused** — which is precisely the state
      // where this screen has no readable denominator. The produced state grid
      // drew the consequence: a frame carrying `tracked: 400`, its section
      // refused, and the region saying **503**. Reachable by rollback.
      //
      // Everywhere else in Story 4.4 the set size is read off the frame,
      // because `BreadthClaim`'s own docblock says a literal is *a lie with no
      // symptom the day a constituent is delisted* — and a sentence is the one
      // place that rule has no compiler behind it. The repair was **no number**
      // rather than a different one, which is ADR 0029's defer rule applied to
      // a clause.
      //
      // ## Why the clause is `we track` rather than the number
      //
      // `CLAUDE.md`'s rule: prefer a clause the re-implementer **cannot avoid
      // writing**. A grep for `503` rots the day the universe changes size and
      // says nothing about `518`, `500` or whatever the next curation holds —
      // and it would fire on an HTTP status, of which this frontend discusses
      // several. **`we track` is this product's own phrase for the
      // population**, written identically in the ledger's heading, in its
      // spoken claim and in the region's sentence, and anybody stating the
      // population in words will write it. So the check is: a string or
      // template literal containing that phrase may not contain a digit.
      //
      // An interpolation is how the honest version is written and reads as no
      // digit at all — `` `Of the ${String(tracked)} we track` `` passes,
      // `"Of the 503 we track"` does not.
      const files = shippedSourceFiles();

      // Every string and template literal in shipped source, with its file.
      // Three quote styles, each refusing its own delimiter and honouring a
      // backslash escape — enough for this tree, and a literal spanning a
      // newline inside quotes is a syntax error in the two that could.
      const literals = files.flatMap(({ path, text }) =>
        [
          ...text.matchAll(
            /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/gu,
          ),
        ].map((match) => ({ path, literal: match[0] })),
      );

      const naming = literals.filter(({ literal }) =>
        /we track/u.test(literal),
      );

      // **The anchor.** A population of zero passes vacuously, and the phrase
      // moving or being reworded is exactly the change that would make this
      // check silent while the defect it forbids becomes writable again.
      if (naming.length === 0) {
        throw new InvariantFailure(
          "No shipped literal contains the phrase `we track`, and this " +
            "clause is anchored on it. Either the population sentence was " +
            "reworded — in which case repoint this check at the new phrase — " +
            "or it was deleted, and a region that counts over a universe no " +
            "longer says which universe.",
        );
      }

      const withDigits = naming.filter(({ literal }) => /\d/u.test(literal));

      if (withDigits.length > 0) {
        throw new InvariantFailure(
          `${String(withDigits.length)} shipped literal(s) state the ` +
            "population as a figure rather than reading it off the frame:\n      " +
            withDigits
              .map(({ path, literal }) => `${path}\n        ${literal}`)
              .join("\n      ") +
            "\n    A literal population is a lie with no symptom the day a " +
            "constituent is delisted — and in the state where the breadth " +
            "section is REFUSED there is no denominator to state at all, so " +
            "the honest sentence carries no number. Interpolate the frame's " +
            "own `tracked`, or say nothing.",
        );
      }
    },
  },
  {
    id: "every-row-variant-restates-its-tracks",
    claim:
      "In `RankedList.module.css`, every selector that states an explicit " +
      "`grid-template-columns` outside the narrow block states one inside it " +
      "too. No width inherits a track list.",
    check() {
      // **Rule 2 of that stylesheet, as a check rather than as a comment**
      // (Task 4.5.1), and it is the one claim the movers row left standing
      // that nothing guarded.
      //
      // The file's own header states it: *every width states its own track
      // list and none inherits*, because a grid item with nowhere to go is
      // placed in an implicit track — and inside a `subgrid`, which cannot
      // grow columns beyond the range it adopts, that implicit track is a
      // **second row of the `<li>`**. This repository has already paid for it
      // once: leaving `.bar` out of the narrow block's hide list made every
      // row 33 px instead of 26 and the region 503 instead of 461, found by
      // `pnpm probe` and by nothing else. jsdom computes no layout, so every
      // unit, component and integration test in this tree passes against it.
      //
      // ## Why the clause is the DIVISION rather than a class name
      //
      // `CLAUDE.md`: prefer a clause the re-implementer cannot avoid writing.
      // A grep for `.movers` inside the narrow block is keyed on today's
      // incidentals — it is green the day somebody adds a third variant and
      // forgets it, which is exactly the defect, and it is red the day the
      // class is renamed, which is not. What a re-implementer **cannot**
      // avoid is the shape: a row variant *is* a `grid-template-columns`
      // declaration, so the check pairs the declarations either side of the
      // narrow block and reports any that exist only outside it.
      //
      // `subgrid` is excluded deliberately and is not an exception to the
      // rule: a subgrid adopts the parent's tracks rather than stating any, so
      // it has nothing to restate — `.list`, `.quiet` and `.row` are correct
      // as they are, and a check that demanded their restatement would be
      // demanding the bug.
      const path = resolve(
        REPO_ROOT,
        "apps/frontend/src/components/RankedList/RankedList.module.css",
      );
      const css = readAnchored(path);

      // Comments first, so a brace inside prose cannot move the parser — the
      // file is mostly prose.
      const source = css.replaceAll(/\/\*[\s\S]*?\*\//gu, "");

      /** Every `prelude { body }` at one nesting level, brace-matched. */
      const blocksIn = (text) => {
        const blocks = [];
        let index = 0;
        let preludeStart = 0;

        while (index < text.length) {
          if (text[index] !== "{") {
            index += 1;
            continue;
          }

          let depth = 1;
          let end = index + 1;
          while (end < text.length && depth > 0) {
            if (text[end] === "{") depth += 1;
            else if (text[end] === "}") depth -= 1;
            end += 1;
          }

          blocks.push({
            prelude: text.slice(preludeStart, index).trim(),
            body: text.slice(index + 1, end - 1),
          });
          index = end;
          preludeStart = index;
        }

        return blocks;
      };

      /** The selectors in these blocks that state a real track list. */
      const statingTracks = (blocks) =>
        new Set(
          blocks
            .filter(({ prelude }) => !prelude.startsWith("@"))
            .filter(({ body }) => {
              const declared = /grid-template-columns\s*:\s*([^;]+);/u.exec(
                body,
              );
              return declared !== null && !declared[1].includes("subgrid");
            })
            .flatMap(({ prelude }) =>
              prelude.split(",").map((selector) =>
                // One space between combinators, whatever the formatter did.
                selector.trim().replaceAll(/\s+/gu, " "),
              ),
            ),
        );

      const top = blocksIn(source);

      const narrow = top.find(
        ({ prelude }) =>
          prelude.startsWith("@media") && /width\s*<\s*37rem/u.test(prelude),
      );

      // **The anchor.** No narrow block means either the breakpoint moved — in
      // which case this check must be repointed rather than passing — or the
      // row stopped changing shape at one column, which is a design change
      // nobody should make silently.
      if (narrow === undefined) {
        throw new InvariantFailure(
          "RankedList.module.css has no `@media (width < 37rem)` block. The " +
            "narrow row is where the bar, the rule overlay and the ladder " +
            "come off and the tracks are restated; if the breakpoint moved, " +
            "repoint this check at it.",
        );
      }

      const wide = statingTracks(top);
      const restated = statingTracks(blocksIn(narrow.body));

      // The second anchor: a stylesheet that states no track list at all
      // would satisfy the subset test vacuously.
      if (wide.size === 0) {
        throw new InvariantFailure(
          "No selector in RankedList.module.css states a `grid-template-" +
            "columns` outside the narrow block, so this check is asserting " +
            "nothing. The row's tracks are its whole geometry — if they have " +
            "moved to another file, this check moves with them.",
        );
      }

      const inherited = [...wide].filter((selector) => !restated.has(selector));

      if (inherited.length > 0) {
        throw new InvariantFailure(
          `${String(inherited.length)} row variant(s) state a track list ` +
            "above 37rem and none below it, so that width inherits one:\n      " +
            inherited.join("\n      ") +
            "\n    A grid item with nowhere to go grows an implicit track, " +
            "and inside a subgrid that implicit track is a second row of the " +
            "`<li>` — 33 px instead of 26, on every row, invisible to " +
            "everything below `pnpm probe`. Restate the tracks, even where " +
            "two widths come out identical.",
        );
      }
    },
  },
  {
    id: "the-universe-holds-no-ticker-wider-than-the-track",
    claim:
      "No symbol in the tracked universe is longer than five characters, and " +
      "the movers row's ticker track is wide enough to draw a five-character " +
      "one at both widths without clipping it.",
    check() {
      // **A claim about DATA, which is why it is here and not a comment**
      // (Task 4.5.8). `Movers` is the first region in the product to draw an
      // arbitrary equity ticker, and the width of its ticker track is sized to
      // the widest symbol the universe holds. The sector region's track was
      // sized the same way and its roster is eleven known funds; this one's
      // roster is whatever somebody curates next.
      //
      // The defect this exists to catch is **not a code change**. It is a row
      // added to `universe.ts` — `GOOGL.X`, a six-character symbol, a foreign
      // listing — which compiles, lints, passes every unit test and every
      // browser spec, and paints over the company name on one row of one
      // region at one width. `.symbol` is `white-space: nowrap` with no
      // `overflow`, and a grid item does not clip.
      //
      // ## The measurement, which is the only argument the numbers have
      //
      // Taken 2026-10-08 in the page's own `.symbol`, at `--font-size-dense`
      // (13 px) with `--letter-spacing-micro` (1.04 px): a five-glyph ticker
      // is **44.20 px** in the shipped face (`JetBrains Mono Variable`) and
      // **50.73 px** in `ui-monospace`, which is what a cold load renders
      // before the self-hosted face arrives and is the widest of the seven
      // families in `--font-data`. Beside the symbol sit the 8 px mark slot
      // and the flex gap before it — 8 px above 37rem, 4 below — so the track
      // floors are `50.73 + 8 + 8` and `50.73 + 4 + 8`.
      //
      // **The per-glyph arithmetic is deliberately not generalised.** The
      // cold-load face is proportional, not monospaced: `GOOGL` is 50.70 and
      // `BRK.B` is 43.86 at the same five characters. So the limit below is a
      // **character count** against a measured worst case, and a sixth
      // character is a re-measure rather than a multiplication.
      const MAX_TICKER_LENGTH = 5;

      // `50.73 + 8 + 8` and `50.73 + 4 + 8`, rounded down to the pixel.
      const TRACK_FLOOR = { wide: 66, narrow: 62 };

      const universe = readAnchored(
        resolve(REPO_ROOT, "apps/backend/src/universe.ts"),
      );

      // Every curated row is a `["SYM", "Name", "EXCHANGE"]` triple, and the
      // symbol is the first member. Keyed on the shape rather than on a
      // helper's name, because a row is added by typing a triple whatever the
      // constructor around it is called.
      // Measured 2026-10-08: **507** rows — the 503 equities and the four
      // index proxies — of which `1:10, 2:46, 3:285, 4:163, 5:3`, the three
      // being `BRK.B`, `CMCSA` and `GOOGL`. The eleven sector ETFs are not
      // triples here: they come from `SECTOR_ETFS` in
      // `packages/shared/src/security.ts`, they are the **sector** row's
      // roster, and that row has a track of its own — recorded so nobody
      // reads this population as the whole universe.
      const symbols = [
        ...universe.matchAll(/\[\s*"([^"]+)"\s*,\s*"[^"]*"\s*,/gu),
      ].map((found) => found[1]);

      // **The anchor.** The curated file is 500-odd rows; a population of a
      // handful means the shape changed and the check is asserting nothing.
      if (symbols.length < 100) {
        throw new InvariantFailure(
          `Only ${String(symbols.length)} curated row(s) were recognised in ` +
            "apps/backend/src/universe.ts, and the file holds the tracked " +
            'universe. The row shape this check reads — a `["SYM", ' +
            '"Name", "EXCHANGE"]` triple — has changed; repoint it in the ' +
            "same change rather than letting it pass over nothing.",
        );
      }

      const tooWide = symbols.filter(
        (symbol) => symbol.length > MAX_TICKER_LENGTH,
      );

      if (tooWide.length > 0) {
        throw new InvariantFailure(
          `${String(tooWide.length)} tracked symbol(s) are longer than ` +
            `${String(MAX_TICKER_LENGTH)} characters:\n      ` +
            tooWide.join(", ") +
            "\n    `Movers` draws the ticker in a fixed track sized to a " +
            "measured five-character worst case, and `.symbol` is " +
            "`white-space: nowrap` with no `overflow` — so a sixth character " +
            "paints over the mark slot and, at 390, over the company name. " +
            "Re-measure the symbol in the page's own `.symbol` in " +
            "`ui-monospace`, widen `.movers`' second track at BOTH widths, " +
            "and state the cost to the name — the arithmetic is in " +
            "RankedList.module.css beside `.movers`.",
        );
      }

      // The other side of the same claim: the track has to still be wide
      // enough. A check on the data alone is green the day somebody narrows
      // the track back to the sector row's 52.
      const css = readAnchored(
        resolve(
          REPO_ROOT,
          "apps/frontend/src/components/RankedList/RankedList.module.css",
        ),
      );

      const tracks = [
        ...css
          .replaceAll(/\/\*[\s\S]*?\*\//gu, "")
          .matchAll(
            /\.movers\s*\{[^}]*?grid-template-columns:\s*\S+\s+(\d+)px/gu,
          ),
      ].map((found) => Number(found[1]));

      // **The second anchor**, and it is the one that rots: two `.movers`
      // track lists exist because `every-row-variant-restates-its-tracks`
      // requires them, the wide one first in the file and the narrow one
      // inside the `@media` block. Anything else and the pairing below is
      // reading the wrong numbers.
      if (tracks.length !== 2) {
        throw new InvariantFailure(
          `${String(tracks.length)} \`.movers\` ticker track(s) were found ` +
            "in RankedList.module.css and there should be exactly two — the " +
            "wide one and the narrow restatement. Either the second track " +
            "stopped being a `px` length or a third variant arrived; " +
            "repoint this check at them.",
        );
      }

      const floors = [TRACK_FLOOR.wide, TRACK_FLOOR.narrow];
      const narrowed = tracks
        .map((track, at) => ({ track, floor: floors[at] }))
        .filter(({ track, floor }) => track < floor);

      if (narrowed.length > 0) {
        throw new InvariantFailure(
          `${String(narrowed.length)} \`.movers\` ticker track(s) are ` +
            "narrower than a five-character ticker needs:\n      " +
            narrowed
              .map(
                ({ track, floor }) =>
                  `${String(track)}px stated against a ${String(floor)}px floor`,
              )
              .join("\n      ") +
            "\n    A five-glyph symbol measures 50.73 px in the cold-load " +
            "face and the mark slot and its gap take 16 px above 37rem and " +
            "12 below. `GOOGL`, `CMCSA` and `BRK.B` then overflow a track " +
            "that does not clip — into the company name at 390, where the " +
            "gap is 4 px. The measurement is beside `.movers`.",
        );
      }
    },
  },
];

const failures = [];

// **`await`, and it is load-bearing rather than future-proofing.**
//
// The runner was synchronous until 2026-09-21, and a check that returned a
// promise would have had its rejection escape as an unhandled rejection while
// this loop recorded nothing and the run exited **0**. That is `CLAUDE.md`'s
// own warning — *an unhandled error is not a failed assertion, and the run can
// still exit 0* — which this repository has already paid for once, in a test
// suite that passed for two tasks while dialling a real socket.
//
// Awaiting a non-promise is a no-op, so every synchronous check above is
// unaffected.
for (const invariant of INVARIANTS) {
  try {
    await invariant.check();
  } catch (error) {
    if (!(error instanceof InvariantFailure)) throw error;
    failures.push({ invariant, message: error.message });
  }
}

if (failures.length > 0) {
  console.error("Invariants that no longer hold:\n");

  for (const { invariant, message } of failures) {
    console.error(`  ✗ ${invariant.id}`);
    console.error(`    ${invariant.claim}`);
    console.error(`    ${message}\n`);
  }

  console.error(
    `${String(failures.length)} of ${String(INVARIANTS.length)} invariants failed. ` +
      "Each one replaces an entry in docs/GAPS.md — read it there for why the " +
      "claim matters.",
  );
  process.exit(1);
}

console.log(`${String(INVARIANTS.length)} invariants hold.`);
