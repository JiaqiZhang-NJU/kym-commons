import fs from 'node:fs/promises';
import { isMainModule } from '../../server/cli.mjs';
import { openStore } from '../../server/store.mjs';
import { verifyBlob } from '../../server/storage.mjs';

export async function verifyBaseline({ dataDir, catalogFile, inventoryFile, revisionId }) {
  const read = async (name) => JSON.parse((await fs.readFile(name, 'utf8')).replace(/^\uFEFF/, ''));
  const expectedCatalog = await read(catalogFile);
  const inventory = await read(inventoryFile);
  const store = openStore(dataDir);
  let revision;
  try { revision = revisionId ? store.getRevision(revisionId) : store.getPublishedRevision(); }
  finally { store.close(); }
  if (!revision || JSON.stringify(revision.catalog) !== JSON.stringify(expectedCatalog)) throw new Error('Catalog fields or array order differ from baseline.');
  const byPath = new Map(revision.files.map((file) => [file.path, file]));
  if (byPath.size !== inventory.length) throw new Error('Baseline file count differs.');
  const checked = new Set();
  for (const expected of inventory) {
    const actual = byPath.get(expected.path);
    if (!actual || actual.sizeBytes !== expected.sizeBytes || actual.sha256 !== expected.sha256) throw new Error(`Baseline file differs: ${expected.path}`);
    if (!checked.has(actual.sha256)) { await verifyBlob(dataDir, actual); checked.add(actual.sha256); }
  }
  return { verified: true, revisionId: revision.id, tracks: revision.catalog.tracks.length, courses: revision.catalog.courses.length, categories: revision.catalog.categories.length, packages: revision.catalog.packages.length, files: inventory.length, uniqueBlobs: checked.size, bytes: inventory.reduce((sum, file) => sum + file.sizeBytes, 0) };
}
if (isMainModule(import.meta.url)) {
  try {
    const args = process.argv.slice(2); const values = {};
    for (let i = 0; i < args.length; i += 2) values[args[i].replace(/^--/, '')] = args[i + 1];
    console.log(JSON.stringify(await verifyBaseline({ dataDir: values['data-dir'], catalogFile: values.catalog, inventoryFile: values.inventory, revisionId: values.revision }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
