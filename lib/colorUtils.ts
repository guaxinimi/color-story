// Pure color utilities — no browser APIs, safe in any context.

type RGB = [number, number, number];
type HSL = [number, number, number]; // hue 0–360, sat 0–1, lum 0–1

// ─────────────────────────────────────────────
// Primitive conversions
// ─────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn)      h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else                 h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

// ─────────────────────────────────────────────
// Artist paint-color database (~65 entries)
// Used for nearest-neighbour name matching.
// ─────────────────────────────────────────────

const PAINT_DB = [
  // Whites / near-whites
  { name: "Titanium White",        r: 252, g: 252, b: 252 },
  { name: "Zinc White",            r: 247, g: 244, b: 234 },
  { name: "Unbleached Titanium",   r: 235, g: 218, b: 186 },
  { name: "Cream",                 r: 255, g: 253, b: 208 },
  { name: "Naples Yellow Pale",    r: 255, g: 238, b: 176 },
  // Blacks
  { name: "Ivory Black",           r: 41,  g: 36,  b: 33  },
  { name: "Mars Black",            r: 28,  g: 28,  b: 30  },
  { name: "Lamp Black",            r: 15,  g: 12,  b: 10  },
  // Greys
  { name: "Payne's Grey",          r: 83,  g: 99,  b: 120 },
  { name: "Neutral Grey",          r: 128, g: 128, b: 128 },
  { name: "Warm Grey",             r: 160, g: 148, b: 135 },
  { name: "Cool Grey",             r: 140, g: 148, b: 160 },
  { name: "Stone Grey",            r: 175, g: 168, b: 155 },
  { name: "Charcoal",              r: 54,  g: 69,  b: 79  },
  // Yellows
  { name: "Lemon Yellow",          r: 255, g: 244, b: 43  },
  { name: "Cadmium Yellow Light",  r: 254, g: 225, b: 26  },
  { name: "Cadmium Yellow",        r: 255, g: 183, b: 0   },
  { name: "Naples Yellow",         r: 254, g: 213, b: 125 },
  { name: "Yellow Ochre",          r: 192, g: 140, b: 41  },
  { name: "Raw Sienna",            r: 195, g: 132, b: 60  },
  { name: "Gold Ochre",            r: 207, g: 158, b: 42  },
  // Oranges
  { name: "Cadmium Orange",        r: 237, g: 110, b: 20  },
  { name: "Burnt Sienna",          r: 183, g: 82,  b: 45  },
  { name: "Indian Yellow",         r: 228, g: 160, b: 52  },
  { name: "Bronze Yellow",         r: 178, g: 122, b: 39  },
  // Reds
  { name: "Cadmium Red",           r: 228, g: 22,  b: 27  },
  { name: "Vermilion",             r: 222, g: 68,  b: 43  },
  { name: "Alizarin Crimson",      r: 148, g: 10,  b: 35  },
  { name: "Quinacridone Red",      r: 198, g: 30,  b: 82  },
  { name: "Venetian Red",          r: 155, g: 60,  b: 47  },
  { name: "Indian Red",            r: 164, g: 68,  b: 67  },
  { name: "Transparent Oxide Red", r: 120, g: 48,  b: 30  },
  // Pinks / Rose
  { name: "Permanent Rose",        r: 242, g: 55,  b: 116 },
  { name: "Quinacridone Rose",     r: 237, g: 73,  b: 143 },
  { name: "Opera Rose",            r: 255, g: 80,  b: 165 },
  { name: "Dusty Rose",            r: 195, g: 140, b: 140 },
  { name: "Pale Pink",             r: 235, g: 190, b: 195 },
  // Violets / Purples
  { name: "Dioxazine Purple",      r: 75,  g: 0,   b: 130 },
  { name: "Quinacridone Violet",   r: 130, g: 0,   b: 100 },
  { name: "Cobalt Violet",         r: 165, g: 75,  b: 165 },
  { name: "Manganese Violet",      r: 152, g: 90,  b: 168 },
  { name: "Mineral Violet",        r: 115, g: 60,  b: 135 },
  { name: "Lavender",              r: 180, g: 160, b: 210 },
  // Blues
  { name: "Ultramarine Blue",      r: 18,  g: 10,  b: 143 },
  { name: "Cobalt Blue",           r: 0,   g: 71,  b: 171 },
  { name: "Cerulean Blue",         r: 42,  g: 82,  b: 190 },
  { name: "Phthalo Blue",          r: 0,   g: 15,  b: 137 },
  { name: "Prussian Blue",         r: 0,   g: 49,  b: 83  },
  { name: "Indigo",                r: 38,  g: 0,   b: 77  },
  { name: "Manganese Blue",        r: 50,  g: 115, b: 180 },
  { name: "Sky Blue",              r: 100, g: 165, b: 210 },
  // Greens
  { name: "Viridian",              r: 64,  g: 130, b: 109 },
  { name: "Phthalo Green",         r: 18,  g: 120, b: 68  },
  { name: "Sap Green",             r: 80,  g: 120, b: 40  },
  { name: "Olive Green",           r: 100, g: 120, b: 60  },
  { name: "Hooker's Green",        r: 29,  g: 97,  b: 66  },
  { name: "Oxide of Chromium",     r: 102, g: 117, b: 78  },
  { name: "Terra Verte",           r: 115, g: 138, b: 104 },
  { name: "Emerald",               r: 0,   g: 170, b: 110 },
  // Browns / Earth tones
  { name: "Burnt Umber",           r: 138, g: 61,  b: 30  },
  { name: "Raw Umber",             r: 115, g: 82,  b: 48  },
  { name: "Van Dyke Brown",        r: 66,  g: 37,  b: 23  },
  { name: "Mars Brown",            r: 144, g: 78,  b: 44  },
  { name: "Sepia",                 r: 112, g: 66,  b: 20  },
] as const;

// ─────────────────────────────────────────────
// Color info: name + rgb + mixing note
// ─────────────────────────────────────────────

export interface ColorInfo {
  name: string;
  rgb: RGB;
  mixing: string;
}

export function getColorInfo(hex: string): ColorInfo {
  const rgb = hexToRgb(hex);

  // Perceptually-weighted Euclidean distance (green channel highest, red mid, blue low)
  let minDist = Infinity;
  let name: string = PAINT_DB[0].name;
  for (const p of PAINT_DB) {
    const d = Math.sqrt(
      2 * (rgb[0] - p.r) ** 2 +
      4 * (rgb[1] - p.g) ** 2 +
      3 * (rgb[2] - p.b) ** 2,
    );
    if (d < minDist) { minDist = d; name = p.name; }
  }

  return { name, rgb, mixing: mixingNote(hex) };
}

function mixingNote(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // ── Achromatic ──────────────────────────────
  if (s < 0.08) {
    if (l > 0.90) return "near-white — titanium white, barely tinted";
    if (l > 0.70) return "pale tint — titanium white + trace of payne's grey";
    if (l > 0.45) return "mid neutral — titanium white + payne's grey, equal parts";
    if (l > 0.25) return "dark grey — ivory black + raw umber, lightened";
    return               "deep neutral — ivory black or mars black, straight";
  }

  // ── Very dark (shadows) ─────────────────────
  if (l < 0.18) {
    if (h < 40 || h > 330) return "warm shadow — van dyke brown + ultramarine blue";
    if (h < 80)            return "deep earth — burnt umber + raw umber";
    if (h < 150)           return "dark verdure — phthalo green + burnt umber";
    if (h < 210)           return "atmospheric depth — prussian blue + burnt umber";
    return                        "cool shadow — payne's grey + ultramarine blue";
  }

  // ── Very light (highlights / tints) ─────────
  if (l > 0.82) {
    if (s < 0.20) return "warm highlight — titanium white, trace of naples yellow";
    if (h < 60)   return "golden light — titanium white + cadmium yellow, leaning white";
    if (h < 160)  return "cool light — titanium white + cerulean blue, very dilute";
    if (h < 270)  return "sky light — titanium white + touch of cerulean";
    return               "rosy light — titanium white + quinacridone rose, barely tinted";
  }

  // ── Muted mid-tones (low saturation) ────────
  if (s < 0.18) {
    if (h < 50 || h > 310) return "warm neutral — raw umber + titanium white";
    if (h < 140)           return "muted sage — viridian + raw umber + white";
    if (h < 220)           return "atmospheric grey — ultramarine + burnt umber + white";
    return                        "cool neutral — payne's grey + titanium white";
  }

  // ── Medium saturation ────────────────────────
  if (s < 0.48) {
    if (l < 0.38) {
      if (h < 50)  return "warm earth shadow — burnt umber + yellow ochre";
      if (h < 120) return "dark foliage — sap green + raw umber";
      if (h < 210) return "shadow blue — ultramarine + burnt umber, 2:1";
      return              "muted purple shadow — dioxazine purple + burnt umber";
    }
    if (h < 50)  return "warm ochre — yellow ochre + raw sienna";
    if (h < 120) return "grey-green — viridian + yellow ochre + white";
    if (h < 178) return "muted teal — viridian + cerulean blue + white";
    if (h < 225) return "grey-blue — cobalt blue + payne's grey + white";
    if (h < 280) return "dusty violet — dioxazine purple + grey, lightened";
    return              "muted rose — quinacridone rose + titanium white + grey";
  }

  // ── Saturated / full-chroma ──────────────────
  if (h < 15 || h >= 350) return "vivid red — cadmium red; add alizarin for depth";
  if (h < 30)  return "red-orange — cadmium red + cadmium orange, 1:1";
  if (h < 48)  return "warm orange — cadmium orange; add yellow for brightness";
  if (h < 65)  return "golden yellow — cadmium yellow + yellow ochre";
  if (h < 80)  return "bright yellow — cadmium yellow light or lemon yellow";
  if (h < 100) return "yellow-green — cadmium yellow + viridian, yellow-dominant";
  if (h < 135) return "vibrant green — phthalo green + cadmium yellow";
  if (h < 155) return "rich green — viridian, or viridian + sap green";
  if (h < 175) return "teal — viridian + cerulean blue, roughly equal";
  if (h < 195) return "cyan — phthalo blue (green shade) + viridian";
  if (h < 215) return "sky blue — cerulean blue + titanium white";
  if (h < 240) return "rich blue — cobalt blue or ultramarine blue";
  if (h < 258) return "deep blue — ultramarine blue, straight or thinned";
  if (h < 275) return "blue-violet — ultramarine blue + dioxazine purple";
  if (h < 295) return "violet — dioxazine purple, pure";
  if (h < 315) return "purple — dioxazine purple + quinacridone rose";
  if (h < 335) return "deep magenta — quinacridone magenta or permanent rose";
  return              "crimson — alizarin crimson; add quinacridone rose for bloom";
}

// ─────────────────────────────────────────────
// Palette mood classification
// ─────────────────────────────────────────────

export type MoodTag =
  | "Warm & Earthy"
  | "Cool & Muted"
  | "High Contrast"
  | "Pastel"
  | "Vibrant"
  | "Dark & Moody"
  | "Neutral";

export interface MoodStyle { bg: string; text: string }

export const MOOD_STYLES: Record<MoodTag, MoodStyle> = {
  "Warm & Earthy": { bg: "#F5E8D8", text: "#7A4F2D" },
  "Cool & Muted":  { bg: "#DDE8F2", text: "#2E4E6A" },
  "High Contrast": { bg: "#EAEAEA", text: "#1A1714" },
  "Pastel":        { bg: "#F5E8F2", text: "#7A4A6E" },
  "Vibrant":       { bg: "#FFF2E0", text: "#9B3800" },
  "Dark & Moody":  { bg: "#272320", text: "#C0A07C" },
  "Neutral":       { bg: "#ECE8E0", text: "#5E574E" },
};

export function getMoodTag(colors: string[]): MoodTag {
  const hsl = colors.map(hex => {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHsl(r, g, b);
  });

  const sats = hsl.map(([, s]) => s);
  const lums = hsl.map(([, , l]) => l);
  const hues = hsl.map(([h]) => h);

  const avgS   = sats.reduce((a, b) => a + b, 0) / sats.length;
  const avgL   = lums.reduce((a, b) => a + b, 0) / lums.length;
  const lumRange = Math.max(...lums) - Math.min(...lums);

  // Warm: reds/oranges/yellows (0–80°) and near-red (320–360°)
  const warmCount = hues.filter(h => h <= 80 || h >= 320).length;
  // Cool: greens through blues (150–270°)
  const coolCount = hues.filter(h => h >= 150 && h <= 270).length;

  if (lumRange  > 0.55)                        return "High Contrast";
  if (avgL      < 0.22)                        return "Dark & Moody";
  if (avgL      > 0.72 && avgS < 0.38)        return "Pastel";
  if (avgS      > 0.60)                        return "Vibrant";
  if (coolCount >= warmCount && avgS < 0.38)  return "Cool & Muted";
  if (warmCount >= 3)                          return "Warm & Earthy";
  return "Neutral";
}
