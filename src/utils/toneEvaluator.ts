// Generic tone scoring for seasonal/undertone systems using LAB (D65)

// Types
type Lab = { L: number; a: number; b: number };

type RangeRule = { min: number; max: number; weight: number };

type HueSectorsRule = {
  sectors: Array<[number, number]>; // allowed sectors in degrees
  toleranceDegrees: number;         // soft penalty ramp outside sectors
  weight: number;                   // max penalty for hue
};

type WarmthPenaltyRule = { lab_b_gt: number; penalty: number };

type MatchBucket = { minScore: number; label: string };

export type ToneProfile = {
  label: string;
  lightness: RangeRule;
  chroma: RangeRule;
  hueSectors: HueSectorsRule;
  warmthPenalty?: WarmthPenaltyRule;
  matchBuckets: MatchBucket[];
};

export type ToneResult = {
  input: string;
  toneLabel: string;
  lab: Lab;
  chroma: number;
  hue: number;
  score: number;        // 0..100
  matchLevel: string;   // from profile.matchBuckets
  notes: string[];
};

// Public API
export function evaluateTone(hex: string, profile: ToneProfile): ToneResult {
  const { r, g, b } = hexToRgb(hex);
  const lab = rgbToLab(r, g, b);
  const L = lab.L;
  const C = Math.hypot(lab.a, lab.b);
  const H = labHue(lab); // 0..360

  let penalty = 0;
  const notes: string[] = [];

  // Lightness
  penalty += rangePenalty(L, profile.lightness);
  if (L < profile.lightness.min) notes.push("too dark for this tone");
  if (L > profile.lightness.max) notes.push("too light/washed");

  // Chroma
  penalty += rangePenalty(C, profile.chroma);
  if (C < profile.chroma.min) notes.push("too gray/soft");
  if (C > profile.chroma.max) notes.push("too saturated/bright");

  // Hue sectors
  {
    const d = hueSectorDistance(H, profile.hueSectors.sectors);
    const t = profile.hueSectors.toleranceDegrees || 60;
    const frac = Math.min(d / t, 1);
    const huePenaltyPts = frac * profile.hueSectors.weight;
    penalty += huePenaltyPts;
    if (d > 0) notes.push("leans outside cool hue sectors");
  }

  // Warmth penalty (optional)
  if (profile.warmthPenalty && lab.b > profile.warmthPenalty.lab_b_gt) {
    penalty += profile.warmthPenalty.penalty;
    notes.push("yellow warmth present");
  }

  const score = clamp(0, 100 - penalty, 100);
  const matchLevel =
    profile.matchBuckets
      .sort((a, b) => b.minScore - a.minScore)
      .find(b => score >= b.minScore)?.label ?? "not a match";

  return {
    input: hex,
    toneLabel: profile.label,
    lab,
    chroma: round2(C),
    hue: round1(H),
    score: round1(score),
    matchLevel,
    notes
  };
}

/* ---------------- Helpers: math & color ---------------- */

function clamp(min: number, x: number, max: number) {
  return Math.max(min, Math.min(x, max));
}
const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

function rangePenalty(value: number, rule: RangeRule) {
  const { min, max, weight } = rule;
  if (value >= min && value <= max) return 0;
  const dist = value < min ? (min - value) : (value - max);
  const half = (max - min) / 2 || 1;
  return Math.min((dist / half) * weight, weight);
}

function hueSectorDistance(h: number, sectors: Array<[number, number]>) {
  // 0 if inside any allowed sector; otherwise shortest angular distance to an edge.
  let best = Infinity;
  for (const [a, b] of sectors) {
    if (inSector(h, a, b)) return 0;
    best = Math.min(best, degToEdgeDistance(h, a, b));
  }
  return best;
}

function inSector(h: number, a: number, b: number) {
  return a <= b ? h >= a && h <= b : h >= a || h <= b; // handles wrap-around
}

function degToEdgeDistance(h: number, a: number, b: number) {
  const d = (x: number, y: number) => {
    const dd = Math.abs(x - y) % 360;
    return dd > 180 ? 360 - dd : dd;
  };
  return Math.min(d(h, a), d(h, b));
}

function hexToRgb(hex: string) {
  const s = hex.replace(/^#/, "");
  if (s.length !== 3 && s.length !== 6) throw new Error("Bad hex");
  const h = s.length === 3 ? s.split("").map(c => c + c).join("") : s;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function srgbToLinear(u8: number) {
  const v = u8 / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r8: number, g8: number, b8: number) {
  const r = srgbToLinear(r8);
  const g = srgbToLinear(g8);
  const b = srgbToLinear(b8);
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  return { X, Y, Z };
}

function xyzToLab(X: number, Y: number, Z: number): Lab {
  // D65 white
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}
function f(t: number) {
  const eps = Math.pow(6 / 29, 3);
  const k = Math.pow(29 / 3, 2) / 3;
  return t > eps ? Math.cbrt(t) : k * t + 4 / 29;
}

function rgbToLab(r: number, g: number, b: number): Lab {
  const { X, Y, Z } = rgbToXyz(r, g, b);
  return xyzToLab(X, Y, Z);
}

function labHue({ a, b }: Lab) {
  const h = Math.atan2(b, a) * (180 / Math.PI);
  return h < 0 ? h + 360 : h;
}