@echo off
echo Iniciando Backend...
cd /d C:\Users\felip\academico-platform\backend
start "Backend" cmd /k "node server.js"

echo.
echo Iniciando Frontend...
cd /d C:\Users\felip\academico-platform\frontend
start "Frontend" cmd /k "npm run dev"

echo.
echo Servidores iniciados. Presiona cualquier tecla para salir.
pause > nul