# Task 1.10.3 — Cache the pnpm store, and decide what must never be cached

**Status:** Not started
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Task 1.10.2

## Objective

Keep the pipeline's runtime reasonable by caching the pnpm **store**, and record the two things this repository has already measured that make caching anything else a bad idea.

## Work

- **Cache the store, not `node_modules`.** The criterion says so and the measurement behind it is Task 1.1.8's: a cold install from an empty store is fast once the packages are _fetched_, so what costs time is the network, and linking is what pnpm is good at. A cached `node_modules` also restores a tree that was linked against a different store and a different lockfile, which is a class of failure with no error message. Find the store path from `pnpm store path` rather than hardcoding `~/.local/share/pnpm/store` — the location is pnpm's business and it has moved before
- **`npm_config_store_dir` and `NPM_CONFIG_STORE_DIR` are ignored by pnpm 11**, measured in Task 1.8.6 after an install that was meant to be cold reported `reused 327`. If the workflow wants the store somewhere specific — inside the workspace, for a simpler cache path — it has to be `--store-dir` or `pnpm config set`, and the check that it worked is the install summary's _reused_ count, not the absence of an error. This is the trap most likely to produce a cache that appears to work and never saves anything
- **Key the cache on the lockfile hash, the runner OS and the Node major**, with a restore-key that drops the lockfile hash so a changed dependency starts from the previous store rather than from nothing. Prove both halves rather than reasoning about them: a run with an unchanged lockfile must report a cache hit and a materially faster install, and a run with a changed lockfile must miss the exact key, hit the restore key, and still install correctly under `--frozen-lockfile`
- **Measure it, against Task 1.10.1's uncached baseline.** Report cold install, warm install, and the _chain_ total both ways — because if the install is a few seconds against a ~16 s chain, the honest conclusion may be that caching buys less than it looks like it does, and that is a finding worth recording rather than hiding behind a cache that is there because pipelines have caches
- **Do not cache `dist/`, `tsconfig.tsbuildinfo` or `storybook-static/`, and record why as a decision.** This is the load-bearing half of the task. Story 1.9 measured what a **stale** `packages/shared/dist` does: 13 failing backend tests whose messages name nothing about staleness — silent, and much worse than the missing case. `tsc -b` decides what to rebuild from `.tsbuildinfo`, so a restored build state is a runner that may skip work the commit needed. And `tsc -b --clean` deletes the output of the sources that _currently_ exist, so a restored `dist/` can carry orphaned files from a branch where a source was deleted. The pipeline's whole value is that it builds from nothing; a build cache trades that away for seconds
- **Vite's `build.emptyOutDir` defaults to true** and empties `apps/frontend/dist` on every build, so hashed assets do not accumulate — but that is a _default_ rather than a guarantee (measured in Task 1.3.4), and it protects only the directory Vite owns. It is not a reason to relax the rule above
- **Say what the cache does to the platform-binding question.** Rolldown's `@rolldown/binding-linux-x64-gnu` and esbuild's fetched binary both live in the store. A cache hit therefore means the runner is _not_ re-fetching a platform binary, which is the point — and also means a corrupted or half-populated store fails in a place the previous task's clean install cannot reproduce. Note how to bust the cache by hand (bump a version component in the key) so that is a documented one-line edit rather than a rediscovery under pressure

## Done when

- The pnpm store is cached and the store path comes from pnpm rather than from a literal
- A cache hit is confirmed by the install summary's reused count, not by the absence of an error
- The restore-key path is exercised with a genuinely changed lockfile
- Cold and warm figures are recorded for the install and for the whole chain
- Nothing under `dist/`, `storybook-static/` or any `.tsbuildinfo` is cached, and the reason is written in the workflow file beside the cache step
- The manual cache-bust procedure is documented in one line

## Notes

The temptation this task exists to resist is the second cache. Build caching is where CI pipelines usually go wrong quietly, and this repository has already paid for the measurement that says so — twice, in Tasks 1.1.4/1.1.7 and again in Story 1.9.
