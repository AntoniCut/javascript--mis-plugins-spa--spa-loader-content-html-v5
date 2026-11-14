// @ts-nocheck
/*
    *  ------------------------------------------------------------------------  *
    *  -----  php-page.cjs.js  --  /src/scripts/js/pages/php-page.cjs.js  -----  *
    *  ------------------------------------------------------------------------  *
*/


(() => {

    /** @type {HTMLElement|null} - `aviso del script clásico` */
    const status = document.querySelector('[data-php-cjs-status]');

    //  -----  salir si el demo todavía no está en el DOM  -----
    if (!status)
        //  -----  no hay destino para el aviso  -----
        return;

    //  -----  confirmar que el script clásico ya se ejecutó  -----
    status.textContent = 'php-page.cjs.js cargado. El formulario lo envía el módulo ESM.';

})();
