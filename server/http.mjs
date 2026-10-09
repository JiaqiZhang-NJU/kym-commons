import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { openStore } from './store.mjs';
import { blobPath } from './storage.mjs';
import { createAuth } from './auth.mjs';
import { createSubmissions, publicSubmission, RequestError } from './submissions.mjs';
import { createPublisher, readSourceCommit } from './publisher.mjs';

function positiveNumber(input, fallback, label) {
  const value = input === undefined ? fallback : Number(input);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${label}.`);
  return value;
}

export function configFromEnv(env = process.env) {
  if (!env.KYM_DATA_DIR || !env.KYM_RELEASES_DIR || !env.KYM_SITE_URL) throw new Error('KYM_DATA_DIR, KYM_RELEASES_DIR and KYM_SITE_URL are required.');
  const site = new URL(env.KYM_SITE_URL);
  if (!['http:', 'https:'].includes(site.protocol) || site.username || site.password) throw new Error('Invalid KYM_SITE_URL.');
  const baseUrl = env.KYM_BASE_URL ?? '/';
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(baseUrl)) throw new Error('KYM_BASE_URL must be a slash-delimited path.');
  const sourceDir = path.resolve(env.KYM_SOURCE_DIR ?? process.cwd());
  return {
    dataDir: path.resolve(env.KYM_DATA_DIR), releasesDir: path.resolve(env.KYM_RELEASES_DIR), currentLink: env.KYM_CURRENT_LINK ? path.resolve(env.KYM_CURRENT_LINK) : path.join(path.dirname(path.resolve(env.KYM_RELEASES_DIR)), 'current'), sourceDir, sourceCommit: env.KYM_SOURCE_COMMIT ?? readSourceCommit(sourceDir), passwordFile: env.KYM_ADMIN_PASSWORD_FILE,
    siteUrl: site.origin, baseUrl, host: env.KYM_HOST ?? '127.0.0.1', port: positiveNumber(env.KYM_PORT, 8766, 'KYM_PORT'), secureCookies: site.protocol === 'https:', trustProxy: env.KYM_TRUST_PROXY === '1',
    maxFileBytes: positiveNumber(env.KYM_MAX_FILE_BYTES, 128 * 1024 * 1024, 'KYM_MAX_FILE_BYTES'), maxSubmissionBytes: positiveNumber(env.KYM_MAX_SUBMISSION_BYTES, 512 * 1024 * 1024, 'KYM_MAX_SUBMISSION_BYTES'), maxFiles: positiveNumber(env.KYM_MAX_FILES, 32, 'KYM_MAX_FILES'),
  };
}

async function readJson(request, maxBytes = 256 * 1024) {
  if (!(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) throw new RequestError(415, '请求必须使用 JSON。');
  let length = 0;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBytes) throw new RequestError(413, '请求内容过大。');
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Expected object');
    return parsed;
  } catch { throw new RequestError(400, 'JSON 请求无效。'); }
}

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}

export function createApplication(config, dependencies = {}) {
  const ownsStore = !dependencies.store;
  const store = dependencies.store ?? openStore(config.dataDir);
  const auth = dependencies.auth ?? createAuth({ passwordFile: config.passwordFile, secure: config.secureCookies, cookiePath: config.baseUrl ?? '/' });
  const submissions = createSubmissions({ store, ...config });
  const publisher = dependencies.publisher ?? createPublisher({ store, ...config });
  const rateWindows = new Map();
  const apiPrefix = `${config.baseUrl ?? '/'}api`;
  function rateLimit(request, label, limit, windowMs) {
    const ip = config.trustProxy ? request.headers['x-real-ip'] ?? request.socket.remoteAddress : request.socket.remoteAddress;
    const key = `${label}:${ip}`;
    const now = Date.now();
    if (rateWindows.size > 10000) for (const [entry, value] of rateWindows) if (value.until <= now) rateWindows.delete(entry);
    const window = rateWindows.get(key);
    if (!window || window.until <= now) { rateWindows.set(key, { count: 1, until: now + windowMs }); return; }
    if (++window.count > limit) throw new RequestError(429, '请求过于频繁，请稍后重试。');
  }
  function requireAdmin(request, mutation = false) {
    const session = auth.getSession(request);
    if (!session) throw new RequestError(401, '请先登录管理后台。');
    if (mutation && !auth.acceptsMutation(request, session, config.siteUrl)) throw new RequestError(403, '审核请求来源无效，请刷新页面后重试。');
    return session;
  }
  async function handle(request, response) {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    try {
      const url = new URL(request.url, config.siteUrl);
      if (url.pathname !== apiPrefix && !url.pathname.startsWith(`${apiPrefix}/`)) throw new RequestError(404, '接口不存在。');
      const route = url.pathname.slice(apiPrefix.length);
      const method = request.method;
      if (method === 'GET' && route === '/health') return json(response, 200, { ok: true, publishedRevision: store.getPublishedRevision()?.id ?? null });
      if (method === 'GET' && route === '/config') return json(response, 200, { maxFileBytes: config.maxFileBytes ?? 128 * 1024 * 1024, maxSubmissionBytes: config.maxSubmissionBytes ?? 512 * 1024 * 1024, maxFiles: config.maxFiles ?? 32 });
      if (method === 'POST' && route === '/submissions') {
        rateLimit(request, 'draft', 20, 60 * 60 * 1000);
        const result = submissions.create(await readJson(request));
        return json(response, 201, result);
      }
      const upload = /^\/submissions\/([a-f0-9-]{36})\/files\/([a-f0-9-]{36})$/.exec(route);
      if (method === 'PUT' && upload) {
        rateLimit(request, 'upload', 256, 60 * 60 * 1000);
        const token = /^Bearer ([A-Za-z0-9_-]+)$/i.exec(request.headers.authorization ?? '')?.[1];
        return json(response, 200, await submissions.upload(upload[1], upload[2], token, request, request.headers['content-length']));
      }
      const complete = /^\/submissions\/([a-f0-9-]{36})\/complete$/.exec(route);
      if (method === 'POST' && complete) {
        const token = /^Bearer ([A-Za-z0-9_-]+)$/i.exec(request.headers.authorization ?? '')?.[1];
        return json(response, 200, submissions.complete(complete[1], token));
      }
      if (method === 'POST' && route === '/admin/login') {
        rateLimit(request, 'login', 10, 15 * 60 * 1000);
        if (request.headers.origin ? request.headers.origin !== config.siteUrl : request.headers['x-kym-csrf'] !== '1') throw new RequestError(403, '登录请求来源无效。');
        const payload = await readJson(request, 8192);
        const result = auth.login(payload.password);
        if (!result) throw new RequestError(401, '密码错误。');
        response.setHeader('Set-Cookie', result.cookie);
        return json(response, 200, { authenticated: true, csrfToken: result.csrfToken });
      }
      if (route.startsWith('/admin/')) {
        const session = requireAdmin(request, method !== 'GET');
        if (method === 'POST' && route === '/admin/logout') { response.setHeader('Set-Cookie', auth.logout(request)); return json(response, 200, { authenticated: false }); }
        if (method === 'GET' && route === '/admin/submissions') return json(response, 200, { submissions: store.listSubmissions().map(publicSubmission).reverse() });
        if (method === 'GET' && route === '/admin/status') {
          const counts = {};
          for (const record of store.listSubmissions()) counts[record.status] = (counts[record.status] ?? 0) + 1;
          return json(response, 200, { authenticated: true, csrfToken: session.csrfToken, worker: publisher.status(), publishedRevision: store.getPublishedRevision()?.id ?? null, counts });
        }
        const fileRoute = /^\/admin\/submissions\/([a-f0-9-]{36})\/files\/([a-f0-9-]{36})$/.exec(route);
        if (method === 'GET' && fileRoute) {
          const record = submissions.requireRecord(fileRoute[1]);
          const file = record.files.find((value) => value.id === fileRoute[2]);
          if (!file?.sha256) throw new RequestError(404, '附件尚未上传。');
          const source = blobPath(store.dataDir, file.sha256);
          const stat = fs.statSync(source);
          if (!stat.isFile() || stat.size !== file.sizeBytes) throw new RequestError(500, '附件完整性检查失败。');
          response.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': file.sizeBytes, 'Content-Disposition': `attachment; filename="material"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, (value) => `%${value.charCodeAt(0).toString(16).toUpperCase()}`)}`, 'Content-Security-Policy': "sandbox; default-src 'none'" });
          await pipeline(fs.createReadStream(source), response);
          return;
        }
        const review = /^\/admin\/submissions\/([a-f0-9-]{36})\/(approve|reject|retry)$/.exec(route);
        if (method === 'POST' && review) {
          const payload = await readJson(request, 16384);
          const record = review[2] === 'approve' ? submissions.approve(review[1]) : review[2] === 'reject' ? submissions.reject(review[1], payload.reason) : submissions.retry(review[1]);
          if (review[2] !== 'reject') void publisher.kick();
          return json(response, 200, record);
        }
      }
      throw new RequestError(404, '接口不存在。');
    } catch (error) {
      const status = error instanceof RequestError ? error.status : error.code === 'FILE_TOO_LARGE' ? 413 : 500;
      if (!response.headersSent && !response.destroyed) json(response, status, { error: error instanceof RequestError || status < 500 ? error.message : '服务器处理失败，请稍后重试。' });
      else if (!response.destroyed) response.destroy();
      // Log neither JSON bodies, cookies, passwords nor upload tokens.
      if (status === 500) dependencies.onError?.(error);
    }
  }
  const server = http.createServer((request, response) => { void handle(request, response); });
  server.requestTimeout = 10 * 60 * 1000;
  server.headersTimeout = 60 * 1000;
  return {
    server, store, submissions, publisher,
    async start() { void publisher.start(); return new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, config.host, () => { server.off('error', reject); resolve(server.address()); }); }); },
    async close() { await publisher.stop(); if (server.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); if (ownsStore) store.close(); },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = configFromEnv();
    const application = createApplication(config, { onError: (error) => console.error(`API error: ${error.code ?? error.name}`) });
    const address = await application.start();
    console.log(`KYM API listening on ${address.address}:${address.port}`);
    let closing = false;
    const shutdown = async () => { if (closing) return; closing = true; await application.close(); };
    process.once('SIGTERM', () => { void shutdown(); });
    process.once('SIGINT', () => { void shutdown(); });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
