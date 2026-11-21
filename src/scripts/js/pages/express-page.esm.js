/*
    *  --------------------------------------------------------------------------------  *
    *  -----  express-page.esm.js  --  /src/scripts/js/pages/express-page.esm.js  -----  *
    *  --------------------------------------------------------------------------------  *
*/


/**
 * -----  Tarea devuelta por el API  -----
 * @typedef {Object} ExpressTask
 * @property {number} id
 * @property {string} title
 * @property {string} createdAt
 */


/**
 * -----  Respuesta del listado de tareas  -----
 * @typedef {Object} TasksListResponse
 * @property {boolean} ok
 * @property {ExpressTask[]} [tasks]
 * @property {number} [count]
 * @property {string} [message]
 * @property {{ title?: string }} [errors]
 */


/**
 * -----  Respuesta de crear o eliminar una tarea  -----
 * @typedef {Object} TaskMutationResponse
 * @property {boolean} ok
 * @property {ExpressTask} [task]
 * @property {number} [deletedId]
 * @property {string} [message]
 * @property {{ title?: string }} [errors]
 */


/**
 * -----  Referencias del demo  -----
 * @typedef {Object} ExpressUi
 * @property {HTMLFormElement} form
 * @property {HTMLInputElement} titleField
 * @property {HTMLButtonElement} submitButton
 * @property {HTMLButtonElement} refreshButton
 * @property {HTMLElement} fieldError
 * @property {HTMLElement} status
 * @property {HTMLElement} httpBadge
 * @property {HTMLElement} latencyBadge
 * @property {HTMLUListElement} list
 */



/**
 * -----------------------------------------------
 * -----  `setStatus(ui, message, isError)`  -----
 * -----------------------------------------------
 * - Escribe el aviso del demo.
 * @param {ExpressUi} ui - Referencias del demo.
 * @param {string} message - Texto del aviso.
 * @param {boolean} isError - Si el aviso es un fallo.
 * @return {void}
 */
const setStatus = (ui, message, isError) => {

    //  -----  escribir el aviso  -----
    ui.status.textContent = message;

    //  -----  marcar el aviso como error o como resultado  -----
    ui.status.classList.toggle('is-error', isError);

};



/**
 * ---------------------------------------
 * -----  `setBadges(ui, response)`  -----
 * ---------------------------------------
 * - Muestra el código HTTP y la cabecera del tiempo de respuesta.
 * @param {ExpressUi} ui - Referencias del demo.
 * @param {Response} response - Respuesta de fetch.
 * @return {void}
 */
const setBadges = (ui, response) => {

    //  -----  mostrar el código http de la respuesta  -----
    ui.httpBadge.textContent = `HTTP ${response.status}`;

    /** - `latencia declarada por el servidor` */
    const latency = response.headers.get('x-response-time');

    //  -----  mostrar la latencia o un guion si no vino  -----
    ui.latencyBadge.textContent = latency ? `X-Response-Time ${latency}` : 'X-Response-Time —';

};



/**
 * ----------------------------------
 * -----  `readJson(response)`  -----
 * ----------------------------------
 * - Lee el cuerpo solo cuando el servidor declara JSON.
 * @template T
 * @param {Response} response - Respuesta de fetch.
 * @return {Promise<T|null>} - Cuerpo JSON o null.
 */
const readJson = async (response) => {

    /** - `tipo declarado por el servidor` */
    const contentType = response.headers.get('content-type') || '';

    //  -----  si el servidor no declara json, no intentar parsearlo  -----
    if (!contentType.includes('application/json'))
        //  -----  no hay cuerpo json que leer  -----
        return null;

    //  -----  devolver el cuerpo ya parseado  -----
    return /** @type {T} */ (await response.json());

};



/**
 * --------------------------------------
 * -----  `renderTasks(ui, tasks)`  -----
 * --------------------------------------
 * - Pinta la lista de tareas con nodos del DOM.
 * @param {ExpressUi} ui - Referencias del demo.
 * @param {ExpressTask[]} tasks - Tareas devueltas por el API.
 * @return {void}
 */
const renderTasks = (ui, tasks) => {

    //  -----  vaciar la lista anterior  -----
    ui.list.replaceChildren();

    //  -----  avisar cuando no hay tareas  -----
    if (tasks.length === 0) {

        /** @type {HTMLLIElement} - `fila del estado vacío` */
        const empty = document.createElement('li');

        //  -----  asignar la clase del estado vacío  -----
        empty.className = 'express-page__empty';

        //  -----  escribir el aviso  -----
        empty.textContent = 'No hay tareas todavía.';

        //  -----  mostrar el estado vacío  -----
        ui.list.appendChild(empty);

        //  -----  no pintar filas  -----
        return;

    }

    //  -----  crear una fila por tarea  -----
    for (const task of tasks) {

        /** @type {HTMLLIElement} - `fila de la tarea` */
        const item = document.createElement('li');

        //  -----  asignar la clase de la fila  -----
        item.className = 'express-page__item';

        /** @type {HTMLSpanElement} - `título de la tarea` */
        const title = document.createElement('span');

        //  -----  asignar la clase del título  -----
        title.className = 'express-page__item-title';

        //  -----  escribir el título  -----
        title.textContent = task.title;

        /** @type {HTMLSpanElement} - `identificador de la tarea` */
        const identifier = document.createElement('span');

        //  -----  asignar la clase del identificador  -----
        identifier.className = 'express-page__item-id';

        //  -----  escribir el identificador  -----
        identifier.textContent = `#${task.id}`;

        /** @type {HTMLButtonElement} - `botón para eliminar la tarea` */
        const button = document.createElement('button');

        //  -----  evitar que el botón envíe formularios  -----
        button.type = 'button';

        //  -----  asignar la clase del botón  -----
        button.className = 'express-page__delete';

        //  -----  guardar el id en el botón  -----
        button.dataset.taskDelete = String(task.id);

        //  -----  describir el botón para lectores de pantalla  -----
        button.setAttribute('aria-label', `Eliminar la tarea «${task.title}»`);

        //  -----  escribir la etiqueta del botón  -----
        button.textContent = 'Eliminar';

        //  -----  añadir el título a la fila  -----
        item.appendChild(title);

        //  -----  añadir el identificador a la fila  -----
        item.appendChild(identifier);

        //  -----  añadir el botón a la fila  -----
        item.appendChild(button);

        //  -----  añadir la fila a la lista  -----
        ui.list.appendChild(item);

    }

};



/**
 * -----------------------------
 * -----  `loadTasks(ui)`  -----
 * -----------------------------
 * - Pide la lista al API y la pinta.
 * @param {ExpressUi} ui - Referencias del demo.
 * @return {Promise<void>}
 */
const loadTasks = async (ui) => {

    //  -----  bloquear el envío mientras dura la petición  -----
    ui.submitButton.disabled = true;

    //  -----  intentar leer la lista  -----
    try {

        /** - `respuesta del listado` */
        const response = await fetch('api/tasks');

        //  -----  mostrar el código y la latencia  -----
        setBadges(ui, response);

        /** @type {TasksListResponse|null} - `cuerpo del listado` */
        const body = await readJson(response);

        //  -----  avisar si la respuesta no trajo json  -----
        if (!body) {

            //  -----  mostrar el código sin cuerpo  -----
            setStatus(ui, `El servidor respondió ${response.status} sin JSON.`, true);

            //  -----  no pintar la lista  -----
            return;

        }

        //  -----  mostrar el fallo devuelto por el servidor  -----
        if (!body.ok) {

            //  -----  escribir el motivo  -----
            setStatus(ui, body.message || 'No se pudo cargar la lista.', true);

            //  -----  no pintar una lista vacía  -----
            return;

        }

        //  -----  pintar las tareas recibidas  -----
        renderTasks(ui, body.tasks || []);

        //  -----  escribir el recuento  -----
        setStatus(ui, body.message || 'Lista actualizada.', false);

    }

    //  -----  si la petición no llega, avisar en la página  -----
    catch (error) {

        /** - `texto del fallo de red` */
        const message = error instanceof Error ? error.message : 'No se pudo contactar con el servidor.';

        //  -----  mostrar el fallo de red  -----
        setStatus(ui, message, true);

    }

    //  -----  volver a permitir el envío  -----
    finally {

        //  -----  activar el botón  -----
        ui.submitButton.disabled = false;

    }

};



/**
 * ------------------------------
 * -----  `createTask(ui)`  -----
 * ------------------------------
 * - Envía el título al API y recarga la lista.
 * @param {ExpressUi} ui - Referencias del demo.
 * @return {Promise<void>}
 */
const createTask = async (ui) => {

    //  -----  limpiar el error anterior del campo  -----
    ui.fieldError.textContent = '';

    //  -----  bloquear el envío mientras dura la petición  -----
    ui.submitButton.disabled = true;

    //  -----  intentar crear la tarea  -----
    try {

        /** - `respuesta de la creación` */
        const response = await fetch('api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: ui.titleField.value,
            }),
        });

        //  -----  mostrar el código y la latencia  -----
        setBadges(ui, response);

        /** @type {TaskMutationResponse|null} - `cuerpo de la creación` */
        const body = await readJson(response);

        //  -----  avisar si la respuesta no trajo json  -----
        if (!body) {

            //  -----  mostrar el código sin cuerpo  -----
            setStatus(ui, `El servidor respondió ${response.status} sin JSON.`, true);

            //  -----  no recargar la lista  -----
            return;

        }

        //  -----  pintar el error de validación del campo  -----
        if (response.status === 422) {

            //  -----  escribir el error junto al campo  -----
            ui.fieldError.textContent = body.errors?.title || body.message || 'Revisá el título.';

            //  -----  avisar del rechazo en el estado  -----
            setStatus(ui, body.message || 'Revisá los campos marcados.', true);

            //  -----  no recargar la lista  -----
            return;

        }

        //  -----  mostrar el fallo devuelto por el servidor  -----
        if (!body.ok) {

            //  -----  escribir el motivo  -----
            setStatus(ui, body.message || 'No se pudo crear la tarea.', true);

            //  -----  no recargar la lista  -----
            return;

        }

        //  -----  vaciar el campo después de crear  -----
        ui.titleField.value = '';

        //  -----  recargar la lista con la tarea nueva  -----
        await loadTasks(ui);

        //  -----  recuperar el código y la latencia de la creación  -----
        setBadges(ui, response);

        //  -----  mostrar el mensaje de la creación, no el del listado  -----
        setStatus(ui, body.message || 'Tarea creada.', false);

    }

    //  -----  si la petición no llega, avisar en la página  -----
    catch (error) {

        /** - `texto del fallo de red` */
        const message = error instanceof Error ? error.message : 'No se pudo contactar con el servidor.';

        //  -----  mostrar el fallo de red  -----
        setStatus(ui, message, true);

    }

    //  -----  volver a permitir el envío  -----
    finally {

        //  -----  activar el botón  -----
        ui.submitButton.disabled = false;

    }

};



/**
 * ----------------------------------
 * -----  `deleteTask(ui, id)`  -----
 * ----------------------------------
 * - Elimina una tarea y recarga la lista.
 * @param {ExpressUi} ui - Referencias del demo.
 * @param {number} id - Identificador de la tarea.
 * @return {Promise<void>}
 */
const deleteTask = async (ui, id) => {

    //  -----  bloquear el envío mientras dura la petición  -----
    ui.submitButton.disabled = true;

    //  -----  intentar eliminar la tarea  -----
    try {

        /** - `respuesta de la eliminación` */
        const response = await fetch(`api/tasks/${id}`, {
            method: 'DELETE',
        });

        //  -----  mostrar el código y la latencia  -----
        setBadges(ui, response);

        /** @type {TaskMutationResponse|null} - `cuerpo de la eliminación` */
        const body = await readJson(response);

        //  -----  avisar si la respuesta no trajo json  -----
        if (!body) {

            //  -----  mostrar el código sin cuerpo  -----
            setStatus(ui, `El servidor respondió ${response.status} sin JSON.`, true);

            //  -----  no recargar la lista  -----
            return;

        }

        //  -----  mostrar el fallo devuelto por el servidor  -----
        if (!body.ok) {

            //  -----  escribir el motivo  -----
            setStatus(ui, body.message || 'No se pudo eliminar la tarea.', true);

            //  -----  no recargar la lista  -----
            return;

        }

        //  -----  recargar la lista sin la tarea eliminada  -----
        await loadTasks(ui);

        //  -----  recuperar el código y la latencia de la eliminación  -----
        setBadges(ui, response);

        //  -----  mostrar el mensaje de la eliminación, no el del listado  -----
        setStatus(ui, body.message || 'Tarea eliminada.', false);

    }

    //  -----  si la petición no llega, avisar en la página  -----
    catch (error) {

        /** - `texto del fallo de red` */
        const message = error instanceof Error ? error.message : 'No se pudo contactar con el servidor.';

        //  -----  mostrar el fallo de red  -----
        setStatus(ui, message, true);

    }

    //  -----  volver a permitir el envío  -----
    finally {

        //  -----  activar el botón  -----
        ui.submitButton.disabled = false;

    }

};



/**
 * -------------------------------
 * -----  `collectUi(demo)`  -----
 * -------------------------------
 * - Reúne las referencias del demo, o null si falta alguna pieza.
 * @param {HTMLElement} demo - Wrapper del demo.
 * @return {ExpressUi|null} - Referencias tipadas del demo.
 */
const collectUi = (demo) => {

    /** @type {HTMLFormElement|null} - `formulario de creación` */
    const form = demo.querySelector('[data-express-form]');

    /** @type {HTMLInputElement|null} - `campo del título` */
    const titleField = demo.querySelector('[name="title"]');

    /** @type {HTMLButtonElement|null} - `botón de envío` */
    const submitButton = form?.querySelector('[type="submit"]') ?? null;

    /** @type {HTMLButtonElement|null} - `botón de recarga` */
    const refreshButton = demo.querySelector('[data-express-refresh]');

    /** @type {HTMLElement|null} - `error del campo título` */
    const fieldError = demo.querySelector('[data-error-for="title"]');

    /** @type {HTMLElement|null} - `aviso de estado` */
    const status = demo.querySelector('[data-express-status]');

    /** @type {HTMLElement|null} - `insignia del código http` */
    const httpBadge = demo.querySelector('[data-express-http]');

    /** @type {HTMLElement|null} - `insignia de la latencia` */
    const latencyBadge = demo.querySelector('[data-express-latency]');

    /** @type {HTMLUListElement|null} - `contenedor de la lista` */
    const list = demo.querySelector('[data-express-list]');

    //  -----  salir si falta alguna pieza del demo  -----
    if (!(form instanceof HTMLFormElement)
        || !(titleField instanceof HTMLInputElement)
        || !(submitButton instanceof HTMLButtonElement)
        || !(refreshButton instanceof HTMLButtonElement)
        || !(fieldError instanceof HTMLElement)
        || !(status instanceof HTMLElement)
        || !(httpBadge instanceof HTMLElement)
        || !(latencyBadge instanceof HTMLElement)
        || !(list instanceof HTMLUListElement))
        //  -----  no hay demo completo que enlazar  -----
        return null;

    //  -----  devolver las referencias reunidas  -----
    return { form, titleField, submitButton, refreshButton, fieldError, status, httpBadge, latencyBadge, list };

};



/**
 * -----------------------
 * -----  `mount()`  -----
 * -----------------------
 * - Enlaza el demo cuando la ruta ya está en el DOM.
 * @return {void}
 */
export const mount = () => {

    /** @type {HTMLElement|null} - `wrapper del demo` */
    const demo = document.querySelector('.express-demo');

    //  -----  salir si esta ruta no está montada  -----
    if (!(demo instanceof HTMLElement))
        //  -----  no hay demo en el dom  -----
        return;

    //  -----  no volver a enlazar el mismo demo  -----
    if (demo.dataset.bound === 'true')
        //  -----  los eventos ya están enlazados  -----
        return;

    /** @type {ExpressUi|null} - `piezas del demo` */
    const ui = collectUi(demo);

    //  -----  salir si falta alguna pieza  -----
    if (!ui)
        //  -----  no hay formulario que enlazar  -----
        return;

    //  -----  marcar el demo como enlazado  -----
    demo.dataset.bound = 'true';

    //  -----  crear tareas sin recargar la spa  -----
    ui.form.addEventListener('submit', (event) => {

        //  -----  evitar el envío nativo del formulario  -----
        event.preventDefault();

        //  -----  lanzar la creación de la tarea  -----
        void createTask(ui);

    });

    //  -----  recargar la lista a pedido  -----
    ui.refreshButton.addEventListener('click', () => {

        //  -----  pedir la lista al api  -----
        void loadTasks(ui);

    });

    //  -----  borrar la tarea marcada con un solo listener  -----
    ui.list.addEventListener('click', (event) => {

        /** - `elemento que recibió el click` */
        const target = event.target;

        //  -----  ignorar clicks que no vienen de un elemento  -----
        if (!(target instanceof HTMLElement))
            //  -----  no hay botón que buscar  -----
            return;

        /** @type {Element|null} - `botón de borrar más cercano` */
        const button = target.closest('[data-task-delete]');

        //  -----  ignorar clicks fuera del botón  -----
        if (!(button instanceof HTMLButtonElement))
            //  -----  no hay tarea que borrar  -----
            return;

        /** - `identificador guardado en el botón` */
        const rawId = button.dataset.taskDelete || '';

        //  -----  ignorar un identificador que no sea numérico  -----
        if (!/^\d+$/.test(rawId))
            //  -----  el botón no apunta a una tarea válida  -----
            return;

        //  -----  eliminar la tarea del api  -----
        void deleteTask(ui, Number(rawId));

    });

    //  -----  cargar la lista al entrar en la ruta  -----
    void loadTasks(ui);

};
