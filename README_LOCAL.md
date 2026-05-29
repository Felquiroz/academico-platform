# Academico Platform: Instalacion Local

Esta guia explica como levantar el proyecto completo en otro computador usando:

- `frontend`: React + Vite
- `backend`: Node.js + Express
- `base de datos`: MySQL local

Sin Railway y sin Vercel.

## Requisitos

Antes de comenzar, instala:

- `Git`
- `Node.js` 18 o superior
- `npm`
- `MySQL Server` 8 o superior

Opcional pero recomendado:

- `MySQL Workbench`

## 1. Clonar el proyecto desde GitHub

Abre una terminal y ejecuta:

```powershell
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd academico-platform
```

Si descargaste el proyecto en `.zip`, descomprímelo y entra a la carpeta raíz.

## 2. Configurar MySQL local

Durante la instalación de MySQL:

1. Crea o conserva el usuario `root`
2. Define una contraseña
3. Verifica que el servicio quede iniciado

El proyecto usa por defecto:

- host: `localhost`
- puerto: `3306`
- base de datos: `academico_platform`

## 3. Crear el archivo `.env`

En el backend ya existe un archivo base:

- `backend/.env.example`

Debes generar:

- `backend/.env`

### Forma automática

Ejecuta:

```bat
setup-local.bat
```

Este script:

- crea `backend/.env` si no existe
- instala dependencias del backend
- instala dependencias del frontend

### Forma manual

1. Copia `backend/.env.example`
2. Renómbralo como `backend/.env`
3. Edita estos valores:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=academico_platform
JWT_SECRET=una_clave_segura
JWT_REFRESH_SECRET=otra_clave_segura
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
PORT=4000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

## 4. Instalar dependencias

Si no usaste `setup-local.bat`, instala todo manualmente:

```powershell
cd backend
npm install
cd ..\frontend
npm install
cd ..
```

## 5. Iniciar el proyecto completo

Desde la carpeta raíz ejecuta:

```bat
iniciar.bat
```

El script hace esto:

- revisa que exista `backend/.env`
- lo crea desde `.env.example` si hace falta
- instala dependencias si faltan
- intenta encontrar `mysql.exe`
- crea la base `academico_platform` si no existe
- levanta backend y frontend en ventanas separadas

## 6. URLs locales

Cuando quede iniciado:

- frontend: `http://localhost:5173`
- backend: `http://localhost:4000/api`
- health check: `http://localhost:4000/api/health`

## 7. Usuario inicial

Si la base está vacía, el backend crea un usuario administrador automáticamente:

- email: `admin@academico.cl`
- contraseña: `admin123`

## 8. Inicio manual por separado

Si alguna vez quieres levantar cada parte por separado:

### Backend

```powershell
cd backend
npm start
```

### Frontend

```powershell
cd frontend
npm run dev
```

## 9. Problemas comunes

### MySQL no conecta

Revisa:

- que el servicio MySQL esté iniciado
- que `DB_USER` y `DB_PASSWORD` en `backend/.env` sean correctos
- que MySQL escuche en `localhost:3306`

### `mysql.exe` no se encuentra

Puedes:

1. agregar MySQL al `PATH`
2. crear la base manualmente desde MySQL Workbench

SQL:

```sql
CREATE DATABASE academico_platform
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Luego vuelve a ejecutar `iniciar.bat`.

### El backend no inicia

Revisa:

- que el puerto `4000` esté libre
- que exista `backend/.env`
- que `JWT_SECRET` y `JWT_REFRESH_SECRET` tengan valor

### El frontend no abre

Revisa que el puerto `5173` no esté ocupado por otra app.

## 10. Archivos importantes

- `iniciar.bat`: arranque completo local
- `start.bat`: alias de `iniciar.bat`
- `setup-local.bat`: preparación inicial
- `backend/.env.example`: plantilla para variables de entorno

## Flujo recomendado en otro computador

1. Clonar el repositorio desde GitHub.
2. Instalar MySQL Server.
3. Ejecutar `setup-local.bat`.
4. Editar `backend/.env` con la contraseña real de MySQL.
5. Ejecutar `iniciar.bat`.
6. Abrir `http://localhost:5173`.
