# SPEC 01 — Scripts de package.json

> **Estado:** Implementada
> **Depende de:** —
> **Fecha:** 2026-10-26
> **Objetivo:** Dejar en SPA-V5 el script `convert-images` del package.json de jQuery SPA v5, con la tarea Gulp que lo ejecuta, sin cambiar los scripts que ya coinciden.

## Why this spec exists

El `package.json` de SPA-V5 ya tiene los mismos scripts que `jquery-spa-with-method-load-from-jquery-v5`, salvo `convert-images`. Copiar el bloque entero pisaría `code-highlight`, que en SPA-V5 antepone `gulp styles` porque las entradas `-css` leen `app/css/`.

## Scope

**In:**

- Entrada `scripts.convert-images` con valor `gulp convertImages` en `package.json`.
- Entrada `scriptsDoc.convert-images` con el texto del proyecto jQuery: `Convierte las capturas PNG de assets/img/clase-* a AVIF.`
- Tarea Gulp `convertImages` en `gulpfile.js`, con `AVIF_VARIANTS`, `listClasePngSources`, `getImageStem`, `shouldWriteAvif` y `writeAvifImage`.
- Globs `paths.root.claseImagesPng` (`assets/img/clase-*/*.png`) y el watch de `watchTask` que llama a `convertImages`.
- Dependencia de desarrollo `sharp`.
- Fila `pnpm convert-images` en la tabla de scripts de `README.md`.

**Out of scope (para specs futuras):**

- Igualar `code-highlight` al comando de jQuery (`node generate-markdown-shiki.js` solo).
- Copiar `description`, `keywords`, `author`, `packageManager`, dependencias de jQuery o MySQL.
- Crear capturas PNG en `assets/img/clase-*`.
- Cambiar servidores, rutas de la SPA o el resto de tareas Gulp.

## Data model

No hay modelo de dominio nuevo. Las estructuras que aparecen son la entrada de npm y los dos tamaños AVIF del proyecto jQuery.

```json
"convert-images": "gulp convertImages"
```

```js
const AVIF_VARIANTS = [
    { width: 280, height: 247 },
    { width: 560, height: 494 },
];
```

Cada PNG de `assets/img/clase-*/*.png` produce dos AVIF junto al original: `{stem}-280x247.avif` y `{stem}-560x494.avif`.

## Implementation plan

1. Añadir `sharp` a `devDependencies` con pnpm. El resto de scripts sigue igual.
2. Portar a `gulpfile.js` el import de `sharp`, `paths.root.claseImagesPng`, `AVIF_VARIANTS` y las funciones de conversión, y exportar `convertImages`. Prueba manual: `pnpm exec gulp convertImages` termina aunque no haya PNG.
3. Registrar en `watchTask` el par `[paths.root.claseImagesPng, convertImages]`. `pnpm dev:watch` arranca como antes.
4. Añadir `convert-images` en `scripts` y en `scriptsDoc` de `package.json`.
5. Añadir la fila de `pnpm convert-images` en la tabla de scripts de `README.md`.

## Acceptance criteria

- [ ] `package.json` → `scripts.convert-images` es `gulp convertImages`.
- [ ] `package.json` → `scriptsDoc.convert-images` es `Convierte las capturas PNG de assets/img/clase-* a AVIF.`
- [ ] `package.json` → `scripts.code-highlight` sigue siendo `gulp styles && node generate-markdown-shiki.js`.
- [ ] Las demás claves de `scripts` no cambian: `dev`, `dev:watch`, `reset`, `refresh`, `serve:dev`, `stop:dev`, `server`, `build`, `preview`, `add:ts-nocheck`, `test`.
- [ ] `pnpm convert-images`, sin PNG en `assets/img/clase-*`, termina con código 0 y escribe `No hay PNG en assets/img/clase-*`.
- [ ] `README.md` lista `pnpm convert-images` en la tabla de scripts.
- [ ] `sharp` está en `devDependencies`.

## Decisions

- **Sí:** portar la tarea Gulp y `sharp`. Sin eso, la clave de npm no se puede ejecutar.
- **No:** sustituir `code-highlight` por el comando de jQuery. SPA-V5 compila el SCSS antes, porque el resaltado `-css` lee `app/css/`.
- **No:** traer autor, keywords, `packageManager`, jQuery ni MySQL. No son scripts.
- **No:** inventar capturas PNG. Si no hay archivos, la tarea avisa y sale.
- **Definición rápida:** el alcance A/B/C no se confirmó en el chat. Este borrador usa la opción que añade el único script que falta y deja el resto como está.

## Risks

| Risk | Mitigation |
| --- | --- |
| `sharp` no compila el binario nativo en esta máquina | El criterio de `pnpm convert-images` con código 0 lo detecta antes de dar la spec por cerrada. |
| No hay PNG de `clase-*` en SPA-V5 | La tarea termina con el aviso y no falla. Los AVIF llegan cuando existan las capturas. |

## What is **not** in this spec

- Cambiar el comando de `code-highlight`.
- Metadatos y dependencias de jQuery o MySQL del otro `package.json`.
- Capturas PNG de ejemplo en `assets/img/clase-*`.

Cada uno de esos, si aterriza, va en su propio spec.
