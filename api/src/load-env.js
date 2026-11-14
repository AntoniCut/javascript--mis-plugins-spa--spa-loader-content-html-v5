/*
    *  ---------------------------------------------------  *
    *  -----  load-env.js  --  /api/src/load-env.js  -----  *
    *  ---------------------------------------------------  *
*/


import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';


/** - `raíz del paquete api: un nivel por encima de src` */
const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** - `raíz del repositorio: en producción no existe` */
const REPO_ROOT = path.resolve(API_ROOT, '..');

/** - `archivos .env candidatos, en orden de prioridad` */
const ENV_FILES = [
    path.join(API_ROOT, '.env'),
    path.join(REPO_ROOT, '.env'),
];


//  -----  cargar cada .env existente sin pisar variables ya definidas  -----
for (const envFile of ENV_FILES) {

    //  -----  saltar los archivos que no existen  -----
    if (!existsSync(envFile))
        //  -----  pasar al siguiente candidato  -----
        continue;

    //  -----  cargar el archivo en process.env  -----
    dotenv.config({ path: envFile, quiet: true });

}
