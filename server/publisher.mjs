import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { finished } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { materializeFileView, validateRevisionCatalog } from './storage.mjs';
import { resolveSourceIdentity } from './source-identity.mjs';

export function readSourceCommit(sourceDir) {
  try {
    const value = fs.readFileSync(path.join(sourceDir, 'SOURCE_COMMIT'), 'utf8').trim();
    if (!value) return undefined;
    if (value.length > 200 || /[\x00-\x1f]/.test(value)) throw new Error('SOURCE_COMMIT file is invalid.');
    return value;
  } catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
}

async function writeJsonAtomic(target, value) {
  const temporary = `${target}.partial-${randomUUID()}`;
  await fsp.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  const file = await fsp.open(temporary, 'r+');
  try { await file.sync(); } finally { await file.close(); }
  await fsp.rename(temporary, target);
  await syncDirectory(path.dirname(target));
}

async function syncDirectory(directory) {
  if (process.platform === 'win32') return;
  const handle = await fsp.open(directory, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

function processAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

export async function acquirePublishLock(dataDir) {
  const target = path.join(dataDir, 'publish.lock');
  await fsp.mkdir(dataDir, { recursive: true });
  const key = randomUUID();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const file = await fsp.open(target, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify({ pid: process.pid, key })); await file.sync(); } finally { await file.close(); }
      return async () => {
        try { if (JSON.parse(await fsp.readFile(target, 'utf8')).key === key) await fsp.unlink(target); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let owner;
      for (let readAttempt = 0; readAttempt < 3; readAttempt += 1) {
        try { owner = JSON.parse(await fsp.readFile(target, 'utf8')); break; }
        catch (failure) { if (failure.code === 'ENOENT') break; if (readAttempt < 2) await delay(20); }
      }
      if (!owner) {
        if (!fs.existsSync(target)) continue;
        const failure = new Error('Publication lock is unreadable; inspect publish.lock before restarting.');
        failure.code = 'KYM_PUBLISH_LOCK_CORRUPT';
        throw failure;
      }
      if (processAlive(owner.pid)) {
        const failure = new Error('Another publication worker is running; this worker will retry shortly.');
        failure.code = 'KYM_PUBLISH_BUSY';
        throw failure;
      }
      await fsp.unlink(target).catch((failure) => { if (failure.code !== 'ENOENT') throw failure; });
    }
  }
  throw new Error('Could not acquire publication lock.');
}

export async function atomicActivate(releaseDir, currentLink) {
  await fsp.mkdir(path.dirname(currentLink), { recursive: true });
  try {
    const current = await fsp.lstat(currentLink);
    if (!current.isSymbolicLink()) throw new Error('Current release must be a symbolic link; refusing to replace a directory.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temporary = `${currentLink}.next-${randomUUID()}`;
  let switched = false;
  try {
    await fsp.symlink(path.resolve(releaseDir), temporary, process.platform === 'win32' ? 'junction' : 'dir');
    await fsp.rename(temporary, currentLink);
    switched = true;
    if (await fsp.realpath(currentLink) !== await fsp.realpath(releaseDir)) throw new Error('Active release readback does not match the verified release.');
    await syncDirectory(path.dirname(currentLink));
  } catch (error) { if (switched) error.activated = true; throw error; }
  finally { await fsp.unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
}

export async function buildWithNpm({ sourceDir, releaseDir, revision, dataDir, siteUrl, baseUrl = '/', sourceCommit, buildTimeoutMs = 15 * 60 * 1000 }) {
  const logPath = path.join(releaseDir, 'build.log');
  const output = fs.createWriteStream(logPath, { flags: 'wx', mode: 0o600 });
  const npmCli = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')].find((candidate) => candidate && fs.existsSync(candidate));
  const useCli = Boolean(npmCli);
  const command = useCli ? process.execPath : 'npm';
  const args = [...(useCli ? [npmCli] : []), 'run', 'build', '--', '--out-dir', path.join(releaseDir, 'site')];
  let tail = '';
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: sourceDir, env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}`, KYM_DATA_DIR: dataDir, KYM_BUILD_REVISION: revision.id, KYM_BUILD_OUTPUT: releaseDir, KYM_SITE_URL: siteUrl, KYM_BASE_URL: baseUrl, KYM_SOURCE_COMMIT: sourceCommit ?? '' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
      let loggedBytes = 0;
      let logError;
      const capture = (chunk) => { if (loggedBytes < 32 * 1024 * 1024 && !logError) { output.write(chunk); loggedBytes += chunk.length; } tail = `${tail}${chunk.toString()}`.slice(-16000); };
      child.stdout.on('data', capture);
      child.stderr.on('data', capture);
      const killGroup = (signal) => { try { if (process.platform === 'win32') child.kill(signal); else if (child.pid) process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') reject(error); } };
      let forceTimeout;
      const stopChild = () => { killGroup('SIGTERM'); forceTimeout = setTimeout(() => killGroup('SIGKILL'), 5000); forceTimeout.unref(); };
      output.on('error', (error) => { logError = error; stopChild(); });
      const timeout = setTimeout(stopChild, buildTimeoutMs);
      timeout.unref();
      child.on('error', (error) => { clearTimeout(timeout); clearTimeout(forceTimeout); reject(error); });
      child.on('close', (code, signal) => {
        clearTimeout(timeout);
        clearTimeout(forceTimeout);
        if (logError) reject(logError); else if (code === 0) resolve(); else reject(new Error(`Static-site build failed (${signal ?? code}). ${tail}`));
      });
    });
  } finally { output.end(); await finished(output).catch(() => {}); }
}

/** A release is constructed completely before the public directory changes. */
export async function publishRevision({ store, revisionId, releasesDir, currentLink = path.join(path.dirname(releasesDir), 'current'), sourceDir = process.cwd(), sourceCommit = process.env.KYM_SOURCE_COMMIT, siteUrl = 'http://localhost', baseUrl = '/', build = buildWithNpm, activate = atomicActivate } = {}) {
  const identity = await resolveSourceIdentity(sourceDir, { sourceCommit });
  sourceCommit = identity.sourceCommit;
  const revision = store.getRevision(revisionId);
  if (!revision) throw new Error('Publication revision does not exist.');
  validateRevisionCatalog(revision.catalog, revision.files);
  await fsp.mkdir(releasesDir, { recursive: true });
  const releaseId = `${Date.now()}-${randomUUID()}`;
  const releaseDir = path.join(releasesDir, releaseId);
  await fsp.mkdir(releaseDir);
  const journalPath = path.join(store.dataDir, 'publication-journal.json');
  const manifest = { formatVersion: 1, releaseId, revisionId, ...identity, dataSourceCommit: revision.sourceCommit ?? null, createdAt: new Date().toISOString(), fileCount: revision.files.length, state: 'building' };
  await writeJsonAtomic(path.join(releaseDir, 'release.json'), manifest);
  let activated = false;
  try {
    // The prebuild hook can place the same immutable file view in releaseDir.
    await build({ sourceDir, releaseDir, revision, dataDir: store.dataDir, siteUrl, baseUrl, sourceCommit });
    const index = await fsp.stat(path.join(releaseDir, 'site', 'index.html'));
    if (!index.isFile() || index.size === 0) throw new Error('Static-site build did not produce index.html.');
    if (!fs.existsSync(path.join(releaseDir, 'files'))) await materializeFileView(store.dataDir, revision.files, path.join(releaseDir, 'files'));
    else {
      // Validate every view path before activation even when the build made it.
      for (const file of revision.files) {
        const info = await fsp.lstat(path.join(releaseDir, 'files', ...file.path.split('/')));
        if (!info.isFile() || info.isSymbolicLink() || info.size !== file.sizeBytes) throw new Error(`Release file view is incomplete: ${file.path}`);
      }
    }
    manifest.state = 'ready';
    await writeJsonAtomic(path.join(releaseDir, 'release.json'), manifest);
    await writeJsonAtomic(journalPath, { ...manifest, releaseDir, currentLink, state: 'activating' });
    await activate(releaseDir, currentLink);
    activated = true;
    // If the process stops here, recoverPublication completes this DB change.
    commitPublication(store, revision, releaseId);
    manifest.state = 'published';
    manifest.publishedAt = new Date().toISOString();
    await writeJsonAtomic(path.join(releaseDir, 'release.json'), manifest);
    await writeJsonAtomic(journalPath, { ...manifest, releaseDir, currentLink });
    return manifest;
  } catch (error) {
    // Errors before activation leave current unchanged. Errors after activation
    // are recovered from the durable journal, never mislabeled as a build failure.
    await writeJsonAtomic(path.join(releaseDir, 'failure.json'), { failedAt: new Date().toISOString(), error: error.message.slice(0, 16000) }).catch(() => {});
    if (activated || error.activated) {
      if (store.getPublishedRevision()?.id === revisionId) return { ...manifest, state: 'published' };
      error.activated = true;
    }
    throw error;
  }
}

function markIncludedPublished(store, revision, releaseId) {
  const included = new Set(revision.catalog.packages.map((material) => material.source?.submissionId).filter(Boolean));
  const ownsTransaction = !store.db.isTransaction;
  if (ownsTransaction) store.db.exec('BEGIN IMMEDIATE');
  try {
    for (const record of store.listSubmissions()) {
      if (included.has(record.id) && ['approved', 'publishing', 'publication-failed', 'published'].includes(record.status)) store.updateSubmission(record.id, { status: 'published', releaseId, publishedAt: record.publishedAt ?? new Date().toISOString(), publishError: null, updatedAt: new Date().toISOString() });
    }
    if (ownsTransaction) store.db.exec('COMMIT');
  } catch (error) { if (ownsTransaction) store.db.exec('ROLLBACK'); throw error; }
}

function commitPublication(store, revision, releaseId) {
  store.db.exec('BEGIN IMMEDIATE');
  try {
    store.setPublishedRevision(revision.id);
    markIncludedPublished(store, revision, releaseId);
    store.db.exec('COMMIT');
  } catch (error) { store.db.exec('ROLLBACK'); throw error; }
}

export async function recoverPublication({ store, currentLink } = {}) {
  const journalPath = path.join(store.dataDir, 'publication-journal.json');
  let journal;
  try { journal = JSON.parse(await fsp.readFile(journalPath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return; throw new Error('Publication journal is unreadable.'); }
  if (journal.state !== 'activating') return;
  let actual;
  try { actual = await fsp.realpath(currentLink ?? journal.currentLink); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let expected;
  try { expected = await fsp.realpath(journal.releaseDir); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (actual && actual === expected) {
    const revision = store.getRevision(journal.revisionId);
    if (!revision) throw new Error('Active publication journal refers to a missing revision.');
    const manifest = JSON.parse(await fsp.readFile(path.join(expected, 'release.json'), 'utf8'));
    if (manifest.revisionId !== revision.id || manifest.releaseId !== journal.releaseId || !['ready', 'published'].includes(manifest.state)) throw new Error('Active release manifest does not match its publication journal.');
    const index = await fsp.stat(path.join(expected, 'site', 'index.html'));
    if (!index.isFile() || index.size === 0) throw new Error('Interrupted publication has no complete static site.');
    for (const file of revision.files) {
      const info = await fsp.lstat(path.join(expected, 'files', ...file.path.split('/')));
      if (!info.isFile() || info.isSymbolicLink() || info.size !== file.sizeBytes) throw new Error('Interrupted publication has an incomplete file view.');
    }
    commitPublication(store, revision, journal.releaseId);
    await writeJsonAtomic(journalPath, { ...journal, state: 'published', publishedAt: new Date().toISOString() });
  }
}

export function createPublisher(options) {
  const { store } = options;
  let running = false;
  let stopped = false;
  let active = null;
  let lastError = null;
  let retryTimer = null;
  async function drain() {
    if (running || stopped) return active;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    running = true;
    active = (async () => {
      let releaseLock;
      let canReschedule = true;
      let retryBusy = false;
      try {
        releaseLock = await acquirePublishLock(store.dataDir);
        await recoverPublication(options);
        lastError = null;
        for (const record of store.listSubmissions({ status: 'publishing' })) store.updateSubmission(record.id, { status: 'approved', updatedAt: new Date().toISOString() });
        while (!stopped) {
          const next = store.listSubmissions({ status: 'approved' }).sort((a, b) => (a.approvalSequence ?? 0) - (b.approvalSequence ?? 0))[0];
          if (!next) break;
          const published = store.getPublishedRevision();
          if (published?.catalog.packages.some((material) => material.source?.submissionId === next.id)) { markIncludedPublished(store, published, next.releaseId ?? 'recovered'); continue; }
          store.updateSubmission(next.id, { status: 'publishing', updatedAt: new Date().toISOString() });
          try { await publishRevision({ ...options, revisionId: next.revisionId }); lastError = null; }
          catch (error) {
            lastError = error.message.slice(0, 16000);
            if (error.activated) {
              // Keep the job recoverable and stop before replacing its journal.
              try { await recoverPublication(options); }
              catch { canReschedule = false; break; }
              if (store.getSubmission(next.id).status === 'published') continue;
              canReschedule = false;
              break;
            }
            store.updateSubmission(next.id, { status: 'publication-failed', publishError: lastError, updatedAt: new Date().toISOString() });
          }
        }
      } catch (error) { canReschedule = false; retryBusy = error.code === 'KYM_PUBLISH_BUSY'; lastError = error.message.slice(0, 16000); }
      finally {
        if (releaseLock) await releaseLock().catch((error) => { canReschedule = false; lastError = error.message.slice(0, 16000); });
        running = false;
        active = null;
        if (retryBusy && !stopped) {
          retryTimer = setTimeout(() => { retryTimer = null; void drain(); }, options.lockRetryMs ?? 2000);
          retryTimer.unref();
        }
        // An approval may arrive while the lock is being released.
        if (releaseLock && canReschedule && !stopped && store.listSubmissions({ status: 'approved' }).length) queueMicrotask(() => { void drain(); });
      }
    })();
    return active;
  }
  return { start: drain, kick: drain, status: () => ({ running, lastError, retryScheduled: Boolean(retryTimer) }), wait: async () => { if (active) await active; }, stop: async () => { stopped = true; if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } if (active) await active; } };
}
