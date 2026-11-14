/*
    *  --------------------------------------------------------  *
    *  -----  mysql-query.js  --  /server/mysql-query.js  -----  *
    *  --------------------------------------------------------  *
*/


//  -----  cuerpo json de la petición  -----
import express from 'express';

//  -----  cliente mysql del contenedor local  -----
import mysql from 'mysql2/promise';


/** - `máximo de filas devueltas por una consulta` */
const MAX_ROWS = 200;

/** - `tamaño máximo del sql en caracteres` */
const MAX_SQL_LENGTH = 8000;

/** @type {import('mysql2/promise').Pool|null} - `pool reutilizable` */
let pool = null;



/**
 * -------------------------
 * -----  `getPool()`  -----
 * -------------------------
 * - Abre el pool de MySQL con las variables de .env.
 * @return {import('mysql2/promise').Pool} - Pool contra la base local.
 */
const getPool = () => {

    //  -----  reutilizar el pool si ya existe  -----
    if (pool)
        //  -----  devolver el pool abierto  -----
        return pool;

    //  -----  crear el pool contra el contenedor local  -----
    pool = mysql.createPool({

        /** - `host publicado por docker` */
        host: process.env.MYSQL_HOST || '127.0.0.1',

        /** - `puerto del host, 3308 para no pisar otro mysql` */
        port: Number(process.env.MYSQL_PORT || 3308),

        /** - `usuario de la aplicación` */
        user: process.env.MYSQL_USER || 'javascript_user',

        /** - `contraseña leída de .env` */
        password: process.env.MYSQL_PASSWORD || '',

        /** - `base creada en el primer arranque` */
        database: process.env.MYSQL_DATABASE || 'javascript_mis_plugins_spa',

        /** - `esperar si el pool está ocupado` */
        waitForConnections: true,

        /** - `conexiones simultáneas` */
        connectionLimit: 4,

        /** - `una sola sentencia por petición` */
        multipleStatements: false,

        /** - `juego de caracteres de la tabla stacks` */
        charset: 'utf8mb4',

    });

    //  -----  devolver el pool nuevo  -----
    return pool;

};



/**
 * ---------------------------------
 * -----  `normalizeSql(sql)`  -----
 * ---------------------------------
 * - Recorta el sql y quita un punto y coma final.
 * @param {string} sql - Texto enviado por la página.
 * @return {string} - Sentencia lista para validar.
 */
const normalizeSql = (sql) => {

    /** - `sql sin espacios laterales` */
    const trimmed = sql.trim();

    //  -----  quitar un único punto y coma final  -----
    return trimmed.replace(/;\s*$/, '').trim();

};



/**
 * ---------------------------------
 * -----  `rejectReason(sql)`  -----
 * ---------------------------------
 * - Rechaza sql vacío, múltiple o que no sea una consulta de lectura.
 * @param {string} sql - Sentencia ya normalizada.
 * @return {string} - Motivo del rechazo, o cadena vacía si es válida.
 */
const rejectReason = (sql) => {

    //  -----  exigir una sentencia  -----
    if (!sql)
        //  -----  avisar de que no hay sql  -----
        return 'Escribe una consulta SQL.';

    //  -----  limitar el tamaño del texto  -----
    if (sql.length > MAX_SQL_LENGTH)
        //  -----  avisar de que el texto es demasiado largo  -----
        return 'La consulta supera el tamaño permitido.';

    //  -----  impedir varias sentencias  -----
    if (sql.includes(';'))
        //  -----  avisar de que solo se admite una sentencia  -----
        return 'Solo se admite una sentencia, sin punto y coma en medio.';

    //  -----  admitir solo lecturas  -----
    if (!/^(select|show|describe|desc|explain|with)\b/i.test(sql))
        //  -----  avisar de que la sentencia no es una consulta  -----
        return 'Solo se admiten consultas de lectura: SELECT, SHOW, DESCRIBE o EXPLAIN.';

    //  -----  impedir volcados y lectura de ficheros  -----
    if (/\b(into\s+outfile|into\s+dumpfile|load_file\s*\(|load\s+data)\b/i.test(sql))
        //  -----  avisar de que la consulta toca el sistema de ficheros  -----
        return 'Esa consulta no está permitida.';

    //  -----  impedir escrituras escondidas tras un WITH: MySQL 8.4 admite
    //         WITH antes de UPDATE y DELETE, que pasarían el filtro anterior  -----
    if (/\b(update|delete|insert|replace|alter|truncate|drop|grant|revoke)\b/i.test(sql))
        //  -----  avisar de que la sentencia modifica datos o el esquema  -----
        return 'Solo se admiten consultas de lectura, sin sentencias de escritura.';

    //  -----  la sentencia es válida  -----
    return '';

};



/**
 * ---------------------------------
 * -----  `plainValue(value)`  -----
 * ---------------------------------
 * - Convierte un valor de mysql a algo que JSON puede enviar.
 * @param {unknown} value - Valor de una celda.
 * @return {string|number|boolean|null} - Valor serializable.
 */
const plainValue = (value) => {

    //  -----  conservar los nulos  -----
    if (value === null || value === undefined)
        //  -----  devolver null  -----
        return null;

    //  -----  pasar las fechas a texto iso  -----
    if (value instanceof Date)
        //  -----  devolver la fecha en iso  -----
        return value.toISOString();

    //  -----  pasar los enteros grandes a texto  -----
    if (typeof value === 'bigint')
        //  -----  devolver el entero como texto  -----
        return value.toString();

    //  -----  pasar los binarios a texto  -----
    if (Buffer.isBuffer(value))
        //  -----  devolver el binario como utf-8  -----
        return value.toString('utf8');

    //  -----  conservar texto, números y booleanos  -----
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        //  -----  devolver el valor tal cual  -----
        return value;

    //  -----  el resto se muestra como texto  -----
    return String(value);

};



/**
 * -------------------------------
 * -----  `plainRows(rows)`  -----
 * -------------------------------
 * - Convierte las filas de mysql a objetos JSON.
 * @param {import('mysql2').RowDataPacket[]} rows - Filas devueltas por mysql.
 * @return {Array<Record<string, string|number|boolean|null>>} - Filas serializables.
 */
const plainRows = (rows) => {

    //  -----  convertir cada fila  -----
    return rows.map((row) => {

        /** @type {Record<string, string|number|boolean|null>} - `fila serializable` */
        const plain = {};

        //  -----  convertir cada celda  -----
        for (const [key, value] of Object.entries(row))
            //  -----  guardar la celda ya convertida  -----
            plain[key] = plainValue(value);

        //  -----  devolver la fila convertida  -----
        return plain;

    });

};



/**
 * ------------------------------------------
 * -----  `handleMysqlQuery(req, res)`  -----
 * ------------------------------------------
 * - Ejecuta una consulta de lectura y responde JSON.
 * @param {import('express').Request} req - Petición con el sql.
 * @param {import('express').Response} res - Respuesta JSON.
 * @return {Promise<void>}
 */
const handleMysqlQuery = async (req, res) => {

    /** - `sql recibido, o cadena vacía` */
    const rawSql = typeof req.body?.sql === 'string' ? req.body.sql : '';

    /** - `sentencia normalizada` */
    const sql = normalizeSql(rawSql);

    /** - `motivo de rechazo, si lo hay` */
    const reason = rejectReason(sql);

    //  -----  rechazar la sentencia antes de tocar mysql  -----
    if (reason) {

        //  -----  responder el motivo  -----
        res.status(400).json({
            ok: false,
            message: reason,
        });

        //  -----  no consultar  -----
        return;

    }

    //  -----  intentar la consulta  -----
    try {

        /** - `filas y columnas devueltas por mysql` */
        const [rows, fields] = await getPool().query(sql);

        //  -----  exigir un resultado tabular  -----
        if (!Array.isArray(rows)) {

            //  -----  responder que no hubo filas que mostrar  -----
            res.status(400).json({
                ok: false,
                message: 'La sentencia no devolvió filas.',
            });

            //  -----  no seguir  -----
            return;

        }

        /** @type {import('mysql2').RowDataPacket[]} - `filas de la consulta` */
        const packetRows = /** @type {import('mysql2').RowDataPacket[]} */ (
            rows
        );

        /** - `filas recortadas al máximo` */
        const limitedRows = packetRows.slice(0, MAX_ROWS);

        /** - `nombres de columna en el orden de mysql` */
        const columns = Array.isArray(fields) ? fields.map((field) => field.name) : [];

        /** - `aviso si el resultado se recortó` */
        const message = packetRows.length > MAX_ROWS
            ? `Se muestran ${MAX_ROWS} de ${packetRows.length} filas.`
            : `${limitedRows.length} filas.`;

        //  -----  responder la tabla  -----
        res.json({
            ok: true,
            columns,
            rows: plainRows(limitedRows),
            rowCount: limitedRows.length,
            truncated: packetRows.length > MAX_ROWS,
            message,
        });

    }

    //  -----  si mysql rechaza la consulta, devolver el mensaje  -----
    catch (error) {

        /** - `texto del fallo de mysql` */
        const message = error instanceof Error ? error.message : 'No se pudo ejecutar la consulta.';

        /** - `código de mysql, si la sentencia es la que falla` */
        const code = typeof error === 'object' && error !== null && 'code' in error
            ? String(error.code)
            : '';

        //  -----  una sentencia inválida se responde en el json, sin marcar el http como error  -----
        const status = code.startsWith('ER_') ? 200 : 500;

        //  -----  responder el fallo sin la pila  -----
        res.status(status).json({
            ok: false,
            message,
        });

    }

};



/**
 * -------------------------------------------------------
 * -----  `registerMysqlQueryRoute(app, routeBase)`  -----
 * -------------------------------------------------------
 * - Publica POST {base}/api/mysql/query en el servidor Node local.
 * - En Nginx la página usa app/services/mysql/query.php.
 * @param {import('express').Express} app - Aplicación Express.
 * @param {string} routeBase - Prefijo de la SPA.
 * @return {void}
 */
export const registerMysqlQueryRoute = (app, routeBase) => {

    //  -----  aceptar el json de la página y ejecutar la consulta  -----
    app.post(
        `${routeBase}/api/mysql/query`,
        express.json({ limit: '16kb' }),
        (req, res) => {

            //  -----  no esperar aquí: el manejador responde solo  -----
            void handleMysqlQuery(req, res);

        }
    );

};
