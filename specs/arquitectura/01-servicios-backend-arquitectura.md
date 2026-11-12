# 01 — Arquitectura de servicios backend (PHP + Node)

> Carpeta `specs/arquitectura/`: skills y especificaciones de la arquitectura
> de servicios del proyecto. Este documento es la referencia canónica del
> patrón portado desde `jquery-spa-with-method-load-from-jquery-v5`.

## Resumen

- **Objetivo**: separar desarrollo y producción por AMBIENTE (no por runtime),
  con un contrato HTTP único que implementan PHP (prod) y Node (dev).
- **Estado**: implementado en la rama `feat/servicios-backend-php-mysql`.
- **Contrato de ejemplo**: `POST {sql}` → JSON de solo lectura.

## Las tres zonas

| Carpeta | Qué contiene | Corre en |
|---|---|---|
| `server/` | runtime dev: dev/preview servers, php-cgi, espejos Node de la API | solo local |
| `src/services/` | código de los endpoints (`.php`, `.js`, `.json`, `.sql`, `.html`) que Gulp copia al build | dev (php-cgi) y prod (PHP-FPM) |
| `infra/` | configuración del servidor de producción: nginx, php-fpm, provision | solo VPS |

Principio: cada carpeta responde "¿dónde corre esto?", no "¿qué lenguaje es?".

## El contrato dual (un contrato, dos implementaciones)

- **Dev**: `server/mysql-query.js` (Express + mysql2) en `POST {base}/api/mysql/query`, contra MySQL de Docker.
- **Prod**: `dist/services/mysql/query.php` (mysqli) vía PHP-FPM, contra MariaDB del VPS.
- El frontend no distingue: hace `fetch()` y nginx/PHP-FPM o el dev-server deciden quién contesta.

Reglas del contrato (idénticas en ambas implementaciones):

1. Solo `POST`; body JSON `{ "sql": "..." }` (máx 16 KB).
2. Solo lectura: `SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH`.
3. Sin `;` intermedio; sin `INTO OUTFILE/DUMPFILE`, `LOAD_FILE`, `LOAD DATA`.
4. Límites: 200 filas, 8000 bytes de SQL.
5. Errores de sentencia responden en el JSON (`ok: false`), no rompen el HTTP salvo rechazos 400/405.

## Regla de ubicación de servicios

- **Un proyecto** usa el servicio → colocalizado en `src/services/` de ese proyecto.
- **Dos o más proyectos** → repo `services/` a nivel dominio, con su propio `server/`, `src/` e `infra/`.
- El plugin npm (`spa-loader-content-html`) es agnóstico: consume URLs, nunca sabe qué runtime responde.

## Seguridad de secretos (obligatorio en todo port)

1. `deploy.sh` excluye y filtra `.env` (`--filter 'P .env'`) y sube `.env.production` aparte con `F640`.
2. nginx: `location ~ /\.env { deny all; }` — el `.env` vive junto al `index.html`.
3. Apache: `<FilesMatch "^\.env"> Require all denied </FilesMatch>` en `.htaccess`.
4. PHP-FPM corre como `www-data`: el `.env` debe ser `root:www-data 640` (lo garantiza el deploy).

## Inventario del port (v5)

- `gulpfile.js`: `paths.src.services`, `paths.app.php`, `copyServices`, `phpMinifyTransform`, `minifyServices`, exclusión PHP en `copyStaticAssetsToDist`.
- `src/services/load-env.php`: `env_get`/`env_set`/`load_dotenv` (gotcha PHP-FPM: `getenv`/`putenv` no se ven entre sí).
- `src/services/mysql/query.php`: endpoint prod.
- `server/mysql-query.js`: espejo dev + `registerMysqlQueryRoute` en `dev-server.js`.
- `docker-compose.yml` + `docker/mysql/init/01-stacks.sql`: MySQL local (puerto `3308`, base `javascript_mis_plugins_spa`).
- `deploy.sh`: hardening de `.env`.
- `infra/`: nginx, php-fpm, provision.
- `.htaccess`: bloqueo HTTP de `.env`.

## Adaptaciones locales vs la referencia jQuery

| Pieza | Referencia (jquery) | Este proyecto |
|---|---|---|
| Puerto MySQL | 3307 | 3308 (no pisar contenedores jquery) |
| Usuario default | `jquery_user` | `javascript_user` |
| Base default | `jquery_mis_plugins_spa` | `javascript_mis_plugins_spa` |
| Nombre contenedor | `jquery-mis-plugins-spa-mysql` | `javascript-mis-plugins-spa-mysql` |

## Flujo de verificación del patrón

1. `php -l src/services/**.php` — lint de los endpoints.
2. `pnpm run refresh` — `app/services/` poblado.
3. `pnpm run build` — `dist/services/*.php` minificado, sin `.env` en dist.
4. `docker compose up -d` + POST de lectura → filas; POST de escritura → rechazo.
5. Dev-server: `POST {base}/api/mysql/query` → mismas reglas vía Node.
6. `bash -n deploy.sh` + `nginx -t` del bloque de `infra/nginx/`.
