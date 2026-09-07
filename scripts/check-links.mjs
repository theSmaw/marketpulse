// Every relative Markdown link points at something that exists. This is the
// check that says so.
//
// **Why it exists, and why it took until Task 2.6.8 (2026-09-07) to build.** It
// was proposed and declined three times — Tasks 1.8.7, 1.9.7 and 1.10.7 — and
// the argument each time was sound: six readings had found **zero** broken
// links, while the other half of that gap, the *prose figures* published in
// `README.md`, was wrong nearly every time anybody looked. Closing the cheap
// half alone would make the section look covered while the expensive half
// stayed open, and a gating step guarding something that has never been wrong
// is scaffolding. Task 1.10.7 stated the reversal trigger: **a broken link
// actually shipping.**
//
// It shipped. Task 2.5.6 found **four** genuinely broken cross-file links, all
// four introduced by the 2026-09-05 Epic 2 story renumber — a mechanical
// operation this repository has now performed once and documents as recurring.
// Task 2.5.6 recorded the decision as *owed rather than taken* because the
// breaks were found by a task rather than by a reader; Task 2.6.8 takes it,
// because "found by a task" is a description of who was unlucky, not of whether
// the links were broken, and a renumber will happen again.
//
// **What it proves:** that every relative link in a tracked `.md` file resolves
// to a file that exists, and that every `#fragment` resolves to a heading that
// exists in the file it names.
//
// **What it does not prove, and must not be described as proving:**
//
//   1. That the *prose* around the link is true. The figures this repository
//      publishes — test counts, artefact bytes, timings — have no referent a
//      tool can compare them against, and they are the half that actually rots.
//      This check does not narrow that gap by one inch. See `README.md`'s
//      "What `pnpm verify` does not cover".
//   2. That an external `http(s)://` link resolves. Those are skipped
//      deliberately: checking them makes `pnpm verify` need the network, which
//      is a property every other step is free of and worth more than this.
//   3. That a link points at the *right* thing. A path that resolves to the
//      wrong document is invisible here.
//
// **The one trap, and it is why the slugger below is written the long way.** A
// heading containing an em-dash — which is most headings in `README.md` —
// slugs to **two consecutive hyphens**, because the dash is dropped and the
// spaces either side are not collapsed. A slugger that collapses whitespace
// runs reports those anchors as broken; measured seven times across this
// repository's history, most recently here at **14 false positives**. Do not
// "simplify" `slugify` by adding a `\s+` collapse.
//
// Dependency-free, like its two neighbours in this directory.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * GitHub's heading-to-anchor rule, as far as this repository exercises it.
 *
 * Strip inline markup, lowercase, drop everything that is not alphanumeric, a
 * hyphen, an underscore or a space, then turn spaces into hyphens. The last
 * step is deliberately one-for-one — see the trap above.
 */
function slugify(heading) {
  return [
    ...heading
      .trim()
      .replace(/`|\*\*|~~|__|\*|_/gu, "")
      .toLowerCase(),
  ]
    .filter((character) => /[\p{L}\p{N} \-_]/u.test(character))
    .join("")
    .replaceAll(" ", "-");
}

/** Every heading in a document, as anchors, ignoring fenced code blocks. */
function anchorsIn(source) {
  const anchors = new Set();
  let inFence = false;

  for (const line of source.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = /^#{1,6}\s+(?<text>.*)$/u.exec(line);
    if (heading?.groups?.text !== undefined) {
      anchors.add(slugify(heading.groups.text));
    }
  }

  return anchors;
}

/** Every `[text](target)` in a document, with its line number, outside fences. */
function linksIn(source) {
  const links = [];
  let inFence = false;
  let lineNumber = 0;

  for (const line of source.split("\n")) {
    lineNumber += 1;
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    for (const match of line.matchAll(/\[[^\]]*\]\((?<target>[^)\s]+)\)/gu)) {
      const target = match.groups?.target;
      if (target !== undefined) links.push({ line: lineNumber, target });
    }
  }

  return links;
}

const documents = execFileSync("git", ["ls-files", "*.md"], {
  cwd: REPO_ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

if (documents.length === 0) {
  console.error("No tracked Markdown files found — is this a git checkout?");
  process.exit(1);
}

const sources = new Map(
  await Promise.all(
    documents.map(
      async (path) =>
        /** @type {[string, string]} */ ([
          path,
          await readFile(join(REPO_ROOT, path), "utf8"),
        ]),
    ),
  ),
);

const anchorsByDocument = new Map(
  [...sources].map(([path, source]) => [path, anchorsIn(source)]),
);

const broken = [];
let crossFile = 0;
let sameFile = 0;

for (const [path, source] of sources) {
  for (const { line, target } of linksIn(source)) {
    if (/^[a-z][a-z0-9+.-]*:/iu.test(target) || target.startsWith("//")) {
      continue;
    }

    const [filePart = "", fragment = ""] = target.split("#");
    const where = `${path}:${String(line)}`;

    if (filePart === "") {
      sameFile += 1;
      if (!anchorsByDocument.get(path)?.has(slugify(fragment))) {
        broken.push({ where, target, why: "no such heading in this file" });
      }
      continue;
    }

    crossFile += 1;
    const resolved = normalize(
      join(dirname(path), decodeURIComponent(filePart)),
    );

    if (!existsSync(join(REPO_ROOT, resolved))) {
      broken.push({ where, target, why: `no such file: ${resolved}` });
      continue;
    }

    if (fragment !== "" && resolved.endsWith(".md")) {
      const anchors = anchorsByDocument.get(resolved);
      if (anchors !== undefined && !anchors.has(slugify(fragment))) {
        broken.push({ where, target, why: `no such heading in ${resolved}` });
      }
    }
  }
}

if (broken.length > 0) {
  console.error("Broken Markdown links:\n");

  for (const { where, target, why } of broken) {
    console.error(`  ✗ ${where}`);
    console.error(`    ${target} — ${why}\n`);
  }

  console.error(
    `${String(broken.length)} broken link${broken.length === 1 ? "" : "s"} across ${String(documents.length)} documents.`,
  );
  process.exit(1);
}

console.log(
  `${String(documents.length)} documents, ${String(crossFile)} cross-file links, ` +
    `${String(sameFile)} anchor links, 0 broken.`,
);
