// `pnpm image` — build the backend's container image, and make its tag tell the
// truth about what is inside it.
//
// Task 1.11.2 built the first image with a one-line recipe in `package.json`
// that read `git rev-parse --short HEAD` at build time. It produced an image
// tagged `03a3b63` — the **parent** commit — because the build happened before
// the commit that contained the tree being built. The tag named a commit that
// does not describe the image. Harmless locally, and precisely the one question
// a registry tag exists to answer, so Task 1.11.3 owed a rule rather than a
// second one-liner.
//
// **The rule: a commit-SHA tag means the tree is exactly that commit, and
// nothing else may wear one.** A dirty tree gets the same SHA with a `-dirty`
// suffix. It is never refused.
//
// Refusing was the alternative and it was rejected on what it costs: building a
// throwaway image from a work-in-progress tree is the normal case while
// iterating on a `Dockerfile`, and a recipe that blocks it teaches people to
// bypass the recipe. A suffix is loud where it matters and silent where it does
// not — a `-dirty` tag in a registry is visibly wrong at the moment somebody
// reads it, and Task 1.11.6's pipeline builds from a clean checkout, so the
// pipeline never produces one at all.
//
// **What counts as dirty is the working tree and not the index**, and this is
// the part that is easy to get wrong. A Docker build context is assembled from
// the working tree rather than from git — the same property that makes the root
// `.dockerignore`'s `.env` entry load-bearing — so an **untracked** file is
// just as much a part of what got built as a modified tracked one. Both count.
// `git status --porcelain` reports both and honours `.gitignore`, which is why
// it is the check rather than `git diff --quiet`.
//
// **`MARKETPULSE_IMAGE_TAG` overrides the whole computation**, for Task 1.11.6.
// A pipeline knows the commit it was triggered for and should tag from that
// rather than from whatever `HEAD` resolves to inside a checkout step — those
// are usually the same and are not always, and a merge-commit checkout is
// exactly the case where they differ.
//
// Three build arguments are load-bearing and all three are easy to omit by
// hand, which is the reason this is a script at all rather than a documented
// incantation:
//
//   1. `--platform linux/amd64`. Container Apps requires it and the development
//      machine is Apple Silicon, so the default build is an `arm64` image that
//      passes every local check and cannot run on the platform at all. This is
//      the one property of the image a local run cannot catch.
//   2. `--build-arg NODE_VERSION`, fed from `.nvmrc`. The `ARG` in the
//      Dockerfile has **no default** on purpose, so a forgotten flag is a hard
//      parse failure rather than a silently different Node. Do not add one.
//   3. The build context is the **repository root**, not `apps/backend` — pnpm
//      needs the workspace manifest and the lockfile to resolve the deploy.
//
// This pushes nothing. The registry is Task 1.11.3's and the automated build is
// Task 1.11.6's.
//
// Dependency-free, like the other three checks in `scripts/`.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Run a command and return its trimmed stdout, or fail loudly naming what was
 * being attempted. Everything here is a prerequisite of a correct tag, so there
 * is no case where carrying on with a missing answer is better than stopping.
 *
 * @param {string} command
 * @param {readonly string[]} args
 * @param {string} what
 * @returns {string}
 */
function capture(command, args, what) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.error !== undefined) {
    fail(`could not run \`${command}\` to ${what}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").trim();
    fail(
      `\`${command} ${args.join(" ")}\` failed while trying to ${what}` +
        (stderr === "" ? "" : `:\n${stderr}`),
    );
  }

  return (result.stdout ?? "").trim();
}

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(`pnpm image: ${message}`);
  process.exit(1);
}

/**
 * The tag, and the reason it has the shape it has — returned together so the
 * script can say why rather than only what.
 *
 * @returns {{ tag: string; why: string }}
 */
function resolveTag() {
  const override = process.env["MARKETPULSE_IMAGE_TAG"];
  if (override !== undefined && override !== "") {
    return { tag: override, why: "from MARKETPULSE_IMAGE_TAG" };
  }

  const sha = capture(
    "git",
    ["rev-parse", "--short", "HEAD"],
    "read the current commit",
  );

  // Untracked files enter the build context exactly as modified tracked ones
  // do, so both make the tree something other than this commit.
  const dirt = capture(
    "git",
    ["status", "--porcelain"],
    "check whether the working tree is clean",
  );

  if (dirt === "") {
    return { tag: sha, why: "clean tree at this commit" };
  }

  const changed = dirt.split("\n").length;
  return {
    tag: `${sha}-dirty`,
    why: `${String(changed)} uncommitted change${changed === 1 ? "" : "s"} in the build context`,
  };
}

const { tag, why } = resolveTag();
const nodeVersion = readFileSync(resolve(repoRoot, ".nvmrc"), "utf8").trim();

if (nodeVersion === "") {
  fail(".nvmrc is empty — the image's Node version comes from it");
}

const image = `marketpulse-backend:${tag}`;

console.log(`pnpm image: building ${image} (${why})`);
console.log(`pnpm image: node ${nodeVersion}, linux/amd64`);

const build = spawnSync(
  "docker",
  [
    "build",
    "-f",
    "apps/backend/Dockerfile",
    "--platform",
    "linux/amd64",
    "--build-arg",
    `NODE_VERSION=${nodeVersion}`,
    "-t",
    image,
    ".",
  ],
  { cwd: repoRoot, stdio: "inherit" },
);

if (build.error !== undefined) {
  fail(`could not run \`docker\`: ${build.error.message}`);
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

console.log(`\npnpm image: built ${image}`);

if (tag.endsWith("-dirty")) {
  console.log(
    "pnpm image: this tag names a tree that is not any commit. Do not push it.",
  );
}
