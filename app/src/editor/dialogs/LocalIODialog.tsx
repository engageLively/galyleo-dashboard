import { useState } from 'react';
import type { GalyleoDashboard } from '../../types/dashboard';
import {
  overlayStyle, dialogStyle, headerStyle, closeBtnStyle,
  footerStyle, cancelBtnStyle, okBtnStyle,
} from './dialogStyles';

interface LoadProps {
  mode: 'load';
  onLoad: (spec: GalyleoDashboard) => void;
  onCancel: () => void;
}

interface SaveProps {
  mode: 'save';
  json: string;
  onClose: () => void;
}

type Props = LoadProps | SaveProps;

const textareaStyle: React.CSSProperties = {
  width: '100%', height: 320,
  fontFamily: 'monospace', fontSize: 12,
  resize: 'vertical', boxSizing: 'border-box',
  border: '1px solid #ccc', borderRadius: 4, padding: 8,
};

export function LocalIODialog(props: Props) {
  const [text, setText] = useState(props.mode === 'save' ? props.json : '');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (props.mode === 'save') {
    return (
      <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) props.onClose(); }}>
        <div style={{ ...dialogStyle, width: 580 }}>
          <div style={headerStyle}>
            <span style={{ fontWeight: 600 }}>Dashboard JSON</span>
            <button style={closeBtnStyle} onClick={props.onClose}>✕</button>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <textarea style={textareaStyle} value={text} readOnly />
          </div>
          <div style={footerStyle}>
            <button style={cancelBtnStyle} onClick={props.onClose}>Close</button>
            <button style={okBtnStyle} onClick={() => {
              navigator.clipboard.writeText(text).then(() => setCopied(true));
            }}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // props.mode === 'load' at this point (save mode returned early above)
  const { onLoad, onCancel } = props as LoadProps;

  function handleLoad() {
    try {
      const spec = JSON.parse(text) as GalyleoDashboard;
      onLoad(spec);
    } catch {
      setError('Invalid JSON — paste a valid dashboard spec.');
    }
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{ ...dialogStyle, width: 580 }}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>Load Dashboard</span>
          <button style={closeBtnStyle} onClick={props.onCancel}>✕</button>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#555', fontFamily: 'sans-serif' }}>
            Paste dashboard JSON:
          </p>
          <textarea
            style={textareaStyle}
            value={text}
            onChange={e => { setText(e.target.value); setError(''); }}
            placeholder='{ "tables": {}, "views": {}, "charts": {}, ... }'
            autoFocus
          />
          {error && <p style={{ color: '#c00', fontSize: 12, margin: '4px 0 0', fontFamily: 'sans-serif' }}>{error}</p>}
        </div>
        <div style={footerStyle}>
          <button style={cancelBtnStyle} onClick={onCancel}>Cancel</button>
          <button style={{ ...okBtnStyle, opacity: text.trim() ? 1 : 0.5 }}
            onClick={handleLoad} disabled={!text.trim()}>
            Load
          </button>
        </div>
      </div>
    </div>
  );
}
