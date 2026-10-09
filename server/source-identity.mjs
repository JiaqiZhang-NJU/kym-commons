import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { hashFile, safeRelativePath } from './storage.mjs';

const execute = promisify(execFile);
const commitPattern = /^[a-f0-9]{40}$/;
const hashPattern = /^[a-f0-9]{64}$/;

async function optionalText(file) {
  try { return (await fs.readFile(file, 'utf8')).trim(); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function requireMatchingCommits(actual, candidates) {
  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== '' && (!commitPattern.test(value) || value !== actual)) {
      throw new Error('Declared source commit does not match the actual source.');
    }
  }
}

function generatedEntry(relative) {
  const top = relative.split('/')[0];
  return ['SOURCE_COMMIT', 'SOURCE_METADATA.json', 'SERVER_MIGRATION_PLAN.md', '.DS_Store'].includes(relative) ||
    ['node_modules', '.git', '.docusaurus', '.cache-loader', 'build', 'content', '.local-data', '.local-backups', '.local-runtime', '.local-releases', '.migration-work', '.trae'].includes(top) ||
    relative === 'src/generated/catalog.json' || relative.startsWith('static/files/') ||
    (top.startsWith('.env') && top !== '.env.example') || /^(?:npm-debug|yarn-debug|yarn-error)\.log/.test(top);
}

async function hasUnlistedSource(root, expected, relative = '') {
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const next = relative ? `${relative}/${entry.name}` : entry.name;
    if (generatedEntry(next)) continue;
    if (entry.isDirectory()) {
      if (await hasUnlistedSource(root, expected, next)) return true;
    } else if (!entry.isFile() || !expected.has(next)) return true;
  }
  return false;
}

/** Resolve code provenance without ever substituting a data revision's commit. */
export async function resolveSourceIdentity(sourceDir, { sourceCommit } = {}) {
  const root = await fs.realpath(sourceDir);
  const metadataFile = path.join(root, 'SOURCE_METADATA.json');
  let metadata;
  try {
    if ((await fs.stat(metadataFile)).size > 2 * 1024 * 1024) throw new Error('Source metadata is too large.');
    metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
    if (typeof metadata.workingTreeDirty !== 'boolean' || !hashPattern.test(metadata.sourceTreeSha256 ?? '')) throw new Error('Source metadata is invalid.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }

  if (metadata) {
    const expected = new Set();
    if (metadata.files !== undefined && !Array.isArray(metadata.files)) throw new Error('Source file inventory is invalid.');
    for (const file of metadata.files ?? []) {
      safeRelativePath(file.path);
      if (!hashPattern.test(file.sha256 ?? '') || expected.has(file.path) || generatedEntry(file.path)) throw new Error('Source file inventory is invalid.');
      expected.add(file.path);
    }
    const base = { parentCommit: metadata.parentCommit ?? null, workingTreeDirty: metadata.workingTreeDirty, sourceTreeSha256: metadata.sourceTreeSha256 };
    // Dirty packages are useful for trial deployments, but cannot identify a
    // recoverable GitHub source version, even if an old environment value exists.
    if (metadata.workingTreeDirty) return { ...base, sourceCommit: null };
    if (!commitPattern.test(metadata.sourceCommit ?? '') || !expected.size) throw new Error('Clean source metadata has no verified source version.');
    requireMatchingCommits(metadata.sourceCommit, [metadata.parentCommit, sourceCommit, await optionalText(path.join(root, 'SOURCE_COMMIT'))]);
    let changed = false;
    for (const file of metadata.files) {
      const target = path.join(root, ...file.path.split('/'));
      let resolved;
      try { resolved = await fs.realpath(target); }
      catch (error) { if (error.code === 'ENOENT') { changed = true; continue; } throw error; }
      if (!resolved.startsWith(`${root}${path.sep}`) || !(await fs.lstat(target)).isFile()) throw new Error('Source file inventory escapes the source directory.');
      const measured = await hashFile(resolved);
      if (measured.sha256 !== file.sha256) changed = true;
    }
    const snapshotHash = createHash('sha256').update(JSON.stringify(metadata.files)).digest('hex');
    if (snapshotHash !== metadata.sourceTreeSha256) throw new Error('Source file inventory checksum does not match metadata.');
    changed ||= await hasUnlistedSource(root, expected);
    return { ...base, sourceCommit: changed ? null : metadata.sourceCommit, workingTreeDirty: changed, ...(changed ? { sourceTreeSha256: null, packagedSourceTreeSha256: metadata.sourceTreeSha256 } : {}) };
  }

  let parentCommit;
  let status;
  let afterCommit;
  try {
    const repository = (await execute('git', ['rev-parse', '--show-toplevel'], { cwd: root })).stdout.trim();
    if (await fs.realpath(repository) !== root) return { sourceCommit: null };
    parentCommit = (await execute('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    // These generated provenance files do not change the committed code.
    status = (await execute('git', ['status', '--porcelain', '--', '.', ':(exclude)SOURCE_COMMIT', ':(exclude)SOURCE_METADATA.json'], { cwd: root })).stdout.trim();
    afterCommit = (await execute('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
  } catch { return { sourceCommit: null }; }
  if (status || parentCommit !== afterCommit) return { sourceCommit: null, parentCommit, workingTreeDirty: true };
  requireMatchingCommits(parentCommit, [sourceCommit, await optionalText(path.join(root, 'SOURCE_COMMIT'))]);
  return { sourceCommit: parentCommit, parentCommit, workingTreeDirty: false };
}
