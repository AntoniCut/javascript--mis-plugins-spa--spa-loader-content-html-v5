/*
    *  ------------------------------------------------  *
    *  -----  paths.js  --  /src/routes/paths.js  -----  *
    *  ------------------------------------------------  *
*/


import { base } from '../config/site-base.js';


/** - `base del proyecto: se reexporta desde src/config/site-base.js` */
export { base };


/**
 * ------------------------
 * -----  `paths {}`  -----
 * ------------------------
 * - `urls de las carpetas que usan las rutas (apuntan a app/, no a src/)`
 */
export const paths = {
    favicon: `${base}/assets/favicon`,
    layoutHeader: `${base}/app/components/layouts/layout-header.html`,
    layoutNavbar: `${base}/app/components/layouts/layout-navbar.html`,
    pages: `${base}/app/pages`,
    pagesComponents: `${base}/app/pages-components`,
    MarkdownShikiHtml: `${base}/app/markdown-shiki`,
    layoutFooter: `${base}/app/components/layouts/layout-footer.html`,
    styles: `${base}/app/css/pages`,
    scripts: `${base}/app/js`,
    scssPages: `${base}/src/scss/pages`,
    pluginsSource: `${base}/src/plugins`,
}
