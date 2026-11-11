# SPEC 08 — Corrección de bugs del plugin SPA

> **Estado:** Aprovada
> **Depende de:** Ninguna
> **Fecha:** 2026-11-11
> **Objetivo:** Corregir en `src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js` los cuatro bugs pendientes del audit 2026-11-10 (race condition en FASE 3, cierre del menú con clic fuera, payload de `spa:route-loaded` y clic con ctrl/cmd) sin tocar el pipeline de build ni introducir framework de test.

## Why this spec exists

El audit del 2026-11-10 (revisado contra el repo el 2026-11-11) dejó confirmados cuatro bugs del plugin SPA. Se reprodujeron los cuatro con Playwright contra `pnpm dev` en `http://localhost:9876/mis-plugins-spa/spa-loader-content-html-v5/`:

- **Bug 1 — race condition:** `loadContent` aborta solo los fetches. FASE 3 (`applyRouteMetaAsync`/`loadScripts`) no tiene guard de `signal` ni de generación, y el `finally` de la navegación vieja limpia `isNavigating`/`activeNavigationAbort` pisando a la navegación nueva. Reproducido con triple clic rápido (cssPage → javascriptPage → jqueryPage): en consola aparece el error `Transition was skipped. New ViewTransition started`, `javascript-page.esm.js` se ejecuta contra el DOM ya mutado de jquery-page (warnings `contenedor [data-js-demo-target="esm"] no encontrado`) y solo se loguea el aborto de la primera navegación (`⏭️ Navegación abortada por una nueva navegación: cssPage`).
- **Bug 2 — menú no se cierra al hacer clic fuera:** el listener global de `document` queda bindeado una sola vez con los closures del navbar de la primera ruta (`dataset._spaClickBound`). Tras la primera navegación anima nodos detached. Reproducido: navegando a html-page, al abrir el menú y hacer clic en el backdrop, el menú sigue abierto tras 700 ms.
- **Bug 3 — payload de `spa:route-loaded`:** el plugin emite `detail: { id, path }` plano, pero los 8 demos `*.esm.js` leen `detail?.route?.id` (y su typedef `RouteLoadedDetail` documenta `{ route: { id } }`). Reproducido: la tarjeta ESM de home y de cada ruta renderiza `ruta activa desconocida`.
- **Bug 4 — ctrl/cmd+clic roto:** el handler de clics hace `e.preventDefault()` sin comprobar modificadores ni botón. Reproducido: ctrl+clic en un enlace no abre pestaña nueva y la SPA navega igualmente en la pestaña actual.

## Scope

**In:**

- Bug 4: early-return en el handler de clics de `setupEventListeners()` cuando `e.defaultPrevented`, `e.button !== 0` o hay modificadores (`metaKey`, `ctrlKey`, `shiftKey`, `altKey`).
- Bug 3: cambiar `notifyRouteLoaded()` para emitir `detail: { route: { id, path } }`.
- Bug 2: en `actionsNavbar()`, el listener global de clic consulta los elementos actuales del DOM en el momento del clic (`.navbar__container`, `.navbar__btn-open`, `.navbar__btn-close`) en vez de usar los closures de la primera invocación; se mantiene el guard `_spaClickBound`.
- Bug 1: en `loadContent()`, limpiar `isNavigating`/`activeNavigationAbort` en el `finally` solo si el controller propio sigue siendo el activo; pasar `signal` a `applyRouteMetaAsync(route, signal)` y comprobar `signal.aborted` antes y después de cada `await loadScripts(s)`; evitar `startViewTransition` solapado con un flag `activeViewTransition` (si hay una transición en curso, aplicar `mutate()` directo).
- Regenerar `app/` con `pnpm refresh` para que la copia servida (`app/plugins/.../spa-loader-content-html.js`) quede al día.
- Verificación de los cuatro escenarios con Playwright contra `pnpm dev`, más regresión de navegación normal y back/forward.

**Out of scope:**

- Framework de test o tests automatizados.
- Deuda del pipeline Shiki (tres fuentes de verdad, hueco en el watch).
- Refactor del monolito de 2.137 líneas del plugin.
- Limpieza de dependencias no usadas (`markdown-it`, `markdown-it-shiki`).
- `.gitignore` de `pnpm-workspace.yaml` y los 36 archivos generados de `src/markdown-shiki/` versionados.

## Data model

Sin estructuras de estado nuevas de ejecución. Cambia la forma del detalle del evento:

```js
// Antes (bug 3)
detail: { id: 'htmlPage', path: '/mis-plugins-spa/spa-loader-content-html-v5/html-page' }

// Después
detail: { route: { id: 'htmlPage', path: '/mis-plugins-spa/spa-loader-content-html-v5/html-page' } }
```

Estado del closure del plugin que se toca o añade:

- `isNavigating` / `activeNavigationAbort`: conservan nombre y rol; el `finally` pasa a comparar identidad con el controller local.
- `activeViewTransition` (nuevo, booleano): `true` mientras hay una View Transition en curso, para saltar la animación en navegaciones solapadas.

## Implementation plan

1. Bug 4 en `setupEventListeners()` (línea ~1989): añadir antes de `e.preventDefault()` el early-return por modificadores, botón y `defaultPrevented`. Prueba manual: `pnpm dev`; clic normal navega por SPA; ctrl+clic abre pestaña nueva y la pestaña actual no cambia de URL.
2. Bug 3 en `notifyRouteLoaded()` (línea ~599): emitir `detail: { route: { id: route?.id || null, path: route?.path || window.location.pathname } }`. Prueba manual: la tarjeta ESM de home y de cada ruta muestra el id real, nunca `desconocida`.
3. Bug 2 en `actionsNavbar()` (línea ~1528): dentro del listener global, resolver con `document.querySelector` los elementos actuales y operar sobre ellos; mantener `_spaClickBound`. Prueba manual: navegar a una segunda ruta, abrir el menú, clic fuera → el menú se cierra; y el menú de la primera ruta (sin navegar) sigue cerrándose igual.
4. Bug 1 en `loadContent()` (línea ~498) y `applyRouteMetaAsync()` (línea ~1278): guardar el controller en variable local y limpiar flags solo si `activeNavigationAbort === controller`; pasar `signal` a `applyRouteMetaAsync` y abortar FASE 3 con AbortError si `signal.aborted`; flag `activeViewTransition` para no iniciar una View Transition encima de otra. Prueba manual: triple clic rápido sin error `Transition was skipped`, sin scripts de ruta abortada contra el DOM final, y con `⏭️ Navegación abortada` para cada navegación descartada.
5. `pnpm refresh` y verificación integral con Playwright (los cuatro escenarios de arriba + navegación normal + back/forward).
6. `node --check src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js` y `pnpm build`.

## Acceptance criteria

- [ ] ctrl+clic (o cmd+clic) en un enlace `a[data-id]` abre el enlace en una pestaña nueva y la pestaña actual NO cambia de URL.
- [ ] Clic normal en un enlace `a[data-id]` sigue navegando por SPA sin recargar la página.
- [ ] En home y en cada una de las 8 páginas de demo, la tarjeta ESM muestra `Evento recibido: ruta activa <code>{id}</code>` con el id real de la ruta, nunca `desconocida`.
- [ ] Después de navegar a una segunda ruta, abrir el menú y hacer clic fuera lo cierra (btn-open visible, btn-close oculto) en menos de 1 s.
- [ ] El menú sigue cerrándose con clic fuera en la primera ruta, sin navegar (sin regresión).
- [ ] Triple clic rápido (cssPage → javascriptPage → jqueryPage): la consola NO muestra `Transition was skipped`; aparece `⏭️ Navegación abortada` para cssPage y para javascriptPage; ningún script de una ruta abortada se ejecuta después de mutar el DOM de la ruta final; la URL final es `/jquery-page`.
- [ ] Navegación back/forward del navegador sigue cargando las rutas correctas.
- [ ] `node --check src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js` termina con código 0.
- [ ] `pnpm build` termina con código 0.
- [ ] `git diff` (sin contar lo que ya regenera el build) toca solo `src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js`, su copia generada `app/plugins/spa-loader-content-html/v5/spa-loader-content-html.js` y `specs/08-bug-plugin-spa.md`.

## Decisions

- **Sí:** corregir el emisor del evento (payload anidado `{ route: { id, path } }`) en vez de los 8 demos. El typedef `RouteLoadedDetail` de los propios demos documenta `{ route: { id } }`: el plugin es la fuente que debe alinearse y con un solo cambio los 8 demos quedan correctos.
- **Sí:** guard de identidad del controller en el `finally` (comparar con `activeNavigationAbort`) en vez de un contador de generaciones. Mismo efecto con menos estado nuevo.
- **Sí:** consultar el DOM en el momento del clic en el listener global del navbar. Mantiene el patrón de listener único (`_spaClickBound`) y evita rebindear por navegación.
- **Sí:** dejar que el navegador maneje ctrl/cmd/shift/alt y clic medio en vez de interceptarlos. Es el comportamiento nativo esperado en una SPA.
- **Sí:** omitir la animación de View Transition si ya hay una en curso (mutar directo). La animación es decorativa; la navegación manda.
- **No:** emitir las dos formas del payload (plano `{ id }` + anidado `{ route }`) por compatibilidad. Solo los demos del repo consumen `spa:route-loaded` y esperan la forma anidada.
- **No:** framework de test en esta spec. Verificación con Playwright manual, `node --check` y `pnpm build`.
- **No:** refactor del monolito ni deuda Shiki. Van en otra spec si el usuario las pide.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Cambiar la forma del evento rompe consumidores externos que lean `detail.id` | En el repo solo los demos consumen `spa:route-loaded` y su typedef documenta `route.id`. El cambio queda documentado en esta spec. |
| Omitir la animación en navegaciones rápidas se percibe como parpadeo | La mutación del DOM sigue siendo inmediata; solo se omite la animación, no el render. |
| El early-return por modificadores deja de capturar clics que antes navegaban (p. ej. clic con shift) | Es el comportamiento nativo esperado: esos clics pertenecen al navegador (nueva pestaña/ventana). |
| El listener del navbar consulta el DOM en cada clic global | Costo despreciable (un `querySelector` por clic); el guard `_spaClickBound` evita listeners duplicados. |
| El guard del `finally` deja flags inconsistentes en algún camino no cubierto | Los criterios de aceptación incluyen triple clic rápido, navegación normal y back/forward. |

## What is **not** in this spec

- Tests automatizados ni framework de testing.
- Deuda del pipeline Shiki (tres fuentes de verdad para el mismo asset, hueco en el watch).
- Refactor del monolito de 2.137 líneas del plugin SPA.
- Limpieza de dependencias no usadas ni `.gitignore` de `pnpm-workspace.yaml`.
- Dejar de versionar los 36 archivos generados de `src/markdown-shiki/`.
- El error preexistente `Transition was skipped. Navigation transition active` en navegación back/forward rápida: Chrome corre su propia same-document view transition de historial mientras el plugin llama a `startViewTransition()`. Es solo un log de consola (la navegación funciona). Anotado para una spec aparte cuando se termine esta.

Cada uno de esos cambios, si se necesita, debe definirse en su propia spec.
