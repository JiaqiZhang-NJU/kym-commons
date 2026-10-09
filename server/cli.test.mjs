import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const helper = pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.mjs')).href;

describe('CLI entrypoint through a source symlink', () => {
  it('runs a real entrypoint and the same entrypoint through a directory symlink', () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'kym-cli-test-'));
    try {
      const source = path.join(workspace, 'source-real');
      const link = path.join(workspace, 'source');
      fs.mkdirSync(source);
      fs.writeFileSync(path.join(source, 'entry.mjs'), `import { isMainModule } from ${JSON.stringify(helper)}; console.log(isMainModule(import.meta.url));\n`);
      fs.symlinkSync(source, link, process.platform === 'win32' ? 'junction' : 'dir');
      for (const entry of [path.join(source, 'entry.mjs'), path.join(link, 'entry.mjs')]) {
        const result = spawnSync(process.execPath, [entry], { encoding: 'utf8' });
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout.trim()).toBe('true');
      }
      fs.writeFileSync(path.join(source, 'importer.mjs'), "import './entry.mjs';\n");
      const imported = spawnSync(process.execPath, [path.join(link, 'importer.mjs')], { encoding: 'utf8' });
      expect(imported.status, imported.stderr).toBe(0);
      expect(imported.stdout.trim()).toBe('false');
    } finally {
      const cleanupTarget = fs.realpathSync(workspace);
      const cleanupRoot = fs.realpathSync(os.tmpdir());
      if (path.dirname(cleanupTarget) !== cleanupRoot || !path.basename(cleanupTarget).startsWith('kym-cli-test-')) throw new Error('CLI test cleanup escaped its temporary workspace');
      fs.rmSync(cleanupTarget, { recursive: true, force: true });
    }
  });

  it('ignores missing argv and missing entrypoint files', () => {
    for (const prefix of ['', `process.argv[1] = ${JSON.stringify(path.join(os.tmpdir(), 'kym-nonexistent-cli-entry.mjs'))};`]) {
      const code = `import { isMainModule } from ${JSON.stringify(helper)}; ${prefix} console.log(isMainModule(${JSON.stringify(helper)}));`;
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.trim()).toBe('false');
    }
  });
});
