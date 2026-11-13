# infra/ — configuración del servidor de PRODUCCIÓN

Todo lo que toca al servidor de producción vive acá. Nada de esto se
ejecuta en desarrollo: `server/` sigue siendo la zona dev.

```
infra/
├── nginx/            Bloque del sitio: estáticos + deny .env + PHP-FPM
├── php-fpm/          Notas operativas (dueño/permisos del .env)
└── provision/        Checklist ejecutable de provision del VPS
```

## Las tres zonas del proyecto

| Carpeta | Qué es | Cuándo corre |
|---|---|---|
| `server/` | runtime de desarrollo (Node, php-cgi, espejos de API) | solo local |
| `src/services/` | código de los endpoints (viaja en el build) | dev (php-cgi) y prod (PHP-FPM) |
| `infra/` | configuración del servidor de producción | solo en el VPS |

## Regla de ubicación de un servicio

- Lo usa UN proyecto → colocalizado en `src/services/` de ese proyecto.
- Lo usan DOS o más proyectos → repo `services/` a nivel dominio, con
  su propio `server/`, `src/` e `infra/`.
