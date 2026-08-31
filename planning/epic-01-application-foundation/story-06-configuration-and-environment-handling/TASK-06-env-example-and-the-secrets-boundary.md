# Task 1.6.6 — `.env.example` and the secrets boundary

**Status:** Not started
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.5

## Objective

Document every variable the application reads, and verify — rather than assume — that a real secret cannot be committed or shipped to a browser.

## Work

- **Write `.env.example` from the configuration module, not from memory.** Every variable, with a description, whether it is required, its default if it has one, and a safe placeholder value. **There is no schema object to reflect over** — Task 1.6.1 closed that decision as no schema library — so whether this file can be generated or checked depends entirely on whether Task 1.6.2 gave the module a declaration list. Take that decision as it stands rather than reopening it: if the list exists, walk it and make the check real; if it does not, the staleness question is unanswered and the honest response is a sentence in the file naming `config.ts` as the source of truth. What this task must not do is invent a second list here, which is the thing that drifts
- **Decide where it lives, and it may be more than one file.** `.env` files load from `apps/frontend/` for the frontend and from wherever Task 1.6.3 put the backend's. One example at the repository root documenting both is the friendlier read for Story 1.8's clean-clone criterion; two beside their packages match where the real files go. Pick and say why — the failure to avoid is an example file sitting somewhere no loader looks
- **Verify the gitignore negation actually works rather than trusting the pattern.** `.gitignore` carries `.env`, `.env.*` and `!.env.example`. Create `.env`, `.env.local` and `.env.example` in every location a loader reads and check `git status` and `git check-ignore -v` for each: the first two ignored, the third tracked. The negation after a wildcard is the exact pattern that silently fails when a directory rather than a file is excluded, so measure it in place
- **Prove a secret cannot reach the bundle by planting one.** Set a plausible non-prefixed secret in the frontend's `.env`, build, and grep `dist/assets/*.js` for the value — absent. Then plant a `VITE_`-prefixed one and confirm it **is** present, because the whitelist is only a boundary if both sides of it behave. Remove both afterwards. This is the same technique as Task 1.6.4's boundary check and it is worth doing again here against a realistic value, since it is what the acceptance criterion actually claims
- **Write the rule down where someone will hit it.** Market-data and LLM credentials are server-side only, without exception — the browser talks to the MarketPulse backend, never to Alpaca or a model provider. That belongs in `.env.example` beside the first credential it will apply to, and in `README.md`, not only in this planning tree
- **Extend `README.md`.** It is the human-facing reference and currently says nothing about configuration. Add the setup step (`cp .env.example .env`), what happens with no `.env` at all, and the one sentence about which side secrets live on. Story 1.8 owns getting a clean clone to a running application and inherits whatever is written here

## Done when

- Every variable the application reads appears in the example, and nothing appears there that nothing reads — checked by grep in both directions
- The gitignore behaviour is verified in each location with the command output recorded
- Both halves of the bundle-grep are recorded, with the probe values removed from the tree
- `README.md` covers configuration and points at the example file
- `pnpm verify` exits 0 — and note Prettier owns Markdown, so an unformatted README fails it

## Notes

This task exists separately from 1.6.3 so the example is written once against a finished variable set rather than edited after every preceding task. If it turns out there are only two or three variables to document, that is the correct outcome and the file should say what it is waiting for — Epic 2's Alpaca credentials are the next entries.
