/*
    *  -------------------------------------------------------------------------  *
    *  -----  generate-markdown-shiki.js  --  /generate-markdown-shiki.js  -----  *
    *  -------------------------------------------------------------------------  *
*/

/*
    Lee las entradas MarkdownShikiHtml de cada ruta y genera los bloques HTML
    resaltados con Shiki en src/markdown-shiki/ (gulp copia luego el resultado
    a app/markdown-shiki/).

    Cada entrada del contrato MarkdownShikiEntry indica:
      - fileName:      nombre del .html a generar.
      - fileExtension: tipo/lenguaje a resaltar ('html' | 'css' | 'scss' | 'js').
      - urlInput:      URL (con base) del archivo fuente a renderizar (debe existir).
      - urlOutput:     URL (con base) de la CARPETA donde se guarda el .html generado.
      - target:        selector CSS destino (informativo).

    El bloque se guarda en: src/markdown-shiki/<relOutput>/<fileName>
    donde <relOutput> se deriva de urlOutput (lo posterior a 'markdown-shiki/').

    Uso: pnpm code-highlight
*/


import { codeToHtml } from 'shiki';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { base } from './src/config/site-base.js';


/** @typedef {Record<string, Route>} RouteModule */


/**
 * ------------------------------
 * -----  `ShikiGenResult`  -----
 * ------------------------------
 * - Resultado de generar un bloque HTML resaltado.
 * @typedef {Object} ShikiGenResult
 * @property {'generated' | 'skipped'} status - Si el bloque se generó o se omitió.
 * @property {string} message - Mensaje que se muestra en consola.
 */


/** - `directorio de este archivo` */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** - `ruta de este archivo` */
const __filename = fileURLToPath(import.meta.url);

/** - `carpeta de salida a partir de la cual se deriva la ruta relativa` */
const MARKER = 'markdown-shiki/';

/** - `tema de Shiki con el que se resalta el código` */
const SHIKI_THEME = 'dark-plus';

/** - `indica si se elimina el banner de cabecera del código fuente antes de resaltarlo` */
const STRIP_HEADER_BANNER = true;

/** - `patrón que identifica un comentario banner` */
const BANNER_PATTERN = /-----/;



/**
 * --------------------------------------
 * -----  `mapLang(fileExtension)`  -----
 * --------------------------------------
 * - Mapea `fileExtension` al identificador de lenguaje que espera Shiki.
 * @param {string} fileExtension - Extensión declarada en la entrada.
 * @return {string | null} - Lenguaje de Shiki o `null` si no se soporta.
 */
const mapLang = (fileExtension) => {

    /** - `extensión en minúsculas` */
    const ext = String(fileExtension).toLowerCase();

    //  -----  si es html, devolver el lenguaje html  -----
    if (ext === 'html') return 'html';

    //  -----  si es css, devolver el lenguaje css  -----
    if (ext === 'css') return 'css';

    //  -----  si es scss, devolver el lenguaje scss  -----
    if (ext === 'scss') return 'scss';

    //  -----  si es js o javascript, devolver el lenguaje javascript  -----
    if (ext === 'js' || ext === 'javascript') return 'javascript';

    //  -----  si no se soporta, devolver null  -----
    return null;
};



/**
 * ------------------------------
 * -----  `urlToDisk(url)`  -----
 * ------------------------------
 * - Convierte una URL (con base) a una ruta absoluta en disco.
 * @param {string} url - URL con la base del sitio.
 * @return {string} - Ruta absoluta en disco.
 */
const urlToDisk = (url) => {

    /** - `ruta relativa sin la base del sitio` */
    const rel = url.startsWith(base) ? url.slice(base.length) : url;

    //  -----  devolver la ruta absoluta del archivo  -----
    return join(__dirname, rel);
};



/**
 * ------------------------------------------
 * -----  `deriveOutputDir(urlOutput)`  -----
 * ------------------------------------------
 * - A partir de `urlOutput` (carpeta con base) devuelve la ruta relativa de salida dentro de src/markdown-shiki/ (lo posterior a 'markdown-shiki/').
 * @param {string} urlOutput - URL de la carpeta de salida.
 * @return {string | null} - Ruta relativa de salida o `null` si no contiene el marcador.
 */
const deriveOutputDir = (urlOutput) => {

    /** - `posición del marcador dentro de la URL` */
    const idx = urlOutput.indexOf(MARKER);

    //  -----  si no hay marcador, no se puede derivar la salida  -----
    if (idx === -1) return null;

    //  -----  devolver lo posterior al marcador sin la barra final  -----
    return urlOutput.slice(idx + MARKER.length).replace(/\/$/, '');
};



/**
 * ---------------------------------------
 * -----  `stripHeaderBanner(code)`  -----
 * ---------------------------------------
 * - Elimina bloques de comentario tipo banner al inicio del código fuente.
 * @param {string} code - Código fuente completo.
 * @return {string} - Código sin el banner de cabecera.
 */
const stripHeaderBanner = (code) => {

    //  -----  quitar las directivas ts-nocheck y use strict del principio  -----
    code = code.replace(/^(?:\/\/\s*@ts-nocheck\s*\n|"\s*use strict\s*"\s*;\s*\n)+/, '');

    /** - `expresión que detecta cualquier comentario (bloque, html o de línea)` */
    const ANY_COMMENT_RE = /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|\/\/[^\n]*\n/g;

    /** - `posición donde empieza el primer banner` */
    let firstIdx = -1;

    /** - `posición donde termina el primer banner` */
    let firstEnd = -1;


    //  -----  buscar el primer comentario que sea un banner  -----
    for (const m of code.matchAll(ANY_COMMENT_RE)) {

        //  -----  si el comentario es un banner, guardar su posición  -----
        if (BANNER_PATTERN.test(m[0])) {

            //  -----  guardar el inicio del banner  -----
            firstIdx = m.index;

            //  -----  guardar el final del banner  -----
            firstEnd = m.index + m[0].length;

            //  -----  dejar de buscar  -----
            break;
        }
    }

    //  -----  si no hay banner, devolver el código tal cual  -----
    if (firstIdx === -1) return code;

    /** - `posición donde termina el bloque de banners consecutivos` */
    let endIdx = firstEnd;

    /** - `expresión que detecta un comentario justo después del banner` */
    const COMMENT_AFTER_BANNER_RE = /^\s*(?:\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|\/\/[^\n]*\n)/;


    //  -----  ampliar el bloque mientras sigan comentarios banner consecutivos  -----
    while (true) {

        /** - `código que queda después del último banner` */
        const rest = code.slice(endIdx);

        /** - `comentario que sigue al banner, si existe` */
        const match = rest.match(COMMENT_AFTER_BANNER_RE);

        //  -----  si no hay comentario a continuación, terminar  -----
        if (!match) break;

        //  -----  si el comentario no es un banner, terminar  -----
        if (!BANNER_PATTERN.test(match[0])) break;

        //  -----  incluir el comentario en el bloque de banners  -----
        endIdx += match[0].length;
    }

    /** - `código anterior al banner` */
    const before = code.slice(0, firstIdx);

    /** - `código posterior al banner sin la línea en blanco inicial` */
    const after = code.slice(endIdx).replace(/^\s*\n/, '');


    //  -----  devolver el código sin el banner  -----
    return (before + after).replace(/^\s*\n/, '');
};



/**
 * ---------------------------------------
 * -----  `generateMarkdownShiki()`  -----
 * ---------------------------------------
 * - Genera bloques HTML resaltados con Shiki en src/markdown-shiki/.
 * @return {Promise<{ generated: number, skipped: number }>} - Número de bloques generados y omitidos.
 */
export const generateMarkdownShiki = async () => {

    /** - `carpeta con los módulos de ruta` */
    const routesDir = join(__dirname, 'src/routes');

    /** - `archivos de ruta (sin el manifiesto)` */
    const routeFiles = readdirSync(routesDir).filter(
        (f) => f.startsWith('route-') && f.endsWith('.js') && f !== 'route-manifest.js'
    );

    /** @type {MarkdownShikiEntry[]} - `entradas de todas las rutas` */
    const entries = [];


    //  -----  recorrer cada archivo de ruta  -----
    for (const file of routeFiles) {

        /** @type {RouteModule} - `módulo de la ruta importado dinámicamente` */
        const mod = await import(`./src/routes/${file}`);

        /** @type {Route | undefined} - `objeto Route exportado por el módulo` */
        const route = Object.values(mod).find(
            (v) => v && typeof v === 'object' && Array.isArray(v.MarkdownShikiHtml)
        );


        //  -----  si la ruta declara MarkdownShikiHtml, recoger sus entradas  -----
        if (route?.MarkdownShikiHtml) {

            //  -----  recorrer cada entrada de la ruta  -----
            for (const entry of route.MarkdownShikiHtml) {

                //  -----  guardar la entrada  -----
                entries.push(entry);
            }
        }
    }


    /** @type {ShikiGenResult[]} - `resultado de generar cada entrada` */
    const results = await Promise.all(
        entries.map(async (entry) => {

            /** - `campos de la entrada` */
            const { fileName, fileExtension, urlInput, urlOutput, target } = entry;

            /** - `lenguaje de Shiki para la entrada` */
            const lang = mapLang(fileExtension);

            /** - `carpeta de salida relativa dentro de src/markdown-shiki/` */
            const outDir = deriveOutputDir(urlOutput ?? '');


            //  -----  si la entrada está incompleta, omitirla  -----
            if (!fileName || !lang || !urlInput || !outDir) {

                //  -----  devolver el resultado omitido  -----
                return {
                    status: 'skipped',
                    message: `⚠️  Entrada incompleta (fileName/fileExtension/urlInput/urlOutput): ${fileName ?? '(sin fileName)'}`,
                };
            }

            /** - `ruta en disco del archivo fuente` */
            const srcPath = urlToDisk(urlInput);

            /** - `ruta en disco del HTML generado` */
            const outPath = join(__dirname, 'src/markdown-shiki', outDir, fileName);


            //  -----  si el archivo fuente no existe, omitir la entrada  -----
            if (!existsSync(srcPath)) {

                /** - `ruta del fuente relativa al proyecto` */
                const rel = srcPath.replace(__dirname + '/', '');

                //  -----  devolver el resultado omitido  -----
                return {
                    status: 'skipped',
                    message: `⚠️  Fuente no encontrado: ${fileName}\n     urlInput no existe en disco: ${rel}`,
                };
            }

            /** - `código fuente sin procesar` */
            const rawCode = readFileSync(srcPath, 'utf-8');

            /** - `código fuente sin el banner de cabecera (si está activado)` */
            const code = STRIP_HEADER_BANNER ? stripHeaderBanner(rawCode) : rawCode;

            /** - `html resaltado con Shiki` */
            const html = await codeToHtml(code, { lang, theme: SHIKI_THEME });


            //  -----  crear la carpeta de salida si no existe  -----
            mkdirSync(dirname(outPath), { recursive: true });

            //  -----  escribir el html generado  -----
            writeFileSync(outPath, html, 'utf-8');

            /** - `ruta de salida relativa al proyecto` */
            const relOut = outPath.replace(__dirname + '/', '');

            /** - `ruta del fuente relativa al proyecto` */
            const relSrc = srcPath.replace(__dirname + '/', '');


            //  -----  devolver el resultado generado  -----
            return {
                status: 'generated',
                message: `✅  ${relOut}  ←  ${relSrc}`,
            };
        })
    );


    //  -----  mostrar en consola el resultado de cada entrada  -----
    for (const r of results) console.log(r.message);

    /** - `número de bloques generados` */
    const generated = results.filter((r) => r.status === 'generated').length;

    /** - `número de bloques omitidos` */
    const skipped = results.filter((r) => r.status === 'skipped').length;


    //  -----  mostrar el resumen final  -----
    console.log(`\n🎉  Completado — generados: ${generated} | omitidos: ${skipped}`);


    //  -----  devolver el resumen  -----
    return { generated, skipped };
};


//  -----  si el archivo se ejecuta directamente, generar los bloques  -----
if (process.argv[1] === __filename) {

    //  -----  generar los bloques de Shiki  -----
    await generateMarkdownShiki();
}
