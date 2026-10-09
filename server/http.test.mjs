import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { openStore } from './store.mjs';
import { createAuth, createPasswordHash, loadPasswordVerifier } from './auth.mjs';
import { createApplication, configFromEnv } from './http.mjs';
import { createSubmissions } from './submissions.mjs';
import { acquirePublishLock, atomicActivate, createPublisher, publishRevision, recoverPublication } from './publisher.mjs';
import { materializeFileView } from './storage.mjs';

const roots = [];
const stores = new Set();
const applications = [];

afterEach(async () => {
  for (const application of applications.splice(0)) await application.close();
  for (const store of stores) store.close();
  stores.clear();
  for (const root of roots.splice(0)) {
    const resolved = path.resolve(root);
    if (!resolved.startsWith(`${path.resolve(os.tmpdir())}${path.sep}kym-api-test-`)) throw new Error('Unexpected test cleanup target.');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

function catalogFixture() {
  return {
    tracks: [{ slug: 'cs', label: '计算机', description: '方向', aliases: ['CS'], order: 1 }],
    courses: [{ slug: 'algorithms', title: '算法', aliases: [], section: 'track', trackSlug: 'cs', description: '课程', order: 1, isGeneralResources: false }, { slug: 'general-resources', title: 'General Resources', aliases: [], section: 'track', trackSlug: 'cs', description: '通用', order: 2, isGeneralResources: true }],
    categories: [{ slug: 'reference', label: '参考资料', storageDirectory: 'materials', aliases: [], order: 1 }],
    packages: [{ schemaVersion: 1, id: 'inherited', title: '现有资料', summary: '原有说明', placement: { section: 'track', trackSlug: 'cs', courseSlug: 'algorithms' }, categorySlug: 'reference', materialType: '参考', term: { label: '未知', sortKey: null }, tags: ['legacy'], aliases: [], assets: [{ id: 'asset-1', label: '原有链接', role: 'primary', href: 'https://example.com/legacy', fileName: null, mediaType: null, sizeBytes: null, sha256: null }], source: { kind: 'external' }, publishedAt: null, updatedAt: null, legacyIds: ['old-id'], futureField: { preserve: true } }],
  };
}

function manifest(extra = {}) {
  return { version: 3, scope: 'track-course', track: { mode: 'existing', slug: 'cs', label: '计算机' }, course: { mode: 'existing', slug: 'algorithms', title: '算法' }, title: '课程笔记', term: '2026 秋', materialType: '课程笔记', summary: '完整整理', sourceMode: 'upload', externalLink: null, anonymous: true, ...extra };
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kym-api-test-'));
  roots.push(root);
  const dataDir = path.join(root, 'data');
  const store = openStore(dataDir);
  stores.add(store);
  const baseline = store.createRevision(catalogFixture(), [], { id: 'baseline', sourceCommit: 'fixture-source' });
  store.setPublishedRevision(baseline.id);
  return { root, dataDir, store, baseline, releasesDir: path.join(root, 'releases'), currentLink: path.join(root, 'current') };
}

const pausedPublisher = () => ({ start: async () => {}, kick: async () => {}, stop: async () => {}, status: () => ({ running: false, lastError: null }) });

async function runningApi(context, baseUrl = '/') {
  const auth = createAuth({ verifyPassword: (password) => password === 'fixture-password', secure: false, cookiePath: baseUrl });
  const application = createApplication({ ...context, siteUrl: 'http://127.0.0.1', baseUrl, port: 0, host: '127.0.0.1' }, { store: context.store, auth, publisher: pausedPublisher() });
  const address = await application.start();
  applications.push(application);
  const origin = `http://127.0.0.1:${address.port}`;
  return { application, url: `${origin}${baseUrl}api`, request: async (route, options = {}) => {
    const response = await fetch(`${origin}${baseUrl}api${route}`, options);
    const body = response.headers.get('content-type')?.startsWith('application/json') ? await response.json() : await response.text();
    return { response, body };
  } };
}

const jsonOptions = (body, headers = {}) => ({ method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

async function login(api) {
  const result = await api.request('/admin/login', jsonOptions({ password: 'fixture-password' }, { Origin: 'http://127.0.0.1' }));
  expect(result.response.status).toBe(200);
  expect(result.response.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Strict');
  expect(result.response.headers.get('set-cookie')).not.toContain('; Secure');
  return { Cookie: result.response.headers.get('set-cookie').split(';')[0], 'X-KYM-CSRF': result.body.csrfToken };
}

async function uploaded(submissions, extra = {}) {
  const draft = submissions.create({ manifest: manifest(extra), files: [{ name: '笔记.pdf', size: 4, type: 'application/pdf' }], idempotencyKey: randomUUID() });
  await submissions.upload(draft.id, draft.files[0].id, draft.uploadToken, Readable.from([Buffer.from('test')]), 4);
  submissions.complete(draft.id, draft.uploadToken);
  return draft;
}

async function fakeBuild({ releaseDir }) {
  await fsp.mkdir(path.join(releaseDir, 'site'), { recursive: true });
  await fsp.writeFile(path.join(releaseDir, 'site', 'index.html'), '<html>fixture site</html>');
}

describe('native submission API', () => {
  it('keeps pending attachments private and requires login and CSRF for approval', async () => {
    const context = fixture();
    const api = await runningApi(context, '/portal/');
    const created = await api.request('/submissions', jsonOptions({ manifest: manifest(), files: [{ name: '笔记.pdf', size: 4, type: 'application/pdf' }], idempotencyKey: randomUUID() }));
    expect(created.response.status).toBe(201);
    const draft = created.body;
    expect(draft).not.toHaveProperty('uploadTokenHash');
    expect((await api.request('/admin/submissions')).response.status).toBe(401);
    expect((await api.request(`/admin/submissions/${draft.id}/files/${draft.files[0].id}`)).response.status).toBe(401);
    expect((await api.request(`/submissions/${draft.id}/files/${draft.files[0].id}`)).response.status).toBe(404);
    expect((await api.request(`/submissions/${draft.id}/complete`, jsonOptions({}, { Authorization: `Bearer ${draft.uploadToken}` }))).response.status).toBe(409);
    expect((await api.request(`/submissions/${draft.id}/files/${draft.files[0].id}`, { method: 'PUT', headers: { Authorization: 'Bearer invalid' }, body: 'test' })).response.status).toBe(401);
    const upload = await api.request(`/submissions/${draft.id}/files/${draft.files[0].id}`, { method: 'PUT', headers: { Authorization: `Bearer ${draft.uploadToken}`, 'Content-Type': 'application/pdf' }, body: 'test' });
    expect(upload.response.status).toBe(200);
    expect(upload.body).toMatchObject({ size: 4, sizeBytes: 4 });
    const complete = await api.request(`/submissions/${draft.id}/complete`, jsonOptions({}, { Authorization: `Bearer ${draft.uploadToken}` }));
    expect(complete.body.status).toBe('pending');
    const session = await login(api);
    const privateFile = await api.request(`/admin/submissions/${draft.id}/files/${draft.files[0].id}`, { headers: session });
    expect(privateFile.body).toBe('test');
    expect(privateFile.response.headers.get('content-disposition')).toContain('attachment;');
    expect((await api.request(`/admin/submissions/${draft.id}/approve`, jsonOptions({}, { Cookie: session.Cookie }))).response.status).toBe(403);
    expect((await api.request(`/admin/submissions/${draft.id}/approve`, jsonOptions({}, { ...session, Origin: 'https://attacker.invalid' }))).response.status).toBe(403);
    const approved = await api.request(`/admin/submissions/${draft.id}/approve`, jsonOptions({}, session));
    expect(approved.body.status).toBe('approved');
    expect(context.store.getPublishedRevision().id).toBe('baseline');
    expect(context.store.getRevision(approved.body.revisionId).catalog.packages[0]).toEqual(context.baseline.catalog.packages[0]);
    expect(context.store.getRevision(approved.body.revisionId).catalog.packages[1].source).toMatchObject({ kind: 'website-submission', anonymous: true });
    await api.request(`/admin/submissions/${draft.id}/approve`, jsonOptions({}, session));
    expect(context.store.listRevisions()).toHaveLength(2);
  });

  it('rejects cross-site login and invalid limits, filenames and HTTP external links', async () => {
    const context = fixture();
    const api = await runningApi(context);
    expect((await api.request('/admin/login', jsonOptions({ password: 'fixture-password' }, { Origin: 'https://attacker.invalid' }))).response.status).toBe(403);
    expect((await api.request('/admin/login', jsonOptions({ password: 'wrong-password' }, { 'X-KYM-CSRF': '1' }))).response.status).toBe(401);
    const submissions = createSubmissions({ store: context.store, maxFileBytes: 4 });
    expect(() => submissions.create({ manifest: manifest(), files: [{ name: '../notes', size: 1 }], idempotencyKey: randomUUID() })).toThrow('文件名');
    expect(() => submissions.create({ manifest: manifest(), files: [{ name: 'notes:secret', size: 1 }], idempotencyKey: randomUUID() })).toThrow('文件名');
    expect(() => submissions.create({ manifest: manifest(), files: [{ name: 'notes.pdf', size: 5 }], idempotencyKey: randomUUID() })).toThrow('大小');
    expect(() => submissions.create({ manifest: manifest({ sourceMode: 'external-link', externalLink: 'http://example.com' }), files: [], idempotencyKey: randomUUID() })).toThrow('HTTPS');
  });

  it('persists resumable uploads and deduplicates creation and completion after restart', async () => {
    const context = fixture();
    let submissions = createSubmissions({ store: context.store });
    const payload = { manifest: manifest(), files: [{ name: 'notes.txt', size: 4, type: 'text/plain' }], idempotencyKey: randomUUID() };
    const draft = submissions.create(payload);
    await expect(submissions.upload(draft.id, draft.files[0].id, draft.uploadToken, Readable.from(['bad']), 4)).rejects.toThrow('未完整');
    expect(context.store.getSubmission(draft.id).files[0].sha256).toBeUndefined();
    expect(fs.readdirSync(path.join(context.dataDir, 'blobs'))).toHaveLength(0);
    await submissions.upload(draft.id, draft.files[0].id, draft.uploadToken, Readable.from(['test']), 4);
    context.store.close(); stores.delete(context.store);
    const restarted = openStore(context.dataDir); stores.add(restarted);
    submissions = createSubmissions({ store: restarted });
    const replay = submissions.create(payload);
    expect(replay.id).toBe(draft.id);
    expect(replay.uploadToken).toBe(draft.uploadToken);
    expect(replay.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    await expect(submissions.upload(draft.id, draft.files[0].id, draft.uploadToken, Readable.from(['evil']), 4)).rejects.toThrow('内容不同');
    expect(fs.readdirSync(path.join(context.dataDir, 'blobs'))).toHaveLength(1);
    expect(submissions.complete(draft.id, draft.uploadToken).status).toBe('pending');
    expect(submissions.complete(draft.id, draft.uploadToken).status).toBe('pending');
    expect(restarted.listSubmissions()).toHaveLength(1);
    expect(() => submissions.create({ ...payload, manifest: manifest({ title: 'changed' }) })).toThrow('不同投稿');
  });

  it('creates new track, general resources, course and material together without changing inherited data', async () => {
    const context = fixture();
    const submissions = createSubmissions({ store: context.store });
    const draft = await uploaded(submissions, { track: { mode: 'new', slug: 'biology', label: '生物' }, course: { mode: 'new', slug: 'genetics', title: '遗传学' } });
    const approved = submissions.approve(draft.id);
    const revision = context.store.getRevision(approved.revisionId);
    expect(revision.catalog.tracks.at(-1).slug).toBe('biology');
    expect(revision.catalog.courses.slice(-2).map((course) => course.slug)).toEqual(['general-resources', 'genetics']);
    expect(revision.catalog.packages[0]).toEqual(context.baseline.catalog.packages[0]);
    expect(revision.files[0].path).toContain('笔记.pdf');
    const second = await uploaded(submissions);
    const another = submissions.approve(second.id);
    expect(context.store.getRevision(another.revisionId).catalog.packages).toHaveLength(3);
    expect(context.store.getPublishedRevision().id).toBe('baseline');
  });
});

describe('publication workflow', () => {
  it('automatically resumes approved work after a release CLI relinquishes the lock', async () => {
    const context = fixture();
    const submissions = createSubmissions({ store: context.store });
    const draft = await uploaded(submissions);
    submissions.approve(draft.id);
    const unlock = await acquirePublishLock(context.dataDir);
    const publisher = createPublisher({ ...context, build: fakeBuild, activate: async () => {}, lockRetryMs: 20 });
    await publisher.kick();
    expect(publisher.status().retryScheduled).toBe(true);
    expect(context.store.getSubmission(draft.id).status).toBe('approved');
    await unlock();
    for (let attempt = 0; attempt < 100 && context.store.getSubmission(draft.id).status !== 'published'; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 20));
    expect(context.store.getSubmission(draft.id).status).toBe('published');
    await publisher.stop();
    expect(publisher.status().retryScheduled).toBe(false);
  });

  it('does not schedule retries after stop or when the lock file is corrupt', async () => {
    const context = fixture();
    const unlock = await acquirePublishLock(context.dataDir);
    const publisher = createPublisher({ ...context, build: fakeBuild, activate: async () => {}, lockRetryMs: 20 });
    await publisher.kick();
    await publisher.stop();
    await unlock();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(publisher.status().retryScheduled).toBe(false);
    await fsp.writeFile(path.join(context.dataDir, 'publish.lock'), 'corrupt lock');
    const corrupt = createPublisher({ ...context, build: fakeBuild, activate: async () => {}, lockRetryMs: 20 });
    await corrupt.kick();
    expect(corrupt.status().retryScheduled).toBe(false);
    expect(corrupt.status().lastError).toContain('unreadable');
    await corrupt.stop();
  });

  it('keeps approval separate from publication, retains the old release on failure and retries without duplication', async () => {
    const context = fixture();
    const submissions = createSubmissions({ store: context.store });
    const draft = await uploaded(submissions);
    const approved = submissions.approve(draft.id);
    let fail = true;
    const activations = [];
    const publisher = createPublisher({ ...context, build: async (input) => { if (fail) throw new Error('deliberate fixture build failure'); await fakeBuild(input); }, activate: async (releaseDir) => { activations.push(releaseDir); } });
    await publisher.kick();
    expect(context.store.getSubmission(draft.id).status).toBe('publication-failed');
    expect(context.store.getPublishedRevision().id).toBe('baseline');
    expect(activations).toHaveLength(0);
    expect(context.store.getSubmission(draft.id).revisionId).toBe(approved.revisionId);
    fail = false;
    submissions.retry(draft.id);
    await publisher.kick();
    expect(context.store.getSubmission(draft.id).status, context.store.getSubmission(draft.id).publishError).toBe('published');
    expect(context.store.getPublishedRevision().id).toBe(approved.revisionId);
    expect(context.store.listRevisions()).toHaveLength(2);
    expect(activations).toHaveLength(1);
    expect(fs.readFileSync(path.join(activations[0], 'files', ...context.store.getPublishedRevision().files[0].path.split('/')), 'utf8')).toBe('test');
    submissions.retry(draft.id);
    await publisher.kick();
    expect(activations).toHaveLength(1);
  });

  it('publishes a newer revision with all earlier approved content and never regresses on old retry', async () => {
    const context = fixture();
    const submissions = createSubmissions({ store: context.store });
    const one = await uploaded(submissions);
    const first = submissions.approve(one.id);
    const two = await uploaded(submissions);
    const second = submissions.approve(two.id);
    context.store.updateSubmission(one.id, { status: 'publication-failed' });
    const publisher = createPublisher({ ...context, build: fakeBuild, activate: async () => {} });
    await publisher.kick();
    expect(context.store.getPublishedRevision().id, context.store.getSubmission(two.id).publishError).toBe(second.revisionId);
    expect(context.store.getSubmission(one.id).status).toBe('published');
    expect(context.store.getSubmission(two.id).status).toBe('published');
    expect(context.store.getPublishedRevision().catalog.packages).toHaveLength(3);
    submissions.retry(one.id);
    await publisher.kick();
    expect(context.store.getPublishedRevision().id).not.toBe(first.revisionId);
  });

  it('recovers a process interruption after current switched but before the database committed', async () => {
    const context = fixture();
    const submissions = createSubmissions({ store: context.store });
    const draft = await uploaded(submissions);
    const approved = submissions.approve(draft.id);
    context.store.updateSubmission(draft.id, { status: 'publishing' });
    const releaseDir = path.join(context.releasesDir, 'interrupted-release');
    await fsp.mkdir(releaseDir, { recursive: true });
    await fakeBuild({ releaseDir });
    await materializeFileView(context.dataDir, context.store.getRevision(approved.revisionId).files, path.join(releaseDir, 'files'));
    await fsp.writeFile(path.join(releaseDir, 'release.json'), JSON.stringify({ state: 'ready', releaseId: 'interrupted-release', revisionId: approved.revisionId }));
    await atomicActivate(releaseDir, context.currentLink);
    await fsp.writeFile(path.join(context.dataDir, 'publication-journal.json'), JSON.stringify({ state: 'activating', releaseId: 'interrupted-release', releaseDir, currentLink: context.currentLink, revisionId: approved.revisionId }));
    context.store.close(); stores.delete(context.store);
    const restarted = openStore(context.dataDir); stores.add(restarted);
    await recoverPublication({ store: restarted, currentLink: context.currentLink });
    expect(restarted.getPublishedRevision().id).toBe(approved.revisionId);
    expect(restarted.getSubmission(draft.id)).toMatchObject({ status: 'published', releaseId: 'interrupted-release' });
    expect(JSON.parse(fs.readFileSync(path.join(context.dataDir, 'publication-journal.json'), 'utf8')).state).toBe('published');
  });

  it('repairs a database commit error after activation without reporting the release as failed', async () => {
    const context = fixture();
    const submissions = createSubmissions({ store: context.store });
    const draft = await uploaded(submissions);
    const approved = submissions.approve(draft.id);
    const setPublished = context.store.setPublishedRevision;
    let failOnce = true;
    context.store.setPublishedRevision = (id) => {
      if (failOnce) { failOnce = false; throw new Error('simulated commit interruption'); }
      setPublished(id);
    };
    const publisher = createPublisher({ ...context, build: fakeBuild });
    await publisher.kick();
    expect(context.store.getPublishedRevision().id).toBe(approved.revisionId);
    expect(context.store.getSubmission(draft.id)).toMatchObject({ status: 'published', publishError: null });
    expect(JSON.parse(fs.readFileSync(path.join(context.dataDir, 'publication-journal.json'), 'utf8')).state).toBe('published');
    await publisher.stop();
  });

  it('refuses to publish an empty build before touching current', async () => {
    const context = fixture();
    let activated = false;
    await expect(publishRevision({ ...context, revisionId: 'baseline', build: async () => {}, activate: async () => { activated = true; } })).rejects.toThrow();
    expect(activated).toBe(false);
    expect(context.store.getPublishedRevision().id).toBe('baseline');
  });

  it('records dirty source separately and never substitutes the historical data commit', async () => {
    const context = fixture();
    fs.writeFileSync(path.join(context.root, 'SOURCE_COMMIT'), '');
    fs.writeFileSync(path.join(context.root, 'SOURCE_METADATA.json'), JSON.stringify({ workingTreeDirty: true, parentCommit: 'source-parent', sourceTreeSha256: 'a'.repeat(64) }));
    let buildCommit;
    const result = await publishRevision({ ...context, revisionId: 'baseline', sourceDir: context.root, sourceCommit: 'incorrect-clean-label', build: async (input) => { buildCommit = input.sourceCommit; await fakeBuild(input); }, activate: async () => {} });
    expect(result).toMatchObject({ sourceCommit: null, dataSourceCommit: 'fixture-source', workingTreeDirty: true, sourceTreeSha256: 'a'.repeat(64), parentCommit: 'source-parent' });
    expect(buildCommit).toBeNull();
  });
});

describe('administrator password file', () => {
  it('allows an HTTP staging login while requiring Secure cookies for HTTPS deployment', () => {
    const environment = { KYM_DATA_DIR: '/fixture/data', KYM_RELEASES_DIR: '/fixture/releases', KYM_SITE_URL: 'http://kym-staging.test', KYM_BASE_URL: '/portal/' };
    expect(configFromEnv(environment).secureCookies).toBe(false);
    expect(configFromEnv({ ...environment, KYM_SITE_URL: 'https://kym.test' }).secureCookies).toBe(true);
    const secure = createAuth({ verifyPassword: () => true, secure: true });
    expect(secure.login('fixture').cookie).toContain('; Secure');
  });

  it('uses deployment SOURCE_COMMIT when no explicit version environment variable exists', () => {
    const context = fixture();
    const environment = { KYM_DATA_DIR: context.dataDir, KYM_RELEASES_DIR: context.releasesDir, KYM_SITE_URL: 'https://kym.test', KYM_SOURCE_DIR: context.root };
    expect(configFromEnv(environment).sourceCommit).toBeUndefined();
    fs.writeFileSync(path.join(context.root, 'SOURCE_COMMIT'), 'fixture-commit\n');
    expect(configFromEnv(environment).sourceCommit).toBe('fixture-commit');
    expect(configFromEnv({ ...environment, KYM_SOURCE_COMMIT: 'explicit-commit' }).sourceCommit).toBe('explicit-commit');
  });

  it('accepts private salted scrypt hashes without saving the original password', () => {
    const context = fixture();
    const file = path.join(context.root, 'admin.password');
    const password = 'long-fixture-password';
    const encoded = createPasswordHash(password);
    fs.writeFileSync(file, encoded, { mode: 0o600 });
    expect(encoded).not.toContain(password);
    const verify = loadPasswordVerifier(file);
    expect(verify(password)).toBe(true);
    expect(verify('wrong')).toBe(false);
    expect(createPasswordHash(password)).not.toBe(encoded);
  });
});
