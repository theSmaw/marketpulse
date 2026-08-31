# Task 1.4.4 — Semantic market tokens

**Status:** Complete (2026-08-31)
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

## Outcome

Complete. `pnpm verify` exits 0, the built artefact renders from a dumb static host with an empty console, and every claim below was measured — in a browser for the rendered ones, and computed from the WCAG formula for the ratios.

### What changed

| File                                  |                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `apps/frontend/src/styles/market.css` | New. The chromatic palette and the semantic layer over it                 |
| `packages/shared/src/anomaly.ts`      | New. `ANOMALY_BANDS` / `AnomalyBand` — the four band names, no thresholds |
| `packages/shared/src/feed-status.ts`  | New. `FEED_STATUSES` / `FeedStatus` — `live`, `stale`, `disconnected`     |
| `packages/shared/src/index.ts`        | Exports both                                                              |
| `apps/frontend/src/styles/tokens.ts`  | Eleven market tokens added to the typed reader; the substitution note     |
| `apps/frontend/src/styles/tokens.css` | Header rule 1 restated: this file is achromatic and stays that way        |
| `apps/frontend/src/main.tsx`          | Imports `market.css` between tokens and base                              |
| `apps/frontend/src/App.tsx`           | Three labelled render checks; first real `cx()` caller                    |
| `apps/frontend/src/App.module.css`    | The presentation, including the second channel in each of the three cases |
| `apps/frontend/src/cx.ts`             | "Unused until Task 1.4.5" corrected — it has a caller now                 |

The artefact is still **three files**. The stylesheet grew from 3.04 kB to 6.22 kB (1.67 kB gzipped) and the JS from 192.40 kB to 196.36 kB across 25 modules.

### The positive green: the resolution this task owed

The reference green `#498100` measures **4.27:1 on the warm page ground** against a 4.5 threshold. Two resolutions were available and the choice had to be explicit.

**The green darkens.** `--palette-green-strong` is `#427400` — the same hue at 90% brightness, so it is still recognisably the reference green. The rejected alternative was constraining positive values to white surfaces, which is a rule with no enforcement: nothing in `pnpm verify` can see which ground a figure is sitting on, and the first page-ground strip with a price in it would break it silently.

| Foreground            | on `#ffffff` | on `#f4f3ee` | on `#f9f9f7` |
| --------------------- | ------------ | ------------ | ------------ |
| `#498100` — rejected  | 4.75         | **4.27**     | 4.50         |
| `#427400` — adopted   | 5.63         | **5.07**     | 5.34         |
| `#c81219` — negative  | 5.90         | 5.31         | 5.60         |
| `#5a5d5c` — unchanged | 6.66         | 5.99         | 6.31         |

Two things worth keeping. The green was chosen with margin rather than at the first value that scrapes past 4.5 — `#467c00` at 4.56 would have passed and left nothing for a future ground. And it was chosen to land near the negative red's 5.31, so neither direction of a price move carries more visual weight than the other. One measurement found along the way: `#498100` is **exactly 4.50** on the sunken ground, which is a pass by rounding rather than a margin.

The amber is unchanged in status: `--palette-amber` and its neighbours measure under 2.2 on both grounds and are **fill-or-icon colours only, never text**. Text on an amber fill is `--ink-primary`, at 12.65 / 8.87 / 5.59 across the three steps.

### Colour is not the sole encoding, demonstrated rather than described

Each of the three semantic groups pairs its colour with a channel that survives desaturation:

- **Price direction** — a direction glyph (`▲` `▼` `—`) in a fixed-width box, plus the sign on the figure itself. The glyph box is fixed-width deliberately: the arrows are not part of the font's tabular set, and inline they would undo the column alignment
- **Anomaly intensity** — the band's **name**, written inside the fill. PRODUCT_SPEC.md §11 requires every score to carry its explanation, and a gradient cannot be labelled
- **Feed status** — the **shape** of the marker (filled / filled / hollow) and a written label. Only `stale` takes a colour at all

Checked by simulation rather than by reasoning, applying `feColorMatrix` projections to the built page and reading the result:

| Simulation                 | positive `#427400` | negative `#c81219` | separation |
| -------------------------- | ------------------ | ------------------ | ---------- |
| Deuteranopia               | `#595541`          | `#a2ab17`          | 2.99:1     |
| Protanopia                 | `#5c5c3a`          | `#9b9a17`          | 2.31:1     |
| Greyscale (`grayscale(1)`) | luminance 0.1365   | luminance 0.1278   | **1.05:1** |

The greyscale row is the one that settles it: **1.05:1 is no difference at all.** Strip the hue and the two directions are the same tone, and everything separating an up from a down is the arrow and the sign. That is the requirement met, and it is also why the pairing has to become a component in Task 1.4.5 rather than a convention each author remembers.

One finding worth carrying, stated carefully. In the deuteranopia projection the negative red renders as a light olive whose contrast against white falls to **2.51:1**, while the positive green darkens to 7.50:1. These projections are not luminance-accurate models of perception and this is not a WCAG failure — WCAG contrast is defined on the actual rendered colour, where the red measures 5.90. But it is a real asymmetry, and one more reason the redundant channel is the signal rather than a courtesy.

The anomaly ramp survives desaturation by construction: it is monotone in **lightness**, not merely in hue, with adjacent steps at 1.43 and 1.59. The weakest step in the scale is `normal`→`elevated` at **1.12**, which is why a `normal` band carries no fill at all in the DOM — the two hardest states to separate by colour are the two not separated by colour.

### Anomaly intensity: bands, and not red

**Four bands rather than a continuous ramp**, because a band can be labelled and PRODUCT_SPEC.md §11 requires the explanation to travel with the score. `normal` / `elevated` / `unusual` / `extreme`, ascending in unusualness and in nothing else — the names deliberately avoid any reading as risk or opportunity.

**The ramp is amber and deliberately not red.** Red already means price-down on every row of this product; an extreme anomaly on a security moving sharply _upward_, rendered red, would read as a fall. Amber also keeps the scale clear of the risk and opportunity readings §11 forbids.

### Stale is not an error, and the difference is visible

Three feed states, and two of the three are achromatic. `live` and `disconnected` are the same grey and are told apart by the marker being **filled or hollow**; only `stale` takes the amber, because a lagging feed is the one of the three that wants a glance to land on it. A green "live" dot was rejected — green means price-positive here and would be the only other green on screen.

The render check puts a real error block beside them so the claim is checkable rather than asserted. The difference on sight is not the hue: a feed state is a marker beside data that is still on screen and still labelled with the time it was correct as of; an error is a titled block with a message and a rule down its edge. That is what keeps §36's "displaying data through 10:42:17" from reading as a failure.

`--status-error` resolves to the same palette entry as `--price-negative`, and that collision is deliberate. There is one red; the two meanings are separated by presentation rather than by hue. If they are ever confusable, the fix is the presentation.

### What reached `packages/shared`, and what did not

`AnomalyBand` and `FeedStatus` are domain names — the backend computes the score and reports the feed state, so the alternative was the interface inventing a vocabulary the backend would later have to match. Both are consumed by `App.tsx` through the project reference, built by `tsc -b` before the frontend typechecks against them.

**Their boundaries did not.** Where `elevated` ends and `unusual` begins is detection policy, it belongs with the scoring model in Epic 5, and a threshold invented here would outlive the guess that produced it. Nor did any colour: `apps/frontend`'s `--anomaly-*` are the presentation, and `packages/shared` is consumed as built output by a Fastify server that will never render anything.

### The typed reader now has a real dependent

Eleven market tokens joined `TOKEN_NAMES`, because Epic 6's topology colours a node by its band and by the direction of its move and a canvas cannot read a CSS class. That was Task 1.4.3's answer in the abstract; this is the first group of tokens that depends on it.

One property of the reader that only became visible with a semantic layer above a palette: `getPropertyValue` returns the **substituted** value, so `--price-unchanged` and `--ink-secondary` both read back as `"#5a5d5c"`. The indirection is a source-level structure and does not survive into JavaScript — fine for a consumer that wants the colour, and worth knowing before anyone tries to check the indirection through this module.

### Unexpected: `cx()` got its first caller a task early

Task 1.4.3 recorded that nothing on the page carried two classes and that Task 1.4.5's components would be the helper's first real use. Wrong by one task: a price cell is `cx(styles.numeric, styles.negative)` — a layout class and a semantic-colour class on the same element. The semantic token layer produces that shape before any component does. The note in `cx.ts` has been corrected.

### What was deliberately left out

- **Score-to-band thresholds** — Epic 5, as above
- **A stale/disconnected component.** The render check demonstrates the presentation; Story 1.7 owns failure containment and Task 1.4.5 owns the components
- **A second red.** The `--price-negative` / `--status-error` collision is recorded rather than designed around
- **Control heights, and every Base UI part.** Still Task 1.4.5's
