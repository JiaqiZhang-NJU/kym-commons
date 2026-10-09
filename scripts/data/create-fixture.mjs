import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from '../../server/store.mjs';
import { putStreamBlob } from '../../server/storage.mjs';

export async function createFixture(dataDir) {
  dataDir = path.resolve(dataDir);
  if (await fs.stat(dataDir).then(() => true, () => false)) throw new Error('Fixture destination must be new.');
  const bytes = await putStreamBlob(dataDir, [Buffer.from('Artificial KYM test fixture. No production materials.\n')]);
  const course = (slug, title, section, trackSlug, isGeneralResources = false) => ({ slug, title, aliases: [], section, ...(trackSlug ? { trackSlug } : {}), description: '人工构造的测试课程', order: 1, isGeneralResources });
  // These labels cover navigation tests only; every course description and file
  // below is artificial and no production catalog or course materials are read.
  const trackLabels = [['math', '数学'], ['biochem', '生化'], ['cs', '计算机'], ['physics', '物理'], ['astronomy', '天文'], ['other', '其他']];
  const catalog = {
    tracks: trackLabels.map(([slug, label], index) => ({ slug, label, description: '人工测试方向', aliases: [], order: index + 1 })),
    courses: [course('calculus-i', '微积分一', 'foundation'), course('machine-learning', '机器学习', 'track', 'cs'), ...trackLabels.map(([slug]) => course('general-resources', 'General Resources', 'track', slug, true))],
    categories: [{ slug: 'reference', label: '参考资料', storageDirectory: 'materials', aliases: [], order: 1 }],
    packages: [{
      schemaVersion: 1, id: 'fixture-example', title: '人工测试资料', summary: '用于验证源码构建和测试的虚构资料。',
      placement: { section: 'foundation', courseSlug: 'calculus-i' }, categorySlug: 'reference', materialType: '参考资料',
      term: { label: '测试学期', sortKey: null }, tags: ['测试'], aliases: [],
      assets: [{ id: 'asset-1', label: '测试文件', role: 'primary', href: '/files/fixture/example.txt', fileName: 'example.txt', mediaType: 'text/plain', ...bytes }],
      source: { kind: 'repository' }, publishedAt: null, updatedAt: null, legacyIds: ['fixture-old-example'],
    }],
  };
  const store = openStore(dataDir);
  try {
    const revision = store.createRevision(catalog, [{ path: 'fixture/example.txt', ...bytes }], { id: 'fixture-1', sourceCommit: null });
    store.setPublishedRevision(revision.id);
    return { dataDir, revisionId: revision.id };
  } finally { store.close(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] !== '--data-dir' || !process.argv[3]) throw new Error('Usage: create-fixture.mjs --data-dir NEW_DIRECTORY');
    console.log(JSON.stringify(await createFixture(process.argv[3])));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
