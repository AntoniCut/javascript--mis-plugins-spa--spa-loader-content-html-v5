/*
    *  --------------------------------------------------------------------  *
    *  -----  route-node-page.js  --  /src/routes/route-node-page.js  -----  *
    *  --------------------------------------------------------------------  *
*/


import { paths } from './paths.js';

/** - `urls base de las carpetas de app/ tomadas de paths.js` */
const { favicon, layoutHeader, layoutNavbar, pages, pagesComponents, MarkdownShikiHtml, layoutFooter, styles, scripts, scssPages } = paths;

/**
 * --------------------------------
 * -----  `routeNodePage {}`  -----
 * --------------------------------
 * - `ruta de la vista: shell, componentes, bloques shiki, estilos y scripts que carga el plugin`
 * @type {Route}
 */
export const routeNodePage = {
    id: 'nodePage',
    favicon: `${favicon}/nodejs-icon.svg`,
    pageTitle: 'Node — API MySQL en producción',
    path: 'node-page',
    components: {
        "layoutHeader": `${layoutHeader}`,
        "layoutNavbar": `${layoutNavbar}`,
        "layoutMain": `${pages}/node/node-page.html`,
        "layoutFooter": `${layoutFooter}`,
    },
    pagesComponents: [
        { url: `${pagesComponents}/node/node-description.html`, target: '[data-component-page="nodeDescription"]' },
        { url: `${pagesComponents}/node/node-demo.html`, target: '[data-component-page="nodeDemo"]' },
    ],
    MarkdownShikiHtml: [
        {
            fileName: 'node-page-html.html',
            fileExtension: 'html',
            urlInput: `${pages}/node/node-page.html`,
            urlOutput: `${MarkdownShikiHtml}/pages/node`,
            target: '[data-shiki="codeHtml"]',
        },
        {
            fileName: 'node-page-css.html',
            fileExtension: 'css',
            urlInput: `${styles}/node-page.css`,
            urlOutput: `${MarkdownShikiHtml}/pages/node`,
            target: '[data-shiki="codeCss"]',
        },
        {
            fileName: 'node-page-scss.html',
            fileExtension: 'scss',
            urlInput: `${scssPages}/node-page.scss`,
            urlOutput: `${MarkdownShikiHtml}/pages/node`,
            target: '[data-shiki="codeScss"]',
        },
        {
            fileName: 'node-page.cjs-js.html',
            fileExtension: 'js',
            urlInput: `${scripts}/js/pages/node-page.cjs.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/node`,
            target: '[data-shiki="codeCjsJs"]',
        },
        {
            fileName: 'node-page.esm-js.html',
            fileExtension: 'js',
            urlInput: `${scripts}/js/pages/node-page.esm.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/node`,
            target: '[data-shiki="codeEsmJs"]',
        },
    ],
    headerTitle: 'Node — API MySQL en producción',
    styles: [
        { href: `${styles}/node-page.css` }
    ],
    scripts: [
        { src: `${scripts}/js/pages/node-page.cjs.js` },
        { src: `${scripts}/js/pages/node-page.esm.js`, isModule: true, exportFunctionName: 'mount' },
    ]
};
