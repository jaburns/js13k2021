import { Bool, globalKeysDown, KeyCode, TICK_MS } from './globals';
import { GameState, lerpGameState, newGameState, PlayerEndState, tickGameState } from "./state";
import { initRender, loadLevel, renderState } from "./render";
import { tickSprite } from './sprite';
import {startAudio} from './synth';

declare const C0: HTMLCanvasElement;
declare const DEBUG: boolean;

let accTime = 0;
let prevNow = performance.now();
let curState: GameState;
let prevState: GameState;
let curLevel = DEBUG ? 4 : 0;
let saveState: string[] = [];

let frame = () => {
    requestAnimationFrame(frame);

    let newNow = performance.now();
    let dt = Math.min( newNow - prevNow, 1000 );
    accTime += dt;
    prevNow = newNow;

    while( accTime > TICK_MS ) {
        accTime -= TICK_MS;

        prevState = curState;
        curState = tickGameState(curState, curLevel, saveState);

        tickSprite(curState.spriteState);

        globalKeysDown[KeyCode.Up] = Bool.False;
    }

    if( curState.fade < 0 ) {
        window.localStorage.setItem('galaxyrider', JSON.stringify(saveState));
        if( curState.playerEndState == PlayerEndState.Won ) curLevel++;
        curState = prevState = newGameState(curLevel);
        loadLevel(curLevel);
    }

    renderState(curLevel, saveState, lerpGameState(prevState, curState, accTime / TICK_MS));
};

let got = window.localStorage.getItem('galaxyrider');
if( got ) {
    saveState.length = 0;
    saveState.push(...JSON.parse(got));
}

initRender();
curState = prevState = newGameState(curLevel);
loadLevel(curLevel);
frame();

C0.onmousedown = () => { startAudio(); globalKeysDown[0] = Bool.True }
