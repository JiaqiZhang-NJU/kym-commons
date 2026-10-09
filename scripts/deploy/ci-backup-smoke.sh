#!/usr/bin/env bash
# Exercise the actual deployment wrapper using only the hosted CI fixture.
set -euo pipefail
umask 077

if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_ENVIRONMENT:-} != github-hosted ]]; then
  echo 'This smoke check runs only on a GitHub-hosted Actions runner.' >&2
  exit 1
fi
if [[ $# != 0 || -z ${GITHUB_WORKSPACE:-} || -z ${RUNNER_TEMP:-} || -z ${KYM_DATA_DIR:-} ]]; then
  echo 'The hosted workflow must supply its workspace, temporary directory and artificial dataset.' >&2
  exit 1
fi

source_dir=$(git rev-parse --show-toplevel)
test "$(realpath "$source_dir")" = "$(realpath "$GITHUB_WORKSPACE")"
commit=$(git -C "$source_dir" rev-parse HEAD)
[[ $commit =~ ^[a-f0-9]{40}$ ]]
test -z "$(git -C "$source_dir" status --porcelain -- . ':(exclude)SOURCE_COMMIT' ':(exclude)SOURCE_METADATA.json')"
test ! -e "$source_dir/SOURCE_METADATA.json"
fixture_data=$(realpath "$KYM_DATA_DIR")
test -f "$fixture_data/catalog.sqlite"
node_binary=$(realpath "$(command -v node)")
runtime_dir=$(dirname "$(dirname "$node_binary")")
test -x "$runtime_dir/bin/node"
test "$("$node_binary" -p 'process.versions.node.split(".")[0]')" = 24

# Refuse to reuse any existing deployment location, including dangling links.
for target in /opt/kym-commons /etc/kym-commons /var/backups/kym-commons; do
  if [[ -e $target || -L $target ]]; then
    echo "Refusing to reuse an existing deployment location: $target" >&2
    exit 1
  fi
done

"$node_binary" --input-type=module - "$source_dir" "$fixture_data" <<'NODE'
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { openStore } = await import(pathToFileURL(path.join(process.argv[2], 'server/store.mjs')).href);
const store = openStore(process.argv[3]);
try {
  const published = store.getPublishedRevision();
  assert.equal(published?.id, 'fixture-1');
  assert.equal(published.catalog.packages.length, 1);
  assert.equal(published.catalog.packages[0].id, 'fixture-example');
  assert.equal(published.files.length, 1);
} finally { store.close(); }
NODE

runner_uid=$(id -u)
runner_gid=$(id -g)
sudo -n install -d -o "$runner_uid" -g "$runner_gid" -m 0700 \
  /opt/kym-commons /etc/kym-commons /var/backups/kym-commons
ln -s "$source_dir" /opt/kym-commons/source
ln -s "$runtime_dir" /opt/kym-commons/runtime
printf '%s\n' "$commit" > "$source_dir/SOURCE_COMMIT"
printf 'KYM_DATA_DIR=%q\nKYM_SITE_URL=%q\nKYM_BASE_URL=%q\n' \
  "$fixture_data" https://fixture.example / > /etc/kym-commons/environment

smoke_dir=$(mktemp -d "$RUNNER_TEMP/kym-wrapper-smoke.XXXXXX")
/bin/bash /opt/kym-commons/source/scripts/deploy/backup.sh > "$smoke_dir/wrapper.log"
python3 - "$smoke_dir/wrapper.log" "$commit" <<'PY'
import hashlib
import json
import pathlib
import stat
import sys
import tarfile

text = pathlib.Path(sys.argv[1]).read_text()
decoder = json.JSONDecoder()
values = []
remaining = text.lstrip()
while remaining:
    value, consumed = decoder.raw_decode(remaining)
    values.append(value)
    remaining = remaining[consumed:].lstrip()
assert len(values) == 2, 'Expected exactly one export and one verification result'
exported, verified = values
assert verified['verified'] is True
assert {key: value for key, value in exported.items() if key != 'output'} == {
    key: value for key, value in verified.items() if key != 'verified'
}
assert exported['sourceCommit'] == sys.argv[2]
assert exported['parentCommit'] == sys.argv[2]
assert exported['workingTreeDirty'] is False
assert exported['dataSourceCommit'] is None
archive = pathlib.Path(exported['output'])
assert archive.parent == pathlib.Path('/var/backups/kym-commons')
assert archive.is_file() and not archive.is_symlink()
assert stat.S_IMODE(archive.stat().st_mode) == 0o600
checksum = archive.with_name(archive.name + '.sha256')
assert checksum.is_file() and not checksum.is_symlink()
assert stat.S_IMODE(checksum.stat().st_mode) == 0o600
digest = hashlib.sha256()
with archive.open('rb') as stream:
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
assert checksum.read_text() == f'{digest.hexdigest()}  {archive}\n'
with tarfile.open(archive, 'r:gz') as bundle:
    manifest = json.load(bundle.extractfile('manifest.json'))
    configuration = json.load(bundle.extractfile('config.public.json'))
assert manifest['sourceCommit'] == sys.argv[2]
assert manifest['publishedRevision'] == 'fixture-1'
assert manifest['publishedFiles'] == manifest['blobCount'] == manifest['packageCount'] == 1
assert configuration == {'siteUrl': 'https://fixture.example', 'baseUrl': '/'}
print(json.dumps({
    'backupWrapperSmokePassed': True,
    'exportAndVerifyPassed': True,
    'sourceCommit': sys.argv[2],
    'archiveMode': '0600',
    'sha256': digest.hexdigest(),
    'publicConfiguration': configuration,
}, indent=2))
PY
