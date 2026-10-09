import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';

const execute = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const excluded = ['content/', 'static/files/', 'src/generated/catalog.json', 'SERVER_MIGRATION_PLAN.md', 'SOURCE_COMMIT', 'SOURCE_METADATA.json'];
const legacyFiles = new Set(['scripts/batch2.json', 'scripts/batch3.json', 'scripts/remaining_batch.json', 'scripts/generated_materials.json']);

export async function packSource(destination, archive) {
  destination = path.resolve(destination);
  if (await fs.stat(destination).then(() => true, () => false)) throw new Error('Source destination must be new.');
  if (archive && await fs.stat(path.resolve(archive)).then(() => true, () => false)) throw new Error('Source archive already exists.');
  const parentCommit = (await execute('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
  const statusArguments = ['status', '--porcelain', '--', '.', ':(exclude)SOURCE_COMMIT', ':(exclude)SOURCE_METADATA.json'];
  const statusBefore = (await execute('git', statusArguments, { cwd: root })).stdout.trim();
  const result = await execute('git', statusBefore ? ['ls-files', '-z', '--cached', '--others', '--exclude-standard'] : ['ls-tree', '-r', '-z', '--name-only', parentCommit], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const files = [...new Set(result.stdout.split('\0').filter(Boolean))].filter((file) => !excluded.some((prefix) => file === prefix || file.startsWith(prefix)) && !legacyFiles.has(file)).sort();
  await fs.mkdir(destination, { recursive: true });
  if (!statusBefore) {
    // Archive the immutable commit, so edits or commits during packaging cannot
    // cause copied working-tree bytes to be mislabeled as a GitHub revision.
    const snapshot = path.join(destination, `.source-${randomUUID()}.tar`);
    try {
      await execute('git', ['archive', '--format=tar', `--output=${snapshot}`, parentCommit, '--', ...files], { cwd: root });
      await execute('tar', ['-xf', snapshot, '-C', destination]);
    } finally { await fs.rm(snapshot, { force: true }); }
  }
  const checksums = [];
  for (const file of files) {
    const origin = path.join(statusBefore ? root : destination, file);
    const stat = await fs.lstat(origin).catch(() => null);
    if (!stat) continue; // Deleted tracked files are absent from the source package.
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unsupported source entry: ${file}`);
    const target = path.join(destination, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (statusBefore) await fs.copyFile(origin, target);
    checksums.push({ path: file, sha256: createHash('sha256').update(await fs.readFile(target)).digest('hex') });
  }
  const status = (await execute('git', statusArguments, { cwd: root })).stdout.trim();
  const workingTreeDirty = Boolean(statusBefore);
  const commit = workingTreeDirty ? null : parentCommit;
  const sourceTreeSha256 = createHash('sha256').update(JSON.stringify(checksums)).digest('hex');
  await fs.writeFile(path.join(destination, 'SOURCE_COMMIT'), commit ? `${commit}\n` : '');
  await fs.writeFile(path.join(destination, 'SOURCE_METADATA.json'), `${JSON.stringify({ sourceCommit: commit, parentCommit, workingTreeDirty, workingTreeChangedWhilePackaging: statusBefore !== status, sourceTreeSha256, files: checksums }, null, 2)}\n`);
  if (archive) {
    const output = path.resolve(archive);
    const temporary = `${output}.${randomUUID()}.partial`;
    try {
      await execute('tar', ['-czf', temporary, '-C', destination, '.'], { maxBuffer: 1024 * 1024 });
      await fs.link(temporary, output);
    } finally { await fs.rm(temporary, { force: true }); }
  }
  return { destination, archive, sourceCommit: commit, workingTreeDirty, sourceTreeSha256, sourceFiles: checksums.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] !== '--directory' || !process.argv[3] || process.argv[4] !== '--archive' || !process.argv[5]) throw new Error('Use pack-source.mjs --directory NEW_DIR --archive FILE.');
    console.log(JSON.stringify(await packSource(process.argv[3], process.argv[5])));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
