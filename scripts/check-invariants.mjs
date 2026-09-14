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

import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
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
      "The sentence explaining an empty window is written in exactly one " +
      "source file.",
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
      // **Anchored on a literal that must be FOUND**, not on one that must be
      // absent: a check whose passing condition is "no matches" passes just as
      // happily when the string it looks for has been renamed, which is how one
      // of the original seven invariants rotted. If this sentence is reworded,
      // this check goes red and names the new home rather than going quiet.
      const SENTENCE = "No bars stored for this window.";

      const homes = sourceFilesUnder(
        resolve(REPO_ROOT, "apps/frontend/src"),
      ).filter(
        ({ path, text }) =>
          !/\.(?:test|stories)\.tsx?$/u.test(path) && text.includes(SENTENCE),
      );

      if (homes.length === 0) {
        throw new InvariantFailure(
          `No source file contains ${JSON.stringify(SENTENCE)}. Either the ` +
            "sentence was reworded — in which case reword it here too, and " +
            "check the nine browser specs that match on it — or the empty " +
            "state stopped explaining itself, which is the defect this " +
            "guards.",
        );
      }

      if (homes.length > 1) {
        throw new InvariantFailure(
          "The sentence has more than one home:\n      " +
            homes
              .map(({ path }) => relative(REPO_ROOT, path))
              .join("\n      ") +
            "\n      Two visible copies inside the Price region is a " +
            "Playwright strict-mode failure in every browser spec that " +
            "locates a settled answer by this phrase, and CI's store makes " +
            "every chart there an `empty`.",
        );
      }
    },
  },

  {
    id: "one-home-for-the-coverage-phrase",
    claim:
      "The sentence saying how far a short answer reaches is written in one " +
      "source file and read by both the drawn and the spoken copy.",
    check() {
      // **The drift this prevents is the one Story 2.14 spends most of its
      // time on**, and it is invisible to every other instrument here: a
      // visible sentence and a spoken sentence about the same fact, written
      // separately, that agree on the day they are written and diverge on the
      // day one of them is reworded. Nothing renders both at once, no test that
      // reads one reads the other, and a reader who can see the screen never
      // hears the other copy.
      //
      // `PROVENANCE.md` §3.2 settles it as **one function, two readers**. This
      // is that arrangement as a grep.
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
    id: "one-home-for-the-feed-words",
    claim:
      "The words for a market feed are written once, in the shipped " +
      "vocabulary, and never in a renderer.",
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
      const VOCABULARY = "packages/shared/src/market-provenance.ts";

      const LITERALS = [
        "All US exchanges",
        "Trades reported by the IEX exchange only",
      ];

      const shipped = [
        resolve(REPO_ROOT, "apps/frontend/src"),
        resolve(REPO_ROOT, "apps/backend/src"),
        resolve(REPO_ROOT, "packages/shared/src"),
      ].flatMap((directory) =>
        sourceFilesUnder(directory)
          .filter(({ path }) => !/\.(?:test|stories)\.tsx?$/u.test(path))
          .map(({ path, text }) => ({ path, text: withoutComments(text) })),
      );

      for (const literal of LITERALS) {
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
];

const failures = [];

for (const invariant of INVARIANTS) {
  try {
    invariant.check();
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
