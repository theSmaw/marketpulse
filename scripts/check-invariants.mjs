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
      "The wire's `sentAt` is read by no liveness or staleness rule, on " +
      "either side of the socket. It is a third clock reading, for " +
      "measurement only.",
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

      for (const path of GUARDED) {
        const text = withoutComments(
          readFileSync(resolve(REPO_ROOT, path), "utf8"),
        );
        if (text.includes("sentAt")) {
          throw new InvariantFailure(
            `${path} reads the send instant. \`sentAt\` is a measurement ` +
              "field on the wire and must not become a clock a status is " +
              "derived from — `STREAM-SEAM.md` §3 is what happened last " +
              "time two clocks were merged (ADR 0033).",
          );
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

      const shipped = [
        resolve(REPO_ROOT, "apps/frontend/src"),
        resolve(REPO_ROOT, "apps/backend/src"),
        resolve(REPO_ROOT, "packages/shared/src"),
      ].flatMap((directory) =>
        sourceFilesUnder(directory)
          .filter(({ path }) => !/\.(?:test|stories)\.tsx?$/u.test(path))
          .map(({ path, text }) => ({ path, text: withoutComments(text) })),
      );

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
