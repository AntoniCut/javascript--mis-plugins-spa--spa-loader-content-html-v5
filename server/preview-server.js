/*
    *  --------------------------------------------------------------  *
    *  -----  preview-server.js  --  /server/preview-server.js  -----  *
    *  --------------------------------------------------------------  *
*/


import 'dotenv/config';

import { base } from '../src/config/site-base.js';
import { findAvailablePort } from './find-available-port.js';

import express from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';


/** - `prefijo URL que usa el base href del proyecto (SITE_BASE del .env)` */
const DEV_ROUTE_BASE = base;

/** - `puerto de partida para previsualizar el build (PREVIEW_SERVER_PORT del .env); si está ocupado se usa el siguiente libre` */
const PREVIEW_SERVER_PORT = Number(process.env.PREVIEW_SERVER_PORT || 4173);

/** - `raíz del build de producción` */
const DIST_ROOT = path.join(process.cwd(), 'dist');

/** - `archivo de entrada de la SPA compilada` */
const DIST_INDEX_FILE = path.join(DIST_ROOT, 'index.html');


//  -----  si no existe el build de producción, avisar y terminar  -----
if (!fs.existsSync(DIST_ROOT) || !fs.existsSync(DIST_INDEX_FILE)) {

    //  -----  avisar de que hay que ejecutar el build antes del preview  -----
    console.error('No existe un build de producción en dist/. Ejecuta `pnpm run build` antes de `pnpm run preview`.');

    //  -----  terminar con código de error  -----
    process.exit(1);
}


/** - `instancia de la aplicación Express` */
const app = express();

//  -----  desactivar el encabezado x-powered-by  -----
app.disable('x-powered-by');



/**
 * --------------------------------------------------
 * -----  `redirectRootToBase(req, res, next)`  -----
 * --------------------------------------------------
 * - Redirige la raíz del servidor a la base pública de la SPA.
 * @param {import('express').Request} req - Petición de Express.
 * @param {import('express').Response} res - Respuesta de Express.
 * @param {import('express').NextFunction} next - Siguiente middleware.
 * @return {void}
 */
const redirectRootToBase = (req, res, next) => {

    //  -----  si la petición es la raíz, /index.html o la base sin barra, redirigir a la base de la spa  -----
    if (req.path === '/' || req.path === '/index.html' || req.path === DEV_ROUTE_BASE) {

        //  -----  redirigir a la base con barra final  -----
        res.redirect(302, `${DEV_ROUTE_BASE}/`);

        //  -----  salir sin pasar al siguiente middleware  -----
        return;
    }

    //  -----  continuar con el siguiente middleware para otras rutas  -----
    next();

};



/**
 * ------------------------------------------------
 * -----  `serveSpaFallback(req, res, next)`  -----
 * ------------------------------------------------
 * - Hace fallback a index.html para rutas internas del build de la SPA.
 * @param {import('express').Request} req - Petición de Express.
 * @param {import('express').Response} res - Respuesta de Express.
 * @param {import('express').NextFunction} next - Siguiente middleware.
 * @return {void}
 */
const serveSpaFallback = (req, res, next) => {

    //  -----  si la ruta no empieza por el prefijo de la spa, pasar al siguiente middleware  -----
    if (!req.path.startsWith(DEV_ROUTE_BASE)) {

        //  -----  pasar al siguiente middleware  -----
        next();

        //  -----  salir de la función  -----
        return;
    }

    /** - `ruta relativa dentro de la SPA` */
    const relativePath = req.path.slice(DEV_ROUTE_BASE.length).replace(/^\//, '');

    //  -----  si la ruta relativa es vacía, servir el archivo de entrada de la spa  -----
    if (relativePath === '') {

        //  -----  enviar index.html del build  -----
        res.sendFile(DIST_INDEX_FILE);

        //  -----  salir de la función  -----
        return;
    }

    /** - `ruta absoluta del archivo solicitado dentro del build` */
    const requestedPath = path.join(DIST_ROOT, relativePath);

    /** - `indica si la ruta tiene una extensión de archivo` */
    const hasFileExtension = path.extname(relativePath) !== '';

    /** - `indica si el archivo solicitado existe` */
    const fileExists = fs.existsSync(requestedPath);

    //  -----  si la ruta no tiene extensión y el archivo no existe, hacer fallback a index.html  -----
    if (!hasFileExtension && !fileExists) {

        //  -----  enviar index.html del build  -----
        res.sendFile(DIST_INDEX_FILE);

        //  -----  salir de la función  -----
        return;
    }

    //  -----  si la ruta tiene extensión o el archivo existe, continuar con el siguiente middleware (servir estático o 404)  -----
    next();

};



/**
 * ---------------------------------------------------
 * -----  `makePhpHandler(rootDir, serverPort)`  -----
 * ---------------------------------------------------
 * - Ejecuta archivos .php via php-cgi y devuelve la respuesta CGI al cliente.
 * @param {string} rootDir - Directorio raíz donde resolver los archivos PHP.
 * @param {number} serverPort - Puerto del servidor (para SERVER_PORT CGI).
 * @return {import('express').RequestHandler} - Middleware que ejecuta los archivos PHP.
 */
const makePhpHandler = (rootDir, serverPort) => (req, res, next) => {

    //  -----  si la petición no es a un archivo .php, pasar al siguiente middleware  -----
    if (!req.path.endsWith('.php')) {

        //  -----  pasar al siguiente middleware  -----
        next();

        //  -----  salir del middleware  -----
        return;
    }

    /** - `ruta relativa dentro del prefijo de la SPA` */
    const relativePath = req.path.startsWith(DEV_ROUTE_BASE)
        ? req.path.slice(DEV_ROUTE_BASE.length).replace(/^\//, '')
        : req.path.replace(/^\//, '');

    /** - `ruta absoluta del archivo PHP solicitado` */
    const phpFile = path.join(rootDir, relativePath);

    //  -----  si el archivo php no existe, pasar al siguiente middleware  -----
    if (!fs.existsSync(phpFile)) {

        //  -----  pasar al siguiente middleware  -----
        next();

        //  -----  salir del middleware  -----
        return;
    }

    /** - `query string de la URL original` */
    const queryString = req.originalUrl.includes('?')
        ? req.originalUrl.split('?')[1]
        : '';

    /** - `variables de entorno CGI requeridas por php-cgi` */
    const cgiEnv = {
        ...process.env,
        REDIRECT_STATUS:   '200',
        SCRIPT_FILENAME:   phpFile,
        SCRIPT_NAME:       req.path,
        REQUEST_METHOD:    req.method,
        QUERY_STRING:      queryString,
        CONTENT_TYPE:      req.headers['content-type']   ?? '',
        CONTENT_LENGTH:    req.headers['content-length'] ?? '0',
        SERVER_NAME:       'localhost',
        SERVER_PORT:       String(serverPort),
        SERVER_PROTOCOL:   'HTTP/1.1',
        GATEWAY_INTERFACE: 'CGI/1.1',
        HTTP_HOST:         req.headers['host'] ?? 'localhost',
        DOCUMENT_ROOT:     rootDir,
    };

    /** - `proceso php-cgi que ejecuta el archivo` */
    const php = spawn('php-cgi', [], { env: cgiEnv });

    /** - `salida estándar acumulada de php-cgi` */
    let stdout = Buffer.alloc(0);

    /** - `salida de error acumulada de php-cgi` */
    let stderr  = '';

    //  -----  acumular cada fragmento de la salida estándar  -----
    php.stdout.on('data', (chunk) => {

        //  -----  concatenar el fragmento al buffer  -----
        stdout = Buffer.concat([stdout, chunk]);
    });

    //  -----  acumular cada fragmento de la salida de error  -----
    php.stderr.on('data', (chunk) => {

        //  -----  añadir el fragmento como texto  -----
        stderr += chunk.toString();
    });

    //  -----  cuando php-cgi termina, procesar la respuesta cgi  -----
    php.on('close', () => {

        //  -----  si php escribió en stderr, mostrarlo en consola  -----
        if (stderr)

            //  -----  mostrar el error de php-cgi  -----
            console.error(`[php-cgi] ${stderr.trim()}`);

        /** - `posición del separador de headers CGI (CRLF doble)` */
        let sepIndex = stdout.indexOf('\r\n\r\n');

        /** - `longitud del separador encontrado` */
        let sepLen   = 4;

        //  -----  si no hay separador crlf, buscar el separador lf doble  -----
        if (sepIndex === -1) {

            //  -----  buscar el separador lf doble  -----
            sepIndex = stdout.indexOf('\n\n');

            //  -----  ajustar la longitud del separador  -----
            sepLen   = 2;
        }

        //  -----  si no hay separador, la respuesta cgi no es válida  -----
        if (sepIndex === -1) {

            //  -----  responder con error 500  -----
            res.status(500).send('Error: PHP no devolvió una respuesta CGI válida.');

            //  -----  salir del manejador  -----
            return;
        }

        /** - `headers CGI en texto plano` */
        const headersRaw = stdout.slice(0, sepIndex).toString();

        /** - `cuerpo de la respuesta` */
        const body       = stdout.slice(sepIndex + sepLen);

        //  -----  aplicar los headers devueltos por php  -----
        for (const line of headersRaw.split(/\r?\n/)) {

            /** - `posición de los dos puntos que separan nombre y valor` */
            const colonIndex = line.indexOf(':');

            //  -----  si la línea no es un header, saltarla  -----
            if (colonIndex === -1) continue;

            /** - `nombre del header` */
            const name  = line.slice(0, colonIndex).trim();

            /** - `valor del header` */
            const value = line.slice(colonIndex + 1).trim();

            //  -----  si el header es status, usarlo como código de respuesta  -----
            if (name.toLowerCase() === 'status') {

                //  -----  asignar el código de estado  -----
                res.status(parseInt(value, 10));
            }
            //  -----  si es otro header, aplicarlo tal cual  -----
            else {

                //  -----  asignar el header a la respuesta  -----
                res.setHeader(name, value);
            }
        }

        //  -----  enviar el cuerpo de la respuesta  -----
        res.send(body);

    });

    //  -----  si php-cgi no está disponible, responder con error 500  -----
    php.on('error', () => {

        //  -----  responder indicando cómo instalar php-cgi  -----
        res.status(500).send('Error interno: php-cgi no está disponible. Instálalo con: sudo apt install php-cgi');
    });

    //  -----  si la petición tiene body (post), escribirlo en stdin de php-cgi  -----
    req.pipe(php.stdin);

};



/** - `host donde escucha el servidor de previsualización` */
const PREVIEW_SERVER_HOST = '127.0.0.1';

/** @type {number} - `puerto real de previsualización: el primero libre a partir de PREVIEW_SERVER_PORT` */
let previewServerPort;

//  -----  resolver el puerto antes de registrar middlewares, porque php-cgi necesita el puerto real  -----
try {

    //  -----  buscar el primer puerto libre desde el de partida, probando en el mismo host que usará listen  -----
    previewServerPort = await findAvailablePort(PREVIEW_SERVER_PORT, {
        host: PREVIEW_SERVER_HOST,
        envName: 'PREVIEW_SERVER_PORT',
    });

}
//  -----  si no hay puerto libre o el valor del .env no es válido, terminar  -----
catch (error) {

    //  -----  mostrar el mensaje del error  -----
    console.error(error instanceof Error ? error.message : error);

    //  -----  terminar con código de error  -----
    process.exit(1);
}

//  -----  avisar cuando el puerto cambia respecto al configurado  -----
if (previewServerPort !== PREVIEW_SERVER_PORT) {

    //  -----  mostrar el puerto ocupado y el puerto que se usa  -----
    console.log(`El puerto ${PREVIEW_SERVER_PORT} está ocupado. Se usa el ${previewServerPort}.`);
}



//  -----  registrar el middleware que redirige la raíz a la base de la spa  -----
app.use(redirectRootToBase);

//  -----  registrar el middleware que ejecuta archivos php via php-cgi  -----
app.use(makePhpHandler(DIST_ROOT, previewServerPort));

//  -----  registrar el middleware que sirve archivos estáticos desde dist/ con el prefijo de ruta  -----
app.use(DEV_ROUTE_BASE, express.static(DIST_ROOT, { index: false }));

//  -----  registrar el middleware de fallback para rutas internas de la spa  -----
app.use(serveSpaFallback);

//  -----  registrar el middleware que maneja las rutas no encontradas (404)  -----
app.use((req, res) => {

    //  -----  responder con el error 404  -----
    res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});



/**
 * -----------------------------
 * -----  `previewServer`  -----
 * -----------------------------
 * - servidor de previsualización Express para el build de producción.
 * - Inicia el servidor Express en un puerto específico.
 * - Maneja el cierre ordenado del servidor.
 */
const previewServer = app.listen(previewServerPort, PREVIEW_SERVER_HOST, () => {

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');

    //  -----  mostrar la url del preview  -----
    console.log(`Preview disponible en http://localhost:${previewServerPort}${DEV_ROUTE_BASE}/`);

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');
});

//  -----  respaldo ante una carrera entre la sonda de puerto y listen  -----
previewServer.on('error', (error) => {

    //  -----  si el puerto se ocupó justo antes de escuchar, mostrar un mensaje claro con la variable  -----
    if (error.code === 'EADDRINUSE') {

        //  -----  avisar de que el puerto se ocupó antes de arrancar  -----
        console.error(`El puerto ${previewServerPort} se ocupó antes de arrancar. Vuelve a ejecutar el comando o cambia PREVIEW_SERVER_PORT.`);

        //  -----  terminar con código de error  -----
        process.exit(1);
    }

    //  -----  cualquier otro error se muestra y termina el proceso  -----
    console.error(error instanceof Error ? error.message : error);

    //  -----  terminar con código de error  -----
    process.exit(1);
});



/**
 * --------------------------
 * -----  `shutdown()`  -----
 * --------------------------
 * - Maneja el cierre ordenado del servidor Express.
 * - Escucha señales de terminación (SIGINT, SIGTERM) para realizar un shutdown limpio.
 * @return {void}
 */
const shutdown = () => {

    //  -----  cerrar el servidor y terminar el proceso con exit(0)  -----
    previewServer.close(() => process.exit(0));
};

//  -----  manejar sigint para un shutdown ordenado  -----
process.on('SIGINT', shutdown);

//  -----  manejar sigterm, común en entornos de contenedores para indicar terminación  -----
process.on('SIGTERM', shutdown);
