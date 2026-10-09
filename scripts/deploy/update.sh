#!/usr/bin/env bash
# Run as root. Builds the new source in isolation and retains the old source.
set -euo pipefail
if [[ $EUID != 0 || $# != 1 || ! $1 =~ ^[a-f0-9]{40}$ ]]; then
  echo 'Usage: sudo bash scripts/deploy/update.sh FULL_GITHUB_COMMIT' >&2
  exit 1
fi
commit="$1"
source /etc/kym-commons/environment
export PATH="/opt/kym-commons/runtime/bin:$PATH"
export NPM_CONFIG_CACHE=/var/cache/kym-commons/npm
staging="/opt/kym-commons/source-$commit"
if [[ -e $staging ]]; then echo 'Source staging path already exists.' >&2; exit 1; fi
git clone --no-checkout https://github.com/JiaqiZhang-NJU/kym-commons.git "$staging"
git -C "$staging" checkout --detach "$commit"
if [[ -n $(git -C "$staging" ls-files content static/files src/generated/catalog.json '*.sqlite') ]]; then
  echo 'Refusing to deploy a source version containing production data.' >&2
  exit 1
fi
printf '%s\n' "$commit" > "$staging/SOURCE_COMMIT"
chown -R kym-commons:www-data "$staging"
runuser -u kym-commons -- env PATH="$PATH" NPM_CONFIG_CACHE="$NPM_CONFIG_CACHE" /bin/bash -c 'cd "$1"; npm ci' _ "$staging"
systemctl stop kym-commons
trap 'systemctl start kym-commons' EXIT
runuser -u kym-commons -- env PATH="$PATH" NPM_CONFIG_CACHE="$NPM_CONFIG_CACHE" NODE_OPTIONS=--max-old-space-size=2048 \
  node "$staging/scripts/deploy/release.mjs" --data-dir "$KYM_DATA_DIR" --releases-dir "$KYM_RELEASES_DIR" --current-link "$KYM_CURRENT_LINK" --site-url "$KYM_SITE_URL" --base-url "${KYM_BASE_URL:-/}" --source-dir "$staging" --source-commit "$commit"
previous="/opt/kym-commons/source-previous-$(date -u +%Y%m%dT%H%M%SZ)"
# The release is active only after it passed the publisher's full checks.
mv /opt/kym-commons/source "$previous"
ln -s "$staging" /opt/kym-commons/source
# The API also records the code version when publishing future submissions.
# Replace the old environment label only after the new release is complete.
environment_tmp=$(mktemp /etc/kym-commons/environment.XXXXXX)
awk '!/^KYM_SOURCE_COMMIT=/' /etc/kym-commons/environment > "$environment_tmp"
printf 'KYM_SOURCE_COMMIT=%s\n' "$commit" >> "$environment_tmp"
chown root:www-data "$environment_tmp"
chmod 640 "$environment_tmp"
mv "$environment_tmp" /etc/kym-commons/environment
systemctl start kym-commons
trap - EXIT
echo "Published source $commit; previous source retained at $previous"
