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
  const tableServerParams = params.getAll('table_server');

  if (galyleoServer || tableServerParams.length > 0) {
    const publishServer = galyleoServer ?? '';
    const tableServers = tableServerParams.length > 0
      ? tableServerParams
      : (publishServer ? [publishServer] : []);

    if (publishServer) {
      try {
        const r = await fetch(`${publishServer}/config`, { credentials: 'include' });
        if (r.ok) {
          const cfg = await r.json() as Partial<GalyleoConfig>;
          return {
            publishServer: cfg.publishServer ?? publishServer,
            tableServers: tableServerParams.length > 0 ? tableServerParams : (cfg.tableServers ?? tableServers),
          };
        }
      } catch { /* fall through to URL params */ }
    }

    return { publishServer, tableServers };
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
