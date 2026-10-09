import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { openStore } from "../../server/store.mjs";
import { isMainModule } from "../../server/cli.mjs";
import { hashFile, materializeFileView, renameWithRetry, validateRevisionCatalog, verifyBlob } from "../../server/storage.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function preparationLock(targetRoot) {
  const lockPath = path.join(targetRoot, ".prepare.lock");
  const token = randomUUID();
  const deadline = Date.now() + 5 * 60_000;
  while (true) {
    try {
      const handle = await fsp.open(lockPath, "wx", 0o600);
      try { await handle.writeFile(JSON.stringify({ pid: process.pid, token })); await handle.sync(); }
      catch (error) { await handle.close(); await fsp.unlink(lockPath); throw error; }
      await handle.close();
      return async () => {
        try { if (JSON.parse(await fsp.readFile(lockPath, "utf8")).token === token) await fsp.unlink(lockPath); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let owner;
      try { owner = JSON.parse(await fsp.readFile(lockPath, "utf8")); } catch {}
      if (Number.isSafeInteger(owner?.pid) && owner.pid > 0) {
        let alive = true;
        try { process.kill(owner.pid, 0); } catch (failure) { if (failure.code === "ESRCH") alive = false; }
        if (!alive) {
          // Only remove the same abandoned lock that was inspected.
          try { if (JSON.parse(await fsp.readFile(lockPath, "utf8")).token === owner.token) await fsp.unlink(lockPath); }
          catch (failure) { if (failure.code !== "ENOENT") throw failure; }
          continue;
        }
      }
      if (Date.now() >= deadline) throw new Error(`Another preparation is active; inspect ${lockPath}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function validateExistingView(fileView, files) {
  const expected = new Map(files.map((file) => [file.path, file]));
  async function walk(directory, relative = "") {
    for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Unsafe file view symlink: ${name}`);
      if (entry.isDirectory()) await walk(absolute, name);
      else {
        const file = expected.get(name);
        if (!entry.isFile() || !file) throw new Error(`Unexpected file view entry: ${name}`);
        const actual = await hashFile(absolute);
        if (actual.sha256 !== file.sha256 || actual.sizeBytes !== file.sizeBytes) throw new Error(`File view checksum mismatch: ${name}`);
        expected.delete(name);
      }
    }
  }
  const root = await fsp.lstat(fileView);
  if (!root.isDirectory() || root.isSymbolicLink()) throw new Error("File view must be a regular directory");
  await walk(fileView);
  if (expected.size) throw new Error(`Incomplete file view: ${expected.keys().next().value}`);
}

async function writeAtomic(output, contents) {
  await fsp.mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.partial-${randomUUID()}`;
  try {
    await fsp.writeFile(temporary, contents);
    await renameWithRetry(temporary, output, { replaceExisting: true });
  } finally { await fsp.unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; }); }
}

export async function prepareBuild({ dataDir = process.env.KYM_DATA_DIR, revisionId = process.env.KYM_BUILD_REVISION, outputDir = process.env.KYM_BUILD_OUTPUT, catalogOutput = path.join(repositoryRoot, "src/generated/catalog.json") } = {}) {
  if (!dataDir) throw new Error("KYM_DATA_DIR or --data-dir is required; production data cannot come from Git");
  if (!fs.existsSync(path.join(path.resolve(dataDir), "catalog.sqlite"))) throw new Error("Catalog database does not exist");
  const store = openStore(dataDir);
  let revision;
  try {
    store.integrityCheck();
    revision = revisionId ? store.getRevision(revisionId) : store.getPublishedRevision();
    if (!revision) throw new Error("Requested/published revision does not exist");
    validateRevisionCatalog(revision.catalog, revision.files);
  } finally { store.close(); }
  const verified = new Set();
  for (const file of revision.files) {
    if (!verified.has(file.sha256)) {
      await verifyBlob(dataDir, file);
      verified.add(file.sha256);
    }
  }
  const targetRoot = path.resolve(outputDir ?? path.join(dataDir, "build-views", revision.id));
  await fsp.mkdir(targetRoot, { recursive: true });
  const fileView = path.join(targetRoot, "files");
  const releaseLock = await preparationLock(targetRoot);
  try {
    const viewExists = await fsp.lstat(fileView).then(() => true, (error) => { if (error.code === "ENOENT") return false; throw error; });
    if (!viewExists) await materializeFileView(dataDir, revision.files, fileView, { verify: false });
    else {
      // An immutable revision may reuse its view, but every published path must still match.
      const manifestPath = path.join(targetRoot, "data-manifest.json");
      if (fs.existsSync(manifestPath) && JSON.parse(await fsp.readFile(manifestPath, "utf8")).revisionId !== revision.id) {
        throw new Error("Existing file view belongs to a different or unknown revision");
      }
      // A prior process may have stopped after the atomic view rename but before
      // writing the manifest. Adopt it only after checking the entire tree.
      await validateExistingView(fileView, revision.files);
    }
    const output = path.resolve(catalogOutput);
    const manifest = { formatVersion: 1, revisionId: revision.id, sourceCommit: revision.sourceCommit, createdAt: revision.createdAt, fileCount: revision.files.length };
    await writeAtomic(path.join(targetRoot, "data-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeAtomic(output, `${JSON.stringify(revision.catalog, null, 2)}\n`);
    return { ...manifest, catalogOutput: output, fileView };
  } finally { await releaseLock(); }
}

function argumentsOf(argv) {
  const result = {};
  const keys = { "--data-dir": "dataDir", "--revision": "revisionId", "--output-dir": "outputDir", "--catalog-output": "catalogOutput" };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!keys[name] || !argv[index + 1]) throw new Error(`Invalid argument: ${name}`);
    result[keys[name]] = argv[++index];
  }
  return result;
}
if (isMainModule(import.meta.url)) {
  try { console.log(JSON.stringify(await prepareBuild(argumentsOf(process.argv.slice(2))))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
