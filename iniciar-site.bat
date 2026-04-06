@echo off
cd /d C:\Users\Pichau\Documents\projeto-movebrink
start "MoveBrink Backend" cmd /k npm start
timeout /t 3 /nobreak >nul
start http://127.0.0.1:3000/contato.html
