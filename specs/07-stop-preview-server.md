# SPEC 07 — Script de parada del servidor de preview

> **Estado:** Implementada
> **Depende de:** SPEC 03
> **Fecha:** 2026-11-11
> **Objetivo:** Disponer de `pnpm stop:preview` (`server/stop-preview-server.js`) que detenga la instancia local de `server/preview-server.js` de este proyecto, reutilizando la lógica de detección de procesos de `stop-dev-server.js` extraída a un módulo compartido.

## Why this spec exists

El proyecto tiene `pnpm preview` para servir `dist/` en local, pero no hay forma de detenerlo por comando: si se lanza en background o en otra pestaña, hay que buscar el PID a mano o matar el proceso por el puerto.

`pnpm stop:dev` ya resuelve el mismo problema para el servidor de desarrollo (`server/stop-dev-server.js`, definido en SPEC 03): busca los PIDs que escuchan en el rango de puertos, filtra por comando y `cwd` para no tocar otros proyectos y detiene con SIGTERM.

SPEC 03 dejó fijado el criterio de no duplicar lógica compartida (precedente: `server/find-available-port.js`). Duplicar los ~190 helpers en un `stop-preview-server.js` independiente iría contra ese criterio y contra lo que pide el proyecto.

## Scope

**In:**

- Crear `server/stop-server-helpers.js` con los helpers extraídos de `stop-dev-server.js`: `getProcessIdsListeningOnPorts`, `getProcessCommand`, `getProcessCwd`, `waitForProcessIdsToLeavePorts` y la función `stopServerInstance({ ports, serverScript, instanceLabel, projectRoot })` que ejecuta el flujo completo.
- Refactorizar `server/stop-dev-server.js` como wrapper fino que reutiliza ese módulo, sin cambiar mensajes ni comportamiento.
- Crear `server/stop-preview-server.js` con el rango `PREVIEW_SERVER_PORT … +19`, matcher `server/preview-server.js` y etiqueta `preview`.
- Añadir el script npm `"stop:preview": "node server/stop-preview-server.js"` y su entrada en `scriptsDoc`.
- Documentar `pnpm stop:preview` en la tabla de scripts del README y actualizar la nota de rangos de puertos.

**Out of scope:**

- Soporte de los stops en Windows o macOS (`ss` y `/proc` son Linux-only; ya excluido en SPEC 03).
- Cambios en `server/preview-server.js` (incluido el flag `--open` del script npm, que hoy el servidor no procesa).
- Detener instancias de preview de otros proyectos o de otros directorios del mismo proyecto.
- Señal distinta de SIGTERM o force-kill con SIGKILL si el proceso no responde en 3 s (comportamiento heredado del dev).

## Data model

Sin estructuras de datos de ejecución nuevas. La función compartida recibe un objeto de opciones:

```js
{ ports: number[], serverScript: string, instanceLabel: string, projectRoot: string }
```

- `ports`: rango candidato (`getPortRange(PREVIEW_SERVER_PORT)`).
- `serverScript`: subcadena que identifica el guion del servidor en el comando (`server/preview-server.js`).
- `instanceLabel`: etiqueta para los mensajes (`preview`).
- `projectRoot`: `process.cwd()`; solo se detienen procesos cuyo `/proc/<pid>/cwd` coincida.

## Implementation plan

1. Crear `server/stop-server-helpers.js` con los helpers y `stopServerInstance`. Prueba: `node --check server/stop-server-helpers.js` termina con código 0.
2. Refactorizar `server/stop-dev-server.js` como wrapper. Prueba: `pnpm stop:dev` sin instancia activa imprime el mensaje actual y sale 0.
3. Crear `server/stop-preview-server.js`. Prueba: `node --check server/stop-preview-server.js` termina con código 0.
4. Añadir a `package.json` el script `stop:preview` y su entrada en `scriptsDoc`.
5. Actualizar el README: fila de `pnpm stop:preview` en la tabla y nota de los rangos de puertos.
6. Verificación end-to-end con los criterios de abajo.

## Acceptance criteria

- [x] `node --check` pasa en `server/stop-server-helpers.js`, `server/stop-dev-server.js` y `server/stop-preview-server.js`.
- [x] `pnpm stop:dev` sin servidor activo imprime `No hay ninguna instancia activa de server/dev-server.js...` y termina con código 0 (sin regresión).
- [x] `pnpm stop:preview` sin servidor activo imprime `No hay ninguna instancia activa de server/preview-server.js...` y termina con código 0.
- [x] Con `pnpm preview` corriendo, `pnpm stop:preview` lo detiene, confirma `Instancia de preview detenida. PID: ...` y el puerto queda libre en `ss -ltnp`.
- [x] Con un puerto del rango ocupado por un proceso ajeno, `pnpm stop:preview` lista el proceso y termina con código 1 sin matarlo.
- [x] `pnpm dev`, `pnpm build` y `pnpm preview` siguen funcionando igual (la spec no los toca).
- [x] `git diff` muestra solo los archivos previstos: `server/` (3 archivos), `package.json`, `README.md` y `specs/07-stop-preview-server.md`.

## Decisions

- **Sí:** módulo compartido `server/stop-server-helpers.js`. SPEC 03 ya fijó el criterio (precedente `find-available-port.js`) y evita que las dos paradas diverjan.
- **Sí:** `stopServerInstance` parametrizada por `serverScript` + `instanceLabel`. Los wrappers quedan en ~50 líneas y los mensajes siguen siendo exactos por servidor.
- **Sí:** mantener la semántica actual (SIGTERM + espera de 3 s + `process.exit(1)` si falla). Es comportamiento heredado y probado del dev; cambiarlo es otra spec.
- **Sí:** `process.cwd()` como raíz del proyecto en vez de resolverla por `package.json`. Es lo que ya usa `stop-dev-server.js` y evita matar instancias de otros checkouts.
- **No:** un `stop-preview-server.js` autónomo con la lógica duplicada. Duplicaría ~190 líneas y el proyecto pide no duplicar.
- **No:** un solo script de stop con flag (`--dev`/`--preview`). El patrón del proyecto son scripts npm separados (`stop:dev`) y SPEC 01 fijó el formato de `scriptsDoc`.

## Risks

| Risk | Mitigation |
| --- | --- |
| El refactor de `stop-dev-server.js` cambia un mensaje o un código de salida | Los mensajes se generan con la misma plantilla y las pruebas incluyen `pnpm stop:dev` sin instancia (mensaje y código 0). |
| `stop:preview` detiene el servidor de otro proyecto que comparte el rango | Filtro por `server/preview-server.js` **y** `cwd` exacto, igual que el dev (SPEC 03). |
| `ss -ltnp` no muestra el PID sin permisos | Los procesos propios del usuario siempre son visibles. Los ajenos sin permiso se listan como ocupantes sin poder detenerlos, que es lo esperado. |
| El preview sigue activo tras SIGTERM (shutdown lento) | `waitForProcessIdsToLeavePorts` reintenta durante 3 s; si no sale, error con código 1 en vez de silencio. |

## What is **not** in this spec

- Un comando único que pare ambos servidores (`stop:all`).
- Cerrar la pestaña del navegador abierta por `--open` (flag que hoy no procesa `preview-server.js`).
- Soporte de `stop:*` en Windows/macOS.
- Force-kill (SIGKILL) o configuración del timeout de espera.

Cada uno de esos cambios, si se necesita, debe definirse en su propia spec.
