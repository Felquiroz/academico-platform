@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_ENV=%BACKEND_DIR%\.env"
set "BACKEND_ENV_EXAMPLE=%BACKEND_DIR%\.env.example"

echo.
echo ========================================
echo   ACADEMICO PLATFORM - Iniciando
echo ========================================
echo.

REM ============================================
REM 1. VERIFICAR ARCHIVOS NECESARIOS
REM ============================================
if not exist "%BACKEND_DIR%\server.js" (
    echo ERROR: No se encontro el backend.
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: No se encontro el frontend.
    pause
    exit /b 1
)

REM Crear .env si no existe
if not exist "%BACKEND_ENV%" (
    if exist "%BACKEND_ENV_EXAMPLE%" (
        copy /Y "%BACKEND_ENV_EXAMPLE%" "%BACKEND_ENV%" > nul
        echo Archivo .env creado.
    ) else (
        echo ERROR: Falta .env y .env.example
        pause
        exit /b 1
    )
)

REM ============================================
REM 2. INSTALAR DEPENDENCIAS SI FALTAN
REM ============================================
if not exist "%BACKEND_DIR%\node_modules" (
    echo Instalando dependencias del backend...
    cd /d "%BACKEND_DIR%"
    call npm install --silent 2>nul
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo Instalando dependencias del frontend...
    cd /d "%FRONTEND_DIR%"
    call npm install --silent 2>nul
)

REM ============================================
REM 3. BUSCAR MYSQL
REM ============================================
set "MYSQL_EXE="

for /f "delims=" %%I in ('where mysql 2^>nul') do (
    if not defined MYSQL_EXE set "MYSQL_EXE=%%I"
)

if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe"

REM ============================================
REM 4. VERIFICAR SERVICIO MYSQL
REM ============================================
if defined MYSQL_EXE (
    echo Verificando MySQL...
    
    sc query MySQL96 >nul 2>&1
    if errorlevel 1 (
        sc query MySQL80 >nul 2>&1
        if errorlevel 1 (
            sc query MySQL >nul 2>&1
            if errorlevel 1 (
                echo   Iniciando servicio MySQL...
                net start MySQL96 >nul 2>&1
                if errorlevel 1 (
                    net start MySQL80 >nul 2>&1
                    if errorlevel 1 (
                        net start MySQL >nul 2>&1
                    )
                )
            )
        )
    )
    
    REM Leer contraseña del .env
    set "DB_PASS="
    for /f "usebackq tokens=1,* delims==" %%A in ("%BACKEND_ENV%") do (
        if /I "%%A"=="DB_PASSWORD" set "DB_PASS=%%B"
    )
    
    REM Crear base de datos
    echo   Verificando base de datos...
    if defined DB_PASS (
        "%MYSQL_EXE%" -h localhost -P 3306 -u root -p!DB_PASS! -e "CREATE DATABASE IF NOT EXISTS academico_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
    ) else (
        "%MYSQL_EXE%" -h localhost -P 3306 -u root -e "CREATE DATABASE IF NOT EXISTS academico_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
    )
    echo   MySQL listo.
) else (
    echo.
    echo ADVERTENCIA: MySQL no encontrado en el sistema.
    echo Si MySQL esta instalado, agrega mysql.exe al PATH.
    echo.
)

REM ============================================
REM 5. INICIAR BACKEND
REM ============================================
echo.
echo ========================================
echo   Iniciando Backend (puerto 4000)
echo ========================================
cd /d "%BACKEND_DIR%"
start "Academico-Backend" cmd /k "title Academico-Backend && npm start"

timeout /nobreak /t 3 > nul

REM ============================================
REM 6. INICIAR FRONTEND
REM ============================================
echo ========================================
echo   Iniciando Frontend (puerto 5173)
echo ========================================
cd /d "%FRONTEND_DIR%"
start "Academico-Frontend" cmd /k "title Academico-Frontend && npm run dev"

timeout /nobreak /t 2 > nul

REM ============================================
REM 7. ABRIR NAVEGADOR
REM ============================================
echo.
echo ========================================
echo   Abriendo navegador...
echo ========================================
start http://localhost:5173

echo.
echo ========================================
echo   ACADEMICO PLATFORM INICIADO
echo ========================================
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:4000/api
echo   Login:     admin@academico.cl
echo   Pass:      admin123
echo.
echo   Para detener: cierra las ventanas de Backend y Frontend
echo.
pause
