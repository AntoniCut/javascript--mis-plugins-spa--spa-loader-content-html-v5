/*
    *  ------------------------------------------------------------------------  *
    *  -----  find-available-port.js  --  /server/find-available-port.js  -----  *
    *  ------------------------------------------------------------------------  *
*/


import net from 'node:net';



/** - Intentos máximos de puertos consecutivos antes de rendirse. */
export const DEFAULT_MAX_PORT_ATTEMPTS = 20;

/** - Último puerto TCP válido. */
const MAX_TCP_PORT = 65535;



/**
 * ----------------------------------------------------------
 * -----  `getPortRange(startPort, maxAttempts)`  -----
 * ----------------------------------------------------------
 * - Devuelve la lista de puertos consecutivos que se prueban a partir del puerto de partida.
 * @param {number} startPort
 * @param {number} [maxAttempts]
 * @returns {number[]}
 */

export const getPortRange = (startPort, maxAttempts = DEFAULT_MAX_PORT_ATTEMPTS) => {

    /** - Último puerto del rango sin pasar del máximo TCP */
    const lastPort = Math.min(startPort + maxAttempts - 1, MAX_TCP_PORT);

    /** - Puertos candidatos en orden */
    const ports = [];


    //  -----  recorre desde el puerto de partida hasta el último candidato  -----
    for (let port = startPort; port <= lastPort; port++) {

        //  -----  añade el puerto a la lista  -----
        ports.push(port);
    }


    //  -----  devuelve el rango completo  -----
    return ports;
};



/**
 * ----------------------------------------
 * -----  `isPortFree(port, host)`  -----
 * ----------------------------------------
 * - Comprueba si un puerto está libre abriendo un servidor temporal en el mismo host.
 * @param {number} port
 * @param {string} [host]
 * @returns {Promise<boolean>}
 */

const isPortFree = (port, host) => new Promise((resolve, reject) => {

    /** - Servidor temporal para comprobar disponibilidad del puerto */
    const probeServer = net.createServer();


    //  -----  no mantiene vivo el proceso  -----
    probeServer.unref();

    //  -----  puerto ocupado o sin permiso: no está libre; otro error se propaga  -----
    probeServer.once('error', (error) => {

        //  -----  ocupado o sin permiso  -----
        if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
            resolve(false);
            return;
        }

        //  -----  error inesperado  -----
        reject(error);
    });

    //  -----  el puerto se pudo abrir: se cierra y se informa de que está libre  -----
    probeServer.once('listening', () => {

        //  -----  libera el puerto antes de responder  -----
        probeServer.close((error) => {

            //  -----  fallo al cerrar la sonda  -----
            if (error) {
                reject(error);
                return;
            }

            //  -----  puerto libre  -----
            resolve(true);
        });
    });

    //  -----  abre la sonda en el puerto y host indicados  -----
    probeServer.listen(port, host);
});



/**
 * ------------------------------------------------------
 * -----  `findAvailablePort(startPort, options)`  -----
 * ------------------------------------------------------
 * - Devuelve el primer puerto libre a partir de `startPort` (startPort, +1, +2, ...).
 * @param {number} startPort
 * @param {{ host?: string, maxAttempts?: number, envName?: string }} [options]
 * @returns {Promise<number>}
 */

export const findAvailablePort = async (startPort, options = {}) => {

    /** - Host donde escuchará el servidor real; sin valor, todas las interfaces */
    const host = options.host;

    /** - Intentos máximos */
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_PORT_ATTEMPTS;

    /** - Nombre de la variable de entorno que se cita en los errores */
    const envName = options.envName ?? 'el puerto';


    //  -----  valida que el puerto de partida sea un entero TCP válido  -----
    if (!Number.isInteger(startPort) || startPort < 1 || startPort > MAX_TCP_PORT) {
        throw new Error(`${envName} no es un puerto válido (${startPort}). Usa un entero entre 1 y ${MAX_TCP_PORT}.`);
    }


    /** - Puertos candidatos */
    const ports = getPortRange(startPort, maxAttempts);


    //  -----  prueba cada puerto en orden  -----
    for (const port of ports) {

        //  -----  devuelve el primero que esté libre  -----
        if (await isPortFree(port, host)) {
            return port;
        }
    }


    //  -----  ningún puerto del rango está libre  -----
    throw new Error(`No hay ningún puerto libre entre ${ports[0]} y ${ports[ports.length - 1]}. Libera alguno o cambia ${envName}.`);
};
