# SPEC 03 — Puerto libre automático en dev-server y preview-server

> **Estado:** Implementado
> **Depende de:** SPEC 02
> **Fecha:** 2026-10-27
> **Objetivo:** Que `pnpm dev` y `pnpm preview` no fallen cuando su puerto está ocupado por otro proyecto: el puerto de `.env` pasa a ser el de partida y, si está ocupado, se prueba el siguiente (+1, +2, …) hasta encontrar uno libre.

## Why this spec exists

Hay varios proyectos en local que usan el mismo par de puertos (`3000` y `4173`). Hoy:

- `server/dev-server.js` llama a `assertPortAvailable()` y, si el puerto está ocupado, termina con `process.exit(1)`. Hay que editar `.env` a mano o cerrar el otro proyecto.
- `server/preview-server.js` hace `app.listen(PREVIEW_SERVER_PORT)` sin ninguna comprobación: si el puerto está ocupado, Node lanza `EADDRINUSE` sin mensaje útil.
- `server/stop-dev-server.js` solo inspecciona `DEV_SERVER_PORT` y `DEV_SERVER_PORT + 1`, y reconoce el proceso por el texto `server/dev-server.js` en su comando. Con varios proyectos corriendo, ese texto coincide en todos: `pnpm stop:dev` podría cerrar el servidor de **otro** proyecto.

Hay un cuarto punto que depende del puerto real: `makePhpHandler(PROJECT_ROOT, DEV_SERVER_PORT)` pasa el puerto a `php-cgi` como `SERVER_PORT`. Si el puerto cambia, ese valor tiene que ser el efectivo, no el de `.env`.

## Scope

**In:**

- Módulo nuevo `server/find-available-port.js` con `findAvailablePort(startPort, options)`:
    - Comprueba `startPort`; si está ocupado, `startPort + 1`, y así hasta `maxAttempts` intentos (por defecto 20).
    - Devuelve el primer puerto libre.
    - Si ninguno está libre, lanza un `Error` en español que nombra la variable de entorno y el rango probado.
    - La comprobación abre un `net.createServer()` temporal en el mismo `host` en el que luego escuchará el servidor real.
- `server/dev-server.js`: sustituye `assertPortAvailable()` por `findAvailablePort(DEV_SERVER_PORT)`. El puerto resultante (`devServerPort`) se usa en BrowserSync y en `makePhpHandler`.
- `server/preview-server.js`: usa `findAvailablePort(PREVIEW_SERVER_PORT, { host: '127.0.0.1' })` antes de `app.listen`. El puerto resultante se usa en `listen`, en `makePhpHandler` y en el mensaje de consola.
- Mensaje de aviso cuando el puerto cambia: `El puerto 3000 está ocupado. Se usa el 3001.`
- `server/stop-dev-server.js`: busca en el rango `DEV_SERVER_PORT … DEV_SERVER_PORT + maxAttempts - 1` y solo detiene procesos cuyo comando incluya `server/dev-server.js` **y** cuyo directorio de trabajo (`/proc/<pid>/cwd`) sea el del proyecto actual (`process.cwd()`).
- `.env.example`, `README.md` y `src/pages-components/home-description.html` (párrafos que mencionan `DEV_SERVER_PORT` y `PREVIEW_SERVER_PORT`): documentan que son el puerto de partida, no un puerto fijo.

**Out of scope (para specs futuras):**

- Abrir el navegador automáticamente (`open: false` se mantiene; el flag `--open` de `pnpm preview` ya no se usa y no se toca aquí).
- Puerto aleatorio o asignado por un registro compartido entre proyectos.
- Variable nueva para el número de intentos. Es una constante del módulo.
- Cambiar el servidor interno de Express del dev-server: ya escucha en el puerto `0` (dinámico) detrás de BrowserSync.
- Soporte de `stop:dev` en Windows o macOS (`ss` y `/proc` ya son Linux-only).
- Tocar `gulpfile.js`, el plugin o la SPA.

## Data model

Sin variables nuevas. Cambia el significado de dos existentes:

| Variable | Antes | Ahora |
| --- | --- | --- |
| `DEV_SERVER_PORT` | Puerto fijo; si está ocupado, error | Puerto de partida. Se usa el primer libre desde ahí |
| `PREVIEW_SERVER_PORT` | Puerto fijo; si está ocupado, `EADDRINUSE` | Puerto de partida. Se usa el primer libre desde ahí |

Forma prevista del módulo (los banners y comentarios por instrucción se aplican al implementar):

```js
/** @type {number} - `Intentos máximos antes de rendirse` */
export const DEFAULT_MAX_PORT_ATTEMPTS = 20;

/**
 * @param {number} startPort
 * @param {{ host?: string, maxAttempts?: number, envName?: string }} [options]
 * @returns {Promise<number>}
 */
export const findAvailablePort = async (startPort, options = {}) => { /* ... */ };
```

Reglas:

- `startPort` debe ser un entero entre 1 y 65535; si no, `Error` que nombra la variable (`options.envName`).
- El rango probado no pasa de 65535.
- `host` por defecto no se indica (todas las interfaces, como BrowserSync); en preview se pasa `127.0.0.1`.

## Implementation plan

1. Crear `server/find-available-port.js` con `findAvailablePort()`. Trasladar ahí la lógica de sonda de `assertPortAvailable()`. Prueba: ocupar el 3000 (`node -e "require('node:net').createServer().listen(3000)"`) y comprobar que `findAvailablePort(3000)` devuelve `3001`.
2. `server/dev-server.js`:
    - Importar el módulo y eliminar `assertPortAvailable()`.
    - Resolver `devServerPort` **antes** de los `app.use(...)`, porque `makePhpHandler(PROJECT_ROOT, DEV_SERVER_PORT)` se registra a nivel de módulo, antes del `await` actual. El `await` pasa a estar arriba del bloque de middlewares.
    - Usar `devServerPort` en `makePhpHandler` y en `bs.init({ port })`.
    - Mantener `process.exit(1)` con mensaje claro si no hay puerto libre.
3. `server/preview-server.js`: resolver `previewServerPort` con el mismo helper, usarlo en `makePhpHandler`, `app.listen` y el `console.log`. Capturar `EADDRINUSE` en `listen` como respaldo (condición de carrera entre sonda y `listen`) con un mensaje que nombre `PREVIEW_SERVER_PORT`.
4. `server/stop-dev-server.js`:
    - `DEV_SERVER_PORTS` pasa a ser el rango completo de puertos candidatos.
    - Nueva función `getProcessCwd(processId)` que lee `/proc/<pid>/cwd` con `fs.readlink`.
    - Un PID solo cuenta como «esta instancia» si su comando incluye `server/dev-server.js` y su cwd es `process.cwd()`. Los demás se listan como ajenos, igual que ahora.
5. Documentar en `.env.example`, `README.md` y `home-description.html`.
6. Verificación con los criterios de abajo.

## Acceptance criteria

- [x] Con el puerto 3000 libre, `pnpm dev` sirve en `http://localhost:3000{SITE_BASE}/` y no imprime avisos de cambio de puerto.
- [x] Con el 3000 ocupado por otro proceso, `pnpm dev` sirve en el 3001, imprime el aviso `El puerto 3000 está ocupado. Se usa el 3001.` y la SPA carga y navega sin 404 en la consola.
- [x] Con 3000 y 3001 ocupados, usa el 3002.
- [x] Con todo el rango ocupado (20 puertos), `pnpm serve:dev` termina con código distinto de 0 y un mensaje que nombra `DEV_SERVER_PORT` y el rango.
- [x] Lo mismo para `pnpm preview` con `PREVIEW_SERVER_PORT` (4173 → 4174) y la URL impresa lleva el puerto real.
- [ ] (No aplica en este proyecto: no tiene `app/services/`; el puerto real llega a `makePhpHandler`) Una petición POST a `…/app/services/mysql/query.php` en el puerto desplazado funciona y `SERVER_PORT` de CGI coincide con el puerto real.
- [x] Dos copias del proyecto (u otro proyecto con `server/dev-server.js`) corriendo a la vez: cada una toma un puerto distinto y ninguna falla al arrancar.
- [x] `pnpm stop:dev` en un proyecto detiene **solo** su servidor, aunque el otro proyecto escuche en un puerto del mismo rango.
- [x] `pnpm stop:dev` sin servidor activo imprime el mensaje actual de «no hay ninguna instancia» y termina con código 0.
- [ ] `pnpm dev`, `pnpm build`, `pnpm refresh` y `pnpm code-highlight` siguen funcionando igual.
- [x] `.env.example` y `README.md` describen ambas variables como puerto de partida.

> **Nota de verificación:** los puertos del `.env` local de este proyecto no son 3000/4173, así que las pruebas se hicieron con el puerto de partida real ocupado por un proceso temporal (dev: +1; preview: +1). El rango completo ocupado y los puertos 3000/3001 se comprobaron directamente sobre `findAvailablePort()`. `pnpm build`, `pnpm refresh` y `pnpm code-highlight` no se tocan en esta spec y no se han vuelto a ejecutar.

## Decisions

- **Sí:** un módulo compartido `server/find-available-port.js`. Los dos servidores y `stop-dev-server.js` necesitan la misma lógica y AGENTS.md pide no duplicarla.
- **Sí:** sin variable nueva para el máximo de intentos. 20 cubre de sobra el caso de varios proyectos y evita otra clave en `.env`.
- **Sí:** el nombre de las variables no cambia (`DEV_SERVER_PORT`, `PREVIEW_SERVER_PORT`). Cambia la semántica a «puerto de partida» y se documenta, para no romper `.env` existentes.
- **Sí:** sondear con el mismo `host` con el que escuchará el servidor. Una sonda en todas las interfaces no detecta igual un conflicto que una en `127.0.0.1`, y viceversa.
- **Sí:** `stop:dev` filtra por `cwd`. Es lo que evita cerrar el servidor de otro proyecto, riesgo que esta spec hace real al permitir varios dev-server en puertos contiguos.
- **No:** archivo de PID o de puerto (`.dev-server.port`). Añadiría un archivo temporal que limpiar, ignorar en git y que puede quedar obsoleto tras un cierre brusco. `ss` + `/proc/<pid>/cwd` ya dan la respuesta sin estado.
- **No:** dejar que BrowserSync busque puerto por su cuenta. Lo hace, pero `makePhpHandler` ya se habría registrado con el puerto de `.env` y el puerto real solo se conocería después.
- **No:** `open` automático del navegador en el puerto elegido. Es otra tarea.

## Risks

| Risk | Mitigation |
| --- | --- |
| Condición de carrera: el puerto se ocupa entre la sonda y el `listen` | Muy poco probable en local. En preview, `EADDRINUSE` en `listen` se captura con mensaje claro; en dev falla BrowserSync con su propio error y se relanza. |
| BrowserSync usa otro puerto además del público (socket/UI) y choca con otro proyecto | `ui: false` ya desactiva la UI. El socket comparte el puerto público. Si apareciera un conflicto real, se amplía la sonda en una spec aparte. |
| `/proc/<pid>/cwd` no legible (proceso de otro usuario) | `ss -ltnp` solo muestra PIDs del mismo usuario, así que los PID que llegan son legibles. Si `readlink` falla, el PID se trata como ajeno. |
| `.env` antiguo con un puerto distinto al esperado | Sin cambios de formato: el valor se interpreta como puerto de partida. |
| `pnpm dev` cambia de puerto y el navegador conserva pestañas del puerto anterior | El aviso de consola indica el puerto real. BrowserSync imprime sus URLs como hasta ahora. |

## What is **not** in this spec

- Un registro central de puertos entre proyectos.
- Abrir el navegador al arrancar.
- Soporte de `stop:dev` fuera de Linux.
- Cambios en el despliegue, Nginx o `.htaccess`.

Cada uno de esos, si aterriza, va en su propio spec.
