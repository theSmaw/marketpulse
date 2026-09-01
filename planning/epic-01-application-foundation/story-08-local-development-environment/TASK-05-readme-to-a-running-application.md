# Task 1.8.5 — Extend the README from a building repository to a running application

**Status:** Not started
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Tasks 1.8.2, 1.8.3, 1.8.4

## Objective

Rewrite the part of `README.md` that says plainly it cannot get you to a running application, so that it can — including the four things a first run sees that look like faults and are not.

## Work

- **This extends the README; it does not create one.** Task 1.1.8 wrote prerequisites (Node 24.x — required, not a minimum, because `engineStrict` refuses other majors; `corepack enable`), the setup sequence, the full command table, the layout, the install-script policy and editor setup, and every command in it was executed rather than written from memory. Its "What exists today" section names itself as the first thing to change when the repository reaches a running application. That section is this task's starting point, and re-checking the existing content is in scope while rewriting it is not
- **Configuration is already written and this task follows it rather than replacing it.** Task 1.6.6 wrote the `## Configuration` section. Three things a first run trips over are already documented there: **neither `.env` file is needed** (every backend variable has a default and a missing file is swallowed silently, so a fresh clone starts on 3000 and `127.0.0.1` with no file at all); the **`cp` destinations are package-local and must be copied as written** — `cp apps/backend/.env.example apps/backend/.env`, never `cp .env.example .env`, because a root `.env` is read by neither package and fails silently; and the **failure message is part of the setup experience** — `PORT must be an integer between 1 and 65535, received "nonsense"`, before the server binds
- **"Running" now means four addresses, not one.** There are four routes — `/`, `/investigations`, `/securities`, `/replay` — plus a not-found route. A README that gets someone to `/` has got them to a quarter of the application. Say what each address is for and what is deliberately empty in it, so an interviewer following this document knows they are looking at a shell on purpose (PRODUCT_SPEC.md §40)
- **Explain the disconnected feed indicator, in one sentence, or the first run reads as a broken setup.** `AppHeader` renders a `FeedIndicator` hard-coded to `disconnected` with the detail "No market data until Epic 3", on every route. It is honest and it is the most prominent thing on the page. One sentence stops a correct first run looking like a failed one
- **Say what a rendered error fallback means, and where the exception is.** Three error boundaries contain a render failure to the box it happened in, so a broken region is a labelled box with a reset button and the rest of the screen keeps working. The one exception belongs beside the feed indicator: the header's own fallback replaces the `<header>`, so a broken chrome takes the banner landmark and the navigation with it
- **Deep-linking works here and is not a property of the application.** `vite` and `vite preview` answer any unmatched path with `index.html` and a 200, so all four routes and any made-up address deep-link locally — and all **404** on a plain static host serving the identical build (Task 1.5.5 measured both). This document is entitled to say deep-linking works _locally_; it must not write that down as a property of the application. Story 1.11 owns the host, and two of Story 1.5's criteria are annotated rather than ticked for exactly this reason
- **Say "build first" wherever one package is run alone.** `pnpm --filter @marketpulse/frontend dev` after a `pnpm clean` starts and serves but prints `Failed to run dependency scan … @marketpulse/shared … Are they installed?` — which points at the install and actually means the project reference has no `dist`. Root `pnpm dev` never shows it, because the shared watcher is one of its three loops
- **Set expectations for the terminal, since it is what someone stares at.** Startup prints two builds of `packages/shared` (its own watcher and the backend's reference-following one), a browser page load costs the rendered-line count Task 1.8.1 measured, and Ctrl-C is noisy on the way out — pnpm reports each interrupted watcher as `Failed` and adds a spurious `node_modules missing` warning. None of it is a failure and all of it looks like one
- **Do not document `pnpm test` as if it tests anything.** All three scripts are `echo` placeholders that exit 0 and they are the only placeholders left. The sentence "a green `pnpm test` means _no tests exist_, not _tests pass_" is already in the README, in `CLAUDE.md` and in ADR 0001; keep it true here
- **Add nothing to the prerequisites unless this story introduced one.** They were done in Task 1.1.8 and re-check is the job, not rewrite. No database is required yet — PostgreSQL arrives in Epic 2, at which point this section extends
- Prettier owns Markdown, so run `pnpm format` before `pnpm verify` — an unformatted README fails `format:check`

## Done when

- The README's "what this gets you" framing describes a running application, and no sentence in it is now false
- All four routes and the not-found route are named, with what is deliberately empty in each
- The disconnected feed indicator, the error fallbacks, the noisy Ctrl-C and the doubled shared build each have a sentence saying they are expected
- Deep-linking is described as local-only, without asserting it of the application
- Every filtered single-package command says "build first" where it needs to
- Prerequisites and the configuration section are re-checked rather than rewritten
- `pnpm verify` exits 0

## Notes

This task writes the document; Task 1.8.6 follows it from a clean clone and is allowed to change it. Anything written here that survives 1.8.6 unedited was either right or untested, and 1.8.6's job is to tell those apart.
