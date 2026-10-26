# SPEC 02 — Base URL desde variables de entorno

> **Estado:** Aprovado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-26
> **Objetivo:** Que el prefijo `/mis-plugins-spa/spa-loader-content-html-v5` se escriba una sola vez, en `.env` como `SITE_BASE`, y que el resto del proyecto lo lea de ahí en lugar de tenerlo copiado en 8 archivos.

## Why this spec exists

El prefijo está hardcodeado en `index.html`, `.htaccess`, `src/routes/paths.js`, `src/spa/spa.js`, `src/scss/base/_variables.scss`, `server/dev-server.js`, `server/preview-server.js` y en un ejemplo de `spa-loader-content-html-v5.md`. Al copiar el proyecto para una v6 o para otro sitio, hay que acordarse de cambiar todos y no hay nada que avise si uno se queda con el valor viejo.

El prefijo se usa en tres contextos que no comparten mecanismo:

| Contexto | Archivos | Cómo puede leer el valor |
| --- | --- | --- |
| Node | `server/*.js`, `gulpfile.js`, `generate-markdown-shiki.js` | `process.env` (con `dotenv`, que ya está en `devDependencies`) |
| Navegador | `src/routes/paths.js`, `src/spa/spa.js` | No hay `process.env`. Solo puede leer `document.baseURI` |
| Sass | `src/scss/base/_variables.scss` | No hay entorno. Solo funciones registradas desde Gulp |
| Estáticos en la raíz | `index.html`, `.htaccess` | Texto plano. Necesitan sustitución al servir o al construir |

`src/routes/paths.js` lo importan tanto el navegador como Node (`generate-markdown-shiki.js` lo importa y además importa los módulos `route-*.js`, que importan `paths`). Por eso el módulo que lo expone tiene que funcionar en los dos sitios.

## Scope

**In:**

- Variable `SITE_BASE` en `.env` (valor actual: `/mis-plugins-spa/spa-loader-content-html-v5`) y `.env.example` con la misma clave.
- Módulo isomórfico `src/config/site-base.js` que exporta `base`:
    - En Node lee `process.env.SITE_BASE`, lo valida y lo normaliza.
    - En el navegador lo deduce de `document.baseURI`, que ya trae el valor porque el servidor lo escribe en `<base href>`.
- `src/routes/paths.js` y `src/spa/spa.js` importan `base` de ese módulo, sin literal.
- Tarea Gulp `copyConfig` (`src/config/` → `app/config/`), incluida en `buildSources` y en `watchTask`.
- `server/dev-server.js` y `server/preview-server.js` toman `DEV_ROUTE_BASE` de `base`.
- `generate-markdown-shiki.js` importa `base` del módulo nuevo.
- `gulpfile.js`: carga `dotenv/config` el primero y registra la función Sass `site-base()` para `css` y `cssPages`.
- `src/scss/base/_variables.scss`: `$base: site-base();`.
- `index.html`: `<base href="%SITE_BASE%/">`. Sustitución en `dev-server.js` al servir, y en `minifyRootIndex` al construir.
- `.htaccess`: marcadores `%SITE_BASE%`. Nueva tarea `htaccessToDist` que escribe `dist/.htaccess` con el valor real.
- `.gitignore`: excepción `!.env.example`, porque `.env.*` ya lo ignora.
- Documentar `SITE_BASE` en `README.md` y actualizar el ejemplo de `spa-loader-content-html-v5.md` (línea del `const base`).

**Out of scope (para specs futuras):**

- Cambiar el nombre del proyecto en textos visibles (`< spa-loader-content-html-v5 />` en loader, header y footer), `package.json → name` o el título de `README.md`. Son el nombre, no la ruta.
- Hacer configurables los puertos u otras variables que ya están en `.env`.
- Mover el despliegue a un script (`deploy.sh`). Solo se genera `dist/.htaccess`.
- Tocar `src/plugins/spa-loader-content-html/v5/`. Ya recibe `base` por opciones y no lleva literal.
- Cambiar rutas de `assets/`, `app/` o la estructura de carpetas.

## Data model

Una variable de entorno y un módulo que la normaliza.

```dotenv
# .env.example
SITE_BASE=/mis-plugins-spa/spa-loader-content-html-v5
```

Reglas de `SITE_BASE`:

- Obligatoria en Node. Sin valor por defecto: un fallback sería otro literal.
- Empieza por `/`, no termina en `/`, no contiene espacios ni `//`. Patrón: `^(/[A-Za-z0-9._~-]+)+$`.
- Si falta o no cumple, el proceso termina con un error en español que nombra la variable.

Forma prevista del módulo (los banners y comentarios por instrucción se aplican al implementar):

```js
/** @type {string} - `Base pública del sitio` */
export const base = typeof document !== 'undefined'
    ? new URL(document.baseURI).pathname.replace(/\/$/, '')
    : readSiteBaseFromEnv();
```

`readSiteBaseFromEnv()` vive en el mismo archivo, lee `globalThis.process?.env?.SITE_BASE` y lanza `Error` si no pasa el patrón.

Marcador en los estáticos: el texto literal `%SITE_BASE%` (sin barra final; la barra la pone cada archivo).

## Implementation plan

1. Crear `.env.example`, añadir `SITE_BASE` a `.env` local y la excepción `!.env.example` en `.gitignore`.
2. Crear `src/config/site-base.js` con `base` y `readSiteBaseFromEnv()`. Prueba: `SITE_BASE=/x node -e "import('./src/config/site-base.js').then(m => console.log(m.base))"` imprime `/x`. Sin la variable, falla con el mensaje esperado.
3. Cambiar `src/routes/paths.js` y `src/spa/spa.js` para importar `base`. Cambiar el import de `generate-markdown-shiki.js` (`./src/config/site-base.js`). Prueba: `pnpm code-highlight` sigue generando el mismo HTML.
4. En `gulpfile.js`: `import 'dotenv/config'` como primer import, `paths.src.config`, `copyConfig`, alta en `buildSources` y `watchTask`, constante `sassOptions` con `functions: { 'site-base()': () => new sass.SassString(base) }` usada en `css` y `cssPages`. Cambiar `$base` en `_variables.scss`. Prueba: `grep -o "url([^)]*montserrat-v31-latin-100.woff2" app/css/globals.css` muestra el prefijo del `.env`.
5. En `server/dev-server.js` y `server/preview-server.js`: sustituir el literal por `base`. En `dev-server.js` añadir `sendSpaEntry(res)`, que lee `index.html`, reemplaza `%SITE_BASE%` y responde con `text/html`; las dos llamadas a `res.sendFile(SPA_ENTRY_FILE)` pasan a usarla.
6. Sustituir los literales de `index.html` y `.htaccess` por `%SITE_BASE%`. En `gulpfile.js`: reemplazo en `minifyRootIndex` (antes de `htmlmin`) y tarea `htaccessToDist` en el `parallel` final de `build`.
7. Documentar en `README.md` y corregir el ejemplo de `spa-loader-content-html-v5.md`.
8. Verificación completa con los criterios de abajo, incluido un cambio temporal de `SITE_BASE` en `.env` para comprobar que todo lo sigue.

## Acceptance criteria

- [x] `rg "mis-plugins-spa/spa-loader-content-html-v5" -g '!{node_modules,app,dist,.git,workflows,specs,.agents}/**' -g '!.env*'` no devuelve ningún archivo de código, de servidor ni de estilos. Solo puede aparecer en `README.md` y `spa-loader-content-html-v5.md` como documentación del valor de ejemplo.
- [x] `.env.example` existe, está versionado y declara `SITE_BASE`.
- [x] `.env` y `.env.*` (salvo `.env.example`) siguen fuera de git.
- [x] Sin `SITE_BASE`, `pnpm refresh` y `pnpm serve:dev` terminan con código distinto de 0 y un mensaje que nombra `SITE_BASE`.
- [x] `SITE_BASE=abc` (sin barra inicial) o `SITE_BASE=/abc/` (con barra final) se rechaza con el mismo tipo de mensaje.
- [x] `pnpm dev` abre `http://localhost:3000{SITE_BASE}/`, la SPA carga y navega entre rutas sin 404 en la consola.
- [x] Recarga directa en una ruta interna (por ejemplo `{SITE_BASE}/javascript`) devuelve la SPA, no 404.
- [x] `app/css/globals.css` referencia las fuentes con el prefijo de `SITE_BASE`.
- [x] `pnpm code-highlight` produce el mismo HTML en `src/markdown-shiki/` que antes de la spec. La única diferencia admitida es el sourcemap en base64 de los `*-css.html`, que incrusta `_variables.scss`.
- [x] `pnpm build` genera `dist/index.html` con `<base href="{SITE_BASE}/">` y `dist/.htaccess` con `RewriteBase {SITE_BASE}/`; ningún `%SITE_BASE%` queda en `dist/`.
- [x] `pnpm preview` sirve `dist/` en `http://localhost:4173{SITE_BASE}/` y la SPA funciona.
- [x] Cambiar `SITE_BASE` en `.env` a otro valor y repetir `pnpm refresh` + `pnpm dev` mueve todo el sitio a la nueva URL sin editar otros archivos.
- [x] `pnpm convert-images` y los scripts de SPEC 01 siguen funcionando igual.

## Decisions

- **Sí:** una sola variable, `SITE_BASE`, en `.env`. Nombre en inglés, igual que `DEV_SERVER_PORT` y `PREVIEW_SERVER_PORT`.
- **Sí:** en el navegador leer `document.baseURI`. El navegador no tiene entorno, y `<base href>` es lo único que ya debe estar correcto antes de cargar nada. Así no hay archivo generado dentro de `src/` ni un segundo valor que sincronizar.
- **Sí:** un único módulo isomórfico. `paths.js` lo importan Node y el navegador, y dos módulos distintos obligarían a duplicar lógica.
- **Sí:** sin valor por defecto en Node. Un fallback devolvería el literal que queremos eliminar y ocultaría un `.env` mal copiado.
- **Sí:** función Sass `site-base()` registrada desde Gulp. No genera archivos y no añade dependencias.
- **Sí:** marcador `%SITE_BASE%` en `index.html` y `.htaccess`. Consecuencia: abrir `index.html` de la raíz con un servidor estático ajeno al proyecto ya no funciona; con `pnpm dev` y `pnpm preview` sí. Antes tampoco cargaba bien sin el prefijo.
- **Sí:** generar `dist/.htaccess`. Es la única forma de que el valor de producción salga de `.env` sin editar un archivo a mano.
- **No:** archivo generado `src/config/site-config.js`. Gulp lo importa antes de poder crearlo (`generate-markdown-shiki.js` → `paths.js` se evalúa al arrancar), y obligaría a encadenar un paso previo en cada script de `package.json`.
- **No:** variables `PUBLIC_*` ni bundler. El proyecto no usa Vite.
- **No:** renombrar textos visibles del nombre del proyecto. Es otra tarea (SPEC aparte si se pide).
- **Definición rápida:** el alcance no se confirmó en el chat. Este borrador incluye `.htaccess` y `index.html` porque son parte del hardcode que se pidió quitar. Si no se quiere `dist/.htaccess`, se retira el paso 6 parcial y se documenta el valor a mano.

## Risks

| Risk | Mitigation |
| --- | --- |
| `.env` no existe en un clon nuevo | `.env.example` versionado, mensaje de error que nombra `SITE_BASE` y sección en el README. |
| `import 'dotenv/config'` no es el primero en `gulpfile.js` y `base` se evalúa sin la variable | El criterio «sin `SITE_BASE` falla con mensaje claro» también detecta el orden contrario: con `.env` presente y `pnpm refresh` verde, el orden es correcto. |
| `document.baseURI` apunta a otro sitio si alguien quita `<base href>` | `base` resultaría `''` y las rutas se romperían de forma visible. No se añade fallback; se mantiene `<base href>` como contrato de `index.html`. |
| `functions` de `gulp-sass` ignorado y `$base` queda sin definir | Falla la compilación Sass con «undefined function», no silenciosamente. El criterio de `globals.css` lo confirma. |
| `process` sin tipos en `src/` con `checkJs` | Se accede por `globalThis.process?.env` con `@type` en JSDoc. Si el editor se queja, se añade `/// <reference types="node" />` solo en ese archivo. |
| Marcador `%SITE_BASE%` sin reemplazar llega a producción | Criterio de `pnpm build`: `rg "%SITE_BASE%" dist/` sin resultados. |

## What is **not** in this spec

- Renombrar el proyecto (textos, `package.json → name`, repo remoto).
- Hacer configurables puertos, `Content-Security-Policy` u otras opciones del servidor.
- Un `deploy.sh` o automatizar la subida de `dist/`.
- Cambios en el plugin `spa-loader-content-html` v5.

Cada uno de esos, si aterriza, va en su propio spec.
