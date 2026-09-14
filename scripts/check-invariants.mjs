// Seven claims that used to be prose. This is the check that says they hold.
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
// Seven entries were a single grep over checked-in files. They are these.
//
// ## What this proves
//
// That seven specific, named properties of the tree hold right now. Each one is
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
