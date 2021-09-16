#!/usr/bin/env node
const sh = require('shelljs');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const ShapeShifter = require('regpack/shapeShifter');
const advzipPath = require('advzip-bin');
const constantsJson = require('./src/constants.json');
const levelsJson = [
    require('./levels/level0.json'),
    require('./levels/level1.json'),
    require('./levels/level2.json'),
    require('./levels/level3.json'),
    require('./levels/level4.json'),
    require('./levels/level5.json'),
    require('./levels/level6.json'),
    require('./levels/level7.json'),
    require('./levels/level8.json'),
    require('./levels/level9.json'),
    require('./levels/level10.json'),
    require('./levels/level11.json'),
    require('./levels/level12.json'),
    require('./levels/level13.json'),
    require('./levels/level14.json'),
    require('./levels/level15.json'),
    require('./levels/level16.json'),
    require('./levels/level17.json'),
    require('./levels/level18.json'),
];

const DEBUG = process.argv.indexOf('--debug') >= 0;
const MONO_RUN = process.platform === 'win32' ? '' : 'mono ';

const run = cmd =>
{
    const code = sh.exec( cmd ).code;
    if( code !== 0 )
        process.exit( code );
};

const replaceSimple = (x, y, z) =>
{
    const idx = x.indexOf( y );
    if( idx < 0 ) return x;
    return x.substr( 0, idx ) + z + x.substr( idx + y.length );
};

const applyConstants = code =>
{
    for( let k in constantsJson )
        code = code.replace( new RegExp( k, 'g' ), constantsJson[k] );
    return code;
}

const hashIdentifiers = js =>
{
    const varsNotReassigned = ['C0','C1','g','c'];

    js = new ShapeShifter().preprocess(js, {
        hashWebGLContext: true,
        contextVariableName: 'g',
        contextType: 1,
        reassignVars: true,
        varsNotReassigned,
        useES6: true,
    })[2].contents;

    js = js.replace('for(', 'for(let ');

    js = new ShapeShifter().preprocess(js, {
        hash2DContext: true,
        contextVariableName: 'c',
        contextType: 0,
        reassignVars: true,
        varsNotReassigned,
        useES6: true,
    })[2].contents;

    js = js.replace('for(', 'for(let ');

    return js;
};

const generateShaderFile = () =>
{
    const levels = levelsJson.map(compileLevelShader).join('\n');

    sh.mkdir( '-p', 'shadersTmp' );
    sh.ls( 'src' ).forEach( x =>
    {
        if( x.endsWith('.frag') || x.endsWith('.vert'))
        {
            let code = fs.readFileSync( path.resolve( 'src', x ), 'utf8' );
            code = code.replace('__LEVELS_GLSL__', levels);
            code = applyConstants( code );
            fs.writeFileSync( path.resolve( 'shadersTmp', x ), code );
        }
    });

    let noRenames = ['main', 'M'];
    for( let i = 0; i < 36; ++i ) {
        noRenames.push('M' + i.toString(36).toUpperCase());
    }

    run( MONO_RUN + 'tools/shader_minifier.exe --no-renaming-list '+noRenames.join(',')+' --format js -o build/shaders.js --preserve-externals '+(DEBUG ? '--preserve-all-globals' : '')+' shadersTmp/*' );
    let shaderCode = fs.readFileSync( 'build/shaders.js', 'utf8' ).replace(/\r/g, '');

    let shaderLines = shaderCode
        .split('\n')
        .map( x => x.replace(/^var/, 'export let'))

    for( let i = 0; i < shaderLines.length; ++i ){
        if( shaderLines[i].indexOf('vec2 M(') >= 0 ) {
            shaderLines.splice(i, 4);
            break;
        }
    }

    shaderCode = shaderLines.join('\n');

    if( DEBUG )
        shaderCode = shaderCode.replace(/" \+/g, '\\n" +');

    fs.writeFileSync( 'src/shaders.gen.ts', shaderCode );

    sh.rm( '-rf', 'shadersTmp' );
};

const shortenNumber = (x, glsl) => {
    let ret = x.toString();
    if( ret.indexOf('.') < 0 ) {
        if( glsl ) ret += '.';
        else return ret;
    }
    let sp = ret.split('.');
    sp[1] = sp[1].substr(0,2);
    return sp.join('.');
}

const compileLevelShader = (levelObjects, idx) => {
    const shapeFn = obj => {
        const num = x => shortenNumber(x, true);
        if( obj[0] == 0 ) {
            return `sdCircle(p, ${num(obj[2])}, ${num(obj[3])}, ${num(obj[4])})`;
        }
        else if( obj[0] == 1 ) {
            return `sdCapsule(p, ${num(obj[2])}, ${num(obj[3])}, ${num(obj[4])}, ${num(obj[5])}, ${num(obj[6])}, ${num(obj[7])})`;
        }
        else if( obj[0] == 2 ) {
            return `sdRotatedBox(p, ${num(obj[2])}, ${num(obj[3])}, ${num(obj[4])}, ${num(obj[5])}, ${num(obj[6])})`;
        }
    };

    const lines = [
        `vec2 M${idx.toString(36).toUpperCase()}(vec2 p) {`,
        '    vec2 d = vec2(-10000);'
    ];

    let comp = 'x';

    levelObjects.sort((x,y) => x[1] - y[1]);
    levelObjects.forEach(obj => {
        if( obj[0] === 3 ) return; // 3 is item
        if( obj[0] < 0 ) {
            obj[0] = -1 - obj[0];
            comp = 'y';
        } else {
            comp = 'x';
        }
        if( obj[1] === 1 ) {
            lines.push(`    d.${comp} = roundMerge(d.${comp}, ${shapeFn(obj)});`);
        } else {
            lines.push(`    d.${comp} = max(d.${comp}, -${shapeFn(obj)});`);
        }
    });

    lines.push('    return -1.-d;');
    lines.push('}');

    return lines.join('\n');
}

const getLevelsJs = () =>
    levelsJson.map( x =>
        x.filter( y => y[0] === 3 )
        .map( y => {
            const ret = y.map( z => shortenNumber(z, false));
            ret.shift();
            return ret;
        })
    );

const filterHtmlDebugReleaseLine = line => !(
    DEBUG && line.indexOf('RELEASE') > 0 ||
    !DEBUG && line.indexOf('DEBUG') > 0
);

const wrapWithHTML = js =>
{
    let htmlTemplate = fs.readFileSync( 'src/index.html', 'utf8' );

    htmlTemplate = htmlTemplate
        .split('\n')
        .filter( filterHtmlDebugReleaseLine )
        .map( line => line.replace(/<!--.*?-->/g, '').trim() )
        .join( DEBUG ? '\n' : '' )
        .trim();

    return replaceSimple(htmlTemplate, '__CODE__', js.trim());
};

const main = () =>
{
    sh.cd( __dirname );
    sh.mkdir( '-p', 'build' );

    console.log('Minifying shaders...');
    generateShaderFile();

    console.log('Compiling typescript...');
    run( 'tsc --outDir build' );

    console.log('Rolling up bundle...');
    const levelsJs = JSON.stringify(getLevelsJs()).replace(/"/g, '');
    run( 'rollup -c' + ( DEBUG ? ' --config-debug' : '' ) + ' --config-levels-js ' + levelsJs);

    let x = fs.readFileSync('build/bundle.js', 'utf8');
    if( !DEBUG ) x = hashIdentifiers( x, true );

    if( !DEBUG && x.indexOf('const ') > 0 )
        console.warn('\n    WARNING: "const" appears in packed JS\n');

    x = wrapWithHTML( x );
    x = applyConstants( x );
    fs.writeFileSync( 'build/index.html', x );

    if( !DEBUG )
    {
        run( advzipPath + ' --shrink-insane -i 10 -a out.zip build/index.html' );

        const zipStat = fs.statSync('out.zip');
        const percent = Math.floor((zipStat.size / 13312) * 100);
        console.log(''); 
        console.log(`  Final bundle size: ${zipStat.size} / 13312 bytes (${percent} %)`);
        console.log(''); 
    }
};

main();
