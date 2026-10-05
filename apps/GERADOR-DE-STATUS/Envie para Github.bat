@echo off 
echo Enviando projeto para o GitHub... 
git add . 
git commit -m "Update" 
git push origin master 
echo Projeto enviado com sucesso! 
pause