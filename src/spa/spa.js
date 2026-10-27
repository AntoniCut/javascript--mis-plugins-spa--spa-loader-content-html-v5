/*
    *  -----------------------------------------  *
    *  -----  spa.js  --  /src/spa/spa.js  -----  *
    *  -----------------------------------------  *
*/


import { routeManifest } from '../routes/route-manifest.js';
import { spaLoaderContentHtml } from '../plugins/spa-loader-content-html/v5/spa-loader-content-html.js';
import { base } from '../config/site-base.js';



/**
 * ---------------------
 * -----  `spa()`  -----
 * ---------------------
 * - Función principal que `inicializa la SPA`.
 * - Utilizando el plugin spa-loader-content-html.js con un manifiesto de rutas para lazy loading.
 * @return {void}
 */
export const spa = () => {

    //  -----  avisar en consola de que el documento está cargado  -----
    console.log('\n');

    //  -----  mostrar el nombre del archivo cargado  -----
    console.warn('-----  spa.js - Cargado  -----');

    //  -----  separar el aviso con una línea en blanco  -----
    console.log('\n');


    /** @type {ConfigOptionsSPA} - `configuración para el plugin spa-loader-content-html.js (lazy loading con manifest)` */
    const configOptionsSpa = {
        routeManifest,
        routeModulesBase: `${base}/app/routes`,
        base,
    }


    //  -----  invocar el plugin spa-loader-content-html.js con la configuración  -----
    spaLoaderContentHtml(configOptionsSpa);

}
