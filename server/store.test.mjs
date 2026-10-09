import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openStore } from "./store.mjs";
import { blobPath, hashFile, materializeFileView, putBlob, putStreamBlob, safeRelativePath, validateRevisionCatalog, verifyBlob } from "./storage.mjs";
import { importLegacy } from "../scripts/data/import-legacy.mjs";
import { prepareBuild } from "../scripts/data/prepare-build.mjs";

const temporaryRoots = [];
const stores = [];
function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kym-data-test-"));
  temporaryRoots.push(root);
  return root;
}
function database(root) {
  const store = openStore(root);
  stores.push(store);
  return store;
}
function fixtureCatalog(file) {
  return {
    tracks: [{ slug: "cs", order: 3, aliases: ["中文", "CS"] }],
    courses: [{ slug: "algorithms", section: "track", trackSlug: "cs", nullable: null }],
    categories: [{ slug: "notes", order: 1 }],
    packages: [{ schemaVersion: 1, id: "notes", title: "讲义", placement: { section: "track", trackSlug: "cs", courseSlug: "algorithms" }, categorySlug: "notes", unknownFutureField: { n: 2 }, legacyIds: ["older", "old"],
      assets: [{ id: "asset-1", href: "/files/中文/space%20name.pdf", role: "question", sizeBytes: file.sizeBytes, sha256: file.sha256 }] }],
  };
}
async function blobFixture(dataDir) {
  const blob = await putStreamBlob(dataDir, Readable.from([Buffer.from("binary\0"), Buffer.from("資料")]));
  return { path: "中文/space name.pdf", ...blob };
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const store of stores.splice(0)) { try { store.close(); } catch {} }
  for (const root of temporaryRoots.splice(0)) await fsp.rm(root, { recursive: true, force: true });
});

describe("durable immutable revisions and submissions", () => {
  it("retains arbitrary fields, exact arrays and all unindexed files across restart/export/restore", async () => {
    const root = tempRoot();
    const file = await blobFixture(root);
    const orphan = { path: "unindexed.txt", ...await putStreamBlob(root, Readable.from(["orphan"])) };
    const catalog = fixtureCatalog(file);
    const store = database(root);
    const revision = store.createRevision(catalog, [orphan, file], { id: "first", sourceCommit: "abc" });
    store.setPublishedRevision(revision.id);
    store.saveSubmission({ id: "pending", status: "pending", files: [orphan], draft: { anonymous: true }, review: null, job: { attempts: 2 } });
    const state = store.exportState();
    expect(store.getPublishedRevision().catalog).toEqual(catalog);
    expect(store.getPublishedRevision().files).toEqual([orphan, file]);
    store.close();
    expect(database(root).exportState()).toEqual(state);
    const restored = database(tempRoot());
    expect(restored.importState(state)).toEqual(state);
    expect(restored.integrityCheck()).toBe(true);
    expect(() => restored.importState(state)).toThrow("empty database");
    expect(() => restored.db.prepare("UPDATE revisions SET catalog_json = '{}' WHERE id='first'").run()).toThrow("immutable");
    expect(() => restored.db.prepare("DELETE FROM revision_files WHERE revision_id='first'").run()).toThrow("immutable");
  });

  it("supports atomic approval rollback and does not create duplicate revisions/submissions", async () => {
    const root = tempRoot();
    const file = await blobFixture(root);
    const store = database(root);
    store.saveSubmission({ id: "one", status: "pending", files: [file] });
    store.db.exec("BEGIN IMMEDIATE");
    store.createRevision(fixtureCatalog(file), [file], { id: "approved", sourceSubmissionId: "one" });
    store.updateSubmission("one", { status: "approved", revisionId: "approved" });
    store.db.exec("ROLLBACK");
    expect(store.getRevision("approved")).toBeNull();
    expect(store.getSubmission("one").status).toBe("pending");
    store.db.exec("BEGIN IMMEDIATE");
    store.createRevision(fixtureCatalog(file), [file], { id: "approved", sourceSubmissionId: "one" });
    store.updateSubmission("one", { status: "approved", revisionId: "approved" });
    store.db.exec("COMMIT");
    expect(store.getSubmission("one").revisionId).toBe("approved");
    expect(() => store.saveSubmission({ id: "one", status: "pending" })).toThrow();
    expect(() => store.createRevision(fixtureCatalog(file), [file], { id: "approved" })).toThrow();
    expect(() => store.createRevision(fixtureCatalog(file), [file], { id: "../../outside" })).toThrow("Invalid revision ID");
    expect(store.listSubmissions({ status: "approved" })).toHaveLength(1);
  });

  it("rejects corrupt/unknown schema without accepting a partial state import", async () => {
    const root = tempRoot();
    const store = database(root);
    expect(() => store.importState({ formatVersion: 100, schemaVersion: 1, revisions: [], submissions: [] })).toThrow("Unsupported");
    expect(store.exportState().revisions).toEqual([]);
    store.db.exec("PRAGMA user_version = 99");
    store.close();
    expect(() => openStore(root)).toThrow("Unsupported database version 99");
  });
});

describe("streaming private blobs and public file views", () => {
  it("deduplicates complete binary streams and cleans interrupted/over-limit uploads", async () => {
    const root = tempRoot();
    const first = await blobFixture(root);
    expect(await blobFixture(root)).toEqual(first);
    expect((await fsp.readdir(path.join(root, "blobs"))).length).toBe(1);
    await expect(putStreamBlob(root, Readable.from(["too", "large"]), { maxBytes: 4 })).rejects.toThrow("upload limit");
    const broken = Readable.from((async function* () { yield "partial"; throw new Error("interrupted"); })());
    await expect(putStreamBlob(root, broken)).rejects.toThrow("interrupted");
    expect(await fsp.readdir(path.join(root, "tmp"))).toEqual([]);
    expect((await fsp.readdir(path.join(root, "blobs"))).length).toBe(1);
    expect(await verifyBlob(root, first)).toEqual({ sha256: first.sha256, sizeBytes: first.sizeBytes });
  });

  it("preserves legacy bytes, rejects traversal, detects corruption and excludes pending files", async () => {
    const root = tempRoot();
    const source = path.join(root, "legacy.txt");
    await fsp.writeFile(source, "legacy");
    const original = await putBlob(root, source);
    await fsp.writeFile(source, "changed legacy");
    expect((await hashFile(blobPath(root, original.sha256))).sha256).toBe(original.sha256);
    const file = await blobFixture(root);
    const pending = await putStreamBlob(root, Readable.from(["private upload"]));
    const view = await materializeFileView(root, [file], path.join(root, "view"));
    expect(await fsp.readFile(path.join(view, "中文", "space name.pdf"))).toEqual(await fsp.readFile(blobPath(root, file.sha256)));
    expect(fs.existsSync(path.join(view, pending.sha256))).toBe(false);
    for (const bad of ["../escape", "/absolute", "a//b", "a/../b", "a\\b", "C:foo", "a\0b"]) expect(() => safeRelativePath(bad)).toThrow();
    expect(() => validateRevisionCatalog(fixtureCatalog(file), [])).toThrow("Missing revision file");
    if (process.platform !== "win32") await fsp.chmod(blobPath(root, file.sha256), 0o600);
    await fsp.writeFile(blobPath(root, file.sha256), "corruption");
    await expect(verifyBlob(root, file)).rejects.toThrow("checksum or size mismatch");
  });

  it("makes verified independent immutable copies when release storage is on another filesystem", async () => {
    const root = tempRoot();
    const file = await blobFixture(root);
    const crossVolume = Object.assign(new Error("cross-device link"), { code: "EXDEV" });
    const link = vi.spyOn(fsp, "link").mockRejectedValue(crossVolume);
    const view = await materializeFileView(root, [file], path.join(root, "cross-volume-view"));
    const copiedPath = path.join(view, "中文", "space name.pdf");
    expect(await hashFile(copiedPath)).toEqual({ sha256: file.sha256, sizeBytes: file.sizeBytes });
    expect((await fsp.lstat(copiedPath)).isSymbolicLink()).toBe(false);
    expect((await fsp.stat(copiedPath)).nlink).toBe(1);
    expect((await fsp.stat(copiedPath)).mode & 0o222).toBe(0);
    expect(await hashFile(blobPath(root, file.sha256))).toEqual({ sha256: file.sha256, sizeBytes: file.sizeBytes });
    expect(link).toHaveBeenCalledTimes(1);
  });

  it("does not hide hardlink permission failures and refuses corrupted cross-volume copies", async () => {
    const root = tempRoot();
    const file = await blobFixture(root);
    const denied = Object.assign(new Error("link denied"), { code: "EACCES" });
    const link = vi.spyOn(fsp, "link").mockRejectedValue(denied);
    const copy = vi.spyOn(fsp, "copyFile");
    await expect(materializeFileView(root, [file], path.join(root, "permission-view"))).rejects.toThrow("link denied");
    expect(copy).not.toHaveBeenCalled();
    link.mockRejectedValue(Object.assign(new Error("cross-device link"), { code: "EXDEV" }));
    copy.mockImplementation(async (_source, target) => { await fsp.writeFile(target, "wrong bytes"); });
    await expect(materializeFileView(root, [file], path.join(root, "bad-copy-view"))).rejects.toThrow("Copied file view checksum mismatch");
    expect(fs.existsSync(path.join(root, "bad-copy-view"))).toBe(false);
    expect((await fsp.readdir(root)).filter((name) => name.includes(".partial-"))).toEqual([]);
    expect(await hashFile(blobPath(root, file.sha256))).toEqual({ sha256: file.sha256, sizeBytes: file.sizeBytes });
  });
});

async function legacyFixture() {
  const root = tempRoot();
  const bytes = Buffer.from("sample binary");
  const file = { path: "中文/space name.pdf", sha256: createHash("sha256").update(bytes).digest("hex"), sizeBytes: bytes.length };
  const catalog = fixtureCatalog(file);
  const writeJson = async (relative, data) => {
    const output = path.join(root, relative);
    await fsp.mkdir(path.dirname(output), { recursive: true });
    await fsp.writeFile(output, `${JSON.stringify(data, null, 2)}\n`);
  };
  for (const key of ["tracks", "courses", "categories"]) await writeJson(`content/catalog/${key}.json`, { schemaVersion: 1, items: catalog[key] });
  await writeJson("content/packages/tracks/cs/algorithms/notes.json", catalog.packages[0]);
  await writeJson("src/generated/catalog.json", catalog);
  await fsp.mkdir(path.join(root, "static/files/中文"), { recursive: true });
  await fsp.writeFile(path.join(root, "static/files/中文/space name.pdf"), bytes);
  await fsp.writeFile(path.join(root, "static/files/unindexed.cpp"), "int main(){}");
  return { root, catalog };
}

describe("legacy import and build preparation", () => {
  it("serializes parallel preparations and recovers a complete view lacking its interrupted manifest", async () => {
    const root = tempRoot();
    const file = await blobFixture(root);
    const store = database(root);
    const revision = store.createRevision(fixtureCatalog(file), [file], { id: "concurrent" });
    store.setPublishedRevision(revision.id);
    const release = path.join(root, "release");
    const output = path.join(root, "catalog.json");
    const results = await Promise.all([
      prepareBuild({ dataDir: root, outputDir: release, catalogOutput: output }),
      prepareBuild({ dataDir: root, outputDir: release, catalogOutput: output }),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(fs.existsSync(path.join(release, ".prepare.lock"))).toBe(false);
    await fsp.unlink(path.join(release, "data-manifest.json"));
    await prepareBuild({ dataDir: root, outputDir: release, catalogOutput: output });
    expect(JSON.parse(await fsp.readFile(path.join(release, "data-manifest.json"), "utf8")).revisionId).toBe("concurrent");
    await fsp.writeFile(path.join(release, "files", "unexpected.txt"), "do not expose");
    await expect(prepareBuild({ dataDir: root, outputDir: release, catalogOutput: output })).rejects.toThrow("Unexpected file view entry");
    expect(await fsp.readFile(path.join(release, "files", "unexpected.txt"), "utf8")).toBe("do not expose");
  });

  it("retries a transient Windows rename denial without discarding source bytes", async () => {
    const root = tempRoot();
    const file = await blobFixture(root);
    const permission = Object.assign(new Error("temporary handle is open"), { code: "EPERM" });
    const originalRename = fsp.rename.bind(fsp);
    const rename = vi.spyOn(fsp, "rename").mockRejectedValueOnce(permission).mockImplementation(originalRename);
    const view = await materializeFileView(root, [file], path.join(root, "view"));
    expect(rename).toHaveBeenCalledTimes(2);
    expect(await hashFile(path.join(view, "中文", "space name.pdf"))).toEqual({ sha256: file.sha256, sizeBytes: file.sizeBytes });
    expect(await hashFile(blobPath(root, file.sha256))).toEqual({ sha256: file.sha256, sizeBytes: file.sizeBytes });
  });

  it("imports every file, then builds solely from the external database and blobs", async () => {
    const { root, catalog } = await legacyFixture();
    const destination = path.join(tempRoot(), "data");
    const report = await importLegacy({ root, dataDir: destination, sourceCommit: "commit" });
    expect(report.fileCount).toBe(2);
    expect(report.unindexedFiles).toEqual(["unindexed.cpp"]);
    expect(database(destination).getPublishedRevision().catalog).toEqual(catalog);
    // Eliminate both legacy authorities: the build must succeed from external storage only.
    await fsp.rm(path.join(root, "content"), { recursive: true });
    await fsp.rm(path.join(root, "static/files"), { recursive: true });
    const release = path.join(destination, "release");
    const output = path.join(root, "src/generated/catalog.json");
    await prepareBuild({ dataDir: destination, outputDir: release, catalogOutput: output });
    expect(JSON.parse(await fsp.readFile(output, "utf8"))).toEqual(catalog);
    expect(await fsp.readFile(path.join(release, "files/unindexed.cpp"), "utf8")).toBe("int main(){}");
    expect(fs.existsSync(path.join(root, "static/files"))).toBe(false);
    await prepareBuild({ dataDir: destination, outputDir: release, catalogOutput: output });
    const other = database(destination).createRevision(catalog, database(destination).getPublishedRevision().files, { id: "other-revision" });
    await expect(prepareBuild({ dataDir: destination, revisionId: other.id, outputDir: release, catalogOutput: output })).rejects.toThrow("different or unknown revision");
    await expect(importLegacy({ root, dataDir: destination })).rejects.toThrow("new or empty");
  });

  it("refuses a stale baseline and safely rolls back missing or mismatched files", async () => {
    const { root } = await legacyFixture();
    const destination = path.join(tempRoot(), "data");
    await fsp.writeFile(path.join(root, "static/files/中文/space name.pdf"), "wrong bytes");
    await expect(importLegacy({ root, dataDir: destination })).rejects.toThrow("does not match");
    expect(fs.existsSync(destination)).toBe(false);
    expect(await fsp.readdir(path.dirname(destination))).toEqual([]);
    const generated = JSON.parse(await fsp.readFile(path.join(root, "src/generated/catalog.json"), "utf8"));
    generated.packages[0].legacyIds.reverse();
    await fsp.writeFile(path.join(root, "src/generated/catalog.json"), JSON.stringify(generated));
    await expect(importLegacy({ root, dataDir: destination })).rejects.toThrow("differs from legacy content");
  });
});
