import { Bool, globalKeysDown, KeyCode, TICK_MS } from './globals';
import { GameState, lerpGameState, newGameState, PlayerEndState, tickGameState } from "./state";
import { initRender, loadLevel, renderState } from "./render";
import { tickSprite } from './sprite';
import {startAudio} from './synth';

declare const DEBUG: boolean;

let accTime = 0;
let prevNow = performance.now();
let curState: GameState;
let prevState: GameState;
let curLevel = DEBUG ? 4 : 0;

let frame = () => {
    requestAnimationFrame(frame);

    let newNow = performance.now();
    let dt = Math.min( newNow - prevNow, 1000 );
    accTime += dt;
    prevNow = newNow;

    while( accTime > TICK_MS ) {
        accTime -= TICK_MS;

        prevState = curState;
        curState = tickGameState(curState);

        tickSprite(curState.spriteState);

        globalKeysDown[KeyCode.Up] = Bool.False;
    }

    if( curState.fade < 0  ) {
        if( curState.playerEndState == PlayerEndState.Won ) curLevel++;
        curState = prevState = newGameState();
        loadLevel(curLevel);
    }

    renderState(curLevel, lerpGameState(prevState, curState, accTime / TICK_MS));
};

initRender();
curState = prevState = newGameState();
loadLevel(curLevel);
frame();

window.onclick = () => { startAudio(); }
