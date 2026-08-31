import type { Decorator, Preview } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";

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

// The routing context, and it is the **first deliberate divergence between the
// workshop and the application**. Task 1.4.5 reused `vite.config.ts` untouched
// so that there is exactly one place the build lives; a decorator is not that,
// but it is a second place where the application's context is described, and
// the two can now drift. Keep it here rather than per story, so there is one
// of them to keep honest.
//
// A `MemoryRouter` rather than the application's `BrowserRouter`: the workshop
// runs in an iframe with no address bar, and handing a story the browser's
// history would let a story navigate the whole Storybook UI.
//
// The entry comes from a `route` parameter so a story can choose which
// navigation link is current — routing context, not a prop, which is why the
// current-route states of `AppHeader` are separate stories rather than rows in
// its permutation grid. Nesting a second `MemoryRouter` inside this one is not
// an option React Router allows.
//
// Named rather than written inline in the object below: an inline decorator
// makes the inferred type unnameable and `tsc` reports TS2883 — "cannot be
// named without a reference to `PartialStoryFn`". This file sits outside every
// tsconfig, so nothing here would catch it, but the idiom is the same one the
// story files have to follow and there is no reason for two.
const withRouter: Decorator = (Story, context) => {
  const route =
    typeof context.parameters["route"] === "string"
      ? context.parameters["route"]
      : "/";

  return (
    <MemoryRouter initialEntries={[route]}>
      <Story />
    </MemoryRouter>
  );
};

const preview: Preview = {
  decorators: [withRouter],
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
