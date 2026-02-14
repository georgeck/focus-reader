#!/usr/bin/env bash
# Propagates shared config vars across .dev.vars files for local development.
# Usage: ./scripts/sync-secrets.sh

set -euo pipefail

EMAIL_DOMAIN="${EMAIL_DOMAIN:-read.yourdomain.com}"
COLLAPSE_PLUS_ALIAS="${COLLAPSE_PLUS_ALIAS:-false}"
OWNER_EMAIL="${OWNER_EMAIL:-owner@yourdomain.com}"

TARGETS=(
  "apps/email-worker/.dev.vars"
  "apps/web/.dev.vars"
)

for target in "${TARGETS[@]}"; do
  dir=$(dirname "$target")
  mkdir -p "$dir"
  cat > "$target" <<EOF
EMAIL_DOMAIN=${EMAIL_DOMAIN}
COLLAPSE_PLUS_ALIAS=${COLLAPSE_PLUS_ALIAS}
OWNER_EMAIL=${OWNER_EMAIL}
EOF
  echo "Wrote $target"
done
