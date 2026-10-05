/**
 * Backup local de data/inaja.sqlite (+ wal/shm) e data/uploads/.
 * Usado pelo CLI (npm run backup) e pelas RPCs backup_* no UI.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  lstatSync,
  fstatSync,
  openSync,
  closeSync,
  readSync,
  writeSync,
  constants,
  rmSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createWriteStream } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { Transform } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import archiver from "archiver";
import ZipEncrypted from "archiver-zip-encrypted";
import { BlobReader, Uint8ArrayWriter, ZipReader, configure } from "@zip.js/zip.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_DATA_DIR = path.join(root, "data");
const execFileAsync = promisify(execFile);
const GITHUB_BACKUP_BRANCH = "backups";
const MAX_GITHUB_BACKUP_BYTES = 90 * 1024 * 1024;

const STAMP_RE = /^\d{4}-\d{2}-\d{2}_\d{6}$/;
const TEMP_ARCHIVE_PREFIX = "inaja-telegram-backup-";
const MAX_ARCHIVE_FILES = 10_000;
const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 45 * 1024 * 1024;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 45 * 1024 * 1024;

let encryptedZipRegistered = false;
const encryptedArchiveCleanup = new Map();

configure({ useWebWorkers: false });

export function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

function fileSize(p) {
  try {
    if (!existsSync(p)) return 0;
    return statSync(p).size;
  } catch {
    return 0;
  }
}

function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else total += st.size;
    }
  };
  try {
    walk(dir);
  } catch {
    /* ignore */
  }
  return total;
}

function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else n += 1;
    }
  };
  try {
    walk(dir);
  } catch {
    /* ignore */
  }
  return n;
}

function sameFile(first, second) {
  return first.dev === second.dev && first.ino === second.ino && first.size === second.size && first.mtimeMs === second.mtimeMs && first.ctimeMs === second.ctimeMs;
}

function copyRegularFile(src, dest, beforeCopy) {
  const initial = lstatSync(src);
  if (initial.isSymbolicLink() || !initial.isFile()) {
    throw archiveError("Arquivo de backup inválido", "FILE_UNSAFE");
  }
  if (typeof beforeCopy === "function") beforeCopy(src);
  let sourceFd;
  try {
    sourceFd = openSync(src, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  } catch (error) {
    if (error?.code === "ELOOP" || error?.code === "EMLINK") {
      throw archiveError("Backup não aceita links simbólicos", "FILE_UNSAFE");
    }
    if (error?.code === "ENOENT") {
      throw archiveError("Arquivo alterado durante a preparação do backup", "FILE_UNSAFE");
    }
    throw error;
  }
  let destinationFd = null;
  try {
    const pathAfterOpen = lstatSync(src);
    const opened = fstatSync(sourceFd);
    if (pathAfterOpen.isSymbolicLink() || !pathAfterOpen.isFile() || !sameFile(initial, pathAfterOpen) || !sameFile(initial, opened)) {
      throw archiveError("Arquivo alterado durante a preparação do backup", "FILE_UNSAFE");
    }
    mkdirSync(path.dirname(dest), { recursive: true });
    destinationFd = openSync(dest, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let position = 0;
    for (;;) {
      const read = readSync(sourceFd, buffer, 0, buffer.length, position);
      if (read === 0) break;
      let written = 0;
      while (written < read) {
        written += writeSync(destinationFd, buffer, written, read - written);
      }
      position += read;
    }
    if (!sameFile(opened, fstatSync(sourceFd))) {
      throw archiveError("Arquivo alterado durante a preparação do backup", "FILE_UNSAFE");
    }
  } catch (error) {
    rmSync(dest, { force: true });
    throw error;
  } finally {
    if (destinationFd !== null) closeSync(destinationFd);
    closeSync(sourceFd);
  }
}

function copyIfExists(src, dest, beforeCopy) {
  if (!existsSync(src)) return false;
  const source = lstatSync(src);
  if (source.isSymbolicLink()) {
    throw archiveError("Backup não aceita links simbólicos", "FILE_UNSAFE");
  }
  if (!source.isFile()) {
    throw archiveError("Arquivo de backup inválido", "FILE_UNSAFE");
  }
  copyRegularFile(src, dest, beforeCopy);
  return true;
}

function copyTree(srcDir, destDir, beforeCopy) {
  if (!existsSync(srcDir)) return 0;
  let n = 0;
  mkdirSync(destDir, { recursive: true });
  const walk = (dir, rel = "") => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const r = path.join(rel, name);
      const entry = assertArchiveUploadPath(srcDir, full);
      const source = lstatSync(full);
      if (source.isSymbolicLink()) {
        throw archiveError("Backup não aceita links simbólicos em uploads", "FILE_UNSAFE");
      }
      const destination = path.resolve(destDir, entry);
      if (!isWithin(path.resolve(destDir), destination)) {
        throw archiveError("Caminho de upload inválido", "FILE_UNSAFE");
      }
      if (source.isDirectory()) {
        mkdirSync(destination, { recursive: true });
        walk(full, r);
      } else if (source.isFile()) {
        mkdirSync(path.dirname(destination), { recursive: true });
        copyRegularFile(full, destination, beforeCopy);
        n += 1;
      } else {
        throw archiveError("Arquivo de upload inválido", "FILE_UNSAFE");
      }
    }
  };
  walk(srcDir);
  return n;
}

function archiveError(message, code) {
  return Object.assign(new Error(message), { code });
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function assertArchiveUploadPath(uploadsRoot, fullPath) {
  const resolvedRoot = path.resolve(uploadsRoot);
  const resolvedPath = path.resolve(fullPath);
  if (!isWithin(resolvedRoot, resolvedPath)) {
    throw archiveError("Caminho de upload inválido", "FILE_UNSAFE");
  }
  const entry = path.relative(resolvedRoot, resolvedPath).replace(/\\/g, "/");
  if (
    !entry ||
    entry.length > 240 ||
    entry.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw archiveError("Caminho de upload inválido", "FILE_UNSAFE");
  }
  return entry;
}

function stageArchiveUploads(uploadsDir, workDir, beforeCopy) {
  if (!existsSync(uploadsDir)) return { files: [], bytes: 0 };
  const files = [];
  let bytes = 0;
  const stagingDir = path.join(workDir, "uploads");
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      const entry = assertArchiveUploadPath(uploadsDir, full);
      const info = lstatSync(full);
      if (info.isSymbolicLink()) {
        throw archiveError("Backup não aceita links simbólicos em uploads", "FILE_UNSAFE");
      }
      if (info.isDirectory()) {
        walk(full);
      } else if (info.isFile()) {
        if (info.size > MAX_UPLOAD_FILE_BYTES) {
          throw archiveError("Upload excede o limite de tamanho do backup", "FILE_SIZE_LIMIT");
        }
        const privatePath = path.join(stagingDir, entry);
        copyRegularFile(full, privatePath, beforeCopy);
        const staged = lstatSync(privatePath);
        if (!staged.isFile() || staged.size !== info.size) {
          throw archiveError("Upload alterado durante a preparação do backup", "FILE_UNSAFE");
        }
        files.push({ full: privatePath, entry: `uploads/${entry}`, bytes: staged.size });
        bytes += info.size;
        if (files.length > MAX_ARCHIVE_FILES) {
          throw archiveError("Uploads excedem o limite de arquivos do backup", "FILE_LIMIT");
        }
      }
    }
  };
  walk(uploadsDir);
  return { files, bytes };
}

function verifyStagedUploads(files) {
  for (const file of files) {
    const info = lstatSync(file.full);
    if (!info.isFile() || info.isSymbolicLink() || info.size !== file.bytes || info.size > MAX_UPLOAD_FILE_BYTES) {
      throw archiveError("Upload temporário inválido", "FILE_UNSAFE");
    }
  }
}

function createSqliteSnapshot(sourcePath, snapshotPath) {
  if (!existsSync(sourcePath)) {
    throw archiveError("Banco de dados não encontrado", "SOURCE_NOT_FOUND");
  }
  const db = new DatabaseSync(sourcePath);
  try {
    const quotedSnapshot = snapshotPath.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${quotedSnapshot}'`);
  } finally {
    db.close();
  }
}

function ensureEncryptedZipFormat() {
  if (encryptedZipRegistered) return;
  archiver.registerFormat("zip-encrypted", ZipEncrypted);
  encryptedZipRegistered = true;
}

function writeEncryptedArchive(destination, password, snapshotPath, uploadFiles) {
  return new Promise((resolve, reject) => {
    ensureEncryptedZipFormat();
    const output = createWriteStream(destination, { flags: "wx" });
    const archive = archiver.create("zip-encrypted", {
      zlib: { level: 8 },
      encryptionMethod: "aes256",
      password,
    });
    let bytes = 0;
    const limiter = new Transform({
      transform(chunk, _encoding, callback) {
        bytes += chunk.length;
        if (bytes > MAX_ARCHIVE_BYTES) {
          callback(archiveError("Arquivo criptografado excede o limite de tamanho", "ARCHIVE_SIZE_LIMIT"));
          return;
        }
        callback(null, chunk);
      },
    });
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      archive.abort();
      limiter.destroy();
      output.destroy();
      reject(error);
    };
    output.on("error", fail);
    archive.on("error", fail);
    limiter.on("error", fail);
    output.on("close", () => {
      if (settled) return;
      settled = true;
      resolve();
    });
    archive.pipe(limiter).pipe(output);
    archive.file(snapshotPath, { name: "inaja.sqlite" });
    for (const upload of uploadFiles) archive.file(upload.full, { name: upload.entry });
    archive.finalize().catch(fail);
  });
}

export async function validateEncryptedBackupArchive(archivePath, password, expectedUploads) {
  try {
    const archiveSize = statSync(archivePath).size;
    if (archiveSize < 1 || archiveSize > MAX_ARCHIVE_BYTES) {
      throw archiveError("Arquivo criptografado excede o limite de tamanho", "ARCHIVE_SIZE_LIMIT");
    }
    const reader = new ZipReader(new BlobReader(new Blob([readFileSync(archivePath)])));
    try {
      const entries = await reader.getEntries();
      if (entries.length !== expectedUploads + 1) {
        throw archiveError("Conteúdo do arquivo criptografado inválido", "ARCHIVE_INVALID");
      }
      let totalBytes = 0;
      let sqliteBytes = null;
      for (const entry of entries) {
        const entryName = String(entry.filename || "");
        const allowed = entryName === "inaja.sqlite" || /^uploads\/(?!.*(?:^|\/)\.\.?\/).+/.test(entryName);
        const entrySize = Number(entry.uncompressedSize || 0);
        const entryLimit = entryName === "inaja.sqlite" ? MAX_ARCHIVE_UNCOMPRESSED_BYTES : MAX_UPLOAD_FILE_BYTES;
        if (!allowed || !Number.isSafeInteger(entrySize) || entrySize < 0 || entrySize > entryLimit) {
          throw archiveError("Conteúdo do arquivo criptografado inválido", "ARCHIVE_INVALID");
        }
        totalBytes += entrySize;
        if (totalBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
          throw archiveError("Conteúdo do arquivo criptografado excede o limite", "ARCHIVE_SIZE_LIMIT");
        }
        const contents = await entry.getData(new Uint8ArrayWriter(), { password });
        if (entryName === "inaja.sqlite") sqliteBytes = contents;
      }
      if (!sqliteBytes) throw archiveError("Conteúdo do arquivo criptografado inválido", "ARCHIVE_INVALID");
      const validationPath = path.join(path.dirname(archivePath), "validacao.sqlite");
      try {
        writeFileSync(validationPath, sqliteBytes);
        const db = new DatabaseSync(validationPath, { readOnly: true });
        try {
          if (!integrityCheck(db).ok) {
            throw archiveError("Conteúdo do arquivo criptografado inválido", "ARCHIVE_INVALID");
          }
        } finally {
          db.close();
        }
      } finally {
        rmSync(validationPath, { force: true });
      }
    } finally {
      await reader.close();
    }
  } catch (error) {
    if (error?.code === "ARCHIVE_SIZE_LIMIT") throw error;
    throw archiveError("Arquivo criptografado inválido", "ARCHIVE_INVALID");
  }
}

/**
 * Produz um ZIP temporário interoperável com AES-256 para envio externo.
 * @param {{ dataDir?: string, password: string, id?: string, tempRoot?: string }} opts
 */
export async function createEncryptedBackupArchive(opts) {
  const dataDir = opts?.dataDir || DEFAULT_DATA_DIR;
  const password = String(opts?.password || "");
  if (!password) throw archiveError("Senha do backup obrigatória", "BAD_REQUEST");
  const id = opts?.id || stamp();
  if (!STAMP_RE.test(id)) throw archiveError("ID de backup inválido", "BAD_REQUEST");
  const tempRoot = opts?.tempRoot || tmpdir();
  mkdirSync(tempRoot, { recursive: true });
  const workDir = mkdtempSync(path.join(tempRoot, TEMP_ARCHIVE_PREFIX));
  const snapshotPath = path.join(workDir, "inaja.sqlite");
  const archivePath = path.join(workDir, `inaja-backup-${id}.zip`);
  try {
    const uploads = stageArchiveUploads(path.join(dataDir, "uploads"), workDir, opts?.beforeStageCopy);
    if (typeof opts?.beforeArchive === "function") opts.beforeArchive();
    verifyStagedUploads(uploads.files);
    createSqliteSnapshot(path.join(dataDir, "inaja.sqlite"), snapshotPath);
    const snapshotBytes = statSync(snapshotPath).size;
    if (snapshotBytes + uploads.bytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
      throw archiveError("Conteúdo do backup excede o limite de tamanho", "ARCHIVE_SIZE_LIMIT");
    }
    await writeEncryptedArchive(archivePath, password, snapshotPath, uploads.files);
    await validateEncryptedBackupArchive(archivePath, password, uploads.files.length);
    rmSync(snapshotPath, { force: true });
    rmSync(path.join(workDir, "uploads"), { recursive: true, force: true });
    const cleanupToken = randomBytes(32).toString("base64url");
    encryptedArchiveCleanup.set(cleanupToken, { archivePath: path.resolve(archivePath), workDir });
    return {
      id,
      path: archivePath,
      name: path.basename(archivePath),
      bytes: statSync(archivePath).size,
      uploads: uploads.files.length,
      encryption: "aes-256",
      validated: true,
      cleanupToken,
    };
  } catch (error) {
    rmSync(workDir, { recursive: true, force: true });
    throw error;
  }
}

export function removeEncryptedBackupArchive(archive, cleanupToken) {
  const archivePath = typeof archive === "object" && archive ? archive.path : archive;
  const token = typeof archive === "object" && archive ? archive.cleanupToken : cleanupToken;
  const record = encryptedArchiveCleanup.get(String(token || ""));
  const resolved = path.resolve(String(archivePath || ""));
  if (!record || record.archivePath !== resolved) {
    throw archiveError("Arquivo temporário de backup inválido", "BAD_REQUEST");
  }
  encryptedArchiveCleanup.delete(String(token));
  rmSync(record.workDir, { recursive: true, force: true });
}

/**
 * @param {{ dataDir?: string, id?: string }} [opts]
 */
export function createBackup(opts = {}) {
  const dataDir = opts.dataDir || DEFAULT_DATA_DIR;
  const uploadsDir = path.join(dataDir, "uploads");
  const id = opts.id || stamp();
  if (!STAMP_RE.test(id)) {
    throw Object.assign(new Error("ID de backup inválido"), { code: "BAD_REQUEST" });
  }
  const outDir = path.join(dataDir, "backups", id);
  if (existsSync(outDir)) {
    throw Object.assign(new Error("Backup com este ID já existe"), { code: "EXISTS" });
  }
  mkdirSync(outDir, { recursive: true });

  try {
    const files = [];
    for (const f of ["inaja.sqlite", "inaja.sqlite-wal", "inaja.sqlite-shm"]) {
      if (copyIfExists(path.join(dataDir, f), path.join(outDir, f), opts.beforeCopy)) {
        files.push(f);
      }
    }
    let uploads = 0;
    if (existsSync(uploadsDir)) {
      uploads = copyTree(uploadsDir, path.join(outDir, "uploads"), opts.beforeCopy);
      if (uploads > 0) files.push("uploads/");
    }

    for (const name of readdirSync(dataDir, { withFileTypes: true })) {
      if (name.name === "backups" || name.name === "uploads" || name.name.startsWith("inaja.sqlite")) continue;
      const source = path.join(dataDir, name.name);
      const destination = path.join(outDir, name.name);
      if (name.isDirectory()) {
        const count = copyTree(source, destination, opts.beforeCopy);
        if (count > 0) files.push(`${name.name}/`);
      } else if (name.isFile() && copyIfExists(source, destination, opts.beforeCopy)) {
        files.push(name.name);
      }
    }

    if (files.length === 0) {
      throw Object.assign(new Error("Nenhum arquivo de dados encontrado"), { code: "EMPTY" });
    }

    const bytes = dirSize(outDir);
    return {
      id,
      path: outDir,
      relativePath: path.join("data", "backups", id).replace(/\\/g, "/"),
      files,
      uploads,
      bytes,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    rmSync(outDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * @param {{ dataDir?: string }} [opts]
 */
export function listBackups(opts = {}) {
  const dataDir = opts.dataDir || DEFAULT_DATA_DIR;
  const rootDir = path.join(dataDir, "backups");
  if (!existsSync(rootDir)) return [];
  const items = [];
  for (const name of readdirSync(rootDir)) {
    if (!STAMP_RE.test(name)) continue;
    const full = path.join(rootDir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const hasDb = existsSync(path.join(full, "inaja.sqlite"));
    const hasUploads = existsSync(path.join(full, "uploads"));
    items.push({
      id: name,
      relativePath: path.join("data", "backups", name).replace(/\\/g, "/"),
      bytes: dirSize(full),
      hasDb,
      hasUploads,
      createdAt: st.mtime.toISOString(),
    });
  }
  items.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  return items;
}

async function git(args, cwd) {
  try {
    return await execFileAsync("git", args, { cwd, windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024 });
  } catch (error) {
    const stderr = String(error?.stderr || error?.message || "").replace(/https?:\/\/[^\s@]+@/gi, "https://***@");
    throw Object.assign(new Error(stderr || "Não foi possível comunicar com o GitHub"), { code: "GITHUB" });
  }
}

/**
 * Publica uma cópia já criada em uma branch separada do repositório GitHub.
 * As credenciais são resolvidas pelo Git do servidor (Credential Manager/SSH),
 * nunca pelo navegador.
 */
export async function publishBackupToGitHub(backup, opts = {}) {
  if (!backup?.path || !backup?.id || !existsSync(backup.path)) {
    throw Object.assign(new Error("Backup local inválido"), { code: "BAD_REQUEST" });
  }
  if (Number(backup.bytes || 0) > MAX_GITHUB_BACKUP_BYTES) {
    throw Object.assign(new Error("Backup excede o limite de 90 MB para envio ao GitHub"), { code: "GITHUB_SIZE_LIMIT" });
  }
  const repoDir = opts.repoDir || root;
  const remote = String(opts.remote || (await git(["remote", "get-url", "origin"], repoDir)).stdout || "").trim();
  if (!remote) throw Object.assign(new Error("Repositório GitHub remoto não configurado"), { code: "GITHUB_NOT_CONFIGURED" });
  const workDir = mkdtempSync(path.join(tmpdir(), "inaja-github-backup-"));
  const cloneDir = path.join(workDir, "repo");
  try {
    try {
      await git(["clone", "--depth", "1", "--branch", GITHUB_BACKUP_BRANCH, remote, cloneDir], repoDir);
    } catch {
      rmSync(cloneDir, { recursive: true, force: true });
      await git(["clone", "--depth", "1", remote, cloneDir], repoDir);
      await git(["checkout", "-b", GITHUB_BACKUP_BRANCH], cloneDir);
    }
    const target = path.join(cloneDir, "system-backups", backup.id);
    copyTree(backup.path, target);
    await git(["add", "--", `system-backups/${backup.id}`], cloneDir);
    await git(["-c", "user.name=Inajá Backup", "-c", "user.email=backup@inaja.local", "commit", "-m", `backup: ${backup.id}`], cloneDir);
    try {
      await git(["push", "origin", GITHUB_BACKUP_BRANCH], cloneDir);
    } catch {
      // A branch pode receber outro backup enquanto a cópia é preparada.
      // Reaplica nosso commit sobre a ponta remota sem sobrescrever dados.
      await git(["pull", "--rebase", "origin", GITHUB_BACKUP_BRANCH], cloneDir);
      await git(["push", "origin", GITHUB_BACKUP_BRANCH], cloneDir);
    }
    return { id: backup.id, branch: GITHUB_BACKUP_BRANCH, remote: remote.replace(/https?:\/\/[^\s@]+@/i, "https://***@"), bytes: backup.bytes };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/** Mantém somente os backups mais recentes. */
export function pruneBackups(keep = 30, opts = {}) {
  const limit = Math.max(1, Math.min(365, Number(keep) || 30));
  const backups = listBackups(opts);
  const removed = [];
  for (const backup of backups.slice(limit)) {
    deleteBackup(backup.id, opts);
    removed.push(backup.id);
  }
  return removed;
}

/** Cria uma cópia e aplica a política de retenção. */
export function createManagedBackup(opts = {}) {
  const backup = createBackup(opts);
  const removed = pruneBackups(opts.keep, opts);
  return { ...backup, removed };
}

/**
 * @param {{ dataDir?: string }} [opts]
 */
export function getBackupStatus(opts = {}) {
  const dataDir = opts.dataDir || DEFAULT_DATA_DIR;
  const sqlite = path.join(dataDir, "inaja.sqlite");
  const wal = path.join(dataDir, "inaja.sqlite-wal");
  const shm = path.join(dataDir, "inaja.sqlite-shm");
  const uploadsDir = path.join(dataDir, "uploads");
  const backups = listBackups({ dataDir });
  const last = backups[0] || null;
  return {
    dataDir: dataDir.replace(/\\/g, "/"),
    sqlite: {
      exists: existsSync(sqlite),
      bytes: fileSize(sqlite),
    },
    wal: {
      exists: existsSync(wal),
      bytes: fileSize(wal),
    },
    shm: {
      exists: existsSync(shm),
      bytes: fileSize(shm),
    },
    uploads: {
      files: countFiles(uploadsDir),
      bytes: dirSize(uploadsDir),
    },
    backups: {
      total: backups.length,
      bytes: backups.reduce((s, b) => s + b.bytes, 0),
      last,
    },
  };
}

/**
 * @param {string} id
 * @param {{ dataDir?: string }} [opts]
 */
export function deleteBackup(id, opts = {}) {
  const name = String(id || "").trim();
  if (!STAMP_RE.test(name)) {
    throw Object.assign(new Error("ID de backup inválido"), { code: "BAD_REQUEST" });
  }
  const dataDir = opts.dataDir || DEFAULT_DATA_DIR;
  const full = path.join(dataDir, "backups", name);
  const resolved = path.resolve(full);
  const backupsRoot = path.resolve(dataDir, "backups");
  if (!resolved.startsWith(backupsRoot + path.sep) && resolved !== backupsRoot) {
    throw Object.assign(new Error("Caminho inválido"), { code: "BAD_REQUEST" });
  }
  if (!existsSync(resolved)) {
    throw Object.assign(new Error("Backup não encontrado"), { code: "NOT_FOUND" });
  }
  rmSync(resolved, { recursive: true, force: true });
  return { ok: true, id: name };
}

/** @param {import("node:sqlite").DatabaseSync} db */
export function integrityCheck(db) {
  const rows = db.prepare("PRAGMA integrity_check").all();
  const messages = rows.map((r) => {
    const v = r.integrity_check ?? r["integrity_check"] ?? Object.values(r)[0];
    return String(v);
  });
  const ok = messages.length === 1 && messages[0].toLowerCase() === "ok";
  return { ok, messages };
}
