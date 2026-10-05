@echo off
chcp 65001 > nul
echo ========================================
echo   RENOMER - Build Executável Portátil
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
pip install --quiet PyPDF2 pyinstaller

:: Limpa builds anteriores
echo [2/3] Limpando builds anteriores...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist RENOMER.spec del RENOMER.spec

:: Cria executável
echo [3/3] Criando executável...
pyinstaller --onefile --windowed --name RENOMER --clean --noconfirm renomer_simples.py

if exist "dist\RENOMER.exe" (
    echo.
    echo ========================================
    echo   BUILD CONCLUÍDO COM SUCESSO!
    echo ========================================
    echo.
    echo Executável: dist\RENOMER.exe
    echo.
    echo Você pode copiar este arquivo para qualquer lugar
    echo e executar sem precisar instalar Python!
    echo.
) else (
    echo.
    echo [ERRO] Falha ao criar executável!
)

pause
