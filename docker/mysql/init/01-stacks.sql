-- base javascript_mis_plugins_spa, creada por MYSQL_DATABASE en el primer arranque
-- el cliente de docker lee el fichero como utf8mb4

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS stacks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    path VARCHAR(255) NOT NULL,
    sort_order INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_stacks_slug (slug),
    UNIQUE KEY uq_stacks_path (path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO stacks (slug, title, path, sort_order) VALUES
    ('html', 'HTML5 — HyperText Markup Language', 'stack/html-page', 1),
    ('css', 'CSS3 — Cascading Style Sheets', 'stack/css-page', 2),
    ('javascript', 'JavaScript ES6+ — El Lenguaje de la Web', 'stack/javascript-page', 3),
    ('jquery', 'jQuery — The Write Less, Do More Library', 'stack/jquery-page', 4),
    ('jquery-ui', 'jQuery UI — Interactions, Widgets & Effects', 'stack/jquery-ui-page', 5),
    ('react', 'React — Biblioteca UI Declarativa', 'stack/react-page', 6),
    ('astro', 'Astro — Framework de Sitios Estáticos', 'stack/astro-page', 7);
