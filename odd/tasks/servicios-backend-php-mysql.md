# Servicios backend colocalizados PHP + MySQL (port del patrón jquery-spa-v5)

- **Objetivo**: portar a spa-loader-content-html-v5 el patrón completo de servicios colocalizados del proyecto `jquery-spa-with-method-load-from-jquery-v5`, con su ejemplo MySQL (opción A elegida por el usuario).
- **Rama**: `feat/servicios-backend-php-mysql`
- **Entrega**: work-unit commits en rama de feature; sin push ni PR (decisión del usuario).
- **Test runner**: no hay framework de tests (placeholder en package.json). Excepción ODD: checks funcionales proporcionales (php -l, gulp refresh/build, php-cgi + dev-server + Docker, bash -n) + differential check contra el commit base.

## Specs

- **S1**: `gulpfile.js` copia `src/services/**/*.{php,js,json,sql,html}` → `app/services/` (task `copyServices`) y minifica el PHP de `app/` → `dist/` (task `minifyServices` con `phpMinifyTransform`). Wire en `buildSources`, watchers y `build`; exclusión de PHP en `copyStaticAssetsToDist`.
- **S2**: `src/services/load-env.php` carga `.env` subiendo carpetas desde `$startDir` (funciones `env_get`, `env_set`, `load_dotenv`; maneja el gotcha PHP-FPM de `getenv`/`putenv`).
- **S3**: `src/services/mysql/query.php` responde `POST {sql}` con JSON de solo lectura: solo `SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH`, rechaza `;` intermedio, `INTO OUTFILE/DUMPFILE`, `LOAD_FILE`, `LOAD DATA`; límites 200 filas / 8000 bytes; mysqli con env `MYSQL_*` (fallback `DB_*`); solo POST (405).
- **S4**: `server/mysql-query.js` espejo Node (Express + mysql2, mismas reglas de rechazo y límites) y registrado en `server/dev-server.js` como `POST {DEV_ROUTE_BASE}/api/mysql/query`, después del handler php-cgi.
- **S5**: `docker-compose.yml` con MySQL local (contenedor propio del proyecto, init SQL con tabla `stacks`, volumen persistente) + variables `MYSQL_*` en `.env.example` y `.env` local; dependencia `mysql2` en package.json.
- **S6**: `deploy.sh` protege `.env`: excluye y filtra `--filter 'P .env'` / `'P .env.*'`, y sube `.env.production` aparte con `--chmod=F640` (port del hardening del proyecto jQuery).
- **S7**: `infra/` con configuración de producción: bloque nginx (estáticos + `deny` de `.env` + `location ~ \.php$` con fastcgi PHP-FPM), notas php-fpm (ownership 640 www-data) y script de provision del VPS.
- **S8**: `specs/arquitectura/` con la skill/documentación del patrón (zonas dev/prod, regla de ubicación colocalizado vs compartido).
- **S9**: `.htaccess` bloquea acceso HTTP a `.env` (FilesMatch `Require all denied`).

## Tasks

- **T1** gulpfile (S1) — route: inline — commit: `3f76f34` — evidencia: refresh copia `app/services/*.php`; build minifica a `dist/app/services/` (231→131 líneas)
- **T2** src/services PHP (S2, S3) — route: inline — commit: `3f76f34` — evidencia: `php -l` OK; sondas php-cgi 405/400/500 según contrato
- **T3** server espejo Node (S4) — route: inline — commit: `bb57450` — evidencia: sondas dev-server 400/500 según contrato
- **T4** docker + env + package.json (S5) — route: inline — commit: `bb57450` — evidencia: mysql2 instalado; Docker daemon no disponible en esta máquina (check ambiental pendiente)
- **T5** deploy.sh hardening (S6) — route: inline — commit: `0a7a9a5` (deploy.sh.example; deploy.sh es local) — evidencia: `bash -n` OK
- **T6** infra/ producción (S7) — route: inline — commit: `0a7a9a5` — evidencia: nginx conf modelada sobre config documentada de referencia
- **T7** specs/arquitectura skill (S8) — route: inline — commit: `05d25b9`
- **T8** .htaccess (S9) — route: inline — commit: `0a7a9a5` — evidencia: FilesMatch presente en dist/.htaccess

## Verificación

- `php -l` en fuentes y minificados: OK.
- `pnpm run refresh` → `app/services/` poblado. `pnpm run build` → `dist/app/services/*` minificado, sin `.env*` en dist.
- Sondas funcionales (dev-server, php-cgi + espejo Node): GET→405, INSERT/DELETE→400, INTO OUTFILE→400, SELECT sin MySQL local→500 "Connection refused" (PHP) / ECONNREFUSED 3308 (Node). Contrato verificado en ambos runtimes.
- Differential check vs `765941d` (worktree scratch con mismo lockfile): dist byte-idéntico salvo adiciones de `services/`, `.htaccess` intencional y sourcemaps con ruta del directorio del scratch.
- Check ambiental pendiente: ida y vuelta real con MySQL (Docker daemon no corre en esta máquina).
- RDD: assessment del slice `765941d..HEAD` → `high` (shell_process en infra/provision). Preflight STATUS → START con consentimiento relay → consent v3 presentado al usuario.

## Log

- **L1** (2026-11-12, pedido original, verbatim): "Portar el patrón completo a spa-loader-content-html-v5. Antes de portar el patrón completo a spa-loader-content-html-v5 lo que hay en la carpeta server/ del proyecto SPA-jQuery-V5 son archivos para el servidor de desarrollo, es decir, para desarrollar en local. Tambien incluye mysql-query.js. Alguna arquitectura para que el backend compartido no viva en server/ que es de desarrollo. Un nombre de carpeta en la raiz del proyecto para todo lo relacionado con el servidor para produccion. Crear una carpeta dentro de specs/ llamada arquitectura o backend donde iran las skills para todo esto."
- **L2** (2026-11-12, decisión de alcance, verbatim): "Implementar la arquitectura y con su ejemplo como en el spa-jquery-v5 con mysql"
- **L3** (2026-11-12, decisiones de arquitectura acordadas): tres zonas — `server/` solo dev, `src/services/` código que viaja en el build (prod = PHP-FPM), `infra/` config del servidor de producción. Carpeta de skills: `specs/arquitectura/`. Regla de ubicación: un proyecto usa el servicio → colocalizado; dos o más → `services/` a nivel dominio (repo aparte).
- **L4** (2026-11-12, adaptaciones vs referencia): defaults `javascript_user` / `javascript_mis_plugins_spa`, puerto MySQL local `3308` (la referencia usa 3307 para no pisar a jquery), container name `javascript-mis-plugins-spa-mysql`.
