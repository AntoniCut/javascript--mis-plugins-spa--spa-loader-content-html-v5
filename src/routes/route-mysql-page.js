/*
    *  --------------------------------------------------------------------  *
    *  -----  route-mysql-page.js  --  /src/routes/route-mysql-page.js  -----  *
    *  --------------------------------------------------------------------  *
*/


import { paths } from './paths.js';

/** - `urls base de las carpetas de app/ tomadas de paths.js` */
const { favicon, layoutHeader, layoutNavbar, pages, pagesComponents, MarkdownShikiHtml, layoutFooter, styles, scripts, scssPages } = paths;

/**
 * ---------------------------------
 * -----  `routeMysqlPage {}`  -----
 * ---------------------------------
 * - `ruta de la vista: shell, componentes, bloques shiki, estilos y scripts que carga el plugin`
 * @type {Route}
 */
export const routeMysqlPage = {
    id: 'mysqlPage',
    favicon: `${favicon}/mysql-icon.svg`,
    pageTitle: 'MySQL — Consultas a la base de datos',
    path: 'mysql-page',
    components: {
        "layoutHeader": `${layoutHeader}`,
        "layoutNavbar": `${layoutNavbar}`,
        "layoutMain": `${pages}/mysql/mysql-page.html`,
        "layoutFooter": `${layoutFooter}`,
    },
    pagesComponents: [
        { url: `${pagesComponents}/mysql/mysql-description.html`, target: '[data-component-page="mysqlDescription"]' },
        { url: `${pagesComponents}/mysql/mysql-demo.html`, target: '[data-component-page="mysqlDemo"]' },
    ],
    MarkdownShikiHtml: [
        {
            fileName: 'mysql-page-html.html',
            fileExtension: 'html',
            urlInput: `${pages}/mysql/mysql-page.html`,
            urlOutput: `${MarkdownShikiHtml}/pages/mysql`,
            target: '[data-shiki="codeHtml"]',
        },
        {
            fileName: 'mysql-page-css.html',
            fileExtension: 'css',
            urlInput: `${styles}/mysql-page.css`,
            urlOutput: `${MarkdownShikiHtml}/pages/mysql`,
            target: '[data-shiki="codeCss"]',
        },
        {
            fileName: 'mysql-page-scss.html',
            fileExtension: 'scss',
            urlInput: `${scssPages}/mysql-page.scss`,
            urlOutput: `${MarkdownShikiHtml}/pages/mysql`,
            target: '[data-shiki="codeScss"]',
        },
        {
            fileName: 'mysql-page.cjs-js.html',
            fileExtension: 'js',
            urlInput: `${scripts}/js/pages/mysql-page.cjs.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/mysql`,
            target: '[data-shiki="codeCjsJs"]',
        },
        {
            fileName: 'mysql-page.esm-js.html',
            fileExtension: 'js',
            urlInput: `${scripts}/js/pages/mysql-page.esm.js`,
            urlOutput: `${MarkdownShikiHtml}/pages/mysql`,
            target: '[data-shiki="codeEsmJs"]',
        },
    ],
    headerTitle: 'MySQL — Consultas a la base de datos',
    styles: [
        { href: `${styles}/mysql-page.css` }
    ],
    scripts: [
        { src: `${scripts}/js/pages/mysql-page.cjs.js` },
        { src: `${scripts}/js/pages/mysql-page.esm.js`, isModule: true, exportFunctionName: 'mount' },
    ]
};
