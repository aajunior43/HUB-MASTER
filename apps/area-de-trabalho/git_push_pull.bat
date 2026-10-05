@echo off

echo ========================================
echo    Git Push e Pull Automatico
echo ========================================
echo.

REM Verifica se e um repositorio git
if not exist ".git" (
    echo ERRO: Este diretorio nao e um repositorio Git.
    echo Execute: git init
    echo.
    echo Pressione qualquer tecla para fechar...
    pause >nul
    exit /b 1
)

echo Verificando status do repositorio...
git status

echo.
echo Adicionando todos os arquivos modificados...
git add .

echo.
echo Digite a mensagem do commit (ou pressione Enter para 'Update files'):
set /p commit_msg=
if "%commit_msg%"=="" set commit_msg=Update files

echo.
echo Fazendo commit com mensagem: %commit_msg%
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo AVISO: Nenhuma alteracao para commit ou erro no commit
)

echo.
echo Fazendo pull do repositorio remoto...
git pull
if errorlevel 1 (
    echo ERRO: Falha no pull - verifique conexao e conflitos
    echo.
    echo Pressione qualquer tecla para continuar...
    pause >nul
)

echo.
echo Fazendo push para o repositorio remoto...
git push
if errorlevel 1 (
    echo ERRO: Falha no push - verifique conexao e permissoes
)

echo.
echo ========================================
echo    Operacao concluida!
echo ========================================
echo.
echo Pressione qualquer tecla para fechar...
pause >nul