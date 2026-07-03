#!/bin/bash
# Build the React editor and copy it into the galyleo service static dir.
# Run this before build-service.sh to update the editor bundled in the service image.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"
SERVICE_STATIC="${GALYLEO_SERVICE_DIR:-$SCRIPT_DIR/../jh2/galyleo-service-platform}/src/static/studio"

echo "=== Building React editor ==="
echo "    VITE_BASE_URL=/services/galyleo/static/studio/"
(
  cd "$APP_DIR"
  VITE_BASE_URL=/services/galyleo/static/studio/ \
  VITE_DEFAULT_MODE=edit \
  npm run build
)

echo ""
echo "=== Copying dist/ -> $SERVICE_STATIC ==="
rm -rf "$SERVICE_STATIC"
cp -r "$APP_DIR/dist/." "$SERVICE_STATIC"

echo ""
echo "Done. Next: run build-service.sh to rebuild the galyleo service image."
