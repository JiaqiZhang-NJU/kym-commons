import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export const SHA256_PATTERN = /^[a-f0-9]{64}$/;

/** A file-view name, never an absolute filesystem path or a URL. */
export function safeRelativePath(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("Invalid relative file path");
  }
  const segments = value.split("/");
  if (segments.some((part) => !part || part === "." || part === ".." || part.includes(":"))) {
    throw new Error(`Unsafe relative file path: ${value}`);
  }
  return value;
}

export function blobPath(dataDir, sha256) {
  if (!SHA256_PATTERN.test(sha256 ?? "")) throw new Error("Invalid SHA-256");
  return path.join(path.resolve(dataDir), "blobs", sha256);
}

export async function hashFile(filePath) {
  const stat = await fsp.lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected regular file: ${filePath}`);
  const hash = createHash("sha256");
  let sizeBytes = 0;
  for await (const chunk of fs.createReadStream(filePath)) {
    hash.update(chunk);
    sizeBytes += chunk.length;
  }
  return { sha256: hash.digest("hex"), sizeBytes };
}

export async function verifyBlob(dataDir, record) {
  if (!Number.isSafeInteger(record.sizeBytes) || record.sizeBytes < 0) throw new Error("Invalid file size");
  const actual = await hashFile(blobPath(dataDir, record.sha256));
  if (actual.sha256 !== record.sha256 || actual.sizeBytes !== record.sizeBytes) {
    throw new Error(`Blob checksum or size mismatch: ${record.sha256}`);
  }
  return actual;
}

async function syncDirectory(directory) {
  // Linux directory fsync makes the newly committed filename survive a power loss.
  // Windows does not expose directory handles through this Node API.
  if (process.platform === "win32") return;
  const handle = await fsp.open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function renameWithRetry(source, destination, { replaceExisting = false } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      if (!replaceExisting && await fsp.lstat(destination).then(() => true, (failure) => {
        if (failure.code === "ENOENT") return false;
        throw failure;
      })) throw new Error(`File view already exists: ${destination}`);
      await fsp.rename(source, destination);
      return;
    }
    catch (error) {
      if (!["EPERM", "EACCES", "EBUSY"].includes(error.code) || attempt >= 10) throw error;
      // A race must never turn an immutable view into an overwrite operation.
      if (!replaceExisting && await fsp.lstat(destination).then(() => true, (failure) => {
        if (failure.code === "ENOENT") return false;
        throw failure;
      })) throw new Error(`File view already exists: ${destination}`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(25 * 2 ** attempt, 400)));
    }
  }
}

/** Store only fully received bytes. The digest is published with an atomic link. */
export async function putStreamBlob(dataDir, stream, { maxBytes = Infinity } = {}) {
  if (!(maxBytes >= 0)) throw new Error("Invalid upload limit");
  const root = path.resolve(dataDir);
  await fsp.mkdir(path.join(root, "blobs"), { recursive: true });
  await fsp.mkdir(path.join(root, "tmp"), { recursive: true });
  await syncDirectory(root);
  const temporary = path.join(root, "tmp", `${randomUUID()}.partial`);
  const handle = await fsp.open(temporary, "wx", 0o600);
  const hash = createHash("sha256");
  let sizeBytes = 0;
  try {
    for await (const value of stream) {
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      sizeBytes += chunk.length;
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes > maxBytes) {
        const error = new Error(`File exceeds upload limit (${maxBytes} bytes)`);
        error.code = "FILE_TOO_LARGE";
        throw error;
      }
      hash.update(chunk);
      await handle.writeFile(chunk);
    }
    await handle.sync();
    await handle.close();
    const record = { sha256: hash.digest("hex"), sizeBytes };
    const target = blobPath(root, record.sha256);
    try {
      await fsp.link(temporary, target);
      // The input was copied into a new inode, so this never changes a legacy file.
      if (process.platform !== "win32") await fsp.chmod(target, 0o444);
      await syncDirectory(path.join(root, "blobs"));
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      await verifyBlob(root, record);
    }
    return record;
  } finally {
    await handle.close().catch(() => {});
    await fsp.unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; });
  }
}

export async function putBlob(dataDir, sourcePath) {
  const stat = await fsp.lstat(sourcePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected regular file: ${sourcePath}`);
  return putStreamBlob(dataDir, fs.createReadStream(sourcePath));
}

export function validateRevisionCatalog(catalog, files) {
  if (!catalog || ["tracks", "courses", "categories", "packages"].some((key) => !Array.isArray(catalog[key]))) {
    throw new Error("Invalid catalog envelope");
  }
  if (!Array.isArray(files)) throw new Error("Invalid revision file list");
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  function uniqueSlugs(records, label) {
    const slugs = new Set();
    for (const record of records) {
      if (!record || !slugPattern.test(record.slug ?? "")) throw new Error(`Invalid ${label} slug`);
      if (slugs.has(record.slug)) throw new Error(`Duplicate ${label} slug: ${record.slug}`);
      slugs.add(record.slug);
    }
    return slugs;
  }
  const trackSlugs = uniqueSlugs(catalog.tracks, "track");
  const categorySlugs = uniqueSlugs(catalog.categories, "category");
  const courseKeys = new Set();
  for (const course of catalog.courses) {
    if (!course || !slugPattern.test(course.slug ?? "") || !["foundation", "track"].includes(course.section)) throw new Error("Invalid course");
    if (course.section === "track" && !trackSlugs.has(course.trackSlug)) throw new Error(`Unknown course track: ${course.trackSlug}`);
    if (course.section === "foundation" && course.trackSlug) throw new Error(`Foundation course has a track: ${course.slug}`);
    const key = `${course.section}:${course.trackSlug ?? ""}:${course.slug}`;
    if (courseKeys.has(key)) throw new Error(`Duplicate course: ${key}`);
    courseKeys.add(key);
  }
  const packageIds = new Set();
  const legacyIds = new Set();
  const byPath = new Map();
  for (const file of files) {
    safeRelativePath(file.path);
    if (!SHA256_PATTERN.test(file.sha256 ?? "") || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0) {
      throw new Error(`Invalid file metadata: ${file.path}`);
    }
    if (byPath.has(file.path)) throw new Error(`Duplicate file path: ${file.path}`);
    byPath.set(file.path, file);
  }
  for (const material of catalog.packages) {
    if (!material || material.schemaVersion !== 1 || !slugPattern.test(material.id ?? "")) throw new Error("Invalid package schema or ID");
    if (packageIds.has(material.id)) throw new Error(`Duplicate package ID: ${material.id}`);
    packageIds.add(material.id);
    if (!categorySlugs.has(material.categorySlug)) throw new Error(`Unknown package category: ${material.id}`);
    const placement = material.placement ?? {};
    if (!courseKeys.has(`${placement.section}:${placement.trackSlug ?? ""}:${placement.courseSlug ?? ""}`)) throw new Error(`Unknown package course: ${material.id}`);
    if (!Array.isArray(material.legacyIds)) throw new Error(`Invalid legacy IDs: ${material.id}`);
    for (const legacyId of material.legacyIds) {
      if (typeof legacyId !== "string" || !legacyId || legacyIds.has(legacyId)) throw new Error(`Invalid or duplicate legacy ID: ${legacyId}`);
      legacyIds.add(legacyId);
    }
    if (!Array.isArray(material.assets)) throw new Error(`Invalid assets: ${material.id}`);
    const assetIds = new Set();
    for (const asset of material.assets) {
      if (!asset || typeof asset.id !== "string" || !asset.id || assetIds.has(asset.id)) throw new Error(`Invalid or duplicate asset ID: ${material.id}`);
      assetIds.add(asset.id);
      if (typeof asset.href !== "string") throw new Error(`Invalid asset URL: ${material.id}`);
      if (!asset.href.startsWith("/files/")) {
        if (!/^https:\/\//i.test(asset.href)) throw new Error(`Unsupported asset URL: ${asset.href}`);
        continue;
      }
      let relative;
      try { relative = safeRelativePath(decodeURIComponent(asset.href.slice(7))); }
      catch { throw new Error(`Unsafe asset URL: ${asset.href}`); }
      const file = byPath.get(relative);
      if (!file) throw new Error(`Missing revision file: ${asset.href}`);
      if ((asset.sha256 != null && asset.sha256.toLowerCase() !== file.sha256) ||
          (asset.sizeBytes != null && asset.sizeBytes !== file.sizeBytes)) {
        throw new Error(`Catalog metadata does not match file: ${asset.href}`);
      }
    }
  }
  return { fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0) };
}

/** The caller passes a NEW release view; never modify an existing live view. */
export async function materializeFileView(dataDir, files, outputDir, { verify = true } = {}) {
  const destination = path.resolve(outputDir);
  if (fs.existsSync(destination)) throw new Error(`File view already exists: ${destination}`);
  const storage = path.resolve(dataDir);
  if (destination === storage || destination.startsWith(`${storage}${path.sep}blobs${path.sep}`)) {
    throw new Error("File view cannot overwrite blob storage");
  }
  const staging = `${destination}.partial-${randomUUID()}`;
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  await fsp.mkdir(staging);
  try {
    const verified = new Set();
    for (const file of files) {
      const relative = safeRelativePath(file.path);
      if (verify && !verified.has(file.sha256)) {
        await verifyBlob(dataDir, file);
        verified.add(file.sha256);
      }
      const source = blobPath(dataDir, file.sha256);
      const stat = await fsp.lstat(source);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== file.sizeBytes) throw new Error(`Invalid blob: ${file.sha256}`);
      const target = path.join(staging, ...relative.split("/"));
      await fsp.mkdir(path.dirname(target), { recursive: true });
      try { await fsp.link(source, target); }
      catch (error) {
        if (error.code !== "EXDEV") throw error;
        // /var/lib and /opt may be separate filesystems. Keep the same immutable
        // release layout, with verified private copies instead of symbolic links.
        await fsp.copyFile(source, target, fs.constants.COPYFILE_EXCL);
        const copied = await hashFile(target);
        if (copied.sha256 !== file.sha256 || copied.sizeBytes !== file.sizeBytes) {
          throw new Error(`Copied file view checksum mismatch: ${file.path}`);
        }
        // copyFile can inherit the source's read-only mode; this new inode is
        // still private staging data while its bytes are flushed.
        await fsp.chmod(target, 0o600);
        const copiedHandle = await fsp.open(target, "r+");
        try { await copiedHandle.sync(); } finally { await copiedHandle.close(); }
        await fsp.chmod(target, 0o444);
      }
    }
    await renameWithRetry(staging, destination);
  } catch (error) {
    await fsp.rm(staging, { recursive: true, force: true });
    throw error;
  }
  return destination;
}
