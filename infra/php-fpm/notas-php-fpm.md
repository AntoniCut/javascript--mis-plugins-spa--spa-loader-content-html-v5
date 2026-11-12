# PHP-FPM — notas de producción (spa-loader-content-html-v5)

Resumen operativo de cómo PHP-FPM debe leer el `.env` en el VPS. No es
configuración de pool: es la checklist que evita el fallo clásico de
`Access denied` con MySQL.

## Dueño y permisos del .env

- PHP-FPM corre como `www-data`. El `.env` debe ser legible por ese usuario.
- El `deploy.sh` sube `.env.production` como `.env` con `--chmod=F640`
  (dueño root, grupo www-data). Así PHP-FPM lo lee y nadie más.
- Si el archivo queda `root:root 600`, PHP-FPM lo ignora: no ve
  `MYSQL_PORT` y cae al puerto por defecto. En el VPS nadie escucha ahí
  y MySQL responde `Connection refused`.

## Variables que lee el endpoint

`src/services/mysql/query.php` acepta `MYSQL_*` con fallback a `DB_*`:

- `MYSQL_HOST` / `DB_HOST` (default `127.0.0.1`)
- `MYSQL_PORT` / `DB_PORT` (default `3308`)
- `MYSQL_USER` / `DB_USER` (default `javascript_user`)
- `MYSQL_DATABASE` / `DB_NAME` (default `javascript_mis_plugins_spa`)
- `MYSQL_PASSWORD` / `DB_PASS`

En producción esas variables viven en el `.env` del directorio del sitio
y las carga `src/services/load-env.php` subiendo carpetas.

## Puerto de producción

El default local es `3308` (para no pisar los contenedores Docker de los
proyectos jQuery). En el VPS el puerto real es el de MariaDB; se define
con `MYSQL_PORT` en el `.env` de producción.
