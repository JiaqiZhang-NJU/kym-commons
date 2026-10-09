import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { validateRevisionCatalog } from "./storage.mjs";

// The installed Vite version predates node:sqlite; loading this builtin through
// Node keeps server code usable in both its tests and the pinned production runtime.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");

export const DATABASE_SCHEMA_VERSION = 1;
export const STATE_FORMAT_VERSION = 1;
const activeTransactions = new WeakSet();

function transaction(db, operation) {
  if (activeTransactions.has(db) || db.isTransaction) return operation();
  db.exec("BEGIN IMMEDIATE");
  activeTransactions.add(db);
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    activeTransactions.delete(db);
  }
}

function requireIdentifier(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

/** JSON snapshots retain all catalog fields and array order without a lossy projection. */
export function openStore(dataDir) {
  const directory = path.resolve(dataDir);
  fs.mkdirSync(directory, { recursive: true });
  const dbPath = path.join(directory, "catalog.sqlite");
  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    const version = db.prepare("PRAGMA user_version").get().user_version;
    if (version > DATABASE_SCHEMA_VERSION) throw new Error(`Unsupported database version ${version}`);
    if (version === 0) {
      transaction(db, () => {
        db.exec(`
          CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
          CREATE TABLE revisions (
            id TEXT PRIMARY KEY, catalog_json TEXT NOT NULL, created_at TEXT NOT NULL,
            source_commit TEXT, source_submission_id TEXT
          );
          CREATE TABLE revision_files (
            revision_id TEXT NOT NULL REFERENCES revisions(id), position INTEGER NOT NULL,
            path TEXT NOT NULL, sha256 TEXT NOT NULL, size_bytes INTEGER NOT NULL,
            PRIMARY KEY (revision_id, path), UNIQUE (revision_id, position)
          );
          CREATE TABLE submissions (
            id TEXT PRIMARY KEY, status TEXT NOT NULL, created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL, record_json TEXT NOT NULL
          );
          CREATE INDEX submissions_status ON submissions(status, created_at);
          CREATE TRIGGER immutable_revision_update BEFORE UPDATE ON revisions BEGIN SELECT RAISE(ABORT, 'revisions are immutable'); END;
          CREATE TRIGGER immutable_revision_delete BEFORE DELETE ON revisions BEGIN SELECT RAISE(ABORT, 'revisions are immutable'); END;
          CREATE TRIGGER immutable_revision_file_update BEFORE UPDATE ON revision_files BEGIN SELECT RAISE(ABORT, 'revision files are immutable'); END;
          CREATE TRIGGER immutable_revision_file_delete BEFORE DELETE ON revision_files BEGIN SELECT RAISE(ABORT, 'revision files are immutable'); END;
          PRAGMA user_version = 1;
        `);
      });
    }
  } catch (error) {
    db.close();
    throw error;
  }

  function getRevision(id) {
    const row = db.prepare("SELECT * FROM revisions WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id, catalog: JSON.parse(row.catalog_json),
      files: db.prepare("SELECT path, sha256, size_bytes AS sizeBytes FROM revision_files WHERE revision_id = ? ORDER BY position").all(id).map((file) => ({ ...file })),
      createdAt: row.created_at, sourceCommit: row.source_commit, sourceSubmissionId: row.source_submission_id,
    };
  }
  function createRevision(catalog, files, options = {}) {
    validateRevisionCatalog(catalog, files);
    const id = requireIdentifier(options.id ?? randomUUID(), "revision ID");
    const createdAt = options.createdAt ?? new Date().toISOString();
    // Serialize before beginning a transaction: malformed input cannot leave half a revision.
    const catalogJson = JSON.stringify(catalog);
    const write = () => {
      db.prepare("INSERT INTO revisions VALUES (?, ?, ?, ?, ?)").run(id, catalogJson, createdAt, options.sourceCommit ?? null, options.sourceSubmissionId ?? null);
      const insertFile = db.prepare("INSERT INTO revision_files VALUES (?, ?, ?, ?, ?)");
      files.forEach((file, index) => insertFile.run(id, index, file.path, file.sha256, file.sizeBytes));
    };
    if (activeTransactions.has(db) || db.isTransaction) write(); else transaction(db, write);
    return getRevision(id);
  }
  function getSubmission(id) {
    const row = db.prepare("SELECT record_json FROM submissions WHERE id = ?").get(id);
    return row ? JSON.parse(row.record_json) : null;
  }
  function saveSubmission(input) {
    const id = requireIdentifier(input?.id, "submission ID");
    const status = requireIdentifier(input?.status, "submission status");
    const record = { ...input, createdAt: input.createdAt ?? new Date().toISOString(), updatedAt: input.updatedAt ?? new Date().toISOString() };
    db.prepare("INSERT INTO submissions VALUES (?, ?, ?, ?, ?)").run(id, status, record.createdAt, record.updatedAt, JSON.stringify(record));
    return getSubmission(id);
  }
  function updateSubmission(id, patch) {
    return transaction(db, () => {
      const current = getSubmission(id);
      if (!current) throw new Error(`Submission not found: ${id}`);
      if (patch.id !== undefined && patch.id !== id) throw new Error("Cannot change submission ID");
      const record = { ...current, ...patch, id, updatedAt: patch.updatedAt ?? new Date().toISOString() };
      requireIdentifier(record.status, "submission status");
      db.prepare("UPDATE submissions SET status = ?, updated_at = ?, record_json = ? WHERE id = ?").run(record.status, record.updatedAt, JSON.stringify(record), id);
      return getSubmission(id);
    });
  }
  function listSubmissions({ status } = {}) {
    const rows = status === undefined
      ? db.prepare("SELECT record_json FROM submissions ORDER BY created_at, id").all()
      : db.prepare("SELECT record_json FROM submissions WHERE status = ? ORDER BY created_at, id").all(status);
    return rows.map((row) => JSON.parse(row.record_json));
  }
  function setPublishedRevision(id) {
    if (!getRevision(id)) throw new Error(`Revision not found: ${id}`);
    db.prepare("INSERT INTO metadata(key,value) VALUES ('published_revision', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(id);
  }
  function getPublishedRevision() {
    const row = db.prepare("SELECT value FROM metadata WHERE key = 'published_revision'").get();
    return row ? getRevision(row.value) : null;
  }
  function listRevisions() {
    return db.prepare("SELECT id FROM revisions ORDER BY created_at, rowid").all().map(({ id }) => getRevision(id));
  }
  function exportState() {
    return {
      formatVersion: STATE_FORMAT_VERSION, schemaVersion: DATABASE_SCHEMA_VERSION,
      publishedRevisionId: getPublishedRevision()?.id ?? null,
      revisions: listRevisions(), submissions: listSubmissions(),
      metadata: db.prepare("SELECT key, value FROM metadata ORDER BY key").all().map((row) => ({ ...row })),
    };
  }
  function importState(state) {
    if (state?.formatVersion !== STATE_FORMAT_VERSION || state.schemaVersion !== DATABASE_SCHEMA_VERSION || !Array.isArray(state.revisions) || !Array.isArray(state.submissions)) {
      throw new Error("Unsupported state export format");
    }
    if (db.prepare("SELECT count(*) AS n FROM revisions").get().n || db.prepare("SELECT count(*) AS n FROM submissions").get().n || db.prepare("SELECT count(*) AS n FROM metadata").get().n) {
      throw new Error("Import requires an empty database");
    }
    return transaction(db, () => {
      for (const revision of state.revisions) createRevision(revision.catalog, revision.files, revision);
      for (const submission of state.submissions) saveSubmission(submission);
      for (const { key, value } of state.metadata ?? []) db.prepare("INSERT INTO metadata VALUES (?, ?)").run(key, value);
      if (state.publishedRevisionId) setPublishedRevision(state.publishedRevisionId);
      return exportState();
    });
  }
  function integrityCheck() {
    const results = db.prepare("PRAGMA integrity_check").all();
    if (results.length !== 1 || results[0].integrity_check !== "ok") throw new Error("SQLite integrity check failed");
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("SQLite foreign key check failed");
    for (const revision of listRevisions()) validateRevisionCatalog(revision.catalog, revision.files);
    const published = db.prepare("SELECT value FROM metadata WHERE key = 'published_revision'").get();
    if (published && !getRevision(published.value)) throw new Error("Published revision missing");
    return true;
  }
  return { db, dataDir: directory, dbPath, close: () => db.close(), getRevision, createRevision, getPublishedRevision, setPublishedRevision, listRevisions, getSubmission, saveSubmission, updateSubmission, listSubmissions, exportState, importState, integrityCheck };
}
