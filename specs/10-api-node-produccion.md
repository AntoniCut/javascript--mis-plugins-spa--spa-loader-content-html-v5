# SPEC 10 — API Node en producción bajo /api

> **Estado:** Implementado
> **Depende de:** SPEC 06 (deploy del VPS)
> **Fecha:** 2026-11-13
> **Objetivo:** Añadir un runtime Node de producción en `https://javascript.antonydev.tech/api` (same-origin) con el endpoint MySQL de solo lectura y un health, gestionado por systemd, desplegado desde `deploy.sh` y demostrado con una página `node-page` en el SPA.

## Why this spec exists

Hoy el proyecto tiene dos implementaciones del contrato MySQL: PHP en producción (`src/services/mysql/query.php` → PHP-FPM) y Node solo en desarrollo (`server/mysql-query.js`, montado por `server/dev-server.js`). Node nunca sale de la máquina local: `deploy.sh` solo sube `dist/` y `.env.production`, y `infra/provision/provision-vps.sh` no instala Node.

El usuario decidió que el backend Node también corra en producción, en la raíz del dominio (`/api`) y no en un subdominio, porque el workspace de `javascript.antonydev.tech` agrupa proyectos que pueden compartir ese API y same-origin evita CORS, DNS y certificado extra. El subdominio `api.javascript.antonydev.tech` queda como alternativa futura.

Aclaración de estructura: `javascript.antonydev.tech/` no es un repo git; cada plugin (`spa-loader-content-html-v1` … `v5`) es su propio repo. Por eso el código del API se colocaliza en v5 mientras tenga un solo consumidor, y se extrae a un repo de dominio cuando aparezca el segundo.

## Scope

**In:**

- Nueva zona `api/` con el runtime Node de producción: `package.json`, `src/server.js`, `src/mysql-query.js`, `src/load-env.js` y `.env.example`.
- Mover el handler de `server/mysql-query.js` a `api/src/mysql-query.js`; `server/dev-server.js` importa ese módulo (una sola implementación Node para dev y prod).
- Servidor Express standalone: `GET /health` y `POST /mysql/query`, bind en `API_HOST:API_PORT` (`127.0.0.1:3100` por defecto).
- Dev: `server/dev-server.js` monta el router compartido en `/api` en la raíz del dev server y retira la ruta `${DEV_ROUTE_BASE}/api/mysql/query`.
- `infra/systemd/javascript-node.service` (usuario `www-data`, `Restart=on-failure`, logs a journald).
- `infra/nginx/javascript.antonydev.tech-api.conf` (fragmento para el `server {}` del dominio, `location ^~ /api/` con `proxy_pass`).
- `infra/provision/provision-vps.sh`: instalar Node 24 y corepack/pnpm, crear `/opt/javascript-node-api`.
- `deploy.sh` y `deploy.sh.example`: rsync de `api/` a `/opt/javascript-node-api`, `pnpm install --prod`, `.env` de producción y `systemctl restart javascript-node`.
- Página `node-page` en el SPA: shell, componentes, scripts CJS/ESM, SCSS, ruta, manifest, enlaces en navbar/footer y bloques Shiki generados. Consume `POST /api/mysql/query` con URL absoluta desde la raíz.
- Actualización de `specs/arquitectura/01-servicios-backend-arquitectura.md`, `infra/README.md`, `README.md` y `AGENTS.md` para reflejar la nueva zona y el contrato.
- Verificación local (dev server y standalone), de build y de producción (curl, systemd, nginx, página).

**Out of scope (for future specs):**

- Subdominio `api.javascript.antonydev.tech` y su CORS.
- Autenticación, autorización, rate limiting o API keys.
- WebSockets, SSE o streaming.
- PM2 o cluster mode; se usa systemd.
- Tests automatizados o framework de testing.
- Mover el servicio a un repo `services/` a nivel dominio: se hará cuando un segundo proyecto lo consuma.
- Cambios al endpoint PHP `src/services/mysql/query.php` o a sus reglas.
- Migraciones de base de datos o cambios de esquema.
- Despliegue automático por CI/CD; el deploy sigue siendo manual con `./deploy.sh`.

## Data model

### Contrato HTTP

`POST /api/mysql/query` en producción. En standalone el path interno es `/mysql/query` porque nginx quita el prefijo `/api/`.

```json
{ "sql": "SELECT * FROM stacks" }
```

Respuesta válida, idéntica al endpoint PHP:

```json
{
  "ok": true,
  "columns": ["id", "name"],
  "rows": [{ "id": 1, "name": "..." }],
  "rowCount": 1,
  "truncated": false,
  "message": "1 filas."
}
```

Rechazo:

```json
{ "ok": false, "message": "Solo se admiten consultas de lectura: SELECT, SHOW, DESCRIBE o EXPLAIN." }
```

Reglas, idénticas a `src/services/mysql/query.php` y `server/mysql-query.js`:

- Solo `POST`; otro método responde `405`.
- Body JSON `{ "sql": string }`, máximo 16 KB.
- Solo lectura: `SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH`.
- Sin `;` intermedio; sin `INTO OUTFILE/DUMPFILE`, `LOAD_FILE`, `LOAD DATA`.
- Sin `UPDATE|DELETE|INSERT|REPLACE|ALTER|TRUNCATE|DROP|GRANT|REVOKE`, incluido detrás de `WITH`.
- Máximo 200 filas y 8000 caracteres de SQL.
- Errores de sentencia en el JSON (`ok: false`), salvo rechazos 400/405.

`GET /api/health`:

```json
{ "ok": true, "service": "javascript-node-api", "uptime": 12.34, "timestamp": "2026-11-13T22:00:00.000Z" }
```

No toca MySQL: solo confirma que el proceso Node responde.

### Variables de entorno

```dotenv
API_HOST=127.0.0.1
API_PORT=3100
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=javascript_user
MYSQL_PASSWORD=...
MYSQL_DATABASE=javascript_mis_plugins_spa
```

Se reutilizan las `MYSQL_*` del `.env.production` existente. `API_HOST` y `API_PORT` son opcionales; por defecto `127.0.0.1:3100`.

### Modelo operativo

- Código en `/opt/javascript-node-api`, fuera del web root para que nginx no pueda servir `src/` ni `.env`.
- systemd: `javascript-node.service`, `User=www-data`, `Group=www-data`, `WorkingDirectory=/opt/javascript-node-api`, `ExecStart=/usr/bin/node src/server.js`, `Restart=on-failure`, `RestartSec=3`.
- nginx: `location ^~ /api/ { proxy_pass http://127.0.0.1:3100/; }` en el `server {}` del dominio. El prefijo `/api/` se quita al proxear.
- `.env` del API en `/opt/javascript-node-api/.env`, `root:www-data 640`.
- Sin CORS: mismo origin en dev (dev server) y en producción (nginx).

## Implementation plan

1. Crear `api/package.json` (`"type": "module"`, dependencias `express`, `mysql2` y `dotenv` con las mismas versiones del `package.json` raíz), `api/.env.example` y mover `server/mysql-query.js` a `api/src/mysql-query.js`. Actualizar el import en `server/dev-server.js` y verificar que `pnpm dev` sigue respondiendo en la ruta actual. Commit.
2. Añadir `api/src/load-env.js` y `api/src/server.js`: Express standalone con `GET /health`, `POST /mysql/query`, `app.disable('x-powered-by')`, `express.json({ limit: '16kb' })`, `405` para métodos no permitidos y `listen` en `API_HOST:API_PORT`. Verificar con Docker MySQL: `node api/src/server.js` + curl a `/health` y `/mysql/query`. Commit.
3. Cambiar `server/dev-server.js` para montar el router compartido en `/api` en la raíz (`app.use('/api', router)`), retirar la ruta `${DEV_ROUTE_BASE}/api/mysql/query` y verificar `curl http://localhost:9876/api/health` y `POST /api/mysql/query`. Commit.
4. Añadir `infra/systemd/javascript-node.service`, `infra/nginx/javascript.antonydev.tech-api.conf` y actualizar `infra/provision/provision-vps.sh` (Node 24 + corepack, `/opt/javascript-node-api`, unit enable). Verificar `systemd-analyze verify` en local y `nginx -t` en el VPS. Commit.
5. Extender `deploy.sh` y `deploy.sh.example`: rsync de `api/` a `/opt/javascript-node-api` (excluir `node_modules`, proteger `.env` con `--filter 'P .env'`), `pnpm install --prod`, subir `.env.production` como `.env` con `F640` y `root:www-data`, y `systemctl restart javascript-node`. Verificar `bash -n` y el deploy real. Commit.
6. Añadir `node-page`: `src/pages/node/node-page.html`, `src/pages-components/node/*.html`, `src/scripts/js/pages/node-page.cjs.js` y `.esm.js`, `src/scss/pages/node-page.scss`, `src/routes/route-node-page.js`, entrada en `route-manifest.js`, enlaces en `layout-navbar.html` y `layout-footer.html`, y bloques generados en `src/markdown-shiki/pages/node/`. El fetch usa `/api/mysql/query` absoluto. Verificar en dev. Commit.
7. Actualizar `specs/arquitectura/01-servicios-backend-arquitectura.md`, `infra/README.md`, `README.md` y `AGENTS.md`. Verificar producción: health, query, rechazo de escritura, `systemctl status`, `GET /api/.env` y `GET /api/src/server.js` (404), `node-page` y `mysql-page`. Commit final.

## Acceptance criteria

- [x] `pnpm dev` arranca y `GET http://localhost:9876/api/health` responde 200 con `ok: true`.
- [x] `POST http://localhost:9876/api/mysql/query` con `{"sql":"SELECT 1 AS ok"}` responde `ok: true`, `rows: [{ "ok": 1 }]` y `ok` numérico.
- [x] Una consulta de escritura (`DELETE FROM stacks`) responde 400 con `ok: false` y mensaje; `GET /api/mysql/query` responde 405.
- [x] `node api/src/server.js` con Docker MySQL responde en `http://127.0.0.1:3100/health` y `/mysql/query` con las mismas reglas.
- [x] `pnpm build` termina con código 0; `dist/app/services/mysql/query.php` sigue existiendo y ningún archivo de `api/` aparece en `dist/`.
- [x] `node --check` sobre `api/src/server.js`, `api/src/mysql-query.js`, `api/src/load-env.js` y `server/dev-server.js` termina con código 0.
- [x] `curl https://javascript.antonydev.tech/api/health` responde 200 con `ok: true`.
- [x] `POST https://javascript.antonydev.tech/api/mysql/query` con `SELECT * FROM stacks` devuelve las filas actuales; `DELETE FROM stacks` responde 400; `GET /api/mysql/query` responde 405.
- [x] `curl -i https://javascript.antonydev.tech/api/.env` y `curl -i https://javascript.antonydev.tech/api/src/server.js` responden 404 o 403; no se expone código ni secretos.
- [x] `systemctl is-active javascript-node` responde `active` y `journalctl -u javascript-node` no muestra un bucle de reinicios.
- [x] La página `node-page` carga, muestra los datos devueltos por Node y rechaza una escritura; `mysql-page` sigue funcionando contra PHP.
- [x] `./deploy.sh` termina sin errores, reinicia el servicio y el health sigue respondiendo después del deploy.
- [x] `git status` solo muestra los archivos previstos en esta spec (más los generados por `pnpm code-highlight`/`pnpm build`).

## Decisions

- **Sí:** same-origin en `https://javascript.antonydev.tech/api`, en la raíz del dominio. Evita CORS, DNS y certificado extra, y deja la puerta abierta a que otros proyectos del workspace consuman el API.
- **Sí:** colocalizar el código en `api/` dentro de v5 por ahora. La regla del proyecto es "un consumidor → colocalizado"; se extrae a un repo de dominio cuando un segundo proyecto lo use.
- **Sí:** una sola implementación Node compartida por dev y prod. Se mueve el handler a `api/src/mysql-query.js` y `server/dev-server.js` lo importa; no se crea una tercera copia.
- **Sí:** systemd en vez de PM2. No agrega dependencia, usa journald y ya es el gestor de nginx, PHP-FPM y MySQL en el VPS.
- **Sí:** health sin tocar MySQL. Sirve para verificar proceso, nginx y systemd sin depender de la base.
- **Sí:** `node-page` nueva y `mysql-page` se queda en PHP. Así se demuestran las dos pilas en producción.
- **Sí:** deploy dentro de `deploy.sh`. Un solo comando para el usuario; el costo es un reinicio breve del API en cada deploy.
- **Sí:** reutilizar `.env.production` para las `MYSQL_*`; el mismo archivo se sube al web root de PHP y a `/opt/javascript-node-api/.env` con permisos distintos.
- **No:** subdominio ahora. Queda para una spec futura; el mismo proceso Node puede servirse desde un `server {}` nuevo sin reescribir la app.
- **No:** autenticación ni rate limiting. Se mantiene la política abierta y de solo lectura del endpoint PHP; se revisa antes de exponer datos sensibles.
- **No:** copiar `api/` a `dist/` ni meterla bajo el web root. El código de un proceso vivo no es un asset estático.
- **No:** CORS. Al ser same-origin no hace falta; se agrega junto con el subdominio.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El proceso Node se cae o entra en bucle de reinicios | `Restart=on-failure`, `RestartSec=3`, health y `journalctl -u javascript-node` para diagnóstico. |
| El deploy estático reinicia el API y hay una caída breve | Aceptable para una demo; si molesta, se separa `deploy-api.sh` en otra spec. |
| Deriva del contrato entre PHP y Node | Node comparte una sola implementación entre dev y prod; los acceptance criteria prueban paridad de lectura, escritura y 405. |
| Exposición de `.env` o código fuente | La app vive en `/opt`, fuera del web root; `.env` queda `root:www-data 640`; nginx mantiene el `deny` de `.env`. |
| Node no está instalado o cambia de versión en el VPS | Provisión instala Node 24 y corepack; el deploy verifica `node -v`. |
| Conflicto en el puerto 3100 | `API_PORT` configurable; verificar con `ss -ltnp` antes de arrancar. |
| `rsync --delete` borra el `.env` remoto del API | Excluir `.env` y usar `--filter 'P .env'`, igual que el deploy estático. |
| El prefijo `/api` choca con un asset estático futuro | El prefijo queda reservado para el API; se documenta en la arquitectura. |
| La unit systemd se habilita antes de que existan los archivos | La provisión solo habilita; el deploy sube el código y arranca el servicio después. |

## What is **not** in this spec

- Subdominio `api.javascript.antonydev.tech` y su CORS.
- Autenticación, autorización, rate limiting o API keys.
- WebSockets, SSE o streaming.
- PM2 o cluster mode.
- Tests automatizados o framework de testing.
- Extraer el servicio a un repo `services/` a nivel dominio.
- Cambios al endpoint PHP o a sus reglas.
- Migraciones de base de datos o cambios de esquema.
- CI/CD automático; el deploy sigue siendo manual.

Cada uno de esos cambios, si se necesita, debe definirse en su propia spec.
