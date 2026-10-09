import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveSourceIdentity } from './source-identity.mjs';

const execute = promisify(execFile);
const temporary = [];
async function directory() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kym-source-test-'));
  temporary.push(root);
  return root;
}
afterEach(async () => {
  for (const root of temporary.splice(0)) {
    if (path.dirname(root) !== os.tmpdir() || !path.basename(root).startsWith('kym-source-test-')) throw new Error('Unsafe test cleanup path.');
    await fs.rm(root, { recursive: true, force: true });
  }
});

describe('recoverable source provenance', () => {
  it('packages a recoverable commit despite deployment markers and keeps dirty trial code explicitly unversioned', async () => {
    const root = await directory();
    const repository = path.join(root, 'repository');
    await fs.mkdir(path.join(repository, 'scripts/deploy'), { recursive: true });
    const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    await fs.copyFile(path.join(project, 'scripts/deploy/pack-source.mjs'), path.join(repository, 'scripts/deploy/pack-source.mjs'));
    await fs.writeFile(path.join(repository, 'code.mjs'), 'export const value = 1;\n');
    await fs.mkdir(path.join(repository, 'content'));
    await fs.writeFile(path.join(repository, 'content/fixture.json'), '{"fixture":true}');
    await execute('git', ['init', repository]);
    await execute('git', ['add', '.'], { cwd: repository });
    await execute('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Fixture source'], { cwd: repository });
    const commit = (await execute('git', ['rev-parse', 'HEAD'], { cwd: repository })).stdout.trim();
    await fs.writeFile(path.join(repository, 'SOURCE_COMMIT'), `${commit}\n`);
    await fs.writeFile(path.join(repository, 'SOURCE_METADATA.json'), '{"oldDeploymentMarker":true}');
    const pack = async (name) => {
      const destination = path.join(root, name);
      const result = await execute(process.execPath, [path.join(repository, 'scripts/deploy/pack-source.mjs'), '--directory', destination, '--archive', `${destination}.tar.gz`]);
      return { destination, report: JSON.parse(result.stdout) };
    };
    const clean = await pack('clean');
    expect(clean.report).toMatchObject({ sourceCommit: commit, workingTreeDirty: false });
    expect(await resolveSourceIdentity(clean.destination)).toMatchObject({ sourceCommit: commit, workingTreeDirty: false });
    expect(await fs.stat(path.join(clean.destination, 'content')).then(() => true, () => false)).toBe(false);
    await fs.writeFile(path.join(repository, 'code.mjs'), 'export const value = 2;\n');
    const dirty = await pack('dirty');
    expect(dirty.report).toMatchObject({ sourceCommit: null, workingTreeDirty: true });
    expect(await resolveSourceIdentity(dirty.destination, { sourceCommit: commit })).toMatchObject({ sourceCommit: null, workingTreeDirty: true });
    expect(await fs.readFile(path.join(dirty.destination, 'code.mjs'), 'utf8')).toContain('value = 2');
  });

  it('uses the real clean Git snapshot, rejects a stale label, and marks edits or unknown source as unrecoverable', async () => {
    const root = await directory();
    await execute('git', ['init', root]);
    await fs.writeFile(path.join(root, 'code.mjs'), 'export const value = 1;\n');
    await fs.writeFile(path.join(root, '.gitignore'), 'node_modules/\nsrc/generated/catalog.json\n');
    await execute('git', ['add', '.'], { cwd: root });
    await execute('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Fixture source'], { cwd: root });
    const commit = (await execute('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    await fs.writeFile(path.join(root, 'SOURCE_COMMIT'), `${commit}\n`);
    await fs.mkdir(path.join(root, 'src/generated'), { recursive: true });
    await fs.writeFile(path.join(root, 'src/generated/catalog.json'), '{}');
    expect(await resolveSourceIdentity(root, { sourceCommit: commit })).toMatchObject({ sourceCommit: commit, workingTreeDirty: false });
    await expect(resolveSourceIdentity(root, { sourceCommit: 'f'.repeat(40) })).rejects.toThrow('does not match');
    await fs.writeFile(path.join(root, 'code.mjs'), 'export const value = 2;\n');
    expect(await resolveSourceIdentity(root, { sourceCommit: commit })).toMatchObject({ sourceCommit: null, parentCommit: commit, workingTreeDirty: true });
    const unknown = await directory();
    await fs.writeFile(path.join(unknown, 'SOURCE_COMMIT'), `${commit}\n`);
    expect(await resolveSourceIdentity(unknown, { sourceCommit: commit })).toEqual({ sourceCommit: null });
  });

  it('verifies unpacked source through a linked deployment root and never relabels a modified or unsafe package', async () => {
    const root = await directory();
    const source = path.join(root, 'source');
    await fs.mkdir(source);
    const content = 'export const value = "packaged";\n';
    const files = [{ path: 'code.mjs', sha256: createHash('sha256').update(content).digest('hex') }];
    const commit = 'a'.repeat(40);
    const metadata = { sourceCommit: commit, parentCommit: commit, workingTreeDirty: false, sourceTreeSha256: createHash('sha256').update(JSON.stringify(files)).digest('hex'), files };
    await fs.writeFile(path.join(source, 'code.mjs'), content);
    await fs.writeFile(path.join(source, 'SOURCE_COMMIT'), `${commit}\n`);
    const writeMetadata = () => fs.writeFile(path.join(source, 'SOURCE_METADATA.json'), JSON.stringify(metadata));
    await writeMetadata();
    const linked = path.join(root, 'current-source');
    await fs.symlink(source, linked, process.platform === 'win32' ? 'junction' : 'dir');
    await fs.mkdir(path.join(source, 'node_modules'), { recursive: true });
    await fs.writeFile(path.join(source, 'node_modules/runtime.js'), '// generated dependency');
    expect(await resolveSourceIdentity(linked, { sourceCommit: commit })).toMatchObject({ sourceCommit: commit, workingTreeDirty: false });
    await expect(resolveSourceIdentity(linked, { sourceCommit: 'b'.repeat(40) })).rejects.toThrow('does not match');
    await fs.writeFile(path.join(source, 'code.mjs'), '// changed after unpacking');
    expect(await resolveSourceIdentity(linked, { sourceCommit: commit })).toMatchObject({ sourceCommit: null, workingTreeDirty: true });
    await fs.writeFile(path.join(source, 'code.mjs'), content);
    await fs.writeFile(path.join(source, 'extra.mjs'), '// unlisted build source');
    expect(await resolveSourceIdentity(linked, { sourceCommit: commit })).toMatchObject({ sourceCommit: null, workingTreeDirty: true });
    await fs.rm(path.join(source, 'extra.mjs'));
    metadata.files = [files[0], files[0]];
    await writeMetadata();
    await expect(resolveSourceIdentity(linked)).rejects.toThrow('inventory');
    metadata.files = [{ ...files[0], path: '../outside' }];
    await writeMetadata();
    await expect(resolveSourceIdentity(linked)).rejects.toThrow('Unsafe');
    const outside = path.join(root, 'outside-directory');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'code.mjs'), content);
    await fs.symlink(outside, path.join(source, 'escaped'), process.platform === 'win32' ? 'junction' : 'dir');
    metadata.files = [{ ...files[0], path: 'escaped/code.mjs' }];
    metadata.sourceTreeSha256 = createHash('sha256').update(JSON.stringify(metadata.files)).digest('hex');
    await writeMetadata();
    await expect(resolveSourceIdentity(linked)).rejects.toThrow('escapes');
    metadata.workingTreeDirty = true;
    metadata.files = files;
    await writeMetadata();
    expect(await resolveSourceIdentity(linked, { sourceCommit: 'old-baseline' })).toMatchObject({ sourceCommit: null, workingTreeDirty: true });
  });
});
