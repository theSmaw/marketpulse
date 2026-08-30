// The single Prettier configuration for the workspace, and the only place
// formatting decisions live. Formatting is Prettier's; correctness is ESLint's.
// The two do not overlap today and are not made to: of the 138 rules
// `eslint.config.mjs` enables on a TypeScript file, zero are formatting rules
// (verified with `eslint --print-config`), so `eslint-config-prettier` is not
// installed. See CLAUDE.md for how to re-run that check before assuming it.
//
// `.mjs` rather than `.prettierrc.json` for the same reason `eslint.config.mjs`
// is: every option here carries the reason it is set, and JSON cannot hold a
// comment. Prettier is installed only at the workspace root, exactly like
// ESLint — pnpm puts the root's `node_modules/.bin` on every package script's
// PATH, and Prettier searches upward for this file from each formatted file.

/** @type {import("prettier").Config} */
export default {
  // Most of what follows is Prettier's own default, restated. That is the
  // point: an explicit file means an upgrade cannot quietly restyle the tree,
  // and a disagreement about style is settled by editing one line here rather
  // than by argument.

  // Matches the width the existing comments and prose are already written to.
  printWidth: 80,

  // Aligned with `.editorconfig`, which binds the editor for file types
  // Prettier does not own.
  tabWidth: 2,
  useTabs: false,

  semi: true,

  // Double quotes throughout, matching the TypeScript sources and JSON. The
  // repo has no JSX yet; `jsxSingleQuote` is left at its default so JSX picks
  // up the same convention when Story 1.3 lands.
  singleQuote: false,

  // Prettier 3's default. Trailing commas keep single-line diffs single-line
  // when an argument or property is appended.
  trailingComma: "all",

  bracketSpacing: true,
  arrowParens: "always",

  // Not negotiable, and the reason it is stated rather than defaulted: LF is
  // what `.gitattributes` normalises to and what `.editorconfig` tells the
  // editor to write. All three have to say the same thing or a checkout on
  // Windows produces a tree Prettier considers unformatted.
  endOfLine: "lf",
};
