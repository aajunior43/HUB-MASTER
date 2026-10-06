@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules\.bin\vite.cmd" (
    echo Dependencias nao encontradas. Instalando...
    call npm.cmd install
    if errorlevel 1 (
        echo Falha ao instalar as dependencias.
        pause
        exit /b 1
    )
)

echo Iniciando o projeto em http://localhost:8080/
call npm.cmd run dev -- --host 0.0.0.0

pause
