#!/bin/sh
set -eu

url=${VITE_SUPABASE_URL:-}
key=${VITE_SUPABASE_PUBLISHABLE_KEY:-${VITE_SUPABASE_ANON_KEY:-}}
bot=${VITE_MAX_BOT_USERNAME:-}

if [ -z "$url" ] || [ -z "$key" ]; then
  echo 'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required' >&2
  exit 1
fi

# These public values have restricted formats so they can be written safely as JS strings.
case "$url$key$bot" in
  *[!a-zA-Z0-9._:/?=%-]*)
    echo 'Invalid character in public runtime configuration' >&2
    exit 1
    ;;
esac

cat > /usr/share/nginx/html/config.js <<EOF
window.__CLASSPULSE_CONFIG__ = {
  supabaseUrl: "$url",
  supabaseKey: "$key",
  maxBotUsername: "$bot"
};
EOF
