import {
    gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_TEXTURE_MAG_FILTER, gl_TEXTURE_WRAP_S, gl_TEXTURE_WRAP_T, 
    gl_UNSIGNED_BYTE, gl_RGBA, gl_CLAMP_TO_EDGE, gl_NEAREST, gl_ARRAY_BUFFER, gl_STATIC_DRAW, gl_VERTEX_SHADER, 
    gl_FRAGMENT_SHADER, gl_BYTE, gl_TRIANGLES, gl_TEXTURE0, gl_FLOAT, gl_FRAMEBUFFER, gl_COLOR_ATTACHMENT0, gl_TEXTURE1 
} from "./glConsts";
import { renderSprite } from './sprite';
import { curLevelObjectData, loadLevelData, Vec2 } from './globals';
import { main_vert, main_frag } from './shaders.gen';
import { GameState } from "./state";

declare const DEBUG: boolean;
declare const C1: HTMLCanvasElement;
declare const g: WebGLRenderingContext;
declare const c: CanvasRenderingContext2D;
declare const k_fullWidth: number;
declare const k_fullHeight: number;
declare const k_baseScale: number;

let canTexS: WebGLTexture;
let canTexT: WebGLTexture;
let sampleTex: WebGLTexture;
let sampleFb: WebGLFramebuffer;
let fullScreenTriVertBuffer: WebGLBuffer;
let shader: WebGLProgram;

let greenGrad = c.createLinearGradient(-1, 0, 1, 0);
greenGrad.addColorStop(0, "#000");
greenGrad.addColorStop(1, "#0f0");
let blueGrad = c.createLinearGradient(0, -1, 0, 1);
blueGrad.addColorStop(0, "#000");
blueGrad.addColorStop(1, "#00f");

let messages = [
    'Use the arrows',
    'Use the ramp',
    'Use momentum',
    'Press down to become heavy',
    'Use the black hole',
];

export let worldSampleResult = new Float32Array(4);

export let initRender = (): void => {
    g.getExtension('OES_texture_float');

    canTexS = g.createTexture()!;
    g.bindTexture(gl_TEXTURE_2D, canTexS);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, k_fullWidth, k_fullHeight, 0, gl_RGBA, gl_UNSIGNED_BYTE, null);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_NEAREST);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_NEAREST); 
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_CLAMP_TO_EDGE);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_CLAMP_TO_EDGE);

    canTexT = g.createTexture()!;
    g.bindTexture(gl_TEXTURE_2D, canTexT);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, k_fullWidth, k_fullHeight, 0, gl_RGBA, gl_UNSIGNED_BYTE, null);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_NEAREST);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_NEAREST); 
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_CLAMP_TO_EDGE);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_CLAMP_TO_EDGE);

    sampleTex = g.createTexture()!;
    g.bindTexture(gl_TEXTURE_2D, sampleTex);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, 1, 1, 0, gl_RGBA, gl_FLOAT, null);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_NEAREST);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_NEAREST); 
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_CLAMP_TO_EDGE);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_CLAMP_TO_EDGE);

    sampleFb = g.createFramebuffer()!;
    g.bindFramebuffer( gl_FRAMEBUFFER, sampleFb );
    g.framebufferTexture2D( gl_FRAMEBUFFER, gl_COLOR_ATTACHMENT0, gl_TEXTURE_2D, sampleTex, 0 );

    fullScreenTriVertBuffer = g.createBuffer()!;
    g.bindBuffer( gl_ARRAY_BUFFER, fullScreenTriVertBuffer );
    g.bufferData( gl_ARRAY_BUFFER, Uint8Array.of(1, 1, 1, 128, 128, 1), gl_STATIC_DRAW );
};

export let loadLevel = (level: number): void => {
    loadLevelData( level );
    g.deleteProgram( shader );

    let vs = g.createShader( gl_VERTEX_SHADER )!;
    let fs = g.createShader( gl_FRAGMENT_SHADER )!;
    shader = g.createProgram()!;

    g.shaderSource( vs, main_vert );
    g.compileShader( vs );
    g.shaderSource( fs, 'precision highp float;'+main_frag.replace('M'+level,'M') );
    g.compileShader( fs );

    if( DEBUG )
    {
        let log = g.getShaderInfoLog(fs);
        if( log === null || log.length > 0 ) { 
            console.log( 'Shader info log:\n' + log );
            if( log !== null && log.indexOf('ERROR') >= 0 ) {
                console.error( main_frag.split('\n').map((x,i) => `${i+1}: ${x}`).join('\n') );
            }
        }
    }

    g.attachShader( shader, vs );
    g.attachShader( shader, fs );
    g.linkProgram( shader );
    g.deleteShader( fs );
    g.deleteShader( vs );

    g.useProgram(shader);
};

export let requestWorldSample = (pos: Vec2): void => {
    g.bindFramebuffer(gl_FRAMEBUFFER, sampleFb);

    g.bindTexture(gl_TEXTURE_2D, null);

    g.uniform4f(g.getUniformLocation(shader, 't'), pos[0], pos[1], 0, 0);

    g.bindBuffer( gl_ARRAY_BUFFER, fullScreenTriVertBuffer );
    let posLoc = g.getAttribLocation( shader, 'a' );
    g.enableVertexAttribArray( posLoc );
    g.vertexAttribPointer( posLoc, 2, gl_BYTE, false, 0, 0 );
    g.drawArrays( gl_TRIANGLES, 0, 3 );
};

export let readWorldSample = (): void =>
    g.readPixels(0, 0, 1, 1, gl_RGBA, gl_FLOAT, worldSampleResult);

export let renderState = (curLevel: number, state: GameState): void => {
    g.bindFramebuffer(gl_FRAMEBUFFER, null);

    c.fillStyle='#000';
    c.fillRect(0,0,k_fullWidth, k_fullHeight);

    let op = c.globalCompositeOperation;
    c.globalCompositeOperation = 'lighter'

    for( let i = 0; i < curLevelObjectData.length; ++i ) {
        let x = curLevelObjectData[i][1];
        let y = curLevelObjectData[i][2];

        let objScale = curLevelObjectData[i][0] == 1 ? 3 : 
            curLevelObjectData[i][0] == 2 ? curLevelObjectData[i][4] :
            1 ;

        c.save();
        c.translate(
            k_fullWidth/2 + (x - state.cameraPos[0]) * k_baseScale * state.cameraZoom,
            k_fullHeight/2 + (y - state.cameraPos[1]) * k_baseScale * state.cameraZoom
        );
        c.scale(k_baseScale * state.cameraZoom * objScale, k_baseScale * state.cameraZoom * objScale);

        let red: any = curLevelObjectData[i][0] ? 3 : 6;
        red = red.toString(16);
        c.fillStyle = `#${(red.length < 2 ? '0' : '') + red}0000`;
        c.fillRect(-1.1,-1.1,2.2,2.2);
        c.fillStyle = greenGrad;
        c.fillRect(-1.1,-1.1,2.2,2.2);
        c.fillStyle = blueGrad;
        c.fillRect(-1.1,-1.1,2.2,2.2);

        // Undo antialiasing
        c.clearRect(-1.2,-1.2,.2,2.4);
        c.clearRect(-1.2,-1.2,2.4,.2);
        c.clearRect(1,-1.2,.2,2.4);
        c.clearRect(-1.2,1,2.4,.2);

        c.restore();
    }

    g.activeTexture(gl_TEXTURE0);
    g.bindTexture(gl_TEXTURE_2D, canTexT);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, gl_RGBA, gl_UNSIGNED_BYTE, C1);

    c.globalCompositeOperation = op;

    c.fillStyle='#000';
    c.fillRect(0,0,k_fullWidth, k_fullHeight);

    renderSprite(state);

    if( messages[curLevel] ) {
        c.save();
        c.translate(
            k_fullWidth/2 + (0 - state.cameraPos[0]) * k_baseScale * state.cameraZoom,
            k_fullHeight/2 + (0 - state.cameraPos[1]) * k_baseScale * state.cameraZoom
        );
        c.scale(k_baseScale * state.cameraZoom, k_baseScale * state.cameraZoom);

        c.fillStyle = '#0f0';
        c.font = '2px sans-serif';
        c.fillText(messages[curLevel], -14, -7);

        c.restore();
    }

    g.activeTexture(gl_TEXTURE1);
    g.bindTexture(gl_TEXTURE_2D, canTexS);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, gl_RGBA, gl_UNSIGNED_BYTE, C1);

    g.uniform1i(g.getUniformLocation(shader, 'T'), 0);
    g.uniform1i(g.getUniformLocation(shader, 'S'), 1);
    g.uniform4f(g.getUniformLocation(shader, 't'), state.cameraPos[0], state.cameraPos[1], state.cameraZoom, state.tick);
    g.uniform4f(g.getUniformLocation(shader, 's'), state.playerPos[0], state.playerPos[1], state.fade, state.canBeDone);

    g.bindBuffer( gl_ARRAY_BUFFER, fullScreenTriVertBuffer );
    let posLoc = g.getAttribLocation( shader, 'a' );
    g.enableVertexAttribArray( posLoc );
    g.vertexAttribPointer( posLoc, 2, gl_BYTE, false, 0, 0 );
    g.drawArrays( gl_TRIANGLES, 0, 3 );
};
