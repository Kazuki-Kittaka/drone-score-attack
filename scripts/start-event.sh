#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -d node_modules ]; then
  echo 'Before the event, run npm install.'
  exit 1
fi
if [ ! -f dist/index.html ]; then npm run build; fi
exec npm run preview -- --host 127.0.0.1 --port 4173
