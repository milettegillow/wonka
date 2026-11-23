// Shared candy-bright palette. Everything drawn in the game pulls from here.
export const P = {
  ink: '#2a1216',
  black: '#1a0b10',
  white: '#ffffff',
  cream: '#fff4dc',
  cream2: '#f7e0b5',
  cream3: '#e8c48e',

  choc0: '#2b140c',
  choc1: '#46220f',
  choc2: '#653417',
  choc3: '#86491f',
  choc4: '#a8662f',
  caramel: '#d9964a',
  caramel2: '#f0bd74',

  pink0: '#b0175e',
  pink1: '#ff3f8e',
  pink2: '#ff86bd',
  pink3: '#ffc3df',
  pink4: '#ffe3f0',

  mint0: '#128a6a',
  mint1: '#2fd39c',
  mint2: '#86f0c6',
  mint3: '#cdfbe6',

  lemon0: '#d39a00',
  lemon1: '#ffd23a',
  lemon2: '#fff08a',
  lemon3: '#fffac8',

  lilac0: '#4f3592',
  lilac1: '#7f5fd6',
  lilac2: '#b49cf2',
  lilac3: '#ddd0ff',
  lilac4: '#f0eaff',

  grass0: '#1f7f3a',
  grass1: '#3fbf4a',
  grass2: '#7fe05a',
  grass3: '#c0f580',

  blue0: '#1b2a8a',
  blue1: '#3550d8',
  blue2: '#6f8cff',
  blue3: '#b5c6ff',
  berry0: '#2a1a6e',
  berry1: '#4630b0',
  berry2: '#6d55e0',

  red0: '#9e1630',
  red1: '#ee3346',
  red2: '#ff7a7a',
  orange: '#ff9438',

  gold0: '#a86d00',
  gold1: '#ffbe1a',
  gold2: '#ffe066',
  gold3: '#fff6c0',

  grey0: '#4b4458',
  grey1: '#7d7690',
  grey2: '#b8b2c8',
  grey3: '#e4e0ee',

  wood0: '#6b3a1c',
  wood1: '#9a5a2c',
  wood2: '#c78748',

  glass: 'rgba(210,245,255,0.35)',
  glassEdge: 'rgba(235,252,255,0.85)',

  skinPale: '#ffdcc2',
  skin: '#f7c49c',
  skinShade: '#dc9a74',
  skinDeep: '#b87452',
  blush: '#ff8fa3',
  mouth: '#5a0f22',
  tongue: '#ff6f8f',
};

// Short colour lists used for confetti / sparkles.
export const CANDY = [P.pink1, P.pink2, P.mint1, P.mint2, P.lemon1, P.lemon2, P.lilac1, P.lilac2, P.cream];
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
