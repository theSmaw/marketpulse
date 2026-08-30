// The public surface of @marketpulse/shared. Consumers import from the package
// root only; deep imports into ./dist are not part of the contract.
//
// Note the `.js` extension on a `.ts` file. That is not a mistake: `nodenext`
// resolution requires the extension of the *emitted* file, and omitting it is a
// hard error (TS2835). Every relative import in this package looks like this.
export { isTicker, toTicker } from "./ticker.js";
export type { Ticker } from "./ticker.js";