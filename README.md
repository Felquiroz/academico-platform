# Academico Platform

Plataforma web para la gestión académica de diplomados y magísteres.

## Tecnologías

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Base de datos:** MySQL 8

---

## Instalación paso a paso

### Requisitos previos

Instalar en tu computador:

| Programa | Descarga | Propósito |
|----------|----------|-----------|
| [Git](https://git-scm.com/) | git-scm.com | Descargar el código |
| [Node.js](https://nodejs.org/) v18+ | nodejs.org | Ejecutar el proyecto |
| [MySQL Server](https://dev.mysql.com/downloads/mysql/) v8+ | dev.mysql.com | Base de datos |

### Paso 1: Clonar el repositorio

Abre **Git Bash** o **PowerShell** y ejecuta:

```bash
git clone https://github.com/Felquiroz/academico-platform.git
cd academico-platform/academico-platform
```

### Paso 2: Ejecutar configuración automática

Doble clic en `setup-local.bat`

Este script automáticamente:
- Detecta si MySQL está instalado
- Pide la contraseña de MySQL si la necesita
- Crea la base de datos
- Instala todas las dependencias

### Paso 3: Iniciar la aplicación

Doble clic en `iniciar.bat`

El navegador se abrirá automáticamente con la plataforma.

---

## Credenciales de acceso

| Campo | Valor |
|-------|-------|
| Email | admin@academico.cl |
| Contraseña | admin123 |

---

## URLs de la aplicación

| Servicio | URL |
|----------|-----|
| Aplicación | http://localhost:5173 |
| API Backend | http://localhost:4000/api |

---

## Solución de problemas

### MySQL no conecta

1. Verificar que el servicio MySQL esté iniciado en **Services de Windows**
2. Ejecutar `setup-local.bat` nuevamente
3. Ingresar la contraseña correcta de MySQL

### El navegador no abre

Abrir manualmente: http://localhost:5173

### Error de puertos

Cerrar otras aplicaciones que usen los puertos 4000 o 5173.

---

## Estructura del proyecto

```
academico-platform/
├── backend/           # API con Node.js + Express
│   ├── database/      # Scripts de base de datos
│   ├── routes/        # Rutas de la API
│   ├── middleware/     # Middlewares
│   └── server.js      # Punto de entrada
├── frontend/          # Interfaz con React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
├── setup-local.bat    # Configuración automática
├── iniciar.bat        # Iniciar aplicación
└── README.md
```
