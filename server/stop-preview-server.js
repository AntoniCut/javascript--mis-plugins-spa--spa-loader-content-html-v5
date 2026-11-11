/*
    *  ------------------------------------------------------------------------  *
    *  -----  stop-preview-server.js  --  /server/stop-preview-server.js  -----  *
    *  ------------------------------------------------------------------------  *
*/


import 'dotenv/config';

import { getPortRange } from './find-available-port.js';
import { stopServerInstance } from './stop-server-helpers.js';



/** - `puerto de partida configurado para el preview (PREVIEW_SERVER_PORT del .env)` */
const PREVIEW_SERVER_PORT = Number(process.env.PREVIEW_SERVER_PORT || 4173);

/** - `puertos candidatos: el de partida y los siguientes que prueba preview-server.js si está ocupado` */
const PREVIEW_SERVER_PORTS = getPortRange(PREVIEW_SERVER_PORT);

/** - `guion del servidor de preview dentro de server/` */
const PREVIEW_SERVER_SCRIPT = 'server/preview-server.js';

/** - `etiqueta legible de la instancia para los mensajes` */
const PREVIEW_SERVER_LABEL = 'preview';

/** - `directorio del proyecto actual; solo se detiene el servidor que corre desde aquí` */
const PROJECT_ROOT = process.cwd();



/**
 * ----------------------
 * -----  `main()`  -----
 * ----------------------
 * - Detiene la instancia activa de server/preview-server.js asociada al entorno local.
 * @return {Promise<void>}
 */
const main = async () => {

    //  -----  detener la instancia con la lógica compartida  -----
    await stopServerInstance({

        ports: PREVIEW_SERVER_PORTS,
        serverScript: PREVIEW_SERVER_SCRIPT,
        instanceLabel: PREVIEW_SERVER_LABEL,
        projectRoot: PROJECT_ROOT,
    });
};



//  -----  ejecutar la función principal y controlar los errores  -----
main()
    .catch((/** @type {unknown} */ error) => {

        //  -----  mostrar el mensaje del error  -----
         console.error(error instanceof Error ? error.message : error);

        //  -----  terminar con código de error  -----
        process.exit(1);
});
