// Converts morphicProperties from the .gd.json format into React CSSProperties.

import type { CSSProperties } from 'react';
import type { MorphicColor, MorphicColorRGBA, MorphicProperties, MorphicBorder } from '../types/dashboard';

// ---- Color parsing ----

/** Maps lively.next named colours to CSS hex values. */
const COLOR_NAME_MAP: Record<string, string> = {
  'Color.white': '#ffffff',
  'Color.black': '#000000',
  'Color.transparent': 'transparent',
  'Color.red': '#ff0000',
  'Color.green': '#008000',
  'Color.blue': '#0000ff',
  'Color.yellow': '#ffff00',
  'Color.gray': '#808080',
  'Color.grey': '#808080',
  'Color.lightGray': '#d3d3d3',
  'Color.darkGray': '#a9a9a9',
  'Color.orange': '#ffa500',
  'Color.pink': '#ffc0cb',
  'Color.purple': '#800080',
  'Color.cyan': '#00ffff',
  'Color.magenta': '#ff00ff',
};

/**
 * Converts a lively.next colour string to a CSS colour string.
 * Handles `Color.white`, `Color.rgb(r,g,b)`, `Color.rgba(r,g,b,a)`, and gradients
 * (which fall back to white).
 */
function parseColorString(s: string): string {
  if (COLOR_NAME_MAP[s]) return COLOR_NAME_MAP[s];

  // Pass CSS color literals straight through
  if (s.startsWith('#') || s.startsWith('rgb') || s.startsWith('hsl')) return s;

  // lively.next Color.rgb(...) / Color.rgba(...) format
  const rgbMatch = s.match(/Color\.rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    const [, r, g, b, a] = rgbMatch;
    return a !== undefined
      ? `rgba(${r},${g},${b},${a})`
      : `rgb(${r},${g},${b})`;
  }

  if (s.includes('Gradient')) return '#ffffff';

  return '#ffffff';
}

/**
 * Converts a `MorphicColor` (named string, `Color.rgb(…)` expression, or RGBA object)
 * to a CSS colour string.
 *
 * @param color - The colour value to parse.
 * @param fallback - CSS string to return when `color` is null/undefined.
 */
export function parseMorphicColor(color: MorphicColor | undefined | null, fallback = 'transparent'): string {
  if (color == null) return fallback;
  if (typeof color === 'string') return parseColorString(color);
  // RGBA object with components in [0, 1]
  const { r, g, b, a } = color as MorphicColorRGBA;
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a ?? 1})`;
}

// ---- Border parsing ----

/**
 * Extracts the value for one CSS side from a per-side map or a uniform scalar.
 *
 * @param val - Either a `{ top, right, bottom, left }` map or a scalar.
 * @param side - The side to extract (`'top'`, `'right'`, `'bottom'`, `'left'`).
 */
function perSide<T>(val: Record<string, T> | T, side: string): T {
  if (val !== null && typeof val === 'object' && !Array.isArray(val) && side in (val as object)) {
    return (val as Record<string, T>)[side];
  }
  return val as T;
}

/**
 * Converts a `MorphicBorder` descriptor to CSS border properties.
 * Handles per-side style/width/colour and all border-radius forms.
 */
function borderCSS(border: MorphicBorder): CSSProperties {
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  const style: CSSProperties = {};

  sides.forEach(side => {
    const s = perSide(border.style, side) as string;
    const w = perSide(border.width, side) as number;
    const c = parseMorphicColor(perSide(border.color as Record<string, MorphicColor>, side));
    (style as Record<string, unknown>)[`border${side.charAt(0).toUpperCase() + side.slice(1)}Style`] = s || 'none';
    (style as Record<string, unknown>)[`border${side.charAt(0).toUpperCase() + side.slice(1)}Width`] = `${w ?? 0}px`;
    (style as Record<string, unknown>)[`border${side.charAt(0).toUpperCase() + side.slice(1)}Color`] = c;
  });

  if (border.radius && typeof border.radius === 'object') {
    const r = border.radius as Record<string, number>;
    style.borderTopLeftRadius = `${r.topLeft ?? 0}px`;
    style.borderTopRightRadius = `${r.topRight ?? 0}px`;
    style.borderBottomRightRadius = `${r.bottomRight ?? 0}px`;
    style.borderBottomLeftRadius = `${r.bottomLeft ?? 0}px`;
  } else if (border.borderRadius != null) {
    style.borderRadius = `${border.borderRadius}px`;
  } else if (typeof border.radius === 'number') {
    style.borderRadius = `${border.radius}px`;
  }

  return style;
}

// ---- Main conversion ----

/**
 * Converts a lively.next `MorphicProperties` object to a React `CSSProperties` object
 * suitable for absolute positioning on the dashboard canvas.
 *
 * @param props - The morph properties from the `.gd.json` spec.
 */
export function morphicToCSS(props: MorphicProperties): CSSProperties {
  const style: CSSProperties = {
    position: 'absolute',
    left: props.position.x,
    top: props.position.y,
    width: props.extent.x,
    height: props.extent.y,
    opacity: props.opacity ?? 1,
    transform: props.rotation ? `rotate(${props.rotation}rad)` : undefined,
    overflow: props.clipMode === 'visible' ? 'visible' : 'hidden',
    backgroundColor: parseMorphicColor(props.fill, 'transparent'),
    boxSizing: 'border-box',
  };

  if (props.border) {
    Object.assign(style, borderCSS(props.border));
  }

  return style;
}

/**
 * Computes the minimum canvas size (width × height) needed to contain all widgets
 * without clipping, based on each widget's position and extent.
 *
 * @param morphProps - Array of `MorphicProperties` for every widget on the canvas.
 */
export function computeCanvasBounds(morphProps: MorphicProperties[]): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const p of morphProps) {
    width = Math.max(width, p.position.x + p.extent.x);
    height = Math.max(height, p.position.y + p.extent.y);
  }
  return { width, height };
}
