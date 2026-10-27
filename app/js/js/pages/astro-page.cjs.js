// @ts-nocheck
/*
    *  ----------------------------------------------------------------------------  *
    *  -----  astro-page.cjs.js  --  /src/scripts/js/pages/astro-page.cjs.js  -----  *
    *  ----------------------------------------------------------------------------  *
*/

/*
    Script CommonJS (IIFE) — Utilidades Astro para la página.
    Renderiza contenido en astro-demo.html tras la carga del plugin SPA V5.
*/


/**
 * ----------------------------
 * -----  `AstroFeature`  -----
 * ----------------------------
 * - Característica demo renderizada por CJS.
 * @typedef {Object} AstroFeature
 * @property {string} icon - Icono de la tarjeta.
 * @property {string} title - Título de la tarjeta.
 * @property {string} text - Texto descriptivo de la tarjeta.
 */



//  -----  ejecutar el script como iife (commonjs clásico) al cargarse  -----
(() => {

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');

    //  -----  avisar en consola de que el script cjs se ha cargado  -----
    console.warn('-----  astro-page.cjs.js  -----  CommonJS (IIFE)  -----');

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

    /** @type {AstroFeature[]} - `características demo renderizadas por CJS` */
    const ASTRO_FEATURES = [
        {
            icon: '🏝️',
            title: 'Islands Architecture',
            text: 'Hidrata solo los componentes interactivos. El resto del HTML permanece estático, como en Astro.',
        },
        {
            icon: '⚡',
            title: 'Zero JavaScript',
            text: 'Por defecto Astro no envía JS al navegador. Aquí el script CJS se carga solo en esta ruta.',
        },
        {
            icon: '📦',
            title: 'Script clásico (IIFE)',
            text: 'Patrón CommonJS con closure: se ejecuta tras applyRouteMetaAsync cuando el DOM ya está listo.',
        },
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
     * @return {HTMLElement} - Elemento creado
     */

    const createElement = (tag, attrs, text) => {

        /** - `elemento creado` */
        const el = document.createElement(tag);

        //  -----  asignar atributos  -----
        if (attrs) {
            //  -----  recorrer cada atributo recibido  -----
            Object.keys(attrs).forEach((key) => {
                //  -----  asignar el atributo al elemento  -----
                el.setAttribute(key, attrs[key]);
            });
        }

        //  -----  agregar contenido  -----
        if (text) {
            //  -----  añadir el nodo de texto al elemento  -----
            el.appendChild(createText(text));
        }

        //  -----  retornar el elemento creado  -----
        return el;
    };




    /**
     * ------------------------------------------
     * -----  `createFeatureCard(feature)`  -----
     * ------------------------------------------
     * - Crea una tarjeta de feature con el markup del componente Astro demo.
     * @param {AstroFeature} feature - Característica a renderizar.
     * @return {HTMLElement} - Tarjeta de feature creada
     */

    const createFeatureCard = (feature) => {

        /** - `tarjeta de feature creada` */
        const article = createElement('article', { class: 'astro-page__feature' });

        //  -----  agregar contenido  -----
        article.appendChild(createElement('span', { class: 'astro-page__feature-icon', 'aria-hidden': 'true' }, feature.icon));

        //  -----  añadir el título a la tarjeta  -----
        article.appendChild(createElement('h4', { class: 'astro-page__feature-title' }, feature.title));

        //  -----  añadir el texto a la tarjeta  -----
        article.appendChild(createElement('p', { class: 'astro-page__feature-text' }, feature.text));

        //  -----  retornar la tarjeta de feature creada  -----
        return article;
    };



    /**
     * -----------------------------------------
     * -----  `createIslandCounterCard()`  -----
     * -----------------------------------------
     * - Crea la tarjeta interactiva tipo “island” con contador.
     * @return {HTMLElement} - Tarjeta interactiva tipo “island” con contador creada.
     */

    const createIslandCounterCard = () => {

        /** - `contador de clicks` */
        let count = 0;


        /** @type {HTMLArticleElement} - `tarjeta interactiva tipo “island” con contador creada` */
        const article = createElement('article', { class: 'astro-page__feature' });

        /** @type {HTMLStrongElement} - `salida de texto del contador` */
        const output = createElement('strong', { class: 'astro-page__feature-title' }, '0');

        /** @type {HTMLButtonElement} - `botón de incremento` */
        const button = createElement('button', {
            type: 'button',
            class: 'astro-page__concept',
            'aria-label': 'Incrementar contador de la isla CJS',
        }, 'client:load — Click');


        //  -----  agregar evento de click  -----
        button.addEventListener('click', () => {
            //  -----  sumar uno al contador  -----
            count += 1;

            //  -----  mostrar el valor del contador en la salida  -----
            output.textContent = String(count);
        });


        //  -----  agregar contenido  -----
        article.appendChild(createElement('span', { class: 'astro-page__feature-icon', 'aria-hidden': 'true' }, '🧩'));

        //  -----  añadir el título a la tarjeta interactiva  -----
        article.appendChild(createElement('h4', { class: 'astro-page__feature-title' }, 'Isla interactiva CJS'));

        //  -----  añadir el texto a la tarjeta interactiva  -----
        article.appendChild(createElement('p', { class: 'astro-page__feature-text' }, 'Simula client:load con un contador hidratado por el script clásico.'));

        /** @type {HTMLParagraphElement} - `línea de texto de clicks` */
        const clicksLine = createElement('p', { class: 'astro-page__feature-text' });

        //  -----  agregar contenido  -----
        clicksLine.appendChild(createText('Clicks: '));

        //  -----  añadir la salida del contador a la línea de texto  -----
        clicksLine.appendChild(output);

        //  -----  añadir la línea de clicks a la tarjeta  -----
        article.appendChild(clicksLine);

        //  -----  añadir el botón a la tarjeta  -----
        article.appendChild(button);

        //  -----  retornar la tarjeta interactiva tipo “island” con contador creada  -----
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

        //  -----  si el elemento de estado no existe, retornar  -----
        if (!statusEl)
            //  -----  salir de la función  -----
            return;

        //  -----  actualizar el contenido del elemento de estado  -----
        statusEl.textContent = message;
    }



    /**
     * ------------------------------------
     * -----  `renderAstroDemoCjs()`  -----
     * ------------------------------------
     * - Renderiza las tarjetas CJS en el demo de la página.
     * @return {void}
     */

    const renderAstroDemoCjs = () => {

        /** - `contenedor de las tarjetas CJS` */
        const target = document.querySelector('[data-astro-demo-target="cjs"]');

        /** - `elemento de estado` */
        const status = document.querySelector('[data-astro-demo-status="cjs"]');

        //  -----  si el contenedor de las tarjetas CJS no existe, retornar  -----
        if (!target) {
            //  -----  avisar en consola de que falta el contenedor  -----
            console.warn('⚠️ astro-page.cjs.js: contenedor [data-astro-demo-target="cjs"] no encontrado.');

            //  -----  salir de la función  -----
            return;
        }


        /** - `fragmento de documento para insertar las tarjetas CJS` */
        const fragment = document.createDocumentFragment();

        //  -----  agregar las tarjetas de características  -----
        ASTRO_FEATURES.forEach((feature) => {
            //  -----  añadir la tarjeta de cada característica al fragmento  -----
            fragment.appendChild(createFeatureCard(feature));
        });

        //  -----  agregar la tarjeta interactiva tipo “island” con contador  -----
        fragment.appendChild(createIslandCounterCard());

        //  -----  reemplazar el contenido del contenedor de las tarjetas CJS  -----
        target.replaceChildren(fragment);

        //  -----  actualizar el mensaje de estado  -----
        setStatus(
            status,
            `Renderizado con astro-page.cjs.js (IIFE) · ${PLUGIN} · v${VERSION} · ${new Date().toLocaleTimeString()}`
        );

        //  -----  avisar en consola de que el dom se ha renderizado  -----
        console.log('-----  astro-page.cjs.js — DOM renderizado en astro-demo  -----');

        //  -----  mostrar el número de tarjetas renderizadas  -----
        console.log('Tarjetas CJS:', ASTRO_FEATURES.length + 1);

    };


    //  -----  renderizar las tarjetas CJS  -----
    renderAstroDemoCjs();

    //  -----  dejar una línea en blanco en consola  -----
    console.log('\n');

})();
