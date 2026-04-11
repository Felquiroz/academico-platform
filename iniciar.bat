@echo off
echo ========================================
echo   Iniciando Servidor Backend
echo ========================================
cd /d C:\Users\felip\academico-platform\backend
start "Backend" cmd /k "node server.js"

timeout /nobreak /t 3

echo ========================================
echo   Iniciando Servidor Frontend
echo ========================================
cd /d C:\Users\felip\academico-platform\frontend
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servidores iniciados
echo   Backend: http://localhost:4000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
pause