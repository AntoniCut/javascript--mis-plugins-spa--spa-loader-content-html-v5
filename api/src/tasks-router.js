/*
    *  -----------------------------------------------------------  *
    *  -----  tasks-router.js  --  /api/src/tasks-router.js  -----  *
    *  -----------------------------------------------------------  *
*/


//  -----  framework express para el router  -----
import express from 'express';


/** - `mínimo de caracteres del título` */
const MIN_TITLE_LENGTH = 3;

/** - `máximo de caracteres del título` */
const MAX_TITLE_LENGTH = 80;


/**
 * ------------------------
 * -----  `tasks {}`  -----
 * ------------------------
 * - `tareas guardadas en memoria: se pierden al reiniciar el proceso`
 * @type {Array<{ id: number, title: string, createdAt: string }>}
 */
const tasks = [
    /** - `primera tarea semilla` */
    { id: 1, title: 'Revisar el router de Express', createdAt: new Date().toISOString() },
    /** - `segunda tarea semilla` */
    { id: 2, title: 'Probar el CRUD en memoria', createdAt: new Date().toISOString() },
    /** - `tercera tarea semilla` */
    { id: 3, title: 'Documentar los códigos HTTP', createdAt: new Date().toISOString() },
];

/** - `próximo identificador autoincremental` */
let nextId = 4;



/**
 * -------------------------------------------
 * -----  `sendJson(res, status, body)`  -----
 * -------------------------------------------
 * - Responde JSON y añade la cabecera con el tiempo transcurrido.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @param {number} status - Código HTTP de la respuesta.
 * @param {Record<string, unknown>} body - Cuerpo serializable.
 * @return {void}
 */
const sendJson = (res, status, body) => {

    /** @type {bigint|undefined} - `inicio anotado por el middleware` */
    const startedAt = res.locals.tasksStartedAt;

    /** - `milisegundos desde el inicio, 0 si no se anotó` */
    const elapsedMs = typeof startedAt === 'bigint'
        ? Number(process.hrtime.bigint() - startedAt) / 1e6
        : 0;

    //  -----  publicar el tiempo de la respuesta  -----
    res.set('X-Response-Time', `${elapsedMs.toFixed(1)}ms`);

    //  -----  enviar el estado y el json  -----
    res.status(status).json(body);

};



/**
 * ------------------------------------------------
 * -----  `timingMiddleware(req, res, next)`  -----
 * ------------------------------------------------
 * - Anota el inicio y registra una línea cuando la respuesta termina.
 * @param {import('express').Request} req - Petición recibida.
 * @param {import('express').Response} res - Respuesta en curso.
 * @param {import('express').NextFunction} next - Siguiente middleware.
 * @return {void}
 */
const timingMiddleware = (req, res, next) => {

    /** @type {bigint} - `instante de inicio en nanosegundos` */
    const startedAt = process.hrtime.bigint();

    //  -----  guardar el inicio para el helper de respuesta  -----
    res.locals.tasksStartedAt = startedAt;

    //  -----  escuchar el final de la respuesta  -----
    res.on('finish', () => {

        /** - `milisegundos que tardó la respuesta` */
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

        //  -----  escribir método, url, estado y duración  -----
        console.log(`[tasks] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);

    });

    //  -----  continuar con la cadena del router  -----
    next();

};



/**
 * ----------------------------------------
 * -----  `normalizeTitle(rawTitle)`  -----
 * ----------------------------------------
 * - Recorta el título y colapsa los espacios internos.
 * @param {string} rawTitle - Texto enviado por el formulario.
 * @return {string} - Título normalizado.
 */
const normalizeTitle = (rawTitle) => {

    //  -----  quitar espacios laterales y repetidos  -----
    return rawTitle.trim().replace(/\s+/g, ' ');

};



/**
 * ----------------------------------------------
 * -----  `validateTitle(rawTitle, title)`  -----
 * ----------------------------------------------
 * - Devuelve el error del título, o cadena vacía si es válido.
 * @param {string|null} rawTitle - Título original, null si no es texto.
 * @param {string} title - Título ya normalizado.
 * @return {string} - Mensaje de validación.
 */
const validateTitle = (rawTitle, title) => {

    //  -----  exigir que el título sea texto  -----
    if (rawTitle === null)
        //  -----  avisar de que el tipo no es válido  -----
        return 'El título no es válido.';

    //  -----  exigir contenido después de normalizar  -----
    if (!title)
        //  -----  avisar de que el título está vacío  -----
        return 'El título es obligatorio.';

    //  -----  limitar el largo del título  -----
    if (title.length < MIN_TITLE_LENGTH || title.length > MAX_TITLE_LENGTH)
        //  -----  avisar del rango permitido  -----
        return `El título debe tener entre ${MIN_TITLE_LENGTH} y ${MAX_TITLE_LENGTH} caracteres.`;

    //  -----  el título es válido  -----
    return '';

};



/**
 * ----------------------------------
 * -----  `parseTaskId(rawId)`  -----
 * ----------------------------------
 * - Convierte el parámetro de ruta en un identificador numérico.
 * @param {string} rawId - Identificador recibido en la url.
 * @return {number|null} - Número válido, o null si no lo es.
 */
const parseTaskId = (rawId) => {

    //  -----  admitir solo dígitos  -----
    if (!/^\d+$/.test(rawId))
        //  -----  marcar el identificador como inválido  -----
        return null;

    //  -----  devolver el número ya convertido  -----
    return Number(rawId);

};



/**
 * -----------------------------------------
 * -----  `methodNotAllowed(allowed)`  -----
 * -----------------------------------------
 * - Responde 405 con los métodos admitidos en la cabecera Allow.
 * @param {string} allowed - Métodos HTTP que admite la ruta.
 * @return {import('express').RequestHandler} - Manejador que responde el rechazo.
 */
const methodNotAllowed = (allowed) => (req, res) => {

    //  -----  anunciar los métodos admitidos  -----
    res.set('Allow', allowed);

    //  -----  responder el rechazo en json  -----
    sendJson(res, 405, {
        ok: false,
        message: 'Método no permitido.',
    });

};



/**
 * -----------------------------------
 * -----  `listTasks(req, res)`  -----
 * -----------------------------------
 * - Devuelve todas las tareas en memoria.
 * @param {import('express').Request} req - Petición recibida.
 * @param {import('express').Response} res - Respuesta JSON.
 * @return {void}
 */
const listTasks = (req, res) => {

    /** - `cantidad de tareas guardadas` */
    const count = tasks.length;

    /** - `sustantivo concordante con la cantidad` */
    const noun = count === 1 ? 'tarea' : 'tareas';

    //  -----  responder el listado con su recuento  -----
    sendJson(res, 200, {
        ok: true,
        tasks,
        count,
        message: `${count} ${noun} en memoria.`,
    });

};



/**
 * ------------------------------------
 * -----  `createTask(req, res)`  -----
 * ------------------------------------
 * - Valida el título, crea la tarea y la responde.
 * @param {import('express').Request} req - Petición con el json del formulario.
 * @param {import('express').Response} res - Respuesta JSON.
 * @return {void}
 */
const createTask = (req, res) => {

    /** @type {string|null} - `título recibido, null si no es texto` */
    const rawTitle = typeof req.body?.title === 'string' ? req.body.title : null;

    /** - `título normalizado` */
    const title = rawTitle === null ? '' : normalizeTitle(rawTitle);

    /** - `error de validación, o cadena vacía` */
    const error = validateTitle(rawTitle, title);

    //  -----  responder los campos marcados  -----
    if (error) {

        //  -----  enviar el error de validación  -----
        sendJson(res, 422, {
            ok: false,
            message: 'Revisá los campos marcados.',
            errors: {
                title: error,
            },
        });

        //  -----  no crear la tarea  -----
        return;

    }

    /** @type {{ id: number, title: string, createdAt: string }} - `tarea nueva` */
    const task = {
        id: nextId,
        title,
        createdAt: new Date().toISOString(),
    };

    //  -----  avanzar el identificador autoincremental  -----
    nextId += 1;

    //  -----  guardar la tarea en memoria  -----
    tasks.push(task);

    //  -----  responder la tarea creada  -----
    sendJson(res, 201, {
        ok: true,
        task,
        message: 'Tarea creada.',
    });

};



/**
 * ------------------------------------
 * -----  `deleteTask(req, res)`  -----
 * ------------------------------------
 * - Elimina una tarea por su identificador.
 * @param {import('express').Request} req - Petición con el id de ruta.
 * @param {import('express').Response} res - Respuesta JSON.
 * @return {void}
 */
const deleteTask = (req, res) => {

    /** - `identificador ya convertido, o null si no es numérico` */
    const id = parseTaskId(req.params.id);

    //  -----  rechazar un identificador no numérico  -----
    if (id === null) {

        //  -----  responder el identificador inválido  -----
        sendJson(res, 400, {
            ok: false,
            message: 'El identificador no es válido.',
        });

        //  -----  no buscar la tarea  -----
        return;

    }

    /** - `posición de la tarea en el array` */
    const index = tasks.findIndex((task) => task.id === id);

    //  -----  rechazar una tarea inexistente  -----
    if (index === -1) {

        //  -----  responder que la tarea no existe  -----
        sendJson(res, 404, {
            ok: false,
            message: 'La tarea no existe.',
        });

        //  -----  no eliminar nada  -----
        return;

    }

    /** - `tarea quitada del array` */
    const [deleted] = tasks.splice(index, 1);

    //  -----  responder la tarea eliminada  -----
    sendJson(res, 200, {
        ok: true,
        deletedId: deleted.id,
        message: 'Tarea eliminada.',
    });

};



/**
 * --------------------------------------------------------
 * -----  `handleRouterError(error, req, res, next)`  -----
 * --------------------------------------------------------
 * - Responde en JSON los errores de parseo sin exponer la pila.
 * @param {unknown} error - Error lanzado por express o body-parser.
 * @param {import('express').Request} req - Petición recibida.
 * @param {import('express').Response} res - Respuesta JSON.
 * @param {import('express').NextFunction} next - Siguiente middleware.
 * @return {void}
 */
const handleRouterError = (error, req, res, next) => {

    /** - `código http del error, 500 si no viene` */
    const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number(error.status)
        : 500;

    /** - `código acotado a los casos que atiende el router` */
    const responseStatus = status === 413 ? 413 : status === 400 ? 400 : 500;

    /** - `mensaje estable para el cliente` */
    const message = responseStatus === 413
        ? 'El cuerpo supera los 4 KB.'
        : responseStatus === 400
            ? 'La petición no es un JSON válido.'
            : 'Error interno del API de tareas.';

    //  -----  responder el error sin la pila  -----
    sendJson(res, responseStatus, {
        ok: false,
        message,
    });

};



/**
 * -----------------------------------
 * -----  `createTasksRouter()`  -----
 * -----------------------------------
 * - Crea el router del CRUD de tareas para el runtime Node.
 * - Publica GET y POST /tasks, DELETE /tasks/:id y el 405 del resto de métodos.
 * @return {import('express').Router} - Router con las rutas de tareas.
 */
export const createTasksRouter = () => {

    /** - `router propio del api de tareas` */
    const router = express.Router();

    //  -----  medir y registrar cada petición  -----
    router.use(timingMiddleware);

    //  -----  listar las tareas en memoria  -----
    router.get('/tasks', listTasks);

    //  -----  crear una tarea con el json del formulario  -----
    router.post('/tasks', express.json({ limit: '4kb' }), createTask);

    //  -----  rechazar métodos distintos de get y post en la colección  -----
    router.all('/tasks', methodNotAllowed('GET, POST'));

    //  -----  eliminar una tarea por su identificador  -----
    router.delete('/tasks/:id', deleteTask);

    //  -----  rechazar métodos distintos de delete en el detalle  -----
    router.all('/tasks/:id', methodNotAllowed('DELETE'));

    //  -----  responder en json los errores de parseo  -----
    router.use(handleRouterError);

    //  -----  devolver el router montable  -----
    return router;

};
