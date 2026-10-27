/*
    *  ------------------------------------------------------  *
    *  -----  dev-server.js  --  /server/dev-server.js  -----  *
    *  ------------------------------------------------------  *
*/


import 'dotenv/config';

import { base } from '../src/config/site-base.js';
import { findAvailablePort } from './find-available-port.js';

import browserSync from 'browser-sync';
import express from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';



/** - `prefijo URL que usa el base href del proyecto (SITE_BASE del .env)` */
const DEV_ROUTE_BASE = base;

/** - `puerto de partida del servidor de desarrollo (DEV_SERVER_PORT del .env); si está ocupado se usa el siguiente libre` */
const DEV_SERVER_PORT = Number(process.env.DEV_SERVER_PORT || 3000);

/** - `raíz real del proyecto` */
const PROJECT_ROOT = process.cwd();

/** - `entrada principal de la SPA` */
const SPA_ENTRY_FILE = path.join(PROJECT_ROOT, 'index.html');

/** - `archivos que deben disparar live reload` */
const BROWSER_SYNC_FILES = [
    'index.html',
    'app/**/*',
    'assets/**/*',
    '!app/**/*.map',
];

/** - `opciones de watch compartidas con el entorno local` */
const WATCH_OPTIONS = {
    usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    interval: Number(process.env.CHOKIDAR_INTERVAL || 250),
};



/** - `instancia de la aplicación Express` */
const app = express();

/** - `instancia de BrowserSync` */
const bs = browserSync.create();

//  -----  desactivar el encabezado x-powered-by  -----
app.disable('x-powered-by');



/**
 * ---------------------------------
 * -----  `sendSpaEntry(res)`  -----
 * ---------------------------------
 * - Responde con index.html sustituyendo el marcador %SITE_BASE% por la base del .env.
 * @param {import('express').Response} res - Respuesta de Express.
 * @return {void}
 */
const sendSpaEntry = (res) => {

    /** - `contenido de index.html con el marcador sin resolver` */
    const template = fs.readFileSync(SPA_ENTRY_FILE, 'utf-8');

    /** - `contenido de index.html con la base real` */
    const html = template.replaceAll('%SITE_BASE%', base);

    //  -----  responder con el html ya resuelto  -----
    res.type('html').send(html);
};



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

    //  -----  si la petición es la raíz o /index.html, redirigir a la base de la spa  -----
    if (req.path === '/' || req.path === '/index.html' || req.path === `${DEV_ROUTE_BASE}/index.html`) {

        //  -----  redirigir a la base con barra final  -----
        res.redirect(302, `${DEV_ROUTE_BASE}/`);

        //  -----  salir sin pasar al siguiente middleware  -----
        return;
    }

    //  -----  si la ruta es la base sin barra final, redirigir a la misma con barra  -----
    if (req.path === DEV_ROUTE_BASE) {

        //  -----  redirigir a la base con barra final  -----
        res.redirect(302, `${DEV_ROUTE_BASE}/`);

        //  -----  salir sin pasar al siguiente middleware  -----
        return;
    }

    //  -----  pasar al siguiente middleware  -----
    next();
};



/**
 * ------------------------------------------------
 * -----  `serveSpaFallback(req, res, next)`  -----
 * ------------------------------------------------
 * - Hace fallback a index.html para rutas internas de la SPA.
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

        //  -----  responder con index.html  -----
        sendSpaEntry(res);

        //  -----  salir de la función  -----
        return;
    }

    /** - `ruta absoluta del archivo solicitado dentro del proyecto` */
    const requestedPath = path.join(PROJECT_ROOT, relativePath);

    /** - `indica si la ruta tiene una extensión de archivo` */
    const hasFileExtension = path.extname(relativePath) !== '';

    /** - `indica si el archivo solicitado existe` */
    const fileExists = fs.existsSync(requestedPath);

    //  -----  si la ruta no tiene extensión y el archivo no existe, hacer fallback a index.html  -----
    if (!hasFileExtension && !fileExists) {

        //  -----  responder con index.html  -----
        sendSpaEntry(res);

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



/** @type {number} - `puerto público real: el primero libre a partir de DEV_SERVER_PORT` */
let devServerPort;

//  -----  resolver el puerto público antes de registrar middlewares, porque php-cgi necesita el puerto real  -----
try {

    //  -----  buscar el primer puerto libre desde el de partida  -----
    devServerPort = await findAvailablePort(DEV_SERVER_PORT, { envName: 'DEV_SERVER_PORT' });

}
//  -----  si no hay puerto libre o el valor del .env no es válido, terminar  -----
catch (error) {

    //  -----  mostrar el mensaje del error  -----
    console.error(error instanceof Error ? error.message : error);

    //  -----  terminar con código de error  -----
    process.exit(1);
}

//  -----  avisar cuando el puerto cambia respecto al configurado  -----
if (devServerPort !== DEV_SERVER_PORT) {

    //  -----  mostrar el puerto ocupado y el puerto que se usa  -----
    console.log(`El puerto ${DEV_SERVER_PORT} está ocupado. Se usa el ${devServerPort}.`);
}



//  -----  registrar el middleware que redirige la raíz a la base de la spa  -----
app.use(redirectRootToBase);

//  -----  registrar el middleware que ejecuta archivos php via php-cgi  -----
app.use(makePhpHandler(PROJECT_ROOT, devServerPort));

//  -----  registrar el middleware que sirve archivos estáticos desde la raíz del proyecto con el prefijo de ruta  -----
app.use(DEV_ROUTE_BASE, express.static(PROJECT_ROOT, { index: false }));

//  -----  registrar el middleware de fallback para rutas internas de la spa  -----
app.use(serveSpaFallback);

//  -----  registrar el middleware que maneja las rutas no encontradas (404)  -----
app.use((req, res) => {

    //  -----  responder con el error 404  -----
    res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});



/**
 * ------------------------------
 * -----  `internalServer`  -----
 * ------------------------------
 * - servidor de desarrollo Express que sirve la SPA con soporte para rutas internas.
 * - Inicia el servidor Express en un puerto dinámico.
 * - Configura BrowserSync para proxy y live reload.
 * - Maneja el cierre ordenado del servidor y BrowserSync.
 */
const internalServer = app.listen(0, '127.0.0.1', () => {

    /** - `dirección y puerto del servidor interno` */
    const address = internalServer.address();

    //  -----  si no se pudo resolver la dirección del servidor, lanzar un error  -----
    if (!address || typeof address === 'string') {

        //  -----  lanzar el error de puerto interno  -----
        throw new Error('No se pudo resolver el puerto interno del servidor Express.');
    }

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');

    //  -----  mostrar la dirección del servidor interno  -----
    console.log(`Servidor de desarrollo Express escuchando en http://${address.address}:${address.port}\n`);

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');

    //  -----  iniciar browsersync con proxy y live reload  -----
    bs.init({

        proxy: `http://127.0.0.1:${address.port}`,
        port: devServerPort,
        open: false,
        notify: false,
        ui: false,
        startPath: `${DEV_ROUTE_BASE}/`,
        files: BROWSER_SYNC_FILES,
        watchOptions: WATCH_OPTIONS,

    });

});



/**
 * --------------------------
 * -----  `shutdown()`  -----
 * --------------------------
 * - Maneja el cierre ordenado del servidor Express y BrowserSync.
 * - Escucha señales de terminación (SIGINT, SIGTERM) para realizar un shutdown limpio.
 * @return {void}
 */
const shutdown = () => {

    //  -----  cerrar browsersync  -----
    bs.exit();

    //  -----  cerrar el servidor express y terminar el proceso con exit(0)  -----
    internalServer.close(() => process.exit(0));
};


//  -----  manejar sigint para un shutdown ordenado  -----
process.on('SIGINT', shutdown);

//  -----  manejar sigterm, común en entornos de contenedores para indicar terminación  -----
process.on('SIGTERM', shutdown);
