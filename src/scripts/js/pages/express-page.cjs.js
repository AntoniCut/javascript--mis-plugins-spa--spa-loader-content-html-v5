// @ts-nocheck
/*
    *  --------------------------------------------------------------------------------  *
    *  -----  express-page.cjs.js  --  /src/scripts/js/pages/express-page.cjs.js  -----  *
    *  --------------------------------------------------------------------------------  *
*/


(() => {

    /** @type {HTMLElement|null} - `aviso del script clásico` */
    const status = document.querySelector('[data-express-cjs-status]');

    //  -----  salir si el demo todavía no está en el DOM  -----
    if (!status)
        //  -----  no hay destino para el aviso  -----
        return;

    //  -----  confirmar que el script clásico ya se ejecutó  -----
    status.textContent = 'express-page.cjs.js cargado. El CRUD lo envía el módulo ESM.';

})();
