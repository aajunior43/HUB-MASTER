@echo off
chcp 65001 > nul
title BUSCADOR DE PROCESSOS JUDICIAIS - CLI
color 0E

echo ================================================================================
echo   BUSCADOR DE PROCESSOS JUDICIAIS - Interface de Linha de Comando (CLI)
echo   Busca processos por CPF ou CNPJ em tribunais brasileiros
echo ================================================================================
echo.
echo 🚀 Iniciando o script Python...
echo.

python main.py

echo.
pause
