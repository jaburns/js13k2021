#!/usr/bin/env node
const sh = require('shelljs');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const ShapeShifter = require('regpack/shapeShifter');
const advzipPath = require('advzip-bin');
const constantsJson = require('./src/constants.json');
const levelsJson = require('./src/levels.json');

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
            code = code.replace('__LEVELS__', levels);
            code = applyConstants( code );
            fs.writeFileSync( path.resolve( 'shadersTmp', x ), code );
        }
    });

    let noRenames = ['main', 'M'];
    for( let i = 0; i < 10; ++i ) {
        noRenames.push('M' + i);
    }

    run( MONO_RUN + 'tools/shader_minifier.exe --no-renaming-list '+noRenames.join(',')+' --format js -o build/shaders.js --preserve-externals '+(DEBUG ? '--preserve-all-globals' : '')+' shadersTmp/*' );
    let shaderCode = fs.readFileSync( 'build/shaders.js', 'utf8' ).replace(/\r/g, '');

    let shaderLines = shaderCode
        .split('\n')
        .map( x => x.replace(/^var/, 'export let'))

    for( let i = 0; i < shaderLines.length; ++i ){
        if( shaderLines[i].indexOf('float M(') >= 0 ) {
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

const compileLevelShader = (levelObjects, idx) => {
    const shapeFn = obj => {
        const num = x => {
            let ret = x.toString();
            if( ret.indexOf('.') < 0 ) ret += '.';
            let sp = ret.split('.');
            sp[1] = sp[1].substr(0,2);
            return sp.join('.');
        }
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
        `float M${idx}(vec2 p) {`,
        '    float d = -10000.;'
    ];

    levelObjects.sort((x,y) => x[1] - y[1]);
    levelObjects.forEach(obj => {
        if( obj[1] ) {
            lines.push(`    d = roundMerge(d, ${shapeFn(obj)});`);
        } else {
            lines.push(`    d = max(d, -${shapeFn(obj)});`);
        }
    });

    lines.push('    return -1.-d;');
    lines.push('}');

    return lines.join('\n');
}

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
    run( 'rollup -c' + ( DEBUG ? ' --config-debug' : '' ));

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
