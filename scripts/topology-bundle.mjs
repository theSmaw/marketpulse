// **What each renderer candidate costs in bytes — Task 6.1.2.**
//
//   node scripts/topology-bundle.mjs
//
// ## The figure this does NOT produce, stated first because it is the one
// ## somebody will quote
//
// **This is not what `/` will pay.** Story 6.1 ships no route: both candidates
// are reachable only from a `.stories.tsx`, and Rolldown tree-shakes anything
// reachable only from a story out of the **application** entry entirely — so
// the delta in `apps/frontend/dist` is **0 bytes for both candidates**, which
// is a true number that means nothing. Story 6.2 takes the real app-bundle
// figure, against whichever candidate wins, with or without a dynamic
// `import()` at the region boundary.
//
// What this produces instead is the honest comparable: **each candidate's own
// module graph, bundled and gzipped on its own**, with the shared halves —
// React, `@marketpulse/shared`, the fixtures, the palette, the fit maths —
// held constant by being absent from both. That is a price per candidate, not
// a price per page.
//
// ## Why a separate build rather than reading the Storybook chunk
//
// `storybook build` emits one chunk per stories file, and
// `MarketTopology.stories-*.js` held **both** candidates plus the 190 KB
// recorded universe fixture. Splitting that by hand is arithmetic over a
// minified bundle; building each entry on its own is a measurement.

import { gzipSync } from "node:zlib";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const FRONTEND = resolve(REPO_ROOT, "apps/frontend");

const say = (line) => process.stdout.write(`${line}\n`);

// **Candidate A's entry is gone with Candidate A.** It read
// `renderer-sigma.ts`, which ADR 0048 deleted; the figures it produced are in
// Task 6.1.2's record, verbatim, with the command that produced them.
const ENTRIES = {
  B: {
    name: "hand-rolled Canvas2D",
    source: `export { mountCanvasTopology as mount } from "${FRONTEND}/src/topology/renderer-canvas.ts";`,
  },
  // The control: everything both candidates share, and nothing either adds.
  // Without it the two figures below are each *the candidate plus the shared
  // half*, and the difference between them is right while neither absolute is.
  shared: {
    name: "the shared half alone (fit, palette, graph source)",
    source: `export { fitView } from "${FRONTEND}/src/topology/fit.ts";
export { topologyPalette } from "${FRONTEND}/src/topology/palette.ts";
export { topologySource } from "${FRONTEND}/src/topology/graph-source.ts";`,
  },
};

const { build } = await import("vite");

const results = [];

for (const [id, entry] of Object.entries(ENTRIES)) {
  const dir = mkdtempSync(resolve(tmpdir(), `mp-topology-${id}-`));
  const file = resolve(dir, "entry.js");
  writeFileSync(file, entry.source);

  await build({
    root: FRONTEND,
    configFile: false,
    logLevel: "error",
    resolve: {
      alias: {
        "@marketpulse/shared": resolve(
          REPO_ROOT,
          "packages/shared/dist/index.js",
        ),
      },
    },
    build: {
      outDir: resolve(dir, "out"),
      emptyOutDir: true,
      minify: true,
      lib: { entry: file, formats: ["es"], fileName: "bundle" },
    },
  });

  let raw = 0;
  let gzipped = 0;

  for (const name of readdirSync(resolve(dir, "out"))) {
    if (!name.endsWith(".js")) continue;
    const bytes = readFileSync(resolve(dir, "out", name));
    raw += bytes.byteLength;
    gzipped += gzipSync(bytes, { level: 9 }).byteLength;
  }

  results.push({ id, name: entry.name, raw, gzipped });
}

// And the installed size of each library on disk, which is the other half of
// the question — a dependency is a thing to update, audit and trust as well as
// a thing to download.
function installedBytes(packageName) {
  // `apps/frontend/node_modules/<name>`, through `realpathSync`: pnpm installs
  // into `node_modules/.pnpm/<name>@<version>_<peers>/node_modules/<name>` and
  // links from the consuming package, so a plain join at the workspace root
  // finds nothing and reports `(absent)` for a dependency that is installed.
  let root;
  try {
    root = realpathSync(resolve(FRONTEND, "node_modules", packageName));
  } catch {
    return null;
  }

  let total = 0;

  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) total += readFileSync(path).byteLength;
    }
  };

  try {
    walk(root);
  } catch {
    return null;
  }

  return total;
}

say("\nWhat each renderer candidate costs in bytes — Task 6.1.2");
say("NOT what `/` will pay: neither is reachable from the app entry today.\n");

const shared = results.find((row) => row.id === "shared");

for (const row of results) {
  say(
    `  ${row.id.padEnd(7)} ${row.name}\n` +
      `          ${String(row.raw).padStart(9)} B minified   ` +
      `${String(row.gzipped).padStart(8)} B gzipped` +
      (row.id === "shared" || shared === undefined
        ? ""
        : `   (+${String(row.gzipped - shared.gzipped)} B gzipped over the shared half)`),
  );
}

say("");
for (const name of ["sigma", "graphology"]) {
  const bytes = installedBytes(name);
  say(
    `  installed  ${name.padEnd(18)} ${bytes === null ? "(absent)" : `${String(bytes)} B`}`,
  );
}
say("");
