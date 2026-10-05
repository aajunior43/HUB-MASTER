import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const windowsTest = process.platform === "win32" ? test : test.skip;
const sourceBatch = resolve("backup.bat");

function createFixture({ npmExit = 0, withPackage = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "inaja-backup-bat-"));
  const bin = join(root, "bin");
  mkdirSync(bin);
  mkdirSync(join(root, "scripts"));
  copyFileSync(sourceBatch, join(root, "backup.bat"));
  writeFileSync(join(root, "scripts", "backup-db.mjs"), "");
  if (withPackage) writeFileSync(join(root, "package.json"), "{}");
  writeFileSync(join(bin, "node.cmd"), "@echo off\r\nexit /b 0\r\n");
  writeFileSync(
    join(bin, "npm.cmd"),
    `@echo off\r\n> "%~dp0..\\npm-args.txt" echo %*\r\nexit /b ${npmExit}\r\n`,
  );
  return { root, bin };
}

function runFixture(root, bin) {
  const system32 = join(process.env.SystemRoot, "System32");
  return spawnSync("cmd.exe", ["/d", "/c", "backup.bat"], {
    cwd: root,
    encoding: "utf8",
    input: "\r\n",
    env: {
      ComSpec: process.env.ComSpec,
      PATHEXT: process.env.PATHEXT,
      SystemRoot: process.env.SystemRoot,
      PATH: `${bin}${delimiter}${system32}`,
    },
  });
}

windowsTest("executa npm run backup e informa sucesso", () => {
  const fixture = createFixture();
  try {
    const result = runFixture(fixture.root, fixture.bin);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /BACKUP CONCLUIDO COM SUCESSO/);
    assert.equal(readFileSync(join(fixture.root, "npm-args.txt"), "utf8").trim(), "run backup");
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

windowsTest("preserva o codigo de erro retornado pelo npm", () => {
  const fixture = createFixture({ npmExit: 7 });
  try {
    const result = runFixture(fixture.root, fixture.bin);
    assert.equal(result.status, 7, result.stderr || result.stdout);
    assert.match(result.stdout, /Falha ao criar o backup/);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

windowsTest("explica quando package.json nao existe", () => {
  const fixture = createFixture({ withPackage: false });
  try {
    const result = runFixture(fixture.root, fixture.bin);
    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stdout, /package.json nao encontrado/);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
