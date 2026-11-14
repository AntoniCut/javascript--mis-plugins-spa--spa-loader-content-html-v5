# spa-loader-content-html-v5

Plugin SPA en Vanilla JS (ES Modules) para cargar contenido HTML dinámicamente,
con renderizado de código fuente resaltado mediante Shiki (tema `dark-plus`).
Incluye un API Node de producción en `/api` (Express + mysql2) para consultas
MySQL de solo lectura.

## Inicio rápido

Requisitos: Node.js 24 y pnpm 11.

```bash
pnpm install
cp .env.example .env   # completá SITE_BASE
pnpm dev
```

La consola imprime la URL y el puerto reales (puede no ser `3000`).
`pnpm dev` vacía y regenera `app/`; editá siempre en `src/`, nunca en `app/` ni `dist/`.

## Scripts

| Script | Descripción |
|---|---|
| `pnpm dev` | Vacía `app/` y `src/markdown-shiki/`, regenera `app/` y arranca watch + servidor. |
| `pnpm dev:watch` | Solo observa `src/` y sincroniza `app/`. No resetea ni levanta el servidor. |
| `pnpm reset` | Vacía `app/` y `src/markdown-shiki/`. No vuelve a copiar ni compilar. |
| `pnpm refresh` | Vacía y vuelve a copiar/compilar `src/` → `app/`, sin quedar a la escucha. |
| `pnpm serve:dev` | Levanta el servidor de desarrollo sobre `app/` ya generado. |
| `pnpm stop:dev` | Cierra el servidor de desarrollo si sigue en marcha. |
| `pnpm server` | Alias de `serve:dev`. |
| `pnpm build` | Limpia `dist/`, `app/` y el HTML de Shiki, regenera `app/` y minifica a `dist/`. |
| `pnpm preview` | Sirve `dist/` en local y abre el navegador. |
| `pnpm stop:preview` | Cierra el servidor de preview si sigue en marcha. |
| `pnpm code-highlight` | Compila el SCSS y regenera los bloques HTML resaltados con Shiki. |
| `pnpm convert-images` | Convierte las capturas PNG de `assets/img/clase-*` a AVIF. |
| `pnpm add:ts-nocheck` | Añade `// @ts-nocheck` a los JS de desarrollo. |

## Variables de entorno

Copia `.env.example` a `.env` antes de arrancar. `SITE_BASE` es obligatoria.

| Variable | Descripción |
|---|---|
| `SITE_BASE` | Base pública del sitio, por ejemplo `/mis-plugins-spa/spa-loader-content-html-v5`. Empieza por `/` y no termina en `/`. La leen los servidores, Gulp (Sass y build) y la SPA. |
| `DEV_SERVER_PORT` | Puerto de partida de `pnpm dev`. Por defecto `3000`. Si está ocupado se usa el siguiente libre (+1, +2…, hasta 20 intentos) y se avisa por consola. |
| `PREVIEW_SERVER_PORT` | Puerto de partida de `pnpm preview`. Por defecto `4173`. Mismo comportamiento que `DEV_SERVER_PORT`. |

`pnpm stop:dev` y `pnpm stop:preview` buscan en esos mismos rangos de puertos y solo detienen el `server/dev-server.js` o el `server/preview-server.js` que corren desde este proyecto.

`index.html` y `.htaccess` llevan el marcador `%SITE_BASE%`. El servidor de desarrollo lo sustituye al servir y `pnpm build` lo sustituye en `dist/index.html` y `dist/.htaccess`. En el navegador, `src/config/site-base.js` deduce la base de `<base href>`.

## API Node (`/api`)

El runtime Node vive en `api/` y es el mismo en desarrollo y producción:

| Endpoint | Qué hace |
|---|---|
| `GET /api/health` | Confirma que el proceso responde; no toca MySQL. |
| `POST /api/mysql/query` | Ejecuta una consulta de solo lectura (`{ "sql": "..." }`, máx 16 KB). |

- En dev lo monta `server/dev-server.js` en la raíz del origen: `http://localhost:<puerto>/api`.
- En prod corre como `javascript-node` (systemd) detrás de nginx, con el código en
  `/opt/javascript-node-api` y el `.env` en `/opt/javascript-node-api/.env`
  (`F640 root:www-data`).
- Standalone local: `node api/src/server.js` (lee `api/.env`; si no existe, el `.env` raíz).
- La plantilla de variables es `api/.env.example`: `API_HOST`, `API_PORT` y las `MYSQL_*`.

## Estructura del proyecto

| Ruta | Qué es | ¿Se versiona? |
|---|---|---|
| `src/` | Fuente de verdad: SPA, plugin, rutas, páginas, SCSS y servicios PHP | Sí |
| `src/markdown-shiki/` | HTML resaltado por Shiki, pre-generado | Sí |
| `app/` | Copia regenerada por Gulp desde `src/` para desarrollo | No |
| `dist/` | Build minificado para producción | No |
| `api/` | Runtime Node compartido por dev y prod: router, servidor standalone y dependencias propias | Sí |
| `server/` | Runtime **solo de desarrollo**: Express 5, php-cgi, montaje de `/api` y preview | Sí |
| `infra/` | Configuración del servidor de producción (nginx, PHP-FPM, provision). Se aplica a mano en el VPS | Sí |
| `types/` | Tipos globales y JSDoc compartidos | Sí |
| `docker/mysql/` | MySQL local para desarrollo | Sí |
| `specs/` | Specs numeradas y decisiones de arquitectura | Sí |
| `odd/tasks/` | Documentos de tareas ODD | Sí |

> `app/` y `dist/` son generados. Si un cambio desaparece al correr `pnpm dev` o
> `pnpm build`, estabas editando la carpeta equivocada.

## MarkdownShiki

El proyecto muestra código fuente resaltado en las vistas mediante un pipeline
de **4 pasos** (pre-compilado en Node, renderizado en navegador):

### 1. Generación (Node)

`pnpm code-highlight` ejecuta `generate-markdown-shiki.js`, que:

1. Lee los módulos de `src/routes/route-*.js` y recolecta las entradas
   `MarkdownShikiHtml` (objetos `{ url, target }`).
2. Para cada entrada, deriva el archivo fuente por **convención de nombres
   multi-sufijo** y lo resalta con `codeToHtml()` de Shiki (tema `dark-plus`).
3. Escribe el HTML resultante en `src/markdown-shiki/`.

La generación se ejecuta en paralelo con `Promise.all`.

> **Dependencia de compilación:** las entradas `-css` leen el CSS compilado por
> Gulp en `app/css/pages/`, no el SCSS fuente. Por eso `pnpm code-highlight`
> ejecuta primero `gulp styles`, y en `gulp dev` el watch de SCSS encadena
> `styles → generateShiki → copyMarkdownShiki` automáticamente.

#### Convención de nombres

| Sufijo del `.html` | Archivo fuente | Lenguaje Shiki |
|---|---|---|
| `...-ts.html` | `src/scripts/ts/**/*.ts` | `typescript` |
| `...-js.html` | `src/scripts/js/**/*.js` | `javascript` |
| `...-html.html` | `src/pages/**/*.html` | `html` |
| `...-css.html` | `app/css/pages/**/*.css` (compilado por Gulp) | `css` |

> Los sufijos `cjs-js` / `esm-js` (p. ej. `page.cjs-js.html`) se resuelven
> mediante el sufijo `-js.html` → `page.cjs.js` / `page.esm.js`.

### 2. Copia Gulp

La tarea `copyMarkdownShiki` copia `src/markdown-shiki/` → `app/markdown-shiki/`.
Se ejecuta tanto en `gulp dev` (con watch sobre `src/markdown-shiki/**/*`) como
en `gulp build`. En la cadena de generación, `copyMarkdownShiki` corre siempre
después de `generateShiki` para copiar el HTML recién generado.

### 3. Servidor

El servidor estático sirve el contenido desde `app/`, donde ya están disponibles
los archivos `app/markdown-shiki/**/*.html`.

### 4. Inyección SPA

En el navegador, `renderMarkdownShiki(route)` (dentro de
`src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js`) recorre las
entradas `MarkdownShikiHtml` de la ruta y, para cada una:

- hace `fetch(url)` del HTML pre-compilado,
- localiza el contenedor con `document.querySelector(target)`,
- inserta el HTML con `container.innerHTML`.

Cada entrada debe ser un objeto `{ url: string, target: string }`, donde
`target` es un selector CSS del contenedor destino
(p. ej. `[data-shiki="codeJs"]`).

### Flujo completo

```
src/scripts|pages|scss  ──▶  src/markdown-shiki  ──▶  app/markdown-shiki  ──▶  DOM
   (fuente)        code-highlight   (HTML Shiki)   copyMarkdownShiki   fetch+innerHTML
```

### Regenerar tras editar código fuente

Si modificas un archivo fuente referenciado por una ruta, regenera y deja que el
watch de Gulp copie:

```bash
pnpm code-highlight
```

## Verificación

No hay suite de tests: `pnpm test` es un placeholder que falla a propósito.
La verificación mínima de un cambio es:

1. `pnpm build` termina sin errores.
2. `pnpm preview` sirve `dist/` y la vista tocada carga sin errores de consola.
3. Si tocaste una fuente referenciada por una ruta de Shiki: `pnpm code-highlight`.
4. Si tocaste `api/` o el dev server: `curl http://localhost:<puerto>/api/health` y
   un `POST` de lectura a `/api/mysql/query` en el puerto que imprima `pnpm dev`.

## Deploy

`deploy.sh` (local, gitignored) hace `pnpm build` y sube con rsync:

- `dist/` → `/var/www/javascript.antonydev.tech/mis-plugins-spa/spa-loader-content-html-v5`
  con `--delete`. El `.env` remoto queda protegido por `--exclude` y
  `--filter 'P .env'`.
- `.env.production` → `.env` remoto, con permisos `F640 root:www-data`.
- `api/` → `/opt/javascript-node-api` (sin `node_modules` y sin pisar su `.env`),
  `pnpm install --prod`, `.env.production` → `/opt/javascript-node-api/.env` y
  `systemctl restart javascript-node`.

Lo que **no** hace:

- No aplica `infra/`. El bloque nginx y el provision del VPS se copian y
  ejecutan a mano; ver `infra/README.md`.
- No instala Node ni la unit de systemd: eso lo hace
  `infra/provision/provision-vps.sh`.
- El provision no instala ni reemplaza el motor MySQL/MariaDB; la base y el
  usuario se configuran a mano.
- No crea ni migra la base MySQL.
- No reinicia PHP-FPM.

La plantilla versionada es `deploy.sh.example`: copiala, completá host y rutas, y
no commitees el `deploy.sh` real.

## Documentación para agentes

Las convenciones, los comandos y las trampas del repo para agentes de IA están
en [`AGENTS.md`](./AGENTS.md). Las decisiones de arquitectura y las reglas de
negocio viven en `specs/`, y las tareas en curso en `odd/tasks/`.
