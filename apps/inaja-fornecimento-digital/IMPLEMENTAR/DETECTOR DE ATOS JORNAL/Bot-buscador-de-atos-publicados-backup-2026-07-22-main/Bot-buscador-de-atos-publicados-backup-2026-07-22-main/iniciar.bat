@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
title Monitor de Atos - Menu
cd /d "%~dp0"

REM Tesseract / Poppler no PATH (Windows)
set "PATH=C:\Program Files\Tesseract-OCR;C:\Poppler\poppler-24.02.0\Library\bin;C:\poppler\Library\bin;C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin;%PATH%"
set PYTHONUNBUFFERED=1
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
set DEV_RELOAD=0

set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
  echo.
  echo  Ambiente Python nao encontrado:
  echo  %PYTHON_EXE%
  echo  Instale as dependencias com: py -3.14 -m pip install -r requirements.txt
  pause
  exit /b 1
)

"%PYTHON_EXE%" scripts\_menu_cli.py
set ERR=%ERRORLEVEL%
if %ERR% NEQ 0 (
  echo.
  echo  Falha ao abrir o menu. Verifique se o Python esta no PATH.
  echo  Codigo: %ERR%
  pause
)
endlocal
exit /b %ERR%
