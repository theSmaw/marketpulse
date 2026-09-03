// The typed half of the frontend's environment boundary (Task 1.11.5).
//
// Vite ships `ImportMetaEnv` with an index signature — `Record<string, any>` —
// so `import.meta.env.VITE_ANYTHING_AT_ALL` typechecks and evaluates to `any`.
// That is the wrong shape for this repository twice over. It defeats
// `strictTypeChecked`, which then reports `no-unsafe-assignment` at the reader
// rather than `TS2339` at the typo; and it makes the one failure mode
// `.env.example` warns about — a misspelled or non-prefixed name, which Vite
// substitutes to `void 0` and which therefore *silently never arrives* — a
// thing no tool in `pnpm verify` can see.
//
// Declaring `strictImportMetaEnv` is Vite's own supported way to turn the
// fallback off: `ImportMetaEnvFallbackKey` resolves to `never`, the index
// signature disappears, and every name has to be declared below. So this file
// is what turns a misspelled variable into a compile error, and it is the
// reason `VITE_API_BASE_URL` is a checked name rather than a string somebody
// remembered. Measured rather than assumed: reading
// `import.meta.env.VITE_API_BASE_URLL` is **TS2551** at exit 2, and tsc even
// suggests the correct name — where before this file it was `any`, evaluating
// to `undefined` at run time with nothing said anywhere.
//
// The cost is stated rather than discovered: **every** variable this frontend
// ever reads has to be added here as well as to `.env.example`. That is two
// places, and it is the same trade `CONFIG_VARIABLES` makes on the backend —
// `pnpm env:check` keeps that pair honest, and nothing yet keeps this one
// honest against `.env.example`. Extending `scripts/check-env-example.mjs` to
// read this file is the obvious next move and is deliberately not made here;
// see Story 1.12, which brings the second variable and is where a pair becomes
// a set.
interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  // Vite's own built-ins, restated because turning the fallback off removes
  // them from the index signature's reach. `BASE_URL` is the one this
  // application actually reads (`App.tsx`, since Task 1.6.5) and it is not a
  // `.env` variable at all — Vite sets it from `base` in `vite.config.ts`.
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;

  // The MarketPulse API's origin, and the first `.env` variable this frontend
  // has ever read.
  //
  // Optional on purpose. It is substituted at build time, so a build that did
  // not set it produces `undefined` here rather than an empty string, and the
  // resolver in `api-base-url.ts` is what turns that into the local default.
  // Typing it as a required `string` would be a lie the compiler would then
  // enforce on every reader.
  readonly VITE_API_BASE_URL?: string;
}
