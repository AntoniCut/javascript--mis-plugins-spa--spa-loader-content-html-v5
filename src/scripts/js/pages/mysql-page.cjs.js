// @ts-nocheck
/*
    *  --------------------------------------------------------------------------  *
    *  -----  mysql-page.cjs.js  --  /src/scripts/js/pages/mysql-page.cjs.js  -----  *
    *  --------------------------------------------------------------------------  *
*/


(() => {

    /** @type {HTMLElement|null} - `aviso del script clásico` */
    const status = document.querySelector('[data-mysql-cjs-status]');

    //  -----  salir si el demo todavía no está en el DOM  -----
    if (!status)
        //  -----  no hay destino para el aviso  -----
        return;

    //  -----  confirmar que el script clásico ya se ejecutó  -----
    status.textContent = 'mysql-page.cjs.js cargado. La consulta la envía el módulo ESM.';

})();
