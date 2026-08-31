import { toTicker, type Ticker } from "@marketpulse/shared";

import styles from "./App.module.css";

// The placeholder shell, now rendered in the product's visual language rather
// than in the browser's defaults. Still deliberately boring, and still not the
// application: there is no router, no state library and no market data. Story
// 1.5 replaces this markup wholesale.
//
// What it is for is proving the token layer applies — which is why the module
// below is a render check with its own label rather than a pretend dashboard.
// Every idiom it demonstrates is one Task 1.4.3 had to get right: the warm page
// ground under a white module, the near-black hairline doing the work a shadow
// would do elsewhere, the uppercase letterspaced micro-label, and a
// right-aligned column of tabular figures.
//
// Note there is no `cx()` here. Nothing on this page carries two classes at
// once, and the helper exists for the case where something does — Task 1.4.5's
// components. Reaching for it on a single class name would make it look
// mandatory rather than useful.
//
// The @marketpulse/shared import is inherited from the entry file this
// replaced, and is still the load-bearing line: it is the only thing proving
// the workspace dependency resolves through the bundler as well as through
// tsc, and the two use entirely different resolvers.
const ticker: Ticker = toTicker("AAPL");

// Not market data — the point of these three is that they are the same number
// of digits made of glyphs with different natural widths. With tabular figures
// the decimal points line up; with a proportional figure set the `1` row is
// visibly narrower, which is what a live price column would do on every tick.
const alignmentRows: readonly {
  readonly label: string;
  readonly value: string;
}[] = [
  { label: "Narrow digits", value: "1,111.11" },
  { label: "Wide digits", value: "8,888.88" },
  { label: "Mixed", value: "1,088.18" },
];

export function App() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.microLabel}>Application shell</p>
        <h1 className={styles.title}>MarketPulse</h1>
      </header>

      <main>
        <section className={styles.module}>
          <h2 className={styles.moduleTitle}>Token render check</h2>
          <p className={styles.prose}>
            No market data yet. The shared package resolves through the bundler:{" "}
            {ticker}
          </p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Glyph widths</th>
                <th scope="col" className={styles.numeric}>
                  Figure
                </th>
              </tr>
            </thead>
            <tbody>
              {alignmentRows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className={styles.numeric}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
