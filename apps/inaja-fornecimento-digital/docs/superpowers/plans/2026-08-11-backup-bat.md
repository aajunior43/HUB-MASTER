# Windows Backup Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um `backup.bat` profissional que execute o backup existente por duplo clique, informe sucesso ou erro e preserve o código de saída.

**Architecture:** `backup.bat` será apenas um adaptador de interface para Windows e chamará `npm run backup`, sem duplicar a implementação de backup. Um teste Node isolará o `.bat` em diretórios temporários e substituirá `node` e `npm` por comandos controlados para validar os caminhos de sucesso e falha sem tocar nos dados reais.

**Tech Stack:** Windows Batch (`cmd.exe`), Node.js 22, `node:test`, PowerShell para verificação de integração.

## Global Constraints

- Criar `backup.bat` na raiz do projeto.
- Permitir execução por duplo clique e manter a janela aberta com `pause`.
- Reutilizar exclusivamente `npm run backup`; não duplicar a rotina de cópia.
- Verificar Node.js, npm, `package.json` e `scripts/backup-db.mjs` antes de executar.
- Preservar o código de saída de `npm run backup`.
- Não alterar nem remover backups anteriores.
- Seguir o padrão visual e operacional de `rodar.bat`.

---

### Task 1: Lançador de backup e testes de regressão

**Files:**
- Create: `backup.bat`
- Create: `scripts/backup-bat.test.mjs`
- Modify: `.gitignore`
- Reference: `rodar.bat`
- Reference: `scripts/backup-db.mjs`

**Interfaces:**
- Consumes: script npm `backup`, definido como `node scripts/backup-db.mjs` em `package.json`.
- Produces: comando Windows `backup.bat`, sem argumentos obrigatórios, com código de saída `0` no sucesso e o código de `npm` na falha.

- [x] **Step 1: Escrever os testes que inicialmente falham**

Criar `scripts/backup-bat.test.mjs`:

```js
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
```

- [x] **Step 2: Executar os testes e confirmar o estado vermelho**

Run: `node --test scripts/backup-bat.test.mjs`

Expected: FAIL porque `backup.bat` ainda não existe e `copyFileSync` retorna `ENOENT`.

- [x] **Step 3: Implementar o lançador mínimo completo**

Criar `backup.bat`:

```bat
@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Inaja Fornecimento Digital - Backup
cd /d "%~dp0"

cls
echo.
echo  +------------------------------------------------------------+
echo  ^|              INAJA FORNECIMENTO DIGITAL                 ^|
echo  ^|                  BACKUP LOCAL SEGURO                    ^|
echo  +------------------------------------------------------------+
echo.
echo  Pasta: %CD%
echo  Origem: data\inaja.sqlite e data\uploads
echo  Destino: data\backups
echo.

call :info "Verificando requisitos do ambiente"
where node >nul 2>&1 || goto :node_missing
where npm >nul 2>&1 || goto :npm_missing
if not exist "package.json" goto :package_missing
if not exist "scripts\backup-db.mjs" goto :script_missing
call :ok "Ambiente pronto"

echo.
call :info "Criando uma nova copia de seguranca"
echo.
call npm run backup
set "BACKUP_EXIT=%ERRORLEVEL%"
if not "%BACKUP_EXIT%"=="0" goto :backup_error

echo.
call :ok "BACKUP CONCLUIDO COM SUCESSO"
echo  Os arquivos foram gravados em data\backups.
set "FINAL_EXIT=0"
goto :finish

:info
echo  [ ... ] %~1
exit /b 0

:ok
echo  [  OK ] %~1
exit /b 0

:fail
echo  [ERRO ] %~1
exit /b 0

:node_missing
call :fail "Node.js nao encontrado"
echo  Instale o Node.js em https://nodejs.org/ e tente novamente.
set "FINAL_EXIT=1"
goto :finish

:npm_missing
call :fail "npm nao encontrado"
echo  Reinstale o Node.js e tente novamente.
set "FINAL_EXIT=1"
goto :finish

:package_missing
call :fail "package.json nao encontrado"
echo  Execute este arquivo dentro da pasta principal do projeto.
set "FINAL_EXIT=1"
goto :finish

:script_missing
call :fail "scripts\backup-db.mjs nao encontrado"
echo  A rotina de backup do projeto esta incompleta.
set "FINAL_EXIT=1"
goto :finish

:backup_error
call :fail "Falha ao criar o backup"
echo  Consulte a mensagem acima para identificar a causa.
set "FINAL_EXIT=%BACKUP_EXIT%"
goto :finish

:finish
echo.
echo  Pressione qualquer tecla para fechar esta janela.
pause >nul
exit /b %FINAL_EXIT%
```

Adicionar ao bloco de artefatos locais de `.gitignore`:

```gitignore
data/backups/
```

Isso impede que cópias integrais do banco e dos uploads sejam adicionadas ao Git por engano.

- [x] **Step 4: Executar os testes e confirmar o estado verde**

Run: `node --test scripts/backup-bat.test.mjs`

Expected: PASS, `3` testes aprovados e `0` falhas.

- [x] **Step 5: Verificar uma execução real do backup**

Executar no PowerShell, a partir da raiz do repositório:

```powershell
$antes = @(Get-ChildItem data\backups -Directory -ErrorAction SilentlyContinue).Count
node --input-type=module -e "import { spawnSync } from 'node:child_process'; const result = spawnSync('cmd.exe', ['/d', '/c', 'backup.bat'], { cwd: process.cwd(), encoding: 'utf8', input: '\r\n' }); if (result.stdout) process.stdout.write(result.stdout); if (result.stderr) process.stderr.write(result.stderr); process.exit(result.status ?? 1);"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$pastas = @(Get-ChildItem data\backups -Directory -ErrorAction Stop)
if ($pastas.Count -le $antes) { throw "Nenhum novo backup foi criado" }
$ultimo = $pastas | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not (Test-Path (Join-Path $ultimo.FullName "inaja.sqlite"))) { throw "Banco ausente no backup" }
Write-Output "Backup verificado: $($ultimo.FullName)"
```

Expected: código `0`, mensagem `BACKUP CONCLUIDO COM SUCESSO` e caminho do novo backup contendo `inaja.sqlite`.

- [x] **Step 6: Executar as verificações finais**

Run: `node --test scripts/backup-bat.test.mjs`

Expected: PASS, `3` testes aprovados e `0` falhas.

Run: `git diff --check`

Expected: código `0` e nenhuma mensagem de erro.

Run: `git status --short`

Expected: somente `.gitignore`, `backup.bat` e `scripts/backup-bat.test.mjs` como alterações versionáveis; `data/backups/` deve aparecer como ignorado.

- [x] **Step 7: Commitar a implementação**

```powershell
git add .gitignore backup.bat scripts/backup-bat.test.mjs
git commit -m "feat: adicionar lançador de backup para Windows"
```
