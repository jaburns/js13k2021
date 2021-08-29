#!/usr/bin/env node
const sh = require('shelljs');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const ShapeShifter = require('regpack/shapeShifter');
const advzipPath = require('advzip-bin');

const DEBUG = process.argv.indexOf('--debug') >= 0;
const MONO_RUN = process.platform === 'win32' ? '' : 'mono ';

const g_shaderExternalNameMap = {};

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

const hashIdentifiers = js =>
{
    let result = new ShapeShifter().preprocess(js, {
        hashWebGLContext: true,
        contextVariableName: 'g',
        contextType: 1,
        reassignVars: true,
        varsNotReassigned: ['C0','C1','g','c'],
        useES6: true,
    })[2].contents;

    result = result.replace('for(', 'for(let ');

    result = new ShapeShifter().preprocess(result, {
        hash2DContext: true,
        contextVariableName: 'c',
        contextType: 0,
        reassignVars: true,
        varsNotReassigned: ['C0','C1','g','c'],
        useES6: true,
    })[2].contents;

    result = result.replace('for(', 'for(let ');

    return result;
};

const buildShaderExternalNameMap = shaderCode =>
{
    let i = 0;
    _.uniq( shaderCode.match(/[vau]_[a-zA-Z0-9]+/g) )
        .forEach( x => g_shaderExternalNameMap[x] = `x${i++}` );
};

const minifyShaderExternalNames = code =>
{
    for( let k in g_shaderExternalNameMap )
        code = code.replace( new RegExp( k, 'g' ), g_shaderExternalNameMap[k] );

    return code;
};

const generateShaderFile = () =>
{
    sh.mkdir( '-p', 'shadersTmp' );
    sh.ls( 'src' ).forEach( x =>
    {
        if( x.endsWith('.frag') || x.endsWith('.vert'))
        {
            const code = fs.readFileSync( path.resolve( 'src', x ), 'utf8' );
            fs.writeFileSync( path.resolve( 'shadersTmp', x ), code );
        }
    });

    let noRenames = ['main'];

    run( MONO_RUN + 'tools/shader_minifier.exe --no-renaming-list '+noRenames.join(',')+' --format js -o build/shaders.js --preserve-externals '+(DEBUG ? '--preserve-all-globals' : '')+' shadersTmp/*' );
    let shaderCode = fs.readFileSync( 'build/shaders.js', 'utf8' );
    buildShaderExternalNameMap( shaderCode );
    shaderCode = minifyShaderExternalNames( shaderCode );

    shaderCode = shaderCode
        .split('\n')
        .map( x => x.replace(/^var/, 'export let'))
        .join('\n');

    if( DEBUG )
        shaderCode = shaderCode.replace(/" \+/g, '\\n" +');

    fs.writeFileSync( 'src/shaders.gen.ts', shaderCode );

    sh.rm( '-rf', 'shadersTmp' );
};

const wrapWithHTML = js =>
{
    let htmlTemplate = fs.readFileSync( DEBUG ? 'src/index.debug.html' : 'src/index.release.html', 'utf8' );

    if( !DEBUG ) htmlTemplate = htmlTemplate
        .split('\n')
        .map( line => line.trim() )
        .join('')
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
    x = minifyShaderExternalNames( x );
    if( !DEBUG ) x = hashIdentifiers( x, true );
    //x = x.replace(/const /g, 'let ');
    x = wrapWithHTML( x );
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
