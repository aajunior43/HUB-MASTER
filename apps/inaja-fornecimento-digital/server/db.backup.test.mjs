import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync, symlinkSync, truncateSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runRpc, migrate } from "./db.mjs";
import {
  createBackup,
  createEncryptedBackupArchive,
  removeEncryptedBackupArchive,
  validateEncryptedBackupArchive,
  listBackups,
  getBackupStatus,
  deleteBackup,
  integrityCheck,
  stamp,
} from "./backup.mjs";
import { BlobReader, Uint8ArrayWriter, ZipReader, configure } from "@zip.js/zip.js";

configure({ useWebWorkers: false });

function freshDb(admin = true) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  const id = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, ?, 1)").run(
    id,
    admin ? "admin" : "user",
    admin ? 1 : 0,
  );
  return db;
}

describe("backup.mjs (filesystem)", () => {
  let dataDir;
  beforeEach(() => {
    dataDir = mkdtempSync(path.join(tmpdir(), "inaja-bk-"));
    writeFileSync(path.join(dataDir, "inaja.sqlite"), "sqlite-fake");
    mkdirSync(path.join(dataDir, "uploads"), { recursive: true });
    writeFileSync(path.join(dataDir, "uploads", "a.txt"), "anexo");
  });
  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("createBackup copia sqlite e uploads", () => {
    const r = createBackup({ dataDir, id: "2026-07-18_120000" });
    assert.equal(r.id, "2026-07-18_120000");
    assert.ok(existsSync(path.join(dataDir, "backups", r.id, "inaja.sqlite")));
    assert.ok(existsSync(path.join(dataDir, "backups", r.id, "uploads", "a.txt")));
    assert.ok(r.bytes > 0);
    assert.ok(r.files.includes("inaja.sqlite"));
  });

  it("listBackups e status refletem o backup", () => {
    createBackup({ dataDir, id: "2026-07-18_120000" });
    const list = listBackups({ dataDir });
    assert.equal(list.length, 1);
    assert.equal(list[0].id, "2026-07-18_120000");
    assert.equal(list[0].hasDb, true);
    const st = getBackupStatus({ dataDir });
    assert.equal(st.sqlite.exists, true);
    assert.equal(st.uploads.files, 1);
    assert.equal(st.backups.total, 1);
    assert.equal(st.backups.last.id, "2026-07-18_120000");
  });

  it("deleteBackup remove a pasta", () => {
    createBackup({ dataDir, id: "2026-07-18_120000" });
    deleteBackup("2026-07-18_120000", { dataDir });
    assert.equal(listBackups({ dataDir }).length, 0);
  });

  it("rejeita id inválido", () => {
    assert.throws(() => createBackup({ dataDir, id: "../evil" }), /inválido/i);
    assert.throws(() => deleteBackup("..", { dataDir }), /inválido/i);
  });

  it("createBackup recusa upload simbólico sem copiar o destino", (t) => {
    const outside = path.join(dataDir, "fora.txt");
    const link = path.join(dataDir, "uploads", "link.txt");
    writeFileSync(outside, "nao copiar");
    try {
      symlinkSync(outside, link, "file");
    } catch (error) {
      if (error?.code === "EPERM") {
        t.skip("Windows session does not permit symbolic-link fixtures");
        return;
      }
      throw error;
    }

    assert.throws(
      () => createBackup({ dataDir, id: "2026-07-18_130000" }),
      /links simbólicos/i,
    );
    assert.equal(existsSync(path.join(dataDir, "backups", "2026-07-18_130000", "uploads", "link.txt")), false);
  });

  it("createBackup recusa troca para link depois da validação", (t) => {
    const upload = path.join(dataDir, "uploads", "troca.txt");
    const outside = path.join(dataDir, "fora-troca.txt");
    writeFileSync(upload, "conteudo interno");
    writeFileSync(outside, "conteudo externo");
    try {
      symlinkSync(outside, path.join(dataDir, "probe-link.txt"), "file");
      rmSync(path.join(dataDir, "probe-link.txt"), { force: true });
    } catch (error) {
      if (error?.code === "EPERM") {
        t.skip("Windows session does not permit symbolic-link fixtures");
        return;
      }
      throw error;
    }

    assert.throws(
      () => createBackup({
        dataDir,
        id: "2026-07-18_140000",
        beforeCopy(sourcePath) {
          if (sourcePath !== upload) return;
          rmSync(upload, { force: true });
          symlinkSync(outside, upload, "file");
        },
      }),
      /alterado|links simbólicos/i,
    );
    assert.equal(existsSync(path.join(dataDir, "backups", "2026-07-18_140000")), false);
  });

  it("stamp tem formato esperado", () => {
    assert.match(stamp(new Date("2026-07-18T12:34:56")), /^2026-07-18_\d{6}$/);
  });
});

describe("backup.mjs (encrypted archive)", () => {
  let dataDir;

  beforeEach(() => {
    dataDir = mkdtempSync(path.join(tmpdir(), "inaja-encrypted-bk-"));
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("creates an AES-256 archive from a real SQLite snapshot and uploads", async () => {
    const source = new DatabaseSync(path.join(dataDir, "inaja.sqlite"));
    source.exec("PRAGMA journal_mode = WAL; CREATE TABLE registros (valor TEXT); INSERT INTO registros VALUES ('preservado');");
    mkdirSync(path.join(dataDir, "uploads"), { recursive: true });
    writeFileSync(path.join(dataDir, "uploads", "anexo.txt"), "conteudo do anexo");

    const archive = await createEncryptedBackupArchive({
      dataDir,
      password: "Senha#Forte2026",
      id: "2026-07-19_120000",
    });

    assert.match(archive.path, /\.zip$/i);
    assert.ok(existsSync(archive.path));
    assert.equal(existsSync(path.join(path.dirname(archive.path), "inaja.sqlite")), false);
    assert.equal(archive.encryption, "aes-256");
    assert.equal(archive.validated, true);
    assert.ok(archive.bytes > 0);

    const reader = new ZipReader(new BlobReader(new Blob([readFileSync(archive.path)])));
    const entries = await reader.getEntries();
    const sqlite = entries.find((entry) => entry.filename === "inaja.sqlite");
    const upload = entries.find((entry) => entry.filename === "uploads/anexo.txt");
    assert.ok(sqlite);
    assert.ok(upload);
    const sqliteBytes = await sqlite.getData(new Uint8ArrayWriter(), { password: "Senha#Forte2026" });
    const uploadBytes = await upload.getData(new Uint8ArrayWriter(), { password: "Senha#Forte2026" });
    await assert.rejects(
      sqlite.getData(new Uint8ArrayWriter(), { password: "senha-incorreta" }),
      /password|signature|authentication/i,
    );
    await reader.close();
    writeFileSync(path.join(dataDir, "restaurado.sqlite"), sqliteBytes);
    const restored = new DatabaseSync(path.join(dataDir, "restaurado.sqlite"), { readOnly: true });
    assert.equal(restored.prepare("SELECT valor FROM registros").get().valor, "preservado");
    assert.equal(integrityCheck(restored).ok, true);
    restored.close();
    assert.equal(new TextDecoder().decode(uploadBytes), "conteudo do anexo");
    source.close();
    removeEncryptedBackupArchive(archive);
    assert.equal(existsSync(archive.path), false);
  });

  it("rejects missing archive passwords", async () => {
    await assert.rejects(
      createEncryptedBackupArchive({ dataDir, password: "", id: "2026-07-19_120000" }),
      /senha/i,
    );
  });

  it("cleans temporary state when no SQLite source is present", async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "inaja-archive-temp-"));
    await assert.rejects(
      createEncryptedBackupArchive({ dataDir, password: "Senha#Forte2026", tempRoot }),
      /banco de dados/i,
    );
    assert.deepEqual(readdirSync(tempRoot), []);
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("rejects uploads larger than the archive input limit", async () => {
    const source = new DatabaseSync(path.join(dataDir, "inaja.sqlite"));
    source.exec("CREATE TABLE registros (valor TEXT);");
    source.close();
    const upload = path.join(dataDir, "uploads", "grande.bin");
    mkdirSync(path.dirname(upload), { recursive: true });
    writeFileSync(upload, "");
    truncateSync(upload, 21 * 1024 * 1024);

    await assert.rejects(
      createEncryptedBackupArchive({ dataDir, password: "Senha#Forte2026" }),
      /limite de tamanho/i,
    );
  });

  it("uses a trusted cleanup token for archives made in a custom temporary root", async () => {
    const source = new DatabaseSync(path.join(dataDir, "inaja.sqlite"));
    source.exec("CREATE TABLE registros (valor TEXT);");
    source.close();
    const tempRoot = mkdtempSync(path.join(tmpdir(), "inaja-custom-archive-"));
    const archive = await createEncryptedBackupArchive({ dataDir, password: "Senha#Forte2026", tempRoot });

    assert.throws(() => removeEncryptedBackupArchive(archive.path), /inválido/i);
    removeEncryptedBackupArchive(archive.path, archive.cleanupToken);
    assert.equal(existsSync(archive.path), false);
    assert.deepEqual(readdirSync(tempRoot), []);
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("rejects a tampered encrypted archive during production validation", async () => {
    const source = new DatabaseSync(path.join(dataDir, "inaja.sqlite"));
    source.exec("CREATE TABLE registros (valor TEXT); INSERT INTO registros VALUES ('ok');");
    source.close();
    const archive = await createEncryptedBackupArchive({ dataDir, password: "Senha#Forte2026" });
    const bytes = readFileSync(archive.path);
    bytes.fill(0);
    writeFileSync(archive.path, bytes);

    await assert.rejects(
      validateEncryptedBackupArchive(archive.path, "Senha#Forte2026", archive.uploads),
      /arquivo criptografado inválido/i,
    );
    removeEncryptedBackupArchive(archive);
  });

  it("rejects encrypted archives over the final Telegram size limit", async () => {
    const source = new DatabaseSync(path.join(dataDir, "inaja.sqlite"));
    source.exec("CREATE TABLE registros (valor TEXT);");
    source.close();
    const archive = await createEncryptedBackupArchive({ dataDir, password: "Senha#Forte2026" });
    appendFileSync(archive.path, Buffer.alloc(46 * 1024 * 1024));

    await assert.rejects(
      validateEncryptedBackupArchive(archive.path, "Senha#Forte2026", archive.uploads),
      /excede o limite/i,
    );
    removeEncryptedBackupArchive(archive);
  });

  it("archives only the private upload copy when the source is replaced after staging", async (t) => {
    const source = new DatabaseSync(path.join(dataDir, "inaja.sqlite"));
    source.exec("CREATE TABLE registros (valor TEXT);");
    source.close();
    const upload = path.join(dataDir, "uploads", "original.txt");
    const external = path.join(dataDir, "externo.txt");
    mkdirSync(path.dirname(upload), { recursive: true });
    writeFileSync(upload, "conteudo interno");
    writeFileSync(external, "conteudo externo");
    const probe = path.join(dataDir, "probe-link.txt");
    try {
      symlinkSync(external, probe, "file");
      rmSync(probe, { force: true });
    } catch (error) {
      if (error?.code === "EPERM") {
        t.skip("Windows session does not permit symbolic-link race fixtures");
        return;
      }
      throw error;
    }

    const archive = await createEncryptedBackupArchive({
      dataDir,
      password: "Senha#Forte2026",
      beforeArchive() {
        rmSync(upload, { force: true });
        symlinkSync(external, upload, "file");
      },
    });
    const reader = new ZipReader(new BlobReader(new Blob([readFileSync(archive.path)])));
    const entries = await reader.getEntries();
    const entry = entries.find((item) => item.filename === "uploads/original.txt");
    assert.ok(entry);
    const contents = await entry.getData(new Uint8ArrayWriter(), { password: "Senha#Forte2026" });
    await reader.close();
    assert.equal(new TextDecoder().decode(contents), "conteudo interno");
    removeEncryptedBackupArchive(archive);
  });

  it("rejects symbolic-link uploads instead of archiving paths outside data", async (t) => {
    const source = new DatabaseSync(path.join(dataDir, "inaja.sqlite"));
    source.exec("CREATE TABLE registros (valor TEXT);");
    source.close();
    const external = path.join(dataDir, "fora.txt");
    const link = path.join(dataDir, "uploads", "link.txt");
    mkdirSync(path.dirname(link), { recursive: true });
    writeFileSync(external, "fora do backup");
    try {
      symlinkSync(external, link, "file");
    } catch (error) {
      if (error?.code === "EPERM") {
        t.skip("Windows session does not permit symbolic-link fixtures");
        return;
      }
      throw error;
    }

    await assert.rejects(
      createEncryptedBackupArchive({ dataDir, password: "Senha#Forte2026" }),
      /links simbólicos/i,
    );
  });

  it("rejects a staged upload swapped to a symbolic link after validation", async (t) => {
    const source = new DatabaseSync(path.join(dataDir, "inaja.sqlite"));
    source.exec("CREATE TABLE registros (valor TEXT);");
    source.close();
    const upload = path.join(dataDir, "uploads", "troca.txt");
    const outside = path.join(dataDir, "fora-troca.txt");
    mkdirSync(path.dirname(upload), { recursive: true });
    writeFileSync(upload, "conteudo interno");
    writeFileSync(outside, "conteudo externo");
    try {
      symlinkSync(outside, path.join(dataDir, "probe-link.txt"), "file");
      rmSync(path.join(dataDir, "probe-link.txt"), { force: true });
    } catch (error) {
      if (error?.code === "EPERM") {
        t.skip("Windows session does not permit symbolic-link fixtures");
        return;
      }
      throw error;
    }

    await assert.rejects(
      createEncryptedBackupArchive({
        dataDir,
        password: "Senha#Forte2026",
        beforeStageCopy(sourcePath) {
          if (sourcePath !== upload) return;
          rmSync(upload, { force: true });
          symlinkSync(outside, upload, "file");
        },
      }),
      /alterado|links simbólicos/i,
    );
  });
});

describe("backup RPC auth", () => {
  it("recusa não-admin", async () => {
    const db = freshDb(false);
    for (const fn of ["backup_status", "backup_listar", "backup_criar", "backup_integridade"]) {
      const r = await runRpc(db, fn, { _caller: "user" });
      assert.equal(r.error?.code, "FORBIDDEN", fn);
    }
  });

  it("recusa sem caller", async () => {
    const db = freshDb(true);
    const r = await runRpc(db, "backup_status", {});
    assert.equal(r.error?.code, "FORBIDDEN");
  });

  it("admin obtém status e integridade", async () => {
    const db = freshDb(true);
    const st = await runRpc(db, "backup_status", { _caller: "admin" });
    assert.equal(st.error, null);
    assert.ok(st.data.sqlite);
    assert.ok("total" in st.data.backups);

    const ig = await runRpc(db, "backup_integridade", { _caller: "admin" });
    assert.equal(ig.error, null);
    assert.equal(ig.data.ok, true);
  });

  it("integrityCheck ok em db migrado", () => {
    const db = freshDb(true);
    const r = integrityCheck(db);
    assert.equal(r.ok, true);
  });
});
