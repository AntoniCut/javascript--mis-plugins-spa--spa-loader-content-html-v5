/*
    *  ---------------------------------------------------------------------------  *
    *  -----  mysql-page.esm.js  --  /src/scripts/js/pages/mysql-page.esm.js  -----  *
    *  ---------------------------------------------------------------------------  *
*/


/**
 * -----  Respuesta JSON de la consulta  -----
 * @typedef {Object} MysqlQueryResponse
 * @property {boolean} ok
 * @property {string} message
 * @property {string[]} [columns]
 * @property {Array<Record<string, string|number|boolean|null>>} [rows]
 */



/**
 * ---------------------------------------------------
 * -----  `setStatus(status, message, isError)`  -----
 * ---------------------------------------------------
 * - Escribe el aviso de la consulta.
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
 * -----------------------------------
 * -----  `clearResult(result)`  -----
 * -----------------------------------
 * - Vacía la tabla anterior.
 * @param {HTMLElement} result - Contenedor del resultado.
 * @return {void}
 */
const clearResult = (result) => {

    //  -----  quitar la tabla anterior  -----
    result.replaceChildren();

};



/**
 * --------------------------------------------------
 * -----  `renderTable(result, columns, rows)`  -----
 * --------------------------------------------------
 * - Pinta las filas en una tabla semántica.
 * @param {HTMLElement} result - Contenedor del resultado.
 * @param {string[]} columns - Nombres de columna.
 * @param {Array<Record<string, string|number|boolean|null>>} rows - Filas de la consulta.
 * @return {void}
 */
const renderTable = (result, columns, rows) => {

    /** @type {HTMLTableElement} - `tabla del resultado` */
    const table = document.createElement('table');

    //  -----  asignar la clase de la tabla  -----
    table.className = 'mysql-page__table';

    /** @type {HTMLTableSectionElement} - `cabecera de la tabla` */
    const thead = document.createElement('thead');

    /** @type {HTMLTableRowElement} - `fila de nombres de columna` */
    const headRow = document.createElement('tr');

    //  -----  crear cada cabecera  -----
    for (const column of columns) {

        /** @type {HTMLTableCellElement} - `nombre de columna` */
        const th = document.createElement('th');

        //  -----  marcar la celda como cabecera de columna  -----
        th.scope = 'col';

        //  -----  escribir el nombre  -----
        th.textContent = column;

        //  -----  añadir la cabecera a la fila  -----
        headRow.appendChild(th);

    }

    //  -----  añadir la fila de cabeceras  -----
    thead.appendChild(headRow);

    //  -----  añadir la cabecera a la tabla  -----
    table.appendChild(thead);

    /** @type {HTMLTableSectionElement} - `cuerpo de la tabla` */
    const tbody = document.createElement('tbody');

    //  -----  crear cada fila  -----
    for (const row of rows) {

        /** @type {HTMLTableRowElement} - `fila de datos` */
        const tr = document.createElement('tr');

        //  -----  crear cada celda  -----
        for (const column of columns) {

            /** @type {HTMLTableCellElement} - `celda de la fila` */
            const td = document.createElement('td');

            /** - `valor de la celda` */
            const value = row[column];

            //  -----  mostrar NULL cuando la celda viene vacía  -----
            td.textContent = value === null || value === undefined ? 'NULL' : String(value);

            //  -----  añadir la celda a la fila  -----
            tr.appendChild(td);

        }

        //  -----  añadir la fila al cuerpo  -----
        tbody.appendChild(tr);

    }

    //  -----  añadir el cuerpo a la tabla  -----
    table.appendChild(tbody);

    //  -----  mostrar la tabla  -----
    result.appendChild(table);

};



/**
 * ------------------------------
 * -----  `runQuery(form)`  -----
 * ------------------------------
 * - Envía el sql al servidor y pinta la respuesta.
 * @param {HTMLFormElement} form - Formulario de la consulta.
 * @return {Promise<void>}
 */
const runQuery = async (form) => {

    /** @type {HTMLTextAreaElement|null} - `campo del sql` */
    const field = form.querySelector('[name="sql"]');

    /** @type {HTMLElement|null} - `aviso de la consulta` */
    const status = form.parentElement?.querySelector('[data-mysql-status]') ?? null;

    /** @type {HTMLElement|null} - `contenedor de la tabla` */
    const result = form.parentElement?.querySelector('[data-mysql-result]') ?? null;

    /** @type {HTMLButtonElement|null} - `botón de envío` */
    const button = form.querySelector('[type="submit"]');

    //  -----  salir si falta alguna pieza del formulario  -----
    if (!(field instanceof HTMLTextAreaElement) || !status || !result || !(button instanceof HTMLButtonElement))
        //  -----  no hay destino para el resultado  -----
        return;

    //  -----  vaciar el resultado anterior  -----
    clearResult(result);

    //  -----  avisar de que la consulta está en curso  -----
    setStatus(status, 'Consultando…', false);

    //  -----  bloquear el botón mientras responde el servidor  -----
    button.disabled = true;

    //  -----  intentar la petición  -----
    try {

        /** - `respuesta php, la misma en desarrollo y en nginx` */
        const response = await fetch('app/services/mysql/query.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sql: field.value,
            }),
        });

        /** - `tipo declarado por el servidor` */
        const contentType = response.headers.get('content-type') || '';

        //  -----  si nginx devolvió html, no leerlo como json  -----
        if (!contentType.includes('application/json')) {

            //  -----  mostrar el código http en la página  -----
            setStatus(status, `El servidor respondió ${response.status} sin JSON. La consulta no llegó a PHP.`, true);

            //  -----  no pintar una tabla  -----
            return;

        }

        /** @type {MysqlQueryResponse} - `cuerpo json de la consulta` */
        const body = await response.json();

        //  -----  mostrar el fallo devuelto por el servidor  -----
        if (!body.ok) {

            //  -----  escribir el motivo  -----
            setStatus(status, body.message || 'No se pudo ejecutar la consulta.', true);

            //  -----  no pintar una tabla vacía  -----
            return;

        }

        //  -----  escribir el recuento  -----
        setStatus(status, body.message, false);

        //  -----  pintar las filas  -----
        renderTable(result, body.columns || [], body.rows || []);

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
 * - Enlaza el formulario de consulta cuando la ruta ya está en el DOM.
 * @return {void}
 */
export const mount = () => {

    /** @type {HTMLFormElement|null} - `formulario de la consulta` */
    const form = document.querySelector('[data-mysql-query-form]');

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

    //  -----  enviar la consulta sin recargar la SPA  -----
    form.addEventListener('submit', (event) => {

        //  -----  evitar el envío nativo del formulario  -----
        event.preventDefault();

        //  -----  lanzar la consulta  -----
        void runQuery(form);

    });

};
