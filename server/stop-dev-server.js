/*
    *  ----------------------------------------------------------------  *
    *  -----  stop-dev-server.js  --  /server/stop-dev-server.js  -----  *
    *  ----------------------------------------------------------------  *
*/


import 'dotenv/config';

import { getPortRange } from './find-available-port.js';

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';



/** - `ejecuta comandos del sistema y retorna su salida estándar` */
const execFileAsync = promisify(execFile);

/** - `puerto de partida configurado para BrowserSync (DEV_SERVER_PORT del .env)` */
const DEV_SERVER_PORT = Number(process.env.DEV_SERVER_PORT || 3000);

/** - `puertos candidatos: el de partida y los siguientes que prueba dev-server.js si está ocupado` */
const DEV_SERVER_PORTS = getPortRange(DEV_SERVER_PORT);

/** - `directorio del proyecto actual; solo se detiene el servidor que corre desde aquí` */
const PROJECT_ROOT = process.cwd();



/**
 * -----------------------------------------
 * -----  `runCommand(command, args)`  -----
 * -----------------------------------------
 * - Ejecuta un comando del sistema y devuelve stdout.
 * @param {string} command - Comando a ejecutar.
 * @param {string[]} args - Argumentos del comando.
 * @return {Promise<string>} - Salida estándar del comando.
 */
const runCommand = async (command, args) => {

    //  -----  intentar ejecutar el comando  -----
    try {

        /** - `salida estándar del comando` */
        const { stdout } = await execFileAsync(command, args, { encoding: 'utf8' });

        //  -----  devolver la salida estándar  -----
        return stdout;
    }
    //  -----  si el comando falla, comprobar si el código 1 trae salida útil  -----
    catch (error) {

        //  -----  si el código es 1 y hay stdout, devolverlo  -----
        if (typeof error?.stdout === 'string' && error.code === 1)

            //  -----  devolver la salida estándar del comando fallido  -----
            return error.stdout;


        //  -----  si no, relanzar el error  -----
        throw error;
    }
};



/**
 * ----------------------------------------------------
 * -----  `getProcessIdsListeningOnPorts(ports)`  -----
 * ----------------------------------------------------
 * - Devuelve los PID que están escuchando en los puertos indicados.
 * @param {number[]} ports - Puertos a inspeccionar.
 * @return {Promise<number[]>} - PID que escuchan en esos puertos.
 */
const getProcessIdsListeningOnPorts = async (ports) => {

    /** - `salida de ss con los puertos TCP en escucha y sus procesos` */
    const ssOutput = await runCommand('ss', ['-ltnp']);

    /** - `regex para detectar líneas de puertos candidatos` */
    const portMatchers = ports.map((port) => new RegExp(`:${port}\\b`));

    /** - `set para evitar PIDs duplicados entre varios puertos` */
    const processIds = new Set();


    //  -----  recorrer cada línea de la salida de ss  -----
    for (const line of ssOutput.split('\n')) {

        //  -----  si la línea no es de un puerto candidato, saltarla  -----
        if (!portMatchers.some((matcher) => matcher.test(line)))

            //  -----  pasar a la siguiente línea  -----
            continue;


        //  -----  recorrer cada pid de la línea  -----
        for (const match of line.matchAll(/pid=(\d+)/g))

            //  -----  guardar el pid sin duplicados  -----
            processIds.add(Number(match[1]));
    }


    //  -----  devolver los pid como array  -----
    return [...processIds];
};



/**
 * --------------------------------------------
 * -----  `getProcessCommand(processId)`  -----
 * --------------------------------------------
 * - Lee el comando completo asociado a un PID.
 * @param {number} processId - PID del proceso.
 * @return {Promise<string>} - Comando completo del proceso.
 */
const getProcessCommand = async (processId) => {

    /** - `salida de ps con los argumentos del proceso` */
    const processOutput = await runCommand('ps', ['-p', String(processId), '-o', 'args=']);

    //  -----  devolver el comando sin espacios sobrantes  -----
    return processOutput.trim();
};



/**
 * ----------------------------------------
 * -----  `getProcessCwd(processId)`  -----
 * ----------------------------------------
 * - Lee el directorio de trabajo de un PID (Linux: /proc/<pid>/cwd).
 * - Devuelve una cadena vacía si no se puede leer.
 * @param {number} processId - PID del proceso.
 * @return {Promise<string>} - Directorio de trabajo del proceso.
 */
const getProcessCwd = async (processId) => {

    //  -----  intentar resolver el enlace simbólico del cwd  -----
    try {

        //  -----  devolver el directorio al que apunta el enlace  -----
        return await fs.readlink(`/proc/${processId}/cwd`);
    }
    //  -----  si no se puede leer, tratar el proceso como ajeno  -----
    catch {

        //  -----  sin permiso o proceso ya terminado: se trata como ajeno  -----
        return '';
    }
};



/**
 * ---------------------------------------------------------------------------
 * -----  `waitForProcessIdsToLeavePorts(ports, processIds, timeoutMs)`  -----
 * ---------------------------------------------------------------------------
 * - Espera a que los PID indicados dejen de escuchar en los puertos candidatos.
 * @param {number[]} ports - Puertos candidatos.
 * @param {number[]} processIds - PID que deben dejar de escuchar.
 * @param {number} timeoutMs - Tiempo máximo de espera en milisegundos.
 * @return {Promise<boolean>} - `true` si dejaron de escuchar antes del timeout.
 */
const waitForProcessIdsToLeavePorts = async (ports, processIds, timeoutMs = 3000) => {

    /** - `instante en el que empieza la espera` */
    const startedAt = Date.now();


    //  -----  repetir la comprobación hasta agotar el tiempo  -----
    while (Date.now() - startedAt < timeoutMs) {

        /** - `PID que siguen escuchando en los puertos` */
        const activeProcessIds = await getProcessIdsListeningOnPorts(ports);


        //  -----  si ninguno de los pid sigue activo, terminar con éxito  -----
        if (!activeProcessIds.some((processId) => processIds.includes(processId)))

            //  -----  devolver éxito  -----
            return true;


        //  -----  esperar 150 ms antes de volver a comprobar  -----
        await new Promise((resolve) => setTimeout(resolve, 150));
    }


    //  -----  se agotó el tiempo sin que los pid salieran  -----
    return false;
};



/**
 * ----------------------
 * -----  `main()`  -----
 * ----------------------
 * - Detiene la instancia activa de server/dev-server.js asociada al entorno local.
 * @return {Promise<void>}
 */
const main = async () => {

    /** - `PID que escuchan en alguno de los puertos candidatos` */
    const processIds = await getProcessIdsListeningOnPorts(DEV_SERVER_PORTS);


    //  -----  si no hay ningún proceso escuchando, avisar y terminar  -----
    if (processIds.length === 0) {

        //  -----  avisar de que no hay instancia activa  -----
        console.log(`No hay ninguna instancia activa de server/dev-server.js escuchando entre los puertos ${DEV_SERVER_PORTS[0]} y ${DEV_SERVER_PORTS[DEV_SERVER_PORTS.length - 1]}.`);

        //  -----  salir sin error  -----
        return;
    }


    /** @type {number[]} - `PIDs de la instancia real del servidor de desarrollo` */
    const devServerProcessIds = [];

    /** @type {{ processId: number, command: string }[]} - `procesos ajenos ocupando alguno de los puertos candidatos` */
    const foreignProcesses = [];


    //  -----  clasificar cada proceso como propio o ajeno  -----
    for (const processId of processIds) {

        /** - `comando completo del proceso` */
        const command = await getProcessCommand(processId);

        /** - `directorio desde el que corre ese proceso` */
        const cwd = await getProcessCwd(processId);


        //  -----  solo cuenta como propia la instancia de dev-server.js de este proyecto  -----
        if (command.includes('server/dev-server.js') && cwd === PROJECT_ROOT) {

            //  -----  guardar el pid como instancia propia  -----
            devServerProcessIds.push(processId);

            //  -----  pasar al siguiente proceso  -----
            continue;
        }


        //  -----  guardar el proceso como ajeno  -----
        foreignProcesses.push({ processId, command });
    }


    //  -----  si no hay instancia propia, avisar y salir con error  -----
    if (devServerProcessIds.length === 0) {

        //  -----  avisar de que no hay instancia de este proyecto  -----
        console.error('No se encontró ninguna instancia de server/dev-server.js de este proyecto para detener.');


        //  -----  si hay procesos ajenos, listarlos  -----
        if (foreignProcesses.length > 0) {

            //  -----  avisar de que los puertos están ocupados por otros procesos  -----
            console.error('Los puertos inspeccionados están ocupados por otros procesos:');


            //  -----  recorrer cada proceso ajeno  -----
            for (const foreignProcess of foreignProcesses)

                //  -----  mostrar el pid y el comando del proceso ajeno  -----
                console.error(`- PID ${foreignProcess.processId}: ${foreignProcess.command}`);
        }


        //  -----  terminar con código de error  -----
        process.exit(1);
    }


    //  -----  recorrer cada instancia propia  -----
    for (const processId of devServerProcessIds)

        //  -----  pedir al proceso que termine con sigterm  -----
        process.kill(processId, 'SIGTERM');


    /** - `indica si los procesos dejaron de escuchar a tiempo` */
    const stoppedSuccessfully = await waitForProcessIdsToLeavePorts(DEV_SERVER_PORTS, devServerProcessIds);


    //  -----  si no se detuvo a tiempo, avisar y salir con error  -----
    if (!stoppedSuccessfully) {

        //  -----  avisar de que no se pudo detener la instancia  -----
        console.error('No se pudo detener la instancia de desarrollo tras enviar SIGTERM.');

        //  -----  terminar con código de error  -----
        process.exit(1);
    }


    //  -----  confirmar que la instancia se detuvo  -----
    console.log(`Instancia de desarrollo detenida. PID: ${devServerProcessIds.join(', ')}.`);
};



//  -----  ejecutar la función principal y controlar los errores  -----
main().catch((error) => {

    //  -----  mostrar el mensaje del error  -----
    console.error(error instanceof Error ? error.message : error);

    //  -----  terminar con código de error  -----
    process.exit(1);
});
