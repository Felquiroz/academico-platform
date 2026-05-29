@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_ENV=%BACKEND_DIR%\.env"
set "BACKEND_ENV_EXAMPLE=%BACKEND_DIR%\.env.example"

echo ========================================
echo   Configuracion local del proyecto
echo ========================================

if not exist "%BACKEND_DIR%\package.json" (
  echo No se encontro el backend en "%BACKEND_DIR%"
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo No se encontro el frontend en "%FRONTEND_DIR%"
  pause
  exit /b 1
)

if not exist "%BACKEND_ENV%" (
  if exist "%BACKEND_ENV_EXAMPLE%" (
    echo Creando backend\.env desde el ejemplo...
    copy /Y "%BACKEND_ENV_EXAMPLE%" "%BACKEND_ENV%" > nul
    echo Archivo creado en backend\.env
    echo Edita DB_PASSWORD, JWT_SECRET y JWT_REFRESH_SECRET si necesitas personalizarlos.
  ) else (
    echo No existe backend\.env.example para generar el archivo de entorno.
  )
) else (
  echo backend\.env ya existe. Se mantiene sin cambios.
)

echo.
echo Instalando dependencias del backend...
cd /d "%BACKEND_DIR%"
call npm install
if errorlevel 1 (
  echo Error instalando backend.
  pause
  exit /b 1
)

echo.
echo Instalando dependencias del frontend...
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 (
  echo Error instalando frontend.
  pause
  exit /b 1
)

echo.
echo Configuracion completada.
echo Siguiente paso: ejecuta iniciar.bat para levantar MySQL, backend y frontend.
echo.
pause
