# SPEC 09 — View Transition del plugin vs transición de navegación del navegador

> **Estado:** Aprobado
> **Depende de:** Ninguna
> **Fecha:** 2026-11-12
> **Objetivo:** Eliminar el error de consola `Transition was skipped. Navigation transition active` en navegación back/forward rápida haciendo que el plugin no inicie su View Transition cuando el navegador ya arrancó la propia (vía `PopStateEvent.hasUAVisualTransition`), manteniendo la animación en navegaciones por clic.

## Why this spec exists

Anotado en SPEC 08 ("What is not in this spec"): con historial home → ruta → back/back/forward rápido, Chrome arranca su propia same-document view transition de historial y, cuando el plugin llama a `document.startViewTransition()`, la consola registra `Transition was skipped. Navigation transition active`. Es solo ruido de consola (la navegación funciona y la animación del plugin nunca llegó a verse en ese caso). El HTML spec añadió la propiedad `PopStateEvent.hasUAVisualTransition` exactamente para detectar esta situación: `true` cuando el user agent ya arrancó una transición visual para esta navegación.

## Scope

**In:**

- Flag de closure `hasUAVisualTransition` junto a `isPopNavigation` (línea ~28 de `src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js`).
- En el handler de `popstate` (línea ~2130): `hasUAVisualTransition = e.hasUAVisualTransition === true;`.
- En `loadContent()`: consumir el flag (leer a local y resetear) y añadirlo a la condición de `document.startViewTransition` (línea ~541).
- `pnpm refresh` para regenerar `app/`.
- Verificación Playwright: repro de back/back/forward, navegación por clic y popstate sintético sin la propiedad.
- `node --check` y `pnpm build`.

**Out of scope (for future specs):**

- Framework de test o tests automatizados.
- Refactor del monolito del plugin ni deuda del pipeline Shiki.
- Animar manualmente el back/forward en Chrome (el navegador ya lo anima con su transición propia).
- Editar `specs/08-bug-plugin-spa.md` (documento histórico cerrado).
- Otras variantes de `Transition was skipped` (p. ej. `New ViewTransition started`): ya cubiertas por SPEC 08.

## Data model

Sin estructuras de estado nuevas de ejecución. Se añade un flag de closure:

- `hasUAVisualTransition` (booleano): `true` mientras la navegación en curso proviene de un `popstate` cuyo `e.hasUAVisualTransition` fue `true`. Se consume una única vez al inicio de `loadContent()`.

## Implementation plan

1. Declarar `let hasUAVisualTransition = false;` junto a `isPopNavigation` (línea ~28), con comentario al estilo del archivo.
2. En el handler de `popstate` (línea ~2130): asignar `hasUAVisualTransition = e.hasUAVisualTransition === true;` antes de cargar la ruta. La coerción explícita hace que navegadores sin la propiedad (`undefined`) sigan el camino actual.
3. En `loadContent()` (inicio, ~línea 502): leer el flag a una local (`const skipViewTransition = hasUAVisualTransition;`) y resetear `hasUAVisualTransition = false;` (consumo único, evita que un abort deje el flag pegado).
4. En la condición de FASE 2 (línea ~541): `if (document.startViewTransition && !activeViewTransition && !skipViewTransition)`. El `else` ya muta directo.
5. `pnpm refresh` para regenerar `app/` con el cambio.
6. Verificación Playwright contra `pnpm dev`: repro home → ruta → back/back/forward rápido, navegación por clic y popstate sintético.
7. `node --check src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js` y `pnpm build`.

## Acceptance criteria

- [ ] Repro home → htmlPage (clic) → back → back → forward rápido: la consola NO muestra `Transition was skipped. Navigation transition active`.
- [ ] En ese repro, la URL final y el contenido corresponden a la ruta correcta.
- [ ] Navegación por clic (sin popstate): el plugin inicia su View Transition (espía de `document.startViewTransition` incrementa y aparecen animaciones `::view-transition` en `document.getAnimations()`), sin error de consola.
- [ ] Popstate sintético sin la propiedad (`new PopStateEvent('popstate', { state })`): back/forward mantiene la animación del plugin (espía incrementa), sin error de consola.
- [ ] `node --check src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js` termina con código 0.
- [ ] `pnpm build` termina con código 0.
- [ ] `git diff` toca solo `src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js`, su render generado `src/markdown-shiki/plugins/v5/spa-loader-content-html-js.html` y `specs/09-view-transition-popstate.md`.

## Decisions

- **Sí:** usar `PopStateEvent.hasUAVisualTransition` (propiedad estándar del HTML spec) en vez de heurísticas con `document.getAnimations()`. Existe precisamente para este caso.
- **Sí:** consumo único del flag al inicio de `loadContent()` en vez de resetearlo solo junto a `isPopNavigation` en `applyRouteMetaSync()`. Si la navegación de popstate se aborta, ese punto nunca se alcanza y el flag quedaría en `true`.
- **Sí:** coerción `=== true`. En navegadores sin la propiedad queda `false` y el comportamiento es el actual.
- **No:** saltar la animación en toda navegación popstate. Firefox/Safari (y Chromium si dejara de animar traversals) perderían la animación sin motivo.
- **No:** `@view-transition { navigation: auto }` como unificación. Es para navegaciones cross-document; no aplica a una SPA con History API.
- **No:** editar `specs/08-bug-plugin-spa.md`. Es un documento histórico cerrado; esta spec la referencia en "Why this spec exists".

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Un clic dentro de la ventana async entre `popstate` y `loadContent` consume el flag y omite una transición | Caso rarísimo y solo cosmético (la mutación es inmediata); la alternativa (reset en `applyRouteMetaSync`) deja el flag pegado tras un abort. |
| `hasUAVisualTransition` no existe en navegadores antiguos | La coerción `=== true` lo trata como `false`; degrada al comportamiento actual. |
| Chrome deje de arrancar la transición UA en traversals en el futuro | La propiedad vendría `false` y el plugin anima igual; no hay dependencia de que Chrome anime. |
| Playwright MCP solo expone Chromium | El caso "propiedad ausente" se cubre con popstate sintético (`new PopStateEvent(...)`). |

## What is **not** in this spec

- Tests automatizados ni framework de testing.
- Refactor del monolito de 2.202 líneas del plugin SPA.
- Deuda del pipeline Shiki.
- Animar manualmente back/forward en Chrome.
- Editar `specs/08-bug-plugin-spa.md`.

Cada uno de esos cambios, si se necesita, debe definirse en su propia spec.
