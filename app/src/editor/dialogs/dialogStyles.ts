/** Shared CSS-in-JS styles for editor dialogs. */

export const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};

export const dialogStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 6,
  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  width: 420,
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 14px',
  borderBottom: '1px solid #ddd',
  fontFamily: 'sans-serif',
  fontSize: 14,
};

export const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 16, color: '#666', lineHeight: 1,
};

export const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  borderTop: '1px solid #ddd', padding: '8px 14px',
};

export const cancelBtnStyle: React.CSSProperties = {
  padding: '4px 14px', fontSize: 13, cursor: 'pointer',
  border: '1px solid #ccc', borderRadius: 4, background: '#f5f5f5',
};

export const okBtnStyle: React.CSSProperties = {
  padding: '4px 14px', fontSize: 13, cursor: 'pointer',
  border: 'none', borderRadius: 4,
  background: '#4A90D9', color: '#fff', fontWeight: 600,
};

export const fieldStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 3,
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#555', fontFamily: 'sans-serif',
};

export const inputStyle: React.CSSProperties = {
  padding: '5px 8px', fontSize: 13, border: '1px solid #ccc',
  borderRadius: 4, fontFamily: 'sans-serif',
};

export const selectStyle: React.CSSProperties = {
  padding: '5px 8px', fontSize: 13, border: '1px solid #ccc',
  borderRadius: 4, fontFamily: 'sans-serif', background: '#fff',
};
