#!/usr/bin/env bash
set -euo pipefail

themespace_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$themespace_root/web"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf 'Node.js and npm are required to start ThemeSpace.\n' >&2
  exit 1
fi
if [[ ! -d node_modules/vinext ]]; then
  printf 'Install dependencies first: npm ci --prefix "%s/web"\n' "$themespace_root" >&2
  exit 1
fi

themespace_port="$(node --input-type=module - "${1-}" <<'NODE'
import { createServer } from "node:net";

const defaultPort = 5173;
const input = process.argv[2];
const value = /^\d+$/.test(input) ? Number(input) : NaN;
const valid = Number.isInteger(value) && value >= 1 && value <= 65535;
const requested = valid ? value : defaultPort;
if (input && !valid) console.error(`Invalid port; using default ${defaultPort}.`);

function canListen(port, host) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      if (["EADDRINUSE", "EACCES"].includes(error.code)) resolve(false);
      else if (host === "::" && ["EAFNOSUPPORT", "EADDRNOTAVAIL"].includes(error.code)) resolve(true);
      else reject(error);
    });
    server.listen({ port, host, ipv6Only: host === "::" }, () => {
      server.close((error) => error ? reject(error) : resolve(true));
    });
  });
}

let selected;
for (let port = requested; port <= 65535; port++) {
  if (await canListen(port, "0.0.0.0") && await canListen(port, "::")) {
    selected = port;
    break;
  }
}
if (!selected) {
  console.error(`No available port between ${requested} and 65535. Choose a lower port.`);
  process.exit(1);
}
if (selected !== requested) console.error(`Port ${requested} is unavailable; using ${selected}.`);
process.stdout.write(String(selected));
NODE
)"

# Keep account callbacks and page URLs on this instance without editing .env.
export THEMESPACE_DEV_PORT="$themespace_port"
export BETTER_AUTH_URL="http://localhost:$themespace_port"
export SITE_URL="$BETTER_AUTH_URL"
# Each port gets its own Vite cache; allow another instance of this checkout.
export VINEXT_NO_DEV_LOCK=1

printf 'Starting ThemeSpace at %s\n' "$SITE_URL"
exec npm run dev -- --port "$themespace_port" --hostname localhost
