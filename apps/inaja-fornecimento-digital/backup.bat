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
