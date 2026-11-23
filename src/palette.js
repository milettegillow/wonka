// Shared candy palette: real-sweet colours, pastel-heavy, pinks/purples/reds
// leading. Gold is reserved for golden tickets and Wonka. Key names are kept
// generic (pink/lilac/mint/lemon…) but every value is a sweet-shop shade:
// "lemon" is vanilla/butterscotch, "blue" is sugared-almond periwinkle,
// "grass" is pistachio/peppermint.
export const P = {
  ink: '#3a1428',
  black: '#1e0a16',
  white: '#fffafc',
  cream: '#fff4e4',     // vanilla cream
  cream2: '#f8e2c4',
  cream3: '#e9c79c',

  choc0: '#2a120c',     // dark chocolate
  choc1: '#45200f',
  choc2: '#653318',     // milk chocolate
  choc3: '#87492a',
  choc4: '#a8683f',
  caramel: '#cf8f55',   // toffee
  caramel2: '#ecb987',  // caramel

  pink0: '#b3185c',     // raspberry
  pink1: '#ff5c9f',     // bubblegum
  pink2: '#ff94c4',     // candyfloss
  pink3: '#ffc4df',
  pink4: '#ffe5f0',

  mint0: '#3a9e86',     // peppermint (deep)
  mint1: '#6dd7b4',     // mint
  mint2: '#a5eed3',
  mint3: '#d7f9ea',

  lemon0: '#d49a5c',    // butterscotch
  lemon1: '#ffd1a1',    // peach-vanilla
  lemon2: '#ffe6c6',
  lemon3: '#fff5e6',

  lilac0: '#55256e',    // grape
  lilac1: '#8e52b8',    // violet
  lilac2: '#bf98e3',    // lilac
  lilac3: '#e2cff5',
  lilac4: '#f4eafd',

  grass0: '#4f9c84',    // pistachio meadow
  grass1: '#7fcfa9',
  grass2: '#ade8c6',
  grass3: '#d4f6e2',

  blue0: '#5f5aa8',     // sugared almond periwinkle
  blue1: '#8d8ad8',
  blue2: '#b2b2ee',
  blue3: '#dcdcfb',
  berry0: '#2f1b5e',    // blueberry
  berry1: '#4c2f9c',
  berry2: '#7457cf',

  red0: '#9a1438',      // cherry (deep)
  red1: '#e8304f',      // cherry red
  red2: '#ff7f95',      // strawberry
  orange: '#ff9c86',    // peach

  gold0: '#a2690e',     // tickets + Wonka only
  gold1: '#f7bd34',
  gold2: '#ffdf7a',
  gold3: '#fff3c4',

  grey0: '#5a4660',
  grey1: '#8c7b98',
  grey2: '#c5b8d0',
  grey3: '#ede5f3',

  wood0: '#6b331f',
  wood1: '#97553a',
  wood2: '#c48660',

  glass: 'rgba(240,225,255,0.35)',
  glassEdge: 'rgba(252,246,255,0.85)',

  skinPale: '#ffe0cc',
  skin: '#f9caa8',
  skinShade: '#dd9e80',
  skinDeep: '#b9765a',
  blush: '#ff8aa5',
  mouth: '#5a0d2a',
  tongue: '#ff6e95',
  tear: '#d9ecff',
  tearDeep: '#a9c7ef',

  // Wonka's wardrobe
  plum0: '#4a1238',
  plum1: '#7a1f5c',
  plum2: '#a33a7f',
  bottle0: '#173a2c',
  bottle1: '#2a5e47',
  pearl: '#d9d3e0',
  pearl2: '#f2eef6',
};

// Sweet names, for readability in new code.
Object.assign(P, {
  bubblegum: P.pink1, candyfloss: P.pink2, raspberry: P.pink0, strawberry: P.red2, cherry: P.red1,
  grape: P.lilac0, violet: P.lilac1, lilac: P.lilac2, peppermint: P.mint0, mint: P.mint1,
  vanilla: P.cream, toffee: P.caramel, almond: P.blue2,
});

// Short colour lists used for confetti / sparkles.
export const CANDY = [P.pink1, P.pink2, P.pink3, P.mint1, P.mint2, P.lilac1, P.lilac2, P.red2, P.cream, P.lemon1];
export const GOLDS = [P.gold1, P.gold2, P.gold3, P.white];

// Blend two #rrggbb colours.
export function mix(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
