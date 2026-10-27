# SPEC 06 — Script de despliegue `deploy.sh` al VPS

> **Estado:** Implementada
> **Depende de:** Ninguna
> **Fecha:** 2026-10-27
> **Objetivo:** Disponer de un `deploy.sh` (valores reales, ignorado por git) y un `deploy.sh.example` (placeholders, versionado) que compilen `dist/` y lo suban al VPS por rsync/SSH, replicando el script de `curso-jquery-escuelait` y adaptado a este proyecto.

## Why this spec exists

El proyecto no tiene script de despliegue. Los proyectos hermanos que comparten el mismo VPS de Hostinger sí lo tienen:

- `curso-jquery-escuelait` (`/var/www/jquery.antonydev.tech/escuelait/curso-jquery-escuelait`): `deploy.sh` + `deploy.sh.example`, con build, una sola conexión SSH (ControlMaster) y rsync `--delete`.
- `jquery-spa-with-method-load-from-jquery-v5` (`/var/www/jquery.antonydev.tech/mis-plugins-spa/...`): mismo patrón.

Este proyecto se sirve en producción bajo `javascript.antonydev.tech` con `SITE_BASE=/mis-plugins-spa/spa-loader-content-html-v5` (ver SPEC 02), así que el despliegue manual con rsync a mano es repetitivo y fácil de equivocar.

Diferencia clave respecto a escuelait: aquí **no hay PHP en producción**. `dist/` es estático y el `.env` solo participa en tiempo de build (`SITE_BASE`, puertos locales). Por tanto no procede el bloque de subida de `.env.production` ni los filtros de protección de `.env` que sí necesitan los proyectos con PHP.

## Scope

**In:**

- Crear `deploy.sh` en la raíz del proyecto con los valores reales del VPS (`root@147.93.90.127:22`) y `REMOTE_PATH=/var/www/javascript.antonydev.tech/mis-plugins-spa/spa-loader-content-html-v5`.
- Crear `deploy.sh.example` con placeholders (`TU_USUARIO`, `TU_IP_O_DOMINIO`, `TU_DOMINIO`) y sin datos sensibles, como archivo versionable.
- Añadir `deploy.sh` al `.gitignore` bajo la sección `# Deploy local (IP y rutas del VPS)`, igual que en los proyectos hermanos.
- Dar permiso de ejecución a `deploy.sh` (`chmod +x`).
- Verificar sintaxis con `bash -n` y que git ignora el script real pero no el ejemplo.

**Out of scope:**

- Ejecutar el despliegue real contra el VPS.
- Crear o modificar la configuración de nginx (`sites-available`) ni la carpeta remota.
- Subida de `.env.production` o cualquier archivo de entorno al VPS.
- Automatización CI/CD o despliegue al hacer push.
- Tocar `gulpfile.js`, `server/`, `src/` o el pipeline de build.

## Data model

Sin estructuras de datos de ejecución nuevas. El script se configura con cinco variables:

| Variable | Valor en `deploy.sh` | Valor en `deploy.sh.example` |
| --- | --- | --- |
| `VPS_USER` | `root` | `TU_USUARIO` |
| `VPS_HOST` | `147.93.90.127` | `TU_IP_O_DOMINIO` |
| `VPS_PORT` | `22` | `22` |
| `REMOTE_PATH` | `/var/www/javascript.antonydev.tech/mis-plugins-spa/spa-loader-content-html-v5` | `/var/www/TU_DOMINIO/mis-plugins-spa/spa-loader-content-html-v5` |
| `LOCAL_BUILD_DIR` | `dist` | `dist` |

El `CONTROL_PATH` de SSH se nombra `ssh-deploy-spa-loader-v5-${VPS_USER}-${VPS_HOST}-${VPS_PORT}` para no colisionar con los sockets de los otros proyectos (`ssh-deploy-jquery-...`, `ssh-deploy-spa-v5-...`).

Contenido previsto de `deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# ==== Configuración ====
VPS_USER="root"
VPS_HOST="147.93.90.127"
VPS_PORT="22"                     # cambia si usas otro puerto SSH
REMOTE_PATH="/var/www/javascript.antonydev.tech/mis-plugins-spa/spa-loader-content-html-v5"  # ruta en el VPS servida por nginx
LOCAL_BUILD_DIR="dist"            # carpeta que genera Gulp/tu build

# ==== Build ====
echo "==> Generando build..."
pnpm run build

if [ ! -d "$LOCAL_BUILD_DIR" ]; then
  echo "Error: no existe la carpeta '$LOCAL_BUILD_DIR'. Revisa LOCAL_BUILD_DIR."
  exit 1
fi

# ==== Deploy ====
# Una sola conexion SSH (ControlMaster): la contraseña se pide una vez.
CONTROL_PATH="${XDG_RUNTIME_DIR:-/tmp}/ssh-deploy-spa-loader-v5-${VPS_USER}-${VPS_HOST}-${VPS_PORT}"
SSH_CMD="ssh -p ${VPS_PORT} -o ControlMaster=auto -o ControlPath=${CONTROL_PATH} -o ControlPersist=15"

cleanup_ssh() {
  $SSH_CMD -O exit "${VPS_USER}@${VPS_HOST}" >/dev/null 2>&1 || true
}
trap cleanup_ssh EXIT

echo "==> Subiendo al VPS ($VPS_HOST)..."
rsync -avz --delete \
  -e "$SSH_CMD" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  "$LOCAL_BUILD_DIR"/ \
  "$VPS_USER@$VPS_HOST:$REMOTE_PATH"

echo "==> Deploy completado."
```

Contenido previsto de `deploy.sh.example` (forma simple, sin ControlMaster, como el de escuelait):

```bash
#!/usr/bin/env bash
set -euo pipefail

# Copia este archivo y configúralo:
#   cp deploy.sh.example deploy.sh
#   chmod +x deploy.sh
#
# deploy.sh está en .gitignore (contiene IP/rutas de tu VPS).

# ==== Configuración ====
VPS_USER="TU_USUARIO"             # p. ej. root
VPS_HOST="TU_IP_O_DOMINIO"        # IP pública del VPS o dominio
VPS_PORT="22"                     # cambia si usas otro puerto SSH
REMOTE_PATH="/var/www/TU_DOMINIO/mis-plugins-spa/spa-loader-content-html-v5"  # ruta en el VPS servida por nginx
LOCAL_BUILD_DIR="dist"            # carpeta que genera Gulp/tu build

# ==== Build ====
echo "==> Generando build..."
pnpm run build

if [ ! -d "$LOCAL_BUILD_DIR" ]; then
  echo "Error: no existe la carpeta '$LOCAL_BUILD_DIR'. Revisa LOCAL_BUILD_DIR."
  exit 1
fi

# ==== Deploy ====
echo "==> Subiendo al VPS ($VPS_HOST)..."
rsync -avz --delete \
  -e "ssh -p $VPS_PORT" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.DS_Store' \
  "$LOCAL_BUILD_DIR"/ \
  "$VPS_USER@$VPS_HOST:$REMOTE_PATH"

echo "==> Deploy completado."
```

## Implementation plan

1. Crear `deploy.sh` con el contenido anterior. Prueba: `bash -n deploy.sh` termina con código 0.
2. Crear `deploy.sh.example` con los placeholders. Prueba: `bash -n deploy.sh.example` termina con código 0.
3. Añadir al final de `.gitignore`:

    ```gitignore
    # Deploy local (IP y rutas del VPS)
    deploy.sh
    ```

4. `chmod +x deploy.sh`.
5. Verificación con los criterios de abajo.

## Acceptance criteria

- [x] `deploy.sh` existe en la raíz, tiene permiso de ejecución y `bash -n deploy.sh` pasa.
- [x] `deploy.sh.example` existe, contiene solo placeholders y `bash -n deploy.sh.example` pasa.
- [x] `git status --ignored` muestra `deploy.sh` como ignorado (`!!`) y `deploy.sh.example` como archivo normal pendiente de añadir (`??`).
- [x] `REMOTE_PATH` coincide con `SITE_BASE` (`/mis-plugins-spa/spa-loader-content-html-v5`) bajo la raíz del dominio `javascript.antonydev.tech`.
- [x] El script falla con mensaje claro si `dist/` no existe tras el build (`Error: no existe la carpeta 'dist'...`).
- [x] `grep -n "env.production" deploy.sh` no devuelve nada: no hay bloque de subida de entorno.
- [x] `pnpm build`, `pnpm refresh` y `pnpm dev` siguen funcionando igual (la spec no los toca).
- [ ] (Verificación manual, fuera de la implementación) `./deploy.sh` sube `dist/` y el sitio responde en `https://javascript.antonydev.tech/mis-plugins-spa/spa-loader-content-html-v5/`.

## Decisions

- **Sí:** replicar la estructura del `deploy.sh` de escuelait. Es la plantilla de referencia del VPS y mantiene el mismo flujo (build → una conexión SSH → rsync `--delete`).
- **Sí:** una sola conexión SSH con ControlMaster y `trap cleanup_ssh EXIT`. La contraseña se pide una vez aunque en el futuro haya varios rsync.
- **Sí:** `CONTROL_PATH` con nombre propio (`ssh-deploy-spa-loader-v5-...`). Los sockets de los proyectos hermanos no colisionan entre sí.
- **Sí:** `deploy.sh` en `.gitignore` y `deploy.sh.example` versionado. El real contiene IP y rutas del VPS; el ejemplo documenta cómo crearlo.
- **No:** bloque de `.env.production` ni `--filter 'P .env*'`. En este proyecto no hay PHP en producción: `dist/` es estático y el `.env` solo se usa en build local.
- **No:** ejecutar el despliegue como parte de la spec. La primera subida es una acción manual del usuario una vez nginx esté configurado.
- **No:** variable nueva para la ruta remota en `.env`. Es configuración del script, no de la aplicación.

## Risks

| Risk | Mitigation |
| --- | --- |
| `rsync --delete` borra archivos remotos que no estén en `dist/` si la carpeta se comparte con otra cosa | `REMOTE_PATH` es una carpeta dedicada a este proyecto; nginx la sirve solo para este site. |
| La carpeta remota o su padre no existen en el primer despliegue | Requisito previo: crear la estructura en el VPS al configurar nginx (prompt de sites-available). rsync crea el último nivel si el padre existe. |
| Build generado con un `SITE_BASE` distinto al de producción | El `.env` local ya fija `SITE_BASE=/mis-plugins-spa/spa-loader-content-html-v5`; verificar la URL del sitio tras el primer deploy. |
| La contraseña SSH se pide varias veces si el socket expira | `ControlPersist=15` mantiene la conexión maestra durante la ejecución y `cleanup_ssh` la cierra al salir. |
| `deploy.sh` se commitea por error con la IP del VPS | Está en `.gitignore`; la verificación incluye `git status --ignored`. |

## What is **not** in this spec

- La configuración de nginx (`sites-available`, certificados, HTTPS).
- La creación de la carpeta remota ni usuarios del VPS.
- Despliegue automático con push, hooks o CI.
- Subida de variables de entorno al servidor.
- Cambios en el pipeline de build o en los servidores locales.

Cada uno de esos cambios, si se necesita, debe definirse en su propia spec.
