// Converts morphicProperties from the .gd.json format into React CSSProperties.

import type { CSSProperties } from 'react';
import type { MorphicColor, MorphicColorRGBA, MorphicProperties, MorphicBorder } from '../types/dashboard';

// ---- Color parsing ----

// Parse a Color expression string like "Color.white", "Color.rgb(255,0,0)", etc.
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

function parseColorString(s: string): string {
  if (COLOR_NAME_MAP[s]) return COLOR_NAME_MAP[s];

  // Color.rgb(r, g, b) or Color.rgba(r, g, b, a) — values 0-255
  const rgbMatch = s.match(/Color\.rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    const [, r, g, b, a] = rgbMatch;
    return a !== undefined
      ? `rgba(${r},${g},${b},${a})`
      : `rgb(${r},${g},${b})`;
  }

  // LinearGradient / RadialGradient — return a fallback color
  if (s.includes('Gradient')) return '#ffffff';

  return '#ffffff';
}

export function parseMorphicColor(color: MorphicColor | undefined | null, fallback = 'transparent'): string {
  if (color == null) return fallback;
  if (typeof color === 'string') return parseColorString(color);
  // RGBA object with values in [0, 1]
  const { r, g, b, a } = color as MorphicColorRGBA;
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a ?? 1})`;
}

// ---- Border parsing ----

function perSide<T>(val: Record<string, T> | T, side: string): T {
  if (val !== null && typeof val === 'object' && !Array.isArray(val) && side in (val as object)) {
    return (val as Record<string, T>)[side];
  }
  return val as T;
}

function borderCSS(border: MorphicBorder): CSSProperties {
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  const style: CSSProperties = {};

  // Per-side style
  sides.forEach(side => {
    const s = perSide(border.style, side) as string;
    const w = perSide(border.width, side) as number;
    const c = parseMorphicColor(perSide(border.color as Record<string, MorphicColor>, side));
    (style as Record<string, unknown>)[`border${side.charAt(0).toUpperCase() + side.slice(1)}Style`] = s || 'none';
    (style as Record<string, unknown>)[`border${side.charAt(0).toUpperCase() + side.slice(1)}Width`] = `${w ?? 0}px`;
    (style as Record<string, unknown>)[`border${side.charAt(0).toUpperCase() + side.slice(1)}Color`] = c;
  });

  // Border radius
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

// Compute the bounding box (width, height) needed to contain all widgets.
export function computeCanvasBounds(morphProps: MorphicProperties[]): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const p of morphProps) {
    width = Math.max(width, p.position.x + p.extent.x);
    height = Math.max(height, p.position.y + p.extent.y);
  }
  return { width, height };
}
