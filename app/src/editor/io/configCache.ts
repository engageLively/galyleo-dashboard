export interface GalyleoConfig {
  publishServer: string;
  tableServers: string[];
}

// Cached per page load — config is stable for the lifetime of a session.
let _promise: Promise<GalyleoConfig> | null = null;

export function fetchGalyleoConfig(galyleoServer: string): Promise<GalyleoConfig> {
  if (!_promise) {
    _promise = fetch(`${galyleoServer}/config`, { credentials: 'include' })
      .then(r => r.ok ? (r.json() as Promise<GalyleoConfig>) : Promise.reject(`HTTP ${r.status}`))
      .catch(() => ({ publishServer: galyleoServer, tableServers: [galyleoServer] }));
  }
  return _promise;
}
