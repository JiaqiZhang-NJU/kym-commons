import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { expect, it } from 'vitest';
import { generatePagesRedirect, redirectDestination } from './pages-redirect.mjs';

it('generates only universal redirect pages and preserves old paths, queries and hashes in both pages', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'kym-pages-redirect-'));
  try {
    const output = path.join(temporary, 'pages');
    await generatePagesRedirect({ outputDir: output });
    expect((await fs.readdir(output)).sort()).toEqual(['.nojekyll', '404.html', 'index.html']);
    const cases = [
      [{ pathname: '/kym-commons/', search: '', hash: '' }, 'https://kymcommons.jqzhang.top/'],
      [{ pathname: '/kym-commons', search: '?q=a+b', hash: '#start' }, 'https://kymcommons.jqzhang.top/?q=a+b#start'],
      [{ pathname: '/kym-commons/tracks/cs/algorithms/', search: '?sort=title&page=2', hash: '#finals' }, 'https://kymcommons.jqzhang.top/tracks/cs/algorithms/?sort=title&page=2#finals'],
      [{ pathname: '/kym-commons/materials', search: '?section=track&track=cs&course=algorithms', hash: '#answer' }, 'https://kymcommons.jqzhang.top/materials?section=track&track=cs&course=algorithms#answer'],
      [{ pathname: '/kym-commons/materials/legacy-id/', search: '', hash: '#asset-2' }, 'https://kymcommons.jqzhang.top/materials/legacy-id/#asset-2'],
      [{ pathname: '/kym-commons/files/%E4%B8%AD%E6%96%87%20file%23name.pdf', search: '?download=1', hash: '#page=3' }, 'https://kymcommons.jqzhang.top/files/%E4%B8%AD%E6%96%87%20file%23name.pdf?download=1#page=3'],
      [{ pathname: '/kym-commons//example.com/file', search: '?next=https%3A%2F%2Fexample.com', hash: '#x' }, 'https://kymcommons.jqzhang.top//example.com/file?next=https%3A%2F%2Fexample.com#x'],
    ];
    for (const file of ['index.html', '404.html']) {
      const html = await fs.readFile(path.join(output, file), 'utf8');
      const script = /<script>\s*([\s\S]*?)\s*<\/script>/.exec(html)?.[1];
      expect(script).toBeTruthy();
      for (const [location, expected] of cases) {
        const destinations = [];
        const link = { href: '' };
        vm.runInNewContext(script, { URL, window: { location: { ...location, replace: (value) => destinations.push(value) } }, document: { getElementById: () => link } });
        expect(destinations).toEqual([expected]);
        expect(link.href).toBe(expected);
      }
    }
    expect(() => redirectDestination({ pathname: '/kym-commons-other/page' })).toThrow('outside');
    expect(() => redirectDestination({ pathname: '/kym-commons/%2e%2e/outside' }, { targetUrl: 'https://kymcommons.jqzhang.top/portal/' })).toThrow('escapes');
    await expect(generatePagesRedirect({ outputDir: output })).rejects.toThrow();
  } finally {
    if (path.dirname(path.resolve(temporary)) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('kym-pages-redirect-')) throw new Error('Unexpected redirect-test cleanup path.');
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
