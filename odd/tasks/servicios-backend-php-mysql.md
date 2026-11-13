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

- **T1** gulpfile (S1) — route: inline — commit: `3f76f34` (C1)
- **T2** src/services PHP (S2, S3) — route: inline — commit: `3f76f34` (C1) + fix `3ac14fc`
- **T3** server espejo Node (S4) — route: inline — commit: `bb57450` (C2) + fix `3ac14fc`
- **T4** docker + env + package.json (S5) — route: inline — commit: `bb57450` (C2) + fix `3ac14fc`
- **T5** deploy.sh hardening (S6) — route: inline — commit: `0a7a9a5` (C3)
- **T6** infra/ producción (S7) — route: inline — commit: `0a7a9a5` (C3)
- **T7** specs/arquitectura skill (S8) — route: inline — commit: `05d25b9` (C4)
- **T8** .htaccess (S9) — route: inline — commit: `0a7a9a5` (C3)

## Log

- **L1** (2026-11-12, pedido original, verbatim): "Portar el patrón completo a spa-loader-content-html-v5. Antes de portar el patrón completo a spa-loader-content-html-v5 lo que hay en la carpeta server/ del proyecto SPA-jQuery-V5 son archivos para el servidor de desarrollo, es decir, para desarrollar en local. Tambien incluye mysql-query.js. Alguna arquitectura para que el backend compartido no viva en server/ que es de desarrollo. Un nombre de carpeta en la raiz del proyecto para todo lo relacionado con el servidor para produccion. Crear una carpeta dentro de specs/ llamada arquitectura o backend donde iran las skills para todo esto."
- **L2** (2026-11-12, decisión de alcance, verbatim): "Implementar la arquitectura y con su ejemplo como en el spa-jquery-v5 con mysql"
- **L3** (2026-11-12, decisiones de arquitectura acordadas): tres zonas — `server/` solo dev, `src/services/` código que viaja en el build (prod = PHP-FPM), `infra/` config del servidor de producción. Carpeta de skills: `specs/arquitectura/`. Regla de ubicación: un proyecto usa el servicio → colocalizado; dos o más → `services/` a nivel dominio (repo aparte).
- **L4** (2026-11-12, adaptaciones vs referencia): defaults `javascript_user` / `javascript_mis_plugins_spa`, puerto MySQL local `3308` (la referencia usa 3307 para no pisar a jquery), container name `javascript-mis-plugins-spa-mysql`.
- **L5** (2026-11-13, evidencia de commits): C1 `3f76f34` (gulpfile.js, src/services/load-env.php, src/services/mysql/query.php — 447+/4-); C2 `bb57450` (server/mysql-query.js, server/dev-server.js, docker-compose.yml, .env.example, docker/mysql/init/01-stacks.sql, package.json — 403+); C3 `0a7a9a5` (.htaccess, deploy.sh.example, infra/ — 154+); C4 `05d25b9` (specs/arquitectura/01-servicios-backend-arquitectura.md, odd/tasks — 114+); fix `3ac14fc` (query.php, mysql-query.js, docker-compose.yml — cierra bypass `WITH-DML` y honra `MYSQL_DATABASE`). Nota: `deploy.sh` real está en `.gitignore` (línea 26, contiene host/credenciales); se commitea la plantilla `deploy.sh.example`, coherente con el patrón jQuery.
- **L6** (2026-11-13, re-verificación del fix `3ac14fc`): `php -l` (query.php, load-env.php) y `node --check` (mysql-query.js) OK. Batería determinística de 12 casos contra el regex exacto de `mysql_query_reject`/`rejectReason` (copiado literal): PHP y Node en paridad perfecta. Rechaza `WITH ... UPDATE/DELETE/INSERT`; no rompe lecturas (`SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, `WITH ... SELECT`, `WITH RECURSIVE`). Falsos positivos aceptables (conservador, rechaza de más): literales `'update'`/`'delete'` e identificadores con backticks `` `update` ``. `MYSQL_DATABASE` con default `javascript_mis_plugins_spa` en docker-compose, query.php y mysql-query.js (paridad).
- **L7** (2026-11-13, cierre de verificación local y deploy a producción):
  - Tipo numérico: `query.php` normalizado con `mysqli_init` + `MYSQLI_OPT_INT_AND_FLOAT_NATIVE` + `mysqli_real_connect`. PHP y Node devuelven `id`/enteros como número. Commit `0477964`.
  - Tipado del build: `gulpfile.js` sin errores `tsc` (checkJs + strict). Commit `08b7a90`.
  - `deploy.sh`/`deploy.sh.example`: el `.env.production` se sube con `--chown=root:www-data` (antes `-a` preservaba el dueño local y PHP-FPM no podía leerlo).
  - Producción: MySQL Community Server 8.0.46 (`mysql.service`) en `127.0.0.1:3306`; base `javascript_mis_plugins_spa` y usuario `javascript_user` en `localhost` y `127.0.0.1` con `GRANT SELECT` sobre esa base. `.env.production` local (gitignored) subido como `.env` con `root:www-data 640`.
  - nginx: bloque v5 migrado de `alias` a `root /var/www/javascript.antonydev.tech` + `location ~ /\.env { deny all; return 404; }` + `location ~ \.php$` a `php8.3-fpm.sock`. Backup en `/root/javascript.antonydev.tech.bak-*`.
  - `404.html` creado en la raíz del dominio: sin él, `error_page 404 /404.html` encadenaba con `location /` → `/index.html` inexistente y producía un ciclo (500) en lugar de 404.
  - Verificación real: `POST {"sql":"SELECT 1 AS ok"}` → `{"ok":true,...,"rows":[{"ok":1}],...}` con `ok` numérico; `GET query.php` → 405; `GET .env` → 404; ruta inexistente bajo el SPA → 200 (fallback esperado a `index.html`).
  - Pendiente de commit: `deploy.sh.example` y este `L7`. `deploy.sh` real y `.env.production` quedan gitignored.
