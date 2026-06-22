/**
 * Renders a Text morph from the dashboard spec.
 *
 * Applies layout from `morphicToCSS` and text styling from `textProperties`
 * (fontSize, fontWeight, fontStyle, color, fontFamily, textAlign).
 * Text is non-selectable, clipped with an ellipsis if it overflows.
 */

import { morphicToCSS } from '../utils/morphicStyles';
import type { MorphDescriptor } from '../types/dashboard';

interface Props {
  descriptor: MorphDescriptor;
}

/** Absolutely-positioned text label derived from a `MorphDescriptor`. */
export function TextWidget({ descriptor }: Props) {
  const { morphicProperties, textString, textProperties } = descriptor;
  const containerStyle = morphicToCSS(morphicProperties);

  const tp = (textProperties ?? {}) as Record<string, unknown>;

  // Parse numeric string weights (e.g. '700') to numbers so browsers apply them reliably.
  const rawWeight = tp.fontWeight as string | number | undefined;
  const fontWeight: string | number =
    rawWeight == null ? 'normal'
    : typeof rawWeight === 'number' ? rawWeight
    : /^\d+$/.test(rawWeight) ? parseInt(rawWeight, 10)
    : rawWeight;

  const textStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: (tp.textAlign as string) === 'right' ? 'flex-end'
      : (tp.textAlign as string) === 'center' ? 'center'
      : 'flex-start',
    fontSize: tp.fontSize != null ? `${tp.fontSize}px` : '16px',
    fontWeight,
    fontStyle: (tp.fontStyle as string) ?? 'normal',
    textDecoration: (tp.textDecoration as string) ?? 'none',
    verticalAlign: (tp.verticalAlign as string) ?? 'baseline',
    color: (tp.color as string) ?? '#000000',
    fontFamily: (tp.fontFamily as string) ?? 'inherit',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    userSelect: 'none',
  };

  return (
    <div style={containerStyle}>
      <div style={textStyle}>{textString ?? ''}</div>
    </div>
  );
}
