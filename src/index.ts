import { Bool, globalKeysDown, KeyCode } from './globals';
import { GameState, lerpGameState, newGameState, PlayerEndState, tickGameState } from "./state";
import { initRender, loadLevel, renderState } from "./render";
import { tickSprite } from './sprite';
import {setAudioFade, startAudio} from './synth';

declare const C0: HTMLCanvasElement;
declare const DEBUG: boolean;
declare const k_tickMillis: number;

let accTime = 0;
let prevNow = NaN;
let curState: GameState;
let prevState: GameState;
let curLevel = DEBUG ? 1 : 0;
let saveState: number[] = [];
let saveStateLen: number;

let frame = () => {
    requestAnimationFrame(frame);

    let newNow = performance.now();
    if( isNaN(prevNow)) prevNow = newNow;
    let dt = Math.min( newNow - prevNow, 1000 );
    accTime += dt;
    prevNow = newNow;

    while( accTime > k_tickMillis ) {
        accTime -= k_tickMillis;

        prevState = curState;
        curState = tickGameState(curState, curLevel, saveState, saveStateLen);

        tickSprite(curState.spriteState);

        globalKeysDown[KeyCode.Up] = Bool.False;
        if( !curLevel && curState.playerEndState != PlayerEndState.Won ) {
            globalKeysDown[KeyCode.Down] =
            globalKeysDown[KeyCode.Left] =
            globalKeysDown[KeyCode.Right] = Bool.False;
        }
    }

    renderState(curLevel, saveState, lerpGameState(prevState, curState, accTime / k_tickMillis));
    setAudioFade(curState.fade);

    if( curState.fade < 0 ) {
        let selectedLevel = Math.min(27,saveState.length);
        saveStateLen = saveState.length;
        if( curState.playerEndState == PlayerEndState.Quit ) {
            selectedLevel = curLevel - 1;
            curLevel = 0;
        } else if( !curLevel ) {
            curLevel = curState.selectedLevel + 1;
        } else {
            if( curState.playerEndState == PlayerEndState.Won ) {
                window.localStorage.setItem('galaxyrider', JSON.stringify(saveState));
                curLevel++;
            }
            curLevel %= 28;
        }
        curState = prevState = newGameState(curLevel, selectedLevel);
        prevNow = NaN;
        loadLevel(curLevel);
    }
};

let got = window.localStorage.getItem('galaxyrider');
if( got ) {
    saveState.length = 0;
    saveState.push(...JSON.parse(got));
}

initRender();
curState = prevState = newGameState(curLevel, Math.min(27,saveStateLen = saveState.length));
loadLevel(curLevel);
frame();

C0.onmousedown = () => { startAudio(); globalKeysDown[0] = Bool.True }
