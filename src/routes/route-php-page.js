/*
    *  ------------------------------------------------------------------  *
    *  -----  route-php-page.js  --  /src/routes/route-php-page.js  -----  *
    *  ------------------------------------------------------------------  *
*/


import { paths } from './paths.js';

/** - `urls base de las carpetas de app/ tomadas de paths.js` */
const { favicon, layoutHeader, layoutNavbar, pages, pagesComponents, MarkdownShikiHtml, layoutFooter, styles, scripts, scssPages, services } = paths;

/**
 * -------------------------------
 * -----  `routePhpPage {}`  -----
 * -------------------------------
 * - `ruta de la vista: shell, componentes, bloques shiki, estilos y scripts que carga el plugin`
 * @type {Route}
 */
export const routePhpPage = {
    id: 'phpPage',
    favicon: `${favicon}/php-icon.svg`,
    pageTitle: 'PHP — Validación en el servidor',
    path: 'php-page',
    components: {
        "layoutHeader": `${layoutHeader}`,
        "layoutNavbar": `${layoutNavbar}`,
        "layoutMain": `${pages}/php/php-page.html`,
        "layoutFooter": `${layoutFooter}`,
    },
    pagesComponents: [
        { url: `${pagesComponents}/php/php-description.html`, target: '[data-component-page="phpDescription"]' },
        { url: `${pagesComponents}/php/php-demo.html`, target: '[data-component-page="phpDemo"]' },
    ],
    MarkdownShikiHtml: [
        {
            fileName: 'php-page-html.html',
            fileExtension: 'html',
            urlInput: `${pages}/php/php-page.html`,
            urlOutput: `${MarkdownShikiHtml}/pages/php`,
            target: '[data-shiki="codeHtml"]',
        },
        {
            fileName: 'php-page-css.html',
            fileExtension: 'css',
            urlInput: `${styles}/php-page.css`,
            urlOutput: `${MarkdownShikiHtml}/pages/php`,
            target: '[data-shiki="codeCss"]',
        },
        {
            fileName: 'php-page-scss.html',
            fileExtension: 'scss',
            urlInput: `${scssPages}/php-page.scss`,
            urlOutput: `${MarkdownShikiHtml}/pages/php`,
            target: '[data-shiki="codeScss"]',
        },
        {
            fileName: 'php-page.cjs-js.html',
            fileExtension: 'js',
            urlInput: `${scripts}/js/pages/php-page.cjs.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/php`,
            target: '[data-shiki="codeCjsJs"]',
        },
        {
            fileName: 'php-page.esm-js.html',
            fileExtension: 'js',
            urlInput: `${scripts}/js/pages/php-page.esm.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/php`,
            target: '[data-shiki="codeEsmJs"]',
        },
        {
            fileName: 'php-page-php.html',
            fileExtension: 'php',
            urlInput: `${services}/php/validate.php`,
            urlOutput: `${MarkdownShikiHtml}/pages/php`,
            target: '[data-shiki="codePhp"]',
        },
    ],
    headerTitle: 'PHP — Validación en el servidor',
    styles: [
        { href: `${styles}/php-page.css` }
    ],
    scripts: [
        { src: `${scripts}/js/pages/php-page.cjs.js` },
        { src: `${scripts}/js/pages/php-page.esm.js`, isModule: true, exportFunctionName: 'mount' },
    ]
};
