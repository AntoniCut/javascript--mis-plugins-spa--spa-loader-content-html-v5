/*
    *  ------------------------------------------------------------------------  *
    *  -----  php-page.esm.js  --  /src/scripts/js/pages/php-page.esm.js  -----  *
    *  ------------------------------------------------------------------------  *
*/


/**
 * -----  Respuesta JSON de la validación  -----
 * @typedef {Object} PhpValidationResponse
 * @property {boolean} ok
 * @property {string} message
 * @property {Record<string, string>} [errors]
 * @property {{name?: string, email?: string, message?: string}} [data]
 * @property {string} [serverTime]
 * @property {string} [runtime]
 */



/**
 * ---------------------------------------------------
 * -----  `setStatus(status, message, isError)`  -----
 * ---------------------------------------------------
 * - Escribe el aviso del formulario.
 * @param {HTMLElement} status - Párrafo de estado.
 * @param {string} message - Texto del aviso.
 * @param {boolean} isError - Si el aviso es un fallo.
 * @return {void}
 */
const setStatus = (status, message, isError) => {

    //  -----  escribir el aviso  -----
    status.textContent = message;

    //  -----  marcar el aviso como error o como resultado  -----
    status.classList.toggle('is-error', isError);

};



/**
 * --------------------------------------------
 * -----  `setHttpBadge(badge, status)`  -----
 * --------------------------------------------
 * - Escribe el código HTTP en la insignia.
 * @param {HTMLElement} badge - Insignia del código HTTP.
 * @param {number|null} status - Código devuelto, o null sin respuesta.
 * @return {void}
 */
const setHttpBadge = (badge, status) => {

    //  -----  mostrar el código o un guion mientras no hay respuesta  -----
    badge.textContent = status === null ? 'HTTP —' : `HTTP ${status}`;

};



/**
 * ---------------------------------
 * -----  `clearErrors(form)`  -----
 * ---------------------------------
 * - Vacía los errores por campo y el estado inválido de los controles.
 * @param {HTMLFormElement} form - Formulario de la demo.
 * @return {void}
 */
const clearErrors = (form) => {

    /** @type {NodeListOf<Element>} - `avisos por campo` */
    const errorNodes = form.querySelectorAll('[data-error-for]');

    //  -----  vaciar cada aviso  -----
    for (const errorNode of errorNodes) {

        //  -----  quitar el texto del error  -----
        errorNode.textContent = '';

    }

    /** @type {NodeListOf<Element>} - `controles del formulario` */
    const controls = form.querySelectorAll('[name]');

    //  -----  quitar la marca de inválido de cada control  -----
    for (const control of controls) {

        //  -----  dejar el control como válido  -----
        control.removeAttribute('aria-invalid');

    }

};



/**
 * ------------------------------------------------
 * -----  `renderErrors(form, errors)`  -----
 * ------------------------------------------------
 * - Pinta el error de cada campo devuelto por PHP.
 * @param {HTMLFormElement} form - Formulario de la demo.
 * @param {Record<string, string>} errors - Errores por campo.
 * @return {void}
 */
const renderErrors = (form, errors) => {

    //  -----  recorrer cada campo con error  -----
    for (const [key, message] of Object.entries(errors)) {

        /** @type {HTMLElement|null} - `aviso del campo` */
        const errorNode = form.querySelector(`[data-error-for="${key}"]`);

        /** @type {Element|null} - `control del campo` */
        const field = form.elements.namedItem(key);

        //  -----  escribir el mensaje si existe el aviso  -----
        if (errorNode) {

            //  -----  mostrar el error del campo  -----
            errorNode.textContent = message;

        }

        //  -----  marcar el control como inválido  -----
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {

            //  -----  avisar al lector de pantalla  -----
            field.setAttribute('aria-invalid', 'true');

        }

    }

};



/**
 * --------------------------------------------
 * -----  `renderSuccess(result, body)`  -----
 * --------------------------------------------
 * - Pinta los datos normalizados en una lista de definiciones.
 * @param {HTMLElement} result - Contenedor del resultado.
 * @param {PhpValidationResponse} body - Respuesta correcta del servidor.
 * @return {void}
 */
const renderSuccess = (result, body) => {

    /** @type {HTMLDListElement} - `lista de datos normalizados` */
    const list = document.createElement('dl');

    //  -----  asignar la clase de la lista  -----
    list.className = 'php-page__result-list';

    /** @type {Array<[string, string]>} - `pares de etiqueta y valor` */
    const rows = [
        ['Nombre', body.data?.name ?? ''],
        ['Correo', body.data?.email ?? ''],
        ['Mensaje', body.data?.message ?? ''],
        ['serverTime', body.serverTime ?? ''],
        ['runtime', body.runtime ?? ''],
    ];

    //  -----  crear cada par de la lista  -----
    for (const [label, value] of rows) {

        /** @type {HTMLElement} - `término de la lista` */
        const term = document.createElement('dt');

        //  -----  escribir la etiqueta  -----
        term.textContent = label;

        /** @type {HTMLElement} - `valor de la lista` */
        const description = document.createElement('dd');

        //  -----  escribir el valor normalizado  -----
        description.textContent = value;

        //  -----  añadir la etiqueta y el valor  -----
        list.appendChild(term);
        list.appendChild(description);

    }

    //  -----  mostrar la lista  -----
    result.appendChild(list);

};



/**
 * ----------------------------------
 * -----  `submitForm(form)`  -----
 * ----------------------------------
 * - Envía el formulario a PHP y pinta la respuesta.
 * @param {HTMLFormElement} form - Formulario de la demo.
 * @return {Promise<void>}
 */
const submitForm = async (form) => {

    /** @type {HTMLElement|null} - `aviso del formulario` */
    const status = form.parentElement?.querySelector('[data-php-status]') ?? null;

    /** @type {HTMLElement|null} - `contenedor del resultado` */
    const result = form.parentElement?.querySelector('[data-php-result]') ?? null;

    /** @type {HTMLElement|null} - `insignia del código http` */
    const httpBadge = form.parentElement?.querySelector('[data-php-http]') ?? null;

    /** @type {HTMLElement|null} - `insignia del runtime` */
    const runtimeBadge = form.parentElement?.querySelector('[data-php-runtime]') ?? null;

    /** @type {HTMLInputElement|null} - `campo del nombre` */
    const nameField = form.querySelector('[name="name"]');

    /** @type {HTMLInputElement|null} - `campo del correo` */
    const emailField = form.querySelector('[name="email"]');

    /** @type {HTMLTextAreaElement|null} - `campo del mensaje` */
    const messageField = form.querySelector('[name="message"]');

    /** @type {HTMLButtonElement|null} - `botón de envío` */
    const button = form.querySelector('[type="submit"]');

    //  -----  salir si falta alguna pieza del formulario  -----
    if (!status || !result || !httpBadge || !runtimeBadge)
        //  -----  no hay destino para el resultado  -----
        return;

    //  -----  salir si falta algún campo o el botón  -----
    if (!(nameField instanceof HTMLInputElement) || !(emailField instanceof HTMLInputElement) || !(messageField instanceof HTMLTextAreaElement) || !(button instanceof HTMLButtonElement))
        //  -----  el formulario está incompleto  -----
        return;

    //  -----  vaciar los errores anteriores  -----
    clearErrors(form);

    //  -----  vaciar el resultado anterior  -----
    result.replaceChildren();

    //  -----  avisar de que el envío está en curso  -----
    setStatus(status, 'Enviando…', false);

    //  -----  reiniciar las insignias  -----
    setHttpBadge(httpBadge, null);
    runtimeBadge.textContent = 'runtime —';

    //  -----  bloquear el botón mientras responde el servidor  -----
    button.disabled = true;

    //  -----  intentar la petición  -----
    try {

        /** - `respuesta php, la misma en desarrollo y en nginx` */
        const response = await fetch('app/services/php/validate.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: nameField.value,
                email: emailField.value,
                message: messageField.value,
            }),
        });

        //  -----  mostrar el código http en la página  -----
        setHttpBadge(httpBadge, response.status);

        /** - `tipo declarado por el servidor` */
        const contentType = response.headers.get('content-type') || '';

        //  -----  si nginx devolvió html, no leerlo como json  -----
        if (!contentType.includes('application/json')) {

            //  -----  mostrar el código http en la página  -----
            setStatus(status, `El servidor respondió ${response.status} sin JSON. La validación no llegó a PHP.`, true);

            //  -----  no pintar un resultado  -----
            return;

        }

        /** @type {PhpValidationResponse} - `cuerpo json de la validación` */
        const body = await response.json();

        //  -----  mostrar los errores devueltos por el servidor  -----
        if (!body.ok) {

            //  -----  escribir el motivo  -----
            setStatus(status, body.message || 'No se pudo validar el formulario.', true);

            //  -----  pintar el error de cada campo  -----
            renderErrors(form, body.errors || {});

            //  -----  no pintar un resultado  -----
            return;

        }

        //  -----  escribir el mensaje de éxito  -----
        setStatus(status, body.message, false);

        //  -----  pintar los datos normalizados  -----
        renderSuccess(result, body);

        //  -----  mostrar el runtime que atendió la petición  -----
        runtimeBadge.textContent = body.runtime || 'PHP';

    }

    //  -----  si la petición no llega, avisar en la página  -----
    catch (error) {

        /** - `texto del fallo de red` */
        const message = error instanceof Error ? error.message : 'No se pudo contactar con el servidor.';

        //  -----  mostrar el fallo de red  -----
        setStatus(status, message, true);

    }

    //  -----  volver a permitir el envío  -----
    finally {

        //  -----  activar el botón  -----
        button.disabled = false;

    }

};



/**
 * -----------------------
 * -----  `mount()`  -----
 * -----------------------
 * - Enlaza el formulario cuando la ruta ya está en el DOM.
 * @return {void}
 */
export const mount = () => {

    /** @type {HTMLFormElement|null} - `formulario de la validación` */
    const form = document.querySelector('[data-php-form]');

    //  -----  salir si esta ruta no está montada  -----
    if (!(form instanceof HTMLFormElement))
        //  -----  no hay formulario  -----
        return;

    //  -----  no volver a enlazar el mismo formulario  -----
    if (form.dataset.bound === 'true')
        //  -----  el envío ya está enlazado  -----
        return;

    //  -----  marcar el formulario como enlazado  -----
    form.dataset.bound = 'true';

    //  -----  enviar el formulario sin recargar la SPA  -----
    form.addEventListener('submit', (event) => {

        //  -----  evitar el envío nativo del formulario  -----
        event.preventDefault();

        //  -----  lanzar la validación  -----
        void submitForm(form);

    });

    //  -----  limpiar el error del campo que se está editando  -----
    form.addEventListener('input', (event) => {

        /** - `control que disparó el evento` */
        const target = event.target;

        //  -----  ignorar lo que no sea un control de texto  -----
        if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement))
            //  -----  no hay campo que limpiar  -----
            return;

        /** - `nombre del campo editado` */
        const key = target.name;

        //  -----  ignorar controles sin nombre  -----
        if (key === '')
            //  -----  no hay error asociado  -----
            return;

        /** @type {HTMLElement|null} - `aviso del campo editado` */
        const errorNode = form.querySelector(`[data-error-for="${key}"]`);

        //  -----  vaciar el error del campo  -----
        if (errorNode) {

            //  -----  quitar el mensaje anterior  -----
            errorNode.textContent = '';

        }

        //  -----  retirar la marca de inválido  -----
        target.removeAttribute('aria-invalid');

    });

};
