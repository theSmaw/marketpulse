# Task 1.6.5 — `base` and `basename` as one input

**Status:** Not started
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.4

## Objective

Close the silent desynchronisation Story 1.5 created: Vite's `base` and React Router's `basename` are two build-time inputs describing one fact, and nothing today connects them.

## Work

- **Reproduce the failure before fixing it, because it is the kind that looks like success.** `<BrowserRouter>` in `apps/frontend/src/App.tsx` takes **no `basename`**. Build with `base: "/marketpulse/"`, serve the artefact from that subpath on a plain static host (`python3 -m http.server` from a parent directory — not `vite preview`, whose fallback answers everything), and record what happens: the assets resolve, React boots, and the **not-found route renders at the application's own address**. An application that looks deployed and is not. Getting this on the record is half the value of the task
- **Wire `basename` from `import.meta.env.BASE_URL`.** Vite sets it from `base` at build time, so reading it is the one-line way to make the pair impossible to desynchronise — one input, two readers, which is the same shape as `target` in `tsconfig.json` and `build.target` in `vite.config.ts`, and that pair is the precedent to cite in the comment. Note the trailing-slash convention differs between the two (`"/marketpulse/"` against React Router's expectation) and check it rather than assuming; a basename that is off by a slash fails the same way as no basename at all
- **Re-run the subpath build afterwards and confirm all four routes plus the not-found state work under it**, then rebuild at the default `/` and confirm nothing changed there — the default path is the one every other story depends on and the regression would be invisible in review
- **Keep `paths.ts` out of it.** Route paths live once in `apps/frontend/src/routes/paths.ts` as an `as const` object precisely so `tsc -b` catches a typo, and they are the same in every environment. Nothing here turns them into strings read from the environment; the basename is a deployment fact and the paths are not. Say so in the file, because the next person reading "configuration" and "routes" in one task will reach for exactly that
- **Update Story 1.11's constraints and ADR 0003's note** so the "subpath deployment is a `base` change and a rebuild" sentence stops being half the story. It is now one variable and a rebuild, which is a better answer, and 1.11 should inherit the finished version rather than the warning

## Done when

- The broken case is recorded from an actual build and an actual static host, not described
- A subpath build deep-links correctly on all four routes and the not-found route at a plain static host, with the host's own limitation (Story 1.11 owns the fallback rewrite) still noted rather than papered over
- The default `/` build is unchanged and still three files
- `apps/frontend/src/App.tsx` carries the reason in a comment, not just the code
- `pnpm verify` exits 0

## Notes

This is cheaper now than it will ever be again. There are four routes and one `<BrowserRouter>`; after Epic 4 there are more of both, and the failure mode does not become easier to spot.
