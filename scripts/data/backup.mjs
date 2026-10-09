import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { openStore } from '../../server/store.mjs';
import { blobPath, hashFile, safeRelativePath } from '../../server/storage.mjs';
import { resolveSourceIdentity } from '../../server/source-identity.mjs';

const execute = promisify(execFile);
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const metadataNames = ['manifest.json', 'database.sqlite', 'state.json', 'catalog.json', 'checksums.json', 'config.public.json', 'RESTORE.md'];
const format = 'KYM_COMPLETE_BACKUP_V1';

async function jsonFile(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function cleanOwned(directory, parent, prefix) {
  const resolved = path.resolve(directory);
  if (path.dirname(resolved) !== path.resolve(parent) || !path.basename(resolved).startsWith(prefix)) {
    throw new Error('Refusing to remove a directory outside the operation workspace.');
  }
  await fs.rm(resolved, { recursive: true, force: true });
}

export function referencedBlobs(state) {
  const blobs = new Map();
  function include(file) {
    if (!/^[a-f0-9]{64}$/.test(file.sha256 ?? '') || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0) {
      throw new Error('Invalid stored file hash or size.');
    }
    const previous = blobs.get(file.sha256);
    if (previous && previous.sizeBytes !== file.sizeBytes) throw new Error('Conflicting sizes for a content hash.');
    blobs.set(file.sha256, { sha256: file.sha256, sizeBytes: file.sizeBytes });
  }
  for (const revision of state.revisions ?? []) {
    for (const file of revision.files ?? []) {
      safeRelativePath(file.path);
      include(file);
    }
  }
  for (const submission of state.submissions ?? []) {
    for (const file of submission.files ?? []) if (file.sha256) include(file);
  }
  return [...blobs.values()].sort((a, b) => a.sha256.localeCompare(b.sha256));
}

async function requireSpace(parent, bytes) {
  const disk = await fs.statfs(parent);
  if (disk.bavail * disk.bsize < bytes + 128 * 1024 * 1024) throw new Error('Insufficient disk space for the operation.');
}

export async function exportBackup({ dataDir, output, siteUrl = process.env.KYM_SITE_URL ?? '', baseUrl = process.env.KYM_BASE_URL ?? '/' }) {
  dataDir = path.resolve(dataDir);
  output = path.resolve(output);
  await fs.access(path.join(dataDir, 'catalog.sqlite'));
  await fs.mkdir(path.dirname(output), { recursive: true });
  if (await fs.stat(output).then(() => true, () => false)) throw new Error('Backup output already exists.');
  const lockPath = path.join(dataDir, '.backup.lock');
  const lock = await fs.open(lockPath, 'wx', 0o600).catch(() => { throw new Error('Another backup is running; inspect .backup.lock if an earlier process was interrupted.'); });
  const partial = `${output}.${randomUUID()}.partial`;
  let working;
  let source;
  let snapshot;
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    working = await fs.mkdtemp(path.join(path.dirname(output), '.kym-backup-'));
    source = openStore(dataDir);
    // SQLite produces a consistent snapshot even when the service uses WAL.
    source.db.prepare('VACUUM INTO ?').run(path.join(working, 'database.sqlite'));
    source.close(); source = null;
    const snapshotDirectory = path.join(working, '.snapshot');
    await fs.mkdir(snapshotDirectory);
    await fs.copyFile(path.join(working, 'database.sqlite'), path.join(snapshotDirectory, 'catalog.sqlite'));
    snapshot = openStore(snapshotDirectory);
    if (!snapshot.integrityCheck()) throw new Error('Database integrity check failed.');
    const state = snapshot.exportState();
    const published = snapshot.getPublishedRevision();
    if (!published) throw new Error('No published data revision exists.');
    const sqliteVersion = snapshot.db.prepare('SELECT sqlite_version() AS version').get().version;
    snapshot.close(); snapshot = null;
    const checksums = referencedBlobs(state);
    const bytes = checksums.reduce((sum, file) => sum + file.sizeBytes, 0);
    // Working copy plus the final compressed archive; compressed assets may barely shrink.
    await requireSpace(path.dirname(output), bytes * 2);
    await fs.mkdir(path.join(working, 'files'));
    for (const file of checksums) {
      const origin = blobPath(dataDir, file.sha256);
      const measured = await hashFile(origin);
      if (measured.sha256 !== file.sha256 || measured.sizeBytes !== file.sizeBytes) throw new Error(`Blob integrity mismatch: ${file.sha256}`);
      await fs.copyFile(origin, path.join(working, 'files', file.sha256));
    }
    const database = await hashFile(path.join(working, 'database.sqlite'));
    const manifest = {
      format, formatVersion: 1, exportedAt: new Date().toISOString(),
      schemaVersion: state.schemaVersion, publishedRevision: published.id,
      ...await resolveSourceIdentity(sourceRoot, { sourceCommit: process.env.KYM_SOURCE_COMMIT }),
      dataSourceCommit: published.sourceCommit ?? null, nodeVersion: process.version,
      sqliteVersion,
      databaseSha256: database.sha256, databaseBytes: database.sizeBytes,
      blobCount: checksums.length, blobBytes: bytes,
      publishedFiles: published.files.length, packageCount: published.catalog.packages.length,
      revisionCount: state.revisions.length, submissionCount: state.submissions.length,
    };
    await jsonFile(path.join(working, 'manifest.json'), manifest);
    await jsonFile(path.join(working, 'state.json'), state);
    await jsonFile(path.join(working, 'catalog.json'), published.catalog);
    await jsonFile(path.join(working, 'checksums.json'), checksums);
    await jsonFile(path.join(working, 'config.public.json'), { siteUrl, baseUrl });
    await fs.writeFile(path.join(working, 'RESTORE.md'), '# KYM Commons restore\n\nUse the source commit in manifest.json with a supported Node.js 24 runtime and tar.\nRun npm ci, then node scripts/data/backup.mjs restore --archive <archive> --data-dir <new-empty-directory>.\nSet KYM_DATA_DIR, KYM_SITE_URL, KYM_BASE_URL and run npm run build.\nConfigure Nginx/current release and initialize a fresh administrator password using the operations guide.\nDo not overwrite a live data directory. Historical GitHub attachments and the old server are not required.\nIncomplete uploads remain uploading and need a fresh upload; completed pending and approved submissions are retained.\n', { mode: 0o600 });
    await execute('tar', ['-czf', partial, '-C', working, ...metadataNames, 'files'], { maxBuffer: 1024 * 1024 });
    await fs.chmod(partial, 0o600);
    // A hard link creates the destination without replacing a concurrent file.
    await fs.link(partial, output);
    await fs.unlink(partial);
    return { output, ...manifest };
  } finally {
    try {
      source?.close(); snapshot?.close();
      await fs.rm(partial, { force: true });
      if (working) await cleanOwned(working, path.dirname(output), '.kym-backup-');
    } finally {
      try { await lock.close(); }
      finally { await fs.rm(lockPath, { force: true }); }
    }
  }
}

async function unpackAndVerify(archive, parent) {
  archive = path.resolve(archive);
  const listing = await execute('tar', ['-tzf', archive], { maxBuffer: 16 * 1024 * 1024 });
  const entries = listing.stdout.split(/\r?\n/).filter(Boolean).map((entry) => entry.replace(/^\.\//, ''));
  const seen = new Set();
  for (const entry of entries) {
    if (!metadataNames.includes(entry) && entry !== 'files/' && entry !== 'files' && !/^files\/[a-f0-9]{64}$/.test(entry)) {
      throw new Error(`Unsafe or unexpected archive entry: ${entry}`);
    }
    if (seen.has(entry)) throw new Error(`Duplicate archive entry: ${entry}`);
    seen.add(entry);
  }
  for (const required of metadataNames) if (!seen.has(required)) throw new Error(`Missing backup entry: ${required}`);
  const detailed = await execute('tar', ['-tvzf', archive], { maxBuffer: 32 * 1024 * 1024 });
  if (detailed.stdout.split(/\r?\n/).filter(Boolean).some((line) => !['-', 'd'].includes(line[0]))) {
    throw new Error('Backup contains links or special files.');
  }
  const preflight = await execute('tar', ['-xOzf', archive, 'manifest.json'], { maxBuffer: 64 * 1024 });
  const declared = JSON.parse(preflight.stdout);
  if (declared.format !== format || declared.formatVersion !== 1 || declared.schemaVersion !== 1 ||
      !Number.isSafeInteger(declared.blobBytes) || declared.blobBytes < 0 ||
      !Number.isSafeInteger(declared.databaseBytes) || declared.databaseBytes < 0) throw new Error('Unsupported backup format or invalid size totals.');
  // Archive manifests are not trusted for extraction size: validate every tar size too.
  let extractionBytes = 0;
  for (const line of detailed.stdout.split(/\r?\n/).filter(Boolean)) {
    // bsdtar and GNU tar both report regular-file size immediately before date fields.
    const fields = line.trim().split(/\s+/);
    const size = fields[1]?.includes('/') ? Number(fields[2]) : Number(fields[4]);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error('Cannot safely determine archive entry size.');
    extractionBytes += size;
    if (!Number.isSafeInteger(extractionBytes)) throw new Error('Archive is too large.');
  }
  await requireSpace(parent, extractionBytes + declared.databaseBytes);
  const working = await fs.mkdtemp(path.join(parent, '.kym-restore-'));
  let store;
  try {
    await execute('tar', ['-xzf', archive, '-C', working, '--no-same-owner', '--no-same-permissions'], { maxBuffer: 1024 * 1024 });
    const read = async (name) => JSON.parse(await fs.readFile(path.join(working, name), 'utf8'));
    const manifest = await read('manifest.json');
    if (manifest.format !== format || manifest.formatVersion !== 1 || manifest.schemaVersion !== 1) throw new Error('Unsupported backup format or database schema.');
    const database = await hashFile(path.join(working, 'database.sqlite'));
    if (database.sha256 !== manifest.databaseSha256 || database.sizeBytes !== manifest.databaseBytes) throw new Error('Database checksum mismatch.');
    const state = await read('state.json');
    const checksums = await read('checksums.json');
    const referenced = referencedBlobs(state);
    if (JSON.stringify(checksums) !== JSON.stringify(referenced)) throw new Error('Backup file inventory does not match saved state.');
    if (checksums.length !== manifest.blobCount || checksums.reduce((sum, file) => sum + file.sizeBytes, 0) !== manifest.blobBytes) throw new Error('Backup manifest totals do not match.');
    const expected = new Set([...metadataNames, 'files/', 'files', ...checksums.map((file) => `files/${file.sha256}`)]);
    if (entries.some((entry) => !expected.has(entry))) throw new Error('Unexpected binary file in backup.');
    for (const file of checksums) {
      const measured = await hashFile(path.join(working, 'files', file.sha256));
      if (measured.sha256 !== file.sha256 || measured.sizeBytes !== file.sizeBytes) throw new Error(`File checksum mismatch: ${file.sha256}`);
    }
    const data = path.join(working, '.data');
    await fs.mkdir(data);
    await fs.copyFile(path.join(working, 'database.sqlite'), path.join(data, 'catalog.sqlite'));
    store = openStore(data);
    if (!store.integrityCheck()) throw new Error('Restored database integrity check failed.');
    const actualState = store.exportState();
    const published = store.getPublishedRevision();
    if (JSON.stringify(actualState) !== JSON.stringify(state)) throw new Error('Logical state does not match the database snapshot.');
    if (!published || published.id !== manifest.publishedRevision || JSON.stringify(published.catalog) !== JSON.stringify(await read('catalog.json'))) throw new Error('Published catalog does not match manifest.');
    store.close(); store = null;
    await fs.rename(path.join(working, 'files'), path.join(data, 'blobs'));
    await jsonFile(path.join(data, 'restored-from.json'), manifest);
    return { working, data, manifest };
  } catch (error) {
    store?.close();
    await cleanOwned(working, parent, '.kym-restore-');
    throw error;
  }
}

export async function verifyBackup({ archive, temporaryParent = os.tmpdir() }) {
  const result = await unpackAndVerify(archive, path.resolve(temporaryParent));
  try { return { verified: true, ...result.manifest }; }
  finally { await cleanOwned(result.working, temporaryParent, '.kym-restore-'); }
}

export async function restoreBackup({ archive, dataDir }) {
  dataDir = path.resolve(dataDir);
  if (await fs.stat(dataDir).then(() => true, () => false)) throw new Error('Restore requires a new, nonexistent data directory.');
  const parent = path.dirname(dataDir);
  await fs.mkdir(parent, { recursive: true });
  const result = await unpackAndVerify(archive, parent);
  try {
    await fs.rename(result.data, dataDir);
    return { dataDir, restored: true, ...result.manifest };
  } finally { await cleanOwned(result.working, parent, '.kym-restore-'); }
}

function options(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Use --option value pairs.');
    parsed[args[i].slice(2)] = args[i + 1];
  }
  return parsed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, ...args] = process.argv.slice(2);
    const values = options(args);
    const dataDir = values['data-dir'] ?? process.env.KYM_DATA_DIR;
    let result;
    if (operation === 'export' && dataDir && values.output) result = await exportBackup({ dataDir, output: values.output });
    else if (operation === 'verify' && values.archive) result = await verifyBackup({ archive: values.archive, temporaryParent: values['temporary-parent'] });
    else if (operation === 'restore' && values.archive && dataDir) result = await restoreBackup({ archive: values.archive, dataDir });
    else throw new Error('Usage: backup.mjs export --data-dir DIR --output FILE | verify --archive FILE | restore --archive FILE --data-dir NEW_DIR');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
