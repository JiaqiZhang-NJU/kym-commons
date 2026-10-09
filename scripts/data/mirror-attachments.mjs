import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from '../../server/store.mjs';
import { putStreamBlob, safeRelativePath } from '../../server/storage.mjs';

export async function mirrorAttachments(dataDir) {
  const store = openStore(dataDir);
  try {
    const baseline = store.getPublishedRevision();
    if (!baseline) throw new Error('No published revision.');
    const catalog = structuredClone(baseline.catalog);
    const files = [...baseline.files];
    let mirrored = 0;
    for (const material of catalog.packages) for (const asset of material.assets) {
      if (!/^https:\/\/github\.com\/user-attachments\/(files|assets)\//.test(asset.href)) continue;
      const originalUrl = asset.href;
      const response = await fetch(originalUrl, { signal: AbortSignal.timeout(120000) });
      if (!response.ok || !response.body) throw new Error(`Cannot preserve GitHub attachment: HTTP ${response.status}`);
      const blob = await putStreamBlob(dataDir, response.body, { maxBytes: 512 * 1024 * 1024 });
      const name = (asset.fileName ?? decodeURIComponent(new URL(originalUrl).pathname.split('/').at(-1))).replace(/[\\/:\u0000-\u001f]/g, '_');
      const relative = safeRelativePath(`imports/github/${blob.sha256}/${name || 'attachment'}`);
      if (!files.some((file) => file.path === relative)) files.push({ path: relative, ...blob });
      Object.assign(asset, { href: `/files/${relative.split('/').map(encodeURIComponent).join('/')}`, originalUrl, fileName: name, mediaType: asset.mediaType ?? response.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream', ...blob });
      mirrored++;
    }
    if (!mirrored) return { mirrored: 0, revisionId: baseline.id };
    const revision = store.createRevision(catalog, files, { sourceCommit: baseline.sourceCommit });
    store.setPublishedRevision(revision.id);
    return { mirrored, revisionId: revision.id, files: files.length };
  } finally { store.close(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] !== '--data-dir' || !process.argv[3]) throw new Error('Usage: mirror-attachments.mjs --data-dir DIRECTORY');
    console.log(JSON.stringify(await mirrorAttachments(process.argv[3])));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
