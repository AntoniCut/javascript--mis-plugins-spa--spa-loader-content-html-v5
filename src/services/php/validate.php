<?php

    /*
        *  --------------------------------------------------------------  *
        *  -----  validate.php  --  /src/services/php/validate.php  -----  *
        *  --------------------------------------------------------------  *
        *                                                                  *
        *  - POST JSON { name, email, message } y respuesta JSON.          *
        *  - Valida el formulario en el servidor y normaliza los datos.    *
        *  - Sin base de datos, sin .env y sin dependencias.               *
        *                                                                  *
    */


    /** - `tamano maximo del cuerpo json en bytes` */
    const PHP_VALIDATE_MAX_BODY = 16384;

    /** - `longitud minima del nombre` */
    const PHP_VALIDATE_NAME_MIN = 2;

    /** - `longitud maxima del nombre` */
    const PHP_VALIDATE_NAME_MAX = 60;

    /** - `longitud minima del mensaje` */
    const PHP_VALIDATE_MESSAGE_MIN = 10;

    /** - `longitud maxima del mensaje` */
    const PHP_VALIDATE_MESSAGE_MAX = 500;


    /**
     * ----------------------------------------------------
     * -----  `php_validate_json($status, $payload)`  -----
     * ----------------------------------------------------
     * - Envia JSON y termina.
     * @param int $status
     * @param array<string, mixed> $payload
     * @return never
     */
    function php_validate_json(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }


    /**
     * --------------------------------------------------
     * -----  `php_validate_value($payload, $key)`  -----
     * --------------------------------------------------
     * - Devuelve el valor de texto de un campo, o cadena vacia.
     * @param array<string, mixed> $payload
     * @param string $key
     * @return string
     */
    function php_validate_value(array $payload, string $key): string
    {
        if (!isset($payload[$key]) || !is_string($payload[$key])) {
            return '';
        }

        return $payload[$key];
    }


    /**
     * ----------------------------------------------
     * -----  `php_validate_normalize($value)`  -----
     * ----------------------------------------------
     * - Recorta, colapsa espacios internos y quita caracteres de control.
     * @param string $value
     * @return string
     */
    function php_validate_normalize(string $value): string
    {
        //  -----  quitar los espacios de los extremos  -----
        $text = trim($value);

        //  -----  colapsar cualquier espacio interno en un solo espacio  -----
        $text = (string) preg_replace('/\s+/u', ' ', $text);

        //  -----  eliminar caracteres de control que no son espacios  -----
        $text = (string) preg_replace('/[\x00-\x1F\x7F]/u', '', $text);

        return trim($text);
    }


    /**
     * ------------------------------------------
     * -----  `php_validate_length($text)`  -----
     * ------------------------------------------
     * - Cuenta caracteres utf-8; usa strlen si la extension no responde.
     * @param string $text
     * @return int
     */
    function php_validate_length(string $text): int
    {
        //  -----  contar caracteres completos, no bytes  -----
        $count = preg_match_all('/./us', $text, $matches);

        if (is_int($count)) {
            return $count;
        }

        //  -----  respaldo cuando la expresion regular falla  -----
        return strlen($text);
    }


    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        php_validate_json(405, [
            'ok' => false,
            'message' => 'Solo se admite POST.',
        ]);
    }

    $rawBody = file_get_contents('php://input', false, null, 0, PHP_VALIDATE_MAX_BODY);
    $decoded = json_decode(is_string($rawBody) ? $rawBody : '');

    if (!($decoded instanceof stdClass)) {
        php_validate_json(400, [
            'ok' => false,
            'message' => 'La petición no es un JSON válido.',
        ]);
    }

    /** @var array<string, mixed> $payload - `cuerpo json ya decodificado` */
    $payload = get_object_vars($decoded);

    $name = php_validate_normalize(php_validate_value($payload, 'name'));
    $email = php_validate_normalize(php_validate_value($payload, 'email'));
    $message = php_validate_normalize(php_validate_value($payload, 'message'));

    $nameLength = php_validate_length($name);
    $messageLength = php_validate_length($message);

    /** @var array<string, string> $errors - `errores por campo` */
    $errors = [];

    if ($name === '') {
        $errors['name'] = 'Escribe tu nombre.';
    } elseif ($nameLength < PHP_VALIDATE_NAME_MIN || $nameLength > PHP_VALIDATE_NAME_MAX) {
        $errors['name'] = 'El nombre debe tener entre 2 y 60 caracteres.';
    }

    if ($email === '') {
        $errors['email'] = 'Escribe tu correo.';
    } elseif (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        $errors['email'] = 'El correo no tiene un formato válido.';
    }

    if ($message === '') {
        $errors['message'] = 'Escribe tu mensaje.';
    } elseif ($messageLength < PHP_VALIDATE_MESSAGE_MIN || $messageLength > PHP_VALIDATE_MESSAGE_MAX) {
        $errors['message'] = 'El mensaje debe tener entre 10 y 500 caracteres.';
    }

    if ($errors !== []) {
        php_validate_json(422, [
            'ok' => false,
            'message' => 'Revisá los campos marcados.',
            'errors' => $errors,
        ]);
    }

    php_validate_json(200, [
        'ok' => true,
        'message' => 'El servidor validó y normalizó los datos.',
        'data' => [
            'name' => $name,
            'email' => $email,
            'message' => $message,
        ],
        'serverTime' => gmdate('c'),
        'runtime' => 'PHP ' . PHP_VERSION,
    ]);
