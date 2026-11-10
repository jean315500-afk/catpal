// Paper grain, drawn on the spot (an SVG noise filter as a background image — no texture files): fine speckle, and a
// slow, uneven mottling for paper that isn't quite one tone. `tint` is the grain's colour (r, g, b, 0–1).

const noise = (size: number, freq: number, alpha: number, tint: [number, number, number], octaves = 2) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${tint[0]}  0 0 0 0 ${tint[1]}  0 0 0 0 ${tint[2]}  0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

/** the writing room's background: warm cream, finely speckled (measured off the sample: about #F9F2E5 on average,
 *  its grain a soft ±2 levels) */
export const ROOM_BG = { backgroundColor: "#FFFBF0", backgroundImage: noise(180, 0.9, 0.3, [0.62, 0.54, 0.44], 1) } as const;

/** the letters' paper (the letters themselves only — not cards or modals): an old typewriter sheet — warm beige-grey,
 *  grainy, a little uneven in tone (matched to the sample: on average #E5D7C5, its grain ±4 levels, a faint mottling) */
export const SHEET_BG = {
  backgroundColor: "#FEF0DE",
  backgroundImage: [noise(160, 0.9, 0.4, [0.3, 0.26, 0.2], 1), noise(420, 0.012, 0.14, [0.42, 0.37, 0.3], 3)].join(", "),
} as const;

/** the sheet's grain under something of its own (ruled lines, say): `extra` drawn over the grain */
export const sheetWith = (...extra: string[]) => ({ backgroundColor: SHEET_BG.backgroundColor, backgroundImage: [...extra, SHEET_BG.backgroundImage].join(", ") });
