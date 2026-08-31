// Class-name composition. Three lines, and it exists because of a measured
// interaction between two settings this repository already had before any CSS
// did — recorded in Task 1.4.1 and owed by Task 1.4.2.
//
// `vite/client` types a CSS Module as `{ readonly [key: string]: string }`,
// and `noUncheckedIndexedAccess` (tsconfig.base.json) turns every lookup on an
// index signature into `T | undefined`. So `styles.row` is `string | undefined`
// rather than `string`, and the idiomatic template composition —
// `` className={`${styles.row} ${styles.negative}`} `` — is a
// `@typescript-eslint/restrict-template-expressions` error per interpolation.
// Task 1.4.1's spike measured four of them on one row component, and `lint`
// runs with `--max-warnings 0`, so that is a failing build rather than noise.
//
// The alternative was `noUncheckedIndexedAccess: false`, which trades a real
// guarantee across the whole workspace for a convenience in one file type.
// This is the cheaper half of that trade.
//
// First called in Task 1.4.4, a task earlier than expected. The predicted
// caller was Task 1.4.5's components; the actual one is the render check's
// price column, where a cell is `cx(styles.numeric, styles.negative)` — a
// layout class and a semantic-colour class on the same element. That is the
// shape the helper was written for, and it turns out the semantic token layer
// produces it before any component does.
export function cx(...parts: readonly (string | undefined)[]): string {
  return parts.filter((part) => part !== undefined).join(" ");
}
