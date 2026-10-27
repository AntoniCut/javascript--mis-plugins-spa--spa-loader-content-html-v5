# SPEC 05 — Tipos globales de arquitectura

> **Estado:** Aprovada
> **Depende de:** Ninguna
> **Fecha:** 2026-10-27
> **Objetivo:** Que los tipos de arquitectura declarados en `/types` estén disponibles globalmente en todo el proyecto sin imports JSDoc ni directivas `/// <reference path>`.

## Why this spec exists

Los tipos `Route`, `RouteManifest`, `RouteStyle`, `ConfigOptionsSPA` y `WaitForFirstSpaRouteLoadedOptions` forman parte del contrato común de la aplicación.

El diseño anterior obligaba a cada consumidor a importar el tipo o añadir una directiva `/// <reference path>`.

Además, añadir `export {}` a los archivos `.d.js` los convertía en módulos y evitaba que sus `@typedef` fueran declaraciones ambientales globales.

Esta spec se crea después de haber iniciado la implementación fuera del flujo SDD. Los cambios permanecen sin commit por decisión expresa y deben revisarse contra este contrato antes de considerar la spec implementada.

## Scope

**In:**

- Mantener separados los tipos de arquitectura en:
    - `types/config-options-spa.d.js`.
    - `types/route-manifest.d.js`.
    - `types/route.d.js`.
    - `types/spa-route-loaded-options.d.js`.
- Integrar `RouteStyle` en `types/route.d.js`, junto con los demás subtipos de `Route`, y eliminar `types/route-style.d.js`.
- Mantener las extensiones DOM globales en `types/dom.d.ts`.
- Conservar `types/global.d.ts` vacío, salvo su banner, como archivo reservado para futuras declaraciones globales.
- Tratar los `.d.js` y `.d.ts` de `/types` como scripts ambientales, sin imports, exports ni referencias entre archivos.
- Incluir explícitamente en `jsconfig.json` los tipos, `src/**/*.js`, `server/**/*.js` y los JavaScript de la raíz.
- Usar directamente nombres como `Route`, `RouteManifest` y `ConfigOptionsSPA` desde cualquier archivo incluido en `jsconfig.json`.
- Eliminar las directivas `/// <reference path>` de los consumidores actuales.
- Regenerar `app/` y `src/markdown-shiki/` mediante el pipeline existente.

**Out of scope:**

- Consolidar todos los tipos en un único archivo.
- Migrar los tipos JSDoc a TypeScript.
- Añadir TypeScript como dependencia o crear un script `typecheck`.
- Cambiar propiedades, nombres o semántica de los tipos existentes.
- Introducir tipos nuevos que no sean necesarios para completar esta globalización.
- Editar manualmente `app/`, `dist/` o `src/markdown-shiki/`.
- Cambiar comportamiento de ejecución de la SPA, las rutas, el plugin o los servidores.

## Data model

Esta funcionalidad no introduce estructuras de datos de ejecución nuevas.

Los `@typedef` existentes conservan sus nombres y propiedades. Solo cambia su alcance: pasan de depender de imports o referencias por archivo a estar disponibles globalmente dentro del proyecto definido por `jsconfig.json`.

`RouteStyle` se mantiene como subtipo independiente, pero su declaración vive en `types/route.d.js` junto con `RouteScript`, `PageComponentEntry`, `MarkdownShikiEntry` y los demás tipos que componen `Route`.

## Implementation plan

1. Mover el `@typedef RouteStyle` a `types/route.d.js`, junto a los demás subtipos de `Route`, y eliminar `types/route-style.d.js`.
2. Convertir los archivos `types/*.d.js` en scripts ambientales eliminando `export {}` y las directivas `/// <reference path>` internas, sin modificar sus `@typedef`.
3. Mantener `types/dom.d.ts` como declaración ambiental global y dejar `types/global.d.ts` reservado, sin exports ni referencias.
4. Actualizar `jsconfig.json` para incluir `types/**/*.d.js`, `types/**/*.d.ts`, `src/**/*.js`, `server/**/*.js` y `*.js`, manteniendo fuera `node_modules`, `app/` y `dist/`.
5. Eliminar las directivas `/// <reference path>` de `src/routes/`, `src/spa/spa.js`, `src/effects/effect-loading-page.js`, `src/plugins/spa-loader-content-html/v5/spa-loader-content-html.js` y `generate-markdown-shiki.js`.
6. Ejecutar `pnpm refresh` para regenerar `app/` y los bloques Shiki desde las fuentes.
7. Verificar el alcance global mediante los diagnósticos del editor, búsquedas de referencias residuales, comprobaciones de sintaxis y revisión del diff.

## Acceptance criteria

- [ ] `Route`, `RouteManifest`, `RouteStyle`, `ConfigOptionsSPA` y `WaitForFirstSpaRouteLoadedOptions` se resuelven en los consumidores incluidos por `jsconfig.json` sin `import(...)` JSDoc.
- [ ] `RouteStyle` está declarado en `types/route.d.js` junto con los demás subtipos de `Route`.
- [ ] `types/route-style.d.js` ya no existe.
- [ ] No queda ninguna directiva `/// <reference path>` en `types/`, `src/`, `app/` ni `generate-markdown-shiki.js`.
- [ ] Ningún archivo de declaraciones de `/types` contiene `import`, `export` ni `export {}`.
- [ ] `jsconfig.json` incluye explícitamente `types/**/*.d.js`, `types/**/*.d.ts`, `src/**/*.js`, `server/**/*.js` y `*.js`.
- [ ] `types/dom.d.ts` continúa ampliando las interfaces DOM globales.
- [ ] `types/global.d.ts` se conserva vacío, salvo su banner, como archivo reservado.
- [ ] Los diagnósticos del editor no muestran errores nuevos en los archivos modificados.
- [ ] `node --check` pasa en los JavaScript fuente modificados.
- [ ] `pnpm refresh` termina correctamente y sincroniza `app/` y `src/markdown-shiki/`.
- [ ] No se añade ninguna dependencia ni script de comprobación de tipos.
- [ ] El cambio no altera el comportamiento de ejecución de la aplicación.

## Decisions

- **Sí:** declaraciones ambientales globales en `/types`. Son contratos compartidos por la arquitectura completa.
- **Sí:** mantener los tipos divididos por dominio. Evita un archivo central grande.
- **Sí:** declarar `RouteStyle` en `types/route.d.js`. Es un subtipo directo de `Route`, igual que `RouteScript`, `PageComponentEntry` y `MarkdownShikiEntry`.
- **No:** conservar `types/route-style.d.js`. Separaría un único subtipo del resto de su dominio sin aportar aislamiento útil.
- **Sí:** ampliar el alcance de `jsconfig.json` a `src/`, `server/` y los JavaScript raíz. Los tipos deben estar disponibles a nivel de proyecto.
- **Sí:** conservar `types/global.d.ts` vacío como archivo reservado. Es una decisión explícita aunque actualmente sea redundante.
- **Sí:** conservar sin commit la implementación iniciada antes de esta spec y revisarla posteriormente contra sus criterios.
- **No:** imports JSDoc y directivas `/// <reference path>`. Dejarían el consumo acoplado a rutas relativas.
- **No:** `export {}` en los archivos de tipos globales. Los convertiría en módulos y limitaría el alcance de los `@typedef`.
- **No:** consolidar todos los tipos en un único archivo.
- **No:** añadir TypeScript o un script `typecheck`. La verificación usa las herramientas existentes del proyecto.

## Risks

| Risk | Mitigation |
| --- | --- |
| Colisión futura entre nombres de tipos globales | Mantener nombres de dominio específicos y revisar cualquier tipo nuevo antes de añadirlo. |
| Un archivo de `/types` incorpora accidentalmente un import o export y deja de ser global | Incluir una búsqueda de imports, exports y referencias en la verificación. |
| `jsconfig.json` amplía la comprobación a archivos raíz o de servidor con errores previos | Considerar únicamente diagnósticos nuevos causados por esta spec y no mezclar su corrección con este alcance. |
| `app/` o los bloques Shiki quedan desincronizados | Ejecutar `pnpm refresh` y no editar salidas generadas manualmente. |
| `types/global.d.ts` vacío puede parecer innecesario | Documentar que se conserva como archivo reservado por decisión del proyecto. |

## What is **not** in this spec

- Una migración a TypeScript.
- Un archivo único con todos los tipos.
- Nuevas propiedades en los contratos de rutas o configuración.
- Un comando de comprobación de tipos para CI.
- Refactors de lógica de la SPA, el plugin, los servidores o el generador Shiki.

Cada uno de esos cambios, si se necesita, debe definirse en su propia spec.
