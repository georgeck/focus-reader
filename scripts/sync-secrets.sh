#!/usr/bin/env bash
# Propagates shared config vars across .dev.vars files for local development.
# Usage: ./scripts/sync-secrets.sh

set -euo pipefail

EMAIL_DOMAIN="${EMAIL_DOMAIN:-read.yourdomain.com}"
COLLAPSE_PLUS_ALIAS="${COLLAPSE_PLUS_ALIAS:-false}"
OWNER_EMAIL="${OWNER_EMAIL:-owner@yourdomain.com}"
AUTH_MODE="${AUTH_MODE:-single-user}"
AUTH_SECRET="${AUTH_SECRET:-dev-auth-secret-change-me}"
BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://localhost:3000}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
RESEND_FROM_EMAIL="${RESEND_FROM_EMAIL:-}"

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
AUTH_MODE=${AUTH_MODE}
AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=${BETTER_AUTH_URL}
RESEND_API_KEY=${RESEND_API_KEY}
RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL}
EOF
  echo "Wrote $target"
done
