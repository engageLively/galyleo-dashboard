export interface GalyleoConfig {
  publishServer: string;
  tableServers: string[];
}

let _promise: Promise<GalyleoConfig> | null = null;

export function fetchGalyleoConfig(): Promise<GalyleoConfig> {
  if (!_promise) _promise = _load();
  return _promise;
}

async function _load(): Promise<GalyleoConfig> {
  const params = new URLSearchParams(window.location.search);
  const galyleoServer = params.get('galyleo_server');

  if (galyleoServer) {
    try {
      const r = await fetch(`${galyleoServer}/config`, { credentials: 'include' });
      if (r.ok) return r.json() as Promise<GalyleoConfig>;
    } catch { /* fall through to default */ }
    return { publishServer: galyleoServer, tableServers: [galyleoServer] };
  }

  // Standalone: read from public/galyleo.config.json
  try {
    const r = await fetch('/galyleo.config.json');
    if (r.ok) {
      const cfg = await r.json() as Partial<GalyleoConfig>;
      return {
        publishServer: cfg.publishServer ?? '',
        tableServers: cfg.tableServers ?? [],
      };
    }
  } catch { /* fall through */ }

  return { publishServer: '', tableServers: [] };
}
