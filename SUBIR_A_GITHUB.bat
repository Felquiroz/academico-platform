@echo off
chcp 65001 >nul
cd /d C:\Users\felip\academico-platform

echo ========================================
echo   CONFIGURANDO GIT Y SUBIENDO A GITHUB
echo ========================================

echo.
echo [1/8] Configurando Git...
git config --global user.email "felipequirozalvarez@gmail.com"
git config --global user.name "Felipe Quiroz"

echo.
echo [2/8] Inicializando repositorio...
if not exist .git (
    git init
)

echo.
echo [3/8] Agregando archivos...
git add .

echo.
echo [4/8] Haciendo commit...
git commit -m "Plataforma Academica - v1.0"

echo.
echo [5/8] Verificando branch...
git branch -M main

echo.
echo [6/8] Agregando remoto...
git remote remove origin 2>nul
git remote add origin https://github.com/Felquiroz/academico-platform.git

echo.
echo [7/8] Verificando remoto...
git remote -v

echo.
echo [8/8] Subiendo a GitHub...
git push -u origin main

echo.
echo ========================================
echo   ✓ COMPLETADO!
echo ========================================
echo.
echo Tu proyecto esta en:
echo https://github.com/Felquiroz/academico-platform
echo.
pause