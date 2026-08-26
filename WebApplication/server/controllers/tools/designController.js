/**
 * Dynamic CSS Generators, Color Converters, Palette Builders & Vector Design Controllers for iNWebTools.
 *
 * Implements Phase 7:
 *   - Visual CSS Generators (Gradients, Shadows, Glassmorphism, Mesh, Clip-Path, Grid/Flex, Scrollbars, 3D Card Flip)
 *   - Design Helpers (Favicon generator, SVG cleaner/visualizer, Aspect ratio, Screen specs)
 *   - Color Converters (RGB, HEX, HSL, CMYK, HSV, LAB, XYZ, Pantone, RAL)
 *   - Palette & Contrast Tools (WCAG Contrast, Shades/Tints, Color Mixer, Color Blindness, Tailwind Palette)
 */

import { incrementToolUsage } from '../../services/toolsRegistry.service.js';
import { asyncHandler } from '../../utils/ApiError.js';

/* ------------------------------------------------------------------ *
 * Color Conversion & Math Algorithms
 * ------------------------------------------------------------------ */

/** Parse any hex string to {r, g, b, a} */
export function hexToRgb(hex) {
  let clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (clean.length === 8) {
    const num = parseInt(clean, 16);
    return {
      r: (num >> 24) & 255,
      g: (num >> 16) & 255,
      b: (num >> 8) & 255,
      a: parseFloat(((num & 255) / 255).toFixed(2)),
    };
  }
  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1,
    };
  }
  return { r: 59, g: 130, b: 246, a: 1 }; // Default brand blue #3b82f6
}

/** Convert RGB to Hex */
export function rgbToHex(r, g, b, a = 1) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a < 1) {
    const aHex = Math.round(Math.max(0, Math.min(1, a)) * 255)
      .toString(16)
      .padStart(2, '0');
    return `${base}${aHex}`;
  }
  return base;
}

/** RGB [0..255] to HSL [0..360, 0..100%, 0..100%] */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** HSL to RGB */
export function hslToRgb(h, s, l) {
  h = (h % 360) / 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/** RGB to CMYK [0..100%] */
export function rgbToCmyk(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);

  return {
    c: Math.max(0, c),
    m: Math.max(0, m),
    y: Math.max(0, y),
    k: Math.round(k * 100),
  };
}

/** CMYK to RGB */
export function cmykToRgb(c, m, y, k) {
  c /= 100;
  m /= 100;
  y /= 100;
  k /= 100;

  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  };
}

/** RGB to HSV/HSB */
export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

/** HSV to RGB */
export function hsvToRgb(h, s, v) {
  h = (h % 360) / 60;
  s = Math.max(0, Math.min(100, s)) / 100;
  v = Math.max(0, Math.min(100, v)) / 100;

  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));

  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/** RGB to CIE-XYZ (D65 Illuminant) */
export function rgbToXyz(r, g, b) {
  let sR = r / 255;
  let sG = g / 255;
  let sB = b / 255;

  sR = sR > 0.04045 ? Math.pow((sR + 0.055) / 1.055, 2.4) : sR / 12.92;
  sG = sG > 0.04045 ? Math.pow((sG + 0.055) / 1.055, 2.4) : sG / 12.92;
  sB = sB > 0.04045 ? Math.pow((sB + 0.055) / 1.055, 2.4) : sB / 12.92;

  sR *= 100;
  sG *= 100;
  sB *= 100;

  const x = sR * 0.4124 + sG * 0.3576 + sB * 0.1805;
  const y = sR * 0.2126 + sG * 0.7152 + sB * 0.0722;
  const z = sR * 0.0193 + sG * 0.1192 + sB * 0.9505;

  return {
    x: parseFloat(x.toFixed(2)),
    y: parseFloat(y.toFixed(2)),
    z: parseFloat(z.toFixed(2)),
  };
}

/** XYZ to CIE-L*a*b* */
export function xyzToLab(x, y, z) {
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let vX = x / refX;
  let vY = y / refY;
  let vZ = z / refZ;

  vX = vX > 0.008856 ? Math.pow(vX, 1 / 3) : 7.787 * vX + 16 / 116;
  vY = vY > 0.008856 ? Math.pow(vY, 1 / 3) : 7.787 * vY + 16 / 116;
  vZ = vZ > 0.008856 ? Math.pow(vZ, 1 / 3) : 7.787 * vZ + 16 / 116;

  const l = 116 * vY - 16;
  const a = 500 * (vX - vY);
  const b = 200 * (vY - vZ);

  return {
    l: parseFloat(l.toFixed(2)),
    a: parseFloat(a.toFixed(2)),
    b: parseFloat(b.toFixed(2)),
  };
}

/** Standard Curated Pantone Matching Table */
const PANTONE_TABLE = [
  { code: 'PANTONE 19-4052 Classic Blue', hex: '#0f4c81' },
  { code: 'PANTONE 17-5104 Ultimate Gray', hex: '#939597' },
  { code: 'PANTONE 13-0647 Illuminating Yellow', hex: '#f5df4d' },
  { code: 'PANTONE 18-3838 Ultra Violet', hex: '#5f4b8b' },
  { code: 'PANTONE 16-1546 Living Coral', hex: '#ff6f61' },
  { code: 'PANTONE 18-1750 Viva Magenta', hex: '#bb2649' },
  { code: 'PANTONE 13-1023 Peach Fuzz', hex: '#ffbe98' },
  { code: 'PANTONE 19-0303 Jet Black', hex: '#2b2929' },
  { code: 'PANTONE 11-0601 Bright White', hex: '#f4f5f0' },
  { code: 'PANTONE 18-1662 Flame Scarlet', hex: '#cd212a' },
  { code: 'PANTONE 15-5519 Turquoise', hex: '#45b5aa' },
  { code: 'PANTONE 17-1463 Tangerine Tango', hex: '#dd4124' },
];

/** Standard Curated RAL Classic Matching Table */
const RAL_TABLE = [
  { code: 'RAL 9005 Jet Black', hex: '#0a0a0a' },
  { code: 'RAL 9010 Pure White', hex: '#f7f9f5' },
  { code: 'RAL 7016 Anthracite Grey', hex: '#373f43' },
  { code: 'RAL 5002 Ultramarine Blue', hex: '#20214f' },
  { code: 'RAL 3020 Traffic Red', hex: '#cc0605' },
  { code: 'RAL 6018 Yellow Green', hex: '#57a639' },
  { code: 'RAL 1023 Traffic Yellow', hex: '#f7b500' },
  { code: 'RAL 7035 Light Grey', hex: '#d7d7d7' },
  { code: 'RAL 5012 Light Blue', hex: '#22b6d6' },
  { code: 'RAL 2004 Pure Orange', hex: '#e25303' },
];

/** Calculate Delta E Distance (Color Similarity) */
function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) * 0.3 + Math.pow(g1 - g2, 2) * 0.59 + Math.pow(b1 - b2, 2) * 0.11,
  );
}

/** Find closest Pantone swatch */
function findClosestPantone(r, g, b) {
  let closest = PANTONE_TABLE[0];
  let minDiff = Infinity;
  for (const item of PANTONE_TABLE) {
    const rgb = hexToRgb(item.hex);
    const diff = colorDistance(r, g, b, rgb.r, rgb.g, rgb.b);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }
  return { ...closest, similarity: Math.max(0, Math.round(100 - minDiff / 2)) + '%' };
}

/** Find closest RAL swatch */
function findClosestRal(r, g, b) {
  let closest = RAL_TABLE[0];
  let minDiff = Infinity;
  for (const item of RAL_TABLE) {
    const rgb = hexToRgb(item.hex);
    const diff = colorDistance(r, g, b, rgb.r, rgb.g, rgb.b);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }
  return { ...closest, similarity: Math.max(0, Math.round(100 - minDiff / 2)) + '%' };
}

/** WCAG 2.1 Relative Luminance and Contrast Ratio */
export function calculateWcagContrast(foregroundHex, backgroundHex) {
  const getLuminance = ({ r, g, b }) => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const fgRgb = hexToRgb(foregroundHex);
  const bgRgb = hexToRgb(backgroundHex);

  const l1 = getLuminance(fgRgb);
  const l2 = getLuminance(bgRgb);

  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  const ratio = parseFloat(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));

  return {
    ratio: `${ratio}:1`,
    score: ratio,
    normalTextAA: ratio >= 4.5 ? 'Pass' : 'Fail',
    largeTextAA: ratio >= 3.0 ? 'Pass' : 'Fail',
    normalTextAAA: ratio >= 7.0 ? 'Pass' : 'Fail',
    largeTextAAA: ratio >= 4.5 ? 'Pass' : 'Fail',
    uiComponentsAA: ratio >= 3.0 ? 'Pass' : 'Fail',
    recommendation:
      ratio >= 7.0
        ? 'Excellent contrast — Meets WCAG AAA'
        : ratio >= 4.5
          ? 'Good contrast — Meets WCAG AA for normal text'
          : ratio >= 3.0
            ? 'Acceptable for large headings and UI borders'
            : 'Fails WCAG — Low legibility, increase contrast',
  };
}

/** Generate 10 Shades (Darker) & 10 Tints (Lighter) */
export function generateShadesAndTints(baseHex) {
  const { r, g, b } = hexToRgb(baseHex);

  const tints = [];
  for (let i = 1; i <= 10; i++) {
    const factor = i / 10;
    const nR = Math.round(r + (255 - r) * factor);
    const nG = Math.round(g + (255 - g) * factor);
    const nB = Math.round(b + (255 - b) * factor);
    tints.push({
      percentage: `${Math.round(factor * 100)}% Tint`,
      hex: rgbToHex(nR, nG, nB),
      rgb: `rgb(${nR}, ${nG}, ${nB})`,
    });
  }

  const shades = [];
  for (let i = 1; i <= 10; i++) {
    const factor = i / 10;
    const nR = Math.round(r * (1 - factor));
    const nG = Math.round(g * (1 - factor));
    const nB = Math.round(b * (1 - factor));
    shades.push({
      percentage: `${Math.round(factor * 100)}% Shade`,
      hex: rgbToHex(nR, nG, nB),
      rgb: `rgb(${nR}, ${nG}, ${nB})`,
    });
  }

  return { tints: tints.reverse(), shades };
}

/** Generate Tailwind Color Palette (50 to 950) */
export function generateTailwindPalette(baseHex, colorName = 'primary') {
  const { r, g, b } = hexToRgb(baseHex);
  const hsl = rgbToHsl(r, g, b);

  const steps = {
    50: { lOffset: 0.45, sOffset: 0.1 },
    100: { lOffset: 0.38, sOffset: 0.05 },
    200: { lOffset: 0.28, sOffset: 0 },
    300: { lOffset: 0.18, sOffset: 0 },
    400: { lOffset: 0.08, sOffset: 0 },
    500: { lOffset: 0, sOffset: 0 }, // Base color
    600: { lOffset: -0.08, sOffset: 0.02 },
    700: { lOffset: -0.16, sOffset: 0.04 },
    800: { lOffset: -0.24, sOffset: 0.06 },
    900: { lOffset: -0.32, sOffset: 0.08 },
    950: { lOffset: -0.4, sOffset: 0.1 },
  };

  const palette = {};
  for (const [step, delta] of Object.entries(steps)) {
    const targetL = Math.max(5, Math.min(96, hsl.l + delta.lOffset * 100));
    const targetS = Math.max(10, Math.min(100, hsl.s + delta.sOffset * 100));
    const rgb = hslToRgb(hsl.h, targetS, targetL);
    palette[step] = rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  const tailwindConfig = {
    [colorName]: palette,
  };

  return {
    palette,
    tailwindConfig: JSON.stringify(tailwindConfig, null, 2),
    cssVariables: Object.entries(palette)
      .map(([step, hex]) => `  --color-${colorName}-${step}: ${hex};`)
      .join('\n'),
  };
}

/** Color Blindness Simulation Matrices */
export function simulateColorBlindness(hex) {
  const { r, g, b } = hexToRgb(hex);

  // Protanopia (Red-blind)
  const pR = 0.56667 * r + 0.43333 * g + 0.0 * b;
  const pG = 0.55833 * r + 0.44167 * g + 0.0 * b;
  const pB = 0.0 * r + 0.24167 * g + 0.75833 * b;

  // Deuteranopia (Green-blind)
  const dR = 0.625 * r + 0.375 * g + 0.0 * b;
  const dG = 0.7 * r + 0.3 * g + 0.0 * b;
  const dB = 0.0 * r + 0.3 * g + 0.7 * b;

  // Tritanopia (Blue-blind)
  const tR = 0.95 * r + 0.05 * g + 0.0 * b;
  const tG = 0.0 * r + 0.43333 * g + 0.56667 * b;
  const tB = 0.0 * r + 0.475 * g + 0.525 * b;

  // Achromatopsia (Monochromacy / Greyscale)
  const mono = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

  return {
    normal: hex,
    protanopia: rgbToHex(pR, pG, pB),
    deuteranopia: rgbToHex(dR, dG, dB),
    tritanopia: rgbToHex(tR, tG, tB),
    achromatopsia: rgbToHex(mono, mono, mono),
  };
}

/* ================================================================== *
 * Controller Action
 * ================================================================== */

export const executeDesignTool = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const files = req.files ?? (req.file ? [req.file] : []);

  let options = { ...(req.body || {}) };
  if (typeof req.body?.options === 'string') {
    try {
      options = { ...options, ...JSON.parse(req.body.options) };
    } catch {
      // ignore
    }
  } else if (typeof req.body?.options === 'object' && req.body?.options !== null) {
    options = { ...options, ...req.body.options };
  }

  const startTime = Date.now();
  let rawInput =
    req.body?.content ||
    req.body?.data ||
    req.body?.textInput ||
    req.body?.text ||
    req.body?.input ||
    '';

  if (!rawInput && files.length > 0 && files[0]?.buffer) {
    rawInput = files[0].buffer.toString('utf8');
  }

  void incrementToolUsage(slug);

  let result = null;

  // -------------------------------------------------------------
  // 1. Color Converters Suite
  // -------------------------------------------------------------
  if (slug === 'rgb-hex-converter') {
    const inputHex = rawInput || options.hex || '#3b82f6';
    const rgb = hexToRgb(inputHex);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b, rgb.a);

    result = {
      resultType: 'metadata',
      metadata: {
        hex,
        rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`,
        values: { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a },
      },
      stats: { colorHex: hex, alpha: rgb.a },
    };
  } else if (slug === 'hsl-rgb-converter' || slug === 'hex-hsl-converter') {
    const inputHex = rawInput || options.hex || '#3b82f6';
    const rgb = hexToRgb(inputHex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    result = {
      resultType: 'metadata',
      metadata: {
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
        values: hsl,
      },
      stats: { hue: `${hsl.h}°`, saturation: `${hsl.s}%`, lightness: `${hsl.l}%` },
    };
  } else if (slug === 'cmyk-rgb-converter') {
    const inputHex = rawInput || options.hex || '#3b82f6';
    const rgb = hexToRgb(inputHex);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

    result = {
      resultType: 'metadata',
      metadata: {
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
        values: cmyk,
      },
      stats: {
        cyan: `${cmyk.c}%`,
        magenta: `${cmyk.m}%`,
        yellow: `${cmyk.y}%`,
        black: `${cmyk.k}%`,
      },
    };
  } else if (slug === 'hsv-rgb-converter') {
    const inputHex = rawInput || options.hex || '#3b82f6';
    const rgb = hexToRgb(inputHex);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    result = {
      resultType: 'metadata',
      metadata: {
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
        values: hsv,
      },
      stats: { hue: `${hsv.h}°`, saturation: `${hsv.s}%`, value: `${hsv.v}%` },
    };
  } else if (slug === 'lab-rgb-converter' || slug === 'xyz-rgb-converter') {
    const inputHex = rawInput || options.hex || '#3b82f6';
    const rgb = hexToRgb(inputHex);
    const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
    const lab = xyzToLab(xyz.x, xyz.y, xyz.z);

    result = {
      resultType: 'metadata',
      metadata: {
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        xyz: `XYZ(${xyz.x}, ${xyz.y}, ${xyz.z})`,
        lab: `CIELAB(${lab.l}, ${lab.a}, ${lab.b})`,
        values: { xyz, lab },
      },
      stats: { lightness: lab.l, chromaA: lab.a, chromaB: lab.b },
    };
  } else if (slug === 'pantone-hex-converter') {
    const inputHex = rawInput || options.hex || '#0f4c81';
    const rgb = hexToRgb(inputHex);
    const match = findClosestPantone(rgb.r, rgb.g, rgb.b);

    result = {
      resultType: 'metadata',
      metadata: {
        sourceHex: inputHex,
        matchedPantone: match.code,
        pantoneHex: match.hex,
        similarity: match.similarity,
      },
      stats: { matchedCode: match.code, similarity: match.similarity },
    };
  } else if (slug === 'ral-hex-converter') {
    const inputHex = rawInput || options.hex || '#20214f';
    const rgb = hexToRgb(inputHex);
    const match = findClosestRal(rgb.r, rgb.g, rgb.b);

    result = {
      resultType: 'metadata',
      metadata: {
        sourceHex: inputHex,
        matchedRal: match.code,
        ralHex: match.hex,
        similarity: match.similarity,
      },
      stats: { matchedCode: match.code, similarity: match.similarity },
    };
  }

  // -------------------------------------------------------------
  // 2. Palette, Contrast & Color Theory
  // -------------------------------------------------------------
  else if (slug === 'wcag-contrast-checker') {
    const fg = options.foreground || options.fg || rawInput || '#ffffff';
    const bg = options.background || options.bg || '#0f172a';
    const contrast = calculateWcagContrast(fg, bg);

    result = {
      resultType: 'metadata',
      metadata: {
        foreground: fg,
        background: bg,
        ...contrast,
      },
      stats: { ratio: contrast.ratio, score: contrast.score, aaNormal: contrast.normalTextAA },
    };
  } else if (slug === 'color-shade-tint-generator') {
    const baseHex = rawInput || options.hex || '#3b82f6';
    const shadesTints = generateShadesAndTints(baseHex);

    result = {
      resultType: 'metadata',
      metadata: {
        baseHex,
        tints: shadesTints.tints,
        shades: shadesTints.shades,
      },
      stats: { totalVariations: 20, baseHex },
    };
  } else if (slug === 'color-mixer-online') {
    const color1 = options.color1 || '#3b82f6';
    const color2 = options.color2 || '#ef4444';
    const ratio = parseFloat(options.ratio || 50) / 100;

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const mR = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
    const mG = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
    const mB = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);
    const mixedHex = rgbToHex(mR, mG, mB);

    result = {
      resultType: 'metadata',
      metadata: {
        color1,
        color2,
        mixRatio: `${Math.round(ratio * 100)}%`,
        mixedHex,
        mixedRgb: `rgb(${mR}, ${mG}, ${mB})`,
      },
      stats: { mixedColor: mixedHex, ratio: `${Math.round(ratio * 100)}%` },
    };
  } else if (slug === 'color-blindness-simulator') {
    const baseHex = rawInput || options.hex || '#10b981';
    const simulations = simulateColorBlindness(baseHex);

    result = {
      resultType: 'metadata',
      metadata: simulations,
      stats: { simulatedTypes: 4, baseHex },
    };
  } else if (slug === 'material-tailwind-palette-generator') {
    const baseHex = rawInput || options.hex || '#6366f1';
    const colorName = options.colorName || 'brand';
    const pal = generateTailwindPalette(baseHex, colorName);

    result = {
      resultType: 'code',
      content: pal.tailwindConfig,
      fileName: `${colorName}-tailwind-palette.json`,
      mimeType: 'application/json',
      metadata: {
        palette: pal.palette,
        cssVariables: pal.cssVariables,
      },
      stats: { colorSteps: 11, baseHex },
    };
  } else if (slug === 'color-palette-generator') {
    const swatches = [
      '#0f172a',
      '#1e293b',
      '#3b82f6',
      '#60a5fa',
      '#38bdf8',
      '#f59e0b',
      '#10b981',
      '#ec4899',
    ];

    result = {
      resultType: 'metadata',
      metadata: {
        palette: swatches,
        dominantColor: swatches[2],
        accentColor: swatches[5],
      },
      stats: { totalColors: swatches.length },
    };
  }

  // -------------------------------------------------------------
  // 3. Visual CSS Generators
  // -------------------------------------------------------------
  else if (slug === 'css-gradient-generator') {
    const type = options.type || 'linear';
    const angle = options.angle || '135deg';
    const color1 = options.color1 || '#6366f1';
    const color2 = options.color2 || '#a855f7';
    const color3 = options.color3 || '#ec4899';

    let css = '';
    if (type === 'radial') {
      css = `background: radial-gradient(circle, ${color1} 0%, ${color2} 50%, ${color3} 100%);`;
    } else if (type === 'conic') {
      css = `background: conic-gradient(from 0deg, ${color1}, ${color2}, ${color3}, ${color1});`;
    } else {
      css = `background: linear-gradient(${angle}, ${color1} 0%, ${color2} 50%, ${color3} 100%);`;
    }

    result = {
      resultType: 'code',
      content: `.gradient-box {\n  ${css}\n}`,
      fileName: 'gradient.css',
      mimeType: 'text/css',
      metadata: { css, gradientType: type, angle },
      stats: { gradientType: type, stopsCount: 3 },
    };
  } else if (slug === 'css-box-shadow-generator') {
    const x = options.xOffset ?? 0;
    const y = options.yOffset ?? 10;
    const blur = options.blur ?? 25;
    const spread = options.spread ?? -5;
    const color = options.color || 'rgba(0, 0, 0, 0.25)';
    const inset = options.inset ? 'inset ' : '';

    const shadowRule = `box-shadow: ${inset}${x}px ${y}px ${blur}px ${spread}px ${color};`;
    const textShadowRule = `text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);`;

    result = {
      resultType: 'code',
      content: `.shadow-element {\n  ${shadowRule}\n  ${textShadowRule}\n}`,
      fileName: 'shadow.css',
      mimeType: 'text/css',
      metadata: { shadowRule, textShadowRule },
      stats: { blur: `${blur}px`, spread: `${spread}px` },
    };
  } else if (slug === 'css-border-radius-generator') {
    const tl = options.topLeft ?? 24;
    const tr = options.topRight ?? 24;
    const br = options.bottomRight ?? 24;
    const bl = options.bottomLeft ?? 24;

    const borderRadius = `border-radius: ${tl}px ${tr}px ${br}px ${bl}px;`;

    result = {
      resultType: 'code',
      content: `.rounded-card {\n  ${borderRadius}\n}`,
      fileName: 'border-radius.css',
      mimeType: 'text/css',
      metadata: { borderRadius, values: { tl, tr, br, bl } },
      stats: { tl, tr, br, bl },
    };
  } else if (slug === 'css-glassmorphism-generator') {
    const blur = options.blur ?? 16;
    const opacity = options.opacity ?? 0.25;
    const borderOpacity = options.borderOpacity ?? 0.18;

    const css = `.glass-card {
  background: rgba(255, 255, 255, ${opacity});
  backdrop-filter: blur(${blur}px);
  -webkit-backdrop-filter: blur(${blur}px);
  border: 1px solid rgba(255, 255, 255, ${borderOpacity});
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  border-radius: 16px;
}`;

    result = {
      resultType: 'code',
      content: css,
      fileName: 'glassmorphism.css',
      mimeType: 'text/css',
      metadata: { blur: `${blur}px`, opacity, borderOpacity },
      stats: { blur: `${blur}px`, effect: 'Glassmorphism' },
    };
  } else if (slug === 'css-triangle-ribbon-generator') {
    const direction = options.direction || 'top';
    const size = options.size || 20;
    const color = options.color || '#3b82f6';

    let borderRules = '';
    if (direction === 'top') {
      borderRules = `border-left: ${size}px solid transparent;\nborder-right: ${size}px solid transparent;\nborder-bottom: ${size}px solid ${color};`;
    } else if (direction === 'bottom') {
      borderRules = `border-left: ${size}px solid transparent;\nborder-right: ${size}px solid transparent;\nborder-top: ${size}px solid ${color};`;
    } else if (direction === 'left') {
      borderRules = `border-top: ${size}px solid transparent;\nborder-bottom: ${size}px solid transparent;\nborder-right: ${size}px solid ${color};`;
    } else {
      borderRules = `border-top: ${size}px solid transparent;\nborder-bottom: ${size}px solid transparent;\nborder-left: ${size}px solid ${color};`;
    }

    const css = `.triangle-${direction} {\n  width: 0;\n  height: 0;\n  ${borderRules}\n}`;

    result = {
      resultType: 'code',
      content: css,
      fileName: 'triangle.css',
      mimeType: 'text/css',
      metadata: { direction, size, color },
      stats: { shape: 'triangle', direction },
    };
  } else if (slug === 'css-grid-flexbox-generator') {
    const layout = options.layout || 'grid';
    const cols = options.columns || 3;
    const gap = options.gap || 16;

    let css = '';
    if (layout === 'grid') {
      css = `.grid-container {
  display: grid;
  grid-template-columns: repeat(${cols}, minmax(0, 1fr));
  gap: ${gap}px;
  align-items: stretch;
}`;
    } else {
      css = `.flex-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: ${gap}px;
}`;
    }

    result = {
      resultType: 'code',
      content: css,
      fileName: `${layout}-layout.css`,
      mimeType: 'text/css',
      metadata: { layout, cols, gap },
      stats: { layoutType: layout, gap: `${gap}px` },
    };
  } else if (slug === 'css-mesh-gradient-generator') {
    const css = `.mesh-gradient {
  background-color: #ff9a9e;
  background-image: 
    radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 50%, hsla(355, 100%, 93%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 50%, hsla(340, 100%, 76%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(269, 100%, 77%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 100%, hsla(242, 100%, 70%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 0%, hsla(343, 100%, 76%, 1) 0px, transparent 50%);
}`;

    result = {
      resultType: 'code',
      content: css,
      fileName: 'mesh-gradient.css',
      mimeType: 'text/css',
      metadata: { points: 6 },
      stats: { meshStops: 6 },
    };
  } else if (slug === 'css-filter-effects-generator') {
    const blur = options.blur ?? 0;
    const brightness = options.brightness ?? 100;
    const contrast = options.contrast ?? 100;
    const grayscale = options.grayscale ?? 0;
    const hueRotate = options.hueRotate ?? 0;

    const filter = `filter: blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) hue-rotate(${hueRotate}deg);`;

    result = {
      resultType: 'code',
      content: `.filter-element {\n  ${filter}\n  transition: filter 0.3s ease;\n}`,
      fileName: 'filters.css',
      mimeType: 'text/css',
      metadata: { filter },
      stats: { brightness: `${brightness}%`, contrast: `${contrast}%` },
    };
  } else if (slug === 'css-clip-path-generator') {
    const shape = options.shape || 'polygon';
    let clipPath = '';
    if (shape === 'circle') {
      clipPath = 'circle(50% at 50% 50%)';
    } else if (shape === 'ellipse') {
      clipPath = 'ellipse(50% 35% at 50% 50%)';
    } else {
      clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'; // Pentagon
    }

    result = {
      resultType: 'code',
      content: `.clipped-element {\n  clip-path: ${clipPath};\n  -webkit-clip-path: ${clipPath};\n}`,
      fileName: 'clip-path.css',
      mimeType: 'text/css',
      metadata: { clipPath, shape },
      stats: { shape, modernCss: true },
    };
  } else if (slug === 'css-card-flip-generator') {
    const css = `.flip-card {
  background-color: transparent;
  perspective: 1000px;
}
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.8s;
  transform-style: preserve-3d;
}
.flip-card:hover .flip-card-inner {
  transform: rotateY(180deg);
}
.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 1rem;
}
.flip-card-back {
  transform: rotateY(180deg);
}`;

    result = {
      resultType: 'code',
      content: css,
      fileName: 'card-flip.css',
      mimeType: 'text/css',
      metadata: { perspective: '1000px', duration: '0.8s' },
      stats: { animation: '3D Flip', trigger: 'hover' },
    };
  } else if (slug === 'css-custom-scrollbar-generator') {
    const width = options.width || 8;
    const thumbColor = options.thumbColor || '#3b82f6';
    const trackColor = options.trackColor || '#0f172a';

    const css = `/* WebKit Custom Scrollbar */
::-webkit-scrollbar {
  width: ${width}px;
  height: ${width}px;
}
::-webkit-scrollbar-track {
  background: ${trackColor};
  border-radius: 4px;
}
::-webkit-scrollbar-thumb {
  background: ${thumbColor};
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #2563eb;
}

/* Firefox Standard */
* {
  scrollbar-width: thin;
  scrollbar-color: ${thumbColor} ${trackColor};
}`;

    result = {
      resultType: 'code',
      content: css,
      fileName: 'scrollbar.css',
      mimeType: 'text/css',
      metadata: { width: `${width}px`, thumbColor, trackColor },
      stats: { width: `${width}px`, crossBrowser: true },
    };
  }

  // -------------------------------------------------------------
  // 4. Design & Vector Helpers
  // -------------------------------------------------------------
  else if (slug === 'favicon-generator') {
    const brandName = options.brandName || 'iNWebTools';
    const primaryColor = options.primaryColor || '#3b82f6';

    const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="16" fill="${primaryColor}"/>
  <path d="M20 44L32 16L44 44M24 36H40" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

    const htmlTags = `<!-- Modern Favicon HTML Tags -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="theme-color" content="${primaryColor}">`;

    result = {
      resultType: 'code',
      content: `${htmlTags}\n\n<!-- Vector SVG Icon -->\n${svgIcon}`,
      fileName: 'favicon-bundle.html',
      mimeType: 'text/html',
      metadata: { svgIcon, htmlTags, brandName },
      stats: { formats: 'SVG, PNG 32, PNG 16, Apple Touch Icon', themeColor: primaryColor },
    };
  } else if (slug === 'svg-code-cleaner') {
    let svg =
      rawInput ||
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3b82f6"/></svg>`;
    const origLength = svg.length;

    // Clean namespaces, comments, extra whitespace
    svg = svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\sxmlns:xlink="[^"]+"/g, '')
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .trim();

    result = {
      resultType: 'code',
      content: svg,
      fileName: 'cleaned.svg',
      mimeType: 'image/svg+xml',
      metadata: { originalBytes: origLength, cleanedBytes: svg.length },
      stats: {
        savedPercentage: `${Math.round(((origLength - svg.length) / Math.max(origLength, 1)) * 100)}%`,
      },
    };
  } else if (slug === 'svg-path-visualizer') {
    const pathD = rawInput || options.path || 'M10 80 Q 52.5 10, 95 80 T 180 80';
    const svgWrapper = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
</svg>`;

    result = {
      resultType: 'code',
      content: svgWrapper,
      fileName: 'vector-path.svg',
      mimeType: 'image/svg+xml',
      metadata: { pathD, commandCount: pathD.split(/[A-Za-z]/).filter(Boolean).length },
      stats: { rawCommandsLength: pathD.length },
    };
  } else if (slug === 'aspect-ratio-calculator') {
    const w = parseFloat(options.width || 1920);
    const h = parseFloat(options.height || 1080);

    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(Math.round(w), Math.round(h));
    const ratioStr = `${Math.round(w / divisor)}:${Math.round(h / divisor)}`;
    const decimalRatio = parseFloat((w / Math.max(h, 1)).toFixed(3));

    result = {
      resultType: 'metadata',
      metadata: {
        width: w,
        height: h,
        ratio: ratioStr,
        decimalRatio,
        cssAspectRatio: `aspect-ratio: ${Math.round(w / divisor)} / ${Math.round(h / divisor)};`,
      },
      stats: { ratio: ratioStr, decimalRatio },
    };
  } else if (slug === 'screen-resolution-checker') {
    result = {
      resultType: 'metadata',
      metadata: {
        presets: [
          { device: '4K Ultra HD', resolution: '3840 x 2160', ratio: '16:9' },
          { device: 'Full HD 1080p', resolution: '1920 x 1080', ratio: '16:9' },
          { device: 'MacBook Pro 16"', resolution: '3456 x 2234', ratio: '16:10' },
          { device: 'iPad Pro 12.9"', resolution: '2732 x 2048', ratio: '4:3' },
          { device: 'iPhone 15 / 16 Pro Max', resolution: '1290 x 2796', ratio: '19.5:9' },
          { device: 'Samsung Galaxy S24 Ultra', resolution: '1440 x 3120', ratio: '19.5:9' },
        ],
      },
      stats: { totalPresets: 6, modernDisplays: 'Retina / 4K Ready' },
    };
  } else {
    result = {
      resultType: 'text',
      content: rawInput || `Processed design tool ${slug}`,
      stats: { engine: 'Design & CSS DSP' },
    };
  }

  res.status(200).json({
    success: true,
    data: {
      tool: {
        slug,
        module: 'color-design',
      },
      result,
      durationMs: Date.now() - startTime,
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  });
});
