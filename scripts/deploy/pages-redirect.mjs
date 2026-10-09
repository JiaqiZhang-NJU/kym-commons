import fs from 'node:fs/promises';
import path from 'node:path';
import { isMainModule } from '../../server/cli.mjs';

/** Use pathname assignment so a suffix beginning with // cannot change hosts. */
export function redirectDestination(location, options = {}) {
  const sourcePrefix = options.sourcePrefix ?? '/kym-commons/';
  const destination = new URL(options.targetUrl ?? 'https://jqzhang.top/kymcommon/');
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)+$/.test(sourcePrefix)) throw new Error('Invalid old Pages prefix.');
  if (destination.protocol !== 'https:' || destination.username || destination.password || destination.search || destination.hash || !destination.pathname.endsWith('/')) {
    throw new Error('Destination must be an HTTPS directory URL without credentials, query or hash.');
  }
  const pathname = location.pathname;
  const sourceRoot = sourcePrefix.slice(0, -1);
  if (typeof pathname !== 'string' || (pathname !== sourceRoot && !pathname.startsWith(sourcePrefix))) {
    throw new Error('The requested path is outside the old Pages site.');
  }
  const suffix = pathname === sourceRoot ? '' : pathname.slice(sourcePrefix.length);
  const targetPrefix = destination.pathname;
  destination.pathname = `${targetPrefix}${suffix}`;
  if (!destination.pathname.startsWith(targetPrefix)) throw new Error('The requested path escapes the new site prefix.');
  destination.search = location.search ?? '';
  destination.hash = location.hash ?? '';
  return destination.href;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function renderRedirectHtml(options = {}) {
  const config = { sourcePrefix: options.sourcePrefix ?? '/kym-commons/', targetUrl: options.targetUrl ?? 'https://jqzhang.top/kymcommon/' };
  const fallback = redirectDestination({ pathname: config.sourcePrefix, search: '', hash: '' }, config);
  const serialized = JSON.stringify(config).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <title>KYM Commons 已迁移</title>
  <style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.7}a{color:#2257a4}</style>
</head>
<body>
  <h1>资料站已迁移</h1>
  <p id="status">正在保留原链接前往新地址。未自动跳转时，请点击下方链接。</p>
  <p><a id="destination" href="${escapeHtml(fallback)}">前往 KYM Commons</a></p>
  <noscript><p>浏览器未启用 JavaScript，请使用上方链接进入新站。</p></noscript>
  <script>
${redirectDestination.toString()}
try {
  const destination = redirectDestination(window.location, ${serialized});
  document.getElementById('destination').href = destination;
  window.location.replace(destination);
} catch {
  document.getElementById('status').textContent = '此旧链接无法识别，请通过下方链接进入新站。';
}
  </script>
</body>
</html>
`;
}

/** A new output directory guarantees the Pages artifact cannot retain business files. */
export async function generatePagesRedirect({ outputDir, sourcePrefix, targetUrl } = {}) {
  if (!outputDir) throw new Error('--output-dir is required.');
  const output = path.resolve(outputDir);
  const html = renderRedirectHtml({ sourcePrefix, targetUrl });
  await fs.mkdir(output); // Refuse an existing output directory instead of mixing artifacts.
  await fs.writeFile(path.join(output, 'index.html'), html);
  await fs.writeFile(path.join(output, '404.html'), html);
  await fs.writeFile(path.join(output, '.nojekyll'), '');
  return { outputDir: output, files: ['index.html', '404.html', '.nojekyll'], bytes: Buffer.byteLength(html) * 2 };
}

function argumentsOf(argv) {
  const result = {};
  const names = { '--output-dir': 'outputDir', '--source-prefix': 'sourcePrefix', '--target-url': 'targetUrl' };
  for (let index = 0; index < argv.length; index += 2) {
    const name = names[argv[index]];
    if (!name || !argv[index + 1] || argv[index + 1].startsWith('--') || result[name] !== undefined) throw new Error(`Invalid redirect argument: ${argv[index]}`);
    result[name] = argv[index + 1];
  }
  return result;
}

if (isMainModule(import.meta.url)) {
  try { console.log(JSON.stringify(await generatePagesRedirect(argumentsOf(process.argv.slice(2))))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
