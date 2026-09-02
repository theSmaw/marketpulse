# Task 1.8.6 — Reach a running application from a clean clone

**Status:** Complete
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Task 1.8.5

## Objective

Prove the story's headline criterion the only way it can be proved: clone into an empty directory, follow the written words, and end up looking at the application. This is the acceptance test for the whole story.

## Work

- **Follow the document, not the tree you already have.** Clone into an empty directory with an empty pnpm store and an empty `COREPACK_HOME`, so Corepack fetches the pinned pnpm from the registry and pnpm downloads every package rather than reusing anything local. Then execute the README's words literally, including the ones that look obviously skippable. The failure mode this catches is knowledge that exists only in this session
- **Six clean-clone runs already exist and none of them started the pair.** Task 1.1.8 proved the clone reaches a repository that installs and verifies; Task 1.3.5 re-proved it with the frontend present (cold store, 200 packages in 1.3s, `pnpm verify` in 7.6s, a **byte-identical** bundle — the package count has moved since, Task 1.8.3 adding two for `@fastify/cors`, so re-take it rather than comparing against 200); Task 1.4.6 re-ran it at 10.5s with the workshop in the chain; Task 1.5.6 at 11.0s with the router, the chrome and the regions; Task 1.6.7 at 9.3–9.8s with a sixth `verify` step; Task 1.7.7 at 8.77s warm and **13.2s** from a genuinely cold clone. Three consecutive stories have measured that total going up and down while the tree only grew, so **read the per-step split rather than the total** and do not present it as a trend. Install-and-verify is the part that is already covered; **starting the pair from that clone is what is outstanding, and it is the only half left**
- **Run `pnpm dev` in the clone and reach all four addresses in a browser.** Not `curl` — the criterion is a running _application_, and most of what looks like a fault on a first run is only visible in a page. Reach `/`, `/investigations`, `/securities`, `/replay` and a made-up path, and confirm each matches what Task 1.8.5 wrote about it
- **There are five first-run surprises to confirm, not three, and Task 1.8.5 found the fifth while writing them down.** The brief predicted the disconnected feed indicator, the `--:--:-- ET` clock and the render check's deliberate `STALE` and `DISCONNECTED` rows. The landing route also carries a **titled red block reading "Peer comparison failed"**, inside the render check's feed-status module, and it is arguably the worst of the five: the other four are neutral states that merely _read_ as faults, while this one uses the product's actual failure vocabulary — a title, a red rule, the word "failed" — because demonstrating that vocabulary beside the three feed states is exactly what it is there for. It is also easy to mistake for Story 1.7's error fallback, which it is not: a fallback carries a "Try again" button and this does not. Confirm the README's sentence distinguishing them survives contact with someone who has not read this paragraph
- **Exercise the two setup paths that are easy to get wrong, because a first-timer will.** Start with no `.env` at all and confirm the pair comes up on defaults; then copy `apps/backend/.env.example` to `apps/backend/.env` exactly as written and confirm nothing changes; then put a deliberately invalid value in it and confirm the failure names the key and quotes what was typed, before the server binds. A setup document that has never been followed wrongly has not been tested. **There are five variables since Task 1.8.3, not four**, and the fifth is the one whose default matters most to this task: `CORS_ORIGIN` defaults to `http://localhost:5173`, which is exactly what makes a clone with no `.env` a _working pair_ rather than merely two running servers
- **Run `pnpm ready` in the clone, and run it in the two places it can say something surprising.** It has never been executed outside this machine's working tree. Before any build it should say `Cannot read apps/backend/dist/config.js — run \`pnpm build\` first`, because it reads the backend's built configuration to respect `PORT`and`HOST`— worth confirming, since a clean clone is the only place that path is reachable naturally. With the pair up it should exit 0 naming both addresses. And with a deliberately invalid`.env` it should report the configuration error as a plain line rather than a stack, which is a second reading of the invalid-value path this task already exercises
- **Reproduce the half-dead pair from the clone, because it is the failure a first-timer is most likely to actually hit.** Occupy 3000 before `pnpm dev` — a server left running from an earlier session is the realistic case — and confirm what Task 1.8.5 wrote about it is true from a clone: the sixteen-line `EADDRINUSE` record, the frontend still serving, `pnpm dev` still running with nothing exiting non-zero, and `pnpm ready` naming the backend as the half that is down. Then confirm both recovery traps: freeing the port alone does not bring it back, and neither does `touch`ing a source file — only a real edit does. This is the one first-run failure where the terminal actively misleads, so a README sentence about it that has never been followed is worth less than the rest
- **Do the loop, not just the launch.** Edit a backend source file and a frontend component in the clone and confirm both reload — the two mechanisms have different baselines (Task 1.8.1 measured **941–1198 ms, median 963** for the backend's process restart and Task 1.8.2 re-took it at **961–1248 ms, median 1016** after the logging change — the same number, still dominated by tsc's incremental compile; compare against a foreground module replacement at 56–257 ms) and a fresh clone is where a missing build step shows up as a loop that does not work. Prove the frontend half was HMR with an unchanged `performance.timeOrigin` and a `navigation` entry count of 1, and record `document.visibilityState` with any timing — a hidden tab costs 4–6× and makes a number that looks like a regression. Then Ctrl-C and confirm zero survivors in the process group with both ports released
- **Fix, do not note.** If a step turns out to be undocumented, machine-specific, or in the wrong order, the change goes into `README.md` in this task rather than into a list for later. Story 1.10 runs the same sequence in CI and Story 1.11 in a deployment environment, so an undocumented step here becomes a CI failure there
- **One thing in the README that will look like a defect and is a deliberate call — judge it rather than fixing it on sight.** Task 1.8.5's brief said "do not name a package" in the Ctrl-C paragraph, because the package pnpm blames is a race. The README does not name one _in its prose_ — it says outright that the name is a race and is not information — but it **quotes a real transcript**, and that transcript says `packages/shared`. The clone may well print `apps/frontend` instead. That is the point being made rather than a stale quotation, and the reasoning was that a paragraph describing scary output without showing it is harder to recognise in the moment than one that shows it and disclaims it. This task is entitled to reverse that and elide the package name from the block; what it must not do is quietly "correct" the transcript to whatever the clone happened to print, which would assert exactly the thing the paragraph denies
- **`README.md` now has ten intra-document links and nothing checks them.** Task 1.8.5 added five headings and the links into them, and a heading rename breaks a link silently — `pnpm verify` has no view of it. Confirm all ten resolve after any edit this task makes. One subtlety that will bite a hand-written anchor: GitHub replaces each space with a hyphen **without collapsing runs**, so `### \`pnpm ready\` — knowing the pair is up`slugs to`pnpm-ready--knowing-the-pair-is-up` with a **double** hyphen where the em dash was. A checker that collapses whitespace reports that correct link as broken
- **The README carries figures now, and one of them was already stale when this task's predecessor arrived.** Task 1.8.5 found the stylesheet documented as 9.82 kB against an actual 10,926 B — Task 1.7.6's error fallback, two stories unrecorded. The figures a clean clone can check are the startup line count, `pnpm ready`'s poll window, both reload timings and the bundle sizes. Re-take them in the clone rather than reading past them; a figure in a setup document is a claim like any other
- **One thing this task must not attempt, and saying so is part of it.** Story 1.8's "the frontend can call the backend" criterion is **met and unobservable**. Task 1.8.3 shipped the mechanism and removed its probe, so nothing in the application calls the API until Story 1.12 — a page load makes zero requests to 3000 and the backend's terminal stays silent, which is correct rather than broken. `curl` cannot stand in either: the server sends the allowed origin to **every** caller, so a 200 from `curl -H "Origin: …"` proves nothing about what a browser does. Record the criterion as met on Task 1.8.3's browser demonstration and do not invent a check here; a check that cannot fail is worse than no check
- **Be precise about what a clean clone cannot prove.** It has no stale `dist`, so it cannot reproduce the silent-pass trap `tsc -b` exists to prevent — that evidence is in Tasks 1.1.4 and 1.1.7 and should be cited rather than expected to recur. It has no worktrees under `.claude/worktrees/`, so root-tooling-walks-into-a-nested-checkout cannot recur either. And it says nothing about deep-linking on a real host, which stays Story 1.11's
- Confirm `pnpm verify` exits 0 in the clone, and record the per-step split rather than only the total

## Done when

- A clean clone reaches all four running addresses in a browser by following `README.md` alone
- No step required knowledge that exists solely in this session, and anything that did is now written down
- The no-`.env`, correct-`cp` and invalid-value paths were each exercised in the clone
- All five first-run surprises were seen in a browser in the clone, the sample failure block included, and each one's README sentence held up
- The README's ten intra-document links resolve, and every figure it publishes was re-taken in the clone rather than read past
- Both reload mechanisms work in the clone, and Ctrl-C leaves nothing behind
- `pnpm ready` was run in the clone before a build, with the pair up, and against an invalid `.env`
- The half-dead pair was reproduced from the clone and both recovery traps confirmed
- `pnpm verify` exits 0 there, with the per-step split recorded and the total not presented as a trend
- What the clean clone could **not** prove is stated, with the tasks that hold that evidence instead

## Notes

The instruction is the same one Task 1.1.8 followed and it is the whole value of the task: if a step is wrong, fix it here. This is also the run an interviewer is standing in for — PRODUCT_SPEC.md §40 is the reason the criterion is written as "a clean clone", not "a working machine".

## Outcome

A clean clone reached the running application by following `README.md` alone.
Every figure the document publishes was re-taken in the clone rather than read
past, and **four sentences in it were wrong** — three claims, corrected here.
Nothing in the source tree changed.

### 0. What "clean" meant

Cloned from `https://github.com/theSmaw/marketpulse.git` into an empty
directory with an empty `COREPACK_HOME` (Corepack fetched the pinned pnpm
11.24.0 from the registry — confirmed by the new `corepack/v1/pnpm/11.24.0`
appearing) and an empty pnpm store. The store had to be pointed at with
`--store-dir`; the `npm_config_store_dir` / `NPM_CONFIG_STORE_DIR` env vars are
**ignored** by pnpm 11 and an install that looks cold is not, which is worth
knowing before anyone re-runs this.

Cold install: **327 packages, 327 downloaded, 0 reused, 3.1 s.** Task 1.3.5's
200 is stale by 127 packages across five stories, so quote this one rather than
that. `allowBuilds` did not fire: `esbuild` is still the tree's only install
script.

### 1. `pnpm verify` in the clone, per step

Exit **0**, three times: 14.64 s on the first cold run after install, 9.66 s
warm, and 12.78 s cold again after a `pnpm clean`. Read the split, not the
total — three stories have now watched the total move in both directions while
the tree only grew.

| Step           | Warm   |
| -------------- | ------ |
| `build`        | 2.12 s |
| `lint`         | 3.38 s |
| `format:check` | 2.58 s |
| `stories`      | 0.25 s |
| `env:check`    | 0.26 s |
| `test`         | 0.49 s |

Cold, `build` splits `tsc -b` 1.83 s / `vite build` 0.51 s / `storybook build`
1.50 s.

The artefact reproduces exactly: **271 modules, 343,658 B of JavaScript,
10,926 B of CSS, three files**, and the bundle's md5 is
`cba2825c87721779927b2f385df406e9` — byte-identical to the working tree's and
to the md5 Task 1.7.7 recorded from its own cold clone. `storybook-static` is
59 files and 9.3 MB. The README's published stylesheet figure of 10.93 kB is
correct.

### 2. `pnpm ready` in all three places it can say something

- **Before any build**, which is only naturally reachable from a clean clone:
  `Cannot read apps/backend/dist/config.js — run \`pnpm build\` first.`, exit 1.
  The documented message, verbatim
- **With the pair up**: exit 0, both addresses named. **0.33 s** warm, and
  **0.86 s** when run in the same breath as `pnpm dev` — it waited out the
  startup, as the 15-second poll window is there to let it
- **Against an invalid `.env`**: the configuration error as plain lines, no
  stack, exit 1

One cosmetic thing seen and deliberately not fixed, because this task's remit
is the document: with **two** bad keys, `pnpm ready` indents the first line of
the error and not the second.

### 3. `pnpm dev` from the clone

**Thirteen lines, and 1,159 ms** from invoking the command to the server's
`Server listening at` line (3:32:10.169 → 3:32:11.328). "Under a second and a
half" holds. The pair came up with **no `.env` file at all**, on port 3000 and
`127.0.0.1`, which is what `CORS_ORIGIN`'s default of `http://localhost:5173`
makes a working pair rather than two running servers.

All four routes and a made-up path were reached in a browser and each matched
the README's table: `/` with its four region landmarks and the render check,
three placeholders, and `NotFound` on `/nonsense-made-up-path`. **Zero console
errors, and zero requests to port 3000 across 265 network requests** — which is
the criterion Task 1.8.3 met being correctly invisible, not a fault.

### 4. All five first-run surprises, seen in a browser

The `DISCONNECTED` feed indicator with "No market data until Epic 3"; the
`--:--:-- ET` clock; the render check's deliberate `STALE` and `DISCONNECTED`
rows; and the **"Peer comparison failed"** block, which is the one the brief
was right to worry about — it is a title, a red rule and the word "failed", in
the product's real failure vocabulary. The README's sentence distinguishing it
from Story 1.7's fallback survives contact with the running page for a concrete
reason: **the sample block has no "Try again" button and the fallback does**,
so the test the document gives you is one you can actually apply on sight.

The fifth is Ctrl-C, below.

### 5. Both reload mechanisms, and the frontend half proved rather than assumed

**Backend**, edit to new listener: **1428, 897, 944 ms** — median 944, first
one slowest, and the process id changed each time. That sits inside Task
1.8.1's 941–1198 and Task 1.8.2's 961–1248; "about a second" holds.

**Frontend**, in a tab whose `visibilityState` was `hidden` throughout — worth
stating first, because a hidden tab costs 4–6× and these are upper bounds:

- first component edit after a server start: **939 ms**
- warm component edits: **77, 220, 1146, 1286 ms**
- CSS-only edits: **42, 102, 189 ms**

`performance.timeOrigin` was unchanged and the `navigation` entry count stayed
**1** across every one of them, so all of it was module replacement and none of
it was a reload. The two kinds of edit are an order of magnitude apart in the
clone exactly as Task 1.4.6 measured; the long tail on the component samples is
the throttled tab, not the loop.

Ctrl-C: **9 processes to 0 survivors**, both ports released, the server's own
`signal received` / `shutdown complete` pair printed, one `Failed` line, and
the spurious `node_modules missing` warning.

### 6. The three setup paths a first-timer gets wrong

- **No `.env` at all** — the pair comes up on defaults. This is the state the
  whole run above was in
- **`cp apps/backend/.env.example apps/backend/.env` exactly as written** —
  nothing changes. Both copies are gitignored (`git status` stays clean; the
  `!.env.example` negation really is line 17 of `.gitignore`, as the example
  file claims). The copy sets `LOG_FORMAT=json` and the dev loop **still**
  rendered pretty, which is the documented precedence rule demonstrating itself:
  `scripts/dev.sh` exports a real environment variable and a real variable beats
  a file entry
- **An invalid value** — `PORT=nonsense` and `LOG_LEVEL=INFO` together produce
  both lines, each naming its key and quoting what was typed, before anything
  binds. Nothing was listening on 3000 afterwards, exit 1

### 7. The half-dead pair, reproduced from the clone

With a leftover server on 3000, the record is **sixteen lines** and the sentence
you need is **line 4 of 16**; `server failed to start ` still renders with its
trailing space. `pnpm dev` kept running, the frontend kept serving 200, and
**nothing exited non-zero**. `pnpm ready` named the half that was down and
diagnosed it correctly — "Something is holding 127.0.0.1:3000 and not answering.
That is not this server".

Both recovery traps confirmed:

- **Freeing the port is not enough.** Six seconds after the squatter died the
  backend was still down; `pnpm ready`'s diagnosis usefully changed from
  "something is holding the port" to `ECONNREFUSED`
- **`touch`ing a source is not enough either**, and the log shows exactly why:
  tsc reported `File change detected. Starting incremental compilation…` and
  `Found 0 errors.` and emitted nothing, so `node --watch` — which watches
  `dist/` — never saw a thing
- A real edit brought the listener back in **1,273 ms**

The opposite conflict was reproduced too, for symmetry: a busy 5173 is seven
lines, `Exit status 1`, and the whole of `pnpm dev` gone.

### 8. Three README claims were wrong, and four sentences changed

Everything else in the document held. These did not:

1. **"…ending with Vite's address and the server's `Server listening at` line."**
   The listening line is reliably last; **where Vite's address lands is a race**
   — in one run the three Vite lines came before the backend's compiler lines
   and in another after. Now says the last line is the listening line and that
   the interleaving above it is not a signal
2. **"Edit a frontend component and the change is in the browser in about
   100 ms."** That is the _stylesheet_ figure. The document's own opening
   section already had this right — "a stylesheet edit in 24–130 ms, a component
   edit in a few hundred" — so the README disagreed with itself two hundred
   lines apart. Now a couple of hundred milliseconds for a component, under one
   hundred for a stylesheet
3. **`ready in 96 ms`, quoted twice** as what you will see. The clone said
   `ready in 121 ms`. It is a machine-specific number presented as a constant,
   and neither passage needs the figure to make its point — both now describe
   the line rather than quoting a time

### 9. Two things checked and deliberately left alone

**The Ctrl-C transcript still names `packages/shared`,** and this clone printed
`packages/shared` too. The prose around it already says outright that the
package pnpm blames is whichever watcher exits first and that the name is not
information, so the block is doing the job it was written for — showing you the
scary output so you recognise it — while denying the one thing it could
accidentally assert. Left as it stands.

**All the intra-document links resolve.** Eleven link occurrences to ten
distinct headings, plus nine relative file links, all present. The
double-hyphen anchor `pnpm-ready--knowing-the-pair-is-up` is **correct**:
GitHub replaces each space with a hyphen without collapsing runs, so the removed
em dash leaves two. The first checker written for this reported it broken, which
is precisely the false positive the brief predicted.

### 10. What the clean clone could not prove

- **The stale-`dist` silent pass** that `tsc -b` exists to prevent. A clean
  clone has no stale `dist`; the evidence is in Tasks 1.1.4 and 1.1.7
- **Root tooling walking into a nested checkout.** There are no worktrees under
  `.claude/worktrees/` in a clone
- **Deep-linking on a real host.** All four routes and a made-up path deep-link
  here, and that is a property of Vite's dev server, not of the application.
  Story 1.11 owns it, and Task 1.5.5 measured both sides
- **The frontend calling the backend.** The criterion is met and unobservable:
  Task 1.8.3 shipped the mechanism and removed its probe, so a page load makes
  zero requests to 3000 — measured, above — and `curl` cannot stand in, because
  the server sends the allowed origin to every caller. Recorded as met on Task
  1.8.3's browser demonstration; no check was invented here, because a check
  that cannot fail is worse than none
