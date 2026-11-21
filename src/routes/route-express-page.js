/*
    *  --------------------------------------------------------------------------  *
    *  -----  route-express-page.js  --  /src/routes/route-express-page.js  -----  *
    *  --------------------------------------------------------------------------  *
*/


import { paths } from './paths.js';

/** - `urls base de las carpetas de app/ tomadas de paths.js` */
const { favicon, layoutHeader, layoutNavbar, pages, pagesComponents, MarkdownShikiHtml, layoutFooter, styles, scripts, scssPages, apiSource } = paths;

/**
 * -----------------------------------
 * -----  `routeExpressPage {}`  -----
 * -----------------------------------
 * - `ruta de la vista: shell, componentes, bloques shiki, estilos y scripts que carga el plugin`
 * @type {Route}
 */
export const routeExpressPage = {
    id: 'expressPage',
    favicon: `${favicon}/express-icon.svg`,
    pageTitle: 'Node con Express',
    path: 'express-page',
    components: {
        "layoutHeader": `${layoutHeader}`,
        "layoutNavbar": `${layoutNavbar}`,
        "layoutMain": `${pages}/express/express-page.html`,
        "layoutFooter": `${layoutFooter}`,
    },
    pagesComponents: [
        { url: `${pagesComponents}/express/express-description.html`, target: '[data-component-page="expressDescription"]' },
        { url: `${pagesComponents}/express/express-demo.html`, target: '[data-component-page="expressDemo"]' },
    ],
    MarkdownShikiHtml: [
        {
            fileName: 'express-page-html.html',
            fileExtension: 'html',
            urlInput: `${pages}/express/express-page.html`,
            urlOutput: `${MarkdownShikiHtml}/pages/express`,
            target: '[data-shiki="codeHtml"]',
        },
        {
            fileName: 'express-page-css.html',
            fileExtension: 'css',
            urlInput: `${styles}/express-page.css`,
            urlOutput: `${MarkdownShikiHtml}/pages/express`,
            target: '[data-shiki="codeCss"]',
        },
        {
            fileName: 'express-page-scss.html',
            fileExtension: 'scss',
            urlInput: `${scssPages}/express-page.scss`,
            urlOutput: `${MarkdownShikiHtml}/pages/express`,
            target: '[data-shiki="codeScss"]',
        },
        {
            fileName: 'express-page.cjs-js.html',
            fileExtension: 'js',
            urlInput: `${scripts}/js/pages/express-page.cjs.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/express`,
            target: '[data-shiki="codeCjsJs"]',
        },
        {
            fileName: 'express-page.esm-js.html',
            fileExtension: 'js',
            urlInput: `${scripts}/js/pages/express-page.esm.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/express`,
            target: '[data-shiki="codeEsmJs"]',
        },
        {
            fileName: 'express-page-server-js.html',
            fileExtension: 'js',
            urlInput: `${apiSource}/tasks-router.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/express`,
            target: '[data-shiki="codeServerJs"]',
        },
    ],
    headerTitle: 'Node con Express',
    styles: [
        { href: `${styles}/express-page.css` }
    ],
    scripts: [
        { src: `${scripts}/js/pages/express-page.cjs.js` },
        { src: `${scripts}/js/pages/express-page.esm.js`, isModule: true, exportFunctionName: 'mount' },
    ]
};
