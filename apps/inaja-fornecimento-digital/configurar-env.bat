@echo off
chcp 65001 >nul
title Banco local - Inaja

cd /d "%~dp0"

echo.
echo  ========================================
echo   Banco de dados LOCAL
echo  ========================================
echo.
echo  Este projeto NAO usa mais Supabase na nuvem.
echo  Nao e necessario criar arquivo .env.
echo.
echo  Os dados ficam no proprio projeto:
echo    data\inaja.sqlite   - banco SQLite
echo    data\uploads\       - anexos
echo.
echo  Para iniciar: rodar.bat   ou   npm run dev
echo.
echo  Usuarios: aleksandro, maicon, luana
echo  (cada um cria a senha no primeiro acesso)
echo.
pause
