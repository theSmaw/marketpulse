# ADR 0010 — Continuous integration: one command, what the green tick certifies, and what it does not

**Status:** Accepted
**Date:** 2026-09-03
**Delivered by:** Epic 1, Story 1.10 (Tasks 1.10.1–1.10.8)

## Context

Before this story the repository had an acceptance command and no machine that
ran it. `pnpm verify` had been the single definition of "verified" since Task
1.1.7, and every story since had been delivered as a pull request against
`github.com/theSmaw/marketpulse` with that command run by hand on one macOS
laptop. Story 1.9 had just made the last of it honest: `pnpm test` stopped being
three `echo` placeholders and became real suites, so a green tick was finally
worth putting somewhere public.

Four properties of the workspace shaped almost every decision below, and only
one of them is about CI:

- **`pnpm verify` is a single `&&`-joined chain, and steps have been added to it
  three times without anybody editing a consumer.** `stories` arrived in Task
  1.4.5, `env:check` in Task 1.6.6 and `test:process` in Task 1.10.5. Any
  pipeline that re-lists the tools loses that property the first time it is
  written
- **`packages/shared` is consumed as built output.** Nothing can run a chain step
  on its own, and nothing can restore a build directory without inheriting Story
  1.9's measurement of what a stale one does — 13 failing backend tests whose
  messages name nothing about staleness
- **This repository acquired its first platform-specific native binding in Story
  1.3.** Rolldown resolves `@rolldown/binding-darwin-arm64` locally and something
  else on Linux, and CI is the first place the other side has ever run
- **The toolchain is pinned twice and neither pin is a CI concern**: Node in
  `.nvmrc`, pnpm in `package.json`'s `packageManager`, with `engineStrict`
  turning a wrong Node into a refused install rather than a warning

The story's real deliverable is therefore not "add CI". It is to put one
command on a second machine without creating a second definition of what it
means, and then — because a green tick is read as certifying far more than it
does — to write down precisely what it certifies.

## Decisions

### 1. The pipeline is GitHub Actions, and the reversal cost is one file

Taken as a decision rather than inherited. The alternatives were a
provider-agnostic runner script — a second place the pipeline lives, for a
portability nobody needs — and GitLab or Circle, which is a second host beside
the one the work already flows through. `origin` is GitHub and every story since
1.1 shipped as a pull request against it.

**The reversal cost is one YAML file, and it stays one file only because of §2.**
The moment a workflow re-lists the tools, the reversal cost stops being a file
and becomes the definition of "verified".

All four third-party actions are pinned to **commit SHAs** rather than major
tags — `actions/checkout`, `actions/setup-node`, `actions/cache` and
`actions/upload-artifact` — because they run with the repository checked out,
which is the same position `allowBuilds` takes one layer down. The runner label
is deliberately **not** pinned: `ubuntu-latest` is GitHub's own image, and a
pinned image ages out of support and fails hard. The job resolved to
`ubuntu-24.04`, `Linux 6.17.0-1022-azure x86_64`.

### 2. The pipeline runs `pnpm verify` by name and defines nothing of its own

This is the story's central decision and the one most likely to be "improved".
The verification step is one line. There is no matrix of one job per tool, no
"faster" reordering, and no second list of what verified means.

The alternative — a job per step, or a workflow that runs `pnpm build`, then
`pnpm lint`, then `pnpm test` — buys per-step reporting and parallelism and
costs the property Story 1.1 built the chain for. It has already paid three
times: `stories`, `env:check` and `test:process` all reached CI without a
workflow edit, and the third of those happened **during this story**, in a task
that had this file open and did not touch it.

The consequence to accept: a failing chain reports **one** failure, the first,
and the steps after it did not run. That is what `&&` means, and the probes in
§19 had to be surgical because of it — a failing test that was also unformatted
died at `format:check` and never reached `test`.

### 3. Per-step visibility is derived from the chain's own output, and it is diagnostics rather than a check

The obvious way to see where time goes is to split the chain into steps, which
is exactly §2's forbidden move. What replaces it: pnpm announces the whole chain
once as `$ pnpm run build && pnpm run lint && …` and then prints a root-level
`$ ` line as each step starts. The step **names** are parsed out of the first
line and the **boundaries** are the timestamps of the rest. Nothing in the
workflow knows a step name, so a step added to `verify` appears in the split for
no edit — which `test:process` did.

**It is diagnostics, not a check, and that distinction is the point.** Nothing
verifies that pnpm keeps printing either line, so a pnpm upgrade that changes
the announcement format prints nothing, or the wrong names, **on a run that is
still green**. That is harmless by construction: the exit code is the chain's
and never the parser's, and a silently empty split is not a failing build. Since
Task 1.10.6 the same derived file also renders the job summary's first section,
so a format change empties a section a reviewer reads rather than a block in a
log nobody opens — a worse symptom, same non-consequence.

On a failure the stamps run out and **the last name printed is the step it died
in**, which was seen five times rather than reasoned about.

### 4. `push` is restricted to `main`; everything else is verified through its pull request

A pull request from a branch in this repository fires **both** events, so a bare
`push:` beside `pull_request:` runs the whole chain twice for one change and the
answer arrives from whichever finishes first.

The half worth knowing is that the two are not the same check. A `pull_request`
run verifies the **merge commit** (`refs/pull/N/merge`), which is what would land
on `main`; a push run verifies the branch tip, which is not.

**The cost is stated rather than hidden: a branch with no pull request open is
not verified at all.** Measured rather than assumed — pushing a story branch
produces no run, because the trigger set is read from the workflow file **on the
pushed ref**. `workflow_dispatch` covers that case, and is what made Task
1.10.1's second cold-install reading possible without an empty commit. It does
not extend to anything cached; see §7.

### 5. Superseded runs are cancelled everywhere except `main`

`concurrency.group` is `${{ github.workflow }}-${{ github.ref }}` and
`cancel-in-progress` is the expression `${{ github.ref != 'refs/heads/main' }}`.
A run on the default branch is the record of what that commit does, and a
cancelled one leaves a commit on `main` with no verdict against it.

Confirmed twice: by pushing twice in six seconds in Task 1.10.2, and again in
Task 1.10.8, where opening the probe pull request and pushing its first probe
left the first run `cancelled` and the second complete.

### 6. The toolchain comes from the same two pins local machines use, and no pnpm is installed

Node from `.nvmrc` through `actions/setup-node`'s `node-version-file`, with no
version literal anywhere in the workflow. pnpm from `packageManager` through
`corepack enable`, with **no pnpm install step and no pnpm action** — the pin is
the point, and a workflow that installs 11.24.0 by hand is a second place the
version lives. Corepack fetches the tarball on the runner, which is ~2 s inside
that step and the reason it is not instant. `--frozen-lockfile` is passed
explicitly rather than left to CI's default.

`allowBuilds`' single entry did what it exists for: `esbuild@0.28.2`'s
`postinstall` ran, `@esbuild+linux-x64@0.28.2` is in the tree, and the binary
answers `0.28.2` when executed — which is the test, because a skipped install
script leaves a shim that cannot. The Rolldown binding is read out of the tree
**by name** rather than inferred from a green install, and the workflow asserts
both the count and the name.

**A workflow assertion can only catch a runner that disagrees with the pin. It
cannot catch a pin that is wrong.** Task 1.10.1 set `.nvmrc` to 22.20.0 and
everything upstream went green — `setup-node` installed Node 22 as asked, and
the workflow's own version assertion **passed**, because `.nvmrc` and the
installed Node agreed with each other. What failed the run was `engineStrict`,
at install, with `ERR_PNPM_UNSUPPORTED_ENGINE`. This is the toolchain-level form
of the whole ADR's thesis: a green run means every check passed, not that every
claim holds.

### 7. The pnpm store is cached; nothing under `dist/`, `storybook-static/` or any `.tsbuildinfo` ever is

The key is `pnpm-store-v1-<runner.os>-node<major>-<hashFiles(pnpm-lock.yaml)>`
with a restore-key dropping the hash. The path comes from `pnpm store path`
rather than a literal. **`v1` is the manual bust — bump it in both the key and
the restore-key, and that is the whole procedure.** The OS component is
load-bearing: 397 packages install on Linux against 398 on macOS from one
lockfile, the difference being `fsevents@2.3.3` (`os: [darwin]`, optional, via
Vite).

**Nothing about the build is cached, and the number decides it rather than the
principle.** Story 1.9 measured what a stale `packages/shared/dist` does; `tsc
-b` decides what to rebuild from `.tsbuildinfo`; and `tsc -b --clean` deletes the
output of the sources that _currently_ exist, so a restored `dist/` can carry
orphans from a branch where a source was deleted. Task 1.10.2 measured the
prize: running the chain twice in one job with the build outputs present moved
**exactly one step**, `build` 6,010 → 3,477 ms, because lint, Prettier, both
checks and Vitest start from nothing either way. That is **~2.5 s against a
13.6 s runner-to-runner spread** — a correctness risk taken for a saving smaller
than the measurement noise.

**The store cache's honest value is ~1.6 s and it was kept anyway.** Uncached
installs are 4,455–6,127 ms (n=8) and cached ones 3,895–4,597 ms (n=8, four of
them re-taken in Task 1.10.8 at 4,231 / 4,341 / 4,388 / 4,477 ms); the two
ranges overlap. It is kept because it is **categorically** provable and costs
one pinned action, not because it moves the clock — an exact hit reads
`cache-hit: true` with `reused 397, downloaded 0`, a restore-key hit reads
`cache-hit: false` with `reused 397, downloaded 2`, and a genuine miss reads
`reused 0, downloaded 397`. Never read a CI total as a regression; read the
install summary and the per-step split.

**`--trust-lockfile` was rejected.** pnpm 11's supply-chain verification is the
single dominant line of a cold install — `492 entries` in 2.5–5.2 s, and 3.5–3.8 s
even on a full cache hit, because it verifies the **lockfile** rather than the
store and is therefore uncacheable in principle. It is tempting for exactly that
reason and it is wrong here: a pull request may change the lockfile and this
runner is the machine meant to check it, which is the case the flag's own
documentation excludes.

Two traps around the cache, both measured. **`actions/cache` declares `cache-hit`
and nothing else** — `cache-matched-key` belongs to `actions/cache/restore` and
reads as the empty string here, so a restore-key hit and a total miss are both
`false` and pnpm's own counts are what separate them. And **a cache saved on a
`pull_request` run is invisible to a `workflow_dispatch` run on the same
branch**, because a pull request's cache is scoped to its own ref — so §4's
`workflow_dispatch` escape hatch does not extend to a warm reading.

### 8. Corepack stays after `setup-node`, and a third pinned action is what that costs

`corepack enable` runs after `actions/setup-node` so the shims land in the
pinned Node. That means `setup-node`'s own `cache: pnpm` cannot see pnpm at the
moment it runs, which is why the store cache is an explicit `actions/cache` step.

The alternative — Corepack first — keeps one action and pins pnpm to whatever
Node the runner image happens to ship for the length of one step, which is a
second, invisible toolchain. An action that _installs_ pnpm was never a
candidate: `packageManager` is the pin.

### 9. Coverage runs in this job, outside the chain, and cannot fail it

Story 1.9 kept `pnpm coverage` out of `verify` deliberately, and that is
unchanged. Where it runs was measured rather than assumed.

**A step in the `verify` job, not a second job.** A second job is a second
runner: its own checkout, setup-node, Corepack, cache restore, install, and then
— unavoidably — its own `pnpm build`, because `packages/shared` is consumed as
built output and it must not close that gap by caching `dist/` (§7). `build` is
the most expensive step on this runner. As a step here it reuses the build
`verify` just did and costs **8,279 ms on the runner** against 2.60–3.06 s
locally, which is well inside the spread two runners already show on identical
work.

**A second workflow was never a candidate.** The triggers and the concurrency
group are properties of the workflow, so a second file forks both — §2's failure
one level up.

**`continue-on-error` is what makes "the green tick certifies the chain and not
coverage" structural rather than documented.** No coverage outcome can turn the
tick red. The consequence is a trap worth its own sentence: **a
`continue-on-error` step reports `conclusion: success` however it exited**, in
the API and in the UI, and the real result is `steps.<id>.outcome`. A failure is
visible only as annotations — the step's own `::error::` and `Process completed
with exit code 1`. Two rules follow: never write a later step's `if:` against
such a step's `conclusion`, and never read the absence of an annotation as
"coverage was fine". Both halves were made to happen on a throwaway commit: the
assertion fired with a named error and the **run conclusion was still
`success`**.

The per-package table is derived from `pnpm -r`'s own line prefixes, the same
property §3 has, so a fourth package appears without an edit — and its failure is
quieter than the split's, because a derivation matching nothing produces an
annotation on a green run.

### 10. There is no threshold, and one of the three reasons is spent

The baseline is **30.00% / 64.33% / 68.25%** of statements for `packages/shared`,
`apps/backend` and `apps/frontend` — three reports, never one merged number,
because the three packages share no code and Vitest configures coverage per
package with no root config.

Task 1.10.4 declined a threshold for three reasons: a minimum over nine
components, one route table, one configuration module and no application state
is a number invented before there is anything to hold it to, and the cheapest
way to meet it is testing what is easy; the denominator was about to move,
because Task 1.10.5 was about to test the backend's process half; and the
cheapest way to meet **any** threshold here is to exclude the two 0% entrypoints
— measured rather than feared, since adding `apps/backend/src/index.ts` to
`coverage.exclude` takes that package **64.33% → 91.08%**, +26.75 points for
describing less.

**The second reason fired and produced nothing, which §11 explains.** Task
1.10.5 gave `src/index.ts` ten tests and the package is still 64.33% with that
file at 0%. So one argument is spent — and the position is stronger without it,
because there is now a fourth: **a threshold over this package would be a
threshold over a number that is provably not a measure of what is tested here.**

The live reversal trigger is no longer "after Task 1.10.5". It is a
merged-coverage mechanism (§11), or a package whose coverage figure and test
coverage are the same claim.

A coverage-reporting service is declined outright: a token, a second definition
of the number, and an external dependency for a repository whose whole coverage
story is three local HTML reports. The reversal trigger is a reviewer needing
per-PR diff coverage.

### 11. A spawned child is invisible to the runner's instrumentation, and that makes the figure and the testing two claims

This is the story's most transferable finding and it is stated separately from
§10 because a reader arrives at the wrong conclusion from the coverage table
alone.

`apps/backend/src/index.ts` is the process — `listen`, both signal handlers, the
shutdown ceiling, `EADDRINUSE` and both crash handlers. Task 1.10.5 gave it ten
tests. Its coverage moved by **zero**, and the package's four figures reproduce
to the digit.

V8 coverage accounts for the code **the runner's own process loads**. This
suite's subject runs in a child process the runner never instruments, and the
file it runs is built output while `coverage.include` is `src/**/*.ts`. Measured
rather than reasoned about: running the process suite under the backend's own
coverage settings reports **0% of 354 statements and 0 of 100 functions** — it
instruments nothing at all, its own test file included.

So **`src/index.ts` at 0% means "no runner instruments it", not "nothing tests
it"** — and it is now the best-tested file in the backend by behaviour and the
worst by instrumentation. `NODE_V8_COVERAGE` on each spawn plus a merge is the
mechanism that would close it and was **not** built: a coverage directory per
spawn, a merge step, and a second definition of what the backend's number means,
for a figure nobody gates on. `pnpm coverage` deliberately still runs the fast
suite only, so the two numbers cannot drift apart by accident.

### 12. The one invariant the pipeline enforces that `pnpm verify` does not, and it checks presence rather than a percentage

Both 0% entrypoints — `apps/backend/src/index.ts` and
`apps/frontend/src/main.tsx` — are deliberately left **in** the coverage
denominator, so the hole is visible as a figure rather than as a caveat.
Excluding them would take two packages to a flattering number that describes
less. That is a stated invariant, and this repository's third class of `verify`
gap is exactly the stated invariant that quietly stops being enforced — so the
coverage step asserts that both files still have a page in the report.

**Presence, and never 0%.** The reason written beside it was that Task 1.10.5
was expected to make `index.ts` reachable, and an assertion pinned to 0% would
fail on the task that fixed it. §11 is why that never happened, so **the
assertion was written for a prediction that turned out to be wrong and is still
right** — it guards the exclusion, which is the move somebody would actually
make, and not the number, which is the thing that is allowed to change. The
comment beside it in the workflow has been left as written, because a prediction
that did not fire is still the honest reason the assertion has the shape it has.

### 13. `pnpm ready` is deliberately not a step, and the instinct is backwards

The reflex on seeing a readiness script is to run it in CI. `verify` runs with
**no servers up**, where "nothing is running" is the honest answer rather than a
failure — `pnpm ready` would fail every run for the correct reason. It is a
development-loop tool for the half-pair case (a busy 3000 leaves `pnpm dev`
looking healthy), and Story 1.11 is where its rules apply again, to a container
probe.

### 14. The backend's process half is a seventh `verify` step, not a CI step

Story 1.9 recorded the whole process-test class as out of scope with this story
named as owner. Task 1.10.5 built it: `apps/backend/src/index.process.test.ts`,
**ten tests** under a second Vitest config, run by `pnpm test:process`, each
spawning `dist/index.js` as a real child on a real port. Every behaviour was
**seen to fail** first, through ten deliberate breaks in `index.ts` and
`config.ts`, one per test.

**Why a `verify` step and not a CI step:** the workflow runs `pnpm verify` by
name (§2), so a suite CI runs beside the chain is a second definition of
"verified". **Why not part of `pnpm test`:** the 49 injected tests are what
developers run all day, they need no build and no socket, and they must not
become conditional on either. So there are two configs, two commands, one chain
— and it cost the workflow no edit at all, which is §3 paying for the third time.

Six of its decisions have a rejected alternative behind them:

- **The port strategy.** `PORT=0` — bind zero, read back what the kernel chose —
  is rejected by `config.ts`, whose range is 1 to 65535. Widening the range was
  the third option and was **not** taken: it is a change to the shipping
  application made for a test's convenience, and `PORT=` in a `.env` file would
  then produce port 0 by accident, which is the case `present()` exists to
  prevent. A probe binds an ephemeral port, reads it, closes it and hands the
  number to the child; **the race that leaves is answered rather than ignored**,
  because the readiness helper watches for the child's **exit** and fails
  immediately with the child's whole log attached. A port held by a previous run
  is a diagnosis, not a flake — which is the failure a shared runner actually
  produces
- **Crashes are injected through a two-line `node -e` ESM wrapper**, not through
  the temporary throwing route Tasks 1.7.5 and 1.9.3 both added. An error thrown
  in a route never reaches the process handlers at all — the error handler
  catches it. The wrapper imports the real `dist/index.js` and listens on an
  **IPC channel**, which leaves the real handlers, the real logger and the real
  drain in place, ships nothing, and makes the crash deterministic rather than
  timed. It is written in the test file rather than kept on disk because a
  fixture under `src/` compiles into `dist/`, where the `tsc -b --clean` orphan
  rule would strand it
- **A drain is held open by a connection with an incomplete request**, never by
  an idle keep-alive one: Fastify closes idle connections and waits only for
  active ones, so the second-signal path, the ceiling and the crash-during-drain
  path are all unreachable without a socket that writes a request line and its
  `Host` header and then stops
- **Nothing waits on a log line**, for four reasons: at `LOG_LEVEL=warn` a
  healthy server writes zero lines, so a readiness grep hangs rather than fails;
  Fastify rewrites `0.0.0.0` to `127.0.0.1` in that line; `pretty` and `json`
  render one record two ways, and Task 1.8.2 changed the `pretty` clock under a
  matcher that would have been written against the old one. Readiness is a
  `GET /health` poll at `127.0.0.1`, named explicitly because this server binds
  IPv4 only
- **No timing is asserted anywhere.** The ~100 ms signal-to-exit and the
  sub-millisecond drain are baselines for a human reading a regression, and this
  runner's spread on identical work is measured in seconds
- **A staleness check was built and removed, and the reason is worth more than
  the check.** A stale `dist/index.js` is a suite testing the previous commit,
  silently and green. Comparing the newest mtime under `src/` against `dist/`
  looks like it answers that and does not: `tsc -b` re-emits from the content
  hashes in `.tsbuildinfo`, so a `git checkout` makes every source newer than
  every output without changing a byte — the check failed a correct tree on its
  first run. What is left is an existence check naming `pnpm build`, and the
  ordering is `pnpm verify`'s job, which is one more argument for the suite
  being a step in the chain

Two corrections belong here. **Completing a held request after `close()` gets a
503**, not the 200 Task 1.7.5 recorded — Fastify answers `request aborted -
refusing to accept new requests as server is closing`, so what holds a drain is
the connection rather than a request in flight, and 1.7.5's reading came from a
deliberately slow route it had added. And **the chain's local cost went
11.78 s → ~20 s** for the seventh step, of which **5 s is `SHUTDOWN_TIMEOUT_MS`
elapsing** — the one test in this repository whose duration is a property of the
application.

That last fact has a pipeline consequence measured in Task 1.10.8: **`test:process`
is the least runner-sensitive step in the chain**, 8,375 ms on the runner against
7,777 ms locally — **1.08×**, where every other step runs 1.5–3.2×, because five
of those seconds are wall-clock time a faster machine cannot shorten. The seventh
step both raises the total and compresses the relative spread, so a
runner-versus-laptop ratio taken over the whole chain now means less than it did.

### 15. What is published, at what size, for how long — and what was declined

**Published:** the three `coverage/` directories, 956 KB across 73 files,
**211,427 B uploaded**, at **7 days** rather than the 90-day default, because a
coverage report is read within days of the run that produced it or not at all.
`if-no-files-found: error`, so a report that stops being produced is loud rather
than silently empty.

**Declined, and recorded as declined:**

- **`apps/frontend/storybook-static/`** — 9.3 MB per push, for a bundle nothing
  downstream consumes and no user is shown. Publishing it _as a site_ is a
  different question and is Story 1.11's
- **`apps/frontend/dist/`** — in favour of a fingerprint step that prints every
  file with its size and md5 into the job summary. An upload would be downloaded
  to answer "did the artefact move"; a fingerprint **is** that comparison,
  greppable across runs at no storage cost. It walks whatever `dist/` holds
  rather than naming three files, and it is deliberately a **record and not a
  check** — nothing asserts the hash, because the artefact is supposed to change
  when the frontend changes
- **Inline annotations, a comment bot and a coverage-diff service** — each a
  token or a dependency for a repository with three packages and no external
  contributors. The reversal trigger is an external contributor, or a reviewer
  needing per-PR diff coverage

The fingerprint proved something five stories of clean-clone measurement had
not: **the frontend artefact is byte-identical on Linux**, and all three files
are, not just the bundle — `index-C-Puqfnm.js` at 343,658 B / md5
`cba2825c87721779927b2f385df406e9`, the stylesheet at 10,926 B / `f98519e3…`
and `index.html` at 1,101 B / `eab270a4…`, 355,685 B over three files, matching
a macOS build hash for hash. Every previous re-measurement of that identity ran
on macOS.

### 16. The badge, three independent identifiers, and an endpoint state that changed under us

The badge is at the top of `README.md` and links to the workflow's **run
history** rather than to a branch's last run, so a red badge is one click from
the reason.

Three identifiers have to agree and they are independent of each other: the
badge URL keys on the **file** name, the required status check keys on the
**job** name, and the badge's rendered label comes from `name:`. That is why the
badge read `verify - passing` for four tasks while the file was still `ci.yml`,
and why Task 1.10.6 renamed the file **before** publishing the badge rather than
after.

**The endpoint's states were measured anonymously rather than assumed, and one
of them is transient — which only re-measuring found.** Task 1.10.6 recorded
three: a file GitHub has never seen answers **`404 text/plain`** (a broken
image, not the "no status" badge that was predicted); a file with no run on the
tracked ref answers 200 `verify - no status`; and the **old path kept answering
200 `verify - passing` after the file was gone**, serving the last conclusion it
ever had. Task 1.10.8 re-took all three and **the third has expired**:
`ci.yml/badge.svg` now answers `404 text/plain`, and GitHub's workflow list
holds exactly one entry. So the failure mode of renaming a workflow without
moving its badge is **stale green for a window, then a broken image** — worse
than either alone, because the wrong signal arrives first and the obvious one
arrives after nobody is looking. The rule is unchanged and its reason is
sharper: renaming this file means editing the badge URL in the same commit.

**The badge does not report what GitHub documents it as reporting.** It is
documented as the default branch's status; it was watched going `no status` →
`passing` on a **pull request** run while `main` had never run `verify.yml` at
all. `README.md` says so rather than repeating the documented claim.

### 17. `verify` is a required status check, and that is configuration no file here can hold

Repository ruleset **`main`, id 22160620**, `enforcement: active`, scoped to
`~DEFAULT_BRANCH`. It requires a pull request and the `verify` check. Re-read
from the API in Tasks 1.10.7 and 1.10.8 rather than cited, and every field
matches.

**Amended 2026-09-04 (Task 1.13.4): the ruleset now requires TWO checks,
`verify` and `e2e`.** `verify.yml` gained a second job running the browser
suite, and it gates a merge for the reason coverage does not — it is a pass/fail
assertion about the product working, not a number nobody can agree on. Every
other field of the ruleset is unchanged and was re-read. ADR 0013 carries the
argument; this section stays the durable record of the gate itself, and a reader
finding only `verify` required should read that as the browser gate having been
removed rather than never set.

**Nothing in the tree records it, no tool reads it, and `pnpm verify` cannot see
it** — so the repository has no way to detect its own gate being switched off,
and a reader who finds it absent cannot tell whether it was removed or never
set. This ADR is the only durable copy, which is the reason it is a numbered
section rather than a footnote.

Four things fail silently:

- It keys on the **job** name, so renaming the job un-requires it with no error
  anywhere. That is why Task 1.10.2 settled the workflow, job and file names four
  tasks before anything depended on them
- **Admin bypass is retained** (`bypass_actors`: RepositoryRole 5,
  `bypass_mode: always`), so the gate is a decision to override rather than a
  wall, and a merged red run leaves no trace in any file
- `require_extra_approval_for_unattributed_changes` is **off**, against GitHub's
  default of **on**: with `required_approving_review_count: 0` it blocks the
  maintainer's own pull request over a co-author trailer that resolves to no
  account
- `strict_required_status_checks_policy` is **off**, because a `pull_request`
  run already verifies the merge commit rather than the branch tip (§4)

**What it binds is the chain and nothing about coverage**, because the job is
green whatever the `continue-on-error` step did. That is the intended shape
rather than an oversight.

### 18. The job summary is three sections and the order is a decision

The per-step split first — it **is** the chain, so a reader who opens a run
meets the thing the badge is a claim about. The frontend fingerprint second, as
a record of what the run produced. Coverage last, because it is the one section
the tick does not certify, and a figure that gates nothing should not be the
first number under a green tick.

The split in the summary is a **redirect of output that already exists**, not a
second report: it reads the same derived file the log table does, so §3's
derived-not-declared property survives into the summary.

**No count is written anywhere in the summary.** The coverage section's
hand-written "103 tests and the 10-test process suite" was removed in the same
change that added the summary, because a hand-listed chain in a nicer typeface
is §2's fork wearing better clothes. The runner-to-runner spread is printed
beside the table for the reason it is recorded here: without it, a reviewer
reads a normal run as a regression and blames the cache for a slow one.

### 19. Every failure class was made to happen on the runner, twice, and the second time on the shipping file

Task 1.10.2 proved the failure path against a work-in-progress workflow. Task
1.10.8 proved it again against the shipped one, five edits later, through a
throwaway branch with its own draft pull request — because §4 means a bare
branch push runs nothing, and because a deliberate red probe on the story's own
branch would then be blocked by §17's required check, which is the one thing that
gate was set to prevent.

| Probe                                  | Died at        | Exit  | Evidence                                               |
| -------------------------------------- | -------------- | ----- | ------------------------------------------------------ |
| Type error in `packages/shared`        | `build`        | **2** | `TS2322` — tsc's own code, not a flattened 1           |
| Unformatted Markdown in `planning/`    | `format:check` | 1     | Prettier names the file                                |
| A component's stories file moved aside | `stories`      | 1     | `1 of 9 components have no stories.`                   |
| A deliberately failing unit test       | `test`         | 1     | `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL`                    |
| A deliberately failing process test    | `test:process` | 1     | the seventh step, red on the runner for the first time |

Every one ended as a run **conclusion of `failure`** rather than a green tick
with red text inside it, and the derived split named the step it died in on all
five. The `test` case is the deepest nesting this repository has — package script
→ `pnpm -r` → `verify` → the runner — and the exit code arrived intact, which is
the one claim this whole story leans on.

One thing the probes taught that the plan did not anticipate: the first attempt
at the `test` probe was a failing test that was also unformatted, and it died at
`format:check` without ever reaching `test`. **A chain reports its first failure
and nothing after it**, so a probe has to be surgical or it proves the wrong
step.

## Rejected, with reasons

| Rejected                                               | Why                                                                                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| A job per `verify` step, or a matrix                   | Forks the definition of "verified" between CI and a laptop — the failure this story exists to prevent. Per-step visibility is bought by §3 instead   |
| A provider-agnostic runner script                      | A second place the pipeline lives, for portability nobody needs                                                                                      |
| GitLab / Circle                                        | A second host beside the one every story already flows through                                                                                       |
| A pinned runner image                                  | Ages out of support and fails hard; `ubuntu-latest` is GitHub's own image                                                                            |
| Floating action tags                                   | Third-party code with the repository checked out; SHAs, at the price of a manual bump                                                                |
| A pnpm install step or a pnpm action                   | `packageManager` is the pin                                                                                                                          |
| Corepack before `setup-node`                           | Pins pnpm to whatever Node the image ships for one step — a second, invisible toolchain                                                              |
| Caching `node_modules`                                 | A tree linked against a different store and lockfile: a failure class with no error message                                                          |
| Caching `dist/` / `storybook-static/` / `.tsbuildinfo` | Moves one step by ~2.5 s against a 13.6 s spread, in exchange for Story 1.9's 13 silent test failures                                                |
| `--trust-lockfile`                                     | Removes the dominant line of a cold install by skipping the check this runner exists to run                                                          |
| Coverage as a second job                               | A second runner, a second install and an unavoidable second `pnpm build`                                                                             |
| Coverage as a second workflow                          | Triggers and the concurrency group are properties of the workflow                                                                                    |
| A coverage threshold                                   | §10 — three reasons, one now spent and replaced by a stronger fourth                                                                                 |
| A coverage-reporting service                           | A token, a second definition of the number, an external dependency                                                                                   |
| Uploading `storybook-static/`                          | 9.3 MB per push for a bundle nothing downstream consumes                                                                                             |
| Uploading `apps/frontend/dist/`                        | An upload would be downloaded to answer what the fingerprint already answers                                                                         |
| `pnpm ready` as a step                                 | `verify` runs with no servers up; it would fail every run for the correct reason                                                                     |
| `actionlint`, `shellcheck`                             | One workflow file, one shell file and two `rm -rf` strings against a root dependency and another chain step                                          |
| Dependabot                                             | Declined for now on the same one-file argument; the trigger is a fifth action or a published advisory                                                |
| A link checker in the chain                            | Built, run and declined: 0 broken links over 110 documents. It would gate the half that has never rotted — see §"What a green tick does not certify" |
| A merged-coverage mechanism                            | A coverage directory per spawn, a merge step, and a second definition of the backend's number, for a figure nobody gates on                          |

## Consequences worth stating separately

### What a green tick does not certify

Five things sit outside the net, deliberately. They are listed in full in
`README.md` and `CLAUDE.md`; the shape is what belongs here.

1. **`apps/backend/scripts/dev.sh`** — `prettier --file-info` reports
   `"inferredParser": null` and ESLint reports `File ignored because no matching
configuration was supplied`. It carries `LOG_FORMAT`'s development default,
   the one configuration value `pnpm env:check` cannot see
2. **Two `rm -rf` fragments** inside `clean` scripts — unchecked shell in a JSON
   string
3. **A stated invariant that has quietly stopped being enforced** — the only kind
   that has actually caused a wrong claim to stand. `apps/frontend`'s `types`
   array was documented in three places as making `process` a compile error and
   stopped being one for two stories with every tool green; re-measured in Task
   1.10.7 and still only ESLint stands there. Story 1.10 added two more of this
   kind inside the test suites, both green when wrong: the two-runner naming
   partition, and `test:process` against a stale `dist/`
4. **The figures in the documentation, and its internal links** — and the two
   halves are not alike, which is why the link check was **built, run and
   declined**. 110 tracked Markdown files, 210 cross-file links, 13 anchor
   links, **0 broken**. The cheap half has never rotted; the half that cannot be
   checked at all is wrong nearly every time it is read — a stylesheet size
   stale for two stories, three more figures wrong in one reading, and a heading
   count recorded as 42 against an actual 36 one task after it was written. A
   gating step there would guard the wrong half **and make the section look
   covered**. If it is ever built it is an eighth `pnpm verify` step and a script
   under `scripts/`, never a workflow step
5. **The workflow file's schema — half a gap.** Prettier reads the file
   (`"inferredParser": "yaml"`, and a badly-formatted probe workflow fails
   `format:check` by name), so its formatting is inside the net. Its schema is
   not, and neither are its **four hand-bumped action SHAs**: `pnpm outdated` has
   no view of a YAML file and the lockfile has no view of GitHub

And a sixth thing that is not a file at all: **the required status check** (§17).

### Two things that read like gaps and are not

The per-step split and the coverage table are **diagnostics** (§3, §9), and a
`continue-on-error` step's `conclusion` reads `success` however it exited (§9).
Both look exactly like CI swallowing something and neither is.

### Do not read a CI total as a regression

Two runners measured **31,075 ms and 21,989 ms on the same commit**, and nine
runs of one tree spanned **18,589–32,210 ms** — all on the six-step chain. The
seven-step chain has five readings of a chain that ran end to end —
**43,263 / 42,664 / 41,019 / 39,441 / 34,278 ms** — a **~9.0 s spread**, which
is the six-step shape reproducing rather than the pipeline settling down. (The
41,019 ms run is §19's fifth probe: every step ran, and the last one failed.)
Read the install summary and the per-step split.

The runner is 1.5–3.2× the laptop **per step**, and unevenly: on one directly
comparable pair, `build` is 3.24× and `test:process` **1.08×** (§14).

## Measured

### Acceptance criteria, re-run against the shipped pipeline

| Criterion                                               | Result                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Runs on push and on pull request                        | **Yes** — push restricted to `main` by decision (§4), with `workflow_dispatch` for the branch case. Both observed           |
| The verification step is `pnpm verify` and nothing else | **Yes** — one step, and the file names no chain step anywhere                                                               |
| Toolchain pinned the way local machines pin it          | **Yes** — `node: v24.20.0 (.nvmrc pins v24.20.0)`, `pnpm: 11.24.0 (packageManager pins 11.24.0)`, no pnpm install step      |
| A failure in any stage fails the pipeline visibly       | **Yes** — five failure classes, five `failure` conclusions, exit codes 2/1/1/1/1 (§19)                                      |
| Caching keeps runtimes reasonable                       | **Store half met, build half deliberately refused** — `cache-hit: true`, `reused 397, downloaded 0` on every run taken (§7) |
| Status is visible from the repository                   | **Yes** — badge 200 `verify - passing`, three-section job summary, and a required status check (§16, §17, §18)              |
| Runs on Linux, first platform-specific binding          | **Yes** — exactly one binding, `@rolldown+binding-linux-x64-gnu@1.2.6`, asserted by name and count                          |
| Runs from a clean environment                           | **Yes** — no cached build state of any kind; every run builds from nothing                                                  |

### The runner

| Measurement                        | Result                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Seven-step chain, five readings    | 43,263 / 42,664 / 41,019 / 39,441 / **34,278** ms — a ~9.0 s spread; the 41,019 ms run is §19's probe 5, red at the last step |
| Per-step split, run 33710087090    | build 6,759 / lint 6,706 / `format:check` 5,326 / `stories` 386 / `env:check` 394 / `test` 5,619 / `test:process` **8,375**   |
| Install, cache hit (n=4 this task) | 4,231 / 4,341 / 4,388 / 4,477 ms — inside the recorded 3,895–4,597 ms                                                         |
| Supply-chain check, on a cache hit | 492 entries in 3.5 / 3.7 / 3.8 s — uncacheable in principle, and it verifies before `--frozen-lockfile` is enforced           |
| Cache, categorically               | `cache-hit (exact key): true`, `Cache restored from key: pnpm-store-v1-Linux-node24-…`, `reused 397, downloaded 0`            |
| Packages                           | **397** on Linux against 398 on macOS — `fsevents@2.3.3`, and not Rolldown                                                    |
| Toolchain                          | `node: v24.20.0`, `pnpm: 11.24.0`, `Linux 6.17.0-1022-azure x86_64`, store at `/home/runner/.local/share/pnpm/store/v11`      |
| Coverage, from the runner          | 30% / 64.33% / 68.25% statements — identical to the laptop, to the digit                                                      |
| Entrypoint assertion               | Both pages present: `apps/backend/coverage/src/index.ts.html`, `apps/frontend/coverage/src/main.tsx.html`                     |
| Frontend artefact, from the runner | 3 files, **355,685 B** — `343658 / cba2825c…`, `10926 / f98519e3…`, `1101 / eab270a4…`, **all three matching macOS**          |

### The laptop, for comparison

| Measurement                       | Result                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`, warm               | **19,989 ms**, exit 0 — seven steps                                                                                         |
| Per-step, warm                    | build 2,088 / lint 3,642 / `format:check` 3,078 / `stories` 261 / `env:check` 267 / `test` 2,439 / `test:process` **7,777** |
| `pnpm coverage`                   | 2,731 ms, exit 0 — 30.00% / 64.33% / 68.25%                                                                                 |
| Frontend artefact                 | 3 files, 355,685 B, md5s as above                                                                                           |
| Pinned actions, counted from file | **4** — checkout, setup-node, cache, upload-artifact. No `.github/dependabot.yml`                                           |
| Ruleset, re-read from the API     | id 22160620, active, `~DEFAULT_BRANCH`, context `verify`, bypass RepositoryRole 5 `always`, both changed defaults still off |
| Badge endpoint                    | `verify.yml` → 200 `verify - passing`; `ci.yml` → **404** (was 200 frozen green in Task 1.10.6); unknown file → 404         |

## Related

- ADR 0001 — `pnpm verify` as the single acceptance command, the `&&` chain whose
  exit code §2 depends on, and the root-only tooling rule
- ADR 0002 — `buildServer()` without listening, and the signal handling §14's
  suite finally tests
- ADR 0003 — the Rolldown binding §6 asserts by name, and the frontend artefact
  §15 fingerprints
- ADR 0006 — `config.ts`'s port range, which §14 declines to widen for a test
- ADR 0007 — the crash handlers §14 injects into, and the `redact` denylist
  argument this story reuses
- ADR 0008 — `pnpm ready`, which §13 keeps out of the chain
- ADR 0009 — coverage on demand and without a threshold, which §10 keeps; the
  test levels §14 adds a fourth to; and the stale-`dist` measurement §7 rests on
- Story 1.11 — hosting, `CORS_ORIGIN` in a real environment, and whether
  `storybook-static/` is published as a site
