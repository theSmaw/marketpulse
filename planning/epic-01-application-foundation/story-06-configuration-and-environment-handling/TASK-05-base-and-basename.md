# Task 1.6.5 — `base` and `basename` as one input

**Status:** Complete — 2026-08-31
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.4

## Objective

Close the silent desynchronisation Story 1.5 created: Vite's `base` and React Router's `basename` are two build-time inputs describing one fact, and nothing today connects them.

## Work

- **Reproduce the failure before fixing it, because it is the kind that looks like success.** `<BrowserRouter>` in `apps/frontend/src/App.tsx` takes **no `basename`**. Build with `base: "/marketpulse/"`, serve the artefact from that subpath on a plain static host (`python3 -m http.server` from a parent directory — not `vite preview`, whose fallback answers everything), and record what happens: the assets resolve, React boots, and the **not-found route renders at the application's own address**. An application that looks deployed and is not. Getting this on the record is half the value of the task
- **Wire `basename` from `import.meta.env.BASE_URL`.** Vite sets it from `base` at build time, so reading it is the one-line way to make the pair impossible to desynchronise — one input, two readers, which is the same shape as `target` in `tsconfig.json` and `build.target` in `vite.config.ts`, and that pair is the precedent to cite in the comment. Note the trailing-slash convention differs between the two (`"/marketpulse/"` against React Router's expectation) and check it rather than assuming; a basename that is off by a slash fails the same way as no basename at all
- **Re-run the subpath build afterwards and confirm all four routes plus the not-found state work under it**, then rebuild at the default `/` and confirm nothing changed there — the default path is the one every other story depends on and the regression would be invisible in review
- **`BASE_URL` is exempt from the prefix rule, and that is why this works at all.** Task 1.6.4 stated `envPrefix: ["VITE_"]` in `vite.config.ts` as a decision and proved against the artefact that a non-prefixed variable compiles to `void 0` at the reference site. `import.meta.env.BASE_URL` is not a `.env` variable — it is one of Vite's own built-ins, set from `base`, and the prefix rule does not apply to it. So reading the basename from it is not a hole in the boundary and does not need one; check it renders the real value in the built bundle rather than assuming, since a `void 0` here would be a `basename` of `undefined` and would look exactly like the bug this task is fixing
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

## Outcome

**Done on 2026-08-31.** One prop and a comment block in
`apps/frontend/src/App.tsx`, and nothing else in the source tree. Everything
else this task produced is measurement.

```tsx
<BrowserRouter basename={import.meta.env.BASE_URL}>
```

Ran **after** Task 1.6.6 rather than before it; the reason is recorded in that
task's outcome and in `STORY.md`, and it does not affect anything here.

### The broken case, reproduced rather than described

`base: "/marketpulse/"` in `vite.config.ts`, built, copied outside the
workspace into `<host>/marketpulse/` and served by `python3 -m http.server`
from the parent. The assets are found — `index.html` references
`/marketpulse/assets/index-*.js` and both it and the stylesheet are 200 — React
boots, the chrome renders, and:

| At `/marketpulse/`  | Value                                |
| ------------------- | ------------------------------------ |
| `location.pathname` | `/marketpulse/`                      |
| `<main> h1`         | **`No such page`**                   |
| region landmarks    | 0 (the landing route has four)       |
| `<header>`          | present, and looks perfectly healthy |

An application that looks deployed and is not, exactly as this task predicted.

**The half the task did not predict is worse, because it survives the fix
being applied to only one page.** Every link in the chrome pointed off the
deployment entirely:

```
Market Overview        -> /
Investigation Workspace -> /investigations
Security Explorer      -> /securities
Market Replay          -> /replay
Go to Market Overview  -> /            (the not-found route's own recovery link)
```

So a subpath deployment without a `basename` is not one broken screen. It is a
not-found page whose recovery link leaves the application, under a header whose
every link leaves the application. There is no route from which a user recovers.

### `BASE_URL` is a real literal in the artefact, not `void 0`

The check this task asked for, because a `void 0` here would be a `basename` of
`undefined` and would look exactly like the bug. From `dist/assets/index-*.js`
at `base: "/marketpulse/"`:

```js
jsx(BrowserRouter, { basename: `/marketpulse/`, children: ... })
```

`grep -c 'basename:void 0'` is **0**. This is not a hole in Task 1.6.4's
`envPrefix` boundary and does not need a `VITE_` prefix: `BASE_URL` is one of
Vite's own built-ins, set from `base`, rather than anything a `.env` file can
reach. At the default `base` it compiles to `` basename: `/` ``.

### The trailing slash, checked rather than assumed

Vite normalises `base` to carry a trailing slash, so `BASE_URL` is
`/marketpulse/` and never `/marketpulse`. React Router accepts it and strips one
internally — the rendered links are `/marketpulse/investigations`, not
`/marketpulse//investigations`. So the two conventions do not have to be
reconciled and nothing here trims a slash. At the default `base` the value is
`/`, which is what React Router already assumed, which is why the default
deployment is untouched.

### All four routes and the not-found state, under the subpath

Client-side navigation from `/marketpulse/`, on the plain static host:

| Address                       | `<main> h1`             | `aria-current`          | Regions |
| ----------------------------- | ----------------------- | ----------------------- | ------- |
| `/marketpulse/`               | Market Overview         | Market Overview         | 4       |
| `/marketpulse/investigations` | Investigation Workspace | Investigation Workspace | 0       |
| `/marketpulse/securities`     | Security Explorer       | Security Explorer       | 0       |
| `/marketpulse/replay`         | Market Replay           | Market Replay           | 0       |
| `/marketpulse/nonsense`       | No such page            | none                    | 0       |

Four region landmarks on the landing route and none elsewhere is Task 1.5.4's
layout intact; `aria-current` being absent on the not-found state is correct,
since no navigation item is current.

### The host's limitation, not papered over

Those are **client-side** navigations. On the plain static host every deep link
is a 404 — `/marketpulse/replay`, `/marketpulse/securities` and
`/marketpulse/nonsense` all 404 before React exists, which is Task 1.5.5's
finding unchanged and Story 1.11's to configure. `basename` does not touch it
and was never going to.

To confirm the routes work on a **cold** load rather than only after a
client-side transition, this task also built the smallest honest version of the
rewrite Story 1.11 owes — a fallback scoped to the subpath that declines to
rewrite anything whose last segment contains a dot:

| Request                       | Status  |
| ----------------------------- | ------- |
| `/marketpulse/`               | 200     |
| `/marketpulse/replay`         | 200     |
| `/marketpulse/securities`     | 200     |
| `/marketpulse/investigations` | 200     |
| `/marketpulse/nonsense`       | 200     |
| `/marketpulse/assets/nope.js` | **404** |
| `/other/`                     | **404** |

Deep-loaded directly, `/marketpulse/replay` renders Market Replay with
`aria-current` set and the page ground computed as `rgb(244, 243, 238)` — the
stylesheet applied, so the whole cascade arrived under the subpath too. And
`/marketpulse/nonsense` renders `No such page` with its recovery link now
reading `/marketpulse/` rather than `/`.

That server is scratch and is not committed; it exists because it is the
measurement Story 1.11's "must not be a blanket catch-all" constraint was
written from, and now that constraint has a working example behind it rather
than only a warning. Both figures are recorded in Story 1.11's STORY.md.

### The default build is unchanged

`base` restored, rebuilt:

| Figure     | Before    | After         |
| ---------- | --------- | ------------- |
| Modules    | 265       | 265           |
| JavaScript | 342.00 kB | **342.01 kB** |
| CSS        | 9.82 kB   | 9.82 kB       |
| Files      | 3         | 3             |

+0.01 kB, which is the prop. `index.html` still references `/assets/index-*.js`
and `` basename: `/` `` is what ships. All four routes plus the not-found state
re-checked on a static host at the default path, and the **dev server** too,
since `BASE_URL` is `/` there and a mistake would have shown up as the router
refusing to match anything.

The workshop is unaffected and was not touched: `.storybook/preview.tsx` wraps
stories in a `MemoryRouter`, which takes no basename and reads no `BASE_URL`.

### Documentation

ADR 0003's "a subpath deployment is a `base` change and a rebuild" paragraph
now carries the half that was missing, and Story 1.11's two bullets inherit the
finished mechanism rather than the warning — one variable and a rebuild, with
the fallback measurements above.

### `pnpm verify`

Exit 0. No dependency added, no lockfile change.
