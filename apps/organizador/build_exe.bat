@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================
:: RENOMER - Build Executáveis
:: Gera arquivos .exe do sistema
:: ============================================

title RENOMER - Build Executáveis

color 0B

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║        RENOMER - BUILD DE EXECUTÁVEIS                     ║
echo ║        Gerando arquivos .exe                              ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo  Desenvolvido por: DEV ALEKSANDRO ALVES
echo  Versão: 2.0.0
echo.
echo ════════════════════════════════════════════════════════════
echo.

:: Verifica PyInstaller
echo [1/5] Verificando PyInstaller...
python -m PyInstaller --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] PyInstaller não encontrado. Instalando...
    python -m pip install pyinstaller --quiet
    if %errorLevel% neq 0 (
        echo [ERRO] Falha ao instalar PyInstaller
        pause
        exit /b 1
    )
    echo [OK] PyInstaller instalado
) else (
    echo [OK] PyInstaller encontrado
)
echo.

:: Limpa builds anteriores
echo [2/5] Limpando builds anteriores...
if exist "build" rmdir /s /q "build" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul
echo [OK] Limpeza concluída
echo.

:: Cria diretórios necessários
echo [3/5] Preparando estrutura...
if not exist "logs" mkdir logs
if not exist "extratos" mkdir extratos
if not exist "ORGANIZADO" mkdir ORGANIZADO
if not exist "relatorios" mkdir relatorios
echo [OK] Estrutura preparada
echo.

:: Build do executável
echo [4/5] Gerando executável da interface...
echo [INFO] Isso pode levar alguns minutos...
echo.

pyinstaller --clean ^
    --noconfirm ^
    --onedir ^
    --windowed ^
    --name "RENOMER" ^
    --add-data "src/core;src/core" ^
    --add-data "src/utils;src/utils" ^
    --add-data "src/reports;src/reports" ^
    --add-data "config;config" ^
    --hidden-import "tkinter" ^
    --hidden-import "tkinter.ttk" ^
    --hidden-import "tkinter.filedialog" ^
    --hidden-import "tkinter.messagebox" ^
    --hidden-import "logging.handlers" ^
    --hidden-import "pathlib" ^
    --collect-all "tkinter" ^
    "src/ui/interface_com_seletor.py"

if %errorLevel% neq 0 (
    echo.
    echo [ERRO] Falha ao gerar executável da interface
    pause
    exit /b 1
)

echo.
echo [OK] Executável da interface gerado
echo.

:: Build da API (opcional)
set /p BUILD_API="Deseja gerar também o executável da API? (S/N): "
if /i "%BUILD_API%"=="S" (
    echo.
    echo [INFO] Gerando executável da API...
    echo.

    pyinstaller --clean ^
        --noconfirm ^
        --onedir ^
        --console ^
        --name "RENOMER_API" ^
        --add-data "src/core;src/core" ^
        --add-data "src/utils;src/utils" ^
        --add-data "config;config" ^
        --hidden-import "flask" ^
        --hidden-import "flask_cors" ^
        --hidden-import "werkzeug" ^
        --hidden-import "werkzeug.utils" ^
        --hidden-import "logging.handlers" ^
        --hidden-import "psutil" ^
        "src/core/app.py"

    if %errorLevel% neq 0 (
        echo.
        echo [AVISO] Falha ao gerar executável da API
    ) else (
        echo.
        echo [OK] Executável da API gerado
    )
    echo.
)

:: Copia arquivos necessários
echo [5/5] Copiando arquivos necessários...

if exist "dist\RENOMER" (
    :: Copia diretórios
    xcopy /E /I /Y "logs" "dist\RENOMER\logs" >nul 2>&1
    xcopy /E /I /Y "extratos" "dist\RENOMER\extratos" >nul 2>&1
    xcopy /E /I /Y "ORGANIZADO" "dist\RENOMER\ORGANIZADO" >nul 2>&1
    xcopy /E /I /Y "relatorios" "dist\RENOMER\relatorios" >nul 2>&1

    :: Copia config
    if exist "config" (
        xcopy /E /I /Y "config" "dist\RENOMER\config" >nul 2>&1
    )

    :: Copia documentação
    if exist "API_README.md" copy /Y "API_README.md" "dist\RENOMER\" >nul
    if exist "INSTALL_GUIDE.md" copy /Y "INSTALL_GUIDE.md" "dist\RENOMER\" >nul
    if exist "requirements.txt" copy /Y "requirements.txt" "dist\RENOMER\" >nul

    :: Cria arquivo README para o executável
    echo # RENOMER - Executável > "dist\RENOMER\README.txt"
    echo. >> "dist\RENOMER\README.txt"
    echo Bem-vindo ao RENOMER! >> "dist\RENOMER\README.txt"
    echo. >> "dist\RENOMER\README.txt"
    echo Para executar: >> "dist\RENOMER\README.txt"
    echo   - Interface Gráfica: RENOMER.exe >> "dist\RENOMER\README.txt"
    if exist "dist\RENOMER_API" (
        echo   - API Server: RENOMER_API.exe >> "dist\RENOMER_API\README.txt"
    )
    echo. >> "dist\RENOMER\README.txt"
    echo Coloque seus extratos na pasta 'extratos' >> "dist\RENOMER\README.txt"
    echo Os arquivos organizados ficarão em 'ORGANIZADO' >> "dist\RENOMER\README.txt"
    echo. >> "dist\RENOMER\README.txt"
    echo Desenvolvido por: DEV ALEKSANDRO ALVES >> "dist\RENOMER\README.txt"

    echo [OK] Arquivos copiados
)

echo.

:: Resumo
echo ════════════════════════════════════════════════════════════
echo.
echo ✅ BUILD CONCLUÍDO COM SUCESSO!
echo.
echo 📁 Executáveis gerados em:
echo    • dist\RENOMER\RENOMER.exe          - Interface Gráfica
if exist "dist\RENOMER_API" (
    echo    • dist\RENOMER_API\RENOMER_API.exe  - API Server
)
echo.
echo 📦 Tamanho aproximado:
for /f "tokens=3" %%a in ('dir /s "dist\RENOMER" ^| find "File(s)"') do set SIZE=%%a
echo    • Pasta RENOMER: %SIZE% bytes
echo.
echo 🚀 Para distribuir:
echo    1. Comprima a pasta dist\RENOMER em um arquivo ZIP
echo    2. Distribua o ZIP
echo    3. Usuários apenas extraem e executam RENOMER.exe
echo.
echo 📋 Conteúdo incluído:
echo    • RENOMER.exe           - Executável principal
echo    • Bibliotecas Python    - Todas as dependências
echo    • Estrutura de pastas   - logs, extratos, ORGANIZADO
echo    • Documentação          - README.txt
echo.
echo ════════════════════════════════════════════════════════════
echo.

:: Pergunta se quer testar
set /p TEST_EXE="Deseja testar o executável agora? (S/N): "
if /i "%TEST_EXE%"=="S" (
    echo.
    echo [INFO] Iniciando RENOMER.exe...
    start "" "dist\RENOMER\RENOMER.exe"
)

:: Pergunta se quer criar ZIP
set /p CREATE_ZIP="Deseja criar arquivo ZIP para distribuição? (S/N): "
if /i "%CREATE_ZIP%"=="S" (
    echo.
    echo [INFO] Criando arquivo ZIP...

    :: Verifica se tem PowerShell
    where powershell >nul 2>&1
    if %errorLevel% equ 0 (
        powershell -command "Compress-Archive -Path 'dist\RENOMER' -DestinationPath 'RENOMER_v2.0_Windows.zip' -Force"
        if %errorLevel% equ 0 (
            echo [OK] ZIP criado: RENOMER_v2.0_Windows.zip
            for %%A in (RENOMER_v2.0_Windows.zip) do echo [INFO] Tamanho: %%~zA bytes
        ) else (
            echo [AVISO] Erro ao criar ZIP. Use WinRAR ou 7-Zip manualmente.
        )
    ) else (
        echo [AVISO] PowerShell não encontrado. Comprima a pasta dist\RENOMER manualmente.
    )
    echo.
)

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 💡 DICAS:
echo.
echo  • O executável NÃO precisa de Python instalado
echo  • Inclui todas as dependências automaticamente
echo  • Pode ser distribuído para outros computadores
echo  • Windows Defender pode alertar na primeira execução
echo.
echo  • Para executável menor: use --onefile ao invés de --onedir
echo  • Para adicionar ícone: use --icon=icone.ico
echo  • Para versão: crie um arquivo version.txt
echo.
echo ════════════════════════════════════════════════════════════
echo.

echo Pressione qualquer tecla para sair...
pause >nul

exit /b 0