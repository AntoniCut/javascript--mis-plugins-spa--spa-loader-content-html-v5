/*
    *  -------------------------------------------  *
    *  -----  gulpfile.js  --  /gulpfile.js  -----  *
    *  -------------------------------------------  *
*/

//  -----  carga .env antes que cualquier módulo que lea SITE_BASE  -----
import 'dotenv/config';

import gulp from "gulp";

import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
import { exec } from 'node:child_process';
import { Transform } from 'stream';
import fs from 'fs';
import path from 'node:path';

//  -----  convertir png a avif  -----
import sharp from 'sharp';

import { deleteAsync } from "del";

import terser from "gulp-terser";
import cleanCSS from "gulp-clean-css";
import htmlmin from "gulp-htmlmin";
import plumber from "gulp-plumber";

import { generateMarkdownShiki } from './generate-markdown-shiki.js';
import { base } from './src/config/site-base.js';



/** - `desestructuración de métodos de Gulp` */
const { src, dest, watch, series, parallel } = gulp;

/** - `instancia de Dart Sass para gulp-sass como motor de compilación` */
const sass = gulpSass(dartSass);

/** - `opciones de Sass: registra site-base() para que los SCSS lean SITE_BASE` */
const sassOptions = {
    functions: {
        'site-base()': () => new dartSass.SassString(base),
    },
};


/**
 * ------------------------
 * -----  `paths {}`  -----
 * ------------------------
 * - Rutas centralizadas de origen/destino para evitar hardcode.
 */
const paths = {

    srcRoot: 'src',
    appRoot: 'app',
    distRoot: 'dist',

    root: {
        assetsDir: path.join('assets'),
        assets: path.posix.join('assets', '**/*'),

        /** - `png de captura en assets/img/clase-*` */
        claseImagesPng: path.posix.join('assets', 'img', 'clase-*', '*.png'),
    },

    src: {

        configDir: path.join('src', 'config'),
        config:    path.posix.join('src', 'config', '**/*'),

        componentsDir: path.join('src', 'components'),
        components:    path.posix.join('src', 'components', '**/*'),

        effectsDir: path.join('src', 'effects'),
        effects:    path.posix.join('src', 'effects', '**/*'),

        markdownShikiDir: path.join('src', 'markdown-shiki'),
        markdownShiki:    path.posix.join('src', 'markdown-shiki', '**/*'),

        pagesDir: path.join('src', 'pages'),
        pages:    path.posix.join('src', 'pages', '**/*'),

        pagesComponentsDir: path.join('src', 'pages-components'),
        pagesComponents:    path.posix.join('src', 'pages-components', '**/*'),

        pluginsDir: path.join('src', 'plugins'),
        plugins:    path.posix.join('src', 'plugins', '**/*'),

        routesDir: path.join('src', 'routes'),
        routes:    path.posix.join('src', 'routes', '**/*'),

        spaDir: path.join('src', 'spa'),
        spa:    path.posix.join('src', 'spa', '**/*'),

        scriptsDir:   path.join('src', 'scripts'),
        scripts:      path.posix.join('src', 'scripts', '**/*.js'),
        scriptsNoMap: '!' + path.posix.join('src', 'scripts', '**/*.map'),

        main: path.posix.join('src', 'main.js'),

        scssGlobals:  path.posix.join('src', 'scss', 'globals.scss'),
        scssPagesDir: path.join('src', 'scss', 'pages'),
        scssPages:    path.posix.join('src', 'scss', 'pages', '**/*.scss'),
        scssAll:      path.posix.join('src', 'scss', '**/*.scss'),
    },

    app: {
        html:    path.posix.join('app', '**/*.html'),
        css:     path.posix.join('app', '**/*.css'),
        js:      path.posix.join('app', '**/*.js'),
        jsNoMap: '!' + path.posix.join('app', '**/*.map'),
    },

};


/**
 * --------------------------------
 * -----  `WATCH_OPTIONS {}`  -----
 * --------------------------------
 * - Opciones base para watchers de Gulp/Chokidar.
 * - Permite activar polling por variable de entorno para evitar ENOSPC en Linux.
 */
const WATCH_OPTIONS = /** @type {import('gulp').WatchOptions} */ ({
    ignoreInitial: true,
    usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    interval: Number(process.env.CHOKIDAR_INTERVAL || 250),
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
    }
});


/**
 * --------------------------
 * -----  `safePipe()`  -----
 * --------------------------
 * - Evita que Gulp se detenga ante errores en los streams de tareas.
 * @return {NodeJS.ReadWriteStream}
 */
const safePipe = () => plumber({
    errorHandler(err) {

        //  -----  mostrar el mensaje del error en consola  -----
        console.error(err.message);

        //  -----  terminar el stream sin detener gulp  -----
        this.emit('end');
    },
});


/**
 * -------------------------------
 * -----  `validateFiles()`  -----
 * -------------------------------
 * - Transform no bloqueante: registra archivos vacíos o streams y los deja pasar.
 * @param {string} taskName — Nombre de la tarea para mensajes de advertencia.
 * @return {Transform}
 */
const validateFiles = (taskName) => new Transform({
    objectMode: true,
    transform(file, _enc, cb) {

        /** - `ruta del archivo relativa al proyecto` */
        const rel = path.relative(process.cwd(), file.path || '');

        //  -----  si es un directorio, dejarlo pasar sin validar  -----
        if (file.stat?.isDirectory?.())

            //  -----  pasar el archivo al siguiente paso  -----
            return cb(null, file);

        //  -----  si el archivo está vacío, avisar  -----
        if (file.isNull())

            //  -----  avisar del archivo vacío  -----
            console.warn(`[${taskName}] Archivo vacío: ${rel}`);

        //  -----  si el archivo es un stream, avisar  -----
        if (file.isStream())

            //  -----  avisar del stream no soportado  -----
            console.warn(`[${taskName}] Stream no soportado: ${rel}`);

        //  -----  pasar el archivo al siguiente paso  -----
        cb(null, file);
    },
});


/**
 * ---------------------------
 * -----  `existsDir()`  -----
 * ---------------------------
 * - Comprueba si un directorio existe en disco.
 * @param {string} dirPath - Ruta del directorio.
 * @return {boolean}
 */
const existsDir = (dirPath) => fs.existsSync(dirPath);



/*
    *  -----------------------------------  *
    *  -----  png de captura a avif  -----  *
    *  -----------------------------------  *
*/



/**
 * -----------------------------
 * -----  `ImageAvifSize`  -----
 * -----------------------------
 * - Tamaños AVIF generados por cada PNG.
 * @typedef {Object} ImageAvifSize
 * @property {number} width - Ancho máximo de salida.
 * @property {number} height - Alto máximo de salida.
 */



/**
 * --------------------------------
 * -----  `AVIF_VARIANTS []`  -----
 * --------------------------------
 * - `tamaños avif generados por cada png`
 * @type {ImageAvifSize[]}
 */
const AVIF_VARIANTS = [
    { width: 280, height: 247 },
    { width: 560, height: 494 },
];



/**
 * -------------------------------------
 * -----  `listClasePngSources()`  -----
 * -------------------------------------
 * - Lista los PNG de captura en assets/img/clase-*, sin los AVIF ya generados.
 * @return {string[]} - `Rutas de los PNG de origen`.
 */
const listClasePngSources = () => {

    /** - `carpeta de imágenes` */
    const imgRoot = path.join('assets', 'img');

    //  -----  si no hay carpeta de imágenes, no hay capturas  -----
    if (!fs.existsSync(imgRoot))
        //  -----  devolver una lista vacía  -----
        return [];

    /** - `carpetas clase-*` */
    const classDirs = fs.readdirSync(imgRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('clase-'));

    /** @type {string[]} - `png de captura encontrados` */
    const files = [];

    //  -----  recorrer cada carpeta de clase  -----
    for (const classDir of classDirs) {

        /** - `ruta de la carpeta de clase` */
        const dirPath = path.join(imgRoot, classDir.name);

        /** - `nombres de archivo de la carpeta` */
        const names = fs.readdirSync(dirPath);

        //  -----  recorrer los archivos de la clase  -----
        for (const name of names) {

            //  -----  si no es png, saltarlo  -----
            if (!name.toLowerCase().endsWith('.png'))
                //  -----  pasar al siguiente archivo  -----
                continue;

            /** - `nombre sin la extensión png` */
            const base = name.slice(0, -4);

            //  -----  si ya es un derivado de tamaño, saltarlo  -----
            if (/-280x247$/.test(base) || /-560x494$/.test(base))
                //  -----  pasar al siguiente archivo  -----
                continue;

            //  -----  guardar el png de captura  -----
            files.push(path.join(dirPath, name));

        }

    }

    //  -----  devolver los png de captura  -----
    return files;

};



/**
 * --------------------------------------
 * -----  `getImageStem(fileName)`  -----
 * --------------------------------------
 * - Quita la extensión y el sufijo de tamaño del nombre del PNG.
 * @param {string} fileName - Nombre del archivo PNG.
 * @return {string} - `Nombre base para el AVIF`.
 */
const getImageStem = (fileName) => {

    /** - `nombre sin la extensión png` */
    const base = fileName.replace(/\.png$/i, '');

    /** - `nombre sin el sufijo de ancho y alto` */
    const stripped = base.replace(/-\d+x\d+$/, '');

    //  -----  devolver el nombre base, o el nombre sin extensión si el sufijo lo vació  -----
    return stripped || base;

};



/**
 * ------------------------------------------------------
 * -----  `shouldWriteAvif(inputPath, outputPath)`  -----
 * ------------------------------------------------------
 * - Regenera el AVIF si no existe o si el PNG es más nuevo.
 * @param {string} inputPath - PNG de origen.
 * @param {string} outputPath - AVIF de salida.
 * @return {boolean} - `'true' si hay que escribir el AVIF`.
 */
const shouldWriteAvif = (inputPath, outputPath) => {

    //  -----  si el avif no existe, hay que crearlo  -----
    if (!fs.existsSync(outputPath))
        //  -----  escribir el avif  -----
        return true;

    /** - `fecha del png` */
    const inputStat = fs.statSync(inputPath);

    /** - `fecha del avif` */
    const outputStat = fs.statSync(outputPath);

    //  -----  escribir el avif solo si el png es más nuevo  -----
    return inputStat.mtimeMs > outputStat.mtimeMs;

};



/**
 * --------------------------------------------------------------------
 * -----  `writeAvifImage(inputPath, outputPath, width, height)`  -----
 * --------------------------------------------------------------------
 * - Encaja el PNG completo en el recuadro, sin recortar, y lo escribe como AVIF.
 * @async
 * @param {string} inputPath - PNG de origen.
 * @param {string} outputPath - Ruta del AVIF de salida.
 * @param {number} width - Ancho máximo de salida.
 * @param {number} height - Alto máximo de salida.
 * @return {Promise<void>} - `Termina cuando el AVIF está escrito`.
 */
const writeAvifImage = async (inputPath, outputPath, width, height) => {

    //  -----  redimensionar el png y escribir el avif  -----
    await sharp(inputPath)
        .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
        })
        .avif({ quality: 55 })
        .toFile(outputPath);
};



/**
 * -------------------------------
 * -----  `convertImages()`  -----
 * -------------------------------
 * - Genera dos AVIF por cada PNG de captura en clase-*.
 * @async
 * @return {Promise<void>} - `Termina cuando todos los AVIF pendientes están escritos`.
 */
export const convertImages = async () => {

    /** - `png de captura` */
    const sources = listClasePngSources();

    //  -----  si no hay capturas, salir  -----
    if (sources.length === 0) {

        //  -----  avisar de que no hay png  -----
        console.log('ℹ️  No hay PNG en assets/img/clase-*');

        //  -----  terminar la tarea  -----
        return;
    }


    //  -----  recorrer cada png de captura  -----
    for (const inputPath of sources) {

        /** - `carpeta del png` */
        const destDir = path.dirname(inputPath);

        /** - `nombre base del avif` */
        const stem = getImageStem(path.basename(inputPath));

        //  -----  generar cada tamaño  -----
        for (const size of AVIF_VARIANTS) {

            /** - `ruta del avif de este tamaño` */
            const avifPath = path.join(
                destDir,
                `${stem}-${size.width}x${size.height}.avif`
            );

            //  -----  si el avif ya está al día, saltarlo  -----
            if (!shouldWriteAvif(inputPath, avifPath)) {

                //  -----  pasar al siguiente tamaño  -----
                continue;

            }

            //  -----  escribir el avif  -----
            await writeAvifImage(inputPath, avifPath, size.width, size.height);

            //  -----  confirmar el archivo escrito  -----
            console.log(`✅  ${avifPath}`);

        }

    }

};



//  -----  nombre visible de la tarea de imágenes  -----
convertImages.displayName = 'convertImages';



/*
    ---------------------------
    -----  🧹  --  CLEAN  -----
    ---------------------------
*/


/**
 * ---------------------------
 * -----  `cleanDist()`  -----
 * ---------------------------
 * - Elimina la carpeta dist/ y su contenido.
 */
export const cleanDist = () => deleteAsync(['dist']);


/**
 * --------------------------
 * -----  `cleanApp()`  -----
 * --------------------------
 * - Elimina la carpeta app/ y su contenido.
 */
export const cleanApp = () => deleteAsync(['app']);


/**
 * ------------------------------------
 * -----  `cleanMarkdownShiki()`  -----
 * ------------------------------------
 * - Elimina src/markdown-shiki/ para no dejar html de rutas borradas.
 * @return {Promise<string[]>} - Rutas eliminadas.
 */
export const cleanMarkdownShiki = () => deleteAsync([paths.src.markdownShikiDir]);



/**
 * --------------------------
 * -----  `resetDev()`  -----
 * --------------------------
 * - Vacía app/ y src/markdown-shiki/ antes de volver a copiar.
 */
export const resetDev = parallel(cleanApp, cleanMarkdownShiki);



/**
 * -----------------------
 * -----  `clean()`  -----
 * -----------------------
 * - Elimina en paralelo dist/, app/ y src/markdown-shiki/.
 */
export const clean = parallel(cleanDist, cleanApp, cleanMarkdownShiki);



/*
    *  --------------------------
    *  -----  COPY FACTORY  -----
    *  --------------------------
*/


/**
 * -------------------------------
 * -----  `CopyTaskOptions`  -----
 * -------------------------------
 * @typedef {Object} CopyTaskOptions
 * @property {string | string[]} glob      — Glob(s) de origen.
 * @property {string}            checkPath — Ruta a verificar antes de copiar.
 * @property {string}            [base]    — Base para src(). Default: paths.srcRoot.
 * @property {string}            [destDir] — Directorio destino. Default: paths.appRoot.
 * @property {boolean}           [isFile]  — true si checkPath es un archivo, no directorio.
 * @property {string | string[]} [exclude] — Globs de exclusión adicionales.
 */


/**
 * --------------------------------
 * -----  `createCopyTask()`  -----
 * --------------------------------
 * - Crea una tarea Gulp de copia con validación y manejo de errores.
 * @param {string} name — Nombre visible de la tarea.
 * @param {CopyTaskOptions} opts - Opciones de la copia.
 * @return {import('gulp').TaskFunction} - Tarea de Gulp que copia los archivos.
 */
const createCopyTask = (name, opts) => {

    /**
     * --------------------
     * -----  `fn()`  -----
     * --------------------
     * - Tarea que valida la ruta de origen y copia los archivos a destino.
     * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de copia o promesa vacía.
     */
    const fn = () => {

        /** - `indica si existe la ruta de origen` */
        const exists = opts.isFile ? fs.existsSync(opts.checkPath) : existsDir(opts.checkPath);

        //  -----  si no existe el origen, no hay nada que copiar  -----
        if (!exists)

            //  -----  devolver una promesa ya resuelta  -----
            return Promise.resolve();

        /** - `globs de origen con las exclusiones` */
        const globs = opts.exclude
            ? /** @type {string[]} */ ([].concat(opts.glob, opts.exclude))
            : opts.glob;

        /** @type {Record<string, unknown>} - `opciones de src()` */
        const srcOpts = { base: opts.base ?? paths.srcRoot, allowEmpty: true };

        //  -----  copiar los archivos validándolos y manejando errores  -----
        return src(globs, srcOpts)
            .pipe(safePipe())
            .pipe(validateFiles(name))
            .pipe(dest(opts.destDir ?? paths.appRoot));
    };

    //  -----  asignar el nombre visible de la tarea  -----
    fn.displayName = name;

    //  -----  devolver la tarea creada  -----
    return fn;
};



/*
    -------------------------------------
    -----  📋  --  COPY  src → app  -----
    -------------------------------------
    Carpetas copiadas respetando su estructura
    dentro de app/.
*/


/** - `copia src/components/ → app/components/.` */
export const copyComponents = createCopyTask('copyComponents', { glob: paths.src.components, checkPath: paths.src.componentsDir });

/** - `copia src/config/ → app/config/.` */
export const copyConfig = createCopyTask('copyConfig', { glob: paths.src.config, checkPath: paths.src.configDir });

/** - `copia src/effects/ → app/effects/.` */
export const copyEffects = createCopyTask('copyEffects', { glob: paths.src.effects, checkPath: paths.src.effectsDir });

/** - `copia src/markdown-shiki/ → app/markdown-shiki/.` */
export const copyMarkdownShiki = createCopyTask('copyMarkdownShiki', { glob: paths.src.markdownShiki, checkPath: paths.src.markdownShikiDir });

/** - `copia src/pages/ → app/pages/.` */
export const copyPages = createCopyTask('copyPages', { glob: paths.src.pages, checkPath: paths.src.pagesDir });

/** - `copia src/pages-components/ → app/pages-components/.` */
export const copyPagesComponents = createCopyTask('copyPagesComponents', { glob: paths.src.pagesComponents, checkPath: paths.src.pagesComponentsDir });

/** - `copia src/plugins/ → app/plugins/.` */
export const copyPlugins = createCopyTask('copyPlugins', { glob: paths.src.plugins, checkPath: paths.src.pluginsDir });

/** - `copia src/routes/ → app/routes/.` */
export const copyRoutes = createCopyTask('copyRoutes', { glob: paths.src.routes, checkPath: paths.src.routesDir });

/** - `copia src/spa/ → app/spa/.` */
export const copySpa = createCopyTask('copySpa', { glob: paths.src.spa, checkPath: paths.src.spaDir });

/** - `copia src/main.js → app/main.js.` */
export const copyMain = createCopyTask('copyMain', {
    glob:      paths.src.main,
    checkPath: paths.src.main,
    isFile:    true,
});

/** - `copia src/scripts/ → app/js/ (renombra carpeta).` */
export const copyScripts = createCopyTask('copyScripts', {
    glob:      paths.src.scripts,
    checkPath: paths.src.scriptsDir,
    base:      paths.src.scriptsDir,
    destDir:   path.posix.join(paths.appRoot, 'js'),
    exclude:   paths.src.scriptsNoMap,
});



/*
    ---------------------------------------
    -----  🌸  --  SCSS → app/css     -----
    ---------------------------------------
    Compila los SCSS de src y deposita
    los CSS compilados en app/css.
*/


/**
 * ---------------------
 * -----  `css()`  -----
 * ---------------------
 * - Compila src/scss/globals.scss → app/css/globals.css.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const css = () =>

    !fs.existsSync(paths.src.scssGlobals)
        ? Promise.resolve()
        : src(paths.src.scssGlobals, { sourcemaps: true, allowEmpty: true })
            .pipe(safePipe())
            .pipe(sass(sassOptions).on('error', sass.logError))
            .pipe(validateFiles('css'))
            .pipe(dest(path.posix.join(paths.appRoot, 'css'), { sourcemaps: true }));


/**
 * --------------------------
 * -----  `cssPages()`  -----
 * --------------------------
 * - Compila src/scss/pages/*.scss → app/css/pages/*.css.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const cssPages = () =>

    !existsDir(paths.src.scssPagesDir)
        ? Promise.resolve()
        : src(paths.src.scssPages, { base: paths.src.scssPagesDir, sourcemaps: true, allowEmpty: true })
            .pipe(safePipe())
            .pipe(sass(sassOptions).on('error', sass.logError))
            .pipe(validateFiles('cssPages'))
            .pipe(dest(path.posix.join(paths.appRoot, 'css', 'pages'), { sourcemaps: true }));


/** - `compila globals + pages en paralelo.` */
export const styles = parallel(css, cssPages);



/*
    -----------------------------------------
    -----  🔄  --  COPY ALL  src → app  -----
    -----------------------------------------
    Agrupa todas las tareas de copia y
    compilación en una sola tarea paralela.
*/


/**
 * -------------------------------
 * -----  `generateShiki()`  -----
 * -------------------------------
 * - Genera los bloques HTML resaltados con Shiki en src/markdown-shiki/.
 * - Debe ejecutarse DESPUÉS de `styles` (lee el CSS compilado en app/css/pages/)
 *   y ANTES de `copyMarkdownShiki`.
 * @return {Promise<void>}
 */
const generateShiki = async () => {

    //  -----  generar los bloques html con shiki  -----
    await generateMarkdownShiki();
};

//  -----  nombre visible de la tarea de shiki  -----
generateShiki.displayName = 'generateShiki';


/** - `buildSources: copias y compilación scss en paralelo (produce app/css/)` */
const buildSources = parallel(
    copyComponents,
    copyConfig,
    copyEffects,
    copyPages,
    copyPagesComponents,
    copyPlugins,
    copyRoutes,
    copySpa,
    copyScripts,
    copyMain,
    styles
);

/** - `copyAll: buildSources, generateShiki y copyMarkdownShiki en serie (generateShiki lee el css compilado por styles; copyMarkdownShiki copia el html generado a app/markdown-shiki/)` */
const copyAll = series(
    buildSources,
    generateShiki,
    copyMarkdownShiki
);



/**
 * -------------------------
 * -----  `refresh()`  -----
 * -------------------------
 * - Vacía los destinos y vuelve a copiar y compilar src/ hacia app/, sin quedar a la escucha.
 */
export const refresh = series(resetDev, copyAll);



/*
    ---------------------------------
    -----  👀  --  DEV / WATCH  -----
    ---------------------------------
    Observa src/ y sincroniza cada cambio
    en la carpeta app/ en tiempo real.
*/


/**
 * ---------------------------
 * -----  `watchTask()`  -----
 * ---------------------------
 * - Observa src/ y recompila en cada cambio.
 * @return {void}
 */
const watchTask = () => {

    /** @type {Array<[string | string[], import('gulp').TaskFunction]>} */
    const watchers = [
        [paths.src.components,    copyComponents],
        [paths.src.config,        copyConfig],
        [paths.src.effects,       copyEffects],
        [paths.src.markdownShiki, copyMarkdownShiki],
        [paths.src.pages,         copyPages],
        [paths.src.pagesComponents, copyPagesComponents],
        [paths.src.plugins,       copyPlugins],
        [paths.src.routes,        copyRoutes],
        [paths.src.spa,           copySpa],
        [paths.src.scripts,       copyScripts],
        [paths.src.main,          copyMain],
        [paths.src.scssAll,       series(styles, generateShiki, copyMarkdownShiki)],
        [paths.root.claseImagesPng, convertImages],
    ];

    //  -----  recorrer cada par glob y tarea  -----
    for (const [glob, task] of watchers) {

        //  -----  observar el glob y lanzar su tarea al detectar cambios  -----
        watch(glob, WATCH_OPTIONS, task);
    }
};

//  -----  nombre visible de la tarea de watch  -----
watchTask.displayName = 'watch';



/**
 * --------------------------
 * -----  `watchSrc()`  -----
 * --------------------------
 * - Solo observa src/. El vaciado y la copia inicial van en refresh y en dev.
 */
export const watchSrc = () => watchTask();



//  -----  nombre visible de watchSrc  -----
watchSrc.displayName = 'watchSrc';



/**
 * ---------------------
 * -----  `dev()`  -----
 * ---------------------
 * - Vacía los destinos, genera app/ y queda escuchando. El servidor se levanta con pnpm run server.
 */
export const dev = series(resetDev, copyAll, watchTask);


/**
 * -----------------------------
 * -----  `watchStyles()`  -----
 * -----------------------------
 * - Observa únicamente los archivos scss y recompila estilos.
 * @return {import('fs').FSWatcher} - Observador de archivos.
 */
export const watchStyles = () => watch(paths.src.scssAll, WATCH_OPTIONS, styles);



/*
    -----------------------------------------
    -----  🟥  --  MINIFY  app → dist   -----
    -----------------------------------------
    Minifica el contenido de app/ y lo
    deposita en dist/ manteniendo la estructura.
*/


/**
 * ---------------------------------
 * -----  `replaceSiteBase()`  -----
 * ---------------------------------
 * - Crea un Transform que sustituye el marcador %SITE_BASE% por la base del .env.
 * @return {Transform}
 */
const replaceSiteBase = () => new Transform({
    objectMode: true,
    transform(file, _enc, cb) {

        //  -----  solo procesa archivos con contenido  -----
        if (file.isBuffer()) {

            //  -----  reemplaza todas las apariciones del marcador  -----
            file.contents = Buffer.from(file.contents.toString('utf-8').replaceAll('%SITE_BASE%', base));
        }

        //  -----  pasa el archivo al siguiente paso  -----
        cb(null, file);
    },
});


/**
 * ---------------------------------
 * -----  `minifyRootIndex()`  -----
 * ---------------------------------
 * - Minifica index.html raíz → dist/index.html.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const minifyRootIndex = () =>

    //  -----  leer index.html, sustituir la base, minificar y escribir en dist/  -----
    src('index.html', { allowEmpty: true })
        .pipe(safePipe())
        .pipe(replaceSiteBase())
        .pipe(htmlmin({ collapseWhitespace: true, removeComments: true }))
        .pipe(validateFiles('minifyRootIndex'))
        .pipe(dest(paths.distRoot));


/**
 * --------------------------------
 * -----  `htaccessToDist()`  -----
 * --------------------------------
 * - Copia .htaccess raíz → dist/.htaccess con la base del .env.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const htaccessToDist = () =>

    //  -----  leer .htaccess, sustituir la base y escribir en dist/  -----
    src('.htaccess', { allowEmpty: true, dot: true })
        .pipe(safePipe())
        .pipe(replaceSiteBase())
        .pipe(validateFiles('htaccessToDist'))
        .pipe(dest(paths.distRoot));


/**
 * ----------------------------
 * -----  `minifyHtml()`  -----
 * ----------------------------
 * - Minifica todos los HTML de app/ → dist/.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const minifyHtml = () =>

    !existsDir(paths.appRoot)
        ? Promise.resolve()
        : src(paths.app.html, { base: '.', allowEmpty: true })
            .pipe(safePipe())
            .pipe(htmlmin({ collapseWhitespace: true, removeComments: true }))
            .pipe(validateFiles('minifyHtml'))
            .pipe(dest(paths.distRoot));


/**
 * ------------------------------
 * -----  `minifyAllCss()`  -----
 * ------------------------------
 * - Minifica todos los CSS de app/ → dist/.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const minifyAllCss = () =>

    !existsDir(paths.appRoot)
        ? Promise.resolve()
        : src(paths.app.css, { base: '.', allowEmpty: true })
            .pipe(safePipe())
            .pipe(cleanCSS())
            .pipe(validateFiles('minifyAllCss'))
            .pipe(dest(paths.distRoot));


/**
 * -----------------------------
 * -----  `minifyAllJs()`  -----
 * -----------------------------
 * - Minifica todos los JS de app/ → dist/.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const minifyAllJs = () =>

    !existsDir(paths.appRoot)
        ? Promise.resolve()
        : src([paths.app.js, paths.app.jsNoMap], { base: '.', allowEmpty: true })
            .pipe(safePipe())
            .pipe(terser())
            .pipe(validateFiles('minifyAllJs'))
            .pipe(dest(paths.distRoot));


/**
 * ----------------------------------------
 * -----  `copyStaticAssetsToDist()`  -----
 * ----------------------------------------
 * - Copia assets estáticos (no HTML/CSS/JS/map) de app/ → dist/.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const copyStaticAssetsToDist = () =>

    !existsDir(paths.appRoot)
        ? Promise.resolve()
        : src([
            path.posix.join(paths.appRoot, '**/*'),
            '!' + paths.app.html,
            '!' + paths.app.css,
            '!' + paths.app.js,
            '!' + path.posix.join(paths.appRoot, '**/*.map'),
        ], { base: '.', allowEmpty: true, encoding: false })
            .pipe(safePipe())
            .pipe(validateFiles('copyStaticAssetsToDist'))
            .pipe(dest(paths.distRoot));


/**
 * --------------------------------------
 * -----  `copyRootAssetsToDist()`  -----
 * --------------------------------------
 * - Copia assets raíz del proyecto → dist/assets.
 * @return {NodeJS.ReadWriteStream | Promise<void>} - Stream de la tarea o promesa vacía.
 */
export const copyRootAssetsToDist = () =>

    !existsDir(paths.root.assetsDir)
        ? Promise.resolve()
        : src(paths.root.assets, { base: '.', allowEmpty: true, encoding: false })
            .pipe(safePipe())
            .pipe(validateFiles('copyRootAssetsToDist'))
            .pipe(dest(paths.distRoot));


/**
 * ------------------------------
 * -----  `addTsNoCheck()`  -----
 * ------------------------------
 * - Agrega //@ts-nocheck al inicio de los archivos JS (solo en desarrollo).
 * @param {(err?: Error | null) => void} cb - Callback de Gulp.
 * @return {void}
 */
export function addTsNoCheck(cb) {

    //  -----  si no es desarrollo, terminar la tarea sin hacer nada  -----
    if (process.env.NODE_ENV !== 'development')

        //  -----  avisar a gulp de que la tarea terminó  -----
        return cb();

    //  -----  ejecutar el script que añade ts-nocheck  -----
    exec('node addTsNoCheck.js', (err, stdout, stderr) => {

        //  -----  si el script falla, mostrar el error y avisar a gulp  -----
        if (err) {

            //  -----  mostrar el error en consola  -----
            console.error(err);

            //  -----  avisar a gulp del error  -----
            return cb(err);
        }

        //  -----  si hay salida estándar, mostrarla  -----
        if (stdout)

            //  -----  mostrar la salida estándar  -----
            console.log(stdout);

        //  -----  si hay salida de error, mostrarla  -----
        if (stderr)

            //  -----  mostrar la salida de error  -----
            console.error(stderr);

        //  -----  avisar a gulp de que la tarea terminó  -----
        cb();
    });
}



/*
    ---------------------------
    -----  🚀  --  BUILD  -----
    ---------------------------
    1. Limpia dist/, app/ y src/markdown-shiki/
    2. Copia y compila src/ → app/
    3. Minifica app/ → dist/
*/


/**
 * -----------------------
 * -----  `build()`  -----
 * -----------------------
 * - Genera el build de producción en tres pasos:
 * - 1. Limpia dist/, app/ y src/markdown-shiki/.
 * - 2. Copia y compila src/ → app/.
 * - 3. Minifica app/ → dist/.
 */
export const build = series(
    parallel(cleanDist, cleanApp, cleanMarkdownShiki),
    copyAll,
    parallel(
        minifyAllJs,
        minifyAllCss,
        minifyRootIndex,
        htaccessToDist,
        minifyHtml,
        copyStaticAssetsToDist,
        copyRootAssetsToDist
    )
);



/*
    ------------------------------
    -----  🔥  DEFAULT TASK  -----
    ------------------------------
    Ejecuta `build()` por defecto al correr `gulp` sin argumentos.
*/
//  -----  exportar build como tarea por defecto  -----
export default build;
