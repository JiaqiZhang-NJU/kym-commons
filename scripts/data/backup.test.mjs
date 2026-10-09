import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { openStore } from '../../server/store.mjs';
import { putStreamBlob } from '../../server/storage.mjs';
import { exportBackup, referencedBlobs, restoreBackup, verifyBackup } from './backup.mjs';

const execute = promisify(execFile);
const metadataNames = ['manifest.json', 'database.sqlite', 'state.json', 'catalog.json', 'checksums.json', 'config.public.json', 'RESTORE.md'];

const temporary = [];
afterEach(async () => {
  for (const directory of temporary.splice(0)) {
    if (path.dirname(directory) !== os.tmpdir() || !path.basename(directory).startsWith('kym-backup-test-')) throw new Error('Unsafe test cleanup path.');
    await fs.rm(directory, { recursive: true, force: true });
  }
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kym-backup-test-'));
  temporary.push(root);
  const dataDir = path.join(root, 'data');
  const file = await putStreamBlob(dataDir, [Buffer.from('binary\u0000fixture')]);
  const pending = await putStreamBlob(dataDir, [Buffer.from('pending upload')]);
  const store = openStore(dataDir);
  const catalog = { tracks: [], courses: [], categories: [], packages: [] };
  const revision = store.createRevision(catalog, [{ path: 'unindexed/中文 文件.bin', ...file }], { id: 'baseline' });
  store.setPublishedRevision(revision.id);
  store.saveSubmission({ id: 'pending-1', status: 'pending', manifest: { title: 'Example' }, files: [{ id: 'file-1', name: 'attachment.txt', ...pending }] });
  store.close();
  return { root, dataDir, file, pending };
}

/** Minimal ustar writer creates hostile entries without needing Windows symlink privileges. */
async function writeTarArchive(root, name, entries) {
  const blocks = [];
  for (const entry of entries) {
    const body = entry.body ?? Buffer.alloc(0);
    const header = Buffer.alloc(512);
    function text(offset, length, value) { header.write(value, offset, length, 'ascii'); }
    function octal(offset, length, value) { text(offset, length, `${value.toString(8).padStart(length - 1, '0')}\0`); }
    text(0, 100, entry.name);
    octal(100, 8, 0o600); octal(108, 8, 0); octal(116, 8, 0);
    octal(124, 12, body.length); octal(136, 12, 1);
    header.fill(32, 148, 156);
    text(156, 1, entry.type ?? '0');
    if (entry.linkName) text(157, 100, entry.linkName);
    text(257, 6, 'ustar\0'); text(263, 2, '00');
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    text(148, 8, `${checksum.toString(8).padStart(6, '0')}\0 `);
    blocks.push(header, body);
    if (body.length % 512) blocks.push(Buffer.alloc(512 - body.length % 512));
  }
  blocks.push(Buffer.alloc(1024));
  const archive = path.join(root, name);
  await fs.writeFile(archive, gzipSync(Buffer.concat(blocks)));
  return archive;
}

async function exportedEntries(root, archive) {
  const unpacked = path.join(root, 'archive-fixture');
  await fs.mkdir(unpacked);
  await execute('tar', ['-xzf', archive, '-C', unpacked]);
  const entries = [];
  for (const name of metadataNames) entries.push({ name, body: await fs.readFile(path.join(unpacked, name)) });
  entries.push({ name: 'files/', type: '5' });
  for (const name of (await fs.readdir(path.join(unpacked, 'files'))).sort()) {
    entries.push({ name: `files/${name}`, body: await fs.readFile(path.join(unpacked, 'files', name)) });
  }
  return entries;
}

async function expectSafeRestoreFailure(root, archive, message) {
  const target = path.join(root, 'failed-restore');
  await expect(restoreBackup({ archive, dataDir: target })).rejects.toThrow(message);
  expect(await fs.stat(target).then(() => true, () => false)).toBe(false);
  expect((await fs.readdir(root)).filter((name) => name.startsWith('.kym-restore-'))).toEqual([]);
}

describe('complete archive recovery', () => {
  it('does not let a stale environment commit relabel a dirty source package', async () => {
    const { root, dataDir } = await fixture();
    const source = path.join(root, 'packed-source');
    const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    for (const relative of ['scripts/data/backup.mjs', 'server/store.mjs', 'server/storage.mjs', 'server/source-identity.mjs']) {
      await fs.mkdir(path.dirname(path.join(source, relative)), { recursive: true });
      await fs.copyFile(path.join(project, relative), path.join(source, relative));
    }
    await fs.writeFile(path.join(source, 'SOURCE_COMMIT'), '');
    await fs.writeFile(path.join(source, 'SOURCE_METADATA.json'), JSON.stringify({ workingTreeDirty: true, parentCommit: 'b'.repeat(40), sourceTreeSha256: 'c'.repeat(64) }));
    const output = path.join(root, 'dirty-source.tar.gz');
    const result = await execute(process.execPath, [path.join(source, 'scripts/data/backup.mjs'), 'export', '--data-dir', dataDir, '--output', output], { env: { ...process.env, KYM_SOURCE_COMMIT: 'a'.repeat(40) } });
    expect(JSON.parse(result.stdout)).toMatchObject({ sourceCommit: null, workingTreeDirty: true, parentCommit: 'b'.repeat(40), dataSourceCommit: null });
    expect(await verifyBackup({ archive: output, temporaryParent: root })).toMatchObject({ verified: true, sourceCommit: null, workingTreeDirty: true });
  });

  it('restores unindexed binary files and the private pending review queue', async () => {
    const { root, dataDir, file, pending } = await fixture();
    const output = path.join(root, 'archive.tar.gz');
    const report = await exportBackup({ dataDir, output });
    expect(report.blobCount).toBe(2);
    expect((await verifyBackup({ archive: output, temporaryParent: root })).verified).toBe(true);
    const restoredDir = path.join(root, 'another-server');
    await restoreBackup({ archive: output, dataDir: restoredDir });
    const restored = openStore(restoredDir);
    try {
      expect(restored.getPublishedRevision().files[0].path).toBe('unindexed/中文 文件.bin');
      expect(restored.getSubmission('pending-1').status).toBe('pending');
      expect(await fs.readFile(path.join(restoredDir, 'blobs', file.sha256))).toEqual(Buffer.from('binary\u0000fixture'));
      expect(await fs.readFile(path.join(restoredDir, 'blobs', pending.sha256), 'utf8')).toBe('pending upload');
    } finally { restored.close(); }
    await expect(restoreBackup({ archive: output, dataDir: restoredDir })).rejects.toThrow('nonexistent');
  });

  it('refuses corrupt bytes before producing an archive and releases its lock', async () => {
    const { root, dataDir, file } = await fixture();
    const blob = path.join(dataDir, 'blobs', file.sha256);
    await fs.chmod(blob, 0o600);
    await fs.writeFile(blob, 'corrupted');
    await expect(exportBackup({ dataDir, output: path.join(root, 'bad.tar.gz') })).rejects.toThrow('integrity mismatch');
    expect(await fs.stat(path.join(root, 'bad.tar.gz')).then(() => true, () => false)).toBe(false);
    expect(await fs.stat(path.join(dataDir, '.backup.lock')).then(() => true, () => false)).toBe(false);
  });

  it('rejects malformed metadata, missing entries, duplicates and altered logical state before installing data', async () => {
    const { root, dataDir } = await fixture();
    const output = path.join(root, 'valid.tar.gz');
    await exportBackup({ dataDir, output });
    const original = await exportedEntries(root, output);
    const replace = (name, body) => original.map((entry) => entry.name === name ? { ...entry, body: Buffer.from(body) } : entry);
    await expectSafeRestoreFailure(root, await writeTarArchive(root, 'malformed.tar.gz', replace('manifest.json', '{ invalid json')), /JSON|property name|Unexpected/i);
    await expectSafeRestoreFailure(root, await writeTarArchive(root, 'missing.tar.gz', original.filter((entry) => entry.name !== 'state.json')), 'Missing backup entry');
    await expectSafeRestoreFailure(root, await writeTarArchive(root, 'duplicate.tar.gz', [...original, original[0]]), 'Duplicate archive entry');
    const manifest = JSON.parse(original.find((entry) => entry.name === 'manifest.json').body);
    manifest.formatVersion = 999;
    await expectSafeRestoreFailure(root, await writeTarArchive(root, 'unknown-format.tar.gz', replace('manifest.json', JSON.stringify(manifest))), 'Unsupported backup format');
    const state = JSON.parse(original.find((entry) => entry.name === 'state.json').body);
    state.submissions[0].manifest.title = 'Changed after snapshot';
    await expectSafeRestoreFailure(root, await writeTarArchive(root, 'mismatched-state.tar.gz', replace('state.json', JSON.stringify(state))), 'Logical state does not match');
    // A live destination must remain untouched even when passed a malformed archive.
    const live = path.join(root, 'existing-live');
    await fs.mkdir(live);
    await fs.writeFile(path.join(live, 'sentinel.txt'), 'keep existing data');
    await expect(restoreBackup({ archive: path.join(root, 'malformed.tar.gz'), dataDir: live })).rejects.toThrow('nonexistent');
    expect(await fs.readFile(path.join(live, 'sentinel.txt'), 'utf8')).toBe('keep existing data');
  });

  it('rejects traversal paths, absolute names and both symlink and hardlink members before extraction', async () => {
    const { root, dataDir, file } = await fixture();
    const output = path.join(root, 'valid.tar.gz');
    await exportBackup({ dataDir, output });
    const original = await exportedEntries(root, output);
    const escaped = path.join(root, 'escaped.txt');
    await fs.writeFile(escaped, 'do not replace');
    for (const [index, name] of ['../escaped.txt', 'files/../../escaped.txt', '/absolute-outside', 'C:/absolute-outside'].entries()) {
      const archive = await writeTarArchive(root, `traversal-${index}.tar.gz`, [...original, { name, body: Buffer.from('attack') }]);
      await expectSafeRestoreFailure(root, archive, /Unsafe or unexpected archive entry|tar/i);
    }
    for (const type of ['1', '2']) {
      const entries = original.map((entry) => entry.name === `files/${file.sha256}`
        ? { name: entry.name, type, linkName: '../escaped.txt' }
        : entry);
      await expectSafeRestoreFailure(root, await writeTarArchive(root, `link-${type}.tar.gz`, entries), 'links or special files');
    }
    expect(await fs.readFile(escaped, 'utf8')).toBe('do not replace');
  });

  it('rejects corrupt blob and database members rather than partially restoring', async () => {
    const { root, dataDir, file } = await fixture();
    const output = path.join(root, 'valid.tar.gz');
    await exportBackup({ dataDir, output });
    const original = await exportedEntries(root, output);
    const mutate = (name) => original.map((entry) => {
      if (entry.name !== name) return entry;
      const body = Buffer.from(entry.body);
      body[0] ^= 0xff;
      return { ...entry, body };
    });
    await expectSafeRestoreFailure(root, await writeTarArchive(root, 'bad-blob.tar.gz', mutate(`files/${file.sha256}`)), 'File checksum mismatch');
    await expectSafeRestoreFailure(root, await writeTarArchive(root, 'bad-database.tar.gz', mutate('database.sqlite')), 'Database checksum mismatch');
    const before = openStore(dataDir);
    try { expect(before.getPublishedRevision().id).toBe('baseline'); }
    finally { before.close(); }
  });

  it('enumerates all revision and complete pending blobs while rejecting conflicting or unsafe references', () => {
    const sha256 = 'a'.repeat(64);
    const otherHash = 'b'.repeat(64);
    const state = {
      revisions: [{ files: [{ path: 'old/file.pdf', sha256, sizeBytes: 12 }, { path: 'orphan.txt', sha256, sizeBytes: 12 }] }],
      submissions: [{ status: 'uploading', files: [{ name: 'incomplete', sha256: null }, { name: 'complete', sha256: otherHash, sizeBytes: 3 }] }],
    };
    expect(referencedBlobs(state)).toEqual([{ sha256, sizeBytes: 12 }, { sha256: otherHash, sizeBytes: 3 }]);
    expect(() => referencedBlobs({ ...state, revisions: [{ files: [{ path: '../outside', sha256, sizeBytes: 12 }] }] })).toThrow('Unsafe');
    expect(() => referencedBlobs({ revisions: [{ files: [{ path: 'ok', sha256, sizeBytes: 12 }] }], submissions: [{ files: [{ sha256, sizeBytes: 13 }] }] })).toThrow('Conflicting sizes');
    expect(() => referencedBlobs({ submissions: [{ files: [{ sha256: 'invalid', sizeBytes: 0 }] }] })).toThrow('Invalid stored file');
  });

  it('snapshots one atomic online state while newer immutable uploads and publications continue', async () => {
    const { root, dataDir } = await fixture();
    const live = openStore(dataDir);
    const initial = live.getPublishedRevision();
    const initialPending = live.getSubmission('pending-1');
    const output = path.join(root, 'online.tar.gz');
    try {
      const exporting = exportBackup({ dataDir, output });
      const writer = (async () => {
        for (let generation = 1; generation <= 5; generation += 1) {
          const file = await putStreamBlob(dataDir, [Buffer.from(`complete generation ${generation}`)]);
          const id = `generation-${generation}`;
          live.db.exec('BEGIN IMMEDIATE');
          try {
            live.createRevision(initial.catalog, [...initial.files, { path: 'new/generation.txt', ...file }], { id });
            live.setPublishedRevision(id);
            live.updateSubmission(initialPending.id, { generationRevisionId: id, files: [...initialPending.files, { id: `new-${generation}`, name: 'new.txt', ...file }] });
            live.db.exec('COMMIT');
          } catch (error) { live.db.exec('ROLLBACK'); throw error; }
          await new Promise((resolve) => setImmediate(resolve));
        }
      })();
      await Promise.all([exporting, writer]);
    } finally { live.close(); }
    await verifyBackup({ archive: output, temporaryParent: root });
    const restoredDir = path.join(root, 'online-restored');
    await restoreBackup({ archive: output, dataDir: restoredDir });
    const restored = openStore(restoredDir);
    try {
      const published = restored.getPublishedRevision();
      const pending = restored.getSubmission('pending-1');
      expect(published.id).toBe(pending.generationRevisionId ?? 'baseline');
      for (const file of referencedBlobs(restored.exportState())) {
        expect((await fs.stat(path.join(restoredDir, 'blobs', file.sha256))).size).toBe(file.sizeBytes);
      }
      expect(await fs.stat(path.join(dataDir, '.backup.lock')).then(() => true, () => false)).toBe(false);
    } finally { restored.close(); }
  });
});
