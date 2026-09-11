import type { Security } from "@marketpulse/shared";

// Which securities a typed query matches, and in what order (Task 2.11.2).
//
// ## Where this lives
//
// `src/market/`, because matching over securities is market domain and this
// module's barrel is already the enforced API — `market/index.ts` plus the
// `no-restricted-imports` pattern in `eslint.config.mjs` that forbids anything
// outside the directory from reaching past it. A new feature module was
// considered and declined for one concrete reason beyond "there is nothing to
// separate": ESLint's flat config resolves a rule to the **last** configuration
// that matched, so a second config object setting `no-restricted-imports` for
// `apps/frontend/src/**` would not add to the browser boundary's — it would
// replace it, and the boundary would vanish with no symptom (`CLAUDE.md`, "What
// `pnpm verify` does not cover", item 3). Using the module that already exists
// touches that file not at all.
//
// ## Why it is a pure function in a file of its own
//
// Ranking is the part of search that is easy to get subtly wrong and impossible
// to review inside a component. Three different mechanisms have to agree —
// `nvda` is a symbol, `NVDA` is a case-fold, `nvid` is a company name — and a
// `filter()` written while wiring a listbox is where that gets guessed. It is
// also the seam `SEARCH-AND-SELECTION.md` §2 names for the day matching moves
// server-side: the signature becomes `(query) => Promise<ranked>` and one
// module changes rather than a component.
//
// ## The rules, in one place
//
// A query matches a security through **one of four tiers**, and the tier is the
// primary sort key:
//
// | Tier | Rule                                              | `nvid` | `nv`         |
// | ---- | ------------------------------------------------- | ------ | ------------ |
// | 1    | the query **is** the symbol, case-folded          | —      | —            |
// | 2    | the symbol **starts with** the query              | —      | NVDA, NVR    |
// | 3    | the name **starts with** the query                | NVDA   | NVDA, NVR    |
// | 4    | the query starts a **later word** of the name     | —      | —            |
//
// Two rules are deliberately absent, and both are the same argument:
//
// - **A symbol substring that is not a prefix does not match.** `VD` does not
//   find `NVDA`. Symbols are one-to-five-character identifiers over a 26-letter
//   alphabet, so substring matching there is close to random — `A` appears
//   inside a large fraction of the universe — and nobody types the middle of a
//   ticker. Prefix is how an identifier is entered.
// - **A name substring that does not start a word does not match**, which is
//   measured rather than reasoned. `SEARCH-AND-SELECTION.md` §0: a naive
//   `name.includes("nv")` returns **seven** securities, five of which a person
//   typing `nv` did not mean — `FRT` (Federal Realty **Inv**estment Trust),
//   `INVH` (**Inv**itation Homes), `IVZ` (**Inv**esco), `KVUE` (Ken**vu**e) and
//   `QQQ` (**Inv**esco QQQ Trust). Under the word-boundary rule above, `nv`
//   returns two. That test is the first one in the file beside this.
//
// Tier 3 and tier 4 are one mechanism with the offset split out: the query must
// begin at a **word boundary** in the name. That is what makes a multi-word
// query work without a second rule — `bank of` matches `Bank of America` at
// offset 0, and `of america` matches it at offset 5 — and it is why `nvid`
// resolves through the name path when no symbol contains it at all. Acceptance
// criterion 1's third spelling cannot be satisfied with symbol rules alone.
//
// ## The order is total
//
// Two securities in the same tier break their tie by **status, then symbol
// alphabetically** — never by the universe's incidental array order, or the
// list reshuffles between renders for reasons nobody can see. Symbols are
// unique, so the comparator can never fall through to equality between two
// distinct rows.
//
// The status half is the one open question `SEARCH-AND-SELECTION.md` §6 left to
// this task, and the answer is that an untracked security **ranks below** a
// tracked one in the same tier. Not that it is filtered: §6 and `UNIVERSE.md`
// §12.2 both settle that this screen shows what we stored, and a search that
// drops an untracked security reintroduces the vanishing row that having no
// `deleted_at` exists to avoid. Rank is a different question from membership,
// and a person typing three letters is overwhelmingly looking for a security we
// track now. It changes nothing at tier 1, where the match is unique.
//
// ## The cap
//
// {@link SECURITY_MATCH_LIMIT} matches are returned and the **true total** is
// returned beside them. The cap belongs here rather than in the view because a
// view cannot cap a list without knowing whether it is truncating, and
// `showing 10 of 24` is a sentence both the result surface and §4's live region
// have to be able to write truthfully.
//
// ## Cost, against a number rather than by default
//
// This is a linear scan over the universe with no index, and the figure that
// makes an index unjustifiable is `SEARCH-AND-SELECTION.md` §0's: **0.295 ms**
// at 518 securities and **0.58 ms** over a synthetic 5,000 — two orders of
// magnitude inside a 16.7 ms frame, at ten times PRODUCT_SPEC.md §6's ceiling.
// Re-measured 2026-09-11 against these rules over the real 518, because the
// word-boundary scan is not the scan that produced those figures, and it is
// **faster** rather than slower — a symbol prefix answers before the name is
// touched: **0.101 ms** for `nv`, **0.040 ms** for `nvid`, **0.072 ms** for
// `a` (99 matches), and **0.216 ms** over the same synthetic 5,000. Twenty
// iterations each, `performance.now()`, against `apps/backend/dist/universe.js`.
// Still a linear scan, so the slope is unchanged. Re-take it if that stops
// being true — a scorer
// with a nested loop over name tokens is a different curve, and
// `SEARCH-AND-SELECTION.md` §2's reversal trigger is written against exactly
// that.

/**
 * How many matches {@link matchSecurities} returns before it starts truncating.
 *
 * Ten, which is a listbox a person can read without scrolling and without the
 * result surface covering the page it floats over. It is a judgement rather
 * than a derived figure; what is not a judgement is that the true total travels
 * with it, so the number here can change without any sentence becoming a lie.
 */
export const SECURITY_MATCH_LIMIT = 10;

/**
 * Which rule matched, in rank order. Exported because the result surface may
 * want to say *why* a row is in the list, and because a test asserting an order
 * reads better naming tiers than restating the comparator.
 */
export const MATCH_TIERS = [
  "symbol-exact",
  "symbol-prefix",
  "name-prefix",
  "name-word-prefix",
] as const;

/** One of {@link MATCH_TIERS}. */
export type MatchTier = (typeof MATCH_TIERS)[number];

/** A security the query matched, and the rule it matched through. */
export interface SecurityMatch {
  security: Security;
  tier: MatchTier;
}

/**
 * The answer: a ranked page of matches, and how many there really were.
 *
 * `total` is the count **before** the cap, and `matches.length < total` is the
 * only thing that entitles a caller to say "showing the first N".
 */
export interface SecurityMatches {
  matches: readonly SecurityMatch[];
  total: number;
}

const NO_MATCHES: SecurityMatches = { matches: [], total: 0 };

const TIER_RANK: Record<MatchTier, number> = {
  "symbol-exact": 0,
  "symbol-prefix": 1,
  "name-prefix": 2,
  "name-word-prefix": 3,
};

/**
 * Normalise what a person typed: case-folded, trimmed, and interior runs of
 * whitespace collapsed to a single space so `bank  of` and `bank of` are one
 * query. A query that is empty or entirely whitespace normalises to `""`, which
 * {@link matchSecurities} answers with nothing at all.
 */
function normaliseQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Does a word start at this offset in `text`?
 *
 * Offset 0 always does; anywhere else does when the character before it is not
 * a letter or a digit. So `NVIDIA Corporation` has boundaries at `N` and `C`,
 * and `Berkshire Hathaway Inc. Class B` has one at `C` of `Class` despite the
 * `.` before the space. This is what keeps `nv` out of Ken**vu**e while letting
 * `inc` find `Inc.`.
 */
function startsWord(text: string, offset: number): boolean {
  if (offset === 0) return true;
  const previous = text[offset - 1];
  return previous === undefined || !/[a-z0-9]/.test(previous);
}

/**
 * The name half of the rules: the offset of the first word boundary where
 * `query` begins, or `-1`.
 *
 * A scan of `indexOf` rather than a tokenise-then-compare, for two reasons: a
 * multi-word query spans the boundary between tokens and would need rejoining,
 * and this allocates nothing per security.
 */
function wordBoundaryIndex(name: string, query: string): number {
  let from = 0;
  for (;;) {
    const found = name.indexOf(query, from);
    if (found === -1) return -1;
    if (startsWord(name, found)) return found;
    from = found + 1;
  }
}

/** The tier this security matches `query` through, or `null` for no match. */
function tierFor(security: Security, query: string): MatchTier | null {
  const symbol = security.symbol.toLowerCase();
  if (symbol === query) return "symbol-exact";
  if (symbol.startsWith(query)) return "symbol-prefix";

  const nameIndex = wordBoundaryIndex(security.name.toLowerCase(), query);
  if (nameIndex === 0) return "name-prefix";
  if (nameIndex > 0) return "name-word-prefix";
  return null;
}

/**
 * Rank within a tier: tracked before untracked, then symbol alphabetically.
 * Symbols are unique across the universe, so this never returns 0 for two
 * distinct securities and the ordering is total.
 */
function compareWithinTier(a: Security, b: Security): number {
  if (a.status !== b.status) return a.status === "active" ? -1 : 1;
  return a.symbol < b.symbol ? -1 : 1;
}

/**
 * Which securities match `query`, best first, capped at `limit`.
 *
 * `status` is **not** an input to whether a security matches — an untracked
 * security is returned exactly as a tracked one is (`UNIVERSE.md` §12.2) — only
 * to where it ranks among equals.
 *
 * An empty or whitespace-only query matches **nothing**, rather than
 * everything. The surface this feeds is a result list that appears over the
 * page; "everything" is already on screen underneath it, and a listbox that
 * opens with 518 rows the moment a field is focused is a worse answer than a
 * closed one.
 */
export function matchSecurities(
  universe: readonly Security[],
  query: string,
  limit: number = SECURITY_MATCH_LIMIT,
): SecurityMatches {
  const normalised = normaliseQuery(query);
  if (normalised === "") return NO_MATCHES;

  const matches: SecurityMatch[] = [];
  for (const security of universe) {
    const tier = tierFor(security, normalised);
    if (tier !== null) matches.push({ security, tier });
  }

  matches.sort((a, b) => {
    const byTier = TIER_RANK[a.tier] - TIER_RANK[b.tier];
    return byTier === 0 ? compareWithinTier(a.security, b.security) : byTier;
  });

  return {
    matches: limit >= matches.length ? matches : matches.slice(0, limit),
    total: matches.length,
  };
}
