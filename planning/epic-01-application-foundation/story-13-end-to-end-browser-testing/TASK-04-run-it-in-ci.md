# Task 1.13.4 — Run it in CI, and settle where it sits relative to `pnpm verify`

**Status:** Complete (2026-09-04)
**Story:** [1.13 End-to-End Browser Testing](STORY.md)
**Depends on:** Task 1.13.3

## Objective

Get the suite running on a clean Linux runner, and resolve the first genuine tension with the pipeline's founding rule rather than sidestepping it.

## Work

- **Take the position question head-on and write the argument in the workflow file, beside the step.** The rule is that the pipeline runs `pnpm verify` **by name** and defines nothing of its own, so CI cannot become a second definition of "verified" — `stories`, `env:check` and `test:process` all arrived in the chain for that reason. E2E strains it, because `verify` runs with no servers up, which is exactly why `pnpm ready` is not a step. The three shapes and their stated costs are in `STORY.md`; pick one, and note that `deploy.yml` is the precedent for the third — a separate workflow, with three reasons written at the top of the file, all of them properties of a workflow rather than of a job
- **CI has to start the pair, and Task 1.13.2 decided that it is not the suite's job (amended 2026-09-04).** `pnpm e2e` **requires a running pair and gates on `check-ready.mjs` rather than starting anything**, and Playwright's own `webServer` was rejected on a measurement rather than a preference: it judges readiness by **one URL**, and a busy 3000 leaves `pnpm dev` running and looking entirely healthy with nothing exiting non-zero — so a frontend probe passes against half a system, and the backend is the half this suite watches. So **starting the two servers on the runner is this task's work**, and it is the largest single piece of it. Two constraints come with it. The pair must be judged by the same two-halves check rather than by a port being open. And there is an **ordering constraint that will look like a bug**: `pnpm e2e` resolves both addresses from the backend's **built** `dist/config.js`, so on an unbuilt tree it exits 1 saying `run \`pnpm build\` first`before any browser starts — the build has to precede the suite, which`pnpm verify` already orders locally and a workflow does not order for free
- **Whatever the position, the chain must stay runnable from a cold tree with no ports free.** If E2E becomes a `verify` step, that property is gone and the loss is larger than it looks: every `pnpm verify` this repository has measured, from eight clean clones, ran with nothing listening
- **Cache the browser binaries deliberately, as a third category, and the numbers are now known (Task 1.13.1, 2026-09-04).** The cache rule is written beside the existing step: the pnpm **store** is cached and nothing else, because a restored `dist/` is a correctness risk taken for ~2.5 s against a **13.6 s runner-to-runner spread**. Browser binaries are a downloaded **tool** rather than a build output, so the risk is different and the decision is new. The key must carry the runner OS — one lockfile installs 397 packages on Linux and 398 on macOS — and the manual bust is a version prefix in both the key and the restore-key
- **The size the cache decision turns on is `--only-shell`, not the default.** Playwright's default install is **1.1 GB over five directories**; `playwright install chromium` is **554 MB** and is three artefacts rather than one (Chrome for Testing 356 MB, Chrome Headless Shell 196 MB, FFmpeg 2.5 MB); **`--only-shell` is ~199 MB** and is the shape a headless CI run actually needs. Those are macOS figures — **re-take them on the runner rather than carrying them**, because the platform builds differ. The binaries live in `~/.cache/ms-playwright` on Linux (`~/Library/Caches/ms-playwright` on macOS), outside `node_modules`, so no existing cache step touches them
- **`--only-shell` is cheaper _and_ runs the same binary the local suite already runs — measured, and the obvious way of checking gets it backwards (Task 1.13.2, 2026-09-04).** A headless `chromium.launch()` here spawns `chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/…`, read out of the process table while a browser was open. So the ~199 MB artefact is what the green local run used, and taking it in CI is not a downgrade to something unverified. **But `chromium.executablePath()` reports the 356 MB Chrome for Testing binary for that same launch**, so an API check answers the opposite of what `ps` does — read the process, not the path. The consequence for the local install is the mirror of it: `--only-shell` **cannot** serve `pnpm e2e --headed`, because a headed run needs the full browser, which is why Task 1.13.2 took the 554 MB locally and left this decision here
- **Playwright's browsers are fetched by an explicit command, which makes the CI shape simpler than a `postinstall` would have.** Nothing is downloaded by `pnpm install`, so a cache hit means the install step needs no browser network access at all and the download step can be skipped or made conditional. Confirm that rather than assuming it: a restored cache with a version mismatch re-downloads silently, and `actions/cache`'s `cache-hit` will not tell you which happened
- **Settle whether WebKit and Firefox are real on `ubuntu-latest` before any spec names them.** Task 1.13.1 found Playwright's **WebKit unusable on macOS 14/arm64** — it is a frozen build, `launch()` succeeds in 129 ms and **`newPage()` never returns** — so a spec targeting it hangs rather than skipping. Chromium and Firefox both work locally. Whether that transfers to Linux is unmeasured, and the honest default is **chromium only** until a second engine has been seen green on the runner and its cache cost paid for
- **Know what `actions/cache` will and will not tell you.** It declares `cache-hit` and nothing else; `cache-matched-key` belongs to `actions/cache/restore` and reads as the empty string here. So a restore-key hit and a total miss are both `cache-hit: false`, and only the tool's own download output separates them. And a cache saved on a `pull_request` run is invisible to a `workflow_dispatch` run on the same branch
- **Expect no new `allowBuilds` entry, and treat one as a finding.** Task 1.13.1's prediction that the policy would fire was **wrong for the chosen tool** — Playwright ships no install script anywhere in its chain, and the installed-tree sweep still returns `esbuild@0.28.2` and nothing else. So the runner's install should look exactly as it has for eight stories, and an `[ERR_PNPM_IGNORED_BUILDS]` on Linux would mean a platform-specific dependency nobody has seen locally
- **Any new action is pinned to a 40-character commit SHA and counted.** There are **five distinct actions across eight uses** today — count them out of `.github/workflows/` rather than copying the number, because it has been wrong once. `.github/dependabot.yml` watches `github-actions` weekly, so a sixth action is covered automatically rather than being a new reversal trigger
- **Decide whether it gates a merge, and know that the answer is invisible in a diff.** The required check is repository ruleset `main` (id 22160620), keyed on the **job name** `verify`, with admin bypass retained. A new job that should gate is a ruleset change nothing in this tree records, so this task's write-up and ADR 0013 become the only durable copy — the same shape Story 1.10 accepted rather than worked around. A new job that should **not** gate is also a decision and should be stated, so a future reader finding it unrequired can tell that from an omission
- **Upload failure artefacts with a retention number and a reason.** The three coverage reports go at **7 days** rather than the 90-day default, `storybook-static/` was declined at 9.3 MB per push, and `dist/` was declined in favour of a fingerprint. Traces and video are the largest thing this repository would produce and are worth nothing on a green run — upload on failure only, and say how large a failure's artefact actually was rather than estimating. **There is a local figure to compare against now (Task 1.13.2, 2026-09-04): one failed test leaves ~450 KB** — a 318,749 B trace zip, a 121,570 B screenshot and an 11,318 B page snapshot — where a green run leaves a 96-byte `.last-run.json`. Video is `off` and no HTML reporter is enabled, so `playwright-report/` does not exist unless this task turns one on; both are already gitignored either way
- **The suite is ten journeys now and its wall-clock is one journey (added by Task 1.13.3, 2026-09-04).** Locally, ten tests take **1:02.2 s** of which **nine take 3.4 s**; the tenth is the recovery journey, which waits out **two real 30 s poll intervals** and cannot be shortened without faking the interval. The other nine run underneath it on four workers, so the suite costs almost exactly what its slowest journey costs — **and that arithmetic is worker-count dependent**. Playwright's default is half the CPU count, which is 4 here and is whatever `ubuntu-latest` reports; on a two-worker runner the nine stop fitting inside the one and the total goes up rather than staying flat. Read the runner's worker line rather than carrying the local total, and decide out loud whether CI runs the recovery journey at all — `pnpm e2e --grep-invert "recovers on the next poll"` is the lever, and skipping it means the story's recovery criterion is asserted locally and not in CI, which is a statement ADR 0013 has to make
- **CI needs a pair, not a scheduling policy (added by Task 1.13.3, 2026-09-04).** Every failure state in the suite is produced by intercepting the health request **in the browser**, so no spec stops, restarts or reconfigures the pair. That means no serial project, no `test.describe.serial` and no `workers: 1` — the question the previous task handed forward is answered, and answered by construction rather than by scheduling. The reversal trigger is a state that cannot be produced from inside the browser; there is already one, the cross-origin refusal, and it is handled by being _caught_ rather than produced
- **The axe gate constrains what CI is allowed to drive, and it is a new constraint (added by Task 1.13.3, 2026-09-04).** Two of the suite's tests run axe over the assembled document and assert **zero violations**, and half of what that is for is **contrast** — which needs the real cascade computed, not just a DOM. `--only-shell` should satisfy that, because Chrome Headless Shell is a real rendering engine and Task 1.13.2 measured it as the binary a headless `launch()` already spawns; **confirm it rather than assuming it**, because a shell build that skipped style computation would turn the gate green by making it blind, which is the one failure mode a green run cannot distinguish from success. Re-take the baseline on the runner too: locally it is **0 violations / 37 passes / 1 inconclusive** on the landing route, and a differing _pass_ count on Linux is information rather than a failure
- **`axe-core` is a declared dependency of `e2e` now and it cost nothing, which changes one prediction about the install (added by Task 1.13.3, 2026-09-04).** It is **+0 store entries** and **+3 lockfile lines**, because `axe-core@4.13.0` was already in the virtual store through `@storybook/addon-a11y` and pnpm deduped straight onto that entry — so the runner's install should still read the same package counts (**397** on Linux against 398 on macOS, the one difference being the darwin-only `fsevents`). The pin deliberately matches the addon's, and **nothing checks that pair**; if a Dependabot bump ever moves one and not the other, the workshop and this suite start reporting different numbers for the same page
- **`pnpm e2e` passes two environment variables now, not one (added by Task 1.13.3, 2026-09-04).** `E2E_BASE_URL` and `E2E_BACKEND_ORIGIN`, both resolved by `scripts/pair-addresses.mjs`, both read by `e2e/support/pair.ts`, and **both throw rather than defaulting**. That is transparent to a workflow that invokes `pnpm e2e` by name and is a hard failure for anything that invokes `playwright test` directly — which is one more reason for the step to call the root script rather than the runner
- **Measure it against the right baseline.** The seven-step chain has five complete readings spanning ~9 s and the install spread overlaps its own cache saving, so a single reading proves nothing. Take the runner's figure more than twice and report it beside the install summary and the per-step split, never as a chain total
- **Make it go red on the runner before believing it is wired up.** Every failure class in Story 1.10 was made to happen rather than reasoned about, and the fifth one — `test:process` — went red on a runner for the first time in Task 1.10.8. Do the same here, on a throwaway branch with its own draft pull request, because `push` is restricted to `main` so a bare branch push runs nothing. One thing that pass taught: a chain reports its first failure and nothing after it, so a probe has to be surgical or it proves the wrong step

## Done when

- The suite runs on a clean Ubuntu runner and has been seen both green and red there
- Whether CI runs the one-minute recovery journey is a stated decision, not a consequence of running everything
- The runner starts both halves and judges them by the two-halves check, with the build ordered before the suite
- Its position relative to `pnpm verify` is a written decision with its argument beside the step
- Browser binaries are cached or deliberately not, with the reason and the OS-scoped key
- The gating decision is recorded, including if the answer is "it does not gate"
- Failure artefacts have a retention and a measured size; a green run uploads nothing

## Approach note

The rule this task strains is worth restating before bending it: `stories`, `env:check` and `test:process` all became `verify` steps rather than workflow steps **because a CI-only check forks the definition of "verified"**. E2E is the first check with a real reason not to be in the chain — it needs a running system — so whichever way it goes, the answer belongs in ADR 0013 next to Story 1.10's rule rather than quietly beside it.

## What happened

### The position, and the argument for it

The suite is a **second job named `e2e` in `.github/workflows/verify.yml`** —
not a `pnpm verify` step, and not a separate workflow. All three shapes were
weighed and the two rejections are written beside the job.

- **A `verify` step is rejected on a measured property, not a preference.**
  `pnpm verify` runs with **nothing listening** — that is why `pnpm ready` is
  not a step — and eight clean-clone runs have relied on it. A chain that needs
  two ports free stops being runnable from a cold tree, on a laptop with a dev
  server already up, and inside the job itself.
- **A separate workflow is rejected because `deploy.yml`'s three reasons are
  properties of a deploy, and two argue the other way.** The badge: a deploy is
  separate so a registry outage cannot turn the tick red for something
  `README.md` disclaims — but a browser journey going red **is** a claim about
  the commit and the badge should report it. Concurrency: a cancelled deploy is
  a half-done rollout needing a queue of its own; a cancelled browser run is a
  cancelled check, which `verify`'s per-ref group already handles correctly.
  Only the job-name reason survived, and it is answered by adding the job to the
  ruleset.
- **What keeps it honest against Story 1.10's rule** is that the job invokes
  `pnpm build`, `pnpm dev` and `pnpm e2e` **by name** and defines no port, no
  browser command and no readiness rule of its own. The cost is stated rather
  than hidden: the browser suite is a check CI runs that `pnpm verify` does not,
  which is the fork Story 1.10 spent eight tasks preventing.

It runs **in parallel** with `verify` rather than `needs:`-ing it — the two
answer different questions, and serialising adds the chain's ~40 s for feedback
that is not better.

### It gates a merge

Ruleset `main` (id 22160620) now requires **`verify` and `e2e`**. Everything
else about it is unchanged and was re-read from the API: `enforcement: active`,
`~DEFAULT_BRANCH`, admin bypass retained, both changed GitHub defaults still
off. **This write-up, `README.md`, `CLAUDE.md` and ADR 0013 are the only durable
record** — a reader finding only `verify` required should read that as the
browser gate having been removed, not as it never having been set. Retries stay
at **zero in CI**: a gate that retries cannot tell a flake from a defect.

### The headline: the gate found a real defect on its first run

The axe gate reported **`scrollable-region-focusable`** on the landing route —
a WCAG 2.1.1 failure that had stood for five stories. A region is sized by the
grid and takes its own overflow, and a scrolling container that cannot be
reached by keyboard hides content from a keyboard user.

It had never fired locally for a reason worth knowing: **the rule does not fire
while the scrolling box happens to contain something focusable.** `Market
topology` holds Story 1.4's render check, which holds a popover trigger, and it
scrolls 1,196 px inside a 318 px box on the development machine without being
reported. The runner reported it on `Current investigations`, which holds a
heading and one sentence and nothing focusable at all.

**It reproduces on the development machine at a viewport 160 px shorter** (0
violations at 1280×720 and 1280×640; the violation at 1280×560 and 1280×480), so
it is a real defect a taller window was hiding rather than a property of Linux.
`tabIndex={0}` on every region is the fix — all four rather than the ones
currently overflowing, because which one scrolls is a function of the viewport
and of what Epics 4 to 7 put in them. The axe baseline is **unmoved at 0
violations / 37 passes / 1 inconclusive** afterwards, at 720, 560 and 480 px.

### The `--only-shell` control, taken rather than assumed

A throwaway probe spec, since deleted, confirmed the shell build is not a lesser
renderer: on the runner it reports the page ground exactly
(`rgb(244, 243, 238)`) and axe's `color-contrast` rule passes on **65 nodes**,
the same number as macOS. That was the one thing the axe gate needed checking,
because a shell that skipped style computation would turn the gate green by
making it **blind** — the one failure mode a green run cannot distinguish from
success.

### The browser cache, and the Linux figures

`playwright install --only-shell chromium` on `ubuntu-latest` is **267 MB on
disk in two directories** — `chromium_headless_shell` 262 MB and **`ffmpeg`
4.9 MB, so `--only-shell` still fetches FFmpeg** — against Task 1.13.1's
~199 MB single artefact on macOS. Compressed into the cache it is
**108,075,781 B**, the largest single entry this repository stores against
GitHub's 10 GB allowance (609,986,375 B across 9 entries when taken).

It is cached, as a **third category**, and the reason it is allowed where
`dist/` is not: a browser binary is a downloaded **tool**, immutable and
addressed by version, and it cannot make a build wrong by being stale, because a
stale one is a different version Playwright refuses to launch.

- Key: `playwright-shell-v1-${{ runner.os }}-<playwright version>`. The OS
  because one lockfile does not install the same tree on both; the version
  rather than the lockfile hash, so an unrelated dependency bump does not throw
  away 267 MB of download.
- **No restore-key**, which is the deliberate difference from the store cache. A
  partial store is a correct store that installs the rest; a browser directory
  restored from another Playwright version **looks populated and holds the wrong
  build**, and `actions/cache` reports a restore-key hit and a total miss
  identically.
- **The download step runs on a hit too and prints what it did**, which is the
  only thing that separates a restored cache from a silent re-download.
- Cold **5,582 ms**, hit **918–981 ms**. That is the whole saving: ~4.6 s of a
  ~100 s job. It is here because a 267 MB download on every push is a poor
  neighbour, not because it moves the clock.

The **pnpm store cache is restored and never saved** in this job: both jobs
compute the same key, and two savers race to a `Cache already exists` warning
that reads like a fault. `verify` owns saving it. The consequence, stated: on
the first run after a lockfile change this job installs cold.

### Timings, taken more than twice

Three green readings of the whole job: **103 / 102 / 99 s** — a 4 s spread where
the seven-step chain has ~9 s over five readings, so this is so far the more
repeatable half of the run. Its split, warm:

| Step                 | Runner                          |
| -------------------- | ------------------------------- |
| `pnpm install`       | 4,677–5,035 ms, exact store hit |
| `playwright install` | 918–981 ms hit / 5,582 ms cold  |
| `pnpm build`         | 6,430–7,468 ms                  |
| `pnpm e2e`           | 69,208–72,569 ms                |

**`ubuntu-latest` reports 2 workers, not the laptop's 4** — Playwright's default
is half the CPU count — so the nine short journeys stop overlapping four ways
and still finish underneath the recovery journey: the suite is 69.2–72.6 s there
against 62–64 s locally. The install reads **`Packages: +400`**, which
supersedes Task 1.10.1's 397-on-Linux/398-on-macOS pair; Story 1.13's additions
moved it.

**All ten journeys run, the recovery one included, and that is a decision.**
`--grep-invert "recovers on the next poll"` is the lever and it is not pulled:
that journey is the only thing in the repository asserting the interval the
application actually polls at, that a failure does not clear the surviving
timestamp, and that recovery happens without a reload. Skipping it would leave
the story's recovery criterion asserted on a laptop and not in CI.

### Made to go red, three times

1. **Unplanned, and the most valuable**: the axe violation above, on the very
   first run.
2. **A spec assertion.** Artefact **872,142 B** — a 755,894 B trace, a
   117,923 B screenshot, a 10,212 B error context and the 7,080 B pair log.
   Larger than the local ~450 KB because the axe journey's trace carries the
   injected axe source.
3. **The failure a laptop cannot produce**: a deliberate `PORT=0` on the pair.
   `✗ backend … ECONNREFUSED` beside a ticked frontend, exit 1 in **15.7 s**,
   the pair's log naming `PORT must be an integer between 1 and 65535, received
"0"`, and an artefact of **577 B** — the log and nothing else, because there
   is no Playwright output at all. This is the vindication of `pnpm e2e` gating
   on `check-ready.mjs` itself: a one-URL `webServer` probe would have driven
   the whole suite against a page with no backend.

All three were on a throwaway branch with its own draft pull request, because
`push` is restricted to `main`.

Failure artefacts are **7 days**, on failure only, a green run uploads nothing —
and the upload path was corrected by measurement: `upload-artifact` roots an
archive at the **common ancestor** of its paths, so a `RUNNER_TEMP` log beside
`e2e/test-results` produced an archive nested at `marketpulse/marketpulse/e2e/…`
beside a stray `_temp/`. The log is copied into `e2e/test-results` so there is
one root.

### What was deliberately not done

- **WebKit and Firefox stay unmeasured on Linux.** The job installs
  `--only-shell chromium` and nothing else. Naming an engine that has never been
  seen green here means a second browser in the cache and roughly a doubling of
  the run, and Task 1.13.1's WebKit failure mode is a **hanging** test rather
  than an error.
- **No new action.** The job reuses `actions/checkout`, `actions/setup-node`,
  `actions/cache`, `actions/cache/restore` (the same repository at the same SHA)
  and `actions/upload-artifact` — still **five distinct actions**, now across
  **thirteen uses** and six distinct `uses:` references. `allowBuilds` did not
  fire, as Task 1.13.1 predicted.

### The artefact moved by eleven bytes

`tabIndex={0}` took the JavaScript 348,124 → **348,135 B** (`b98aeaa5…`) on an
unchanged 12,128 B / `134d5dd8…` stylesheet, with `index.html` 1,101 B at a new
hash (`07983678…`) and `staticwebapp.config.json` 300 B — **361,664 B over four
files at 278 modules**. The runner's fingerprint and a local build agree to the
byte, so a Linux build reproduces a Mac one for the second story running.
