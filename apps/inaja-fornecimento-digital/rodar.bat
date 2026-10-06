@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Inaja Fornecimento Digital - Inicializacao
cd /d "%~dp0"

cls
echo.
echo  +------------------------------------------------------------+
echo  ^|              INAJA FORNECIMENTO DIGITAL                 ^|
echo  ^|       Inicializacao segura do sistema local             ^|
echo  +------------------------------------------------------------+
echo.
echo  Pasta: %CD%
echo  Banco: data\inaja.sqlite
echo.

call :info "Verificando requisitos do ambiente"
where node >nul 2>&1 || goto :node_missing
where npm >nul 2>&1 || goto :npm_missing
call :ok "Node.js e npm encontrados"
echo        Node: 
node --version
echo        npm:  
call npm --version

if not exist "package.json" goto :package_missing
if not exist "package-lock.json" goto :lock_missing
call :ok "Arquivos do projeto encontrados"

if not exist "node_modules\.bin\vite.cmd" (
    call :info "Dependencias ausentes - instalando (isso pode levar alguns minutos)"
    call npm install --legacy-peer-deps
    if errorlevel 1 goto :install_error
    call :ok "Dependencias instaladas"
) else (
    call :ok "Dependencias ja estao prontas"
)

if /I "%~1"=="verificar" goto :precheck
if /I "%~1"=="--verificar" goto :precheck

call :info "Inicio rapido: verificacoes completas foram puladas"
echo        Para validar antes de iniciar, use: rodar.bat verificar
goto :start_server

:precheck
echo.
echo  [ PRE-CHECK ] Validando o sistema antes de iniciar
call :info "Checando TypeScript"
call npm run typecheck
if errorlevel 1 goto :precheck_error
call :ok "Checando TypeScript concluido"

call :info "Checando padrao de codigo"
call npm run lint
if errorlevel 1 goto :precheck_error
call :ok "Checando padrao de codigo concluido"

call :info "Executando testes automatizados"
call npm test
if errorlevel 1 goto :precheck_error
call :ok "Testes automatizados concluidos"

call :info "Gerando build de verificacao"
call npm run build
if errorlevel 1 goto :precheck_error
call :ok "Build de verificacao concluido"

echo.
call :ok "Sistema validado com sucesso"

:start_server
call :info "Liberando a porta 8001 de processos anteriores"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 "') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul
call :ok "Porta 8001 pronta"

echo.
echo  +------------------------------------------------------------+
echo  ^|  SISTEMA PRONTO                                           ^|
echo  ^|  Acesse: http://localhost:8001/                          ^|
echo  +------------------------------------------------------------+
echo.
echo  Usuarios: aleksandro (admin), luana e maicon
echo  Backup: acesse o modulo Backup dentro do sistema.
echo  Pressione Ctrl+C para encerrar o servidor.
echo.

call npm run dev:integrado
if errorlevel 1 goto :server_error
exit /b 0

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
echo  Instale o Node.js em https://nodejs.org/ e execute novamente.
goto :stop

:npm_missing
call :fail "npm nao encontrado"
echo  Reinstale o Node.js e execute novamente.
goto :stop

:package_missing
call :fail "package.json nao encontrado - esta nao parece ser a pasta do projeto"
goto :stop

:lock_missing
call :fail "package-lock.json nao encontrado"
goto :stop

:install_error
call :fail "Falha ao instalar as dependencias"
goto :stop

:precheck_error
echo.
call :fail "O sistema nao foi iniciado porque o pre-check falhou"
echo  Corrija os erros exibidos acima e execute este arquivo novamente.
goto :stop

:server_error
echo.
call :fail "O servidor foi encerrado com erro"
goto :stop

:stop
echo.
pause
exit /b 1
