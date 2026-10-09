import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { openStore } from "../../server/store.mjs";
import { putBlob, safeRelativePath, validateRevisionCatalog } from "../../server/storage.mjs";

async function walkFiles(root, current = root) {
  const files = [];
  const entries = await fsp.readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Legacy input contains symlink: ${absolute}`);
    if (entry.isDirectory()) files.push(...await walkFiles(root, absolute));
    else if (entry.isFile()) files.push(absolute);
    else throw new Error(`Legacy input contains non-regular file: ${absolute}`);
  }
  return files;
}

async function contentCatalog(root) {
  async function envelope(name) {
    const record = JSON.parse(await fsp.readFile(path.join(root, "content", "catalog", `${name}.json`), "utf8"));
    if (record.schemaVersion !== 1 || !Array.isArray(record.items)) throw new Error(`Invalid legacy ${name}`);
    return record.items;
  }
  const packages = (await walkFiles(path.join(root, "content", "packages")))
    .filter((file) => file.endsWith(".json")).sort();
  return {
    tracks: await envelope("tracks"), courses: await envelope("courses"), categories: await envelope("categories"),
    packages: await Promise.all(packages.map(async (file) => JSON.parse(await fsp.readFile(file, "utf8")))),
  };
}

export async function importLegacy({ root = process.cwd(), dataDir, sourceCommit } = {}) {
  if (!dataDir) throw new Error("--data-dir is required");
  const legacyRoot = path.resolve(root);
  const destination = path.resolve(dataDir);
  if (fs.existsSync(destination) && (await fsp.readdir(destination)).length) {
    throw new Error(`Legacy import requires a new or empty data directory: ${destination}`);
  }
  const catalogText = await fsp.readFile(path.join(legacyRoot, "src", "generated", "catalog.json"), "utf8");
  const catalog = JSON.parse(catalogText);
  const canonical = await contentCatalog(legacyRoot);
  if (JSON.stringify(catalog) !== JSON.stringify(canonical)) {
    throw new Error("Generated catalog differs from legacy content. Resolve the baseline before importing.");
  }
  if (sourceCommit === undefined) {
    try { sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: legacyRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
    catch { sourceCommit = null; }
  }
  const temporary = `${destination}.import-${randomUUID()}`;
  await fsp.mkdir(path.dirname(temporary), { recursive: true });
  await fsp.mkdir(temporary, { recursive: false });
  let store;
  try {
    const inputRoot = path.join(legacyRoot, "static", "files");
    const files = [];
    const sourceFiles = await walkFiles(inputRoot);
    for (const [index, source] of sourceFiles.entries()) {
      const relative = safeRelativePath(path.relative(inputRoot, source).split(path.sep).join("/"));
      files.push({ path: relative, ...await putBlob(temporary, source) });
      if ((index + 1) % 100 === 0) process.stderr.write(`Imported ${index + 1}/${sourceFiles.length} files\n`);
    }
    const summary = validateRevisionCatalog(catalog, files);
    store = openStore(temporary);
    const revision = store.createRevision(catalog, files, { id: `legacy-${randomUUID()}`, sourceCommit });
    store.setPublishedRevision(revision.id);
    store.integrityCheck();
    const referenced = new Set(catalog.packages.flatMap((material) => material.assets)
      .filter((asset) => asset.href.startsWith("/files/")).map((asset) => decodeURIComponent(asset.href.slice(7))));
    const report = {
      formatVersion: 1, createdAt: new Date().toISOString(), sourceCommit, revisionId: revision.id,
      catalogSha256: createHash("sha256").update(catalogText).digest("hex"),
      tracks: catalog.tracks.length, courses: catalog.courses.length, categories: catalog.categories.length,
      packages: catalog.packages.length, assets: catalog.packages.reduce((sum, item) => sum + item.assets.length, 0),
      ...summary, referencedFileCount: referenced.size,
      unindexedFiles: files.filter((file) => !referenced.has(file.path)).map((file) => file.path),
      externalAssets: catalog.packages.flatMap((material) => material.assets.filter((asset) => !asset.href.startsWith("/files/")).map((asset) => ({ packageId: material.id, ...asset }))),
    };
    await fsp.writeFile(path.join(temporary, "import-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    // Closing checkpoints SQLite; never copy a live database to complete the import.
    store.close();
    store = null;
    if (fs.existsSync(destination)) await fsp.rmdir(destination);
    await fsp.rename(temporary, destination);
    return report;
  } catch (error) {
    if (store) store.close();
    await fsp.rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

function argumentsOf(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!["--data-dir", "--root", "--source-commit"].includes(name) || !argv[index + 1]) throw new Error(`Invalid argument: ${name}`);
    result[{ "--data-dir": "dataDir", "--root": "root", "--source-commit": "sourceCommit" }[name]] = argv[++index];
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await importLegacy(argumentsOf(process.argv.slice(2)));
    console.log(JSON.stringify({ revisionId: report.revisionId, fileCount: report.fileCount, totalBytes: report.totalBytes, unindexedFileCount: report.unindexedFiles.length }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
