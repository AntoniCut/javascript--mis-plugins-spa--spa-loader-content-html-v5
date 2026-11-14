# AGENTS.md

Guía operativa para agentes de IA y colaboradores automáticos.
Si algo de acá contradice al código, gana el código: corregí este archivo en el mismo cambio.

## Qué es este proyecto

Plugin SPA en Vanilla JS (ES Modules) que carga contenido HTML dinámicamente y
renderiza código fuente resaltado con Shiki (tema `dark-plus`).
Se publica como sitio estático en `javascript.antonydev.tech` y, desde la zona
`api/`, expone un API Node de solo lectura en `/api` (Express + mysql2).

- Package manager: **pnpm** (hay `pnpm-lock.yaml` y `pnpm-workspace.yaml`).
- Entorno de referencia: Node 24 / pnpm 11.
- No usa framework de UI ni bundler genérico: el build es Gulp 5.

## Regla de oro: nunca edites código generado

| Carpeta | Origen | ¿Editable? |
|---|---|---|
| `src/` | fuente de verdad | **sí** |
| `app/` | generado por Gulp desde `src/` | no (gitignored) |
| `dist/` | generado por `pnpm build` | no (gitignored) |
| `node_modules/` | pnpm | no |

Si un cambio desaparece al correr `pnpm dev` o `pnpm build`, estabas editando
`app/` o `dist/`. El cambio va en `src/`.

## Mapa del repositorio

| Ruta | Qué es |
|---|---|
| `src/` | Código fuente: `main.js`, `spa/`, `plugins/`, `routes/`, `pages/`, `components/`, `effects/`, `config/`, `scss/`, `services/`, `scripts/` |
| `src/scripts/` | Código de ejemplo que se muestra resaltado en el sitio. Sus `*.cjs.js` llevan `// @ts-nocheck`; respetalo |
| `src/markdown-shiki/` | HTML pre-compilado por Shiki (generado, pero versionado) |
| `src/services/` | Endpoints PHP que viajan en el build; en dev los sirve `server/`, en prod PHP-FPM |
| `api/` | Runtime Node compartido por dev y prod: router (`mysql-query.js`), servidor standalone y dependencias propias. Se despliega aparte, no pasa por Gulp |
| `types/` | Tipos globales y JSDoc compartidos (`*.d.js`, `*.d.ts`) |
| `server/` | Runtime **solo de desarrollo**: Express 5, php-cgi, montaje de `/api`, preview |
| `infra/` | Configuración del servidor de **producción**. No se ejecuta en local y **no** se despliega automáticamente |
| `docker/mysql/` | MySQL local para desarrollo (`docker-compose.yml`) |
| `specs/` | Specs numeradas del proyecto; `specs/arquitectura/` guarda las decisiones de arquitectura |
| `odd/tasks/` | Documentos de tareas ODD: `S#` (specs), `T#` (tareas) y log |
| `workflows/` | Logs de prompts. Gitignored, no versionado |
| `gulpfile.js` | Build, watch, Sass, Shiki, imágenes y minificado |

## Comandos

| Comando | Para qué |
|---|---|
| `pnpm install` | Instalar dependencias |
| `pnpm dev` | Reset + regenerar `app/` + watch + servidor de desarrollo |
| `pnpm dev:watch` | Solo watch `src/` → `app/` |
| `pnpm refresh` | Regenerar `app/` sin quedar a la escucha |
| `pnpm build` | Generar `dist/` de producción |
| `pnpm preview` | Servir `dist/` y abrir navegador |
| `pnpm code-highlight` | Compilar SCSS y regenerar los bloques Shiki |
| `node api/src/server.js` | Levantar el API Node standalone (lee `api/.env` o el `.env` raíz) |
| `pnpm stop:dev` / `pnpm stop:preview` | Cerrar servidores |
| `pnpm test` | **Placeholder**: no hay tests, falla a propósito |

Si el puerto configurado está ocupado, los servidores prueban el siguiente libre
(+1 hasta 20 intentos) y lo avisan por consola. No asumas 3000 ni 4173.

## Verificación obligatoria

No hay suite de tests. Antes de dar un cambio por terminado:

1. `pnpm build` termina sin errores.
2. `pnpm preview` sirve `dist/` y la vista tocada carga sin errores de consola.
3. Si tocaste un archivo fuente referenciado por una ruta de Shiki: `pnpm code-highlight`.
4. Si tocaste `api/` o el dev server: `node --check` de los JS y `curl` a
   `/api/health` y `/api/mysql/query` en el puerto que imprima `pnpm dev`.

No inventes resultados de tests que no existen. Reportá `pnpm test` como
no disponible en vez de presentarlo como verde.

## Convenciones de código

- JavaScript vanilla, ES Modules. El código de navegador en `src/` no usa
  dependencias externas; Shiki corre en Node durante el build.
- **Comentarios y documentación en español.**
- Cada instrucción lleva su comentario y cada archivo su banner. Antes de editar
  `.js`, `.ts` o `.html`, cargá las skills `skill-javascript` y
  `skill-format-comment-code` (o `skill-typescript` para `.ts`).
- Tipado con JSDoc. Los tipos compartidos viven en `types/`, no duplicados por archivo.
- HTML semántico, sin `innerHTML` salvo donde el diseño ya lo usa (Shiki), sin
  `alert`/`confirm`/`prompt`, sin `var`.
- `%SITE_BASE%` es un marcador: lo sustituye el servidor de dev y `pnpm build`.
  Nunca hardcodees la base del sitio; en navegador sale de `<base href>` vía
  `src/config/site-base.js`.

## Secretos y archivos que NO se commitean

| Archivo | Motivo |
|---|---|
| `.env`, `.env.*` | Credenciales locales. La plantilla versionada es `.env.example` |
| `api/.env` | Credenciales locales del API Node. La plantilla versionada es `api/.env.example` |
| `.env.production` | Credenciales MySQL de producción |
| `deploy.sh` | Contiene host/IP del VPS. La plantilla versionada es `deploy.sh.example` |
| `app/`, `dist/`, `node_modules/` | Generados |
| `workflows/`, `.atl/`, `.playwright-mcp/` | Estado local de herramientas |

## Producción

`deploy.sh` hace `pnpm build`, sube `dist/` y `.env.production` (como `.env`
remoto, `F640 root:www-data`) y además despliega el API Node: `api/` →
`/opt/javascript-node-api`, `pnpm install --prod`, `.env.production` →
`/opt/javascript-node-api/.env` y `systemctl restart javascript-node`.
No toca nginx, PHP-FPM ni la base:

- `infra/` se aplica **a mano** en el VPS. Cambiar un archivo de `infra/` no
  cambia nada en producción hasta copiarlo y recargar nginx.
- `infra/nginx/*.conf` es un **fragmento** de `location`, no un site file
  completo. Va dentro del `server {}` existente. Pisar el site file con este
  archivo rompe `nginx -t`.
- El `deny` del `.env` en nginx es obligatorio: sin él el `.env` se puede pedir
  por HTTP. PHP lo sigue leyendo desde disco.
- `rsync --delete` borra en remoto lo que no esté en `dist/`. Los `--exclude` y
  `--filter 'P .env'` protegen el `.env`; no los quites.
- El `.env` remoto debe quedar `root:www-data` 640. Si no, PHP responde
  `Access denied`.
- `api/` no va al web root ni a `dist/`: el proceso Node vive en `/opt`.
- El prefijo `/api` está reservado por nginx para el API Node; no lo uses para
  assets estáticos.
- `infra/provision/provision-vps.sh` **no** instala ni reemplaza el motor
  MySQL/MariaDB: la base y el usuario se configuran a mano. Instalar
  `mariadb-server` sobre un MySQL existente hace que apt lo elimine y mueva el
  datadir.

## Specs, tareas y skills del proyecto

- Los cambios grandes pasan por `specs/` antes de tocar código. Skills de
  proyecto: `.agents/skills/spec` y `.agents/skills/spec-impl`.
- `odd/tasks/*.md` es la fuente de verdad de una tarea en curso: leé hasta
  `## Log` y reportá qué `S#` cubriste.
- El índice de skills está en `.atl/skill-registry.md`.

## Git

- Commits en **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`…).
- Ramas descriptivas: `feat/…`, `fix/…`, `docs/…`.
- Sin `Co-Authored-By` ni atribución de IA.
- Un commit por unidad de trabajo revisable: código, tests y docs juntos.
- No commitees nada de la tabla de secretos ni código generado.

## Trampas conocidas

1. `pnpm dev` **vacía** `app/` y `src/markdown-shiki/`: no guardes nada ahí.
2. Las entradas Shiki `-css` leen el CSS ya compilado en `app/css/pages/`, no el SCSS.
3. `src/markdown-shiki/` está versionado aunque sea generado: si cambiás una
   fuente referenciada, regeneralo y commiteá el resultado.
4. `index.html` y `.htaccess` viven en la raíz y llevan `%SITE_BASE%`.
5. `src/plugins/spa-loader-content-html/v5/` es la versión activa del plugin.
   No hay que tocar versiones anteriores.
6. `api/` no se copia a `dist/`: el runtime Node se despliega a
   `/opt/javascript-node-api` y arranca como `javascript-node`.
7. `/api` está reservado por nginx para el API Node; no lo uses para assets.
8. `api/src/load-env.js` carga `api/.env` y, en dev, el `.env` raíz; no pisa
   variables ya definidas.
