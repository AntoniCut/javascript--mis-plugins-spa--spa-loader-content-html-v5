# SPEC 04 — Comentar todos los .js con skill-javascript y skill-format-comment-code

> **Estado:** Implementado
> **Depende de:** SPEC 03 (toca `server/find-available-port.js`, `dev-server.js`, `preview-server.js`, `stop-dev-server.js`)
> **Fecha:** 2026-10-27
> **Objetivo:** Que cada `.js` del proyecto cumpla el formato de las dos skills (banner de archivo, banner de funciones, comentario de variables y comentario `//  -----  ... -----` en cada instrucción), **sin cambiar el comportamiento del código**.

## Why this spec exists

Hay 48 `.js` versionados fuera de `app/` y `dist/`. El estado actual es desigual:

- Sin comentarios por instrucción: `src/routes/*.js`, `src/scripts/js/pages/*.cjs.js`, `types/*.js`, `addTsNoCheck.js`, `generate-markdown-shiki.js`, `src/routes/paths.js`.
- Con comentarios parciales o en estilos antiguos: el plugin `spa-loader-content-html.js` (2059 líneas), `gulpfile.js`, los cuatro de `server/`, `src/scripts/js/pages/*.esm.js`.
- Banners de archivo de una sola línea en las rutas y en los scripts de página; no cumplen las tres líneas con 4 espacios.
- Banners de función con guiones de distinta longitud que la firma y una línea en blanco entre el JSDoc y la función.
- Estilos antiguos: `/** - texto */` sin backticks, `//*  -----  Constantes  -----`, `console.warn` sin comentario.

## Scope

**In (48 archivos):**

- Raíz: `addTsNoCheck.js`, `generate-markdown-shiki.js`, `gulpfile.js`.
- `server/`: `dev-server.js`, `preview-server.js`, `stop-dev-server.js`, `find-available-port.js`.
- `src/`: `main.js`, `spa/spa.js`, `config/site-base.js`, `effects/effect-loading-page.js`, `plugins/spa-loader-content-html/v5/spa-loader-content-html.js`, `routes/*.js`, `scripts/js/pages/*.cjs.js` y `*.esm.js`.
- `types/`: `config-options-spa(.d).js`, `route(.d).js`, `route-manifest(.d).js`, `route-style.d.js`, `spa-route-loaded-options.js`, `index.js`.

**Modo:** normalizar. Los comentarios existentes se reescriben al formato exacto de las skills; el texto útil se conserva.

**Out of scope:**

- `app/`, `dist/` y `src/markdown-shiki/` (salida generada).
- HTML, SCSS, Markdown.
- Cualquier cambio de lógica, nombres, orden de imports o refactor. Tampoco `jsconfig.json`.
- Mover typedefs a `types/types.d.js` o crear `types/global.d.ts`.
- `innerHTML`, `var`, etc. que ya existan: se anotan, no se cambian aquí.

## Reglas que se aplican (resumen de las skills)

1. **Banner de archivo**: `/*` + 3 líneas con 4 espacios de sangría y misma longitud + `*/` sin sangría. Línea central: `*  -----  nombre.js  --  /ruta/nombre.js  -----  *`.
2. **Funciones de primer nivel**: banner de 5 guiones con firma entre backticks; líneas 1 y 3 de la misma longitud que la 2; descripción con `- `, `@param`, `@return`; sin línea en blanco entre el JSDoc y la función.
3. **Objetos** asignados a variable: banner `` `nombre {}` ``. Typedefs: banner `` `Nombre` ``.
4. **Variables, constantes y funciones locales**: ``/** - `descripción` */``; `@type` solo si el tipo no se infiere.
5. **Cada instrucción** que no sea declaración nueva lleva `//  -----  descripción  -----` justo antes, con la misma sangría.
6. Una línea en blanco entre instrucciones y variables hermanas; tres entre funciones de primer nivel.
7. Comentarios en español, minúsculas salvo nombres propios.
8. **No se comenta**: líneas en blanco, cierres `}`, continuación de llamadas ya comentadas, propiedades de literales de datos (un solo comentario de variable para `PAGE_FEATURES` y los objetos `Route`).

### Casos particulares

- `// @ts-nocheck` se queda en la línea 1; el banner va justo debajo.
- Directivas `/// <reference path=... />` intactas, debajo del banner.
- `@version` y `@author` del plugin se conservan.
- En `types/*.d.js` solo banner de archivo, banner por typedef y el `export {}` con su comentario.

## Implementation plan

1. Preparación: guardar la salida de terser de cada archivo desde `git HEAD`.
2. Lote A — `types/`.
3. Lote B — pequeños de `src/`.
4. Lote C — `src/routes/route-*.js`.
5. Lote D — `src/scripts/js/pages/*`.
6. Lote E — `server/` y raíz.
7. Lote F — `gulpfile.js`.
8. Lote G — plugin.
9. `pnpm code-highlight` y `pnpm refresh`.
10. Verificación.

## Acceptance criteria

- [x] Los 48 archivos empiezan con el banner de archivo correcto.
- [x] Ninguna función de primer nivel tiene banner con longitudes desiguales ni línea en blanco entre el JSDoc y la función.
- [x] Sin instrucciones sin comentario previo, salvo excepciones de la regla 8.
- [x] No queda `//*  -----` ni banners de archivo de una línea.
- [x] `node --check` pasa en todos los archivos.
- [x] `terser` sobre la versión nueva y la de `git HEAD` produce la misma salida.
- [x] `pnpm refresh` y `pnpm code-highlight` terminan sin error; `pnpm build` genera `dist/`.
- [x] La SPA carga y navega por las rutas sin errores en la consola.
- [x] `git diff --stat` solo muestra `.js` de la lista.

## Decisions

- **Sí:** normalizar todo, incluido lo ya comentado.
- **Sí:** equivalencia verificada con `terser` (ya en devDependencies de `gulp-terser`).
- **Sí:** trabajo por lotes con verificación al final de cada uno.
- **No:** refactorizar al comentar.
- **No:** comentar propiedades de datos literales una a una.
- **No:** tocar `app/`, `dist/` ni `src/markdown-shiki/` a mano.

## Risks

- Un comentario mal colocado puede romper la sintaxis: se mitiga con `node --check` y la comparación terser.
- Diff grande en plugin y gulpfile: la comparación terser es la garantía.
- Los ejemplos mostrados en la web (Shiki) cambian: se regeneran con `pnpm code-highlight`.
- `addTsNoCheck.js` espera `// @ts-nocheck` en la línea 1: se respeta.

## What is **not** in this spec

- Comentar HTML, SCSS o Markdown.
- Normalizar el estilo del código.
- Cambios en `jsconfig.json` o los scripts de `package.json`.
- Un linter que haga cumplir el formato de comentarios.
