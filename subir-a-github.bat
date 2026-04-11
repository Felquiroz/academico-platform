@echo off
echo ========================================
echo   Subir proyecto a GitHub
echo ========================================
cd /d C:\Users\felip\academico-platform

echo.
echo 1. Inicializando repositorio Git...
git init

echo.
echo 2. Agregando archivos...
git add .

echo.
echo 3. Ingresando mensaje de commit...
git commit -m "Plataforma Academica - v1.0"

echo.
echo ========================================
echo Pasos para subir a GitHub:
echo.
echo 1. Ve a: https://github.com/new
echo 2. Crea un nuevo repositorio llamado "academico-platform"
echo 3. Copia los siguientes comandos y ejecutalos en tu terminal:
echo.
echo    git remote add origin https://github.com/TU_USUARIO/academico-platform.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo ========================================
echo Listo! Tu codigo esta listo para subir.
echo ========================================
pause