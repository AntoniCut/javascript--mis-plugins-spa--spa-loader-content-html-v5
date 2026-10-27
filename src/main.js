/*
    *  ---------------------------------------  *
    *  -----  main.js  --  /src/main.js  -----  *
    *  ---------------------------------------  *
*/

import { effectLoadingPage } from './effects/effect-loading-page.js';
import { spa } from './spa/spa.js';


//  -----  lanzar el efecto de carga de la página  -----
effectLoadingPage();

//  -----  inicializar la spa con el plugin spa-loader-content-html  -----
spa();
