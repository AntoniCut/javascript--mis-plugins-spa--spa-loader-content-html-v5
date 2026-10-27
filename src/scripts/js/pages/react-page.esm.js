/*
    *  ----------------------------------------------------------------------------  *
    *  -----  react-page.esm.js  --  /src/scripts/js/pages/react-page.esm.js  -----  *
    *  ----------------------------------------------------------------------------  *
*/

/*
    Script ESM (ES Modules) — Utilidades React exportadas como módulo nativo.
    Renderiza contenido en react-demo.html tras la carga del plugin SPA V5.
*/


/**
 * ---------------------------
 * -----  `PageFeature`  -----
 * ---------------------------
 * - Características demo renderizadas por ESM.
 * @typedef {Object} PageFeature
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

/** - `etiquetas / conceptos renderizados por ESM` */
export const PAGE_TAGS = Object.freeze([
    "useState",
    "useEffect",
    "useContext",
    "useReducer",
    "useCallback",
    "useMemo",
    "useRef",
    "useLayoutEffect",
    "useId",
    "useTransition"
]);

/** - `características demo renderizadas por ESM` */
export const PAGE_ESM_FEATURES = Object.freeze([
    {
        "icon": "🧬",
        "title": "Virtual DOM",
        "text": "Conceptos React exportados como módulo ES nativo."
    },
    {
        "icon": "🔄",
        "title": "Fase 3 del plugin",
        "text": "Scripts de ruta ejecutados secuencialmente post-transición."
    },
    {
        "icon": "📡",
        "title": "Evento spa:route-loaded",
        "text": "Tarjeta de integración con el plugin SPA V5."
    }
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
 * @param {PageFeature} feature - Característica a renderizar
 * @return {HTMLElement} - Tarjeta de feature creada
 */
export const createFeatureArticle = ({ icon, title, text }) => {

    /** @type {HTMLArticleElement} - `tarjeta de feature creada` */
    const article = document.createElement('article');

    //  -----  asignar la clase css de la tarjeta  -----
    article.className = 'react-page__feature';

    //  -----  escribir el markup interno de la tarjeta  -----
    article.innerHTML = `
        <span class="react-page__feature-icon" aria-hidden="true">${icon}</span>
        <h4 class="react-page__feature-title">${title}</h4>
        <p class="react-page__feature-text">${text}</p>
    `;

    //  -----  devolver la tarjeta creada  -----
    return article;
};



/**
 * ------------------------------------
 * -----  `createTagItem(label)`  -----
 * ------------------------------------
 * - Crea un ítem de lista para tags o conceptos.
 * @param {string} label - Texto del ítem
 * @return {HTMLLIElement} - Ítem de lista creado
 */
export const createTagItem = (label) => {

    /** @type {HTMLLIElement} - `ítem de lista creado` */
    const item = document.createElement('li');

    //  -----  asignar la clase css del ítem  -----
    item.className = 'react-page__concept';

    //  -----  escribir el texto del ítem  -----
    item.textContent = label;

    //  -----  asignar el título del ítem  -----
    item.title = label;

    //  -----  devolver el ítem de lista creado  -----
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

    //  -----  si no hay elemento de estado, no hacer nada  -----
    if (!statusEl)
        //  -----  salir de la función  -----
        return;

    //  -----  escribir el mensaje en el elemento de estado  -----
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

    //  -----  asignar la clase css de la tarjeta  -----
    article.className = 'react-page__feature';

    /** @type {HTMLParagraphElement} - `salida de texto del evento` */
    const output = document.createElement('p');

    //  -----  asignar la clase css de la salida de texto  -----
    output.className = 'react-page__feature-text';

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

        //  -----  mostrar la ruta activa recibida en el evento  -----
        output.innerHTML = `Evento recibido: ruta activa <code>${routeId}</code>`;
    };

    //  -----  escuchar el evento spa:route-loaded una sola vez  -----
    document.addEventListener('spa:route-loaded', onRouteLoaded, { once: true });

    //  -----  escribir el markup interno de la tarjeta  -----
    article.innerHTML = `
        <span class="react-page__feature-icon" aria-hidden="true">📡</span>
        <h4 class="react-page__feature-title">Integración SPA</h4>
    `;

    //  -----  añadir la salida de texto a la tarjeta  -----
    article.appendChild(output);

    //  -----  devolver la tarjeta creada  -----
    return article;
};



/**
 * -----------------------------------
 * -----  `renderPageDemoEsm()`  -----
 * -----------------------------------
 * - Renderiza las tarjetas ESM en react-demo.html.
 * @return {void}
 */
export const renderPageDemoEsm = () => {

    /** - `contenedor de las tarjetas ESM` */
    const target = document.querySelector('[data-react-demo-target="esm"]');

    /** - `elemento de estado` */
    const status = document.querySelector('[data-react-demo-status="esm"]');

    //  -----  si no existe el contenedor, avisar y salir  -----
    if (!target) {
        //  -----  avisar en consola de que falta el contenedor  -----
        console.warn('⚠️ react-page.esm.js: contenedor [data-react-demo-target="esm"] no encontrado.');

        //  -----  salir de la función  -----
        return;
    }

    /** - `fragmento de documento para insertar las tarjetas ESM` */
    const fragment = document.createDocumentFragment();

    //  -----  recorrer las características demo  -----
    PAGE_ESM_FEATURES.forEach((feature) => {
        //  -----  añadir la tarjeta de cada característica al fragmento  -----
        fragment.appendChild(createFeatureArticle(feature));
    });

    //  -----  añadir la tarjeta de integración spa al fragmento  -----
    fragment.appendChild(createRouteLoadedCard());

    //  -----  sustituir el contenido del contenedor por el fragmento  -----
    target.replaceChildren(fragment);

    //  -----  mostrar el mensaje de estado del renderizado  -----
    setDemoStatus(
        status,
        `Renderizado con react-page.esm.js (ESM) · ${PLUGIN_NAME} v${PLUGIN_VERSION} · v${VERSION} · ${new Date().toLocaleTimeString()}`
    );

    //  -----  avisar en consola de que el módulo esm se ha renderizado  -----
    console.warn('-----  react-page.esm.js  -----  ES Module  -----');

    //  -----  mostrar el número de tarjetas renderizadas  -----
    console.log('Tarjetas ESM:', PAGE_ESM_FEATURES.length + 1);
};



/**
 * --------------------------------
 * -----  `renderPageTags()`  -----
 * --------------------------------
 * - Renderiza tags o conceptos en la lista del demo.
 * @return {void}
 */
export const renderPageTags = () => {

    /** - `contenedor de tags / conceptos` */
    const target = document.querySelector('[data-react-demo-target="tags"]');

    //  -----  si no existe el contenedor, avisar y salir  -----
    if (!target) {
        //  -----  avisar en consola de que falta el contenedor  -----
        console.warn('⚠️ react-page.esm.js: contenedor [data-react-demo-target="tags"] no encontrado.');

        //  -----  salir de la función  -----
        return;
    }

    /** - `fragmento de documento para insertar los ítems` */
    const fragment = document.createDocumentFragment();

    //  -----  recorrer los elementos de la lista  -----
    PAGE_TAGS.forEach((label) => {
        //  -----  añadir el ítem de cada elemento al fragmento  -----
        fragment.appendChild(createTagItem(label));
    });

    //  -----  sustituir el contenido del contenedor por el fragmento  -----
    target.replaceChildren(fragment);
};


//  -----  inicialización del demo (Fase 3 — DOM ya mutado)  -----
renderPageDemoEsm();

//  -----  renderizar los tags del demo  -----
renderPageTags();



//  -----  export default  -----

export default {
    VERSION,
    PLUGIN_NAME,
    PLUGIN_VERSION,
    PAGE_TAGS,
    PAGE_ESM_FEATURES,
    createFeatureArticle,
    createTagItem,
    setDemoStatus,
    renderPageDemoEsm,
    renderPageTags,
};
