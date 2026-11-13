<?php

    /*
        *  ----------------------------------------------------------  *
        *  -----  query.php  --  /src/services/mysql/query.php  -----  *
        *  ----------------------------------------------------------  *
        *                                                               *
        *  - POST JSON { sql } y respuesta JSON de solo lectura.        *
        *  - Nginx de produccion ejecuta este php; el servidor Node     *
        *    de desarrollo no esta en el VPS.                           *
        *                                                               *
    */

    require_once dirname(__DIR__) . '/load-env.php';
    load_dotenv(__DIR__);


    /** - `maximo de filas devueltas por una consulta` */
    const MYSQL_QUERY_MAX_ROWS = 200;

    /** - `tamano maximo del sql en bytes` */
    const MYSQL_QUERY_MAX_SQL_LENGTH = 8000;


    /**
     * ---------------------------------------------
     * -----  `mysql_query_json($status, $payload)`  -----
     * ---------------------------------------------
     * - Envia JSON y termina.
     * @param int $status
     * @param array<string, mixed> $payload
     * @return never
     */
    function mysql_query_json(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }


    /**
     * -----------------------------------------
     * -----  `mysql_query_env($names, $fallback)`  -----
     * -----------------------------------------
     * - Devuelve la primera variable definida y no vacia.
     * @param list<string> $names
     * @param string $fallback
     * @return string
     */
    function mysql_query_env(array $names, string $fallback): string
    {
        foreach ($names as $name) {
            $value = env_get($name);

            if ($value !== null && $value !== '') {
                return $value;
            }
        }

        return $fallback;
    }


    /**
     * ------------------------------------
     * -----  `mysql_query_normalize($sql)`  -----
     * ------------------------------------
     * - Recorta el sql y quita un punto y coma final.
     * @param string $sql
     * @return string
     */
    function mysql_query_normalize(string $sql): string
    {
        $trimmed = trim($sql);

        return trim((string) preg_replace('/;\s*$/', '', $trimmed));
    }


    /**
     * ----------------------------------
     * -----  `mysql_query_reject($sql)`  -----
     * ----------------------------------
     * - Rechaza sql vacio, multiple o que no sea una consulta de lectura.
     * @param string $sql
     * @return string
     */
    function mysql_query_reject(string $sql): string
    {
        if ($sql === '') {
            return 'Escribe una consulta SQL.';
        }

        if (strlen($sql) > MYSQL_QUERY_MAX_SQL_LENGTH) {
            return 'La consulta supera el tamaño permitido.';
        }

        if (str_contains($sql, ';')) {
            return 'Solo se admite una sentencia, sin punto y coma en medio.';
        }

        if (!preg_match('/^(select|show|describe|desc|explain|with)\b/i', $sql)) {
            return 'Solo se admiten consultas de lectura: SELECT, SHOW, DESCRIBE o EXPLAIN.';
        }

        if (preg_match('/\b(into\s+outfile|into\s+dumpfile|load_file\s*\(|load\s+data)\b/i', $sql)) {
            return 'Esa consulta no está permitida.';
        }

        //  -----  impedir escrituras escondidas tras un WITH: MySQL 8 admite
        //         WITH antes de UPDATE y DELETE, que pasarían el filtro anterior  -----
        if (preg_match('/\b(update|delete|insert|replace|alter|truncate|drop|grant|revoke)\b/i', $sql)) {
            return 'Solo se admiten consultas de lectura, sin sentencias de escritura.';
        }

        return '';
    }


    /**
     * --------------------------------
     * -----  `mysql_query_connect()`  -----
     * --------------------------------
     * - Abre mysqli con MYSQL_* del .env, o DB_* si esas no estan.
     * @return array{0: mysqli|null, 1: string}
     */
    function mysql_query_connect(): array
    {
        if (!function_exists('mysqli_connect')) {
            return [null, 'Extension mysqli no disponible en PHP del servidor'];
        }

        mysqli_report(MYSQLI_REPORT_OFF);

        $host = mysql_query_env(['MYSQL_HOST', 'DB_HOST'], '127.0.0.1');
        $user = mysql_query_env(['MYSQL_USER', 'DB_USER'], 'javascript_user');
        $db = mysql_query_env(['MYSQL_DATABASE', 'DB_NAME'], 'javascript_mis_plugins_spa');
        $port = (int) mysql_query_env(['MYSQL_PORT', 'DB_PORT'], '3308');
        $pass = env_get('MYSQL_PASSWORD');

        if ($pass === null) {
            $pass = env_get('DB_PASS') ?? '';
        }

        //  -----  inicializar la conexion para poder configurar opciones  -----
        $conn = mysqli_init();

        if (!$conn instanceof mysqli) {
            return [null, 'No se pudo inicializar mysqli.'];
        }

        //  -----  devolver enteros y flotantes como tipos nativos, igual que Node  -----
        if (defined('MYSQLI_OPT_INT_AND_FLOAT_NATIVE')) {
            mysqli_options($conn, MYSQLI_OPT_INT_AND_FLOAT_NATIVE, true);
        }

        //  -----  abrir la conexion con la configuracion aplicada  -----
        $connected = mysqli_real_connect($conn, $host, $user, $pass, $db, $port);

        if (!$connected) {
            return [null, 'Conexion MySQL fallida: ' . mysqli_connect_error()];
        }

        mysqli_set_charset($conn, 'utf8mb4');

        return [$conn, ''];
    }


    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        mysql_query_json(405, [
            'ok' => false,
            'message' => 'Solo se admite POST.',
        ]);
    }

    $rawBody = file_get_contents('php://input', false, null, 0, 16384);
    $decoded = json_decode(is_string($rawBody) ? $rawBody : '', true);
    $rawSql = is_array($decoded) && isset($decoded['sql']) && is_string($decoded['sql'])
        ? $decoded['sql']
        : '';
    $sql = mysql_query_normalize($rawSql);
    $reason = mysql_query_reject($sql);

    if ($reason !== '') {
        mysql_query_json(400, [
            'ok' => false,
            'message' => $reason,
        ]);
    }

    [$conn, $connectError] = mysql_query_connect();

    if (!$conn) {
        mysql_query_json(500, [
            'ok' => false,
            'message' => $connectError,
        ]);
    }

    $result = mysqli_query($conn, $sql);

    if ($result === false) {
        $message = mysqli_error($conn) ?: 'No se pudo ejecutar la consulta.';
        mysqli_close($conn);
        mysql_query_json(200, [
            'ok' => false,
            'message' => $message,
        ]);
    }

    if (!($result instanceof mysqli_result)) {
        mysqli_close($conn);
        mysql_query_json(400, [
            'ok' => false,
            'message' => 'La sentencia no devolvió filas.',
        ]);
    }

    $columns = [];

    foreach (mysqli_fetch_fields($result) as $field) {
        $columns[] = $field->name;
    }

    $rows = [];

    while ($row = mysqli_fetch_assoc($result)) {
        $rows[] = $row;
    }

    mysqli_free_result($result);
    mysqli_close($conn);

    $limitedRows = array_slice($rows, 0, MYSQL_QUERY_MAX_ROWS);
    $truncated = count($rows) > MYSQL_QUERY_MAX_ROWS;
    $message = $truncated
        ? 'Se muestran ' . MYSQL_QUERY_MAX_ROWS . ' de ' . count($rows) . ' filas.'
        : count($limitedRows) . ' filas.';

    mysql_query_json(200, [
        'ok' => true,
        'columns' => $columns,
        'rows' => $limitedRows,
        'rowCount' => count($limitedRows),
        'truncated' => $truncated,
        'message' => $message,
    ]);
