/*
    *  ---------------------------------------------------  *
    *  -----  addTsNoCheck.js  --  /addTsNoCheck.js  -----  *
    *  ---------------------------------------------------  *
*/

import fs from 'fs';
import path from 'path';


/** - `carpeta de scripts de página a la que se añade // @ts-nocheck` */
const targetDir = path.join(process.cwd(), 'src', 'scripts', 'js');



/**
 * ----------------------------------------
 * -----  `addNoCheckRecursive(dir)`  -----
 * ----------------------------------------
 * - Recorre una carpeta y añade `// @ts-nocheck` a los `.js` que aún no lo tienen.
 * @param {string} dir - Carpeta a recorrer.
 * @return {void}
 */
function addNoCheckRecursive(dir) {

    /** - `entradas de la carpeta (archivos y subcarpetas)` */
    const entries = fs.readdirSync(dir, { withFileTypes: true });


    //  -----  recorrer cada entrada de la carpeta  -----
    for (const entry of entries) {

        /** - `ruta completa de la entrada` */
        const fullPath = path.join(dir, entry.name);


        //  -----  si es una carpeta, recorrerla  -----
        if (entry.isDirectory()) {

            //  -----  recorrer subcarpetas  -----
            addNoCheckRecursive(fullPath);

        }
        //  -----  si es un archivo .js, comprobar su cabecera  -----
        else if (entry.isFile() && entry.name.endsWith('.js')) {

            /** - `contenido actual del archivo` */
            const content = fs.readFileSync(fullPath, 'utf8');


            //  -----  si no empieza por // @ts-nocheck, añadirlo  -----
            if (!content.startsWith('// @ts-nocheck')) {

                //  -----  escribir el archivo con la directiva al principio  -----
                fs.writeFileSync(fullPath, '// @ts-nocheck\n' + content, 'utf8');

                //  -----  avisar del archivo modificado  -----
                console.log(`Agregado //@ts-nocheck a: ${fullPath}`);
            }

        }

    }

}


//  -----  ejecutar el recorrido sobre la carpeta de scripts  -----
addNoCheckRecursive(targetDir);

//  -----  avisar de que el proceso ha terminado  -----
console.log('Proceso de addTsNoCheck completado.');
