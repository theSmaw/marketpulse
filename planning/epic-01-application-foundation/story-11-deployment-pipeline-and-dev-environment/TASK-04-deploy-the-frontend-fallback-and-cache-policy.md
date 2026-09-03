# Task 1.11.4 — Deploy the frontend, with a fallback that is not a catch-all and a stated cache policy

**Status:** Not started
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Depends on:** Task 1.11.1

## Objective

Serve `apps/frontend/dist` from a real static host, close the two Story 1.5 acceptance criteria that were deliberately left open because they are properties of the host, and decide caching rather than inheriting it.

## Work

- **Upload `apps/frontend/dist` and nothing else.** It is three files — `index.html`, one hashed `assets/*.js`, one hashed `assets/*.css` — with no `package.json` and no `node_modules`, and it is **byte-identical on Linux and macOS**: 343,658 B / md5 `cba2825c…`, 10,926 B / `f98519e3…`, 1,101 B / `eab270a4…`, 355,685 B over three files. Compare what the host is serving against a local build; a difference is a real difference and not a platform artefact. Re-take the figures rather than copying this bullet — they are five stories old in places and this repository has been wrong twice by citing rather than rebuilding
- **`apps/frontend/storybook-static/` must not ship by accident.** `pnpm build` produces it too — 59 files and 9.3 MB — and a `dist`-shaped glob or a "copy everything the build produced" step picks it up. Story 1.10 declined to keep it as a build artefact and explicitly left **whether the workshop is published as a site** to this story: take that decision here, in one place. If it is published, it is a second static site with its own URL, and the build-time substitution rule applies to it exactly as it does to `dist/` — a `VITE_`-prefixed credential is a string literal in a file every visitor downloads, in both artefacts
- **Configure a history-API fallback, and scope it.** Three constraints, all from Story 1.5 and all easy to violate with the platform's default setting: it must serve `index.html` with a **200 and not a redirect**, because a 302 to `/` discards the path and defeats the purpose; it must **not be a blanket catch-all**, or a missing asset is answered with `index.html` and reaches the browser as a MIME-type error rather than a 404 naming the file — the `vite preview` trap reproduced in production, where a partial upload looks like a broken application with no error naming the cause; and it does not fix a subpath, which remains a `base` change and a **rebuild**. Task 1.6.5 built the smallest correct version — scoped, declining to rewrite anything whose last segment contains a dot — and it is worth reading before configuring the real one
- **Verify the fallback against four things, not one.** All four real routes deep-loaded cold (`/investigations`, `/securities`, `/replay` and `/`), a **made-up path** rendering the application's own `NotFound` route, and **`/assets/nope.js` returning a 404** that names itself. The made-up path is the half that is easy to think is already met: `NotFound` is a real route and renders correctly _given_ that the host served `index.html` for an address that matched nothing. Measured locally, `python3 -m http.server` 404s every deep link, so nothing about passing locally is evidence here
- **Decide the cache policy explicitly; it is untouched today.** The JS and CSS filenames are content-hashed and `index.html` is not, which is the shape that wants long-lived immutable caching on `assets/` and no caching on `index.html`. Get it backwards and a deploy is invisible to returning users for as long as the TTL. Read the response headers from the deployed site rather than trusting the platform's description of its defaults
- **Record the rest of what a real host does that `python3 -m http.server` never proved**: HTTPS and any http→https redirect, compression (and whether the recorded byte sizes are the compressed or uncompressed ones — the artefact is 343,658 B of JavaScript and about 111 kB gzipped, and quoting the wrong one is how a fingerprint stops matching), and whether uploads are atomic, which Task 1.11.7 needs
- **`base` stays `/` unless the host forces a subpath.** If it does, that is a rebuild and a per-environment artefact, and `basename` follows `base` automatically since Task 1.6.5 — so the two cannot desynchronise, but the artefact becomes path-specific

## Done when

- The frontend is reachable over HTTPS at a URL written down in the repository
- The three served files match a local build byte for byte
- All four routes deep-load cold, a made-up path renders `NotFound`, and a missing asset returns a 404 — each checked by request, not by reasoning
- The cache headers on `assets/*` and on `index.html` were read from the deployed site and are what was intended
- `storybook-static/` is confirmed absent from what was uploaded, by inspection of the deployed site rather than of the upload command
- The publish-the-workshop question is answered either way
- Whether uploads are atomic is recorded

## Notes

This task closes two acceptance criteria belonging to a story that has been complete since 2026-08-31. Task 1.5.5 declined to tick them on local evidence and said why; the deliberate consequence is that they can only be ticked here, against a real host, and they should be re-checked here rather than inherited from that reasoning.
