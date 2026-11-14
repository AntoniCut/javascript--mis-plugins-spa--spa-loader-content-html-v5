/*
    *  -----------------------------------------------  *
    *  -----  server.js  --  /api/src/server.js  -----  *
    *  -----------------------------------------------  *
*/


//  -----  cargar el .env antes de leer host y puerto  -----
import './load-env.js';

/** - `router compartido con el servidor de desarrollo` */
import { createApiRouter } from './mysql-query.js';

import express from 'express';


/** - `host de escucha: API_HOST del .env` */
const API_HOST = process.env.API_HOST || '127.0.0.1';

/** - `puerto de escucha: API_PORT del .env` */
const API_PORT = Number(process.env.API_PORT || 3100);


/** - `aplicación express del runtime node de producción` */
const app = express();

//  -----  desactivar el encabezado x-powered-by  -----
app.disable('x-powered-by');

//  -----  montar health y la consulta mysql  -----
app.use(createApiRouter());


/**
 * ---------------------------------------
 * -----  `handleRequestError(...)`  -----
 * ---------------------------------------
 * - Responde en JSON los errores de parseo del cuerpo.
 * @param {unknown} error - Error lanzado por express o body-parser.
 * @param {import('express').Request} req - Petición recibida.
 * @param {import('express').Response} res - Respuesta JSON.
 * @param {import('express').NextFunction} next - Siguiente middleware.
 * @return {void}
 */
const handleRequestError = (error, req, res, next) => {

    /** - `código http del error, 500 si no viene` */
    const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number(error.status)
        : 500;

    /** - `mensaje estable para el cliente` */
    const message = status === 413
        ? 'El cuerpo supera los 16 KB.'
        : status === 400
            ? 'La petición no es un JSON válido.'
            : 'Error interno del API.';

    //  -----  responder el error en json  -----
    res.status(status).json({
        ok: false,
        message,
    });

};

//  -----  responder en json los errores de parseo  -----
app.use(handleRequestError);


//  -----  arrancar el servidor en API_HOST:API_PORT  -----
const server = app.listen(API_PORT, API_HOST, () => {

    //  -----  avisar la dirección efectiva  -----
    console.log(`API Node escuchando en http://${API_HOST}:${API_PORT}`);

});

//  -----  informar un puerto ocupado o un host inválido  -----
server.on('error', (error) => {

    //  -----  mostrar el mensaje del error  -----
    console.error(error instanceof Error ? error.message : error);

    //  -----  terminar con código de error  -----
    process.exit(1);

});
