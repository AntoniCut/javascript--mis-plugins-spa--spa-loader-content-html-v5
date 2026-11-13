/*
    *  -----------------------------------------------------------  *
    *  -----  gulp-terser.d.ts  --  /types/gulp-terser.d.ts  -----  *
    *  -----------------------------------------------------------  *
*/

//  -----  gulp-terser no publica tipos propios  -----
declare module 'gulp-terser' {

    //  -----  plugin de gulp: transforma vinyl y devuelve un stream  -----
    const terser: (options?: Record<string, unknown>) => NodeJS.ReadWriteStream;

    //  -----  export por defecto del plugin  -----
    export default terser;
}
