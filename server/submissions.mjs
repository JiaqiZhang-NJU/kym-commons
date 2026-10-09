import { createHash, randomUUID } from 'node:crypto';
import fsp from 'node:fs/promises';
import { planCatalogMutation } from '../scripts/submissions/issue-to-catalog.mjs';
import { hashToken, constantEqual } from './auth.mjs';
import { putStreamBlob, validateRevisionCatalog } from './storage.mjs';

export class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const scopes = new Set(['foundation-course', 'track-course', 'track-general']);
const MAX_TEXT = { title: 200, term: 100, materialType: 100, summary: 8000 };
const publishedStates = new Set(['approved', 'publishing', 'publication-failed', 'published']);

export function publicSubmission(record) {
  if (!record) return null;
  const { uploadTokenHash, idempotencyKeyHash, requestHash, ...safe } = record;
  return safe;
}

export function validateManifest(input) {
  if (!input || input.version !== 3 || !scopes.has(input.scope)) throw new RequestError(400, '投稿位置无效。');
  if (input.anonymous !== undefined && typeof input.anonymous !== 'boolean') throw new RequestError(400, '匿名选项无效。');
  const result = { version: 3, scope: input.scope, anonymous: Boolean(input.anonymous) };
  for (const [field, limit] of Object.entries(MAX_TEXT)) {
    if (typeof input[field] !== 'string' || !input[field].trim() || input[field].length > limit) throw new RequestError(400, `投稿字段 ${field} 为空或过长。`);
    result[field] = input[field].trim();
  }
  for (const [field, label] of [['track', 'label'], ['course', 'title']]) {
    if (field === 'track' && input.scope === 'foundation-course') { result.track = null; continue; }
    const value = input[field];
    if (!value || !['new', 'existing'].includes(value.mode) || !slugPattern.test(value.slug ?? '') || value.slug.length > 100) throw new RequestError(400, `投稿 ${field} 无效。`);
    if (value.mode === 'new' && (typeof value[label] !== 'string' || !value[label].trim() || value[label].length > 200)) throw new RequestError(400, `新建 ${field} 必须填写名称。`);
    result[field] = { mode: value.mode, slug: value.slug, [label]: typeof value[label] === 'string' ? value[label].trim().slice(0, 200) : '' };
  }
  if (!['upload', 'external-link'].includes(input.sourceMode)) throw new RequestError(400, '请选择文件上传或外部链接。');
  result.sourceMode = input.sourceMode;
  result.externalLink = null;
  if (input.sourceMode === 'external-link') {
    let url;
    try { url = new URL(input.externalLink); } catch { throw new RequestError(400, '外部链接无效。'); }
    if (url.protocol !== 'https:' || url.username || url.password || String(input.externalLink).length > 4096) throw new RequestError(400, '外部链接必须使用 HTTPS，且不能包含登录凭据。');
    result.externalLink = url.href;
  }
  return result;
}

function derivedUploadToken(key, id) { return hashToken(`kym-upload:${id}:${key}`); }

export function createSubmissions({ store, maxFileBytes = 128 * 1024 * 1024, maxSubmissionBytes = 512 * 1024 * 1024, maxFiles = 32 } = {}) {
  const activeUploads = new Set();
  let reservedUploadBytes = 0;
  function requireRecord(id) {
    const record = store.getSubmission(id);
    if (!record) throw new RequestError(404, '投稿不存在。');
    return record;
  }
  function authorize(id, token) {
    const record = requireRecord(id);
    if (!token || !constantEqual(hashToken(token), record.uploadTokenHash)) throw new RequestError(401, '上传凭据无效。');
    return record;
  }
  function headRevision() {
    const approved = store.listSubmissions().filter((record) => publishedStates.has(record.status) && record.revisionId).sort((a, b) => (b.approvalSequence ?? 0) - (a.approvalSequence ?? 0));
    const published = store.getPublishedRevision();
    const revision = approved.length ? store.getRevision(approved[0].revisionId) : typeof published === 'string' ? store.getRevision(published) : published;
    if (!revision) throw new RequestError(503, '站点数据尚未初始化。');
    return revision;
  }
  return {
    requireRecord, authorize, headRevision,
    create(payload) {
      if (typeof payload?.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(payload.idempotencyKey)) throw new RequestError(400, '投稿请求标识无效，请重新开始投稿。');
      const manifest = validateManifest(payload.manifest);
      const inputFiles = payload.files ?? [];
      if (!Array.isArray(inputFiles) || inputFiles.length > maxFiles || (manifest.sourceMode === 'upload' ? inputFiles.length === 0 : inputFiles.length !== 0)) throw new RequestError(400, '上传文件数量无效。');
      let total = 0;
      const files = inputFiles.map((file) => {
        if (typeof file.name !== 'string' || !file.name.trim() || Buffer.byteLength(file.name) > 240 || /[\x00-\x1f\x7f:/\\]/u.test(file.name) || ['.', '..'].includes(file.name)) throw new RequestError(400, '文件名无效。');
        if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > maxFileBytes) throw new RequestError(413, '文件超过大小限制。');
        total += file.size;
        return { name: file.name, size: file.size, type: typeof file.type === 'string' && file.type.length < 200 && !/[\r\n]/.test(file.type) ? file.type : 'application/octet-stream' };
      });
      if (total > maxSubmissionBytes) throw new RequestError(413, '投稿总大小超过限制。');
      const requestHash = hashToken(JSON.stringify({ manifest, files }));
      const idempotencyKeyHash = hashToken(payload.idempotencyKey);
      const existing = store.listSubmissions().find((record) => record.idempotencyKeyHash === idempotencyKeyHash);
      if (existing) {
        if (existing.requestHash !== requestHash) throw new RequestError(409, '同一请求标识不能用于不同投稿。');
        return { ...publicSubmission(existing), uploadToken: derivedUploadToken(payload.idempotencyKey, existing.id) };
      }
      // Validate the target now, and again at approval because the catalog may change.
      try { planCatalogMutation({ catalog: headRevision().catalog, manifest, assets: [{ href: '/files/validation', label: 'validation' }], issueNumber: 'validation' }); }
      catch (error) { if (error instanceof RequestError) throw error; throw new RequestError(400, error.message); }
      const id = randomUUID();
      const now = new Date().toISOString();
      const uploadToken = derivedUploadToken(payload.idempotencyKey, id);
      const record = { id, manifest, files: files.map((file) => ({ ...file, id: randomUUID() })), status: 'uploading', createdAt: now, updatedAt: now, requestHash, idempotencyKeyHash, uploadTokenHash: hashToken(uploadToken) };
      store.saveSubmission(record);
      return { ...publicSubmission(record), uploadToken };
    },
    async upload(id, fileId, token, stream, declaredLength) {
      const record = authorize(id, token);
      if (record.status !== 'uploading') throw new RequestError(409, '投稿已完成，不能更改附件。');
      const file = record.files.find((value) => value.id === fileId);
      if (!file) throw new RequestError(404, '附件不存在。');
      if (declaredLength !== undefined && Number(declaredLength) !== file.size) throw new RequestError(400, '上传长度与文件声明不一致。');
      const key = `${id}:${fileId}`;
      if (activeUploads.has(key)) throw new RequestError(409, '附件正在上传。');
      activeUploads.add(key);
      let reserved = false;
      try {
        const filesystem = await fsp.statfs(store.dataDir, { bigint: true });
        const availableBytes = filesystem.bavail * filesystem.bsize;
        const reserveBytes = 128n * 1024n * 1024n;
        if (availableBytes < BigInt(file.size) + BigInt(reservedUploadBytes) + reserveBytes) throw new RequestError(507, '服务器剩余空间不足，无法接收这份附件。');
        reservedUploadBytes += file.size;
        reserved = true;
        async function* exactBytes() {
          let received = 0;
          const retryHash = file.sha256 ? createHash('sha256') : null;
          for await (const chunk of stream) {
            received += Buffer.byteLength(chunk);
            if (received > file.size) throw new RequestError(400, '上传长度与文件声明不一致。');
            retryHash?.update(chunk);
            yield chunk;
          }
          if (received !== file.size) throw new RequestError(400, '附件未完整上传。');
          if (retryHash && retryHash.digest('hex') !== file.sha256) throw new RequestError(409, '附件已上传且内容不同。');
        }
        const blob = await putStreamBlob(store.dataDir, exactBytes(), { maxBytes: Math.min(maxFileBytes, file.size) });
        const latest = authorize(id, token);
        const previous = latest.files.find((value) => value.id === fileId);
        if (previous.sha256 && previous.sha256 !== blob.sha256) throw new RequestError(409, '附件已上传且内容不同。');
        const uploadedAt = new Date().toISOString();
        const updated = store.updateSubmission(id, { files: latest.files.map((value) => value.id === fileId ? { ...value, ...blob, uploadedAt } : value), updatedAt: uploadedAt });
        return updated.files.find((value) => value.id === fileId);
      } finally { if (reserved) reservedUploadBytes -= file.size; activeUploads.delete(key); }
    },
    complete(id, token) {
      const record = authorize(id, token);
      if (record.status !== 'uploading') return publicSubmission(record);
      if (record.files.some((file) => !file.sha256 || file.sizeBytes !== file.size) || record.files.some((file) => activeUploads.has(`${id}:${file.id}`))) throw new RequestError(409, '请先完整上传全部附件。');
      return publicSubmission(store.updateSubmission(id, { status: 'pending', updatedAt: new Date().toISOString() }));
    },
    approve(id) {
      const record = requireRecord(id);
      if (publishedStates.has(record.status)) return publicSubmission(record);
      if (record.status !== 'pending') throw new RequestError(409, '只有待审核投稿可以批准。');
      const baseline = headRevision();
      const assets = record.files.map((file) => {
        const relative = `submissions/${id}/${file.id}/${file.name}`;
        return { href: `/files/${relative.split('/').map(encodeURIComponent).join('/')}`, label: file.name, fileName: file.name, mediaType: file.type, sizeBytes: file.sizeBytes, sha256: file.sha256, role: 'primary', relative };
      });
      let mutation;
      try { mutation = planCatalogMutation({ catalog: baseline.catalog, manifest: record.manifest, assets, issueNumber: id }); }
      catch (error) { throw new RequestError(409, error.message); }
      mutation.materialPackage.source = { kind: 'website-submission', submissionId: id, anonymous: record.manifest.anonymous };
      const catalog = { ...baseline.catalog, tracks: mutation.tracks, courses: mutation.courses, packages: [...baseline.catalog.packages, mutation.materialPackage] };
      const files = [...baseline.files, ...assets.map((asset) => ({ path: asset.relative, sha256: asset.sha256, sizeBytes: asset.sizeBytes }))];
      validateRevisionCatalog(catalog, files);
      const approvalSequence = Math.max(0, ...store.listSubmissions().map((value) => value.approvalSequence ?? 0)) + 1;
      store.db.exec('BEGIN IMMEDIATE');
      try {
        const revision = store.createRevision(catalog, files, { sourceSubmissionId: id, sourceCommit: baseline.sourceCommit });
        const approved = store.updateSubmission(id, { status: 'approved', revisionId: revision.id, approvalSequence, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishError: null });
        store.db.exec('COMMIT');
        return publicSubmission(approved);
      } catch (error) { store.db.exec('ROLLBACK'); throw error; }
    },
    reject(id, reason) {
      const record = requireRecord(id);
      if (record.status === 'rejected') return publicSubmission(record);
      if (record.status !== 'pending') throw new RequestError(409, '只有待审核投稿可以拒绝。');
      if (typeof reason !== 'string' || !reason.trim() || reason.length > 2000) throw new RequestError(400, '请填写拒绝原因（最多 2000 字）。');
      return publicSubmission(store.updateSubmission(id, { status: 'rejected', reason: reason.trim(), reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    },
    retry(id) {
      const record = requireRecord(id);
      if (record.status === 'published' || record.status === 'publishing' || record.status === 'approved') return publicSubmission(record);
      if (record.status !== 'publication-failed' || !record.revisionId) throw new RequestError(409, '这份投稿没有可重试的发布任务。');
      return publicSubmission(store.updateSubmission(id, { status: 'approved', publishError: null, updatedAt: new Date().toISOString() }));
    },
  };
}
