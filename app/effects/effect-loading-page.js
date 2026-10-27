/*
    *  -----------------------------------------------------------------------------  *
    *  -----  effect-loading-page.js  --  /src/effects/effect-loading-page.js  -----  *
    *  -----------------------------------------------------------------------------  *
*/




/**
 * -----------------------------------
 * -----  `effectLoadingPage()`  -----
 * -----------------------------------
 * - Implementa un efecto de carga para la página web.
 * - Muestra un loader mientras se carga el contenido principal.
 * - Aplica transiciones suaves entre el loader y el contenido principal.
 * @return {void}
 */
export const effectLoadingPage = () => {

    /** @type {Window & { __spaFirstRouteLoaded?: boolean }} - `referencia al objeto window con la marca de primera ruta cargada` */
    const browserWindow = window;


    //  -----  separar el aviso con una línea en blanco  -----
    console.log('\n')

    //  -----  mostrar el nombre del archivo cargado  -----
    console.warn('-----  effect-loading-page.js  -----');

    //  -----  separar el aviso con una línea en blanco  -----
    console.log('\n');


    /**
     * -----------------------------------
     * -----  `whenDocumentReady()`  -----
     * -----------------------------------
     * - Espera a que el DOM esté listo antes de consultar nodos del layout.
     * @return {Promise<void>} - Promesa resuelta cuando el documento está listo.
     */
    const whenDocumentReady = () => {

        //  -----  si el documento ya no está cargando, resolver al instante  -----
        if (document.readyState !== 'loading')

            //  -----  devolver una promesa ya resuelta  -----
            return Promise.resolve();


        //  -----  si no, devolver una promesa que espera a DOMContentLoaded  -----
        return new Promise((resolve) => {

            //  -----  resolver cuando el DOM termine de cargar (una sola vez)  -----
            document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
        });
    };


    /**
     * ---------------------------------------------------------------------
     * -----  `waitForFirstSpaRouteLoaded({ timeoutMs = 6000 } = {})`  -----
     * ---------------------------------------------------------------------
     * - Espera la primera carga de ruta SPA y aplica fallback seguro por error o timeout.
     * - Escucha `spa:first-route-loaded` (flujo exitoso de carga inicial) y `spa:route-load-error` (error durante la carga inicial).
     * - Si no llega ninguno en el tiempo indicado, resuelve por timeout para no dejar el loader bloqueado indefinidamente.
     * @param {WaitForFirstSpaRouteLoadedOptions} [options={}] - Configuración de espera.
     * @return {Promise<void>} - Promesa resuelta cuando finaliza la espera (ok, error o timeout).
     */
    const waitForFirstSpaRouteLoaded = ({ timeoutMs = 6000 } = {}) => {

        //  -----  si ya se cargó la primera ruta spa, no es necesario esperar  -----
        if (browserWindow.__spaFirstRouteLoaded)

            //  -----  devolver una promesa ya resuelta  -----
            return Promise.resolve();


        //  -----  si no, esperar el evento o el timeout  -----
        return new Promise((resolve) => {

            /** - `indica si la promesa ya se resolvió` */
            let settled = false;


            /**
             * -----------------------------
             * -----  `resolveOnce()`  -----
             * -----------------------------
             * - Resuelve la promesa una sola vez.
             * @return {void}
             */
            const resolveOnce = () => {

                //  -----  si ya se resolvió, no hacer nada  -----
                if (settled)

                    //  -----  salir sin resolver de nuevo  -----
                    return;

                //  -----  marcar la promesa como resuelta  -----
                settled = true;

                //  -----  cancelar el timeout pendiente  -----
                clearTimeout(timeoutId);

                //  -----  resolver la promesa  -----
                resolve(undefined);
            };


            /**
             * ------------------------------------
             * -----  `onFirstRouteLoaded()`  -----
             * ------------------------------------
             * - Resuelve la espera cuando llega la primera ruta cargada.
             * @return {void}
             */
            const onFirstRouteLoaded = () => {

                //  -----  resolver la espera  -----
                resolveOnce();
            };


            /**
             * ----------------------------------
             * -----  `onRouteLoadError()`  -----
             * ----------------------------------
             * - Maneja errores en la carga inicial de la ruta SPA.
             * @param {Event} event - Evento de error de carga de ruta.
             * @return {void}
             */
            const onRouteLoadError = (event) => {

                //  -----  mostrar el error en consola  -----
                console.error('Error en carga inicial de ruta SPA:', event);

                //  -----  resolver la espera para no bloquear el loader  -----
                resolveOnce();
            };


            /** - `maneja el timeout de espera de la primera ruta SPA` */
            const timeoutId = setTimeout(() => {

                //  -----  avisar de que se agotó el tiempo de espera  -----
                console.warn(`Timeout esperando primera ruta SPA (${timeoutMs}ms). Se oculta el loader por fallback.`);

                //  -----  resolver la espera por fallback  -----
                resolveOnce();

            }, timeoutMs);

            //  -----  escuchar el evento de primera ruta cargada  -----
            document.addEventListener('spa:first-route-loaded', onFirstRouteLoaded, { once: true });

            //  -----  escuchar el evento de error de carga de ruta  -----
            document.addEventListener('spa:route-load-error', onRouteLoadError, { once: true });

        });

    };



    /**
     * -------------------------
     * -----  `delay(ms)`  -----
     * -------------------------
     * - Suspende la ejecución durante `ms` milisegundos.
     * @param {number} ms - Tiempo de espera en milisegundos.
     * @return {Promise<void>} - Promesa resuelta al finalizar la espera.
     */
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


    /**
     * ----------------------------------
     * -----  `runLoadingEffect()`  -----
     * ----------------------------------
     * - Ejecuta el flujo completo del loader inicial.
     * - Secuencia: espera DOM listo, obtiene `#loader` y `#layout`, espera la primera carga SPA (o fallback),
     *   aplica transiciones visuales (`fade-in`/`fade-out`) y elimina el loader al terminar su transición.
     * @return {Promise<void>} - Promesa del flujo de carga inicial.
     */
    const runLoadingEffect = async () => {

        //  -----  esperar a que el dom esté listo  -----
        await whenDocumentReady();

        /** @type {HTMLElement | null} - `contenedor del loader inicial` */
        const loader = document.querySelector('#loader');

        /** @type {HTMLElement | null} - `contenedor principal del layout` */
        const layout = document.querySelector('#layout');

        //  -----  si falta el loader o el layout, avisar y salir  -----
        if (!loader || !layout) {

            //  -----  mostrar el error en consola  -----
            console.error('Loader o layout no encontrado en el DOM');

            //  -----  salir del flujo  -----
            return;
        }

        //  -----  esperar la primera carga completa de componentes spa  -----
        await waitForFirstSpaRouteLoaded({ timeoutMs: 6000 });

        //  -----  mantener el loader 100ms adicionales antes de mostrar la web  -----
        await delay(100);

        //layout.style.display = 'flex';

        //  -----  mostrar el layout con la transición fade-in  -----
        requestAnimationFrame(() => layout.classList.add('fade-in'));

        //  -----  ocultar el loader con la transición fade-out  -----
        loader.classList.add('fade-out');

        //  -----  eliminar el loader del dom al terminar su transición  -----
        loader.addEventListener('transitionend', () => {

            //  -----  quitar el loader del dom  -----
            loader.remove();
        }, { once: true });

    };

    //  -----  ejecutar el flujo y controlar cualquier error  -----
    runLoadingEffect().catch((error) => {

        //  -----  mostrar el error en consola  -----
        console.error('Error en runLoadingEffect:', error);
    });

}
