import {
    gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_TEXTURE_MAG_FILTER, gl_TEXTURE_WRAP_S, gl_TEXTURE_WRAP_T, 
    gl_UNSIGNED_BYTE, gl_RGBA, gl_CLAMP_TO_EDGE, gl_NEAREST, gl_ARRAY_BUFFER, gl_STATIC_DRAW, gl_VERTEX_SHADER, 
    gl_FRAGMENT_SHADER, gl_BYTE, gl_TRIANGLES, gl_TEXTURE0, gl_FLOAT, gl_FRAMEBUFFER, gl_TEXTURE1, gl_REPEAT, gl_COLOR_ATTACHMENT0, gl_TEXTURE2, gl_TEXTURE3, gl_TEXTURE4, gl_LINEAR 
} from "./glConsts";
import { renderSprite } from './sprite';
import { curLevelObjectData, loadLevelData, ticksToTime, Vec2 } from './globals';
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
let bgTex0: WebGLTexture;
let bgTex1: WebGLTexture;
let bgTex2: WebGLTexture;
let fullScreenTriVertBuffer: WebGLBuffer;
let shader: WebGLProgram;
let levelShaders: WebGLProgram[] = [];

let greenGrad = c.createLinearGradient(-1, 0, 1, 0);
greenGrad.addColorStop(0, "#000");
greenGrad.addColorStop(1, "#0f0");
let blueGrad = c.createLinearGradient(0, -1, 0, 1);
blueGrad.addColorStop(0, "#000");
blueGrad.addColorStop(1, "#00f");

let messages = [
    'Click to play',
    'Use the arrows',
    'Use the ramp',
    'Use momentum',
    'Press down to become heavy',
    'Press R to restart','','',
    'Use the black hole','','','','','','',
    'Use the rubber block',
];

let hueForLevel = (level: number): number => {
    if( level == 0 ) level = 1;
    level -= 1;
    let world = (level / 7)|0;
    level %= 7;
    return ( 0.85 - 0.25*world + 0.1*(level/7) ) % 1;
};

let hue2rgb = (p: number, q: number, t: number) => {
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    return t < 1/6 ? p + (q - p) * 6 * t :
           t < 1/2 ? q :
           t < 2/3 ? p + (q - p) * (2/3 - t) * 6 :
           p;
};

let hslToRgb = (h: number, s: number, l: number) => {
    let r, g, b;
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r,g,b,0];
}

export let worldSampleResult = new Float32Array(8);

let compileShader = (frag: string): WebGLProgram => {
    let vs = g.createShader( gl_VERTEX_SHADER )!;
    let fs = g.createShader( gl_FRAGMENT_SHADER )!;
    let shader = g.createProgram()!;

    g.shaderSource( vs, main_vert );
    g.compileShader( vs );
    g.shaderSource( fs, frag );
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
    return shader;
};

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

    bgTex0 = g.createTexture()!;
    g.bindTexture(gl_TEXTURE_2D, bgTex0);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, 2048, 2048, 0, gl_RGBA, gl_UNSIGNED_BYTE, null);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_LINEAR);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_LINEAR); 
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_REPEAT);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_REPEAT);

    bgTex1 = g.createTexture()!;
    g.bindTexture(gl_TEXTURE_2D, bgTex1);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, 2048, 2048, 0, gl_RGBA, gl_UNSIGNED_BYTE, null);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_LINEAR);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_LINEAR); 
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_REPEAT);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_REPEAT);

    bgTex2 = g.createTexture()!;
    g.bindTexture(gl_TEXTURE_2D, bgTex2);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, 2048, 2048, 0, gl_RGBA, gl_UNSIGNED_BYTE, null);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MIN_FILTER, gl_LINEAR);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_MAG_FILTER, gl_LINEAR); 
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_S, gl_REPEAT);
    g.texParameteri(gl_TEXTURE_2D, gl_TEXTURE_WRAP_T, gl_REPEAT);

    fullScreenTriVertBuffer = g.createBuffer()!;
    g.bindBuffer( gl_ARRAY_BUFFER, fullScreenTriVertBuffer );
    g.bufferData( gl_ARRAY_BUFFER, Uint8Array.of(1, 1, 1, 128, 128, 1), gl_STATIC_DRAW );

    for( let i = -1; i <= 18; ++i ) {
        levelShaders.push( compileShader('precision highp float;' + (i >= 0 
            ? main_frag.replace('M'+i.toString(36).toUpperCase(),'M')
            : '\n#define BG\n'+main_frag.replace('M0','M') 
        )));
    }

    let bgShader = levelShaders.shift()!;
    g.useProgram( bgShader );
    let posLoc = g.getAttribLocation( bgShader, 'a' );

    let makeBgTex = (tex: WebGLTexture, a: number, b: number) => {
        let fb = g.createFramebuffer()!;
        g.bindFramebuffer( gl_FRAMEBUFFER, fb );
        g.framebufferTexture2D( gl_FRAMEBUFFER, gl_COLOR_ATTACHMENT0, gl_TEXTURE_2D, tex, 0 );
        g.viewport(0,0,2048,2048);
        g.uniform4f(g.getUniformLocation(bgShader, 'P0'), 0,0,0,0);
        g.uniform4f(g.getUniformLocation(bgShader, 'P1'), 1,1,1,1);
        g.uniform4f(g.getUniformLocation(bgShader, 't'), a,b,0,0);
        g.bindBuffer( gl_ARRAY_BUFFER, fullScreenTriVertBuffer );
        g.enableVertexAttribArray( posLoc );
        g.vertexAttribPointer( posLoc, 2, gl_BYTE, false, 0, 0 );
        g.drawArrays( gl_TRIANGLES, 0, 3 );
    };

    makeBgTex(bgTex0, .73, .9);
    makeBgTex(bgTex1, 0, 1);
    makeBgTex(bgTex2, .3, 1);

    g.bindFramebuffer( gl_FRAMEBUFFER, null );
    g.viewport(0,0,k_fullWidth,k_fullHeight);
};

export let loadLevel = (level: number): void => {
    loadLevelData( level );
    shader = levelShaders[level];
    g.useProgram(shader);
};

export let renderState = (curLevel: number, saveState: number[], state: GameState): void => {
    c.fillStyle='#000';
    c.fillRect(0,0,k_fullWidth, k_fullHeight);

    let op = c.globalCompositeOperation;
    c.globalCompositeOperation = 'lighter'

    for( let i = 0; i < curLevelObjectData.length; ++i ) {
        if( curLevelObjectData[i][0] == 3 )
            continue;

        let x = curLevelObjectData[i][1];
        let y = curLevelObjectData[i][2];

        let objScale = curLevelObjectData[i][0] == 1 ? 4 : 
            curLevelObjectData[i][0] == 2 ? curLevelObjectData[i][4] :
            1 ;

        c.save();
        c.translate(
            k_fullWidth/2 + (x - state.cameraPos[0]) * k_baseScale * state.cameraZoom,
            k_fullHeight/2 + (y - state.cameraPos[1]) * k_baseScale * state.cameraZoom
        );
        c.scale(k_baseScale * state.cameraZoom * objScale, k_baseScale * state.cameraZoom * objScale);

        let red: any = 10 + (([0,20+state.canBeDone|0,10])[curLevelObjectData[i][0]])
        red = Math.min(255,red).toString(16);
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
        c.textAlign = 'left';
        c.translate(
            k_fullWidth/2 - state.cameraPos[0] * k_baseScale * state.cameraZoom,
            k_fullHeight/2 - state.cameraPos[1] * k_baseScale * state.cameraZoom
        );
        c.scale(state.cameraZoom, state.cameraZoom);

        c.strokeStyle = '#030';
        c.lineWidth = 8;
        c.lineJoin = 'round';
        c.fillStyle = '#0f0';
        if( curLevel ) {
            c.font = 'italic bold 42px Arial';
            c.strokeText(messages[curLevel], -315, -189);
            c.fillText(messages[curLevel], -315, -189);
        } else {
            c.font = 'italic bold 24px Arial';
            c.strokeText(messages[curLevel], -70, -90);
            c.fillText(messages[curLevel], -70, -90);
        }

        c.restore();
    }

    if( !curLevel ) {
        c.save();
        c.translate(
            k_fullWidth/2 - state.cameraPos[0] * k_baseScale * state.cameraZoom,
            k_fullHeight/2 - state.cameraPos[1] * k_baseScale * state.cameraZoom
        );
        c.scale(state.cameraZoom, state.cameraZoom);

        c.fillStyle = '#0f0';
        c.strokeStyle = '#030';
        c.lineWidth = 25;
        c.lineJoin = 'round';
        c.textAlign = 'center';
        c.font = 'italic bold 378px Arial';
        c.strokeText('GALAXY', 21*155, 21*8);
        c.strokeText('RIDER', 21*155, 21*23);
        c.fillText('GALAXY', 21*155, 21*8);
        c.fillText('RIDER', 21*155, 21*23);

        c.font = '84px Arial';
        //c.fillText('Use Arrows and Enter to Select Level', 21*155, 21*72);

        c.restore();

        //for( let i = 0; i < 18; ++i ) {
        //    c.save();
        //    c.translate(
        //        k_fullWidth/2 - state.cameraPos[0] * k_baseScale * state.cameraZoom,
        //        k_fullHeight/2 - state.cameraPos[1] * k_baseScale * state.cameraZoom
        //    );
        //    c.scale(state.cameraZoom, state.cameraZoom);

        //    c.fillStyle = c.strokeStyle = i==state.selectedLevel ? '#00f' : i > saveState.length ? '#003' : '#007';

        //    c.lineWidth = 21*(i==state.selectedLevel ? 1 : .25);
        //    let col = i % 6;
        //    let row = (i / 6) | 0;
        //    let x = 115+col*14;
        //    let y = 33+row*10;
        //    c.strokeRect(21*x, 21*y, 21*12, 21*8);

        //    c.font = (i==state.selectedLevel ? 'bold ' : '')+'63px Courier';
        //    c.textAlign = 'center';
        //    c.fillText(i as any + 1, 21*(x+6), 21*(y+3));
        //    c.font = 'bold 53px Courier';

        //    if( i < saveState.length ) {
        //        c.fillText(ticksToTime(saveState[i]), 21*(x+6), 21*(y+7));
        //    }

        //    c.restore();
        //}
    } else {
        c.save();
        c.fillStyle = '#f00';
        c.font = '32px Courier';
        c.textAlign = 'right';
        c.fillText(ticksToTime(state.tick - state.isDone), 1010, 42);
        c.restore();
    }

    g.activeTexture(gl_TEXTURE1);
    g.bindTexture(gl_TEXTURE_2D, canTexS);
    g.texImage2D(gl_TEXTURE_2D, 0, gl_RGBA, gl_RGBA, gl_UNSIGNED_BYTE, C1);

    g.activeTexture(gl_TEXTURE2);
    g.bindTexture(gl_TEXTURE_2D, bgTex0);
    g.activeTexture(gl_TEXTURE3);
    g.bindTexture(gl_TEXTURE_2D, bgTex1);
    g.activeTexture(gl_TEXTURE4);
    g.bindTexture(gl_TEXTURE_2D, bgTex2);

    g.uniform4f(g.getUniformLocation(shader, 'P0'), 0,0,0,0);
    g.uniform4f(g.getUniformLocation(shader, 'P1'), 1,1,1,1);

    g.uniform1i(g.getUniformLocation(shader, 'T'), 0);
    g.uniform1i(g.getUniformLocation(shader, 'S'), 1);
    g.uniform1i(g.getUniformLocation(shader, 'BG0'), 2);
    g.uniform1i(g.getUniformLocation(shader, 'BG1'), 3);
    g.uniform1i(g.getUniformLocation(shader, 'BG2'), 4);
    g.uniform4f(g.getUniformLocation(shader, 't'), state.cameraPos[0], state.cameraPos[1], state.cameraZoom, state.tick);
    g.uniform4f(g.getUniformLocation(shader, 's'), state.playerPos[0], state.playerPos[1], state.fade, state.canBeDone);
    g.uniform4fv(g.getUniformLocation(shader, 'r'), hslToRgb(hueForLevel(curLevel),.6,.6));

    g.bindBuffer( gl_ARRAY_BUFFER, fullScreenTriVertBuffer );
    let posLoc = g.getAttribLocation( shader, 'a' );
    g.enableVertexAttribArray( posLoc );
    g.vertexAttribPointer( posLoc, 2, gl_BYTE, false, 0, 0 );
    g.drawArrays( gl_TRIANGLES, 0, 3 );
};
