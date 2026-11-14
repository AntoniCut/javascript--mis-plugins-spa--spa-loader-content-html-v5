#!/usr/bin/env bash
# ==============================================================
#  provision-vps.sh — provision del VPS para PHP y el API Node
#  --------------------------------------------------------------
#  Checklist ejecutable (NO es idempotente al 100%): instala lo
#  que necesita el backend de producción y deja el nginx listo.
#
#  USO (en el VPS, como root, desde el checkout del repo):
#      bash infra/provision/provision-vps.sh
#
#  Revisar antes de ejecutar:
#  - RUTA_NGINX: dónde vive la config del sitio.
#  - La versión de PHP (php8.3-fpm en este VPS).
#  - El script lee infra/systemd/ e infra/nginx/ del repo.
#  - NO instala ni reemplaza el motor de base de datos: en un VPS con
#    bases existentes, instalar mariadb-server puede eliminar MySQL y
#    mover el datadir. Ese paso se hace a mano.
# ==============================================================
set -euo pipefail

# ---- configuración local del VPS ----
RUTA_NGINX="/etc/nginx/sites-available/javascript.antonydev.tech"
API_NODE_DIR="/opt/javascript-node-api"

# ---- rutas del repo ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Actualizando índices de apt..."
apt-get update -y

echo "==> Instalando PHP-FPM, extensión MySQL y curl (si no están)..."
apt-get install -y php8.3-fpm php8.3-mysql curl

echo "==> Habilitando y arrancando PHP-FPM..."
systemctl enable --now php8.3-fpm

echo "==> Verificando el motor de base de datos (no se instala ni se reemplaza)..."
if command -v mysqld >/dev/null 2>&1; then
  systemctl enable --now mysql
elif command -v mariadbd >/dev/null 2>&1; then
  systemctl enable --now mariadb
else
  echo "AVISO: no hay MySQL ni MariaDB instalado. Instalá y configurá la base a mano;"
  echo "       este script no reemplaza motores ni inicializa datadirs."
fi

echo "==> Verificando el socket de PHP-FPM..."
if [ ! -S /run/php/php8.3-fpm.sock ]; then
  echo "AVISO: no aparece /run/php/php8.3-fpm.sock. Revisar systemctl status php8.3-fpm"
fi

echo "==> Instalando Node 24 (si no está)..."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"

if [ "$NODE_MAJOR" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi

echo "==> Habilitando pnpm con corepack..."
corepack enable
corepack prepare pnpm@latest --activate

echo "==> Creando el directorio del API Node..."
install -d -o www-data -g www-data -m 755 "$API_NODE_DIR"

echo "==> Instalando la unit de systemd del API Node..."
install -m 644 "$INFRA_DIR/systemd/javascript-node.service" /etc/systemd/system/javascript-node.service
systemctl daemon-reload
systemctl enable javascript-node

echo "==> Recordatorio manual (no automatizado):"
echo "    1. Crear la base y el usuario MySQL del sitio (MYSQL_* del .env de producción)."
echo "    2. Copiar infra/nginx/*.conf a $RUTA_NGINX (el fragmento del API va DENTRO del server {}) y recargar nginx (nginx -t && systemctl reload nginx)."
echo "    3. Añadir el bloque de \`location ~ /\.env { deny all; }\` si el sitio ya estaba publicado."
echo "    4. Subir .env.production y api/ con deploy.sh; el deploy arranca javascript-node."
echo "    5. Verificar: systemctl is-active javascript-node y curl https://javascript.antonydev.tech/api/health."

echo "==> Provision completada."
