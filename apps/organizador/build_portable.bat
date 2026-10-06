@echo off
echo ========================================
echo RENOMER - Build Executavel Portatil
echo ========================================
echo.

echo Limpando builds anteriores...
if exist "build" rmdir /s /q "build"
if exist "dist\RENOMER_Portable.exe" del "dist\RENOMER_Portable.exe"

echo.
echo Preparando build do executavel portatil...

echo.
echo Instalando dependencias necessarias...
pip install pyinstaller
pip install -r requirements.txt

echo.
echo Gerando executavel portatil...
pyinstaller RENOMER_Portable.spec --clean --noconfirm

echo.
echo Verificando se o executavel foi gerado...
if exist "dist\RENOMER_Portable.exe" (
    echo Executavel gerado com sucesso!
    echo.
    echo Copiando documentacao...
    copy "PORTABLE_README.md" "dist\" >nul 2>&1
    copy "API_README.md" "dist\" >nul 2>&1
    copy "INSTALL_GUIDE.md" "dist\" >nul 2>&1
    
    echo.
    echo ========================================
    echo BUILD CONCLUIDO COM SUCESSO!
    echo ========================================
    echo.
    echo O executavel portatil esta em: dist\RENOMER_Portable.exe
    echo.
    echo EXECUTAVEL COMPLETAMENTE PORTATIL:
    echo 1. Copie APENAS o arquivo RENOMER_Portable.exe
    echo 2. Execute em qualquer PC Windows
    echo 3. Selecione as pastas de origem e destino na interface
    echo 4. Nao precisa copiar nenhuma pasta adicional!
    echo.
) else (
    echo ERRO: Falha ao gerar o executavel!
    echo Verifique os erros acima.
)

pause