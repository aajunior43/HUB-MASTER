@echo off
chcp 65001 >nul
title Buscador de Grupos - Interface Gráfica

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  🔍 BUSCADOR DE GRUPOS E COMUNIDADES - GUI                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🚀 Iniciando interface gráfica...
echo.

python main_gui.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erro ao executar o programa!
    echo.
    echo Possíveis soluções:
    echo   1. Verifique se o Python está instalado
    echo   2. Instale as dependências: pip install -r requirements.txt
    echo.
)

pause
