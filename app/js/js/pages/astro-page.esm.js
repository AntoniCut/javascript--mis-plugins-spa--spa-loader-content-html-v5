/*
    *  ----------------------------------------------------------------------------  *
    *  -----  astro-page.esm.js  --  /src/scripts/js/pages/astro-page.esm.js  -----  *
    *  ----------------------------------------------------------------------------  *
*/

/*
    Script ESM (ES Modules) — Utilidades Astro exportadas como módulo nativo.
    Renderiza contenido en astro-demo.html tras la carga del plugin SPA V5.
*/


/**
 * ----------------------------
 * -----  `AstroFeature`  -----
 * ----------------------------
 * - Características demo renderizadas por ESM.
 * @typedef {Object} AstroFeature
 * @property {string} icon - Icono de la tarjeta.
 * @property {string} title - Título de la tarjeta.
 * @property {string} text - Texto descriptivo de la tarjeta.
 */


/**
 * ---------------------------------
 * -----  `RouteLoadedDetail`  -----
 * ---------------------------------
 * - Detalle del evento spa:route-loaded.
 * @typedef {Object} RouteLoadedDetail
 * @property {{ id?: string }} [route] - Ruta activa emitida por el plugin.
 */


/*
    *  -----------------------------------  *
    *  -----  Constantes exportadas  -----  *
    *  -----------------------------------  *
*/

/** - `versión del módulo` */
export const VERSION = '1.0.0';

/** - `nombre del plugin SPA` */
export const PLUGIN_NAME = 'spa-loader-content-html';

/** - `versión del plugin SPA usada en la demo` */
export const PLUGIN_VERSION = '3.1';

/** Directivas client:* de Astro */
export const CLIENT_DIRECTIVES = Object.freeze([
    'client:load',
    'client:idle',
    'client:visible',
    'client:media',
    'client:only',
]);


/** - `características demo renderizadas por ESM` */
export const ASTRO_ESM_FEATURES = Object.freeze([
    {
        icon: '🎯',
        title: 'ES Modules nativos',
        text: 'Este script se carga con <script type="module"> e import/export estándar.',
    },
    {
        icon: '🔄',
        title: 'Fase 3 del plugin',
        text: 'applyRouteMetaAsync ejecuta los scripts cuando pagesComponents ya inyectó astro-demo.html.',
    },
    {
        icon: '📡',
        title: 'Evento spa:route-loaded',
        text: 'El plugin emite spa:route-loaded al terminar. Escúchalo para inicializar lógica adicional.',
    },
]);



/*
    *  ----------------------------------  *
    *  -----  Funciones exportadas  -----  *
    *  ----------------------------------  *
*/


/**
 * -----------------------------------------------------------
 * -----  `createFeatureArticle({ icon, title, text })`  -----
 * -----------------------------------------------------------
 * - Crea una tarjeta de feature para el grid del demo.
 * @param {AstroFeature} feature - Característica a renderizar
 * @return {HTMLElement} - Tarjeta de feature creada
 */

export const createFeatureArticle = ({ icon, title, text }) => {

    /** @type {HTMLArticleElement} - `tarjeta de feature creada` */
    const article = document.createElement('article');

    //  -----  asignar la clase css de la tarjeta  -----
    article.className = 'astro-page__feature';

    //  -----  agregar contenido  -----
    article.innerHTML = `
        <span class="astro-page__feature-icon" aria-hidden="true">${icon}</span>
        <h4 class="astro-page__feature-title">${title}</h4>
        <p class="astro-page__feature-text">${text}</p>
    `;

    //  -----  retornar la tarjeta de feature creada  -----
    return article;
};



/**
 * ---------------------------------------------
 * -----  `createDirectiveTag(directive)`  -----
 * ---------------------------------------------
 * - Crea un ítem de lista para directivas client:*.
 * @param {string} directive - Directiva Astro a renderizar
 * @return {HTMLLIElement} - Ítem de lista creado
 */

export const createDirectiveTag = (directive) => {

    /** @type {HTMLLIElement} - `ítem de lista creado` */
    const item = document.createElement('li');

    //  -----  agregar atributos  -----
    item.className = 'astro-page__concept';

    //  -----  escribir el texto del ítem  -----
    item.textContent = directive;

    //  -----  asignar el título del ítem  -----
    item.title = `Directiva Astro ${directive}`;

    //  -----  retornar el ítem de lista creado  -----
    return item;

};



/**
 * ------------------------------------------------
 * -----  `setDemoStatus(statusEl, message)`  -----
 * ------------------------------------------------
 * - Actualiza el mensaje de estado del bloque ESM.
 * @param {Element|null} statusEl - Elemento de estado
 * @param {string} message - Mensaje de estado
 * @return {void}
 */

export const setDemoStatus = (statusEl, message) => {

    //  -----  si el elemento de estado no existe, retornar  -----
    if (!statusEl)
        //  -----  salir de la función  -----
        return;

    //  -----  actualizar el contenido del elemento de estado  -----
    statusEl.textContent = message;

};



/**
 * ---------------------------------------
 * -----  `createRouteLoadedCard()`  -----
 * ---------------------------------------
 * - Tarjeta que escucha spa:route-loaded y muestra el id de la ruta activa.
 * @return {HTMLElement} - Tarjeta de integración SPA creada
 */

const createRouteLoadedCard = () => {

    /** @type {HTMLArticleElement} - `tarjeta de integración SPA creada` */
    const article = document.createElement('article');

    //  -----  agregar atributos  -----
    article.className = 'astro-page__feature';

    /** @type {HTMLParagraphElement} - `salida de texto del evento` */
    const output = document.createElement('p');

    //  -----  agregar atributos  -----
    output.className = 'astro-page__feature-text';

    //  -----  mostrar el texto de espera del evento  -----
    output.innerHTML = 'Esperando evento <code>spa:route-loaded</code>…';


    /**
     * ------------------------------------
     * -----  `onRouteLoaded(event)`  -----
     * ------------------------------------
     * - Actualiza la tarjeta con el id de la ruta emitida por el plugin.
     * @param {Event} event - Evento spa:route-loaded
     * @return {void}
     */
    const onRouteLoaded = (event) => {

        /** @type {RouteLoadedDetail} - `detalle del evento spa:route-loaded` */
        const detail = /** @type {CustomEvent<RouteLoadedDetail>} */ (event).detail;

        /** @type {string} - `id de la ruta activa` */
        const routeId = detail?.route?.id ?? 'desconocida';

        //  -----  actualizar la salida de texto  -----
        output.innerHTML = `Evento recibido: ruta activa <code>${routeId}</code>`;
    };

    //  -----  suscribirse al evento spa:route-loaded (una sola vez)  -----
    document.addEventListener('spa:route-loaded', onRouteLoaded, { once: true });

    //  -----  agregar contenido  -----
    article.innerHTML = `
        <span class="astro-page__feature-icon" aria-hidden="true">📡</span>
        <h4 class="astro-page__feature-title">Integración SPA</h4>
    `;

    //  -----  agregar contenido  -----
    article.appendChild(output);

    //  -----  retornar la tarjeta de integración SPA creada  -----
    return article;

};



/**
 * ------------------------------------
 * -----  `renderAstroDemoEsm()`  -----
 * ------------------------------------
 * - Renderiza las tarjetas ESM en astro-demo.html.
 * @return {void}
 */

export const renderAstroDemoEsm = () => {

    /** - `contenedor de las tarjetas ESM` */
    const target = document.querySelector('[data-astro-demo-target="esm"]');

    /** - `elemento de estado` */
    const status = document.querySelector('[data-astro-demo-status="esm"]');

    //  -----  si el contenedor de las tarjetas ESM no existe, retornar  -----
    if (!target) {
        //  -----  avisar en consola de que falta el contenedor  -----
        console.warn('⚠️ astro-page.esm.js: contenedor [data-astro-demo-target="esm"] no encontrado.');

        //  -----  salir de la función  -----
        return;
    }

    /** - `fragmento de documento para insertar las tarjetas ESM` */
    const fragment = document.createDocumentFragment();

    //  -----  agregar las tarjetas de características  -----
    ASTRO_ESM_FEATURES.forEach((feature) => {
        //  -----  añadir la tarjeta de cada característica al fragmento  -----
        fragment.appendChild(createFeatureArticle(feature));
    });

    //  -----  agregar la tarjeta de integración SPA  -----
    fragment.appendChild(createRouteLoadedCard());

    //  -----  reemplazar el contenido del contenedor de las tarjetas ESM  -----
    target.replaceChildren(fragment);

    //  -----  actualizar el mensaje de estado  -----
    setDemoStatus(
        status,
        `Renderizado con astro-page.esm.js (ESM) · ${PLUGIN_NAME} v${PLUGIN_VERSION} · v${VERSION} · ${new Date().toLocaleTimeString()}`
    );

    //  -----  avisar en consola de que el módulo esm se ha renderizado  -----
    console.warn('-----  astro-page.esm.js  -----  ES Module  -----');

    //  -----  mostrar el número de tarjetas renderizadas  -----
    console.log('Tarjetas ESM:', ASTRO_ESM_FEATURES.length + 1);
};



/**
 * ----------------------------------------
 * -----  `renderClientDirectives()`  -----
 * ----------------------------------------
 * - Renderiza las directivas client:* en la lista del demo.
 * @return {void}
 */

export const renderClientDirectives = () => {

    /** - Contenedor de las directivas client:* */
    const target = document.querySelector('[data-astro-demo-target="directives"]');

    //  -----  si el contenedor de directivas no existe, retornar  -----
    if (!target) {
        //  -----  avisar en consola de que falta el contenedor  -----
        console.warn('⚠️ astro-page.esm.js: contenedor [data-astro-demo-target="directives"] no encontrado.');

        //  -----  salir de la función  -----
        return;
    }

    /** - `fragmento de documento para insertar las directivas` */
    const fragment = document.createDocumentFragment();

    //  -----  agregar cada directiva client:*  -----
    CLIENT_DIRECTIVES.forEach((directive) => {
        //  -----  añadir el ítem de cada elemento al fragmento  -----
        fragment.appendChild(createDirectiveTag(directive));
    });

    //  -----  reemplazar el contenido del contenedor de directivas  -----
    target.replaceChildren(fragment);
};


//  -----  inicialización del demo (Fase 3 — DOM ya mutado)  -----
renderAstroDemoEsm();

//  -----  renderizar las directivas client:*  -----
renderClientDirectives();



//  -----  export default  -----

export default {
    VERSION,
    PLUGIN_NAME,
    PLUGIN_VERSION,
    CLIENT_DIRECTIVES,
    ASTRO_ESM_FEATURES,
    createFeatureArticle,
    createDirectiveTag,
    setDemoStatus,
    renderAstroDemoEsm,
    renderClientDirectives,
};
