import type { ReactNode } from "react";

import { PageHeader } from "../components/PageHeader/PageHeader.js";

// A route that exists, is navigable, and says honestly what will fill it.
//
// Three of the four experiences in PRODUCT_SPEC.md §8 are still placeholders,
// and this is deliberately not a "coming soon" screen: it names the epic that
// builds the thing, in the present tense of the plan, so that a stranger
// clicking through the application learns what the product is rather than that
// it is unfinished.
//
// **Since the 2026 refresh it is a `PageHeader` and nothing else** (ADR 0022).
// It used to draw its own bordered card with its own label, title and
// paragraph — one of five route modules doing that slightly differently. The
// masthead is the same component every real screen uses, so a placeholder and
// the Security Explorer now open the same way, and the difference between them
// is that one has content under the rule and the other does not. That is the
// honest difference, and it reads far better than a card apologising for
// itself.
export function Placeholder({
  name,
  children,
}: {
  readonly name: string;
  readonly children: ReactNode;
}) {
  return (
    <PageHeader eyebrow="Placeholder" title={name} description={children} />
  );
}
