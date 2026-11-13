#!/usr/bin/env bash
# ==============================================================
#  provision-vps.sh — provision del VPS para los servicios PHP
#  --------------------------------------------------------------
#  Checklist ejecutable (NO es idempotente al 100%): instala lo
#  que necesita el backend de producción y deja el nginx listo.
#
#  USO (en el VPS, como root):
#      bash provision-vps.sh
#
#  Revisar antes de ejecutar:
#  - RUTA_NGINX: dónde vive la config del sitio.
#  - La versión de PHP (php8.3-fpm en este VPS).
# ==============================================================
set -euo pipefail

# ---- configuración local del VPS ----
RUTA_NGINX="/etc/nginx/sites-available/javascript.antonydev.tech"

echo "==> Actualizando índices de apt..."
apt-get update -y

echo "==> Instalando PHP-FPM, extensión MySQL y MariaDB (si no están)..."
apt-get install -y php8.3-fpm php8.3-mysql mariadb-server

echo "==> Habilitando y arrancando servicios..."
systemctl enable --now php8.3-fpm
systemctl enable --now mariadb

echo "==> Verificando el socket de PHP-FPM..."
if [ ! -S /run/php/php8.3-fpm.sock ]; then
  echo "AVISO: no aparece /run/php/php8.3-fpm.sock. Revisar systemctl status php8.3-fpm"
fi

echo "==> Recordatorio manual (no automatizado):"
echo "    1. Crear la base y el usuario MySQL del sitio (MYSQL_* del .env de producción)."
echo "    2. Copiar infra/nginx/*.conf a $RUTA_NGINX y recargar nginx (nginx -t && systemctl reload nginx)."
echo "    3. Añadir el bloque de `location ~ /\.env { deny all; }` si el sitio ya estaba publicado."
echo "    4. Subir .env.production con deploy.sh y verificar F640 root:www-data."

echo "==> Provision completada."
