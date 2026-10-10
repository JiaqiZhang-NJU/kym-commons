#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID != 0 ]]; then echo 'Run with sudo.' >&2; exit 1; fi
archive="${1:-/tmp/node-v24.21.0-linux-x64.tar.xz}"
expected=fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6
echo "$expected  $archive" | sha256sum --check --status
id kym-commons >/dev/null 2>&1 || useradd --system --home-dir /opt/kym-commons --shell /usr/sbin/nologin --gid www-data kym-commons
install -d -o kym-commons -g www-data -m 0750 /opt/kym-commons
install -d -o kym-commons -g www-data -m 0750 /opt/kym-commons/source /opt/kym-commons/releases
install -d -o root -g www-data -m 0750 /etc/kym-commons
install -d -o root -g root -m 0700 /var/backups/kym-commons
install -d -o kym-commons -g www-data -m 0750 /var/cache/kym-commons
if [[ ! -d /opt/kym-commons/node-v24.21.0-linux-x64 ]]; then
  tar -xJf "$archive" -C /opt/kym-commons
fi
if [[ ! -e /opt/kym-commons/runtime ]]; then ln -s node-v24.21.0-linux-x64 /opt/kym-commons/runtime; fi
/opt/kym-commons/runtime/bin/node --version
