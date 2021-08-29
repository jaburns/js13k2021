import { gl_COLOR_BUFFER_BIT, gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_TEXTURE_MAG_FILTER, gl_TEXTURE_WRAP_S, gl_TEXTURE_WRAP_T, gl_UNSIGNED_BYTE, gl_RGBA, gl_CLAMP_TO_EDGE, gl_NEAREST, gl_ARRAY_BUFFER, gl_STATIC_DRAW, gl_VERTEX_SHADER, gl_FRAGMENT_SHADER, gl_BYTE, gl_TRIANGLES, gl_TEXTURE0, gl_LINEAR } from "./glConsts";
import { renderSprite } from './sprite';
import { WIDTH, HEIGHT, TICK_MS } from './globals';
import { main_vert, main_frag } from './shaders.gen';

declare const DEBUG: boolean;
declare const C1: HTMLCanvasElement;
declare const g: WebGLRenderingContext;
declare const c: CanvasRenderingContext2D;

// if( DEBUG ) {
//     console.log('hello debug');
// } else {
//     console.log('hello release');
// }

let canTex = g.createTexture()!;
g.bindTexture(gl_TEXTURE_2D, canTex);
g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, WIDTH, HEIGHT, 0, gl_RGBA, gl_UNSIGNED_BYTE, null);
g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_LINEAR);
g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_LINEAR); 
g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_CLAMP_TO_EDGE);
g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_CLAMP_TO_EDGE);

let fullScreenTriVertBuffer = g.createBuffer()!;
g.bindBuffer( gl_ARRAY_BUFFER, fullScreenTriVertBuffer );
g.bufferData( gl_ARRAY_BUFFER, Uint8Array.of(1, 1, 1, 128, 128, 1), gl_STATIC_DRAW );

const vs = g.createShader( gl_VERTEX_SHADER )!;
const fs = g.createShader( gl_FRAGMENT_SHADER )!;
const ss = g.createProgram()!;

g.shaderSource( vs, main_vert );
g.compileShader( vs );
g.shaderSource( fs, 'precision highp float;'+main_frag );
g.compileShader( fs );

if( DEBUG )
{
    let log = g.getShaderInfoLog(fs);
    if( log === null || log.length > 0 && log.indexOf('ERROR') >= 0 )
        console.error( 'Shader error', log, main_frag );
}

g.attachShader( ss, vs );
g.attachShader( ss, fs );
g.linkProgram( ss );

g.viewport(0,0,WIDTH,HEIGHT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);

let x = 0;
let accTime = 0;
let fullTime = 0;
let prevNow = performance.now();

let tick = () => {
    c.clearRect(0,0,WIDTH,HEIGHT);
    renderSprite(Math.min(x, 17));

    if( ++x > 30 )
        x = 0;
};

let frame = () => {
    requestAnimationFrame(frame);

    let newNow = performance.now();
    let dt = Math.min( newNow - prevNow, 1000 );
    accTime += dt;
    fullTime += dt/500;
    prevNow = newNow;

    while( accTime > TICK_MS ) {
        accTime -= TICK_MS;
        tick();
    }

    g.useProgram(ss);

    g.activeTexture(gl_TEXTURE0);
    g.bindTexture(gl_TEXTURE_2D, canTex);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, gl_RGBA, gl_UNSIGNED_BYTE, C1);
    g.uniform1i(g.getUniformLocation(ss, 'T'), 0);
    g.uniform1f(g.getUniformLocation(ss, 't'), fullTime);

    g.bindBuffer( gl_ARRAY_BUFFER, fullScreenTriVertBuffer );
    let posLoc = g.getAttribLocation( ss, 'a_position' );
    g.enableVertexAttribArray( posLoc );
    g.vertexAttribPointer( posLoc, 2, gl_BYTE, false, 0, 0 );
    g.drawArrays( gl_TRIANGLES, 0, 3 );
};

frame();
