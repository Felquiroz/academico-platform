@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_ENV=%BACKEND_DIR%\.env"
set "BACKEND_ENV_EXAMPLE=%BACKEND_DIR%\.env.example"

echo.
echo ========================================
echo   ACADEMICO PLATFORM - Configuracion
echo ========================================
echo.

REM ============================================
REM 1. VERIFICAR NODE.JS
REM ============================================
echo [1/5] Verificando Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js no esta instalado.
    echo Descarga desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set "NODE_VER=%%i"
echo       Node.js encontrado: %NODE_VER%

REM ============================================
REM 2. CREAR .env SI NO EXISTE
REM ============================================
echo.
echo [2/5] Verificando archivo de configuracion...
if not exist "%BACKEND_ENV%" (
    if exist "%BACKEND_ENV_EXAMPLE%" (
        copy /Y "%BACKEND_ENV_EXAMPLE%" "%BACKEND_ENV%" > nul
        echo       Archivo .env creado desde plantilla.
    ) else (
        echo       ERROR: No existe .env.example
        pause
        exit /b 1
    )
) else (
    echo       Archivo .env ya existe.
)

REM ============================================
REM 3. BUSCAR MYSQL
REM ============================================
echo.
echo [3/5] Buscando MySQL...
set "MYSQL_EXE="

REM Buscar en PATH
for /f "delims=" %%I in ('where mysql 2^>nul') do (
    if not defined MYSQL_EXE set "MYSQL_EXE=%%I"
)

REM Buscar en rutas comunes de Windows
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
if not defined MYSQL_EXE if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

REM Buscar en Program Files (x86)
if not defined MYSQL_EXE if exist "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe" set "MYSQL_EXE=C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe"

if not defined MYSQL_EXE (
    echo.
    echo       ADVERTENCIA: MySQL no encontrado.
    echo       Instala MySQL desde: https://dev.mysql.com/downloads/mysql/
    echo.
    echo       Si ya esta instalado, agrega mysql.exe al PATH del sistema.
    echo.
    goto :SKIP_MYSQL
)

echo       MySQL encontrado: %MYSQL_EXE%

REM ============================================
REM 4. VERIFICAR SERVICIO MYSQL
REM ============================================
echo.
echo [4/5] Verificando servicio MySQL...
sc query MySQL96 >nul 2>&1
if errorlevel 1 (
    sc query MySQL80 >nul 2>&1
    if errorlevel 1 (
        sc query MySQL >nul 2>&1
        if errorlevel 1 (
            echo       Servicio MySQL no encontrado. Intentando iniciar...
            net start MySQL96 >nul 2>&1
            if errorlevel 1 (
                net start MySQL80 >nul 2>&1
                if errorlevel 1 (
                    net start MySQL >nul 2>&1
                    if errorlevel 1 (
                        echo       No se pudo iniciar MySQL automaticamente.
                        echo       Inicia MySQL manualmente desde Services de Windows.
                    ) else (
                        echo       Servicio MySQL iniciado.
                    )
                ) else (
                    echo       Servicio MySQL iniciado.
                )
            ) else (
                echo       Servicio MySQL iniciado.
            )
        ) else (
            echo       Servicio MySQL corriendo.
        )
    ) else (
        echo       Servicio MySQL corriendo.
    )
) else (
    echo       Servicio MySQL corriendo.
)

REM ============================================
REM 4b. CONFIGURAR MYSQL - PROBAR CONEXION
REM ============================================
echo.
echo       Probando conexion a MySQL...

REM Probar sin contraseña primero
"%MYSQL_EXE%" -h localhost -P 3306 -u root -e "SELECT 1" >nul 2>&1
if not errorlevel 1 (
    echo       Conexion sin contraseña: OK
    goto :UPDATE_ENV_EMPTY
)

REM Probar con contraseña del .env actual
set "CURRENT_PASS="
for /f "usebackq tokens=1,* delims==" %%A in ("%BACKEND_ENV%") do (
    if /I "%%A"=="DB_PASSWORD" set "CURRENT_PASS=%%B"
)

if defined CURRENT_PASS (
    "%MYSQL_EXE%" -h localhost -P 3306 -u root -p!CURRENT_PASS! -e "SELECT 1" >nul 2>&1
    if not errorlevel 1 (
        echo       Conexion con contraseña existente: OK
        goto :UPDATE_ENV_EXISTING
    )
)

REM Pedir contraseña al usuario
echo.
echo       MySQL requiere contraseña para el usuario root.
echo       Ingresa la contraseña de MySQL (deja vacio si no tiene):
set /p "DB_PASS=       Contraseña: "

REM Probar con la contraseña ingresada
if not defined DB_PASS (
    "%MYSQL_EXE%" -h localhost -P 3306 -u root -e "SELECT 1" >nul 2>&1
    if errorlevel 1 (
        echo.
        echo       ERROR: No se pudo conectar a MySQL.
        echo       Verifica que MySQL este corriendo y que el usuario root sea correcto.
        echo.
        pause
        exit /b 1
    )
    echo       Conexion sin contraseña: OK
    goto :UPDATE_ENV_EMPTY
)

"%MYSQL_EXE%" -h localhost -P 3306 -u root -p!DB_PASS! -e "SELECT 1" >nul 2>&1
if errorlevel 1 (
    echo.
    echo       ERROR: Contraseña incorrecta para MySQL.
    echo       Verifica la contraseña del usuario root.
    echo.
    pause
    exit /b 1
)

echo       Conexion con contraseña ingresada: OK

REM Actualizar .env con la contraseña ingresada
set "TEMP_FILE=%BACKEND_ENV%.tmp"
(
    for /f "usebackq delims=" %%L in ("%BACKEND_ENV%") do (
        set "LINE=%%L"
        echo !LINE! | findstr /I "^DB_PASSWORD=" >nul
        if not errorlevel 1 (
            echo DB_PASSWORD=!DB_PASS!
        ) else (
            echo %%L
        )
    )
) > "%TEMP_FILE%"
move /Y "%TEMP_FILE%" "%BACKEND_ENV%" >nul
echo       Contraseña guardada en .env.
goto :CREATE_DB

:UPDATE_ENV_EMPTY
set "TEMP_FILE=%BACKEND_ENV%.tmp"
(
    for /f "usebackq delims=" %%L in ("%BACKEND_ENV%") do (
        set "LINE=%%L"
        echo !LINE! | findstr /I "^DB_PASSWORD=" >nul
        if not errorlevel 1 (
            echo DB_PASSWORD=
        ) else (
            echo %%L
        )
    )
) > "%TEMP_FILE%"
move /Y "%TEMP_FILE%" "%BACKEND_ENV%" >nul
echo       .env actualizado con contraseña vacía.
goto :CREATE_DB

:UPDATE_ENV_EXISTING
echo       Usando contraseña existente del .env.

:CREATE_DB
REM Crear base de datos
echo.
echo       Creando base de datos si no existe...
if defined CURRENT_PASS (
    "%MYSQL_EXE%" -h localhost -P 3306 -u root -p!CURRENT_PASS! -e "CREATE DATABASE IF NOT EXISTS academico_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
) else if defined DB_PASS (
    "%MYSQL_EXE%" -h localhost -P 3306 -u root -p!DB_PASS! -e "CREATE DATABASE IF NOT EXISTS academico_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
) else (
    "%MYSQL_EXE%" -h localhost -P 3306 -u root -e "CREATE DATABASE IF NOT EXISTS academico_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
)
echo       Base de datos verificada.

:SKIP_MYSQL

REM ============================================
REM 5. INSTALAR DEPENDENCIAS
REM ============================================
echo.
echo [5/5] Instalando dependencias...

echo       Backend...
cd /d "%BACKEND_DIR%"
call npm install --silent 2>nul
if errorlevel 1 (
    echo       Error instalando dependencias del backend.
    pause
    exit /b 1
)
echo       Backend listo.

echo       Frontend...
cd /d "%FRONTEND_DIR%"
call npm install --silent 2>nul
if errorlevel 1 (
    echo       Error instalando dependencias del frontend.
    pause
    exit /b 1
)
echo       Frontend listo.

REM ============================================
REM COMPLETADO
REM ============================================
echo.
echo ========================================
echo   Configuracion completada
echo ========================================
echo.
echo   Siguiente paso: ejecuta iniciar.bat
echo.
pause
