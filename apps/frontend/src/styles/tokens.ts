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
//      `--surface-page` as `"#f6f7fa"`. Epic 6's Sigma.js/WebGL renderer wants
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

// Every token this module exposes. Deliberately not every token in the
// stylesheets: spacing and type are consumed by CSS alone today, and a name
// here is a promise to keep the value readable from JavaScript.
//
// The market tokens in the second group are the reason this module exists at
// all. Epic 6's Sigma.js/WebGL topology colours a node by its anomaly band and
// by the direction of its move, and a canvas cannot read a CSS class — so
// `--anomaly-extreme` has to be reachable as a string from here. That was the
// case Task 1.4.3 answered in the abstract; this is the first group of tokens
// that actually depends on the answer.
//
// Note what comes back for a semantic token: the *substituted* value. Both
// `--price-unchanged` and `--ink-secondary` read as `"#5a5d5c"`, because the
// computed value of a custom property has its `var()` references resolved. The
// indirection in market.css is a source-level structure and it does not survive
// into this reader — which is fine, since a consumer wants the colour, but it
// does mean this module cannot be used to check that the indirection is intact.
const TOKEN_NAMES = [
  // Structural — tokens.css
  "--surface-page",
  "--surface-raised",
  "--surface-sunken",
  "--ink-primary",
  "--ink-secondary",
  "--ink-disabled",
  "--rule-hairline",
  "--rule-soft",
  // Added 2026-09-11 with `TextField`. No JavaScript consumer either, and it is
  // here for the same canary reason as `--brand-ink` below: it is the one rule
  // token whose value is a measured accessibility floor rather than a shade, so
  // a stylesheet that lost it would silently drop every input boundary back to
  // something that reads as a design choice and measures 1.26:1.
  "--rule-control",
  // Added by the 2026 refresh. `--rule-strong` is the near-black structural
  // rule, which a canvas drawing its own axes will want; `--brand-ink` is here
  // for a different reason and it is worth stating, because it has no
  // JavaScript consumer at all. It is the **canary for `brand.css`**: that file
  // is a third global stylesheet whose absence would otherwise be invisible —
  // an accent that resolves to nothing renders as inherited ink, which looks
  // like a design choice rather than a missing file. One name here turns that
  // into a startup throw. See `readTokens` below for the message.
  "--rule-strong",
  // Identity — brand.css
  "--brand-ink",

  // Market semantics — market.css
  "--price-positive",
  "--price-negative",
  "--price-unchanged",
  "--anomaly-normal",
  "--anomaly-elevated",
  "--anomaly-unusual",
  "--anomaly-extreme",
  "--feed-live",
  "--feed-stale",
  "--feed-disconnected",
  "--status-error",

  // Authorship — agent.css. Added 2026-09-11 with the third colour scope.
  // No JavaScript consumer yet, and here for the canary reason `--brand-ink`
  // is: `agent.css` is a fourth global stylesheet whose absence would render
  // as inherited ink, which looks like a design choice rather than a missing
  // file. One name here turns that into a startup throw.
  "--agent-fill",
  "--agent-ink",
  "--agent-wash",
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
          `has not been applied, or the token was removed from tokens.css, ` +
          `brand.css, market.css or agent.css without being removed here.`,
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
