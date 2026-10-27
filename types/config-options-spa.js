/*
    *  ---------------------------------------------------------------------  *
    *  -----  config-options-spa.js  --  /types/config-options-spa.js  -----  *
    *  ---------------------------------------------------------------------  *
*/

/** @typedef {import('./route-manifest.js').RouteManifest} RouteManifest */


//  -----  marcar el archivo como módulo para que vs code lo trate como tal  -----
export {};


/**
 * --------------------------------
 * -----  `ConfigOptionsSPA`  -----
 * --------------------------------
 * @typedef {Object} ConfigOptionsSPA - Objeto que define la configuracion que le pasamos al plugin `spaLoaderContentHtml`
 * @property {RouteManifest[]} [routeManifest] - Manifiesto ligero de rutas para lazy loading.
 * @property {string} [routeModulesBase] - Ruta base para importar dinamicamente los modulos de ruta.
 * @property {string} base - Ruta base de la aplicación (se deja vacía si no se usa `history.pushState` o hash routing).
 */
