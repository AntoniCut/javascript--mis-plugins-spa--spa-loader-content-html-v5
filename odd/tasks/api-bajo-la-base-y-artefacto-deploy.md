# API bajo la base del sitio, catálogo pnpm y artefacto de deploy (paridad con JQ-SPA-V5)

- **Objetivo**: cerrar el pendiente 2026-11-15 de `spa-loader-content-html-v5` frente a `jquery-spa-with-method-load-from-jquery-v5`: una sola versión de dependencias, deploy sin `pnpm install` en el VPS y API colgando de `{SITE_BASE}/api/`.
- **Rama**: `feat/api-bajo-la-base-del-sitio`
- **Entrega**: work-unit commits en rama de feature; sin push ni PR (no pedido). Test runner: no hay suite (`pnpm test` es placeholder); checks funcionales proporcionales + differential check contra `main`.
- **Fuente**: `workflows/2026-11-15-js-spa-v5-pendiente.md` (gitignored, local).

## Specs

- **S1** — `pnpm-workspace.yaml` tiene `packages: [api]` y el bloque `catalog` con `dotenv`, `express` y `mysql2`.
- **S2** — `package.json` de la raíz y `api/package.json` referencian `"catalog:"`. `mysql2` sale de las `devDependencies` de la raíz.
- **S3** — Los dos `package.json` declaran `"engines": { "node": ">=24.0.0" }` y la raíz declara `packageManager`.
- **S4** — Existe `.nvmrc` con `24.22.3`.
- **S5** — `deploy.sh` genera el artefacto con `pnpm --filter javascript-node-api deploy .deploy-api --prod`, lo sube a `/opt/javascript-node-api` y ya no ejecuta `pnpm install` en el VPS.
- **S6** — `.gitignore` ignora `.deploy-api/`.
- **S7** — `node-page.esm.js` y `express-page.esm.js` piden `api/mysql/query` y `api/tasks` sin barra inicial. Los textos de las páginas dicen lo mismo.
- **S8** — `infra/nginx/javascript.antonydev.tech-api.conf` proxya `{SITE_BASE}/api/` (`/mis-plugins-spa/spa-loader-content-html-v5/api/`) a `127.0.0.1:3100`, con la barra final del `proxy_pass`.
- **S9** — `.env.example` incluye `CHOKIDAR_USEPOLLING` y `CHOKIDAR_INTERVAL`.
- **S10** — `pnpm code-highlight` regenera el HTML de Shiki de esas páginas. `src/markdown-shiki/` no se edita a mano.
- **S11** (derivada de S7/S8) — `server/dev-server.js` monta los routers en `${DEV_ROUTE_BASE}/api`, porque `api/tasks` relativo al `<base>` en dev resuelve a `{SITE_BASE}/api/...`. Sin esto la demo de desarrollo cae en el fallback de la SPA.
- **S12** (derivada de S1/S2) — `pnpm-workspace.yaml` y `pnpm-lock.yaml` se versionan: sin el workspace en el clon, las referencias `"catalog:"` no resuelven y la promesa de "una sola versión" se rompe. Hoy están en `.gitignore`.
- **S13** (derivada de S7/S8) — La documentación viva (`README.md`, `AGENTS.md`, `infra/README.md`, `infra/provision/provision-vps.sh` y `specs/arquitectura/01-servicios-backend-arquitectura.md`) deja de afirmar que el API está en la raíz `/api`; `specs/10-api-node-produccion.md` recibe una nota de actualización sin reescribir su historia.
- **No se toca**: host, unit `javascript-node`, puerto **3100**, `SITE_BASE`, base y usuario MySQL, plugin, navbar y rutas.

## Tasks

- **T1** (S1, S2, S3, S4, S12) workspace, catálogo y pines — route: inline — commit: C1
- **T2** (S5, S6, S13-deploy) artefacto de deploy — route: inline — commit: C2
- **T3** (S7, S8, S10, S11, S13-api) URLs relativas, dev server, nginx, Shiki y docs — route: inline — commit: C3
- **T4** (S9) `.env.example` de watch — route: inline — commit: C4
- **T5** verificación funcional y differential — route: inline — evidencia en `## Log`

## Log

- **L1** (2026-11-21, pedido original, verbatim): "Necesito que implementes en este proyecto lo que queda pendiente a dia de hoy respecto al proyecto JQ-SPA-V5 ubicado en: /home/antonydev/antonydev-desarrollos/04-jquery-desarrollos/jquery.antonydev.tech/mis-plugins-spa/jquery-spa-with-method-load-from-jquery-v5 Ver el archivo que hay en workflow/2026-11-15-js-spa-v5-pendiente.md. Crear una rama y trabajar con SDD u ODD, segun lo que pida esta funcionalidad."
- **L2** (2026-11-21, clasificación ODD): tarea grande. Riesgo alto por el punto 5 de la lista (deploy, dependencias) y el punto 6 (no hay tests que atrapen una regresión). Verificador independiente al cierre. RDD activo por default (`gentle-ai review mode status`: on, decided by default).
- **L3** (2026-11-21, contrato de referencia leído en JQ): `pnpm-workspace.yaml` con `packages: [api]` + `catalog`; `deploy.sh` con `CI=true pnpm --filter jquery-node-api deploy .deploy-api --prod`; dev server monta `${DEV_ROUTE_BASE}/api`; nginx `location ^~ {SITE_BASE}/api/ { proxy_pass http://127.0.0.1:3200/; }`. En JS cambia solo el puerto destino: 3100.
- **L4** (2026-11-21, decisión derivada S12): versionar `pnpm-workspace.yaml` y `pnpm-lock.yaml`. Sin el workspace versionado, un clon limpio no resuelve `"catalog:"`; no es scope nuevo, es condición de S1/S2.
- **L5** (2026-11-21, decisión derivada S11): mover el montaje del dev server a `${DEV_ROUTE_BASE}/api`. El pendiente no lo lista, pero sin él S7 rompe `pnpm dev` (el `fetch` relativo apunta a la base del sitio, no a la raíz del origen).
