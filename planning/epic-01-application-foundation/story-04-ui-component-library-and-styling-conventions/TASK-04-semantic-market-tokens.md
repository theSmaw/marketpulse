# Task 1.4.4 — Semantic market tokens

**Status:** Not started
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Depends on:** Task 1.4.3

## Objective

Add the tokens that carry market meaning — positive and negative price movement, anomaly intensity, stale and disconnected data — on top of the foundational layer. These are the tokens the rest of the product actually reaches for, and they are where an accessibility failure would be structural rather than cosmetic.

## Work

- Layer semantic tokens over the primitives from Task 1.4.3 rather than beside them: `--price-up` resolves to a palette entry, not to a hex value. One indirection is what makes a palette change possible later; two is what makes it unreadable
- **Colour must not be the sole encoding of anything, and this is the criterion Epic 15 will audit.** Red/green is insufficient on its own — roughly 1 in 12 men has a red-green deficiency, and this product's primary signal is direction of price movement. Pair colour with a second channel — sign, arrow, position, or shape — and make the pairing a **convention with a component behind it** (Task 1.4.5), not a note asking each future author to remember. Check the chosen pair against a simulated deficiency, not by reasoning about it. **The 2026-08-31 decision to give the chrome no accent colour makes this bullet more load-bearing, not less** — these semantic tokens are now the only colour anywhere in the interface, so there is no surrounding hue to contrast against and the redundant channel is carrying the whole signal for anyone who cannot separate the two
- Check contrast ratios against the **light surfaces** they actually sit on — the white raised surface and the warm `#f4f3ee` page ground — at the size they will be used. Small dense numerals are the hard case, and a colour that passes on one surface can fail on the other. Record the measured ratios rather than an assurance. **This bullet said "dark surfaces" until 2026-08-31**, when the theme reversed; the direction changed and the instruction did not
- **One of those measurements has already been taken, and it is a failure rather than a confirmation.** The reference palette's positive green, `#498100`, is **4.27:1 on the warm page ground** against a 4.5 threshold, and 4.75:1 on white. So the abstract risk in the bullet above has a concrete instance waiting: either the green darkens, or positive values are constrained to white surfaces. Decide it explicitly. The amber, `#dbaa35`, measures 1.93 and 2.14 on the two grounds and is therefore a **fill-or-icon colour only** — never text, at any size. `VISUAL-LANGUAGE.md` carries the table
- **Anomaly intensity is a scale, and the spec fixes its shape.** PRODUCT_SPEC.md §11 normalises the composite score to 0–100, and the invariant that every score carries its explanation applies to its presentation too: an intensity ramp that reads as "risk" or "opportunity" is wrong. It measures how unusual something is. Decide whether the ramp is continuous or a small number of bands — bands are easier to label, to test and to explain, and labels are what the spec requires
- **The domain values are domain; their colours are not.** If an anomaly band or a staleness state becomes a named value the backend also uses, that name belongs in `packages/shared` and the colour stays in `apps/frontend`. The shared package is consumed as **built output**, so adding a type there means a rebuild before either app typechecks against it — `pnpm build` and `pnpm verify` do that; a bare `tsc --noEmit` in an app passes against the previous shape
- **Stale and disconnected are two different states and the spec treats them separately.** PRODUCT_SPEC.md §36 asks for "Live feed disconnected — displaying data through 10:42:17" — data that is still shown, still correct as of a stated time, and no longer live. That is not an error colour. A token that renders stale data as a failure would push the product toward exactly the global error screen §36 forbids, and Story 1.7 builds the containment this presentation is the visible half of
- Name tokens for meaning, never for appearance. `--price-negative`, not `--red`: the epic where the negative colour stops being red is the epic where every appearance-named token becomes a lie

## Done when

- Semantic tokens exist for price direction, anomaly intensity, and stale/disconnected data, each resolving through a primitive token
- No semantic state is conveyed by colour alone, and the redundant channel is demonstrated in rendered output rather than described
- Contrast ratios are measured against the real light surfaces — white and the warm page ground — and the numbers are recorded, including a stated resolution for the positive green's 4.27 on the page ground
- The stale/disconnected presentation is distinguishable from an error presentation on sight
- Any domain-level name that reached `packages/shared` is built and consumed correctly through the project reference
- `pnpm verify` passes

## Notes

These tokens outlive this epic. Epic 5 renders anomaly scores, Epic 3 renders live prices and their disconnection states, and Epic 6 renders both onto a WebGL canvas that reads the values rather than the CSS — which is the case Task 1.4.3 had to answer, and this task is the first to depend on the answer being right.
