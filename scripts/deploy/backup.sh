#!/usr/bin/env bash
set -euo pipefail
umask 077
source /etc/kym-commons/environment
export KYM_SITE_URL KYM_BASE_URL
export PATH="/opt/kym-commons/runtime/bin:$PATH"
export KYM_SOURCE_COMMIT="$(cat /opt/kym-commons/source/SOURCE_COMMIT)"
target="/var/backups/kym-commons/kym-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
node /opt/kym-commons/source/scripts/data/backup.mjs export --data-dir "$KYM_DATA_DIR" --output "$target"
node /opt/kym-commons/source/scripts/data/backup.mjs verify --archive "$target" --temporary-parent /var/backups/kym-commons
sha256sum "$target" > "$target.sha256"
# Keep the previous verified copy until a new backup has passed every check.
python3 - <<'PY'
from pathlib import Path
directory = Path('/var/backups/kym-commons').resolve()
verified = sorted((p for p in directory.glob('kym-*.tar.gz') if p.with_name(p.name + '.sha256').is_file()), reverse=True)
for archive in verified[2:]:
    if archive.resolve().parent != directory or archive.is_symlink():
        raise RuntimeError('Unexpected backup path')
    archive.unlink()
    archive.with_name(archive.name + '.sha256').unlink()
PY
