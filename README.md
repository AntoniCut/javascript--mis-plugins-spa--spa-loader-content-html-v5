# spa-loader-content-html-v5

Plugin SPA en Vanilla JS (ES Modules) para cargar contenido HTML dinámicamente,
con renderizado de código fuente resaltado mediante Shiki (tema `dark-plus`).

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

`pnpm stop:dev` busca en ese mismo rango de puertos y solo detiene el `server/dev-server.js` que corre desde este proyecto.

`index.html` y `.htaccess` llevan el marcador `%SITE_BASE%`. El servidor de desarrollo lo sustituye al servir y `pnpm build` lo sustituye en `dist/index.html` y `dist/.htaccess`. En el navegador, `src/config/site-base.js` deduce la base de `<base href>`.

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
