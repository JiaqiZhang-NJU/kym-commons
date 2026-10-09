import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from '../../server/store.mjs';
import { acquirePublishLock, recoverPublication, publishRevision } from '../../server/publisher.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const flags = {
  '--data-dir': 'dataDir', '--releases-dir': 'releasesDir', '--current-link': 'currentLink',
  '--site-url': 'siteUrl', '--source-dir': 'sourceDir', '--revision': 'revisionId',
  '--base-url': 'baseUrl', '--source-commit': 'sourceCommit',
};

export function parseReleaseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const key = flags[flag];
    if (!key || !argv[index + 1] || argv[index + 1].startsWith('--') || options[key] !== undefined) throw new Error(`Invalid release argument: ${flag}`);
    options[key] = argv[++index];
  }
  return options;
}

/** Build and activate an existing durable revision without administrator credentials. */
export async function release(options = {}) {
  const dataDir = path.resolve(options.dataDir ?? process.env.KYM_DATA_DIR ?? '');
  const releasesSetting = options.releasesDir ?? process.env.KYM_RELEASES_DIR;
  const siteSetting = options.siteUrl ?? process.env.KYM_SITE_URL;
  if ((!options.dataDir && !process.env.KYM_DATA_DIR) || !releasesSetting || !siteSetting) throw new Error('--data-dir, --releases-dir and --site-url (or matching KYM environment variables) are required.');
  const site = new URL(siteSetting);
  if (!['http:', 'https:'].includes(site.protocol) || site.username || site.password) throw new Error('Site URL must be HTTP or HTTPS without login credentials.');
  const baseUrl = options.baseUrl ?? process.env.KYM_BASE_URL ?? '/';
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(baseUrl)) throw new Error('Base URL must be a slash-delimited path.');
  if (!fs.existsSync(path.join(dataDir, 'catalog.sqlite'))) throw new Error('Catalog database does not exist; import or restore the database before publishing.');
  const releasesDir = path.resolve(releasesSetting);
  const currentLink = path.resolve(options.currentLink ?? process.env.KYM_CURRENT_LINK ?? path.join(path.dirname(releasesDir), 'current'));
  const sourceDir = path.resolve(options.sourceDir ?? process.env.KYM_SOURCE_DIR ?? sourceRoot);
  const store = openStore(dataDir);
  let unlock;
  try {
    unlock = await acquirePublishLock(dataDir);
    await recoverPublication({ store, currentLink });
    const revisionId = options.revisionId ?? process.env.KYM_BUILD_REVISION ?? store.getPublishedRevision()?.id;
    if (!revisionId) throw new Error('No published revision exists; specify --revision for the first release.');
    return await publishRevision({ store, revisionId, releasesDir, currentLink, sourceDir, siteUrl: site.origin, baseUrl, sourceCommit: options.sourceCommit ?? process.env.KYM_SOURCE_COMMIT });
  } finally {
    try { if (unlock) await unlock(); } finally { store.close(); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await release(parseReleaseArguments(process.argv.slice(2))))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
