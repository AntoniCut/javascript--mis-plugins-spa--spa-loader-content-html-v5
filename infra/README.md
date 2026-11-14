# infra/ — configuración del servidor de PRODUCCIÓN

Todo lo que toca al servidor de producción vive acá. Nada de esto se
ejecuta en desarrollo: `server/` sigue siendo la zona dev.

```
infra/
├── nginx/            Fragmentos del sitio: estáticos + deny .env + PHP-FPM y /api Node
├── php-fpm/          Notas operativas (dueño/permisos del .env)
├── systemd/          Unit del API Node (javascript-node.service)
└── provision/        Checklist ejecutable de provision del VPS
```

## Las cuatro zonas del proyecto

| Carpeta | Qué es | Cuándo corre |
|---|---|---|
| `api/` | runtime Node: router compartido, servidor standalone y dependencias propias | dev (dev server) y prod (systemd `javascript-node`) |
| `server/` | runtime de desarrollo (Node, php-cgi, montaje de `/api`) | solo local |
| `src/services/` | código de los endpoints (viaja en el build) | dev (php-cgi) y prod (PHP-FPM) |
| `infra/` | configuración del servidor de producción | solo en el VPS |

## API Node en producción

- Código en `/opt/javascript-node-api`, fuera del web root, desplegado por `deploy.sh`.
- `systemd/javascript-node.service`: corre como `www-data`, `Restart=on-failure`,
  logs a journald (`journalctl -u javascript-node`).
- `nginx/javascript.antonydev.tech-api.conf`: `location ^~ /api/` con
  `proxy_pass http://127.0.0.1:3100/`; la barra final quita el prefijo `/api/`.
- El `.env` del API vive en `/opt/javascript-node-api/.env`, `root:www-data 640`,
  y reutiliza las `MYSQL_*` de `.env.production`.
- La provisión instala Node 24 + corepack/pnpm, crea `/opt/javascript-node-api` y
  **habilita** la unit; el arranque lo hace el deploy.

## Regla de ubicación de un servicio

- Lo usa UN proyecto → colocalizado: `src/services/` para PHP y `api/` para Node.
- Lo usan DOS o más proyectos → repo `services/` a nivel dominio, con
  su propio `server/`, `src/` e `infra/`.
