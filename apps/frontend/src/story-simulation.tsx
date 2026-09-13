import styles from "./story-simulation.module.css";

// **What a chart looks like to somebody who does not see the hue** (Task
// 2.12.5, moved here and shared by Task 2.13.8).
//
// `CLAUDE.md`'s rule that colour is never the sole encoding of anything is
// checked in this repository by **simulation rather than by reasoning** — a
// claim that an encoding survives a colour-vision difference and a rendering of
// it surviving one are different artefacts, and `CHARTING.md` §12.6 is the
// standing reminder of which one is evidence: four greyscale simulations passed
// against a chart whose whole area was washed one colour by where the line
// finished, because removing the hue removes the disagreement. A person looking
// at the screen found it.
//
// So these are stories a person reads, and this module is the apparatus. It is
// **not** a component in the product sense and has no stories of its own: it
// renders a hidden `<filter>` and a pair of class names.
//
// ## Why it is at the root rather than under `src/components/`
//
// `pnpm stories` asks every `.tsx` under `src/components/` for a sibling stories
// file, and the test for which side of that line something belongs on is *does
// it have states worth reviewing side by side?* An SVG filter definition has
// one state and nothing to show. `test-render.tsx` is the same shape and the
// same answer.

/** The two filters a simulation story wraps a specimen in. */
export const SIMULATIONS = {
  greyscale: styles.greyscale,
  deuteranopia: styles.deuteranopia,
} as const;

/** Which way a specimen is being looked at. */
export type Simulation = keyof typeof SIMULATIONS;

/**
 * The deuteranopia matrix, as an SVG filter a story points `filter:` at.
 *
 * Machado, Oliveira and Fernandes (2009) at full severity — the same simulation
 * a browser's own rendering-emulation panel applies, stated here as eleven
 * numbers because a dependency that draws a filter is a dependency in a bundle.
 *
 * Rendered once, hidden, beside the story that uses it: an SVG filter is
 * referenced by id from anywhere in the document, which is also why the id is a
 * plain word rather than a `useId` — two of these on one page would be two
 * definitions of the same thing, and the second would win harmlessly.
 */
export function ColourVisionFilters() {
  return (
    <svg aria-hidden="true" className={styles.filters} focusable="false">
      <filter id="deuteranopia" colorInterpolationFilters="linearRGB">
        <feColorMatrix
          type="matrix"
          values="0.367 0.861 -0.228 0 0
                  0.280 0.673  0.047 0 0
                 -0.012 0.043  0.969 0 0
                  0     0      0     1 0"
        />
      </filter>
    </svg>
  );
}
