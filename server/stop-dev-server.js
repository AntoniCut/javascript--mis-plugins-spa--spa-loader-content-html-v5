/*
    *  ----------------------------------------------------------------  *
    *  -----  stop-dev-server.js  --  /server/stop-dev-server.js  -----  *
    *  ----------------------------------------------------------------  *
*/


import 'dotenv/config';

import { getPortRange } from './find-available-port.js';
import { stopServerInstance } from './stop-server-helpers.js';



/** - `puerto de partida configurado para BrowserSync (DEV_SERVER_PORT del .env)` */
const DEV_SERVER_PORT = Number(process.env.DEV_SERVER_PORT || 3000);

/** - `puertos candidatos: el de partida y los siguientes que prueba dev-server.js si está ocupado` */
const DEV_SERVER_PORTS = getPortRange(DEV_SERVER_PORT);

/** - `guion del servidor de desarrollo dentro de server/` */
const DEV_SERVER_SCRIPT = 'server/dev-server.js';

/** - `etiqueta legible de la instancia para los mensajes` */
const DEV_SERVER_LABEL = 'desarrollo';

/** - `directorio del proyecto actual; solo se detiene el servidor que corre desde aquí` */
const PROJECT_ROOT = process.cwd();



/**
 * ----------------------
 * -----  `main()`  -----
 * ----------------------
 * - Detiene la instancia activa de server/dev-server.js asociada al entorno local.
 * @return {Promise<void>}
 */
const main = async () => {

    //  -----  detener la instancia con la lógica compartida  -----
    await stopServerInstance({

        ports: DEV_SERVER_PORTS,
        serverScript: DEV_SERVER_SCRIPT,
        instanceLabel: DEV_SERVER_LABEL,
        projectRoot: PROJECT_ROOT,
    });
};



//  -----  ejecutar la función principal y controlar los errores  -----
main().catch((error) => {

    //  -----  mostrar el mensaje del error  -----
    console.error(error instanceof Error ? error.message : error);

    //  -----  terminar con código de error  -----
    process.exit(1);
});
