// Typed access to the design tokens, for the consumers that are not React
// components.
//
// --- The decision, and its cost ---
//
// Task 1.4.3 had to answer where the source of truth for a token value lives:
// CSS, TypeScript, or a generated pair. **CSS is the source of truth, and this
// file is a typed reader over it.**
//
// The alternative — TypeScript as the source, with a generator emitting the CSS
// custom properties — buys compile-time values and costs a build step, a
// generated file in the tree, and a staleness check in `verify` to stop the two
// drifting. That is real machinery for a problem this product does not have
// yet: nothing outside the browser needs these values, and CSS is where a
// second theme swaps in.
//
// What that choice costs, stated rather than discovered later:
//
//   1. **Every value is a string.** `--space-4` reads as `"4px"` and
//      `--surface-page` as `"#f4f3ee"`. Epic 6's Sigma.js/WebGL renderer wants
//      numbers and packed colours, so it will need a parse layer. That layer is
//      Epic 6's to write against real requirements; inventing it here would be
//      guessing at them.
//   2. **`getComputedStyle` is a main-thread read.** It is called once, at
//      startup, and the result is frozen and cached — not once per frame, and
//      not once per component. That is the whole reason this module exists
//      rather than each consumer reaching for `getComputedStyle` itself.
//   3. **The read has to happen after the stylesheet is applied.** In practice
//      the token stylesheet is a static import of the entry module, so it is
//      applied before any of this runs. `readTokens` throws rather than
//      returning empty strings if that ever stops being true.
//   4. **A second theme invalidates the cache.** With one theme in V1 nothing
//      re-reads; `readTokens` is exported uncached for the day that changes.
//
// The named-tuple below is the other half of the bargain. A CSS Module class
// name is unchecked — `styles.typo` is `undefined` and renders unstyled in
// silence — but a token name here is a union member, so a typo is a compile
// error, and a token that is declared but missing from the stylesheet is a
// startup throw naming it.

// Every token this module exposes. Deliberately not every token in tokens.css:
// spacing and type are consumed by CSS alone today, and a name here is a
// promise to keep the value readable from JavaScript.
const TOKEN_NAMES = [
  "--surface-page",
  "--surface-raised",
  "--surface-sunken",
  "--ink-primary",
  "--ink-secondary",
  "--ink-disabled",
  "--rule-hairline",
  "--rule-soft",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

export type Tokens = Readonly<Record<TokenName, string>>;

/**
 * Reads every declared token from the document root. Uncached — call
 * {@link getTokens} unless a theme has just changed.
 *
 * @throws if any declared token resolves to nothing, which means either the
 * token stylesheet has not been applied or a name here no longer exists in it.
 */
export function readTokens(): Tokens {
  const computed = getComputedStyle(document.documentElement);
  const tokens: Partial<Record<TokenName, string>> = {};

  for (const name of TOKEN_NAMES) {
    const value = computed.getPropertyValue(name).trim();

    if (value === "") {
      throw new Error(
        `Design token ${name} resolved to nothing. Either the token stylesheet ` +
          `has not been applied, or the token was removed from tokens.css ` +
          `without being removed here.`,
      );
    }

    tokens[name] = value;
  }

  // The loop above assigns every member of TOKEN_NAMES or throws, which is a
  // fact TypeScript cannot see through an index signature.
  return Object.freeze(tokens as Record<TokenName, string>);
}

let cached: Tokens | undefined;

/** The token values, read once and reused. */
export function getTokens(): Tokens {
  cached ??= readTokens();
  return cached;
}
