/*
    *  ------------------------------------------------------------------------  *
    *  -----  find-available-port.js  --  /server/find-available-port.js  -----  *
    *  ------------------------------------------------------------------------  *
*/


import net from 'node:net';


/** - `intentos máximos de puertos consecutivos antes de rendirse` */
export const DEFAULT_MAX_PORT_ATTEMPTS = 20;

/** - `último puerto TCP válido` */
const MAX_TCP_PORT = 65535;



/**
 * ----------------------------------------------------
 * -----  `getPortRange(startPort, maxAttempts)`  -----
 * ----------------------------------------------------
 * - Devuelve la lista de puertos consecutivos que se prueban a partir del puerto de partida.
 * @param {number} startPort - Puerto de partida.
 * @param {number} [maxAttempts] - Número máximo de puertos a probar.
 * @return {number[]} - Puertos candidatos en orden.
 */
export const getPortRange = (startPort, maxAttempts = DEFAULT_MAX_PORT_ATTEMPTS) => {

    /** - `último puerto del rango sin pasar del máximo TCP` */
    const lastPort = Math.min(startPort + maxAttempts - 1, MAX_TCP_PORT);

    /** @type {number[]} - `puertos candidatos en orden` */
    const ports = [];


    //  -----  recorrer desde el puerto de partida hasta el último candidato  -----
    for (let port = startPort; port <= lastPort; port++) {

        //  -----  añadir el puerto a la lista  -----
        ports.push(port);
    }


    //  -----  devolver el rango completo  -----
    return ports;
};



/**
 * --------------------------------------
 * -----  `isPortFree(port, host)`  -----
 * --------------------------------------
 * - Comprueba si un puerto está libre abriendo un servidor temporal en el mismo host.
 * @param {number} port - Puerto a comprobar.
 * @param {string} [host] - Host donde escuchará el servidor real.
 * @return {Promise<boolean>} - `true` si el puerto está libre.
 */
const isPortFree = (port, host) => new Promise((resolve, reject) => {

    /** - `servidor temporal para comprobar disponibilidad del puerto` */
    const probeServer = net.createServer();


    //  -----  no mantener vivo el proceso con la sonda  -----
    probeServer.unref();

    //  -----  puerto ocupado o sin permiso: no está libre; otro error se propaga  -----
    probeServer.once('error', (error) => {

        //  -----  si está ocupado o sin permiso, informar de que no está libre  -----
        if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {

            //  -----  resolver como puerto no libre  -----
            resolve(false);

            //  -----  salir del manejador  -----
            return;
        }

        //  -----  si es un error inesperado, propagarlo  -----
        reject(error);
    });

    //  -----  el puerto se pudo abrir: se cierra y se informa de que está libre  -----
    probeServer.once('listening', () => {

        //  -----  liberar el puerto antes de responder  -----
        probeServer.close((error) => {

            //  -----  si falla al cerrar la sonda, propagar el error  -----
            if (error) {

                //  -----  rechazar con el error de cierre  -----
                reject(error);

                //  -----  salir del manejador  -----
                return;
            }

            //  -----  informar de que el puerto está libre  -----
            resolve(true);
        });
    });

    //  -----  abrir la sonda en el puerto y host indicados  -----
    probeServer.listen(port, host);
});



/**
 * -----------------------------------------------------
 * -----  `findAvailablePort(startPort, options)`  -----
 * -----------------------------------------------------
 * - Devuelve el primer puerto libre a partir de `startPort` (startPort, +1, +2, ...).
 * @param {number} startPort - Puerto de partida.
 * @param {{ host?: string, maxAttempts?: number, envName?: string }} [options] - Host, intentos máximos y nombre de la variable de entorno para los errores.
 * @return {Promise<number>} - Primer puerto libre del rango.
 */
export const findAvailablePort = async (startPort, options = {}) => {

    /** - `host donde escuchará el servidor real; sin valor, todas las interfaces` */
    const host = options.host;

    /** - `intentos máximos` */
    const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_PORT_ATTEMPTS;

    /** - `nombre de la variable de entorno que se cita en los errores` */
    const envName = options.envName ?? 'el puerto';


    //  -----  si el puerto de partida no es un entero TCP válido, lanzar un error  -----
    if (!Number.isInteger(startPort) || startPort < 1 || startPort > MAX_TCP_PORT) {

        //  -----  lanzar el error nombrando la variable y el rango válido  -----
        throw new Error(`${envName} no es un puerto válido (${startPort}). Usa un entero entre 1 y ${MAX_TCP_PORT}.`);
    }


    /** - `puertos candidatos` */
    const ports = getPortRange(startPort, maxAttempts);


    //  -----  probar cada puerto en orden  -----
    for (const port of ports) {

        //  -----  si el puerto está libre, devolverlo  -----
        if (await isPortFree(port, host)) {

            //  -----  devolver el primer puerto libre  -----
            return port;
        }
    }


    //  -----  ningún puerto del rango está libre  -----
    throw new Error(`No hay ningún puerto libre entre ${ports[0]} y ${ports[ports.length - 1]}. Libera alguno o cambia ${envName}.`);
};
