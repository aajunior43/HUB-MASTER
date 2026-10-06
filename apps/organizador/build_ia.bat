@echo off
chcp 65001 > nul
echo ========================================
echo   RENOMER IA - Build Executável com IA
echo ========================================
echo.

:: Verifica Python
python --version > nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python não encontrado!
    pause
    exit /b 1
)

:: Instala dependências
echo [1/3] Instalando dependências...
pip install --quiet PyPDF2 google-generativeai pyinstaller

:: Limpa builds anteriores
echo [2/3] Limpando builds anteriores...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist RENOMER_IA.spec del RENOMER_IA.spec

:: Cria executável
echo [3/3] Criando executável...
pyinstaller --onefile --windowed --name RENOMER_IA --clean --noconfirm renomer_ia.py

if exist "dist\RENOMER_IA.exe" (
    echo.
    echo ========================================
    echo   BUILD CONCLUÍDO COM SUCESSO!
    echo ========================================
    echo.
    echo Executável: dist\RENOMER_IA.exe
    echo.
    echo IMPORTANTE:
    echo - Você precisa de uma API key do Google Gemini
    echo - Obtenha em: https://aistudio.google.com/apikey
    echo - É gratuito!
    echo.
) else (
    echo.
    echo [ERRO] Falha ao criar executável!
)

pause
