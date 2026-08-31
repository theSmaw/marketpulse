// Every component has stories. This is the check that says so.
//
// Task 1.4.5 established the rule — a component that cannot be viewed in
// isolation is a component nobody reviews in isolation — and a rule with
// nothing behind it is the same green-tick-that-means-nothing problem as the
// placeholder `test` scripts. So this runs in `pnpm verify`, between
// `format:check` and `test`.
//
// **What it proves:** that every component file has a sibling stories file.
//
// **What it does not prove, and must not be described as proving:**
//
//   1. That the stories inside it cover the component's permutations. Nothing
//      can check that cheaply — a variant union is a type, and this script does
//      not typecheck. The permutation convention is carried by the
//      `AllPermutations` story every component ships, and by review.
//   2. That a component declared inside another component's file has stories.
//      It cannot see one. The one-component-per-file convention is what makes
//      that limitation harmless, and it is the reason the convention exists
//      rather than a nicety.
//
// **Where the line falls**, decided in Task 1.5.3 and written here because this
// is the file that enforces it. A `.tsx` file under `src/components/` is
// workshop material and owes stories; a `.tsx` file anywhere else does not. The
// test for which side something belongs on is: *does it have states worth
// reviewing side by side?*
//
//   - `src/components/AppHeader` — three feed states, an optional detail line
//     and four current-route states. The only other way to review those is to
//     hard-code a status and click through the running application. In.
//   - `src/routes/*` — a route placeholder is one state made of two strings,
//     and a permutation grid over it would be one cell. Out (Task 1.5.2).
//   - `App.tsx` and `main.tsx` — the router's host and the mount. Neither
//     renders anything to look at. Out, as Task 1.4.5 left them.
//
// Note the second of those is not enforced by anything: a stateful component
// dropped into `src/routes/` escapes this check silently. The directory rule is
// the convention, and this script only holds up one end of it.
//
// Dependency-free on purpose: this workspace has no test runner until Story
// 1.9, and reaching for one here would take that story's decision.

import { readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

// Resolved from this file rather than from the working directory, so the script
// gives the same answer from a package directory as it does from the root.
const COMPONENTS_DIR = resolve(
  import.meta.dirname,
  "..",
  "apps",
  "frontend",
  "src",
  "components",
);

const REPO_ROOT = resolve(import.meta.dirname, "..");

const STORIES_SUFFIX = ".stories.tsx";

/**
 * Every `.tsx` file under the components directory, recursively.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function findTsxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findTsxFiles(path)));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(path);
    }
  }

  return files;
}

const tsxFiles = await findTsxFiles(COMPONENTS_DIR);

const componentFiles = tsxFiles.filter(
  (path) => !path.endsWith(STORIES_SUFFIX),
);

const storyFiles = new Set(
  tsxFiles.filter((path) => path.endsWith(STORIES_SUFFIX)),
);

const missing = componentFiles.filter(
  (path) => !storyFiles.has(path.replace(/\.tsx$/u, STORIES_SUFFIX)),
);

// A components directory with no components is a passing run today and would be
// a silently passing run forever if the directory were ever renamed. Say so
// rather than exiting 0 on an empty set.
if (componentFiles.length === 0) {
  console.error(
    `No components found under ${relative(REPO_ROOT, COMPONENTS_DIR)} — has the directory moved?`,
  );
  process.exit(1);
}

if (missing.length > 0) {
  console.error("Components without stories:\n");

  for (const path of missing) {
    const relativePath = relative(REPO_ROOT, path);
    const expected = relativePath.replace(/\.tsx$/u, STORIES_SUFFIX);
    console.error(`  ✗ ${relativePath}`);
    console.error(`    expected ${expected}\n`);
  }

  console.error(
    `${String(missing.length)} of ${String(componentFiles.length)} components have no stories.`,
  );
  process.exit(1);
}

console.log(
  `${String(componentFiles.length)} components, ${String(componentFiles.length)} stories files.`,
);
