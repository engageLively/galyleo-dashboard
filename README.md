# galyleo-dashboard

The Galyleo Dashboard Studio — a React+TypeScript+Vite application that serves as both a dashboard viewer and editor.

## Structure

```
app/
  src/
    components/       Dashboard viewer components
    editor/           Editor shell, toolbar, sidebar, dialogs
    store/            Zustand stores (dashboardStore, editorStore)
    renderers/        Chart rendering (Google Charts; swappable via registry)
    utils/            Spec mutation helpers, morphic CSS utilities
  dist/               Vite build output — copied into the service image
build-dashboard.bat   Windows build script (required — see note below)
build-dashboard.sh    WSL/Linux build script
```

## Building

The React app is built with Vite and served as static files from the galyleo service at
`/services/galyleo/static/studio/`.

**Windows (required for GKE deploys):**
```bat
build-dashboard.bat
```

**WSL/Linux:**
```bash
./build-dashboard.sh
```

Both scripts set `VITE_BASE_URL=/services/galyleo/static/studio/` and `VITE_DEFAULT_MODE=edit`,
build the app, and copy the output to `../jh2/galyleo-service-platform/src/static/studio/`.

> **Note:** `node_modules` installed on Windows cannot be used from WSL (esbuild platform
> mismatch). Always run the build from the same platform where `npm install` was run.
> For GKE deployments, use `build-dashboard.bat` from Windows.

After building, rebuild and push the service image:
```bash
cd ../galyleo-deployment
scripts/build-service.sh
```

## Development

```bash
cd app
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`.

- `?mode=edit` — loads the editor shell
- `?mode=interact` (default) — loads the viewer only

## URL parameters

| Parameter | Values | Effect |
|-----------|--------|--------|
| `mode` | `edit`, `interact` | Editor vs viewer mode |
| `dashboardStoreServer` | URL | Override the galyleo server for loading dashboards |
| `ioBackend` | `jupyter`, `local` | Force a specific I/O backend (default: auto-detect) |
