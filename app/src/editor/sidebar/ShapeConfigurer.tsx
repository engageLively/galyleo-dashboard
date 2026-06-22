/**
 * Properties panel for the currently selected widget.
 *
 * All fields read their values directly from the spec (no local state mirrors).
 * Changes call patchSpec immediately, giving live canvas feedback.
 * Text content and image URL use local state so typing feels natural;
 * they commit to spec on blur.
 * One undo entry per focus→blur session via undoPushed ref.
 */

import { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useEditorStore, getMorphicProps } from '../../store/editorStore';
import { updateMorphicProps, updateMorphDescriptor, morphsAsDict } from '../utils/specMutations';
import { parseMorphicColor } from '../../utils/morphicStyles';
import type { MorphicProperties, MorphDescriptor } from '../../types/dashboard';

// ---- Color helpers ----

function cssToRgba(hex: string): string {
  if (!hex) return 'rgba(0,0,0,0)';
  if (hex.startsWith('#')) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},1)`;
  }
  return hex;
}

function toHex(color: unknown): string {
  const css = parseMorphicColor(color as never, 'transparent');
  if (!css || css === 'transparent') return '#ffffff';
  if (css.startsWith('#')) return css.slice(0, 7);
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  return '#ffffff';
}

function uniformNum(val: number | Record<string, number> | undefined, fallback = 0): number {
  if (val == null) return fallback;
  if (typeof val === 'number') return val;
  const vals = Object.values(val);
  return vals.length ? vals[0] : fallback;
}

function uniformColor(colorMap: Record<string, unknown> | undefined): unknown {
  if (!colorMap) return 'rgba(0,0,0,1)';
  return colorMap.all ?? Object.values(colorMap)[0] ?? 'rgba(0,0,0,1)';
}

function uniformStyle(val: string | Record<string, string> | undefined, fallback = 'solid'): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  return Object.values(val)[0] ?? fallback;
}

const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double'] as const;

// ---- Font helpers ----

// Always available — loaded via Google Fonts link in index.html
const GOOGLE_FONTS = [
  'Lato', 'Merriweather', 'Montserrat', 'Nunito', 'Open Sans',
  'Oswald', 'Playfair Display', 'Poppins', 'Raleway', 'Roboto',
  'Source Code Pro',
];

const GENERIC_FAMILIES = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];

const SYSTEM_CANDIDATES = [
  'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS',
  'Consolas', 'Courier New', 'Franklin Gothic Medium', 'Garamond',
  'Georgia', 'Helvetica Neue', 'Impact', 'Lucida Console',
  'Lucida Sans Unicode', 'Palatino Linotype', 'Segoe UI', 'Tahoma',
  'Times New Roman', 'Trebuchet MS', 'Verdana',
];

function detectSystemFonts(): string[] {
  if (typeof document === 'undefined') return [];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const test = 'mmmmmmmmmmlli';
  ctx.font = '16px monospace'; const baseM = ctx.measureText(test).width;
  ctx.font = '16px serif';     const baseS = ctx.measureText(test).width;
  return SYSTEM_CANDIDATES.filter(font => {
    ctx.font = `16px '${font}', monospace`;
    if (ctx.measureText(test).width !== baseM) return true;
    ctx.font = `16px '${font}', serif`;
    return ctx.measureText(test).width !== baseS;
  });
}

const AVAILABLE_FONTS = [...GENERIC_FAMILIES, ...GOOGLE_FONTS, ...detectSystemFonts()];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extrabold' },
  { value: '900', label: 'Black' },
];

function toggleDecoration(current: string | undefined, value: string, on: boolean): string {
  const parts = (current ?? 'none').split(/\s+/).filter(p => p && p !== 'none');
  if (on) { if (!parts.includes(value)) parts.push(value); }
  else { const i = parts.indexOf(value); if (i >= 0) parts.splice(i, 1); }
  return parts.length ? parts.join(' ') : 'none';
}

// ---- Component ----

export function ShapeConfigurer() {
  const spec         = useDashboardStore(s => s.spec);
  const patchSpec    = useDashboardStore(s => s.patchSpec);
  const selectedId   = useEditorStore(s => s.selectedId);
  const selectedKind = useEditorStore(s => s.selectedKind);
  const pushUndo     = useEditorStore(s => s.pushUndo);

  // One undo entry per focus session — pushed on first change, reset on blur
  const undoPushed = useRef(false);
  const onFocus = () => { undoPushed.current = false; };
  const onBlur  = () => { undoPushed.current = false; };
  function ensureUndo() {
    if (!undoPushed.current) { pushUndo(); undoPushed.current = true; }
  }

  // Local state ONLY for fields where typing mid-word matters
  const [textString, setTextString] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Sync local text/image state when the selected widget changes
  useEffect(() => {
    if (!spec || !selectedId || selectedKind !== 'morph') {
      setTextString('');
      setImageUrl('');
      return;
    }
    const md: MorphDescriptor | undefined = morphsAsDict(spec)[selectedId];
    if (md?.type === 'Text') setTextString(md.textString ?? '');
    if (md?.type === 'Image') setImageUrl(md.imageUrl ?? '');
  // Intentionally only re-sync on selection change, NOT on every spec update.
  // While the user types, local state leads and commits on blur.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedKind]);

  if (!spec || !selectedId || !selectedKind) {
    return <p style={emptyStyle}>Select a widget in edit mode to configure it.</p>;
  }

  const mp: MorphicProperties | undefined = getMorphicProps(spec, selectedId, selectedKind);
  if (!mp) return null;

  // ---- Mutation helpers (read-live from mp, patch immediately) ----

  function patch(props: Partial<MorphicProperties>) {
    ensureUndo();
    patchSpec(s => updateMorphicProps(s, selectedId!, selectedKind!, props));
  }

  const patchX = (v: number) => { if (!isNaN(v)) patch({ position: { x: v, y: mp.position.y } }); };
  const patchY = (v: number) => { if (!isNaN(v)) patch({ position: { x: mp.position.x, y: v } }); };
  const patchW = (v: number) => { if (!isNaN(v) && v >= 1) patch({ extent: { x: v, y: mp.extent.y } }); };
  const patchH = (v: number) => { if (!isNaN(v) && v >= 1) patch({ extent: { x: mp.extent.x, y: v } }); };
  const patchFill    = (hex: string) => { ensureUndo(); patch({ fill: cssToRgba(hex) }); };
  const patchOpacity = (v: number)   => { if (!isNaN(v)) patch({ opacity: Math.min(1, Math.max(0, v)) }); };

  function patchBorder(overrides: Partial<{ width: number; radius: number; colorHex: string; style: string }>) {
    ensureUndo();
    patchSpec(s => updateMorphicProps(s, selectedId!, selectedKind!, {
      border: {
        style:  overrides.style  ?? uniformStyle(mp!.border?.style),
        width:  overrides.width  ?? uniformNum(mp!.border?.width),
        color:  { all: cssToRgba(overrides.colorHex ?? toHex(uniformColor(mp!.border?.color))) },
        radius: overrides.radius ?? uniformNum(mp!.border?.radius),
      },
    }));
  }

  function patchTextProps(overrides: Record<string, unknown> = {}) {
    ensureUndo();
    const md: MorphDescriptor | undefined = morphsAsDict(spec!)[selectedId!];
    const tp = md?.textProperties ?? {};
    patchSpec(s => updateMorphDescriptor(s, selectedId!, {
      textProperties: { ...tp, ...overrides },
    }));
  }

  // ---- Derived display values (read directly from spec) ----
  const rotDeg     = Math.round(((mp.rotation ?? 0) * 180 / Math.PI % 360 + 360) % 360);
  const fillHex    = toHex(mp.fill);
  const bStyle     = uniformStyle(mp.border?.style);
  const bWidth     = uniformNum(mp.border?.width);
  const bRadius    = uniformNum(mp.border?.radius);
  const bColorHex  = toHex(uniformColor(mp.border?.color));

  const morphDict: Record<string, MorphDescriptor> = morphsAsDict(spec);
  const md: MorphDescriptor | undefined = selectedKind === 'morph' ? morphDict[selectedId] : undefined;
  const morphType  = md?.type ?? '';
  const tp         = md?.textProperties ?? {};
  const fontSize   = (tp.fontSize   as number) ?? 14;
  // Normalize keyword weights to numeric strings for the select
  const rawWeight  = (tp.fontWeight as string) ?? '400';
  const fontWeight = rawWeight === 'normal' ? '400' : rawWeight === 'bold' ? '700' : rawWeight;
  const fontFamily = (tp.fontFamily as string) ?? 'sans-serif';
  const textAlign  = (tp.textAlign  as string) ?? 'left';
  const textColor  = toHex(tp.color);
  const textDecoration = (tp.textDecoration as string) ?? 'none';
  const verticalAlign  = (tp.verticalAlign  as string) ?? 'baseline';
  const isItalic   = (tp.fontStyle as string) === 'italic';
  const isUnderline  = textDecoration.includes('underline');
  const isStrike     = textDecoration.includes('line-through');
  const isSuper      = verticalAlign === 'super';
  const isSub        = verticalAlign === 'sub';

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={selectedId}>{selectedId}</span>
        <span style={kindTagStyle}>{morphType || selectedKind}</span>
      </div>

      {/* Geometry */}
      <section style={sectionStyle}>
        <div style={sectionLabel}>GEOMETRY</div>
        <div style={grid2}>
          <label style={lbl}>X</label>
          <input style={numIn} type="number" value={Math.round(mp.position.x)}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchX(Number(e.target.value))} />
          <label style={lbl}>Y</label>
          <input style={numIn} type="number" value={Math.round(mp.position.y)}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchY(Number(e.target.value))} />
          <label style={lbl}>W</label>
          <input style={numIn} type="number" min={1} value={Math.round(mp.extent.x)}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchW(Number(e.target.value))} />
          <label style={lbl}>H</label>
          <input style={numIn} type="number" min={1} value={Math.round(mp.extent.y)}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchH(Number(e.target.value))} />
        </div>
        <div style={{ ...row, marginTop: 4 }}>
          <label style={lbl}>Rot</label>
          <input style={{ ...numIn, width: 70 }} type="number" min={0} max={359} value={rotDeg}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => {
              const deg = Number(e.target.value);
              if (!isNaN(deg)) patch({ rotation: deg * Math.PI / 180 });
            }} />
          <span style={unit}>°</span>
        </div>
      </section>

      {/* Appearance */}
      <section style={sectionStyle}>
        <div style={sectionLabel}>APPEARANCE</div>

        <div style={row}>
          <label style={lbl}>Fill</label>
          <input type="color" style={colorSwatch} value={fillHex}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchFill(e.target.value)} />
          <input style={{ ...numIn, flex: 1, fontFamily: 'monospace', fontSize: 11 }}
            value={fillHex}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) patchFill(e.target.value); }} />
        </div>

        <div style={row}>
          <label style={lbl}>Opacity</label>
          <input style={{ ...numIn, width: 70 }} type="number" min={0} max={1} step={0.05}
            value={mp.opacity ?? 1}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchOpacity(Number(e.target.value))} />
        </div>

        <div style={row}>
          <label style={lbl}>Border</label>
          <select style={{ ...numIn, flex: 1 }} value={bStyle}
            onChange={e => patchBorder({ style: e.target.value })}>
            {BORDER_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={row}>
          <label style={lbl}>Width</label>
          <input style={{ ...numIn, width: 48 }} type="number" min={0} value={bWidth}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchBorder({ width: Number(e.target.value) })}
            title="Width (px)" />
          <span style={unit}>px</span>
          <input type="color" style={colorSwatch} value={bColorHex}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchBorder({ colorHex: e.target.value })} />
        </div>

        <div style={row}>
          <label style={lbl}>Radius</label>
          <input style={{ ...numIn, width: 70 }} type="number" min={0} value={bRadius}
            onFocus={onFocus} onBlur={onBlur}
            onChange={e => patchBorder({ radius: Number(e.target.value) })} />
          <span style={unit}>px</span>
        </div>
      </section>

      {/* Text content */}
      {morphType === 'Text' && (
        <section style={sectionStyle}>
          <div style={sectionLabel}>TEXT</div>
          <textarea style={textArea} value={textString} rows={3}
            onChange={e => setTextString(e.target.value)}
            onBlur={() => {
              ensureUndo();
              patchSpec(s => updateMorphDescriptor(s, selectedId!, { textString }));
              undoPushed.current = false;
            }}
          />
          <div style={{ ...grid2, marginTop: 4 }}>
            <label style={lbl}>Size</label>
            <input style={numIn} type="number" min={6} value={fontSize}
              onFocus={onFocus} onBlur={onBlur}
              onChange={e => patchTextProps({ fontSize: Number(e.target.value) })} />
            <label style={lbl}>Wt</label>
            <select style={numIn} value={fontWeight}
              onChange={e => patchTextProps({ fontWeight: e.target.value })}>
              {FONT_WEIGHTS.map(({ value, label }) =>
                <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {/* Style toggles: Italic · Underline · Strikethrough · Superscript · Subscript */}
          <div style={{ ...row, marginTop: 4, gap: 3 }}>
            {([
              { key: 'italic',    label: 'I',  title: 'Italic',       active: isItalic,
                on: () => patchTextProps({ fontStyle: isItalic ? 'normal' : 'italic' }) },
              { key: 'underline', label: 'U',  title: 'Underline',    active: isUnderline,
                on: () => patchTextProps({ textDecoration: toggleDecoration(textDecoration, 'underline', !isUnderline) }) },
              { key: 'strike',    label: 'S̶',  title: 'Strikethrough', active: isStrike,
                on: () => patchTextProps({ textDecoration: toggleDecoration(textDecoration, 'line-through', !isStrike) }) },
              { key: 'super',     label: 'x²', title: 'Superscript',  active: isSuper,
                on: () => patchTextProps({ verticalAlign: isSuper ? 'baseline' : 'super' }) },
              { key: 'sub',       label: 'x₂', title: 'Subscript',    active: isSub,
                on: () => patchTextProps({ verticalAlign: isSub ? 'baseline' : 'sub' }) },
            ] as const).map(({ key, label, title, active, on }) => (
              <button key={key} title={title} onClick={on}
                style={{ ...alignBtn, flex: 1,
                  fontStyle: key === 'italic' ? 'italic' : 'normal',
                  textDecoration: key === 'underline' ? 'underline' : key === 'strike' ? 'line-through' : 'none',
                  background: active ? '#4A90D9' : '#eee',
                  color: active ? '#fff' : '#333' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ ...row, marginTop: 4 }}>
            <label style={lbl}>Align</label>
            {(['left','center','right'] as const).map(a => (
              <button key={a}
                style={{ ...alignBtn, background: textAlign === a ? '#4A90D9' : '#eee', color: textAlign === a ? '#fff' : '#333' }}
                onClick={() => patchTextProps({ textAlign: a })}>
                {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
              </button>
            ))}
            <input type="color" style={{ ...colorSwatch, marginLeft: 'auto' }} value={textColor}
              onChange={e => patchTextProps({ color: e.target.value })}
              title="Text color" />
          </div>
          <div style={{ ...row, marginTop: 4 }}>
            <label style={lbl}>Font</label>
            <input style={{ ...numIn, flex: 1 }} value={fontFamily}
              list="galyleo-fonts"
              onFocus={onFocus} onBlur={onBlur}
              onChange={e => patchTextProps({ fontFamily: e.target.value })}
              placeholder="sans-serif" />
            <datalist id="galyleo-fonts">
              {AVAILABLE_FONTS.map(f => <option key={f} value={f} />)}
            </datalist>
          </div>
        </section>
      )}

      {/* Image URL */}
      {morphType === 'Image' && (
        <section style={sectionStyle}>
          <div style={sectionLabel}>IMAGE</div>
          <div style={row}>
            <label style={lbl}>URL</label>
            <input style={{ ...numIn, flex: 1 }} value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              onBlur={() => {
                ensureUndo();
                patchSpec(s => updateMorphDescriptor(s, selectedId!, { imageUrl }));
                undoPushed.current = false;
              }}
              placeholder="https://…" />
          </div>
        </section>
      )}

      {selectedKind === 'chart' && (
        <p style={{ padding: '6px 8px', fontSize: 11, color: '#888', margin: 0 }}>
          Use ✏ in the Charts tab to edit chart type and options.
        </p>
      )}
    </div>
  );
}

// ---- Styles ----

const panelStyle: React.CSSProperties = {
  flex: 1, minHeight: 0, overflowY: 'auto',
  display: 'flex', flexDirection: 'column',
  fontSize: 12, fontFamily: 'sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '5px 8px', background: '#f0f0f0',
  borderBottom: '1px solid #ddd', flexShrink: 0,
};

const kindTagStyle: React.CSSProperties = {
  fontSize: 10, padding: '1px 6px', borderRadius: 10,
  background: '#4A90D9', color: '#fff', flexShrink: 0,
};

const sectionStyle: React.CSSProperties = {
  padding: '6px 8px', borderBottom: '1px solid #eee',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: '#aaa',
  letterSpacing: 1, marginBottom: 4,
};

const grid2: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '22px 1fr 22px 1fr', gap: 4, alignItems: 'center',
};

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
};

const lbl: React.CSSProperties = {
  fontSize: 11, color: '#666', flexShrink: 0,
};

const numIn: React.CSSProperties = {
  padding: '2px 4px', fontSize: 12, width: '100%',
  border: '1px solid #ccc', borderRadius: 3, boxSizing: 'border-box',
};

const colorSwatch: React.CSSProperties = {
  width: 26, height: 22, padding: 1,
  border: '1px solid #ccc', borderRadius: 3,
  cursor: 'pointer', flexShrink: 0,
};

const unit: React.CSSProperties = {
  fontSize: 10, color: '#999', flexShrink: 0,
};

const textArea: React.CSSProperties = {
  width: '100%', padding: 4, fontSize: 12,
  border: '1px solid #ccc', borderRadius: 3,
  fontFamily: 'sans-serif', resize: 'vertical',
  boxSizing: 'border-box',
};

const alignBtn: React.CSSProperties = {
  padding: '2px 7px', fontSize: 12,
  border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer',
};

const emptyStyle: React.CSSProperties = {
  padding: 12, color: '#999', fontSize: 12, margin: 0,
};
