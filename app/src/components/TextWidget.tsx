import { morphicToCSS } from '../utils/morphicStyles';
import type { MorphDescriptor } from '../types/dashboard';

interface Props {
  descriptor: MorphDescriptor;
}

export function TextWidget({ descriptor }: Props) {
  const { morphicProperties, textString, textProperties } = descriptor;
  const containerStyle = morphicToCSS(morphicProperties);

  const tp = (textProperties ?? {}) as Record<string, unknown>;
  const textStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: (tp.textAlign as string) === 'right' ? 'flex-end'
      : (tp.textAlign as string) === 'center' ? 'center'
      : 'flex-start',
    fontSize: tp.fontSize != null ? `${tp.fontSize}px` : '16px',
    fontWeight: (tp.fontWeight as string) ?? 'normal',
    fontStyle: (tp.fontStyle as string) ?? 'normal',
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
