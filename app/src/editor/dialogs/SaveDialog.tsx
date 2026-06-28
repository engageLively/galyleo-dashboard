import { useState } from 'react';
import {
  overlayStyle, dialogStyle, headerStyle, closeBtnStyle,
  fieldStyle, labelStyle, inputStyle, cancelBtnStyle, okBtnStyle, footerStyle,
} from './dialogStyles';

interface Props {
  initialName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function SaveDialog({ initialName, onSave, onClose }: Props) {
  const [name, setName] = useState(initialName);

  function handleSave() {
    const n = name.trim();
    if (!n) return;
    onSave(n.endsWith('.gd.json') ? n : `${n}.gd.json`);
    onClose();
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...dialogStyle, width: 380 }}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>Save Dashboard</span>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px' }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Filename</label>
            <input
              style={inputStyle}
              value={name}
              autoFocus
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
              placeholder="dashboard.gd.json"
            />
          </div>
        </div>

        <div style={footerStyle}>
          <div />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={cancelBtnStyle} onClick={onClose}>Cancel</button>
            <button style={okBtnStyle} onClick={handleSave} disabled={!name.trim()}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
