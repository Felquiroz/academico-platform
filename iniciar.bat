@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_ENV=%BACKEND_DIR%\.env"
set "BACKEND_ENV_EXAMPLE=%BACKEND_DIR%\.env.example"
set "MYSQL_EXE="

echo ========================================
echo   Preparando entorno local
echo ========================================

if not exist "%BACKEND_DIR%\server.js" (
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
    echo Creando backend\.env desde .env.example...
    copy /Y "%BACKEND_ENV_EXAMPLE%" "%BACKEND_ENV%" > nul
  ) else (
    echo Falta "%BACKEND_ENV%" y no existe .env.example para generarlo.
    pause
    exit /b 1
  )
)

if not exist "%BACKEND_DIR%\node_modules" (
  echo Instalando dependencias del backend...
  cd /d "%BACKEND_DIR%"
  call npm install
  if errorlevel 1 (
    echo Error instalando dependencias del backend.
    pause
    exit /b 1
  )
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo Instalando dependencias del frontend...
  cd /d "%FRONTEND_DIR%"
  call npm install
  if errorlevel 1 (
    echo Error instalando dependencias del frontend.
    pause
    exit /b 1
  )
)

for /f "usebackq tokens=1,* delims==" %%A in ("%BACKEND_ENV%") do (
  if /I "%%A"=="DB_HOST" set "DB_HOST=%%B"
  if /I "%%A"=="DB_PORT" set "DB_PORT=%%B"
  if /I "%%A"=="DB_USER" set "DB_USER=%%B"
  if /I "%%A"=="DB_PASSWORD" set "DB_PASSWORD=%%B"
  if /I "%%A"=="DB_NAME" set "DB_NAME=%%B"
)

if not defined DB_HOST set "DB_HOST=localhost"
if not defined DB_PORT set "DB_PORT=3306"
if not defined DB_USER set "DB_USER=root"
if not defined DB_PASSWORD set "DB_PASSWORD="
if not defined DB_NAME set "DB_NAME=academico_platform"

for /f "delims=" %%I in ('where mysql 2^>nul') do (
  if not defined MYSQL_EXE set "MYSQL_EXE=%%I"
)

if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

if defined MYSQL_EXE (
  echo Verificando base de datos local...
  "%MYSQL_EXE%" -h "%DB_HOST%" -P %DB_PORT% -u "%DB_USER%" -p%DB_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  if errorlevel 1 (
    echo No fue posible crear o verificar la base de datos automaticamente.
    echo Revisa backend\.env y confirma que MySQL este corriendo.
  )
) else (
  echo No se encontro mysql.exe en PATH ni en rutas comunes.
  echo Instala MySQL o agrega mysql.exe al PATH para automatizar la creacion de la base.
)

echo.
echo ========================================
echo   Iniciando Servidor Backend
echo ========================================
cd /d "%BACKEND_DIR%"
start "Backend" cmd /k "npm start"

timeout /nobreak /t 3 > nul

echo ========================================
echo   Iniciando Servidor Frontend
echo ========================================
cd /d "%FRONTEND_DIR%"
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servidores iniciados
echo   Backend: http://localhost:4000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
pause
