import type { Preview } from "@storybook/react-vite";

import { getTokens } from "../src/styles/tokens.js";

// The token layer, in the same three side-effect imports main.tsx makes and in
// the same order. The order runs outward — `tokens.css` declares the structural
// custom properties, `market.css` layers the market semantics over them,
// `base.css` consumes both at the element level — and it is not alphabetical.
// A component rendered in the workshop against a different cascade than the one
// the application uses is a workshop that lies.
import "../src/styles/tokens.css";
import "../src/styles/market.css";
import "../src/styles/base.css";

// index.html sets `data-theme="light"` on <html>; the workshop's iframe has its
// own document and would otherwise not. The attribute is deliberately redundant
// in both places — `tokens.css` declares its themeable values on
// `:root, [data-theme="light"]` so a missing attribute still yields the correct
// light page (measured in Task 1.4.3) — but "deliberately redundant" only holds
// if it is actually stated everywhere the application states it.
document.documentElement.dataset.theme = "light";

// The same startup assertion main.tsx makes, for the same reason and with more
// force here. A token missing from the stylesheets does not fail: CSS resolves
// an undeclared custom property to nothing and the component renders unstyled.
// `getTokens()` throws naming the first token that resolved to nothing, so the
// workshop reports a broken token layer instead of displaying it.
getTokens();

const preview: Preview = {
  parameters: {
    // Storybook's default is to match `background`/`color` props as colour
    // controls, which is noise on components whose colour comes entirely from
    // tokens. Left at the default matcher for dates only.
    controls: {
      matchers: {
        date: /Date$/,
      },
    },
  },
};

export default preview;
