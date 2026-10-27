// @ts-nocheck
/*
    *  --------------------------------------------------------------------------------------  *
    *  -----  javascript-page.cjs.js  --  /src/scripts/js/pages/javascript-page.cjs.js  -----  *
    *  --------------------------------------------------------------------------------------  *
*/

/*
    Script CommonJS (IIFE) — Utilidades JavaScript para la página.
    Renderiza contenido en javascript-demo.html tras la carga del plugin SPA V5.
*/


/**
 * ---------------------------
 * -----  `PageFeature`  -----
 * ---------------------------
 * - Característica demo renderizada por CJS.
 * @typedef {Object} PageFeature
 * @property {string} icon - Icono de la tarjeta.
 * @property {string} title - Título de la tarjeta.
 * @property {string} text - Texto descriptivo de la tarjeta.
 */



//  -----  ejecutar el script como iife (commonjs clásico) al cargarse  -----
(() => {

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');

    //  -----  avisar en consola de que el script cjs se ha cargado  -----
    console.warn('-----  javascript-page.cjs.js  -----  CommonJS (IIFE)  -----');

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');


    /*
        *  ------------------------  *
        *  -----  Constantes  -----  *
        *  ------------------------  *
    */

    /** - `versión del script` */
    const VERSION = '1.0.0';

    /** - `nombre del plugin SPA` */
    const PLUGIN = 'spa-loader-content-html v5';

    /** @type {PageFeature[]} - `características demo renderizadas por CJS` */
    const PAGE_FEATURES = [
                {
                        "icon": "🔒",
                        "title": "Closures",
                        "text": "Estado privado con funciones anidadas en patrón IIFE clásico."
                },
                {
                        "icon": "📣",
                        "title": "EventEmitter",
                        "text": "Patrón módulo con prototipos para suscribir y emitir eventos."
                },
                {
                        "icon": "📦",
                        "title": "Script clásico (IIFE)",
                        "text": "Demostración CJS tras applyRouteMetaAsync del plugin."
                }
        ];


    /*
        *  ----------------------------  *
        *  -----  Utilidades DOM  -----  *
        *  ----------------------------  *
    */


    /**
     * --------------------------------
     * -----  `createText(text)`  -----
     * --------------------------------
     * - Crea un nodo de texto seguro.
     * @param {string} text - Texto del nodo.
     * @return {Text} - Nodo de texto creado.
     */
    const createText = (text) => document.createTextNode(text);



    /**
     * -----------------------------------------------
     * -----  `createElement(tag, attrs, text)`  -----
     * -----------------------------------------------
     * - Crea un elemento con atributos y contenido opcional.
     * @param {string} tag - Nombre del elemento.
     * @param {Record<string, string>} [attrs] - Atributos del elemento.
     * @param {string} [text] - Contenido del elemento.
     * @return {HTMLElement} - Elemento creado.
     */
    const createElement = (tag, attrs, text) => {

        /** - `elemento creado` */
        const el = document.createElement(tag);

        //  -----  si hay atributos, aplicarlos al elemento  -----
        if (attrs) {
            //  -----  recorrer cada atributo recibido  -----
            Object.keys(attrs).forEach((key) => {
                //  -----  asignar el atributo al elemento  -----
                el.setAttribute(key, attrs[key]);
            });
        }

        //  -----  si hay texto, añadirlo al elemento  -----
        if (text) {
            //  -----  añadir el nodo de texto al elemento  -----
            el.appendChild(createText(text));
        }

        //  -----  devolver el elemento creado  -----
        return el;
    };




    /**
     * ------------------------------------------
     * -----  `createFeatureCard(feature)`  -----
     * ------------------------------------------
     * - Crea una tarjeta de feature con el markup del demo.
     * @param {PageFeature} feature - Característica a renderizar.
     * @return {HTMLElement} - Tarjeta de feature creada.
     */
    const createFeatureCard = (feature) => {

        /** - `tarjeta de feature creada` */
        const article = createElement('article', { class: 'js-page__feature' });

        //  -----  añadir el icono a la tarjeta  -----
        article.appendChild(createElement('span', { class: 'js-page__feature-icon', 'aria-hidden': 'true' }, feature.icon));

        //  -----  añadir el título a la tarjeta  -----
        article.appendChild(createElement('h4', { class: 'js-page__feature-title' }, feature.title));

        //  -----  añadir el texto a la tarjeta  -----
        article.appendChild(createElement('p', { class: 'js-page__feature-text' }, feature.text));

        //  -----  devolver la tarjeta creada  -----
        return article;
    };



    /**
     * -----------------------------------------
     * -----  `createIslandCounterCard()`  -----
     * -----------------------------------------
     * - Crea la tarjeta interactiva con contador.
     * @return {HTMLElement} - Tarjeta interactiva creada.
     */
    const createIslandCounterCard = () => {

        /** - `contador de clicks` */
        let count = 0;

        /** @type {HTMLArticleElement} - `tarjeta interactiva creada` */
        const article = createElement('article', { class: 'js-page__feature' });

        /** @type {HTMLStrongElement} - `salida de texto del contador` */
        const output = createElement('strong', { class: 'js-page__feature-title' }, '0');

        /** @type {HTMLButtonElement} - `botón de incremento` */
        const button = createElement('button', {
            type: 'button',
            class: 'js-page__tag',
            'aria-label': 'Incrementar contador de la isla CJS',
        }, 'Click — CJS');

        //  -----  al hacer click, incrementar el contador y mostrarlo  -----
        button.addEventListener('click', () => {
            //  -----  sumar uno al contador  -----
            count += 1;

            //  -----  mostrar el valor del contador en la salida  -----
            output.textContent = String(count);
        });

        //  -----  añadir el icono a la tarjeta interactiva  -----
        article.appendChild(createElement('span', { class: 'js-page__feature-icon', 'aria-hidden': 'true' }, '🧩'));

        //  -----  añadir el título a la tarjeta interactiva  -----
        article.appendChild(createElement('h4', { class: 'js-page__feature-title' }, 'Isla interactiva CJS'));

        //  -----  añadir el texto a la tarjeta interactiva  -----
        article.appendChild(createElement('p', { class: 'js-page__feature-text' }, 'Contador con closure encapsulado — patrón clásico pre-ESM.'));

        /** @type {HTMLParagraphElement} - `línea de texto de clicks` */
        const clicksLine = createElement('p', { class: 'js-page__feature-text' });

        //  -----  añadir la etiqueta de clicks a la línea de texto  -----
        clicksLine.appendChild(createText('Clicks: '));

        //  -----  añadir la salida del contador a la línea de texto  -----
        clicksLine.appendChild(output);

        //  -----  añadir la línea de clicks a la tarjeta  -----
        article.appendChild(clicksLine);

        //  -----  añadir el botón a la tarjeta  -----
        article.appendChild(button);

        //  -----  devolver la tarjeta interactiva  -----
        return article;
    };



    /**
     * --------------------------------------------
     * -----  `setStatus(statusEl, message)`  -----
     * --------------------------------------------
     * - Actualiza el mensaje de estado del bloque CJS.
     * @param {Element|null} statusEl - Elemento de estado.
     * @param {string} message - Mensaje de estado.
     * @return {void}
     */
    const setStatus = (statusEl, message) => {

        //  -----  si no hay elemento de estado, no hacer nada  -----
        if (!statusEl)
            //  -----  salir de la función  -----
            return;

        //  -----  escribir el mensaje en el elemento de estado  -----
        statusEl.textContent = message;
    };



    /**
     * -----------------------------------
     * -----  `renderPageDemoCjs()`  -----
     * -----------------------------------
     * - Renderiza las tarjetas CJS en el demo de la página.
     * @return {void}
     */
    const renderPageDemoCjs = () => {

        /** - `contenedor de las tarjetas CJS` */
        const target = document.querySelector('[data-js-demo-target="cjs"]');

        /** - `elemento de estado` */
        const status = document.querySelector('[data-js-demo-status="cjs"]');

        //  -----  si no existe el contenedor, avisar y salir  -----
        if (!target) {
            //  -----  avisar en consola de que falta el contenedor  -----
            console.warn('⚠️ javascript-page.cjs.js: contenedor [data-js-demo-target="cjs"] no encontrado.');

            //  -----  salir de la función  -----
            return;
        }

        /** - `fragmento de documento para insertar las tarjetas CJS` */
        const fragment = document.createDocumentFragment();

        //  -----  recorrer las características demo  -----
        PAGE_FEATURES.forEach((feature) => {
            //  -----  añadir la tarjeta de cada característica al fragmento  -----
            fragment.appendChild(createFeatureCard(feature));
        });

        //  -----  añadir la tarjeta interactiva al fragmento  -----
        fragment.appendChild(createIslandCounterCard());

        //  -----  sustituir el contenido del contenedor por el fragmento  -----
        target.replaceChildren(fragment);

        //  -----  mostrar el mensaje de estado del renderizado  -----
        setStatus(
            status,
            `Renderizado con javascript-page.cjs.js (IIFE) · ${PLUGIN} · v${VERSION} · ${new Date().toLocaleTimeString()}`
        );

        //  -----  avisar en consola de que el dom se ha renderizado  -----
        console.log('-----  javascript-page.cjs.js — DOM renderizado en javascript-demo  -----');

        //  -----  mostrar el número de tarjetas renderizadas  -----
        console.log('Tarjetas CJS:', PAGE_FEATURES.length + 1);
    };


    //  -----  renderizar el demo cjs  -----
    renderPageDemoCjs();

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');

})();
